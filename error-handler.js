/**
 * Error Handler Module
 * Provides centralized error handling and reporting across the application
 */

/**
 * Centralized error handling utility for consistent error reporting
 * Logs errors to console and sends notification to renderer process
 * @param {Error} error The error object or message
 * @param {string} context Context description for error location
 */
function handleError(error, context = 'Application') {
  console.error(`[${context} Error]:`, error.message || error)
  
  const { getMainWindow } = require('./window-manager')
  const mainWindow = getMainWindow()
  
  if (mainWindow) {
    mainWindow.webContents.send('error-occurred', {
      message: error.message || 'Unknown error occurred',
      context: context
    })
  }
}

/**
 * Handles errors with specific user-facing messages
 * @param {Error} error The error object
 * @param {string} context Error context
 * @param {string} userMessage User-friendly error message
 */
function handleErrorWithUserMessage(error, context, userMessage) {
  console.error(`[${context} Error]:`, error.message || error)
  
  const { getMainWindow } = require('./window-manager')
  const mainWindow = getMainWindow()
  
  if (mainWindow) {
    mainWindow.webContents.send('error-occurred', {
      message: userMessage || error.message || 'Unknown error occurred',
      context: context
    })
  }
}

/**
 * Logs info messages with context
 * @param {string} message Info message
 * @param {string} context Context description
 */
function logInfo(message, context = 'Application') {
  console.log(`[${context} Info]:`, message)
}

/**
 * Logs warning messages with context
 * @param {string} message Warning message
 * @param {string} context Context description
 */
function logWarning(message, context = 'Application') {
  console.warn(`[${context} Warning]:`, message)
}

module.exports = {
  handleError,
  handleErrorWithUserMessage,
  logInfo,
  logWarning
}