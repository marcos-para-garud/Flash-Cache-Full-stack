import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { Timer, RotateCcw, Plus, Trash2, Clock, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../../services/api';
import { TTLEntry } from '../../types';
import TTLKeyCard from './TTLKeyCard';

interface ApiTTLKey {
  key: string;
  value: string;
  ttl: number;
  node: string;
  expires: string;
}

const TTLPlayground: React.FC = () => {
  const { ttlEntries, setTTLEntries, addNotification } = useAppStore();
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyTTL, setNewKeyTTL] = useState(30);
  const [apiTTLKeys, setApiTTLKeys] = useState<ApiTTLKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Pagination state for API TTL keys
  const [apiKeysPage, setApiKeysPage] = useState(1);
  const [simulationKeysPage, setSimulationKeysPage] = useState(1);
  const [keysPerPage] = useState(10);

  // Fetch TTL keys from API
  const fetchTTLKeys = async () => {
    setLoading(true);
    try {
      const response = await apiService.getTTLKeys();
      if (response.success && response.data) {
        setApiTTLKeys(response.data);
        setApiKeysPage(1); // Reset to first page when refreshing
        setLastFetch(new Date());
      } else {
        setApiTTLKeys([]);
      }
    } catch (error) {
      console.error('Failed to fetch TTL keys:', error);
      setApiTTLKeys([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh TTL keys every 30 seconds
  useEffect(() => {
    fetchTTLKeys();
    const interval = setInterval(fetchTTLKeys, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update TTL countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedEntries = ttlEntries.map((entry: TTLEntry): TTLEntry => {
        const elapsed = Math.floor((Date.now() - entry.startTime.getTime()) / 1000);
        const remaining = Math.max(0, entry.ttl - elapsed);
        const progress = ((entry.ttl - remaining) / entry.ttl) * 100;
        
        return {
          ...entry,
          remainingTime: remaining,
          progress: Math.min(progress, 100)
        };
      }).filter((entry: TTLEntry) => entry.remainingTime > 0);
      
      setTTLEntries(updatedEntries);
    }, 1000);

    return () => clearInterval(interval);
  }, [ttlEntries, setTTLEntries]);

  const handleAddKey = () => {
    if (!newKeyName.trim()) {
      addNotification({
        type: 'error',
        title: 'Invalid Input',
        message: 'Please enter a key name',
      });
      return;
    }

    const newEntry = {
      key: newKeyName,
      value: newKeyValue || 'Sample value',
      ttl: newKeyTTL,
      startTime: new Date(),
      remainingTime: newKeyTTL,
      progress: 0,
    };

    setTTLEntries([newEntry, ...ttlEntries]);
    setSimulationKeysPage(1); // Reset to first page to show new key
    setNewKeyName('');
    setNewKeyValue('');
    setNewKeyTTL(30);

    addNotification({
      type: 'success',
      title: 'Key Added',
      message: `Key "${newKeyName}" added with ${newKeyTTL}s TTL`,
    });
  };

  const handleDeleteKey = (keyName: string) => {
    setTTLEntries(ttlEntries.filter(entry => entry.key !== keyName));
    addNotification({
      type: 'info',
      title: 'Key Deleted',
      message: `Key "${keyName}" has been manually deleted`,
    });
  };

  const handleResetKey = (keyName: string) => {
    setTTLEntries(
      ttlEntries.map(entry =>
        entry.key === keyName
          ? {
              ...entry,
              startTime: new Date(),
              remainingTime: entry.ttl,
              progress: 0,
            }
          : entry
      )
    );
    addNotification({
      type: 'info',
      title: 'TTL Reset',
      message: `TTL for key "${keyName}" has been reset`,
    });
  };

  const handleClearAll = () => {
    setTTLEntries([]);
    addNotification({
      type: 'info',
      title: 'All Keys Cleared',
      message: 'All TTL entries have been cleared',
    });
  };

  const addSampleKeys = () => {
    const sampleKeys = [
      { key: 'session:user123', value: 'user_data', ttl: 15 },
      { key: 'cache:product456', value: 'product_info', ttl: 60 },
      { key: 'temp:upload789', value: 'file_metadata', ttl: 30 },
      { key: 'rate:limit:ip', value: 'request_count', ttl: 10 },
    ];

    const newEntries = sampleKeys.map(sample => ({
      ...sample,
      startTime: new Date(),
      remainingTime: sample.ttl,
      progress: 0,
    }));

    setTTLEntries([...ttlEntries, ...newEntries]);
    addNotification({
      type: 'success',
      title: 'Sample Keys Added',
      message: 'Added 4 sample keys with different TTL values',
    });
  };

  const expiringKeys = ttlEntries.filter(entry => entry.remainingTime <= 5);
  const expiringApiKeys = apiTTLKeys.filter(key => key.ttl <= 5);
  const avgTTL = ttlEntries.length > 0 
    ? ttlEntries.reduce((sum, entry) => sum + entry.remainingTime, 0) / ttlEntries.length 
    : 0;
  const totalKeys = ttlEntries.length + apiTTLKeys.length;
  const totalExpiring = expiringKeys.length + expiringApiKeys.length;

  const formatTimeRemaining = (ttl: number): string => {
    if (ttl >= 3600) {
      const hours = Math.floor(ttl / 3600);
      const minutes = Math.floor((ttl % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else if (ttl >= 60) {
      const minutes = Math.floor(ttl / 60);
      const seconds = ttl % 60;
      return `${minutes}m ${seconds}s`;
    } else {
      return `${ttl}s`;
    }
  };

  // Pagination logic
  const getPaginatedData = (data: any[], currentPage: number) => {
    const startIndex = (currentPage - 1) * keysPerPage;
    const endIndex = startIndex + keysPerPage;
    return {
      data: data.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.length / keysPerPage),
      startIndex,
      endIndex: Math.min(endIndex, data.length),
      totalItems: data.length
    };
  };

  const paginatedApiKeys = getPaginatedData(apiTTLKeys, apiKeysPage);
  const paginatedSimulationKeys = getPaginatedData(ttlEntries, simulationKeysPage);

  // Reusable pagination component
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void,
    totalItems: number,
    startIndex: number,
    endIndex: number,
    itemType: string
  ) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {startIndex + 1} to {endIndex} of {totalItems} {itemType}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Timer className="text-orange-500" size={32} />
            TTL Playground
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and test Redis TTL (Time-To-Live) functionality - live keys from your Redis cluster
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          {lastFetch && (
            <div className="flex items-center gap-1">
              <Database size={16} />
              <span>Last updated: {lastFetch.toLocaleTimeString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>Avg TTL: {avgTTL.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total TTL Keys</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalKeys}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {apiTTLKeys.length} from Redis, {ttlEntries.length} simulated
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Timer className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Redis Keys</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {apiTTLKeys.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {loading ? 'Refreshing...' : 'Live from cluster'}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Database className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {totalExpiring}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                ≤ 5 seconds left
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Simulation Keys</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {ttlEntries.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Test playground
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <RotateCcw className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Add New TTL Key
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., session:user123"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value
            </label>
            <input
              type="text"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder="Key value (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              TTL (seconds)
            </label>
            <input
              type="number"
              value={newKeyTTL}
              onChange={(e) => setNewKeyTTL(Number(e.target.value))}
              min={1}
              max={300}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAddKey} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Key
          </button>
          <button onClick={addSampleKeys} className="btn-secondary flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Add Samples
          </button>
          <button onClick={handleClearAll} className="btn-secondary flex items-center gap-2 text-red-600">
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
          <button 
            onClick={fetchTTLKeys} 
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            {loading ? 'Refreshing...' : 'Refresh Redis Keys'}
          </button>
        </div>
      </div>

      {/* Redis TTL Keys Section */}
      {apiTTLKeys.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-green-500" />
              Live Redis TTL Keys ({apiTTLKeys.length})
              {paginatedApiKeys.totalPages > 1 && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  • Page {apiKeysPage}/{paginatedApiKeys.totalPages}
                </span>
              )}
            </h2>
            <button 
              onClick={fetchTTLKeys} 
              disabled={loading}
              className="btn-sm btn-secondary"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedApiKeys.data.map((key) => (
              <div 
                key={key.key} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-green-50 dark:bg-green-900/10"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {key.key}
                  </h3>
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                    {key.node}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Value:</span>
                    <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono break-all">
                      {key.value.length > 100 ? `${key.value.substring(0, 100)}...` : key.value}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">TTL:</span>
                    <span className={`font-mono text-sm font-semibold ${
                      key.ttl <= 5 ? 'text-red-600 dark:text-red-400' : 
                      key.ttl <= 60 ? 'text-orange-600 dark:text-orange-400' : 
                      'text-green-600 dark:text-green-400'
                    }`}>
                      {formatTimeRemaining(key.ttl)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Expires: {new Date(key.expires).toLocaleTimeString()}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-1000 ${
                        key.ttl <= 5 ? 'bg-red-500' : 
                        key.ttl <= 60 ? 'bg-orange-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.max(5, (key.ttl / Math.max(...apiTTLKeys.map(k => k.ttl))) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {renderPagination(
            apiKeysPage,
            paginatedApiKeys.totalPages,
            setApiKeysPage,
            paginatedApiKeys.totalItems,
            paginatedApiKeys.startIndex,
            paginatedApiKeys.endIndex,
            'Redis Keys'
          )}
        </div>
      )}

      {/* Simulation Keys Section */}
      {ttlEntries.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Timer className="w-5 h-5 text-purple-500" />
            Simulation TTL Keys ({ttlEntries.length})
            {paginatedSimulationKeys.totalPages > 1 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                • Page {simulationKeysPage}/{paginatedSimulationKeys.totalPages}
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedSimulationKeys.data.map((entry) => (
              <TTLKeyCard
                key={entry.key}
                entry={entry}
                onDelete={handleDeleteKey}
                onReset={handleResetKey}
              />
            ))}
          </div>
          {renderPagination(
            simulationKeysPage,
            paginatedSimulationKeys.totalPages,
            setSimulationKeysPage,
            paginatedSimulationKeys.totalItems,
            paginatedSimulationKeys.startIndex,
            paginatedSimulationKeys.endIndex,
            'Simulation Keys'
          )}
        </div>
      )}

      {/* Empty State */}
      {ttlEntries.length === 0 && apiTTLKeys.length === 0 && (
        <div className="text-center py-12">
          <Timer className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={64} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No TTL Keys Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No TTL keys found in your Redis cluster. Add some keys with TTL values to see them here, or create simulation keys to test TTL behavior.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={addSampleKeys}
              className="btn-primary"
            >
              Add Sample Keys
            </button>
            <button
              onClick={fetchTTLKeys}
              className="btn-secondary"
            >
              Refresh Redis Keys
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TTLPlayground; 