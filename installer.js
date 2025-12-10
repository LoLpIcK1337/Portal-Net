const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

// This script would be used during the installation process
// In a real project, this would be integrated with electron-builder

async function createInstaller() {
  console.log('Starting File Sorter installation...')

  try {
    // Install dependencies
    console.log('Installing dependencies...')
    execSync('npm install', { stdio: 'inherit' })

    // Build the application
    console.log('Building application...')
    execSync('npm run build', { stdio: 'inherit' })

    // Set up auto-startup option
    const autoLaunch = require('auto-launch')
    const portalNetLauncher = new autoLaunch({
      name: 'PortalNet',
      path: path.join(__dirname, 'dist', 'Portal Net.exe'),
      isHidden: true
    })

    // Ask user about auto-startup (in a real installer, this would be a GUI option)
    console.log('Would you like to enable auto-startup? (y/n)')
    // In a real installer, this would be handled by the installer UI

    console.log('Installation completed successfully!')
    console.log('You can now run the application with: npm start')

  } catch (error) {
    console.error('Installation failed:', error)
    process.exit(1)
  }
}

// This function would be called by the installer
function setupAutoStartup(enable) {
  const autoLaunch = require('auto-launch')
  const fileSorterLauncher = new autoLaunch({
    name: 'FileSorter',
    path: app.getPath('exe'),
    isHidden: true
  })

  if (enable) {
    return fileSorterLauncher.enable()
  } else {
    return fileSorterLauncher.disable()
  }
}

module.exports = {
  createInstaller,
  setupAutoStartup
}

// Run installer if called directly
if (require.main === module) {
  createInstaller()
}