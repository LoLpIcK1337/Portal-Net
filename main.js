const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron')
const path = require('path')
const AutoLaunch = require('auto-launch')
const fs = require('fs')
const chokidar = require('chokidar')
const Store = require('electron-store')

let mainWindow = null
let tray = null
let autoLauncher = null
let fileWatcher = null
let currentConfig = {
  sourceFolder: '',
  baseTargetFolder: '',
  fileRules: [],
  sortExistingFiles: false
}
let configStore = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'logo.jpg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('renderer/index.html')

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (app.quitting) {
      mainWindow = null
    } else {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  // Use logo.jpg as the tray icon
  try {
    const iconPath = path.join(__dirname, 'logo.jpg')
    tray = new Tray(iconPath)

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show',
        click: () => {
          mainWindow.show()
        }
      },
      {
        label: 'Hide',
        click: () => {
          mainWindow.hide()
        }
      },
      {
        label: 'Exit',
        click: () => {
          app.quitting = true
          app.quit()
        }
      }
    ])

    tray.setToolTip('File Sorter')
    tray.setContextMenu(contextMenu)

    // Handle tray click
    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
    })
  } catch (error) {
    console.log('Tray creation failed:', error)
  }
}

function setupAutoLaunch() {
  autoLauncher = new AutoLaunch({
    name: 'PortalNet',
    path: app.getPath('exe'),
    isHidden: true
  })

  // Expose auto-launch functionality to renderer
  ipcMain.handle('enable-auto-launch', async () => {
    return await autoLauncher.enable()
  })

  ipcMain.handle('disable-auto-launch', async () => {
    return await autoLauncher.disable()
  })

  ipcMain.handle('is-auto-launch-enabled', async () => {
    return await autoLauncher.isEnabled()
  })

  // Expose dialog functionality to renderer
  ipcMain.handle('show-open-dialog', async (event, options) => {
    const { dialog } = require('electron')
    return await dialog.showOpenDialog(options)
  })

  // File sorting functionality
  ipcMain.handle('set-config', (event, config) => {
    currentConfig = {
      ...config,
      theme: config.theme || currentConfig.theme || 'light',
      sortExistingFiles: config.sortExistingFiles !== undefined ? config.sortExistingFiles : currentConfig.sortExistingFiles || false
    }
    saveConfigToStore(currentConfig)
    startFileWatcher()
  })

  ipcMain.handle('get-config', () => {
    return {
      ...currentConfig,
      theme: currentConfig.theme || 'light',
      sortExistingFiles: currentConfig.sortExistingFiles || false
    }
  })

  // System path functionality
  ipcMain.handle('get-path', (event, name) => {
    return app.getPath(name)
  })
}

function initializeConfigStore() {
  configStore = new Store({
    name: 'file-sorter-config',
    defaults: {
      sourceFolder: '',
      baseTargetFolder: '',
      fileRules: [],
      autoLaunchEnabled: false
    }
  })
}

function loadConfigFromStore() {
  try {
    const savedConfig = configStore.store
    currentConfig = {
      sourceFolder: savedConfig.sourceFolder || '',
      baseTargetFolder: savedConfig.baseTargetFolder || '',
      fileRules: savedConfig.fileRules || []
    }
    console.log('Loaded configuration from store')
  } catch (error) {
    console.error('Error loading configuration:', error)
  }
}

function saveConfigToStore(config) {
  try {
    configStore.set('sourceFolder', config.sourceFolder)
    configStore.set('baseTargetFolder', config.baseTargetFolder)
    configStore.set('fileRules', config.fileRules)
    console.log('Saved configuration to store')
  } catch (error) {
    console.error('Error saving configuration:', error)
  }
}

