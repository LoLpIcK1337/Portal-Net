document.addEventListener('DOMContentLoaded', () => {
  // Check auto-launch status
  updateAutoLaunchStatus()

  // Set up event listeners
  document.getElementById('selectSource').addEventListener('click', selectSourceFolder)
  document.getElementById('selectBaseTarget').addEventListener('click', selectBaseTargetFolder)
  document.getElementById('sortFiles').addEventListener('click', sortFiles)
  document.getElementById('autoLaunchCheckbox').addEventListener('change', toggleAutoLaunch)
  document.getElementById('showStatsDetails').addEventListener('click', showStatisticsDetails)
  document.getElementById('themeToggle').addEventListener('change', toggleTheme)
  document.getElementById('sortExistingFilesCheckbox').addEventListener('change', toggleSortExistingFiles)

  // Initialize with pre-defined file types
  initializeFileTypeRules()

  // Set up file sorting notifications
  setupFileSortingNotifications()

  // Load saved configuration if any
  loadConfiguration()

  // Initialize statistics
  initializeStatistics()

  // Initialize theme
  initializeTheme()

  // Set default folders if none are configured
  // Only set defaults if no configuration was loaded
  window.electronAPI.getConfig().then(config => {
    if (!config || (!config.sourceFolder && !config.baseTargetFolder)) {
      setDefaultFolders()
    }
  }).catch(error => {
    console.error('Error checking config for default folders:', error)
    setDefaultFolders()
  })
})

async function updateAutoLaunchStatus() {
  try {
    const isEnabled = await window.electronAPI.isAutoLaunchEnabled()
    document.getElementById('autoLaunchCheckbox').checked = isEnabled
  } catch (error) {
    console.error('Error checking auto-launch status:', error)
  }
}

async function toggleAutoLaunch() {
  const checkbox = document.getElementById('autoLaunchCheckbox')
  try {
    if (checkbox.checked) {
      await window.electronAPI.enableAutoLaunch()
    } else {
      await window.electronAPI.disableAutoLaunch()
    }
  } catch (error) {
    console.error('Error toggling auto-launch:', error)
    checkbox.checked = !checkbox.checked // Revert if error
  }
}

function selectSourceFolder() {
  // Use Electron's dialog API through preload
  window.dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      document.getElementById('sourceFolder').value = result.filePaths[0]
    }
  }).catch(err => {
    console.error('Error selecting source folder:', err)
  })
}

function selectBaseTargetFolder() {
  // Use Electron's dialog API through preload
  window.dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      document.getElementById('baseTargetFolder').value = result.filePaths[0]
    }
  }).catch(err => {
    console.error('Error selecting base target folder:', err)
  })
}

