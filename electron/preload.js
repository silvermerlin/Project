const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Menu events
  onMenuNewFile: (callback) => ipcRenderer.on('menu-new-file', callback),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu-open-file', callback),
  onMenuOpenFolder: (callback) => ipcRenderer.on('menu-open-folder', callback),
  onMenuSave: (callback) => ipcRenderer.on('menu-save', callback),
  onMenuAIGenerate: (callback) => ipcRenderer.on('menu-ai-generate', callback),
  onMenuAIChat: (callback) => ipcRenderer.on('menu-ai-chat', callback),
  onMenuAIAnalyze: (callback) => ipcRenderer.on('menu-ai-analyze', callback),
  onMenuAIRefactor: (callback) => ipcRenderer.on('menu-ai-refactor', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
}); 