export interface RedisKey {
  key: string;
  value: any;
  type: 'string' | 'list' | 'hash' | 'set' | 'zset';
  ttl?: number;
  size: number;
  lastAccessed?: Date;
  node?: string;
}

export interface RedisNode {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error';
  host: string;
  port: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  connections: number;
  keyCount: number;
  hitRate: number;
  lastSeen: Date;
}

export interface ClusterStats {
  totalKeys: number;
  totalMemory: number;
  totalConnections: number;
  averageHitRate: number;
  nodesHealthy: number;
  nodesTotal: number;
  distribution: Record<string, number>;
}

export interface TTLEntry {
  key: string;
  value: any;
  ttl: number;
  startTime: Date;
  remainingTime: number;
  progress: number;
  node?: string;
}

export interface LRUEntry {
  key: string;
  value: any;
  accessCount: number;
  lastAccessed: Date;
  position: number;
  isEvicted?: boolean;
}

export interface LRUStats {
  maxSize: number;
  currentSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  entries: LRUEntry[];
}

export interface PerformanceMetrics {
  timestamp: Date;
  memory: number;
  cpu: number;
  requests: number;
  latency: number;
  hitRate: number;
  evictions: number;
  connections: number;
}

export interface PubSubChannel {
  name: string;
  subscribers: number;
  messages: PubSubMessage[];
  lastActivity: Date;
}

export interface PubSubMessage {
  id: string;
  channel: string;
  message: string;
  timestamp: Date;
  sender?: string;
}

export interface CommandHistory {
  id: string;
  command: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  result?: any;
  error?: string;
}

export interface Settings {
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  maxHistorySize: number;
  notifications: boolean;
  soundEffects: boolean;
  compactMode: boolean;
  server: {
    host: string;
    port: number;
    timeout: number;
  };
}

export interface ContextMenuAction {
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface KeyFilter {
  search: string;
  type?: string;
  node?: string;
  hasttl?: boolean;
  pattern?: string;
}

export interface SortConfig {
  key: keyof RedisKey;
  direction: 'asc' | 'desc';
}

export interface WebSocketMessage {
  type: 'keyUpdate' | 'ttlUpdate' | 'lruUpdate' | 'nodeUpdate' | 'metrics';
  data: any;
  timestamp: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: Date;
  error?: string;
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    border: string;
  };
}

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  global?: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'redis';
  includeValues: boolean;
  includeTTL: boolean;
  filterByNode?: string;
  filterByType?: string;
}

export interface ApiTTLKey {
  key: string;
  value: string;
  ttl: number;
  node: string;
  expires: string;
}

// Master-Slave Replication Types
export interface ReplicationEvent {
  id: string | number;
  timestamp: Date;
  command: string;
  args: any[];
  status: 'success' | 'replicating' | 'warning' | 'error';
  affectedSlaves: number;
}

export interface SlaveNode {
  id: string;
  status: 'connected' | 'disconnected' | 'failed';
  keys: Record<string, any>;
  lastSync: Date;
  connectedAt: Date | null;
  role: 'slave';
}

export interface MasterNode {
  id: string;
  status: 'connected';
  role: 'master';
  connectedSlaves: number;
  keys: Record<string, {
    value: any;
    ttl: number;
    type: string;
  }>;
}

export interface ReplicationStatus {
  masterRunning: boolean;
  connectedSlaves: number;
  totalReplicationEvents: number;
  masterPort: number;
  slavePort: number;
  slaves: Array<{
    id: string;
    status: string;
    lastSync: Date;
  }>;
}

export interface ReplicationKeyComparison {
  key: string;
  master: {
    exists: boolean;
    value?: any;
    ttl?: number;
  };
  slaves: Record<string, {
    exists: boolean;
    value?: any;
    synced: boolean;
  }>;
  status: 'synced' | 'partial' | 'out_of_sync';
} 