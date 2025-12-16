const { BrowserWindow } = require('electron')
const path = require('path')

/**
 * Window Manager Module
 * Handles main application window creation, management, and events
 */

let mainWindow = null

/**
 * Creates the main application window with secure configuration
 * Initializes window with proper dimensions, icon, and secure web preferences
 * Implements context isolation and disables node integration for security
 */
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

  // Handle window close event - minimize to tray instead of quitting
  // This provides a better user experience by keeping the app running in background
  mainWindow.on('close', (event) => {
    const { app } = require('electron')
    if (app.quitting) {
      mainWindow = null
    } else {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

/**
 * Gets the main window instance
 * @returns {BrowserWindow|null} The main window instance
 */
function getMainWindow() {
  return mainWindow
}

/**
 * Shows the main window
 */
function showMainWindow() {
  if (mainWindow) {
    mainWindow.show()
  }
}

/**
 * Hides the main window
 */
function hideMainWindow() {
  if (mainWindow) {
    mainWindow.hide()
  }
}

/**
 * Checks if the main window is visible
 * @returns {boolean} True if window is visible
 */
function isWindowVisible() {
  return mainWindow ? mainWindow.isVisible() : false
}

module.exports = {
  createWindow,
  getMainWindow,
  showMainWindow,
  hideMainWindow,
  isWindowVisible
}