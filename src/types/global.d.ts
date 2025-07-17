// Global type definitions for AI Code Editor

// Electron API types
interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  
  // File dialogs
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;
  
  // Menu events
  onMenuNewFile: (callback: () => void) => void;
  onMenuOpenFile: (callback: (filePath: string) => void) => void;
  onMenuOpenFolder: (callback: (folderPath: string) => void) => void;
  onMenuSave: (callback: () => void) => void;
  onMenuAIGenerate: (callback: () => void) => void;
  onMenuAIChat: (callback: () => void) => void;
  onMenuAIAnalyze: (callback: () => void) => void;
  onMenuAIRefactor: (callback: () => void) => void;
  
  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

// Extend Window interface
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// File system types
export interface FileSystemItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  isModified?: boolean;
  isLoaded?: boolean;
  children?: FileSystemItem[];
  isExpanded?: boolean;
}

export interface FileItem extends FileSystemItem {
  type: 'file';
  content: string;
  language: string;
  isModified: boolean;
  isLoaded: boolean;
}

export interface FolderItem extends FileSystemItem {
  type: 'folder';
  children: FileSystemItem[];
  isExpanded: boolean;
}

// Terminal types
export interface TerminalLine {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

export interface TerminalContextType {
  lines: TerminalLine[];
  executeCommand: (command: string) => Promise<{ output: string; error?: string }>;
  clearTerminal: () => void;
  addLine: (line: Omit<TerminalLine, 'id' | 'timestamp'>) => void;
  getHistory: () => string[];
}

// AI types
export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
}

export interface AIModelResponse {
  content: string;
  thinking?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgent: string;
  result?: any;
  thinking?: string;
  actions?: any[];
}

export interface AgentWorkflow {
  id: string;
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  tasks: AgentTask[];
  createdAt: Date;
  completedAt?: Date;
}

// Settings types
export interface AppSettings {
  editor: {
    theme: string;
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    autoSave: boolean;
    autoSaveDelay: number;
  };
  ai: {
    models: AIModelConfig[];
    agents: any[];
    selectedAgents: any;
    enableWebSearch: boolean;
    enableTerminalAccess: boolean;
    enableFileOperations: boolean;
    maxConcurrentRequests: number;
  };
  version: string;
}

// API types
export interface BackendFileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  isDirectory: boolean;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
}; 