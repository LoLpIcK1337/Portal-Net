document.addEventListener('DOMContentLoaded', () => {
  // Initialize application when DOM is fully loaded
  
  // Check and update auto-launch status from system settings
  updateAutoLaunchStatus()

  // Set up event listeners for all UI controls
  document.getElementById('selectSource').addEventListener('click', selectSourceFolder)
  document.getElementById('selectBaseTarget').addEventListener('click', selectBaseTargetFolder)
  document.getElementById('sortFiles').addEventListener('click', sortFiles)
  document.getElementById('autoLaunchCheckbox').addEventListener('change', toggleAutoLaunch)
  document.getElementById('showStatsDetails').addEventListener('click', showStatisticsDetails)
  document.getElementById('themeToggle').addEventListener('change', toggleTheme)
  document.getElementById('sortExistingFilesCheckbox').addEventListener('change', toggleSortExistingFiles)
  document.getElementById('addCategoryBtn').addEventListener('click', addCustomCategory)
  document.getElementById('addFormatBtn').addEventListener('click', addFormatToList)
  document.getElementById('formatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addFormatToList()
    }
  })

  // Initialize with pre-defined file type categories and rules
  initializeFileTypeRules()

  // Set up file sorting notifications from main process
  setupFileSortingNotifications()

  // Load saved configuration from persistent storage
  loadConfiguration()

  // Initialize statistics tracking
  initializeStatistics()

  // Initialize theme based on saved preferences
  initializeTheme()

  // Set default folders if none are configured
  // Only set defaults if no configuration was previously loaded
  window.electronAPI.getConfig().then(config => {
    if (!config || (!config.sourceFolder && !config.baseTargetFolder)) {
      setDefaultFolders()
    }
  }).catch(error => {
    console.error('Error checking config for default folders:', error)
    setDefaultFolders()
  })

  // Initialize custom categories
  initializeCustomCategories()
  
  // Initialize format management
  initializeFormatManagement()
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

  // Pre-defined file categories with common extensions for automatic organization
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

  // Create UI elements for each file category with checkboxes and folder selection
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
  // Get current configuration from UI and send to main process for file sorting
  const config = getCurrentConfiguration()
  if (config) {
    window.electronAPI.setConfig(config)
    showStatusMessage('Automatic file sorting started!')
  }
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
    sortExistingFiles: document.getElementById('sortExistingFilesCheckbox').checked,
    customCategories: loadCustomCategories()
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
  // Check localStorage first for quick theme loading
  const cachedTheme = localStorage.getItem('currentTheme')
  if (cachedTheme) {
    applyTheme(cachedTheme)
    document.getElementById('themeToggle').checked = cachedTheme === 'dark'
    return
  }

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
    if (!config) {
      config = {
        sourceFolder: '',
        baseTargetFolder: '',
        fileRules: [],
        sortExistingFiles: false,
        theme: 'light'
      }
    }
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

  // Update CSS variables for theme
  const root = document.documentElement
  root.style.setProperty('--current-theme', theme)

  // Store theme preference in localStorage for quick access
  localStorage.setItem('currentTheme', theme)

  // Update UI elements that need theme-specific styling
  const themeElements = document.querySelectorAll('[data-theme-element]')
  themeElements.forEach(el => {
    el.classList.remove('light-theme', 'dark-theme')
    el.classList.add(`${theme}-theme`)
  })
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

      // Load custom categories from config
      if (config.customCategories) {
        saveCustomCategories(config.customCategories)
        updateCustomCategoriesList()
      }

      // Update sort existing files checkbox
      if (config.sortExistingFiles !== undefined) {
        document.getElementById('sortExistingFilesCheckbox').checked = config.sortExistingFiles
      }
    }
  })
}

// Custom Categories Management Functions

function initializeFormatManagement() {
  // Initialize empty formats list
  window.currentFormats = []
  updateFormatsList()
}

function addFormatToList() {
  const formatInput = document.getElementById('formatInput')
  let format = formatInput.value.trim().toLowerCase()
  
  if (!format) {
    showStatusMessage('Please enter a file format', true)
    return
  }
  
  // Add dot if not present
  if (!format.startsWith('.')) {
    format = '.' + format
  }
  
  // Validate format
  if (format.length < 2) {
    showStatusMessage('Format must be at least 2 characters', true)
    return
  }
  
  // Check if format already exists
  if (window.currentFormats.includes(format)) {
    showStatusMessage('This format is already added', true)
    return
  }
  
  // Add to formats list
  window.currentFormats.push(format)
  
  // Clear input and update display
  formatInput.value = ''
  updateFormatsList()
  
  showStatusMessage(`Format "${format}" added`)
}

