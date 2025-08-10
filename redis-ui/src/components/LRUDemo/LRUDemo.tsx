import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { LRUStats } from '../../types';
import { Layers, Plus, Eye, Trash2, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';

const LRUDemo: React.FC = () => {
  const { lruStats, setLRUStats, addNotification } = useAppStore();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(lruStats.maxSize);

  useEffect(() => {
    setLRUStats({
      ...lruStats,
      maxSize: maxCapacity,
    });
  }, [maxCapacity]);

  const handleAddItem = () => {
    if (!newKey.trim()) {
      addNotification({
        type: 'error',
        title: 'Invalid Key',
        message: 'Key name cannot be empty',
      });
      return;
    }

    const newEntry = {
      key: newKey,
      value: newValue || 'Sample value',
      accessCount: 1,
      lastAccessed: new Date(),
      position: 0, // Will be at the front
      isEvicted: false,
    };

    let updatedEntries = [...lruStats.entries];
    let newHitCount = lruStats.hitCount;
    let newMissCount = lruStats.missCount;
    let newEvictionCount = lruStats.evictionCount;
    let currentSize = lruStats.currentSize;
    
    // Check if key already exists
    const existingIndex = updatedEntries.findIndex(entry => entry.key === newKey);
    if (existingIndex !== -1) {
      // Move to front and update
      const existingEntry = updatedEntries[existingIndex];
      updatedEntries.splice(existingIndex, 1);
      updatedEntries.unshift({
        ...existingEntry,
        value: newValue || existingEntry.value,
        accessCount: existingEntry.accessCount + 1,
        lastAccessed: new Date(),
        position: 0,
      });
      
      newHitCount = lruStats.hitCount + 1;
      
      addNotification({
        type: 'info',
        title: 'Key Updated',
        message: `Key "${newKey}" moved to front of cache`,
      });
    } else {
      // Add new entry
      updatedEntries.unshift(newEntry);
      newMissCount = lruStats.missCount + 1;
      
      // Check if we exceed capacity
      if (updatedEntries.length > maxCapacity) {
        const evicted = updatedEntries.slice(maxCapacity);
        updatedEntries = updatedEntries.slice(0, maxCapacity);
        newEvictionCount = lruStats.evictionCount + evicted.length;
        currentSize = maxCapacity;
        
        evicted.forEach(entry => {
          addNotification({
            type: 'warning',
            title: 'Item Evicted',
            message: `Key "${entry.key}" was evicted from cache (LRU)`,
          });
        });
      } else {
        currentSize = updatedEntries.length;
      }
      
      addNotification({
        type: 'success',
        title: 'Item Added',
        message: `Key "${newKey}" added to cache`,
      });
    }

    // Update positions for all entries
    updatedEntries = updatedEntries.map((entry, index) => ({
      ...entry,
      position: index,
    }));

    // Calculate hit rate
    const newHitRate = newHitCount + newMissCount > 0 ? (newHitCount / (newHitCount + newMissCount)) * 100 : 0;
    
    // Single state update with all changes
    setLRUStats({
      ...lruStats,
      currentSize,
      hitCount: newHitCount,
      missCount: newMissCount,
      evictionCount: newEvictionCount,
      hitRate: newHitRate,
      entries: updatedEntries,
    });

    setNewKey('');
    setNewValue('');
  };

  const handleAccessItem = (key: string) => {
    const updatedEntries = [...lruStats.entries];
    const index = updatedEntries.findIndex(entry => entry.key === key);
    
    if (index !== -1) {
      const item = updatedEntries[index];
      updatedEntries.splice(index, 1);
      updatedEntries.unshift({
        ...item,
        accessCount: item.accessCount + 1,
        lastAccessed: new Date(),
        position: 0,
      });
      
      const newHitCount = lruStats.hitCount + 1;
      const newHitRate = (newHitCount / (newHitCount + lruStats.missCount)) * 100;
      
      setLRUStats({
        ...lruStats,
        hitCount: newHitCount,
        hitRate: newHitRate,
        entries: updatedEntries.map((entry, index) => ({
          ...entry,
          position: index,
        })),
      });
      
      addNotification({
        type: 'info',
        title: 'Cache Hit',
        message: `Key "${key}" accessed, moved to front`,
      });
    }
  };

  const handleDeleteItem = (key: string) => {
    const updatedEntries = lruStats.entries.filter(entry => entry.key !== key);
    setLRUStats({
      ...lruStats,
      currentSize: updatedEntries.length,
      entries: updatedEntries.map((entry, index) => ({
        ...entry,
        position: index,
      })),
    });
    
    addNotification({
      type: 'info',
      title: 'Item Deleted',
      message: `Key "${key}" manually removed from cache`,
    });
  };

  const handleClearCache = () => {
    setLRUStats({
      ...lruStats,
      currentSize: 0,
      entries: [],
    });
    
    addNotification({
      type: 'info',
      title: 'Cache Cleared',
      message: 'All items removed from LRU cache',
    });
  };

  const addSampleData = () => {
    const sampleItems = [
      { key: 'user:1001', value: 'John Doe' },
      { key: 'user:1002', value: 'Jane Smith' },
      { key: 'product:501', value: 'Laptop' },
      { key: 'session:abc123', value: 'Active Session' },
      { key: 'config:theme', value: 'dark' },
    ];
    
    const newEntries = sampleItems.map((item, index) => ({
      ...item,
      accessCount: Math.floor(Math.random() * 10) + 1,
      lastAccessed: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24h
      position: index,
      isEvicted: false,
    }));
    
    setLRUStats({
      ...lruStats,
      currentSize: Math.min(newEntries.length, maxCapacity),
      entries: newEntries.slice(0, maxCapacity),
    });
    
    addNotification({
      type: 'success',
      title: 'Sample Data Added',
      message: `Added ${Math.min(newEntries.length, maxCapacity)} sample items to cache`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Layers className="text-purple-500" size={32} />
            LRU Cache Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Interactive demonstration of Least Recently Used (LRU) cache eviction policy
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Cache: {lruStats.currentSize}/{lruStats.maxSize}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Hit Rate: {lruStats.hitRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Cache Size</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {lruStats.currentSize}/{lruStats.maxSize}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Layers className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hit Rate</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {lruStats.hitRate.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Hits</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {lruStats.hitCount}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Eye className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Evictions</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {lruStats.evictionCount}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          LRU Cache Controls
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key
            </label>
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="e.g., user:123"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value
            </label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Value (optional)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Capacity
            </label>
            <input
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Number(e.target.value))}
              min={1}
              max={20}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex items-end">
            <button onClick={handleAddItem} className="btn-primary w-full flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={addSampleData} className="btn-secondary flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Add Samples
          </button>
          <button onClick={handleClearCache} className="btn-secondary flex items-center gap-2 text-red-600">
            <Trash2 className="w-4 h-4" />
            Clear Cache
          </button>
        </div>
      </div>

      {/* LRU Visualizer */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Cache Visualization
        </h2>
        <div className="space-y-2">
          {lruStats.entries.map((entry, index) => (
            <div
              key={entry.key}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                index === 0 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : index < 3 
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-red-500 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {entry.key}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.value} • {entry.accessCount} accesses
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAccessItem(entry.key)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  title="Access (move to front)"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(entry.key)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Access Patterns
          </h3>
          <div className="space-y-3">
            {lruStats.entries.slice(0, 5).map((entry, index) => (
              <div key={entry.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-green-500' : 
                    index < 3 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {entry.key}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.accessCount} accesses
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Position {entry.position + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cache Efficiency
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Hit Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${lruStats.hitRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{lruStats.hitRate.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {lruStats.hitCount}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Hits</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {lruStats.missCount}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">Misses</div>
              </div>
            </div>
            
            <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {lruStats.evictionCount}
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-300">Evictions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {lruStats.entries.length === 0 && (
        <div className="text-center py-12">
          <Layers className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={64} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            LRU Cache is Empty
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add some items to see how LRU eviction works
          </p>
          <button
            onClick={addSampleData}
            className="btn-primary"
          >
            Add Sample Data
          </button>
        </div>
      )}
    </div>
  );
};

export default LRUDemo; 