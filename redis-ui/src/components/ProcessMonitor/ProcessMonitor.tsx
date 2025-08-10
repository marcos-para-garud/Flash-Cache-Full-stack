import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  HardDrive, 
  Clock, 
  Activity, 
  Server, 
  Zap, 
  Database, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Layers,
  BarChart3,
  Monitor,
  Settings
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../../services/api';

interface ProcessInfo {
  mainProcess: {
    pid: number;
    uptime: number;
    memoryUsage: any;
    cpuUsage: any;
    version: string;
    platform: string;
    arch: string;
  };
  workers: {
    ttlWorkers: any[];
    rdbWorkers: any[];
  };
  clustering: {
    totalNodes: number;
    activeNodes: number;
    nodeStatus: any;
  };
}

interface ProcessMetrics {
  timestamp: Date;
  mainProcess: {
    cpuUsage: number;
    memoryUsage: any;
    uptime: number;
    activeHandles: number;
    activeRequests: number;
  };
  workerStats: {
    ttlWorkers: {
      totalActive: number;
      averageTaskLoad: number;
      totalProcessedTasks: number;
    };
    rdbWorkers: {
      totalActive: number;
      recentSaves: number;
      averageSaveTime: number;
    };
  };
  systemMetrics: {
    totalKeys: number;
    totalMemoryUsed: number;
    operationsPerSecond: number;
  };
}