function removeFormatFromList(format) {
  window.currentFormats = window.currentFormats.filter(f => f !== format)
  updateFormatsList()
  showStatusMessage(`Format "${format}" removed`)
}

function updateFormatsList() {
  const container = document.getElementById('formatsList')
  
  if (window.currentFormats.length === 0) {
    container.innerHTML = '<div class="no-formats">No formats added yet</div>'
    return
  }
  
  container.innerHTML = ''
  window.currentFormats.forEach(format => {
    const formatTag = document.createElement('div')
    formatTag.className = 'format-tag'
    formatTag.innerHTML = `
      <span>${format}</span>
      <button type="button" onclick="removeFormatFromList('${format}')" class="remove-format-btn" title="Remove format">×</button>
    `
    container.appendChild(formatTag)
  })
}

function clearFormatInputs() {
  document.getElementById('newCategoryName').value = ''
  document.getElementById('newCategoryFolder').value = ''
  document.getElementById('formatInput').value = ''
  window.currentFormats = []
  updateFormatsList()
}

function initializeCustomCategories() {
  loadCustomCategories()
  updateCustomCategoriesList()
}

function loadCustomCategories() {
  // Load custom categories from localStorage or config
  const customCategories = JSON.parse(localStorage.getItem('customCategories')) || []
  return customCategories
}

function saveCustomCategories(categories) {
  localStorage.setItem('customCategories', JSON.stringify(categories))
}

function addCustomCategory() {
  const nameInput = document.getElementById('newCategoryName')
  const folderInput = document.getElementById('newCategoryFolder')

  const categoryName = nameInput.value.trim()
  const folderName = folderInput.value.trim()

  if (!categoryName || !folderName) {
    showStatusMessage('Please fill in category name and folder name', true)
    return
  }

  if (window.currentFormats.length === 0) {
    showStatusMessage('Please add at least one file format', true)
    return
  }

  // Check if category name already exists
  const customCategories = loadCustomCategories()
  if (customCategories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
    showStatusMessage('A category with this name already exists', true)
    return
  }

  // Add new category
  const newCategory = {
    id: Date.now().toString(), // Simple ID generation
    name: categoryName,
    extensions: [...window.currentFormats], // Copy current formats
    folderName: folderName,
    enabled: true
  }

  customCategories.push(newCategory)
  saveCustomCategories(customCategories)

  // Clear form inputs
  clearFormatInputs()

  // Update UI
  updateCustomCategoriesList()
  showStatusMessage(`Custom category "${categoryName}" created successfully`)
}

function updateCustomCategoriesList() {
  const container = document.getElementById('customCategoriesList')
  const customCategories = loadCustomCategories()

  if (customCategories.length === 0) {
    container.innerHTML = '<p class="no-categories">No custom categories created yet.</p>'
    return
  }

  container.innerHTML = ''
  customCategories.forEach(category => {
    const categoryDiv = document.createElement('div')
    categoryDiv.className = 'custom-category-item'
    categoryDiv.innerHTML = `
      <div class="category-header">
        <label class="category-toggle">
          <input type="checkbox" id="enable-${category.id}" ${category.enabled ? 'checked' : ''} onchange="toggleCategoryEnabled('${category.id}')">
          <span class="category-name">${category.name}</span>
        </label>
        <div class="category-actions">
          <button class="edit-btn" onclick="editCategory('${category.id}')">Edit</button>
          <button class="delete-btn" onclick="deleteCategory('${category.id}')">Delete</button>
        </div>
      </div>
      <div class="category-details">
        <div class="category-formats">
          <strong>Formats:</strong> ${category.extensions.join(', ')}
        </div>
        <div class="category-folder">
          <strong>Folder:</strong> ${category.folderName}
        </div>
      </div>
    `
    container.appendChild(categoryDiv)
  })
}

function toggleCategoryEnabled(categoryId) {
  const customCategories = loadCustomCategories()
  const category = customCategories.find(cat => cat.id === categoryId)
  
  if (category) {
    category.enabled = !category.enabled
    saveCustomCategories(customCategories)
    showStatusMessage(`Category "${category.name}" ${category.enabled ? 'enabled' : 'disabled'}`)
  }
}

