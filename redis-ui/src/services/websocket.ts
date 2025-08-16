import { io, Socket } from 'socket.io-client';

// Global tracker to prevent multiple WebSocket connections per user session
const globalConnectionTracker = {
  activeConnections: new Set<string>(),
  pendingConnections: new Set<string>(),
  userConnections: new Map<string, string>(), // username -> instanceId
  
  addConnection: (instanceId: string, username?: string) => {
    globalConnectionTracker.activeConnections.add(instanceId);
    if (username) {
      // Check if this user already has a connection
      const existingInstanceId = globalConnectionTracker.userConnections.get(username);
      if (existingInstanceId && existingInstanceId !== instanceId) {
        console.warn(`⚠️ User ${username} already has connection ${existingInstanceId}, but creating ${instanceId}`);
      }
      globalConnectionTracker.userConnections.set(username, instanceId);
    }
    console.log(`📊 Active connections: ${globalConnectionTracker.activeConnections.size}`, Array.from(globalConnectionTracker.activeConnections));
    console.log(`👥 User connections:`, Array.from(globalConnectionTracker.userConnections.entries()));
  },
  
  removeConnection: (instanceId: string) => {
    globalConnectionTracker.activeConnections.delete(instanceId);
    globalConnectionTracker.pendingConnections.delete(instanceId);
    // Remove from user connections
    for (const [username, connectedInstanceId] of globalConnectionTracker.userConnections.entries()) {
      if (connectedInstanceId === instanceId) {
        globalConnectionTracker.userConnections.delete(username);
        break;
      }
    }
    console.log(`📊 Active connections: ${globalConnectionTracker.activeConnections.size}`, Array.from(globalConnectionTracker.activeConnections));
  },
  
  shouldAllowConnection: (instanceId: string): boolean => {
    // Only allow connection if we don't have too many pending
    if (globalConnectionTracker.pendingConnections.size >= 2) {
      console.warn(`🚫 Too many pending connections (${globalConnectionTracker.pendingConnections.size}), blocking ${instanceId}`);
      return false;
    }
    globalConnectionTracker.pendingConnections.add(instanceId);
    return true;
  }
};

export interface PubSubMessage {
  id: string;
  channel: string;
  message: string;
  timestamp: Date;
  sender?: string;
}

export interface Channel {
  name: string;
  subscribed: boolean;
  messageCount: number;
  lastActivity: Date;
  subscriberCount: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, (message: PubSubMessage) => void> = new Map();
  private subscriptionHandlers: Map<string, (data: any) => void> = new Map();
  private connectionHandlers: Array<(connected: boolean) => void> = [];
  private channels: Map<string, Channel> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private mainMessageHandler: ((message: PubSubMessage) => void) | null = null;
  private handlersSetup = false; // Track if event handlers are already set up
  private instanceId: string; // Unique identifier for this instance

  constructor(forceNewConnection: boolean = false) {
    // Add a unique identifier for this instance
    this.instanceId = Math.random().toString(36).substr(2, 9);
    console.log(`🆕 Creating WebSocket service instance: ${this.instanceId}`);
    
    // Check if we should allow this connection
    if (!globalConnectionTracker.shouldAllowConnection(this.instanceId)) {
      console.warn(`🚫 Connection blocked for instance: ${this.instanceId}`);
      return;
    }
    
    globalConnectionTracker.addConnection(this.instanceId);
    this.connect(forceNewConnection);
  }