const ProcessMonitor: React.FC = () => {
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [processMetrics, setProcessMetrics] = useState<ProcessMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workers' | 'performance' | 'architecture'>('overview');


  const fetchProcessData = async () => {
    try {
      setError(null);
      
      const [statusResponse, metricsResponse] = await Promise.all([
        apiService.getProcessStatus(),
        apiService.getProcessMetrics()
      ]);

      if (statusResponse.success && statusResponse.data) {
        setProcessInfo(statusResponse.data);
      }

      if (metricsResponse.success && metricsResponse.data) {
        setProcessMetrics(metricsResponse.data);
        
        // Add to history for charts (keep last 20 data points)
        setMetricsHistory(prev => {
          const newHistory = [...prev, {
            time: new Date().toLocaleTimeString(),
            cpuUsage: metricsResponse.data.mainProcess.cpuUsage,
            memoryUsage: Math.round(metricsResponse.data.mainProcess.memoryUsage.rss / 1024 / 1024),
            operationsPerSecond: metricsResponse.data.systemMetrics.operationsPerSecond,
            totalKeys: metricsResponse.data.systemMetrics.totalKeys
          }];
          return newHistory.slice(-20); // Keep last 20 points
        });
      }

      if (!statusResponse.success || !metricsResponse.success) {
        setError(statusResponse.error || metricsResponse.error || 'Failed to fetch process data');
      }
    } catch (error) {
      console.error('Error fetching process data:', error);
      setError('Failed to fetch process data');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptimeSeconds: number): string => {
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const formatMemory = (bytes: number): string => {
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  const getWorkerStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getWorkerStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'idle': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Monitor className="w-4 h-4 text-gray-500" />;
    }
  };



  useEffect(() => {
    fetchProcessData();
    
    // Set up auto-refresh every 5 seconds
    const interval = setInterval(fetchProcessData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchProcessData}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Main Process Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Main Process</p>
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                PID: {processInfo?.mainProcess.pid}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Uptime: {processInfo ? formatUptime(processInfo.mainProcess.uptime) : 'N/A'}
              </p>
            </div>
            <Server className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">CPU Usage</p>
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                {processMetrics?.mainProcess.cpuUsage || 0}%
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Current load
              </p>
            </div>
            <Cpu className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Memory Usage</p>
              <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {processMetrics ? formatMemory(processMetrics.mainProcess.memoryUsage.rss) : 'N/A'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                RSS Memory
              </p>
            </div>
            <HardDrive className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Operations/sec</p>
              <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {processMetrics?.systemMetrics.operationsPerSecond || 0}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Current throughput
              </p>
            </div>
            <Activity className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      {metricsHistory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              CPU & Memory Usage
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cpuUsage" stroke="#10b981" name="CPU %" />
                <Line type="monotone" dataKey="memoryUsage" stroke="#3b82f6" name="Memory (MB)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Operations & Keys
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metricsHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="operationsPerSecond" stroke="#f59e0b" name="Ops/sec" />
                <Line type="monotone" dataKey="totalKeys" stroke="#8b5cf6" name="Total Keys" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );

  const renderWorkers = () => (
    <div className="space-y-6">
      {/* TTL Workers */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          TTL Worker Threads
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            (Worker Thread Implementation)
          </span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processInfo?.workers.ttlWorkers.map((worker, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getWorkerStatusColor(worker.status)}`}></div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {worker.nodeId} TTL Worker
                  </h3>
                </div>
                {getWorkerStatusIcon(worker.status)}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="capitalize font-medium">{worker.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Active Tasks:</span>
                  <span className="font-medium">{worker.activeTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Processed:</span>
                  <span className="font-medium">{worker.processedTasks.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Memory:</span>
                  <span className="font-medium">{worker.memoryUsage} MB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>TTL Workers:</strong> These worker threads handle automatic key expiration using Node.js Worker Threads API. 
            Each node has its own dedicated worker thread for processing TTL operations without blocking the main event loop.
          </p>
        </div>
      </div>

      {/* RDB Workers */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          RDB Child Processes
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            (Child Process Implementation)
          </span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processInfo?.workers.rdbWorkers.map((worker, index) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getWorkerStatusColor(worker.status)}`}></div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {worker.nodeId} RDB Process
                  </h3>
                </div>
                {getWorkerStatusIcon(worker.status)}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="capitalize font-medium">{worker.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Last Save:</span>
                  <span className="font-medium">{new Date(worker.lastSave).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Saves Count:</span>
                  <span className="font-medium">{worker.processedSaves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Avg Save Time:</span>
                  <span className="font-medium">{worker.avgSaveTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Memory:</span>
                  <span className="font-medium">{worker.memoryUsage} MB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>RDB Workers:</strong> These child processes handle data persistence using Node.js Child Process API. 
            Each node spawns a separate process for RDB operations, ensuring that heavy I/O operations don't block the main Redis server.
          </p>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Handles</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {processMetrics?.mainProcess.activeHandles || 0}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Event loop handles</p>
            </div>
            <Zap className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Requests</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                {processMetrics?.mainProcess.activeRequests || 0}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending requests</p>
            </div>
            <Activity className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">TTL Tasks</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {processMetrics?.workerStats.ttlWorkers.totalProcessedTasks.toLocaleString() || 0}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total processed</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Runtime Environment</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Node.js Version:</span>
                <span className="font-medium">{processInfo?.mainProcess.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Platform:</span>
                <span className="font-medium capitalize">{processInfo?.mainProcess.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Architecture:</span>
                <span className="font-medium">{processInfo?.mainProcess.arch}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Memory Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">RSS (Resident Set):</span>
                <span className="font-medium">{processMetrics ? formatMemory(processMetrics.mainProcess.memoryUsage.rss) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Heap Total:</span>
                <span className="font-medium">{processMetrics ? formatMemory(processMetrics.mainProcess.memoryUsage.heapTotal) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Heap Used:</span>
                <span className="font-medium">{processMetrics ? formatMemory(processMetrics.mainProcess.memoryUsage.heapUsed) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">External:</span>
                <span className="font-medium">{processMetrics ? formatMemory(processMetrics.mainProcess.memoryUsage.external) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderArchitecture = () => (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Multi-Processing Architecture
        </h2>
        
        {/* Architecture Diagram */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
          <div className="text-center space-y-8">
            {/* Main Process */}
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Server className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Main Process (PID: {processInfo?.mainProcess.pid})</h3>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Node.js Event Loop & API Server</p>
            </div>

            {/* Arrows */}
            <div className="flex justify-center space-x-16">
              <div className="text-gray-400">↓</div>
              <div className="text-gray-400">↓</div>
            </div>

            {/* Worker Processes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* TTL Workers */}
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="w-6 h-6 text-green-600" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">TTL Worker Threads</h3>
                </div>
                <div className="space-y-2">
                  {processInfo?.workers.ttlWorkers.map((worker, index) => (
                    <div key={index} className="bg-white dark:bg-gray-700 rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getWorkerStatusColor(worker.status)}`}></div>
                        <span className="font-medium">{worker.nodeId}</span>
                        <span className="text-gray-500">({worker.activeTasks} tasks)</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                  Worker Threads for TTL processing
                </p>
              </div>

              {/* RDB Workers */}
              <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Database className="w-6 h-6 text-orange-600" />
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">RDB Child Processes</h3>
                </div>
                <div className="space-y-2">
                  {processInfo?.workers.rdbWorkers.map((worker, index) => (
                    <div key={index} className="bg-white dark:bg-gray-700 rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getWorkerStatusColor(worker.status)}`}></div>
                        <span className="font-medium">{worker.nodeId}</span>
                        <span className="text-gray-500">({worker.status})</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                  Child Processes for RDB persistence
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Process Types Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Worker Threads (TTL)
            </h4>
            <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
              <li>• Share memory with main process</li>
              <li>• Handle TTL expiration tasks</li>
              <li>• Lightweight and fast communication</li>
              <li>• Non-blocking TTL operations</li>
              <li>• Real-time key expiration</li>
            </ul>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Child Processes (RDB)
            </h4>
            <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
              <li>• Isolated memory space</li>
              <li>• Handle disk I/O operations</li>
              <li>• Prevent blocking main thread</li>
              <li>• Robust error isolation</li>
              <li>• Background data persistence</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Monitor },
    { id: 'workers', label: 'Workers & Processes', icon: Layers },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'architecture', label: 'Architecture', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Process Monitor</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Multi-processing architecture monitoring - Worker Threads & Child Processes
          </p>
        </div>
        <button
          onClick={fetchProcessData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'workers' && renderWorkers()}
        {activeTab === 'performance' && renderPerformance()}
        {activeTab === 'architecture' && renderArchitecture()}
      </div>
    </div>
  );
};

export default ProcessMonitor; 