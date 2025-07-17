// API Configuration for AI Code Editor
// Supports both local development and Railway production

const isDevelopment = import.meta.env.DEV;

// Backend URLs
export const API_CONFIG = {
  // Development (local backend)
  development: {
    baseURL: 'http://localhost:8080',
    wsURL: 'ws://localhost:8080',
  },
  // Production (Railway backend)
  production: {
    baseURL: import.meta.env.VITE_API_URL || 'https://project-production-a055.up.railway.app',
    wsURL: import.meta.env.VITE_WS_URL || 'wss://project-production-a055.up.railway.app',
  }
};

// Current configuration based on environment
export const currentConfig = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// API endpoints
export const API_ENDPOINTS = {
  // File operations
  uploadFile: '/api/files/upload',
  downloadFile: '/api/files/download',
  deleteFile: '/api/files/delete',
  renameFile: '/api/files/rename',
  createFile: '/api/files/create',
  createFolder: '/api/files/create-folder',
  
  // File system
  listFiles: '/api/files/list',
  getFileContent: '/api/files/content',
  saveFileContent: '/api/files/save',
  
  // Terminal
  terminal: '/api/terminal',
  
  // AI/LLM
  aiChat: '/api/ai/chat',
  aiComplete: '/api/ai/complete',
  
  // System
  health: '/api/health',
  systemInfo: '/api/system/info',
  
  // Git operations
  gitStatus: '/api/git/status',
  gitCommit: '/api/git/commit',
  gitPush: '/api/git/push',
  gitPull: '/api/git/pull',
  
  // Package management
  installPackage: '/api/packages/install',
  listPackages: '/api/packages/list',
  uninstallPackage: '/api/packages/uninstall',
};

// WebSocket events
export const WS_EVENTS = {
  // File system events
  FILE_CREATED: 'file:created',
  FILE_UPDATED: 'file:updated',
  FILE_DELETED: 'file:deleted',
  FILE_RENAMED: 'file:renamed',
  
  // Terminal events
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  
  // AI events
  AI_RESPONSE: 'ai:response',
  AI_STREAM: 'ai:stream',
  
  // System events
  SYSTEM_UPDATE: 'system:update',
  ERROR: 'error',
};

// Helper functions
export const getApiUrl = (endpoint: string): string => {
  return `${currentConfig.baseURL}${endpoint}`;
};

export const getWsUrl = (): string => {
  return currentConfig.wsURL;
};

// Request configuration
export const requestConfig = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for authentication if needed
};

// WebSocket configuration
export const wsConfig = {
  reconnectInterval: 1000, // 1 second
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000, // 30 seconds
};

// Environment detection
export const isRailwayBackend = () => {
  return !isDevelopment && currentConfig.baseURL.includes('railway.app');
};

export const isLocalBackend = () => {
  return isDevelopment || currentConfig.baseURL.includes('localhost');
};

// Log current configuration (for debugging)
console.log('🔧 API Configuration:', {
  environment: isDevelopment ? 'development' : 'production',
  baseURL: currentConfig.baseURL,
  wsURL: currentConfig.wsURL,
  isRailway: isRailwayBackend(),
  isLocal: isLocalBackend(),
  envVars: {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
  }
}); 