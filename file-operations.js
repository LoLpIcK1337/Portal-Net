const chokidar = require('chokidar')
const fs = require('fs')
const path = require('path')

/**
 * File Operations Module
 * Handles file watching, sorting, and organization logic
 */

let fileWatcher = null

/**
 * Starts file system watcher on the source folder
 * @param {Object} config Configuration object with source and target folders
 */
function startFileWatcher(config) {
  // Validate configuration
  if (!config || !config.sourceFolder || !config.baseTargetFolder) {
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
    fileWatcher = chokidar.watch(config.sourceFolder, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    })

    fileWatcher
      .on('add', (filePath) => {
        setTimeout(() => sortFile(filePath, config), 1000)
      })
      .on('error', (error) => {
        console.error('File watcher error:', error)
      })

    console.log(`Watching for files in: ${config.sourceFolder}`)

    // If sortExistingFiles is enabled, sort all existing files in the source folder
    if (config.sortExistingFiles) {
      sortExistingFiles(config)
    }
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'File Watcher')
  }
}

/**
 * Sorts a single file based on configuration rules
 * @param {string} filePath Path to the file to sort
 * @param {Object} config Configuration object
 */
function sortFile(filePath, config) {
  if (!config.baseTargetFolder) return

  const fileExtension = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)

  // Find matching rule in standard file rules
  let matchingRule = config.fileRules.find(rule =>
    rule.enabled && rule.extensions.includes(fileExtension)
  )

  // If no standard rule found, check custom categories
  if (!matchingRule && config.customCategories) {
    const matchingCategory = config.customCategories.find(category =>
      category.enabled && category.extensions.includes(fileExtension)
    )
    
    if (matchingCategory) {
      matchingRule = {
        enabled: true,
        extensions: matchingCategory.extensions,
        targetFolder: matchingCategory.folderName,
        isCustom: true,
        categoryName: matchingCategory.name
      }
    }
  }

  if (matchingRule) {
    const targetFolder = path.join(config.baseTargetFolder, matchingRule.targetFolder)

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

      const targetName = matchingRule.isCustom ?
        `${matchingRule.categoryName} (${matchingRule.targetFolder})` :
        matchingRule.targetFolder
      console.log(`Moved ${fileName} to ${targetName}`)

      // Show Windows notification
      const { showNotification } = require('./main')
      showNotification('File Moved', `Moved ${fileName} to ${targetName}`)

      // Send notification to renderer
      const { getMainWindow } = require('./window-manager')
      const mainWindow = getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send('file-sorted', {
          fileName,
          from: path.basename(path.dirname(filePath)),
          to: matchingRule.targetFolder,
          category: matchingRule.isCustom ? matchingRule.categoryName : null
        })
      }
    } catch (error) {
      const { handleError } = require('./error-handler')
      handleError(error, `File Sorting (${fileName})`)

      // Show Windows notification for error
      const { showNotification } = require('./main')
      showNotification('File Move Error', `Failed to move ${fileName}: ${error.message}`)
    }
  }
}

/**
 * Sorts all existing files in the source folder
 * @param {Object} config Configuration object
 */
function sortExistingFiles(config) {
  if (!config.sourceFolder || !config.baseTargetFolder) {
    console.log('Cannot sort existing files: missing configuration')
    return
  }

  try {
    const files = fs.readdirSync(config.sourceFolder)

    files.forEach(file => {
      const filePath = path.join(config.sourceFolder, file)

      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        return
      }

      // Use the existing sortFile function to handle each file
      sortFile(filePath, config)
    })

    console.log(`Sorted ${files.length} existing files from ${config.sourceFolder}`)
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Existing Files Sorting')
  }
}

/**
 * Stops the file watcher
 */
function stopFileWatcher() {
  if (fileWatcher) {
    try {
      fileWatcher.close()
      fileWatcher = null
    } catch (error) {
      console.error('Error stopping file watcher:', error)
    }
  }
}

/**
 * Gets the current file watcher instance
 * @returns {Object|null} The file watcher instance
 */
function getFileWatcher() {
  return fileWatcher
}

module.exports = {
  startFileWatcher,
  sortFile,
  sortExistingFiles,
  stopFileWatcher,
  getFileWatcher
}