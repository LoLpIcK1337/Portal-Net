const Store = require('electron-store')
const { dialog, ipcMain } = require('electron')
const fs = require('fs').promises
const path = require('path')

/**
 * Configuration Manager Module
 * Handles application configuration storage, retrieval, and management
 */

let configStore = null

/**
 * Configuration schema with default values
 */
const defaultConfig = {
  sourceFolder: '',
  baseTargetFolder: '',
  fileRules: [],
  autoLaunchEnabled: false,
  theme: 'light',
  sortExistingFiles: false,
  customCategories: []
}

/**
 * Initializes the configuration store with schema and defaults
 */
function initializeConfigStore() {
  configStore = new Store({
    name: 'file-sorter-config',
    defaults: defaultConfig
  })
}

/**
 * Loads configuration from persistent storage
 * @returns {Object} Current configuration object
 */
function loadConfigFromStore() {
  try {
    const savedConfig = configStore.store
    return {
      sourceFolder: savedConfig.sourceFolder || '',
      baseTargetFolder: savedConfig.baseTargetFolder || '',
      fileRules: savedConfig.fileRules || [],
      autoLaunchEnabled: savedConfig.autoLaunchEnabled || false,
      theme: savedConfig.theme || 'light',
      sortExistingFiles: savedConfig.sortExistingFiles || false,
      customCategories: savedConfig.customCategories || []
    }
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Config Loading')
    return { ...defaultConfig }
  }
}

/**
 * Saves configuration to persistent storage
 * @param {Object} config Configuration object to save
 */
function saveConfigToStore(config) {
  try {
    configStore.set('sourceFolder', config.sourceFolder)
    configStore.set('baseTargetFolder', config.baseTargetFolder)
    configStore.set('fileRules', config.fileRules)
    configStore.set('autoLaunchEnabled', config.autoLaunchEnabled || false)
    configStore.set('theme', config.theme || 'light')
    configStore.set('sortExistingFiles', config.sortExistingFiles || false)
    configStore.set('customCategories', config.customCategories || [])
    console.log('Saved configuration to store')
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Config Saving')
  }
}

/**
 * Gets a specific configuration value
 * @param {string} key Configuration key
 * @returns {*} Configuration value
 */
function getConfigValue(key) {
  return configStore ? configStore.get(key) : defaultConfig[key]
}

/**
 * Sets a specific configuration value
 * @param {string} key Configuration key
 * @param {*} value Configuration value
 */
function setConfigValue(key, value) {
  if (configStore) {
    configStore.set(key, value)
  }
}

/**
 * Gets the configuration store instance
 * @returns {Store} The store instance
 */
function getConfigStore() {
  return configStore
}

/**
 * Exports current configuration to a JSON file
 * @param {BrowserWindow} mainWindow - The main window for dialogs
 * @returns {Promise<boolean>} Success status
 */
async function exportConfig(mainWindow) {
  try {
    const currentConfig = loadConfigFromStore()
    
    // Create export config without system-specific paths
    const exportConfig = {
      ...currentConfig,
      sourceFolder: '', // Exclude system-specific path
      baseTargetFolder: '' // Exclude system-specific path
    }
    
    // Add metadata to the exported config
    const exportData = {
      version: '1.0.1',
      appName: 'Portal Net',
      exportDate: new Date().toISOString(),
      config: exportConfig
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Configuration',
      defaultPath: 'portal-net-config.json',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['createDirectory']
    })

    if (result.canceled) {
      return false
    }

    await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf8')
    console.log('Configuration exported successfully to:', result.filePath)
    return true
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Config Export')
    return false
  }
}

/**
 * Imports configuration from a JSON file
 * @param {BrowserWindow} mainWindow - The main window for dialogs
 * @returns {Promise<Object|null>} Imported configuration or null if failed
 */
async function importConfig(mainWindow) {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Configuration',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled) {
      return null
    }

    const fileContent = await fs.readFile(result.filePaths[0], 'utf8')
    const importData = JSON.parse(fileContent)

    // Validate the imported configuration structure
    if (!importData.config || typeof importData.config !== 'object') {
      throw new Error('Invalid configuration file format')
    }

    // Merge with default config to ensure all required fields exist
    const validatedConfig = { ...defaultConfig, ...importData.config }

    // Validate specific fields
    if (typeof validatedConfig.sourceFolder !== 'string' ||
        typeof validatedConfig.baseTargetFolder !== 'string' ||
        typeof validatedConfig.theme !== 'string' ||
        !Array.isArray(validatedConfig.fileRules) ||
        !Array.isArray(validatedConfig.customCategories)) {
      throw new Error('Invalid configuration data structure')
    }

    console.log('Configuration imported successfully from:', result.filePaths[0])
    return validatedConfig
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Config Import')
    return null
  }
}

module.exports = {
  initializeConfigStore,
  loadConfigFromStore,
  saveConfigToStore,
  getConfigValue,
  setConfigValue,
  getConfigStore,
  exportConfig,
  importConfig,
  defaultConfig
}