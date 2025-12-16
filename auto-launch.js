const AutoLaunch = require('auto-launch')

/**
 * Auto-Launch Manager Module
 * Handles application auto-launch functionality on system startup
 */

let autoLauncher = null

/**
 * Initializes the auto-launch functionality
 * @param {Object} app Electron app instance
 */
function initializeAutoLaunch(app) {
  autoLauncher = new AutoLaunch({
    name: 'PortalNet',
    path: app.getPath('exe'),
    isHidden: true
  })
}

/**
 * Enables auto-launch on system startup
 * @returns {Promise<boolean>} Success status
 */
async function enableAutoLaunch() {
  try {
    return await autoLauncher.enable()
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Auto-Launch Enable')
    return false
  }
}

/**
 * Disables auto-launch on system startup
 * @returns {Promise<boolean>} Success status
 */
async function disableAutoLaunch() {
  try {
    return await autoLauncher.disable()
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Auto-Launch Disable')
    return false
  }
}

/**
 * Checks if auto-launch is currently enabled
 * @returns {Promise<boolean>} Auto-launch status
 */
async function isAutoLaunchEnabled() {
  try {
    return await autoLauncher.isEnabled()
  } catch (error) {
    const { handleError } = require('./error-handler')
    handleError(error, 'Auto-Launch Status Check')
    return false
  }
}

/**
 * Sets up IPC handlers for auto-launch functionality
 * @param {Object} ipcMain IPC main instance
 */
function setupAutoLaunchIPC(ipcMain) {
  // Expose auto-launch functionality to renderer process via IPC
  ipcMain.handle('enable-auto-launch', async () => {
    return await enableAutoLaunch()
  })

  ipcMain.handle('disable-auto-launch', async () => {
    return await disableAutoLaunch()
  })

  ipcMain.handle('is-auto-launch-enabled', async () => {
    return await isAutoLaunchEnabled()
  })
}

/**
 * Gets the auto-launch instance
 * @returns {Object|null} The auto-launch instance
 */
function getAutoLauncher() {
  return autoLauncher
}

module.exports = {
  initializeAutoLaunch,
  enableAutoLaunch,
  disableAutoLaunch,
  isAutoLaunchEnabled,
  setupAutoLaunchIPC,
  getAutoLauncher
}