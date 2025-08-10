import axios from 'axios';
import { RedisNode, ClusterStats, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiService {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Helper function to extract error message from HTTP error response
  private extractErrorMessage(error: any, fallbackMessage: string): string {
    if (error?.response?.data?.error) {
      return error.response.data.error;
    }
    if (error?.response?.data?.message) {
      return error.response.data.message;
    }
    if (error?.response?.data && typeof error.response.data === 'string') {
      return error.response.data;
    }
    if (error?.message) {
      return error.message;
    }
    return fallbackMessage;
  }

  // =========================
  // Basic Key Operations
  // =========================

  async getKeys(): Promise<ApiResponse<string[]>> {
    try {
      const response = await this.client.get('/api/keys');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.get('/keys');
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data.keys || fallbackResponse.data,
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to fetch keys'),
          timestamp: new Date(),
        };
      }
    }
  }

  async getKey(key: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get(`/api/keys/${encodeURIComponent(key)}`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.get(`/get?key=${encodeURIComponent(key)}`);
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data,
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to fetch key'),
          timestamp: new Date(),
        };
      }
    }
  }

  async setKey(key: string, value: any, ttl?: number): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.post('/api/keys', { key, value, ttl });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.message || 'OK',
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.post('/set', { key, value, ttl });
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data.message || 'OK',
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to set key'),
          timestamp: new Date(),
        };
      }
    }
  }

  async deleteKey(key: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.client.delete(`/api/keys/${encodeURIComponent(key)}`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.result,
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.delete(`/delete?key=${encodeURIComponent(key)}`);
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data.result,
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to delete key'),
          timestamp: new Date(),
        };
      }
    }
  }

  // =========================
  // TTL Operations
  // =========================

  async getTTL(key: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.get(`/api/keys/${encodeURIComponent(key)}/ttl`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.ttl,
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.get(`/ttl?key=${encodeURIComponent(key)}`);
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data.ttl,
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to get TTL'),
          timestamp: new Date(),
        };
      }
    }
  }

  async setExpire(key: string, ttl: number): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/expire`, { ttl });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to set expiration'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // Increment/Decrement Operations
  // =========================

  async increment(key: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/incr`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.post('/incr', { key });
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data,
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to increment'),
          timestamp: new Date(),
        };
      }
    }
  }

  async decrement(key: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/decr`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.post('/decr', { key });
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data,
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to decrement'),
          timestamp: new Date(),
        };
      }
    }
  }

  // =========================
  // Rename Operations
  // =========================

  async renameKey(key: string, newKey: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/rename`, { newKey });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.message || 'OK',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to rename key'),
        timestamp: new Date(),
      };
    }
  }

  async existsKey(key: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.client.get(`/api/keys/${encodeURIComponent(key)}/exists`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.exists,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to check key existence'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // List Operations
  // =========================

  async lpush(key: string, value: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/lpush`, { value });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to lpush'),
        timestamp: new Date(),
      };
    }
  }

  async rpush(key: string, value: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/rpush`, { value });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to rpush'),
        timestamp: new Date(),
      };
    }
  }

  async lpop(key: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/lpop`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to lpop'),
        timestamp: new Date(),
      };
    }
  }

  async rpop(key: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/rpop`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to rpop'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // Hash Operations
  // =========================

  async hset(key: string, field: string, value: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/hset`, { field, value });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to hset'),
        timestamp: new Date(),
      };
    }
  }

  async hget(key: string, field: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.get(`/api/keys/${encodeURIComponent(key)}/hget/${encodeURIComponent(field)}`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to hget'),
        timestamp: new Date(),
      };
    }
  }

  async hdel(key: string, field: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.delete(`/api/keys/${encodeURIComponent(key)}/hget/${encodeURIComponent(field)}`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to hdel'),
        timestamp: new Date(),
      };
    }
  }

  async hgetall(key: string): Promise<ApiResponse<object>> {
    try {
      const response = await this.client.get(`/api/keys/${encodeURIComponent(key)}/hgetall`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to hgetall'),
        timestamp: new Date(),
      };
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post(`/api/keys/${encodeURIComponent(key)}/hincrby`, { field, increment });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to hincrby'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // Pub/Sub Operations
  // =========================

  async getChannels(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get('/api/pubsub/channels');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get channels'),
        timestamp: new Date(),
      };
    }
  }

  async publishMessage(channel: string, message: string): Promise<ApiResponse<number>> {
    try {
      const response = await this.client.post('/api/pubsub/publish', { channel, message });
      return {
        success: true,
        data: response.data.success ? response.data.data.subscribers : response.data.subscribers,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to publish message'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // Server Information
  // =========================

  // Server statistics
  async getServerStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/server-stats');
      return { 
        success: true, 
        data: response.data.data,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error fetching server stats:', error);
      return { 
        success: false, 
        error: this.extractErrorMessage(error, 'Failed to get server stats'),
        timestamp: new Date()
      };
    }
  }

  // Get server info
  async getInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/info');
      return { 
        success: true, 
        data: response.data.data,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error fetching server info:', error);
      return { 
        success: false, 
        error: this.extractErrorMessage(error, 'Failed to get server info'),
        timestamp: new Date()
      };
    }
  }

  async getStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/stats');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.get('/stats');
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data,
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to get stats'),
          timestamp: new Date(),
        };
      }
    }
  }

  async flushAll(): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.post('/api/flushall');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.message || 'OK',
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback to legacy endpoint
      try {
        const fallbackResponse = await this.client.post('/flushall');
        return {
          success: true,
          data: fallbackResponse.data.success ? fallbackResponse.data.data : fallbackResponse.data.message || 'OK',
          timestamp: new Date(),
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: this.extractErrorMessage(fallbackError, 'Failed to flush all'),
          timestamp: new Date(),
        };
      }
    }
  }

  async getClusterStats(): Promise<ApiResponse<ClusterStats>> {
    try {
      const response = await this.client.get('/api/cluster/stats');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get cluster stats'),
        timestamp: new Date(),
      };
    }
  }

  async getNodes(): Promise<ApiResponse<RedisNode[]>> {
    try {
      const response = await this.client.get('/api/cluster/nodes');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get nodes'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // Monitoring Operations
  // =========================

  async getPerformanceMetrics(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/metrics/performance');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get performance metrics'),
        timestamp: new Date(),
      };
    }
  }

  async getMonitoringStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/monitoring/stats');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get monitoring stats'),
        timestamp: new Date(),
      };
    }
  }

  async getCommandStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/monitoring/commands');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get command stats'),
        timestamp: new Date(),
      };
    }
  }

  async getClusterMonitoring(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/monitoring/cluster');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get cluster monitoring'),
        timestamp: new Date(),
      };
    }
  }

  async getTTLDistribution(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/monitoring/ttl');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get TTL distribution'),
        timestamp: new Date(),
      };
    }
  }

  async getTTLKeys(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/monitoring/ttl-keys');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get TTL keys'),
        timestamp: new Date(),
      };
    }
  }

  async getConfig(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/config');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get config'),
        timestamp: new Date(),
      };
    }
  }

  async setConfig(config: any): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.post('/api/config', config);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.message || 'OK',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to set config'),
        timestamp: new Date(),
      };
    }
  }

  async ping(): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.get('/api/ping');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.message || 'PONG',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to ping'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // WebSocket Operations
  // =========================

  async subscribeToChannel(channel: string): Promise<ApiResponse<string>> {
    try {
      const response = await this.client.post('/api/pubsub/subscribe', { channel });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data.message || 'OK',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to subscribe to channel'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // RDB Persistence Operations
  // =========================

  async getPersistenceStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/persistence/status');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get persistence status'),
        timestamp: new Date(),
      };
    }
  }

  async saveToDisk(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/persistence/save');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to save to disk'),
        timestamp: new Date(),
      };
    }
  }

  async loadFromDisk(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/persistence/load');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to load from disk'),
        timestamp: new Date(),
      };
    }
  }

  async getRDBInfo(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/persistence/info');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get RDB info'),
        timestamp: new Date(),
      };
    }
  }

  // =========================
  // Process Monitoring Operations
  // =========================

  async getProcessStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/processes/status');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get process status'),
        timestamp: new Date(),
      };
    }
  }

  async getProcessMetrics(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/processes/metrics');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get process metrics'),
        timestamp: new Date(),
      };
    }
  }

  // Master-Slave Replication APIs
  async startMaster(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/replication/start-master');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to start master server'),
        timestamp: new Date(),
      };
    }
  }

  async stopMaster(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/replication/stop-master');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to stop master server'),
        timestamp: new Date(),
      };
    }
  }

  async getMasterKeys(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/replication/master/keys');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get master keys'),
        timestamp: new Date(),
      };
    }
  }

  async getSlaves(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/replication/slaves');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get slave states'),
        timestamp: new Date(),
      };
    }
  }

  async executeReplicationCommand(command: string, args: string[]): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/replication/master/execute', { command, args });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to execute command'),
        timestamp: new Date(),
      };
    }
  }

  async getReplicationLog(limit?: number): Promise<ApiResponse<any>> {
    try {
      const url = limit ? `/api/replication/log?limit=${limit}` : '/api/replication/log';
      const response = await this.client.get(url);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get replication log'),
        timestamp: new Date(),
      };
    }
  }

  async getReplicationStatus(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/replication/status');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get replication status'),
        timestamp: new Date(),
      };
    }
  }

  async simulateSlaveFailure(slaveId: string, killProcess: boolean = false): Promise<ApiResponse<any>> {
    try {
      const url = `/api/replication/simulate-failure/${slaveId}${killProcess ? '?killProcess=true' : ''}`;
      const response = await this.client.post(url);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to simulate slave failure'),
        timestamp: new Date(),
      };
    }
  }

  // =====================
  // Slave Management APIs
  // =====================

  async addSlaves(count: number = 1): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/replication/slaves/add', { count });
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to add slaves'),
        timestamp: new Date(),
      };
    }
  }

  async stopSlave(slaveId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post(`/api/replication/slaves/stop/${slaveId}`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to stop slave'),
        timestamp: new Date(),
      };
    }
  }

  async removeSlave(slaveId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.delete(`/api/replication/slaves/${slaveId}`);
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to remove slave'),
        timestamp: new Date(),
      };
    }
  }

  async getSlaveProcesses(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/api/replication/slaves/processes');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to get slave processes'),
        timestamp: new Date(),
      };
    }
  }

  async stopAllSlaves(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/replication/slaves/stop-all');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to stop all slaves'),
        timestamp: new Date(),
      };
    }
  }

  async cleanupZombieSlaves(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post('/api/replication/cleanup-zombie-slaves');
      return {
        success: true,
        data: response.data.success ? response.data.data : response.data,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: this.extractErrorMessage(error, 'Failed to cleanup zombie slaves'),
        timestamp: new Date(),
      };
    }
  }
}

export const apiService = new ApiService();
export default apiService; 