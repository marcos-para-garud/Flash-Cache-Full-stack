import React, { useState, useEffect, useRef } from 'react';
import { Activity, Database, FileText, Cpu, HardDrive, Filter, Download, Trash2, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'debug';
  category: 'persistence' | 'memory' | 'cpu' | 'operation' | 'system';
  message: string;
  metadata?: Record<string, any>;
}

interface SystemMetric {
  timestamp: Date;
  cpu: number;
  memory: number;
  operations: number;
}

const LogsMonitor: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Generate demo system logs
  useEffect(() => {
    const generateLog = () => {
      const categories: LogEntry['category'][] = ['persistence', 'memory', 'cpu', 'operation', 'system'];
      const levels: LogEntry['level'][] = ['info', 'warning', 'error', 'debug'];
      
      const sampleMessages = {
        persistence: [
          'RDB snapshot saved successfully',
          'AOF file rewritten',
          'Background save started',
          'Persistence checkpoint completed',
          'RDB file loaded from disk',
          'AOF file corrupted, attempting repair'
        ],
        memory: [
          'Memory usage: 45.2MB',
          'LRU eviction triggered: 12 keys removed',
          'Memory fragmentation ratio: 1.23',
          'Low memory warning: 85% used',
          'Memory usage optimized',
          'Cache limit reached, evicting oldest keys'
        ],
        cpu: [
          'CPU usage spike detected: 89%',
          'Background operations consuming CPU',
          'CPU usage normalized: 12%',
          'High CPU usage warning',
          'CPU throttling enabled',
          'Performance optimization completed'
        ],
        operation: [
          'GET operation: key "user:1001"',
          'SET operation: key "session:abc123"',
          'DELETE operation: key "cache:expired"',
          'KEYS scan completed: 1,247 keys found',
          'Bulk operation completed: 50 keys processed',
          'Command pipeline executed: 25 operations'
        ],
        system: [
          'Redis server started on port 6379',
          'Client connection established',
          'Client disconnected: timeout',
          'Cluster node joined',
          'Replication sync completed',
          'Health check passed'
        ]
      };

      const category = categories[Math.floor(Math.random() * categories.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const messages = sampleMessages[category];
      const message = messages[Math.floor(Math.random() * messages.length)];

      const newLog: LogEntry = {
        id: Date.now().toString() + Math.random(),
        timestamp: new Date(),
        level,
        category,
        message,
        metadata: {
          duration: Math.floor(Math.random() * 100) + 'ms',
          clientId: 'client_' + Math.floor(Math.random() * 1000)
        }
      };

      setLogs(prev => [...prev.slice(-99), newLog]); // Keep last 100 logs
    };

    // Generate initial logs
    for (let i = 0; i < 20; i++) {
      setTimeout(() => generateLog(), i * 100);
    }

    // Continue generating logs
    const interval = setInterval(generateLog, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, []);

  // Generate demo system metrics
  useEffect(() => {
    const generateMetric = () => {
      const newMetric: SystemMetric = {
        timestamp: new Date(),
        cpu: Math.random() * 100,
        memory: 30 + Math.random() * 40, // 30-70%
        operations: Math.floor(Math.random() * 1000)
      };

      setMetrics(prev => [...prev.slice(-29), newMetric]); // Keep last 30 data points
    };

    generateMetric();
    const interval = setInterval(generateMetric, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScroll) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  const filteredLogs = logs.filter(log => {
    const categoryMatch = selectedCategory === 'all' || log.category === selectedCategory;
    const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
    const searchMatch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return categoryMatch && levelMatch && searchMatch;
  });

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'info': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'debug': return 'text-gray-500 bg-gray-50 dark:bg-gray-800';
      default: return 'text-gray-500';
    }
  };

  const getCategoryIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'persistence': return <Database size={14} />;
      case 'memory': return <HardDrive size={14} />;
      case 'cpu': return <Cpu size={14} />;
      case 'operation': return <Activity size={14} />;
      case 'system': return <FileText size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const exportLogs = () => {
    const exportData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      category: log.category,
      message: log.message,
      metadata: log.metadata
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redis-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'persistence', label: 'Persistence' },
    { value: 'memory', label: 'Memory' },
    { value: 'cpu', label: 'CPU' },
    { value: 'operation', label: 'Operations' },
    { value: 'system', label: 'System' }
  ];

  const levels = [
    { value: 'all', label: 'All Levels' },
    { value: 'error', label: 'Error' },
    { value: 'warning', label: 'Warning' },
    { value: 'info', label: 'Info' },
    { value: 'debug', label: 'Debug' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Demo Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
          <div>
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              <strong>Demo Mode:</strong> This is a simulation of Redis system logs and metrics. 
              Real logging functionality is not available in the current API.
            </p>
          </div>
        </div>
      </div>

      {/* System Metrics Charts */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          System Performance (Demo)
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* CPU Usage */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="text-blue-500" size={20} />
                <span className="font-medium text-gray-900 dark:text-gray-100">CPU Usage</span>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.length > 0 ? `${Math.round(metrics[metrics.length - 1].cpu)}%` : '0%'}
              </span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <Line type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <XAxis hide />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="text-green-500" size={20} />
                <span className="font-medium text-gray-900 dark:text-gray-100">Memory Usage</span>
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics.length > 0 ? `${Math.round(metrics[metrics.length - 1].memory)}%` : '0%'}
              </span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <Line type="monotone" dataKey="memory" stroke="#10b981" strokeWidth={2} dot={false} />
                  <XAxis hide />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operations Per Second */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="text-purple-500" size={20} />
                <span className="font-medium text-gray-900 dark:text-gray-100">Operations/sec</span>
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {metrics.length > 0 ? Math.round(metrics[metrics.length - 1].operations) : '0'}
              </span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <Line type="monotone" dataKey="operations" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <XAxis hide />
                  <YAxis hide />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="text-gray-500" size={16} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            {levels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm min-w-[200px]"
          />

          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isAutoScroll}
                onChange={(e) => setIsAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              <Download size={14} />
              Export
            </button>
            
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No logs match the current filters</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex-shrink-0 mt-1">
                {getCategoryIcon(log.category)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getLevelColor(log.level)}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {log.category}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                  {log.message}
                </p>
                
                {log.metadata && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <span key={key} className="mr-4">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default LogsMonitor; 