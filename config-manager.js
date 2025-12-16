const Store = require('electron-store')

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

module.exports = {
  initializeConfigStore,
  loadConfigFromStore,
  saveConfigToStore,
  getConfigValue,
  setConfigValue,
  getConfigStore,
  defaultConfig
}