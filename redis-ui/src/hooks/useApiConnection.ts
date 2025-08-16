import { useEffect } from 'react';
import { useAppStore } from '../store';
import { apiService } from '../services/api';

/**
 * Hook to monitor API connection status when WebSocket is not available
 * Falls back to HTTP API polling for basic connectivity
 */
export const useApiConnection = () => {
  const { setConnectionStatus, connectionStatus } = useAppStore();

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isDestroyed = false;

    const checkApiConnection = async () => {
      if (isDestroyed) return;
      
      try {
        // Try to hit a simple health endpoint
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/health`, {
          method: 'GET',
          timeout: 5000,
        } as RequestInit);
        
        if (!isDestroyed && response.ok) {
          // Only update if we're not already connected via WebSocket
          if (!connectionStatus.connected) {
            setConnectionStatus({
              connected: true,
              reconnecting: false,
              lastConnected: new Date(),
              error: 'HTTP API only - WebSocket not available'
            });
          }
        } else {
          throw new Error('API not responding');
        }
      } catch (error) {
        if (!isDestroyed) {
          setConnectionStatus({
            connected: false,
            reconnecting: false,
            error: 'API connection failed'
          });
        }
      }
    };

    // Initial check
    checkApiConnection();

    // Poll every 30 seconds for basic connectivity
    intervalId = setInterval(checkApiConnection, 30000);

    return () => {
      isDestroyed = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [setConnectionStatus, connectionStatus.connected]);
};
