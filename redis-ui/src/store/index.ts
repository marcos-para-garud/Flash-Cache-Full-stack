import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  RedisKey, 
  RedisNode, 
  ClusterStats, 
  TTLEntry, 
  LRUEntry, 
  LRUStats, 
  PerformanceMetrics, 
  PubSubChannel, 
  CommandHistory, 
  Settings, 
  NotificationItem,
  KeyFilter,
  SortConfig,
  ConnectionStatus
} from '../types';

// Map to store notification timers for auto-closing
const notificationTimers = new Map<string, NodeJS.Timeout>();

interface AppState {
  // Theme and UI
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  currentView: string;
  settings: Settings;
  
  // Connection
  connectionStatus: ConnectionStatus;
  
  // Redis Data
  keys: RedisKey[];
  nodes: RedisNode[];
  clusterStats: ClusterStats;
  
  // TTL Management
  ttlEntries: TTLEntry[];
  
  // LRU Cache
  lruStats: LRUStats;
  
  // Performance
  performanceMetrics: PerformanceMetrics[];
  
  // Pub/Sub
  channels: PubSubChannel[];
  
  // History
  commandHistory: CommandHistory[];
  
  // Notifications
  notifications: NotificationItem[];
  
  // UI State
  selectedKeys: Set<string>;
  keyFilter: KeyFilter;
  sortConfig: SortConfig;
  
  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setCurrentView: (view: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  
  // Connection Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  // Redis Actions
  setKeys: (keys: RedisKey[]) => void;
  addKey: (key: RedisKey) => void;
  updateKey: (key: RedisKey) => void;
  deleteKey: (keyName: string) => void;
  
  // Node Actions
  setNodes: (nodes: RedisNode[]) => void;
  updateNode: (node: RedisNode) => void;
  
  // Cluster Actions
  setClusterStats: (stats: ClusterStats) => void;
  
  // TTL Actions
  setTTLEntries: (entries: TTLEntry[]) => void;
  updateTTLEntry: (entry: TTLEntry) => void;
  removeTTLEntry: (key: string) => void;
  
  // LRU Actions
  setLRUStats: (stats: LRUStats) => void;
  updateLRUEntry: (entry: LRUEntry) => void;
  
  // Performance Actions
  addPerformanceMetric: (metric: PerformanceMetrics) => void;
  clearPerformanceMetrics: () => void;
  
  // Pub/Sub Actions
  setChannels: (channels: PubSubChannel[]) => void;
  addMessage: (channelName: string, message: any) => void;
  
  // History Actions
  addCommandToHistory: (command: CommandHistory) => void;
  clearCommandHistory: () => void;
  
  // Notification Actions
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Selection Actions
  selectKey: (key: string) => void;
  deselectKey: (key: string) => void;
  clearSelection: () => void;
  
  // Filter Actions
  setKeyFilter: (filter: KeyFilter) => void;
  setSortConfig: (config: SortConfig) => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    theme: 'dark',
    sidebarOpen: true,
    currentView: 'keys',
    settings: {
      theme: 'dark',
      autoRefresh: true,
      refreshInterval: 5000,
      maxHistorySize: 1000,
      notifications: true,
      soundEffects: false,
      compactMode: false,
      server: {
        host: 'localhost',
        port: 3001,
        timeout: 5000,
      },
    },
    
    connectionStatus: {
      connected: false,
      reconnecting: false,
    },
    
    keys: [],
    nodes: [],
    clusterStats: {
      totalKeys: 0,
      totalMemory: 0,
      totalConnections: 0,
      averageHitRate: 0,
      nodesHealthy: 0,
      nodesTotal: 0,
      distribution: {},
    },
    
    ttlEntries: [],
    lruStats: {
      maxSize: 100,
      currentSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
      entries: [],
    },
    
    performanceMetrics: [],
    channels: [],
    commandHistory: [],
    notifications: [],
    
    selectedKeys: new Set(),
    keyFilter: {
      search: '',
    },
    sortConfig: {
      key: 'key',
      direction: 'asc',
    },
    
    // Actions
    setTheme: (theme) => set({ theme }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setCurrentView: (view) => set({ currentView: view }),
    updateSettings: (settings) => set((state) => ({ 
      settings: { ...state.settings, ...settings } 
    })),
    
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    
    setKeys: (keys) => set({ keys }),
    addKey: (key) => set((state) => ({ keys: [...state.keys, key] })),
    updateKey: (key) => set((state) => ({
      keys: state.keys.map(k => k.key === key.key ? key : k)
    })),
    deleteKey: (keyName) => set((state) => ({
      keys: state.keys.filter(k => k.key !== keyName)
    })),
    
    setNodes: (nodes) => set({ nodes }),
    updateNode: (node) => set((state) => ({
      nodes: state.nodes.map(n => n.id === node.id ? node : n)
    })),
    
    setClusterStats: (stats) => set({ clusterStats: stats }),
    
    setTTLEntries: (entries) => set({ ttlEntries: entries }),
    updateTTLEntry: (entry) => set((state) => ({
      ttlEntries: state.ttlEntries.map(e => e.key === entry.key ? entry : e)
    })),
    removeTTLEntry: (key) => set((state) => ({
      ttlEntries: state.ttlEntries.filter(e => e.key !== key)
    })),
    
    setLRUStats: (stats) => set({ lruStats: stats }),
    updateLRUEntry: (entry) => set((state) => ({
      lruStats: {
        ...state.lruStats,
        entries: state.lruStats.entries.map(e => e.key === entry.key ? entry : e)
      }
    })),
    
    addPerformanceMetric: (metric) => set((state) => ({
      performanceMetrics: [...state.performanceMetrics.slice(-99), metric]
    })),
    clearPerformanceMetrics: () => set({ performanceMetrics: [] }),
    
    setChannels: (channels) => set({ channels }),
    addMessage: (channelName, message) => set((state) => ({
      channels: state.channels.map(c => 
        c.name === channelName 
          ? { ...c, messages: [...c.messages, message] }
          : c
      )
    })),
    
    addCommandToHistory: (command) => set((state) => ({
      commandHistory: [command, ...state.commandHistory.slice(0, state.settings.maxHistorySize - 1)]
    })),
    clearCommandHistory: () => set({ commandHistory: [] }),
    
    addNotification: (notification) => {
      const id = Date.now().toString();
      const newNotification = {
        ...notification,
        id,
        timestamp: new Date(),
        read: false,
      };
      
      set((state) => ({
        notifications: [newNotification, ...state.notifications]
      }));
      
      // Set up auto-close timer (2 seconds)
      const timer = setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
        notificationTimers.delete(id);
      }, 2000);
      
      notificationTimers.set(id, timer);
    },
    
