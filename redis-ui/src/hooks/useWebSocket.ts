import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store';
import { WebSocketMessage } from '../types';

export const useWebSocket = (url?: string) => {
  // Dynamically determine WebSocket URL based on environment
  const getWebSocketUrl = () => {
    if (url) return url;
    
    const apiUrl = process.env.REACT_APP_WS_URL || process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    // Convert HTTP/HTTPS to WS/WSS
    if (apiUrl.startsWith('https://')) {
      return apiUrl.replace('https://', 'wss://');
    } else if (apiUrl.startsWith('http://')) {
      return apiUrl.replace('http://', 'ws://');
    }
    
    return apiUrl;
  };
  
  const wsUrl = getWebSocketUrl();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const { setConnectionStatus, updateKey, updateTTLEntry, updateLRUEntry, addPerformanceMetric, updateNode } = useAppStore();

  const connect = () => {
    try {
      console.log('Connecting to WebSocket:', wsUrl);
      ws.current = new WebSocket(wsUrl);
      setIsReconnecting(false);

      ws.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus({ connected: true, reconnecting: false, lastConnected: new Date() });
        reconnectAttempts.current = 0;
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus({ connected: false, reconnecting: false });
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setIsReconnecting(true);
          setConnectionStatus({ connected: false, reconnecting: true });
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000));
        } else {
          // After max attempts, set to disabled state
          setIsDisabled(true);
          setConnectionStatus({ 
            connected: false, 
            reconnecting: false, 
            error: 'WebSocket not available - using HTTP API only' 
          });
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        reconnectAttempts.current++;
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          setIsDisabled(true);
          setConnectionStatus({ 
            connected: false, 
            reconnecting: false, 
            error: 'WebSocket not available - using HTTP API only' 
          });
        } else {
          setConnectionStatus({ 
            connected: false, 
            reconnecting: false, 
            error: 'Connection error' 
          });
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus({ 
        connected: false, 
        reconnecting: false, 
        error: 'Failed to connect' 
      });
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'keyUpdate':
        updateKey(message.data);
        break;
      case 'ttlUpdate':
        updateTTLEntry(message.data);
        break;
      case 'lruUpdate':
        updateLRUEntry(message.data);
        break;
      case 'nodeUpdate':
        updateNode(message.data);
        break;
      case 'metrics':
        addPerformanceMetric(message.data);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  };

  const disconnect = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    
    setIsConnected(false);
    setIsReconnecting(false);
    setConnectionStatus({ connected: false, reconnecting: false });
  };

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [url]);

  return {
    isConnected,
    isReconnecting,
    isDisabled,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}; 