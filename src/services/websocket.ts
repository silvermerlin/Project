import { getWsUrl, WS_EVENTS, wsConfig } from '../config/api';

// WebSocket Service for AI Code Editor
// Handles real-time communication with Railway backend

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketEventHandlers {
  onFileCreated?: (data: any) => void;
  onFileUpdated?: (data: any) => void;
  onFileDeleted?: (data: any) => void;
  onFileRenamed?: (data: any) => void;
  onTerminalOutput?: (data: any) => void;
  onAiResponse?: (data: any) => void;
  onSystemUpdate?: (data: any) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private eventHandlers: WebSocketEventHandlers = {};
  private isConnecting = false;
  private isManualClose = false;

  constructor() {
    this.setupEventHandlers();
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.isManualClose = false;

      try {
        const wsUrl = getWsUrl();
        console.log('🔌 Connecting to WebSocket:', wsUrl);
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.eventHandlers.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('❌ WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.eventHandlers.onDisconnect?.();
          
          if (!this.isManualClose) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  // Send message to WebSocket server
  send(type: string, data: any = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, cannot send message:', type);
      return;
    }

    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now(),
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('❌ Failed to send WebSocket message:', error);
    }
  }

  // Set event handlers
  setEventHandlers(handlers: WebSocketEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection state
  getConnectionState(): string {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  // Private methods

  private setupEventHandlers(): void {
    // Default handlers
    this.eventHandlers = {
      onError: (error) => {
        console.error('❌ WebSocket error:', error);
      },
      onConnect: () => {
        console.log('✅ WebSocket connected successfully');
      },
      onDisconnect: () => {
        console.log('❌ WebSocket disconnected');
      },
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case WS_EVENTS.FILE_CREATED:
          this.eventHandlers.onFileCreated?.(message.data);
          break;
        case WS_EVENTS.FILE_UPDATED:
          this.eventHandlers.onFileUpdated?.(message.data);
          break;
        case WS_EVENTS.FILE_DELETED:
          this.eventHandlers.onFileDeleted?.(message.data);
          break;
        case WS_EVENTS.FILE_RENAMED:
          this.eventHandlers.onFileRenamed?.(message.data);
          break;
        case WS_EVENTS.TERMINAL_OUTPUT:
          this.eventHandlers.onTerminalOutput?.(message.data);
          break;
        case WS_EVENTS.AI_RESPONSE:
          this.eventHandlers.onAiResponse?.(message.data);
          break;
        case WS_EVENTS.SYSTEM_UPDATE:
          this.eventHandlers.onSystemUpdate?.(message.data);
          break;
        case WS_EVENTS.ERROR:
          this.eventHandlers.onError?.(message.data);
          break;
        default:
          console.warn('⚠️ Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= wsConfig.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.clearReconnectTimer();
    
    const delay = wsConfig.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch((error) => {
        console.error('❌ Reconnection failed:', error);
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, wsConfig.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Export singleton instance
export const wsService = new WebSocketService();

// Export connection status hook for React components
export const useWebSocketStatus = () => {
  return {
    isConnected: wsService.isConnected(),
    connectionState: wsService.getConnectionState(),
  };
}; 