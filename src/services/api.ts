import { getApiUrl, API_ENDPOINTS, requestConfig } from '../config/api';

// API Service for AI Code Editor
// Handles all backend communication

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = getApiUrl('');
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = getApiUrl(endpoint);
    const config: RequestInit = {
      ...requestConfig,
      ...options,
      headers: {
        ...requestConfig.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as T;
      }
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request(API_ENDPOINTS.health);
  }

  // Test endpoint for debugging
  async testConnection(): Promise<{ message: string; timestamp: string; ollamaHost: string; cors: string }> {
    return this.request('/api/test');
  }

  // File operations
  async listFiles(path: string = '/'): Promise<any[]> {
    console.log('📂 API: Requesting file list for path:', path);
    const result = await this.request(`${API_ENDPOINTS.listFiles}?path=${encodeURIComponent(path)}`);
    console.log('📂 API: File list response:', result);
    return result;
  }

  async getFileContent(path: string): Promise<string> {
    const response = await this.request<{ content: string }>(`${API_ENDPOINTS.getFileContent}?path=${encodeURIComponent(path)}`);
    return response.content;
  }

  async saveFileContent(path: string, content: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.saveFileContent, {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  async createFile(path: string, content: string = ''): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.createFile, {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  }

  async createFolder(path: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.createFolder, {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async deleteFile(path: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.deleteFile, {
      method: 'DELETE',
      body: JSON.stringify({ path }),
    });
  }

  async renameFile(oldPath: string, newPath: string): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.renameFile, {
      method: 'POST',
      body: JSON.stringify({ oldPath, newPath }),
    });
  }

  // File upload
  async uploadFile(file: File, path: string): Promise<{ success: boolean; filePath: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    console.log('📤 Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      targetPath: path
    });

    // For FormData, we need to completely override headers to avoid Content-Type conflicts
    const url = getApiUrl(API_ENDPOINTS.uploadFile);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type - let browser set it automatically for FormData
      });

      console.log('📥 Upload response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type')
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const result = await response.json();
        console.log('✅ Upload successful:', result);
        return result;
      } else {
        const result = await response.text();
        console.log('✅ Upload successful (text):', result);
        return result as any;
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw error;
    }
  }

  // File download
  async downloadFile(path: string): Promise<Blob> {
    const response = await fetch(getApiUrl(`${API_ENDPOINTS.downloadFile}?path=${encodeURIComponent(path)}`));
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    return response.blob();
  }

  // Terminal operations
  async executeCommand(command: string, cwd: string = '/'): Promise<{ output: string; exitCode: number }> {
    return this.request(API_ENDPOINTS.terminal, {
      method: 'POST',
      body: JSON.stringify({ command, cwd }),
    });
  }

  // AI operations
  async aiChat(message: string, context?: string): Promise<{ response: string }> {
    return this.request(API_ENDPOINTS.aiChat, {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  async aiComplete(code: string, language: string): Promise<{ completion: string }> {
    return this.request(API_ENDPOINTS.aiComplete, {
      method: 'POST',
      body: JSON.stringify({ code, language }),
    });
  }

  // Git operations
  async gitStatus(): Promise<{ status: string; files: any[] }> {
    return this.request(API_ENDPOINTS.gitStatus);
  }

  async gitCommit(message: string, files: string[] = []): Promise<{ success: boolean; commitId: string }> {
    return this.request(API_ENDPOINTS.gitCommit, {
      method: 'POST',
      body: JSON.stringify({ message, files }),
    });
  }

  async gitPush(): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.gitPush, {
      method: 'POST',
    });
  }

  async gitPull(): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.gitPull, {
      method: 'POST',
    });
  }

  // Package management
  async installPackage(packageName: string, packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'): Promise<{ success: boolean; output: string }> {
    return this.request(API_ENDPOINTS.installPackage, {
      method: 'POST',
      body: JSON.stringify({ packageName, packageManager }),
    });
  }

  async listPackages(): Promise<{ dependencies: any[]; devDependencies: any[] }> {
    return this.request(API_ENDPOINTS.listPackages);
  }

  async uninstallPackage(packageName: string, packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm'): Promise<{ success: boolean }> {
    return this.request(API_ENDPOINTS.uninstallPackage, {
      method: 'DELETE',
      body: JSON.stringify({ packageName, packageManager }),
    });
  }

  // System information
  async getSystemInfo(): Promise<{ platform: string; nodeVersion: string; memory: any; disk: any }> {
    return this.request(API_ENDPOINTS.systemInfo);
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for better TypeScript support
export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  isDirectory: boolean;
}

export interface TerminalSession {
  id: string;
  cwd: string;
  history: string[];
}

export interface GitStatus {
  status: string;
  files: Array<{
    path: string;
    status: string;
    staged: boolean;
  }>;
} 