    markNotificationAsRead: (id) => {
      // Clear the auto-close timer if it exists
      const timer = notificationTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        notificationTimers.delete(id);
      }
      
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    },
    
    clearNotifications: () => {
      // Clear all auto-close timers
      notificationTimers.forEach((timer) => clearTimeout(timer));
      notificationTimers.clear();
      
      set({ notifications: [] });
    },
    
    selectKey: (key) => set((state) => ({
      selectedKeys: new Set([...state.selectedKeys, key])
    })),
    deselectKey: (key) => set((state) => {
      const newSet = new Set(state.selectedKeys);
      newSet.delete(key);
      return { selectedKeys: newSet };
    }),
    clearSelection: () => set({ selectedKeys: new Set() }),
    
    setKeyFilter: (filter) => set({ keyFilter: filter }),
    setSortConfig: (config) => set({ sortConfig: config }),
  }))
);

// Helper hooks
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useConnectionStatus = () => useAppStore((state) => state.connectionStatus);
export const useSelectedKeys = () => useAppStore((state) => state.selectedKeys);
export const useKeyFilter = () => useAppStore((state) => state.keyFilter);
export const useSortConfig = () => useAppStore((state) => state.sortConfig);

// Helper function to get current view
export const getCurrentView = () => {
  const store = useAppStore.getState();
  return store.currentView || 'keys';
}; 