import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Database, Activity, Clock, Network, CheckCircle, AlertTriangle, Users, Server, HardDrive, Cpu, Monitor } from 'lucide-react';
import { apiService } from '../../services/api';

interface MonitoringStats {
  totalKeys: number;
  ttlKeys: number;
  connectedClients: number;
  commandsExecuted: number;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: number;
  nodeDistribution: Record<string, {
    keyCount: number;
    ttlKeys: number;
    status: string;
  }>;
  totalNodes: number;
  activeNodes: number;
  serverInfo: {
    version: string;
    mode: string;
    port: number;
    apiPort: number;
    startTime: number;
  };
}

interface TTLDistribution {
  noTtl: number;
  shortTerm: number;
  mediumTerm: number;
  longTerm: number;
}

const Monitoring: React.FC = () => {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [ttlDistribution, setTTLDistribution] = useState<TTLDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Fetch monitoring data from API
  const fetchMonitoringData = async () => {
    try {
      console.log('Fetching monitoring data...');
      setDebugInfo('Fetching monitoring data...');
      
      const [statsResponse, ttlResponse] = await Promise.all([
        apiService.getMonitoringStats(),
        apiService.getTTLDistribution()
      ]);

      console.log('Stats Response:', statsResponse);
      console.log('TTL Response:', ttlResponse);
      setDebugInfo(`Stats: ${JSON.stringify(statsResponse.success)}, TTL: ${JSON.stringify(ttlResponse.success)}`);

      if (statsResponse.success && statsResponse.data) {
        console.log('Setting stats data:', statsResponse.data);
        setStats(statsResponse.data);
        setDebugInfo(`Stats set successfully. Keys: ${statsResponse.data.totalKeys}`);
      } else {
        console.error('Stats response failed:', statsResponse);
        setDebugInfo(`Stats failed: ${statsResponse.error || 'Unknown error'}`);
      }

      if (ttlResponse.success && ttlResponse.data) {
        console.log('Setting TTL data:', ttlResponse.data);
        setTTLDistribution(ttlResponse.data);
      } else {
        console.error('TTL response failed:', ttlResponse);
        setDebugInfo(prevDebug => `${prevDebug} | TTL failed: ${ttlResponse.error || 'Unknown error'}`);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch monitoring data: ${errorMessage}`);
      setDebugInfo(`Exception: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchMonitoringData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Helper functions
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatCommandsPerSecond = (totalCommands: number, uptime: number): string => {
    if (uptime === 0) return '0';
    const rate = totalCommands / uptime;
    return rate.toFixed(1);
  };

  // Prepare chart data
  const nodeChartData = stats ? Object.entries(stats.nodeDistribution).map(([nodeName, data]) => ({
    name: nodeName,
    keys: data.keyCount,
    ttlKeys: data.ttlKeys
  })) : [];

  const ttlChartData = ttlDistribution ? [
    { name: 'No TTL', value: ttlDistribution.noTtl, color: '#6b7280' },
    { name: '< 1 min', value: ttlDistribution.shortTerm, color: '#ef4444' },
    { name: '1-60 min', value: ttlDistribution.mediumTerm, color: '#f59e0b' },
    { name: '> 60 min', value: ttlDistribution.longTerm, color: '#10b981' }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">No monitoring data available</p>
          {debugInfo && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              <p className="font-mono text-xs">{debugInfo}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Keys</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalKeys.toLocaleString()}
              </h3>
            </div>
            <Database className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Commands/sec</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCommandsPerSecond(stats.commandsExecuted, stats.uptime)}
              </h3>
            </div>
            <Activity className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Connected Clients</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.connectedClients}
              </h3>
            </div>
            <Users className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">TTL Keys</p>
              <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.ttlKeys.toLocaleString()}
              </h3>
            </div>
            <Clock className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Node Distribution */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Network className="w-5 h-5" />
            Key Distribution by Node
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={nodeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="keys" fill="#3b82f6" name="Total Keys" />
              <Bar dataKey="ttlKeys" fill="#10b981" name="TTL Keys" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TTL Distribution */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            TTL Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ttlChartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {ttlChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" />
            Server Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Version:</span>
              <span className="text-gray-900 dark:text-white">{stats.serverInfo.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Mode:</span>
              <span className="text-gray-900 dark:text-white">{stats.serverInfo.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Uptime:</span>
              <span className="text-gray-900 dark:text-white">{formatUptime(stats.uptime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Port:</span>
              <span className="text-gray-900 dark:text-white">{stats.serverInfo.port}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">API Port:</span>
              <span className="text-gray-900 dark:text-white">{stats.serverInfo.apiPort}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Memory Usage
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">RSS:</span>
              <span className="text-gray-900 dark:text-white">{formatBytes(stats.memoryUsage.rss)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Heap Total:</span>
              <span className="text-gray-900 dark:text-white">{formatBytes(stats.memoryUsage.heapTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Heap Used:</span>
              <span className="text-gray-900 dark:text-white">{formatBytes(stats.memoryUsage.heapUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">External:</span>
              <span className="text-gray-900 dark:text-white">{formatBytes(stats.memoryUsage.external)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Performance
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">CPU Usage:</span>
              <span className="text-gray-900 dark:text-white">{stats.cpuUsage}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Commands Executed:</span>
              <span className="text-gray-900 dark:text-white">{stats.commandsExecuted.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Total Nodes:</span>
              <span className="text-gray-900 dark:text-white">{stats.totalNodes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Active Nodes:</span>
              <span className="text-gray-900 dark:text-white">{stats.activeNodes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            System Status
          </h2>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">
              All systems operational
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.nodeDistribution).map(([nodeName, nodeData]) => (
            <div key={nodeName} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{nodeName}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {nodeData.keyCount} keys
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {nodeData.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Monitoring; 