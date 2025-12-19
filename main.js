const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')

// Import all modules
const { createWindow, getMainWindow, showMainWindow } = require('./window-manager')
const { createTray } = require('./tray-manager')
const { initializeConfigStore, loadConfigFromStore, saveConfigToStore, exportConfig, importConfig } = require('./config-manager')
const { handleError } = require('./error-handler')
const { startFileWatcher } = require('./file-operations')
const { initializeAutoLaunch, setupAutoLaunchIPC } = require('./auto-launch')

// Global application state
let currentConfig = {
  sourceFolder: '',
  baseTargetFolder: '',
  fileRules: [],
  sortExistingFiles: false,
  theme: 'light',
  customCategories: []
}

/**
 * Single Instance Lock - Prevents multiple instances of the application
 */
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // This is the first instance, handle second instance events
  app.on('second-instance', (event, argv, cwd) => {
    // Someone tried to run a second instance, focus our window instead
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
      showMainWindow()
    }
  })
}

/**
 * Sets up all IPC (Inter-Process Communication) handlers
 * Exposes main process functionality to renderer process
 */
function setupIPCHandlers() {
  // Auto-launch functionality
  setupAutoLaunchIPC(ipcMain)

  // Dialog functionality for folder selection
  ipcMain.handle('show-open-dialog', async (event, options) => {
    return await dialog.showOpenDialog(options)
  })

  // File sorting configuration and functionality
  ipcMain.handle('set-config', (event, config) => {
    if (!config) {
      console.error('set-config: config parameter is null or undefined')
      return
    }

    currentConfig = {
      ...config,
      theme: config.theme || currentConfig.theme || 'light',
      sortExistingFiles: config.sortExistingFiles !== undefined ? config.sortExistingFiles : currentConfig.sortExistingFiles || false,
      customCategories: config.customCategories || currentConfig.customCategories || []
    }
    saveConfigToStore(currentConfig)
    startFileWatcher(currentConfig)
  })

  ipcMain.handle('get-config', () => {
    return {
      ...currentConfig,
      theme: currentConfig.theme || 'light',
      sortExistingFiles: currentConfig.sortExistingFiles || false,
      customCategories: currentConfig.customCategories || []
    }
  })

  // System path functionality for accessing standard directories
  ipcMain.handle('get-path', (event, name) => {
    return app.getPath(name)
  })

  // Configuration import and export functionality
  ipcMain.handle('export-config', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) {
      console.error('Main window not available for export dialog')
      return false
    }
    return await exportConfig(mainWindow)
  })

  ipcMain.handle('import-config', async () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) {
      console.error('Main window not available for import dialog')
      return null
    }
    
    const importedConfig = await importConfig(mainWindow)
    if (importedConfig) {
      // Update current config and save it
      currentConfig = importedConfig
      saveConfigToStore(currentConfig)
      startFileWatcher(currentConfig)
    }
    return importedConfig
  })
}

/**
 * Initializes the application
 * Sets up configuration, IPC handlers, window, and tray
 */
function initializeApp() {
  try {
    // Initialize configuration storage
    initializeConfigStore()
    
    // Load saved configuration
    currentConfig = loadConfigFromStore()
    
    // Setup IPC handlers for renderer communication
    setupIPCHandlers()
    
    // Initialize auto-launch functionality
    initializeAutoLaunch(app)
    
    // Create main window
    createWindow()
    
    // Create system tray
    createTray()
    
    console.log('Application initialized successfully')
  } catch (error) {
    handleError(error, 'Application Initialization')
  }
}

// Application lifecycle event handlers

app.whenReady().then(() => {
  initializeApp()

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

// Handle app quitting
app.on('before-quit', () => {
  app.quitting = true
})

// Release single instance lock when app quits
app.on('will-quit', () => {
  // Release the single instance lock
  if (gotTheLock) {
    app.releaseSingleInstanceLock()
  }
})
