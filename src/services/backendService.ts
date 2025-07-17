// Real Backend Service for AI Code Editor
import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

class BackendService {
  private api: AxiosInstance;
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.api = axios.create({
      baseURL: BACKEND_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ API Response Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );

    this.initWebSocket();
  }

  // ============================================================================
  // 🌐 WEBSOCKET MANAGEMENT
  // ============================================================================

  private initWebSocket() {
    const wsUrl = BACKEND_URL.replace('http', 'ws');
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ WebSocket message parsing error:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        // Reconnect after 3 seconds
        setTimeout(() => this.initWebSocket(), 3000);
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ WebSocket initialization error:', error);
    }
  }

  private handleWebSocketMessage(data: any) {
    const listeners = this.wsListeners.get(data.type) || [];
    listeners.forEach(listener => listener(data));
  }

  public onWebSocketMessage(type: string, listener: Function) {
    if (!this.wsListeners.has(type)) {
      this.wsListeners.set(type, []);
    }
    this.wsListeners.get(type)!.push(listener);
  }

  public offWebSocketMessage(type: string, listener: Function) {
    const listeners = this.wsListeners.get(type) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private sendWebSocketMessage(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // ============================================================================
  // 📁 FILE SYSTEM OPERATIONS
  // ============================================================================

  async getFileTree(path: string = ''): Promise<any[]> {
    try {
      const response = await this.api.get('/api/files', { params: { path } });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching file tree:', error);
      return [];
    }
  }

  async readFile(filePath: string): Promise<{
    content: string;
    size: number;
    modified: string;
    mimeType: string;
  } | null> {
    try {
      const response = await this.api.get(`/api/files/${filePath}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error reading file:', error);
      return null;
    }
  }

  async writeFile(filePath: string, content: string, createDir: boolean = true): Promise<boolean> {
    try {
      const response = await this.api.post(`/api/files/${filePath}`, {
        content,
        createDir
      });
      return response.data.success;
    } catch (error) {
      console.error('❌ Error writing file:', error);
      return false;
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const response = await this.api.delete(`/api/files/${filePath}`);
      return response.data.success;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<boolean> {
    try {
      const response = await this.api.post(`/api/directories/${dirPath}`);
      return response.data.success;
    } catch (error) {
      console.error('❌ Error creating directory:', error);
      return false;
    }
  }

  async uploadFiles(files: File[], targetPath: string = ''): Promise<any[]> {
    try {
      const filePromises = files.map(file => {
        return new Promise<any>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const content = reader.result as string;
            const base64Content = content.split(',')[1]; // Remove data:... prefix
            resolve({
              name: file.name,
              content: base64Content,
              size: file.size,
              type: file.type
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const fileData = await Promise.all(filePromises);
      
      const response = await this.api.post('/api/upload', {
        files: fileData,
        targetPath
      });
      
      return response.data.files;
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      return [];
    }
  }

  // ============================================================================
  // 🖥️ TERMINAL OPERATIONS
  // ============================================================================

  async createTerminal(cwd?: string, shell?: string): Promise<{
    terminalId: string;
    shell: string;
    cwd: string;
  } | null> {
    try {
      const response = await this.api.post('/api/terminal', { cwd, shell });
      if (response.data.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error creating terminal:', error);
      return null;
    }
  }

  async executeCommand(terminalId: string, command: string): Promise<{
    output: string;
    success: boolean;
  }> {
    try {
      const response = await this.api.post(`/api/terminal/${terminalId}/execute`, {
        command
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error executing command:', error);
      return { output: 'Error executing command', success: false };
    }
  }

  connectToTerminal(terminalId: string) {
    this.sendWebSocketMessage({
      type: 'terminal_connect',
      terminalId
    });
  }

  sendTerminalInput(terminalId: string, input: string) {
    this.sendWebSocketMessage({
      type: 'terminal_input',
      terminalId,
      input
    });
  }

  onTerminalOutput(callback: (terminalId: string, output: string) => void) {
    this.onWebSocketMessage('terminal_output', (data: any) => {
      callback(data.terminalId, data.data);
    });
  }

  onTerminalExit(callback: (terminalId: string, code: number) => void) {
    this.onWebSocketMessage('terminal_exit', (data: any) => {
      callback(data.terminalId, data.code);
    });
  }

  // ============================================================================
  // 🤖 AI OPERATIONS
  // ============================================================================

  async chatWithAI(message: string, model?: string, context?: any): Promise<{
    response: string;
    success: boolean;
    model: string;
    context?: any;
  }> {
    try {
      const response = await this.api.post('/api/chat', {
        message,
        model,
        context
      });
      
      if (response.data.success) {
        return response.data;
      }
      
      return {
        response: 'Failed to get AI response',
        success: false,
        model: model || 'unknown'
      };
    } catch (error) {
      console.error('❌ Error with AI chat:', error);
      return {
        response: 'Error communicating with AI',
        success: false,
        model: model || 'unknown'
      };
    }
  }

  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/models');
      return response.data.models || [];
    } catch (error) {
      console.error('❌ Error fetching AI models:', error);
      return [];
    }
  }

  // ============================================================================
  // 🚀 REMOTE SERVERS
  // ============================================================================

  async getRemoteServers(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/remote-servers');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching remote servers:', error);
      return [];
    }
  }

  async executeRemoteCommand(serverId: string, command: string): Promise<any> {
    try {
      const response = await this.api.post('/api/remote-execute', {
        serverId,
        command
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error executing remote command:', error);
      return { success: false, error: 'Failed to execute remote command' };
    }
  }

  // ============================================================================
  // 📊 MONITORING
  // ============================================================================

  async getServerStatus(): Promise<any> {
    try {
      const response = await this.api.get('/api/status');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching server status:', error);
      return { status: 'error', error: 'Failed to fetch server status' };
    }
  }

  async getHealthCheck(): Promise<any> {
    try {
      const response = await this.api.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching health check:', error);
      return { status: 'error', error: 'Failed to fetch health check' };
    }
  }

  // ============================================================================
  // 🔄 FILE WATCHING
  // ============================================================================

  watchFiles(path: string) {
    this.sendWebSocketMessage({
      type: 'file_watch',
      path
    });
  }

  onFileChanged(callback: (path: string, action: string) => void) {
    this.onWebSocketMessage('file_changed', (data: any) => {
      callback(data.data.path, data.data.action);
    });
  }
}

// Create singleton instance
const backendService = new BackendService();

export default backendService; 