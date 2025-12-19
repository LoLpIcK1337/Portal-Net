const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  enableAutoLaunch: () => ipcRenderer.invoke('enable-auto-launch'),
  disableAutoLaunch: () => ipcRenderer.invoke('disable-auto-launch'),
  isAutoLaunchEnabled: () => ipcRenderer.invoke('is-auto-launch-enabled'),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  getConfig: () => ipcRenderer.invoke('get-config'),
  onFileSorted: (callback) => ipcRenderer.on('file-sorted', callback),
  getPath: (name) => ipcRenderer.invoke('get-path', name),
  exportConfig: () => ipcRenderer.invoke('export-config'),
  importConfig: () => ipcRenderer.invoke('import-config')
})

// Expose dialog API for folder selection
contextBridge.exposeInMainWorld('dialog', {
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
})