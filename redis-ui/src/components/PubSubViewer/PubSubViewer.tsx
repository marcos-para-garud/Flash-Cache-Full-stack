import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, Users, Plus, Trash2, Radio, Volume2, VolumeX, Wifi, WifiOff, User, Edit3 } from 'lucide-react';
import { apiService } from '../../services/api';
import { WebSocketService, PubSubMessage, Channel } from '../../services/websocket';
import { useAppStore } from '../../store';

const PubSubViewer: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<PubSubMessage[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const soundEnabledRef = useRef(soundEnabled);
  
  // Get global store actions
  const { setConnectionStatus } = useAppStore();
  
  // Create a dedicated WebSocket service instance (StrictMode-safe with session singleton)
  const webSocketServiceRef = useRef<WebSocketService | null>(null);
  
  // Use session-based singleton to prevent StrictMode double connections
  const getOrCreateWebSocketService = useCallback(() => {
    // Get existing service from window/session if available
    if (typeof window !== 'undefined') {
      const sessionKey = `webSocketService_${window.location.pathname}`;
      
      // Check if we already have a service for this route in this session
      if (!(window as any)[sessionKey]) {
        console.log('🆕 Creating new session WebSocket service for PubSubViewer');
        console.log('🐛 Debug info:', {
          componentRender: new Date().toISOString(),
          pathname: window.location.pathname,
          sessionKey,
          tabId: sessionStorage.getItem('tabId') || 'new-tab'
        });
        
        // Set a unique tab ID if not exists
        if (!sessionStorage.getItem('tabId')) {
          const tabId = Math.random().toString(36).substr(2, 9);
          sessionStorage.setItem('tabId', tabId);
          console.log('📑 New tab ID created:', tabId);
        }
        
        (window as any)[sessionKey] = new WebSocketService(true);
      } else {
        console.log('♻️ Reusing existing session WebSocket service');
      }
      
      return (window as any)[sessionKey];
    }
    
    // Fallback for SSR/non-browser environments
    if (!webSocketServiceRef.current) {
      webSocketServiceRef.current = new WebSocketService(true);
    }
    return webSocketServiceRef.current;
  }, []);
  
  const webSocketService = getOrCreateWebSocketService();
  
  // Setup page close cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🚪 Page closing - disconnecting WebSocket');
      if (webSocketService) {
        webSocketService.disconnect();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      console.log('🧹 Component unmounting - removing beforeunload listener');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [webSocketService]);

  // Update ref when soundEnabled changes
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // User identity for this tab
  const [username, setUsername] = useState<string>('');
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [tempUsername, setTempUsername] = useState<string>('');

  // Generate a random username on first load
  useEffect(() => {
    const savedUsername = localStorage.getItem('pubsub-username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      const randomNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
      const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
      const randomNumber = Math.floor(Math.random() * 1000);
      const generatedUsername = `${randomName}${randomNumber}`;
      setUsername(generatedUsername);
      localStorage.setItem('pubsub-username', generatedUsername);
    }
  }, []);

  // Username management
  const handleUsernameEdit = () => {
    setTempUsername(username);
    setIsEditingUsername(true);
  };

  const handleUsernameSave = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      localStorage.setItem('pubsub-username', tempUsername.trim());
      setIsEditingUsername(false);
      console.log(`🏷️ Username updated to: ${tempUsername.trim()}`);
      // Notify the WebSocket service about the username change
      webSocketService.updateUsername(tempUsername.trim());
    }
  };

  const handleUsernameCancel = () => {
    setTempUsername('');
    setIsEditingUsername(false);
  };





  // Initialize WebSocket connection and load channels (one time only)
  useEffect(() => {
    const loadChannels = async () => {
      // Prevent multiple concurrent loads
      if (loadingChannels) return;
      
      setLoadingChannels(true);
      try {
        const response = await apiService.getChannels();
        if (response.success && response.data) {
          const backendChannels = response.data.map((ch: any) => {
            // Check WebSocket service first, then existing local state
            const existingWebSocketChannel = webSocketService.getChannel(ch.name);
            const existingLocalChannel = channels.find(c => c.name === ch.name);
            
            return {
              name: ch.name,
              subscribed: existingWebSocketChannel?.subscribed || existingLocalChannel?.subscribed || false,
              messageCount: existingLocalChannel?.messageCount || existingWebSocketChannel?.messageCount || 0,
              lastActivity: existingLocalChannel?.lastActivity || existingWebSocketChannel?.lastActivity || new Date(),
              subscriberCount: ch.subscribers || 0
            };
          });
          
          // Only update state if there are actual changes
          if (JSON.stringify(backendChannels) !== JSON.stringify(channels)) {
            setChannels(backendChannels);
          }
          
          // Add channels to websocket service but don't reset their state
          backendChannels.forEach((ch: Channel) => {
            webSocketService.addChannel(ch.name);
          });
        }
      } catch (error) {
        console.error('Failed to load channels:', error);
      } finally {
        setLoadingChannels(false);
      }
    };

    loadChannels();
    
    // Subscribe to connection status changes
    const handleConnectionChange = (isConnected: boolean) => {
      setConnected(isConnected);
      // Also update global connection status for Header display
      setConnectionStatus({ 
        connected: isConnected, 
        reconnecting: false,
        lastConnected: isConnected ? new Date() : undefined 
      });
      console.log(`🔄 Updated global connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
    };

    const connectionCleanup = webSocketService.onConnectionChange(handleConnectionChange);
    
    // Set initial connection status
    const initialStatus = webSocketService.isConnected();
    handleConnectionChange(initialStatus);

    return () => {
      connectionCleanup();
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate useEffect for message handling and subscriber updates (one time only)
  useEffect(() => {
    const handleNewMessage = (message: PubSubMessage) => {
      console.log('📨 Received message:', message);
      setMessages(prev => [...prev, message]);
      
      // Update channel last activity
      setChannels(prev => prev.map(ch => {
        if (ch.name === message.channel) {
          return {
            ...ch,
            lastActivity: new Date()
          };
        }
        return ch;
      }));

      // Play notification sound using ref to get current value
      if (soundEnabledRef.current) {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    };

    const messageCleanup = webSocketService.onMessage(handleNewMessage);

    return () => {
      messageCleanup();
    };
  }, []); // Empty dependency array - register handler only once

  // Listen for subscriber count updates
  useEffect(() => {
    const handleSubscriberUpdate = (data: any) => {
      console.log('🔔 Subscriber count updated:', data);
      setChannels(prev => prev.map(ch => {
        if (ch.name === data.channel) {
          return {
            ...ch,
            subscriberCount: data.subscriberCount
          };
        }
        return ch;
      }));
    };

    // We need to listen for all channel updates, so we'll add a global listener
    // through the WebSocket service
    const cleanup = webSocketService.onGlobalSubscriberUpdate(handleSubscriberUpdate);

    return () => {
      cleanup();
    };
  }, []); // Empty dependency array - register once

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubscribe = async (channelName: string) => {
    const channel = channels.find(c => c.name === channelName);
    if (!channel) return;

    // Prevent duplicate operations
    if (loading) {
      console.log('Subscription operation already in progress');
      return;
    }

    setLoading(true);
    try {
      if (channel.subscribed) {
        console.log(`Unsubscribing from channel: ${channelName}`);
        await webSocketService.unsubscribe(channelName);
      } else {
        console.log(`Subscribing to channel: ${channelName}`);
        await webSocketService.subscribe(channelName);
      }
      
      setChannels(prev => prev.map(c => 
        c.name === channelName 
          ? { ...c, subscribed: !c.subscribed }
          : c
      ));
      
      console.log(`Successfully ${channel.subscribed ? 'unsubscribed from' : 'subscribed to'} channel: ${channelName}`);
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (newChannelName.trim() && !channels.find(c => c.name === newChannelName)) {
      const newChannel: Channel = {
        name: newChannelName,
        subscribed: false,
        messageCount: 0,
        lastActivity: new Date(),
        subscriberCount: 0
      };
      
      setChannels(prev => [...prev, newChannel]);
      webSocketService.addChannel(newChannelName);
      setNewChannelName('');
      setSelectedChannel(newChannelName);
    }
  };

  const handleRemoveChannel = async (channelName: string) => {
    if (channels.length > 1) {
      // Unsubscribe if subscribed
      const channel = channels.find(c => c.name === channelName);
      if (channel?.subscribed) {
        try {
          await webSocketService.unsubscribe(channelName);
        } catch (error) {
          console.error('Failed to unsubscribe:', error);
        }
      }
      
      setChannels(prev => prev.filter(c => c.name !== channelName));
      webSocketService.removeChannel(channelName);
      
      if (selectedChannel === channelName) {
        setSelectedChannel(channels.find(c => c.name !== channelName)?.name || '');
      }
    }
  };

  const handlePublishMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !username) {
      return;
    }

    // Check if user is subscribed to the channel
    const channel = channels.find(c => c.name === selectedChannel);
    if (!channel?.subscribed) {
      alert(`You must be subscribed to ${selectedChannel} to send messages. Please subscribe first.`);
      return;
    }

    try {
      const fullMessage = `${username}: ${newMessage}`;
      console.log(`📤 ${username} sending message to ${selectedChannel}: "${newMessage}"`);
      const response = await apiService.publishMessage(selectedChannel, fullMessage);
      if (response.success) {
        setNewMessage('');
        console.log(`✅ Message sent successfully by ${username}`);
      } else {
        console.error(`❌ Failed to send message: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to publish message:', error);
    }
  };

  const filteredMessages = messages.filter(msg => msg.channel === selectedChannel);
  const subscribedCount = channels.filter(c => c.subscribed).length;

  return (
    <div className="h-full flex flex-col">
      {/* Connection Status */}
      <div className={`border-l-4 p-4 mb-4 ${
        connected 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-400' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-400'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {connected ? (
              <>
                <Wifi className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700 dark:text-green-200">
                  <strong>Connected:</strong> Real-time Pub/Sub is active
                </p>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700 dark:text-red-200">
                  <strong>Disconnected:</strong> Attempting to reconnect...
                </p>
              </>
            )}
          </div>
          
          {/* User Identity */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            {isEditingUsername ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleUsernameSave();
                    if (e.key === 'Escape') handleUsernameCancel();
                  }}
                  placeholder="Enter username"
                  className="px-2 py-1 text-xs border border-blue-300 rounded bg-white dark:bg-gray-700"
                  autoFocus
                />
                <button
                  onClick={handleUsernameSave}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded"
                >
                  Save
                </button>
                <button
                  onClick={handleUsernameCancel}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {username || 'Loading...'}
                </span>
                <button
                  onClick={handleUsernameEdit}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                  title="Edit username"
                >
                  <Edit3 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Channels Sidebar */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Radio className={connected ? "text-green-500" : "text-red-500"} size={20} />
                Pub/Sub Viewer
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2 rounded-md transition-colors ${
                    soundEnabled 
                      ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/20' 
                      : 'text-gray-400'
                  }`}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">{connected ? 'Live' : 'Offline'}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {subscribedCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Subscribed</div>
              </div>
            </div>

            {/* User Info Panel */}
            {username && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Logged in as: {username}
                  </span>
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Open multiple browser tabs with different usernames to test multi-user pub/sub
                </div>
              </div>
            )}

            {/* Add Channel */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Channel name..."
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddChannel()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <button
                onClick={handleAddChannel}
                disabled={!newChannelName.trim() || loading}
                className="btn-primary flex items-center gap-1"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* Channels List */}
          <div className="flex-1 overflow-y-auto">
            {channels.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No channels available</p>
                <p className="text-sm">Add a channel to get started</p>
              </div>
            ) : (
              channels.map((channel) => (
                <div
                  key={channel.name}
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selectedChannel === channel.name 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
                      : ''
                  }`}
                  onClick={() => setSelectedChannel(channel.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        channel.subscribed ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {channel.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {channel.subscriberCount} subscribers • {channel.subscribed ? 'Subscribed' : 'Not subscribed'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubscribe(channel.name);
                        }}
                        disabled={loading || !connected}
                        className={`px-3 py-1 text-xs rounded-md ${
                          channel.subscribed
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {channel.subscribed ? 'Subscribed' : 'Subscribe'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveChannel(channel.name);
                        }}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    #{selectedChannel}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Users size={16} />
                      {channels.find(c => c.name === selectedChannel)?.subscriberCount || 0} subscribers
                    </div>
                    
                    {username && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Sending as:</span>
                        <span className="px-2 py-1 text-xs text-white bg-blue-500 rounded">
                          {username}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredMessages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No messages in this channel</p>
                    <p className="text-sm">
                      {channels.find(c => c.name === selectedChannel)?.subscribed 
                        ? 'Listening for new messages...' 
                        : 'Subscribe to receive messages'}
                    </p>
                    <p className="text-sm mt-2 text-blue-600">
                      Open multiple browser tabs with different usernames to test multi-user pub/sub!
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((message) => {
                    // Extract username from message if it follows "username: message" format
                    const messageText = message.message;
                    const colonIndex = messageText.indexOf(':');
                    const hasUsername = colonIndex > 0 && colonIndex < 20; // Reasonable username length
                    const displayName = hasUsername ? messageText.substring(0, colonIndex) : (message.sender || 'Anonymous');
                    const displayMessage = hasUsername ? messageText.substring(colonIndex + 2) : messageText;
                    const isCurrentUser = displayName === username;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          isCurrentUser 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200' 
                            : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full ${
                          isCurrentUser ? 'bg-blue-500' : 'bg-gray-500'
                        } flex items-center justify-center text-white text-sm font-bold`}>
                          {displayName[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {displayName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            {isCurrentUser && (
                              <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-gray-800 dark:text-gray-200">
                            {displayMessage}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {/* Subscription Status */}
                {username && selectedChannel && (
                  <div className="mb-2">
                    {(() => {
                      const channel = channels.find(c => c.name === selectedChannel);
                      const isSubscribed = channel?.subscribed || false;
                      return (
                        <div className={`text-xs px-2 py-1 rounded ${
                          isSubscribed 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                          {isSubscribed 
                            ? `✅ ${username} is subscribed to #${selectedChannel}`
                            : `❌ ${username} is not subscribed to #${selectedChannel} - cannot send messages`
                          }
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Message as ${username}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePublishMessage();
                      }
                    }}
                    disabled={!connected || !username}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                  />
                  <button
                    onClick={handlePublishMessage}
                    disabled={!newMessage.trim() || !connected || !username}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send size={16} />
                    Send as {username}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Select a channel to view messages</p>
                <p className="text-sm">Choose a channel from the sidebar to get started</p>
                <p className="text-sm mt-2 text-blue-600">
                  Open multiple browser tabs with different usernames to test multi-user pub/sub!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PubSubViewer; 