function editCategory(categoryId) {
  const customCategories = loadCustomCategories()
  const category = customCategories.find(cat => cat.id === categoryId)
  
  if (!category) return

  // Create edit dialog
  const dialog = document.createElement('div')
  dialog.className = 'edit-category-dialog'
  dialog.innerHTML = `
    <div class="dialog-content">
      <h3>Edit Category: ${category.name}</h3>
      <div class="form-group">
        <label>Category Name:</label>
        <input type="text" id="editCategoryName" value="${category.name}">
      </div>
      <div class="form-group">
        <label>File Formats:</label>
        <input type="text" id="editCategoryFormats" value="${category.extensions.join(', ')}" placeholder="e.g., .js,.ts,.py">
      </div>
      <div class="form-group">
        <label>Folder Name:</label>
        <input type="text" id="editCategoryFolder" value="${category.folderName}">
      </div>
      <div class="dialog-actions">
        <button onclick="saveCategoryEdit('${categoryId}')">Save</button>
        <button onclick="closeEditDialog()">Cancel</button>
      </div>
    </div>
  `
  
  document.body.appendChild(dialog)
}

function saveCategoryEdit(categoryId) {
  const nameInput = document.getElementById('editCategoryName')
  const formatsInput = document.getElementById('editCategoryFormats')
  const folderInput = document.getElementById('editCategoryFolder')

  const categoryName = nameInput.value.trim()
  const formats = formatsInput.value.trim()
  const folderName = folderInput.value.trim()

  if (!categoryName || !formats || !folderName) {
    showStatusMessage('Please fill in all fields', true)
    return
  }

  // Parse formats
  const extensions = formats.split(',').map(format => {
    let ext = format.trim()
    if (!ext.startsWith('.')) {
      ext = '.' + ext
    }
    return ext.toLowerCase()
  }).filter(ext => ext.length > 1)

  if (extensions.length === 0) {
    showStatusMessage('Please provide valid file formats', true)
    return
  }

  const customCategories = loadCustomCategories()
  const category = customCategories.find(cat => cat.id === categoryId)
  
  if (category) {
    // Check for duplicate names (excluding current category)
    const nameExists = customCategories.find(cat =>
      cat.id !== categoryId && cat.name.toLowerCase() === categoryName.toLowerCase()
    )
    
    if (nameExists) {
      showStatusMessage('A category with this name already exists', true)
      return
    }

    category.name = categoryName
    category.extensions = extensions
    category.folderName = folderName
    
    saveCustomCategories(customCategories)
    updateCustomCategoriesList()
    closeEditDialog()
    showStatusMessage(`Category "${categoryName}" updated successfully`)
  }
}

function closeEditDialog() {
  const dialog = document.querySelector('.edit-category-dialog')
  if (dialog) {
    dialog.remove()
  }
}

function deleteCategory(categoryId) {
  const customCategories = loadCustomCategories()
  const category = customCategories.find(cat => cat.id === categoryId)
  
  if (!category) return

  if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
    const updatedCategories = customCategories.filter(cat => cat.id !== categoryId)
    saveCustomCategories(updatedCategories)
    updateCustomCategoriesList()
    showStatusMessage(`Category "${category.name}" deleted`)
  }
}

function addFormatToCategory(categoryId) {
  const customCategories = loadCustomCategories()
  const category = customCategories.find(cat => cat.id === categoryId)
  
  if (!category) return

  const formatInput = prompt(`Add new format to "${category.name}" (include the dot, e.g., .xyz):`)
  
  if (formatInput) {
    let newFormat = formatInput.trim().toLowerCase()
    if (!newFormat.startsWith('.')) {
      newFormat = '.' + newFormat
    }

    if (!category.extensions.includes(newFormat)) {
      category.extensions.push(newFormat)
      saveCustomCategories(customCategories)
      updateCustomCategoriesList()
      showStatusMessage(`Format "${newFormat}" added to "${category.name}"`)
    } else {
      showStatusMessage('This format already exists in the category', true)
    }
  }
}

// Expose functions to global scope for HTML button handlers
window.selectSourceFolder = selectSourceFolder
window.selectBaseTargetFolder = selectBaseTargetFolder
window.selectTargetSubfolder = selectTargetSubfolder
window.sortFiles = sortFiles
window.toggleCategoryEnabled = toggleCategoryEnabled
window.editCategory = editCategory
window.saveCategoryEdit = saveCategoryEdit
window.closeEditDialog = closeEditDialog
window.deleteCategory = deleteCategory
window.addFormatToCategory = addFormatToCategory
window.addCustomCategory = addCustomCategory
window.removeFormatFromList = removeFormatFromList