function initializeFileTypeRules() {
  const container = document.getElementById('fileTypeRules')

  // Pre-defined file categories with common extensions
  const fileCategories = [
    {
      name: 'Images',
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
      defaultFolder: 'Images'
    },
    {
      name: 'Documents',
      extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
      defaultFolder: 'Documents'
    },
    {
      name: 'Videos',
      extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv'],
      defaultFolder: 'Videos'
    },
    {
      name: 'Music',
      extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg'],
      defaultFolder: 'Music'
    },
    {
      name: 'Archives',
      extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      defaultFolder: 'Archives'
    },
    {
      name: 'Spreadsheets',
      extensions: ['.xls', '.xlsx', '.csv'],
      defaultFolder: 'Spreadsheets'
    },
    {
      name: 'Presentations',
      extensions: ['.ppt', '.pptx'],
      defaultFolder: 'Presentations'
    }
  ]

  fileCategories.forEach((category, index) => {
    const categoryId = 'category-' + index
    const ruleDiv = document.createElement('div')
    ruleDiv.className = 'file-type-rule'
    ruleDiv.id = categoryId

    ruleDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="checkbox-${categoryId}" checked>
        <strong>${category.name}</strong>
        <span style="color: #666; font-size: 0.9em;">(${category.extensions.join(', ')})</span>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" class="target-subfolder" value="${category.defaultFolder}" placeholder="Folder name">
        <button class="select-folder-btn" onclick="selectTargetSubfolder('${categoryId}')">Select Folder</button>
      </div>
    `

    container.appendChild(ruleDiv)
  })
}

function selectTargetSubfolder(ruleId) {
  window.dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const ruleDiv = document.getElementById(ruleId)
      const subfolderInput = ruleDiv.querySelector('.target-subfolder')
      // Extract just the folder name from the path
      const pathParts = result.filePaths[0].split(/[\\/]/)
      subfolderInput.value = pathParts[pathParts.length - 1]
    }
  }).catch(err => {
    console.error('Error selecting target subfolder:', err)
  })
}

function removeFileTypeRule(ruleId) {
  const rule = document.getElementById(ruleId)
  if (rule) {
    rule.remove()
  }
}

function sortFiles() {
  // Get current configuration and send to main process
  const config = getCurrentConfiguration()
  window.electronAPI.setConfig(config)
  showStatusMessage('Automatic file sorting started!')
}

function getCurrentConfiguration() {
  const sourceFolder = document.getElementById('sourceFolder').value
  const baseTargetFolder = document.getElementById('baseTargetFolder').value

  if (!sourceFolder || !baseTargetFolder) {
    showStatusMessage('Please select both source and destination folders', true)
    return null
  }

  const fileRules = []
  const ruleElements = document.querySelectorAll('.file-type-rule')

  ruleElements.forEach(ruleElement => {
    const checkbox = ruleElement.querySelector('input[type="checkbox"]')
    const targetSubfolder = ruleElement.querySelector('.target-subfolder').value
    const categoryName = ruleElement.querySelector('strong').textContent

    // Find the category in our predefined list
    const category = getCategoryByName(categoryName)
    if (category && checkbox.checked && targetSubfolder) {
      fileRules.push({
        enabled: true,
        extensions: category.extensions,
        targetFolder: targetSubfolder
      })
    }
  })

  return {
    sourceFolder,
    baseTargetFolder,
    fileRules,
    sortExistingFiles: document.getElementById('sortExistingFilesCheckbox').checked
  }
}

function getCategoryByName(name) {
  const fileCategories = [
    {
      name: 'Images',
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    },
    {
      name: 'Documents',
      extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf']
    },
    {
      name: 'Videos',
      extensions: ['.mp4', '.avi', '.mkv', '.mov', '.wmv']
    },
    {
      name: 'Music',
      extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg']
    },
    {
      name: 'Archives',
      extensions: ['.zip', '.rar', '.7z', '.tar', '.gz']
    },
    {
      name: 'Spreadsheets',
      extensions: ['.xls', '.xlsx', '.csv']
    },
    {
      name: 'Presentations',
      extensions: ['.ppt', '.pptx']
    }
  ]

  return fileCategories.find(cat => cat.name === name)
}

function setupFileSortingNotifications() {
  // Listen for file sorted notifications from main process
  window.electronAPI.onFileSorted((event, data) => {
    showStatusMessage(`Moved ${data.fileName} to ${data.to}/`)
    addToSortingLog(data)
  })
}

function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('statusMessage')
  const errorElement = document.getElementById('errorMessage')

  if (isError) {
    errorElement.textContent = 'ERROR: ' + message
    statusElement.textContent = ''
  } else {
    statusElement.textContent = message
    errorElement.textContent = ''
  }

  // Clear messages after 5 seconds
  setTimeout(() => {
    if (!isError) {
      statusElement.textContent = ''
    }
  }, 5000)
}

function addToSortingLog(data) {
  // Update statistics
  updateStatistics(data)

  // In a real app, this would update a UI log
  console.log(`[LOG] ${new Date().toLocaleTimeString()} - Moved ${data.fileName} from ${data.from} to ${data.to}`)
}

function initializeStatistics() {
  // Load statistics from localStorage if available
  const stats = JSON.parse(localStorage.getItem('fileSorterStats')) || {
    filesToday: 0,
    totalFiles: 0,
    lastFile: '-',
    todayDate: new Date().toDateString()
  }

  // Reset daily counter if it's a new day
  const today = new Date().toDateString()
  if (stats.todayDate !== today) {
    stats.filesToday = 0
    stats.todayDate = today
  }

  updateStatisticsUI(stats)
}

function updateStatistics(data) {
  const stats = JSON.parse(localStorage.getItem('fileSorterStats')) || {
    filesToday: 0,
    totalFiles: 0,
    lastFile: '-',
    todayDate: new Date().toDateString()
  }

  // Reset daily counter if it's a new day
  const today = new Date().toDateString()
  if (stats.todayDate !== today) {
    stats.filesToday = 0
    stats.todayDate = today
  }

  // Update statistics
  stats.filesToday++
  stats.totalFiles++
  stats.lastFile = data.fileName

  // Save to localStorage
  localStorage.setItem('fileSorterStats', JSON.stringify(stats))

  // Update UI
  updateStatisticsUI(stats)
}

function updateStatisticsUI(stats) {
  document.getElementById('filesToday').textContent = stats.filesToday
  document.getElementById('totalFiles').textContent = stats.totalFiles
  document.getElementById('lastFile').textContent = stats.lastFile
}

function showStatisticsDetails() {
  const stats = JSON.parse(localStorage.getItem('fileSorterStats')) || {
    filesToday: 0,
    totalFiles: 0,
    lastFile: '-'
  }

  // In a real app, this would show a detailed statistics window
  // For now, just show a simple alert
  const details = `Statistics Details:\n\n` +
                  `Files sorted today: ${stats.filesToday}\n` +
                  `Total files sorted: ${stats.totalFiles}\n` +
                  `Last file sorted: ${stats.lastFile}\n` +
                  `First used: ${stats.todayDate || 'Today'}`

  alert(details)
}

function setDefaultFolders() {
  // Set default source folder to Downloads ONLY if not already set in config
  const sourceFolderInput = document.getElementById('sourceFolder')
  if (!sourceFolderInput.value) {
    // Get the user's Downloads folder path through preload
    window.electronAPI.getPath('downloads').then(downloadsPath => {
      sourceFolderInput.value = downloadsPath
      showStatusMessage(`Default source folder set to: ${downloadsPath}`)
    }).catch(error => {
      console.error('Error getting downloads path:', error)
      showStatusMessage('Could not set default Downloads folder', true)
    })
  }
}

function initializeTheme() {
  // Load saved theme preference from config store
  window.electronAPI.getConfig().then(config => {
    const savedTheme = config.theme || 'light'
    applyTheme(savedTheme)

    // Update checkbox to match saved theme
    const themeToggle = document.getElementById('themeToggle')
    themeToggle.checked = savedTheme === 'dark'
  }).catch(error => {
    console.error('Error loading theme preference:', error)
    // Default to light theme
    applyTheme('light')
  })
}

function toggleTheme() {
  const themeToggle = document.getElementById('themeToggle')
  const newTheme = themeToggle.checked ? 'dark' : 'light'

  applyTheme(newTheme)

  // Save theme preference to config
  window.electronAPI.getConfig().then(config => {
    config.theme = newTheme
    window.electronAPI.setConfig(config)
    showStatusMessage(`Theme changed to ${newTheme}`)
  }).catch(error => {
    console.error('Error saving theme preference:', error)
    showStatusMessage('Could not save theme preference', true)
  })
}

function toggleSortExistingFiles() {
  const checkbox = document.getElementById('sortExistingFilesCheckbox')
  const config = getCurrentConfiguration()

  if (config) {
    config.sortExistingFiles = checkbox.checked
    window.electronAPI.setConfig(config)
    showStatusMessage(`Sort existing files: ${checkbox.checked ? 'Enabled' : 'Disabled'}`)
  }
}
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme)

  // Update all elements that need theme-specific styling
  const root = document.documentElement
  root.style.setProperty('--current-theme', theme)
}

function loadConfiguration() {
  // Try to load saved configuration
  window.electronAPI.getConfig().then(config => {
    if (config) {
      document.getElementById('sourceFolder').value = config.sourceFolder || ''
      document.getElementById('baseTargetFolder').value = config.baseTargetFolder || ''

      // Update file rules
      if (config.fileRules) {
        const ruleElements = document.querySelectorAll('.file-type-rule')
        ruleElements.forEach(ruleElement => {
          const categoryName = ruleElement.querySelector('strong').textContent
          const matchingRule = config.fileRules.find(rule =>
            rule.targetFolder === ruleElement.querySelector('.target-subfolder').value
          )

          if (matchingRule) {
            const checkbox = ruleElement.querySelector('input[type="checkbox"]')
            checkbox.checked = matchingRule.enabled
          }
        })
      }

      // Update sort existing files checkbox
      if (config.sortExistingFiles !== undefined) {
        document.getElementById('sortExistingFilesCheckbox').checked = config.sortExistingFiles
      }
    }
  })
}

// Expose functions to global scope for HTML button handlers
window.selectSourceFolder = selectSourceFolder
window.selectBaseTargetFolder = selectBaseTargetFolder
window.selectTargetSubfolder = selectTargetSubfolder
window.sortFiles = sortFiles