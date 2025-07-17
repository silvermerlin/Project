import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { wsService, useWebSocketStatus } from '../services/websocket';
import { isRailwayBackend, isLocalBackend } from '../config/api';

interface BackendStatusProps {
  className?: string;
}

const BackendStatus: React.FC<BackendStatusProps> = ({ className = '' }) => {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const wsStatus = useWebSocketStatus();

  // Check API health
  const checkApiHealth = async () => {
    try {
      setApiStatus('checking');
      await apiService.healthCheck();
      setApiStatus('connected');
      setLastCheck(new Date());
    } catch (error) {
      console.error('API health check failed:', error);
      setApiStatus('error');
      setLastCheck(new Date());
    }
  };

  // Connect to WebSocket
  const connectWebSocket = async () => {
    try {
      await wsService.connect();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
    }
  };

  // Initial health check
  useEffect(() => {
    checkApiHealth();
    connectWebSocket();

    // Set up periodic health checks
    const interval = setInterval(checkApiHealth, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      wsService.disconnect();
    };
  }, []);

  // Get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'OPEN':
        return 'text-green-500';
      case 'checking':
      case 'CONNECTING':
        return 'text-yellow-500';
      case 'error':
      case 'CLOSED':
      case 'CLOSING':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'OPEN':
        return '🟢';
      case 'checking':
      case 'CONNECTING':
        return '🟡';
      case 'error':
      case 'CLOSED':
      case 'CLOSING':
        return '🔴';
      default:
        return '⚪';
    }
  };

  // Get backend type
  const getBackendType = () => {
    if (isRailwayBackend()) return 'Railway';
    if (isLocalBackend()) return 'Local';
    return 'Unknown';
  };

  return (
    <div className={`flex items-center space-x-4 text-sm ${className}`}>
      {/* Backend Type */}
      <div className="flex items-center space-x-2">
        <span className="text-gray-600">Backend:</span>
        <span className="font-medium">{getBackendType()}</span>
      </div>

      {/* API Status */}
      <div className="flex items-center space-x-2">
        <span className="text-gray-600">API:</span>
        <span className={`flex items-center space-x-1 ${getStatusColor(apiStatus)}`}>
          <span>{getStatusIcon(apiStatus)}</span>
          <span className="capitalize">{apiStatus}</span>
        </span>
      </div>

      {/* WebSocket Status */}
      <div className="flex items-center space-x-2">
        <span className="text-gray-600">WS:</span>
        <span className={`flex items-center space-x-1 ${getStatusColor(wsStatus.connectionState)}`}>
          <span>{getStatusIcon(wsStatus.connectionState)}</span>
          <span className="capitalize">{wsStatus.connectionState.toLowerCase()}</span>
        </span>
      </div>

      {/* Last Check */}
      {lastCheck && (
        <div className="flex items-center space-x-2">
          <span className="text-gray-600">Last:</span>
          <span className="text-xs text-gray-500">
            {lastCheck.toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Manual Refresh Button */}
      <button
        onClick={checkApiHealth}
        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        disabled={apiStatus === 'checking'}
      >
        {apiStatus === 'checking' ? 'Checking...' : 'Refresh'}
      </button>
    </div>
  );
};

export default BackendStatus; 