function startFileWatcher() {
  // Validate configuration
  if (!currentConfig || !currentConfig.sourceFolder || !currentConfig.baseTargetFolder) {
    console.log('Cannot start file watcher: missing configuration')
    return
  }

  // Stop existing watcher if any
  if (fileWatcher) {
    try {
      fileWatcher.close()
    } catch (error) {
      console.error('Error closing existing file watcher:', error)
    }
    fileWatcher = null
  }

  try {
    fileWatcher = chokidar.watch(currentConfig.sourceFolder, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    })

    fileWatcher
      .on('add', (filePath) => {
        sortFile(filePath)
      })
      .on('error', (error) => {
        console.error('File watcher error:', error)
      })

    console.log(`Watching for files in: ${currentConfig.sourceFolder}`)

    // If sortExistingFiles is enabled, sort all existing files in the source folder
    if (currentConfig.sortExistingFiles) {
      sortExistingFiles()
    }
  } catch (error) {
    console.error('Error starting file watcher:', error)
  }
}

function sortFile(filePath) {
  if (!currentConfig.baseTargetFolder) return

  const fileExtension = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)

  // Find matching rule
  const matchingRule = currentConfig.fileRules.find(rule =>
    rule.enabled && rule.extensions.includes(fileExtension)
  )

  if (matchingRule) {
    const targetFolder = path.join(currentConfig.baseTargetFolder, matchingRule.targetFolder)

    // Create target folder if it doesn't exist
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true })
    }

    const targetPath = path.join(targetFolder, fileName)

    try {
      // Try rename first (faster for same device)
      try {
        fs.renameSync(filePath, targetPath)
      } catch (renameError) {
        // If rename fails (cross-device), use copy + delete
        if (renameError.code === 'EXDEV') {
          fs.copyFileSync(filePath, targetPath)
          fs.unlinkSync(filePath)
        } else {
          throw renameError
        }
      }

      console.log(`Moved ${fileName} to ${matchingRule.targetFolder}`)

      // Send notification to renderer
      if (mainWindow) {
        mainWindow.webContents.send('file-sorted', {
          fileName,
          from: path.basename(path.dirname(filePath)),
          to: matchingRule.targetFolder
        })
      }
    } catch (error) {
      console.error(`Error moving file ${fileName}:`, error)
    }
  }
}

function sortExistingFiles() {
  if (!currentConfig.sourceFolder || !currentConfig.baseTargetFolder) {
    console.log('Cannot sort existing files: missing configuration')
    return
  }

  try {
    const files = fs.readdirSync(currentConfig.sourceFolder)

    files.forEach(file => {
      const filePath = path.join(currentConfig.sourceFolder, file)

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        return
      }

      // Use the existing sortFile function to handle each file
      sortFile(filePath)
    })

    console.log(`Sorted ${files.length} existing files from ${currentConfig.sourceFolder}`)
  } catch (error) {
    console.error('Error sorting existing files:', error)
  }
}

app.whenReady().then(() => {
  initializeConfigStore()
  loadConfigFromStore()
  setupAutoLaunch() // Setup IPC handlers first
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Configuration store functions
function initializeConfigStore() {
  configStore = new Store({
    name: 'portal-net-config',
    defaults: {
      sourceFolder: '',
      baseTargetFolder: '',
      fileRules: [],
      autoLaunchEnabled: false,
      theme: 'light',
      sortExistingFiles: false
    }
  })
}

function loadConfigFromStore() {
  try {
    const savedConfig = configStore.store
    currentConfig = {
      sourceFolder: savedConfig.sourceFolder || '',
      baseTargetFolder: savedConfig.baseTargetFolder || '',
      fileRules: savedConfig.fileRules || [],
      theme: savedConfig.theme || 'light',
      sortExistingFiles: savedConfig.sortExistingFiles || false
    }
    console.log('Loaded configuration from store')
  } catch (error) {
    console.error('Error loading configuration:', error)
  }
}

function saveConfigToStore(config) {
  try {
    configStore.set('sourceFolder', config.sourceFolder)
    configStore.set('baseTargetFolder', config.baseTargetFolder)
    configStore.set('fileRules', config.fileRules)
    if (config.theme) {
      configStore.set('theme', config.theme)
    }
    if (config.sortExistingFiles !== undefined) {
      configStore.set('sortExistingFiles', config.sortExistingFiles)
    }
    console.log('Saved configuration to store')
  } catch (error) {
    console.error('Error saving configuration:', error)
  }
}