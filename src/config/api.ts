// API Configuration for AI Code Editor
// Supports both local development and desktop app

const isElectron = window.electronAPI !== undefined;
const isLocalDev = import.meta.env.DEV;

// Determine API base URL
let API_BASE_URL: string;

if (isElectron) {
  // In Electron app, always use local backend
  API_BASE_URL = 'http://localhost:8080';
} else if (isLocalDev) {
  // In browser development, use local backend
  API_BASE_URL = 'http://localhost:8080';
} else {
  // In production browser, use Railway backend
  API_BASE_URL = 'https://project-production-a055.up.railway.app';
}

// WebSocket URL
export const WS_URL = API_BASE_URL.replace('http', 'ws');

// API endpoints
export const API_ENDPOINTS = {
  // Health check
  health: `${API_BASE_URL}/api/health`,
  
  // File operations
  listFiles: `${API_BASE_URL}/api/files`,
  getFileContent: (path: string) => `${API_BASE_URL}/api/files/${encodeURIComponent(path)}`,
  saveFileContent: (path: string) => `${API_BASE_URL}/api/files/${encodeURIComponent(path)}`,
  createFile: (path: string) => `${API_BASE_URL}/api/files/${encodeURIComponent(path)}`,
  deleteFile: (path: string) => `${API_BASE_URL}/api/files/${encodeURIComponent(path)}`,
  renameFile: (path: string) => `${API_BASE_URL}/api/files/${encodeURIComponent(path)}/rename`,
  uploadFile: `${API_BASE_URL}/api/upload`,
  
  // Terminal operations
  createTerminal: `${API_BASE_URL}/api/terminal`,
  executeCommand: (id: string) => `${API_BASE_URL}/api/terminal/${id}/execute`,
  
  // AI operations
  aiChat: `${API_BASE_URL}/api/ai/chat`,
  aiComplete: `${API_BASE_URL}/api/ai/complete`,
  
  // Ollama proxy
  ollamaProxy: `${API_BASE_URL}/api/ollama`,
  
  // Git operations
  gitStatus: `${API_BASE_URL}/api/git/status`,
  gitCommit: `${API_BASE_URL}/api/git/commit`,
  gitPush: `${API_BASE_URL}/api/git/push`,
  
  // Package management
  listPackages: `${API_BASE_URL}/api/packages`,
  installPackage: `${API_BASE_URL}/api/packages/install`,
  uninstallPackage: `${API_BASE_URL}/api/packages/uninstall`,
  
  // System info
  systemInfo: `${API_BASE_URL}/api/system/info`,
};

// Helper functions for API URLs
export const getApiUrl = (endpoint: string) => {
  // If endpoint already starts with http, return as is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  // Otherwise, add to base URL
  return `${API_BASE_URL}${endpoint}`;
};
export const getWsUrl = () => WS_URL;

// Request configuration
export const requestConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' as const,
};

// WebSocket configuration
export const wsConfig = {
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
};

// WebSocket events
export const WS_EVENTS = {
  FILE_CHANGED: 'file_changed',
  FILE_CREATED: 'file_created',
  FILE_DELETED: 'file_deleted',
  TERMINAL_OUTPUT: 'terminal_output',
  TERMINAL_EXIT: 'terminal_exit',
  AI_RESPONSE: 'ai_response',
  SYSTEM_UPDATE: 'system_update',
};

// Environment detection
export const isRailwayBackend = () => !isLocalDev && !isElectron;
export const isLocalBackend = () => isLocalDev || isElectron;
export const isDesktopApp = () => isElectron;

// Log configuration
console.log('🔧 API Configuration:', {
  isElectron,
  isLocalDev,
  API_BASE_URL,
  isRailwayBackend: isRailwayBackend(),
  isLocalBackend: isLocalBackend(),
  isDesktopApp: isDesktopApp()
}); 