  private connect(forceNewConnection: boolean = false) {
    // Prevent duplicate connections
    if (this.socket && this.socket.connected && !forceNewConnection) {
      console.log(`⚠️ WebSocket already connected (instance: ${this.instanceId}), skipping duplicate connection`);
      return;
    }
    
    // Disconnect existing connection before creating new one
    if (this.socket) {
      console.log(`🔄 Disconnecting existing socket before creating new connection (instance: ${this.instanceId})`);
      this.socket.disconnect();
    }
    
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    console.log(`Socket.IO connecting to: ${apiUrl} (instance: ${this.instanceId})`);
    
    this.socket = io(apiUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      secure: apiUrl.startsWith('https://'),
      rejectUnauthorized: false,
      // Add query to help distinguish connections
      query: {
        instanceId: this.instanceId,
        timestamp: Date.now().toString()
      },
      // Force new connection for multiple tabs
      forceNew: forceNewConnection,
      // Enable multiplexing but with unique namespace
      multiplex: true
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket || this.handlersSetup) return;
    
    console.log('🔧 Setting up WebSocket event handlers (first time only)');
    this.handlersSetup = true;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.connectionHandlers.forEach(handler => handler(true));
      
      // Send user identification when connected
      const username = localStorage.getItem('pubsub-username') || 'Anonymous';
      this.socket?.emit('identify', { username });
      console.log(`🔗 Socket.IO identified as: ${username}`);
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.connectionHandlers.forEach(handler => handler(false));
    });

    this.socket.on('message', (data: any) => {
      console.log('📨 WebSocket received message:', data);
      const message: PubSubMessage = {
        id: Date.now().toString(),
        channel: data.channel,
        message: data.message,
        timestamp: new Date(data.timestamp),
        sender: data.sender || 'system'
      };

      // Update channel info
      if (this.channels.has(data.channel)) {
        const channel = this.channels.get(data.channel)!;
        channel.messageCount++;
        channel.lastActivity = new Date();
        this.channels.set(data.channel, channel);
      }

      // Only notify the main message handler to prevent duplicates
      if (this.mainMessageHandler) {
        console.log('🔔 Calling main message handler for:', message.message);
        this.mainMessageHandler(message);
      } else {
        console.warn('⚠️ No main message handler registered!');
      }
    });

    this.socket.on('subscribed', (data: any) => {
      console.log('Subscribed to channel:', data.channel);
      if (this.channels.has(data.channel)) {
        const channel = this.channels.get(data.channel)!;
        channel.subscribed = true;
        this.channels.set(data.channel, channel);
      }
      
      const handler = this.subscriptionHandlers.get(`subscribed_${data.channel}`);
      if (handler) handler(data);
    });

    this.socket.on('unsubscribed', (data: any) => {
      console.log('Unsubscribed from channel:', data.channel);
      if (this.channels.has(data.channel)) {
        const channel = this.channels.get(data.channel)!;
        channel.subscribed = false;
        this.channels.set(data.channel, channel);
      }
      
      const handler = this.subscriptionHandlers.get(`unsubscribed_${data.channel}`);
      if (handler) handler(data);
    });

    this.socket.on('channel_subscriber_update', (data: any) => {
      console.log('Channel subscriber count updated:', data);
      if (this.channels.has(data.channel)) {
        const channel = this.channels.get(data.channel)!;
        channel.subscriberCount = data.subscriberCount;
        this.channels.set(data.channel, channel);
      }
      
      // Notify all global subscriber update handlers
      this.subscriptionHandlers.forEach((handler, key) => {
        if (key.startsWith('global_subscriber_update_')) {
          handler(data);
        }
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.connectionHandlers.forEach(handler => handler(false));
      }
    });
  }

  // Update user identification
  updateUsername(username: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('identify', { username });
      console.log(`🔄 Username updated to: ${username}`);
    }
  }

  // Channel management
  subscribe(channel: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Check if already subscribed
      if (this.channels.has(channel)) {
        const existingChannel = this.channels.get(channel)!;
        if (existingChannel.subscribed) {
          console.log(`Already subscribed to channel: ${channel}`);
          resolve(true);
          return;
        }
      }

      // Add to local channels
      if (!this.channels.has(channel)) {
        this.channels.set(channel, {
          name: channel,
          subscribed: false,
          messageCount: 0,
          lastActivity: new Date(),
          subscriberCount: 0
        });
      }

      // Set up subscription handler
      const handlerKey = `subscribed_${channel}`;
      
      // Clean up any existing handler for this channel
      if (this.subscriptionHandlers.has(handlerKey)) {
        this.subscriptionHandlers.delete(handlerKey);
      }
      
      this.subscriptionHandlers.set(handlerKey, (data) => {
        this.subscriptionHandlers.delete(handlerKey);
        console.log(`Subscription confirmed for channel: ${channel}`);
        resolve(data.success);
      });

      // Send subscription request
      console.log(`Sending subscription request for channel: ${channel}`);
      this.socket.emit('subscribe', channel);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.subscriptionHandlers.has(handlerKey)) {
          this.subscriptionHandlers.delete(handlerKey);
          reject(new Error('Subscription timeout'));
        }
      }, 5000);
    });
  }

  unsubscribe(channel: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Check if already unsubscribed
      if (this.channels.has(channel)) {
        const existingChannel = this.channels.get(channel)!;
        if (!existingChannel.subscribed) {
          console.log(`Already unsubscribed from channel: ${channel}`);
          resolve(true);
          return;
        }
      }

      // Set up unsubscription handler
      const handlerKey = `unsubscribed_${channel}`;
      
      // Clean up any existing handler for this channel
      if (this.subscriptionHandlers.has(handlerKey)) {
        this.subscriptionHandlers.delete(handlerKey);
      }
      
      this.subscriptionHandlers.set(handlerKey, (data) => {
        this.subscriptionHandlers.delete(handlerKey);
        console.log(`Unsubscription confirmed for channel: ${channel}`);
        resolve(data.success);
      });

      // Send unsubscription request
      console.log(`Sending unsubscription request for channel: ${channel}`);
      this.socket.emit('unsubscribe', channel);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.subscriptionHandlers.has(handlerKey)) {
          this.subscriptionHandlers.delete(handlerKey);
          reject(new Error('Unsubscription timeout'));
        }
      }, 5000);
    });
  }

  // Message handling - only one main handler allowed to prevent duplicates
  onMessage(handler: (message: PubSubMessage) => void): () => void {
    // Clear any existing main handler
    this.mainMessageHandler = handler;
    console.log('🔗 Main message handler registered');
    
    return () => {
      if (this.mainMessageHandler === handler) {
        this.mainMessageHandler = null;
        console.log('🔌 Main message handler unregistered');
      }
    };
  }

  // Global subscriber update handling
  onGlobalSubscriberUpdate(handler: (data: any) => void): () => void {
    const handlerId = `global_subscriber_update_${Date.now()}`;
    this.subscriptionHandlers.set(handlerId, handler);
    
    console.log('🔗 Global subscriber update handler registered');
    
    return () => {
      this.subscriptionHandlers.delete(handlerId);
      console.log('🔌 Global subscriber update handler unregistered');
    };
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);
    
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  // Channel utilities
  getChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  getChannel(name: string): Channel | undefined {
    return this.channels.get(name);
  }

  addChannel(name: string) {
    if (!this.channels.has(name)) {
      this.channels.set(name, {
        name,
        subscribed: false,
        messageCount: 0,
        lastActivity: new Date(),
        subscriberCount: 0
      });
    }
    // Don't change existing channels - preserve their subscription state
  }

  removeChannel(name: string) {
    if (this.channels.has(name)) {
      // Don't automatically unsubscribe - let the user explicitly unsubscribe
      // This prevents the subscribe/unsubscribe loop
      this.channels.delete(name);
    }
  }

  // Connection utilities
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.handlersSetup = false; // Reset handlers setup flag
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      console.log(`🔌 Disconnecting WebSocket service instance: ${this.instanceId}`);
      this.socket.disconnect();
      this.socket = null;
      this.handlersSetup = false; // Reset handlers setup flag
      globalConnectionTracker.removeConnection(this.instanceId);
    }
  }
}

// Export only the class, no global singleton to prevent multiple connections
export { WebSocketService };
export default WebSocketService; 