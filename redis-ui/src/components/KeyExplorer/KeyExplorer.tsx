import React, { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Key, Trash2, X, Info, Edit3, Calculator, Eye, EyeOff, Clock, Copy, List, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../../services/api';

interface RedisKeyData {
  key: string;
  type: string;
  ttl: number;
  size: number;
  value?: any;
}

interface OperationModal {
  type: 'set' | 'expire' | 'rename' | 'incr' | 'decr' | 'lpush' | 'rpush' | 'lpop' | 'rpop' | 'hset' | 'hget' | 'hdel' | 'hgetall' | null;
  key?: string;
}

const KeyExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [keys, setKeys] = useState<RedisKeyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedKeyData, setSelectedKeyData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  
  // Add Key Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [newTTL, setNewTTL] = useState<string>('');
  const [newKeyType, setNewKeyType] = useState<'string' | 'list' | 'hash'>('string');
  const [newHashField, setNewHashField] = useState<string>('');
  const [addingKey, setAddingKey] = useState<boolean>(false);

  // Operations Modal
  const [operationModal, setOperationModal] = useState<OperationModal>({ type: null });
  const [operationValue, setOperationValue] = useState<string>('');
  const [operationField, setOperationField] = useState<string>(''); // For hash operations or TTL
  const [operationResult, setOperationResult] = useState<string>('');
  const [performing, setPerforming] = useState<boolean>(false);
  
  // View options
  const [viewMode, setViewMode] = useState<'json' | 'raw'>('json');
  
  // Flush operations
  const [flushing, setFlushing] = useState<boolean>(false);

  // Fetch keys from API
  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getKeys();
      if (response.success && response.data) {
        const keyStrings: string[] = Array.isArray(response.data) ? response.data : [];
        const transformedKeys: RedisKeyData[] = keyStrings.map((keyStr: string) => ({
          key: keyStr,
          type: 'string',
          ttl: -1,
          size: keyStr.length * 2,
        }));
        setKeys(transformedKeys);
      } else {
        setKeys([]);
      }
    } catch (error) {
      console.error('Failed to fetch keys:', error);
      setError('Failed to fetch keys from server');
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch selected key data
  const fetchKeyData = async (key: string) => {
    try {
      const response = await apiService.getKey(key);
      if (response.success) {
        setSelectedKeyData(response.data);
        
        // Get TTL if available
        try {
          const ttlResponse = await apiService.getTTL(key);
          if (ttlResponse.success) {
            setSelectedKeyData((prev: any) => ({ ...prev, ttl: ttlResponse.data }));
          }
        } catch (ttlError) {
          console.log('TTL not available for key:', key);
        }
      }
    } catch (error) {
      console.error('Failed to fetch key data:', error);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  useEffect(() => {
    if (selectedKey) {
      fetchKeyData(selectedKey);
    }
  }, [selectedKey]);

  const filteredKeys = keys.filter(key => 
    key.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredKeys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedKeys = filteredKeys.slice(startIndex, endIndex);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedKey(null); // Clear selection when changing pages
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredKeys.length)} of {filteredKeys.length} keys
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                1
              </button>
              {startPage > 2 && <span className="text-gray-500">...</span>}
            </>
          )}
          
          {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 text-sm rounded ${
                currentPage === page
                  ? 'bg-primary-600 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {totalPages}
              </button>
            </>
          )}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const handleRefresh = () => {
    fetchKeys();
    if (selectedKey) {
      fetchKeyData(selectedKey);
    }
  };

  const handleFlushAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL keys from ALL nodes? This action cannot be undone.')) {
      return;
    }
    
    setFlushing(true);
    try {
      const response = await apiService.flushAll();
      if (response.success) {
        await fetchKeys();
        setSelectedKey(null);
        setSelectedKeyData(null);
        alert('All keys have been successfully flushed from all nodes.');
      } else {
        alert(`Error: ${response.error || 'Failed to flush all keys'}`);
      }
    } catch (error) {
      console.error('Failed to flush all keys:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to flush all keys'}`);
    } finally {
      setFlushing(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (window.confirm(`Are you sure you want to delete key "${key}"?`)) {
      try {
        const response = await apiService.deleteKey(key);
        if (response.success) {
          await fetchKeys();
          if (selectedKey === key) {
            setSelectedKey(null);
            setSelectedKeyData(null);
          }
        }
      } catch (error) {
        console.error('Failed to delete key:', error);
      }
    }
  };

  const handleAddKey = async () => {
    if (!newKey.trim()) {
      alert('Please enter a key name');
      return;
    }

    // Validate inputs based on key type
    if (newKeyType === 'string' && !newValue.trim()) {
      alert('Please enter a value for the string key');
      return;
    }
    if (newKeyType === 'list' && !newValue.trim()) {
      alert('Please enter an initial value for the list');
      return;
    }
    if (newKeyType === 'hash' && (!newHashField.trim() || !newValue.trim())) {
      alert('Please enter both field and value for the hash key');
      return;
    }

    setAddingKey(true);
    try {
      let response;
      const ttl = newTTL ? parseInt(newTTL) : undefined;

      switch (newKeyType) {
        case 'string':
          response = await apiService.setKey(newKey, newValue, ttl);
          break;
        
        case 'list':
          // Create list using rpush (adds to the right/end)
          response = await apiService.rpush(newKey, newValue);
          if (response.success && ttl) {
            await apiService.setExpire(newKey, ttl);
          }
          break;
        
        case 'hash':
          // Create hash using hset
          response = await apiService.hset(newKey, newHashField, newValue);
          if (response.success && ttl) {
            await apiService.setExpire(newKey, ttl);
          }
          break;
        
        default:
          throw new Error('Invalid key type');
      }

      if (response.success) {
        await fetchKeys();
        resetAddModal();
        setSelectedKey(newKey);
      } else {
        // Display the specific error message from the server
        const errorMessage = response.error || 'Failed to add key';
        alert(`Error: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Failed to add key:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add key';
      alert(`Error: ${errorMessage}`);
    } finally {
      setAddingKey(false);
    }
  };

  const resetAddModal = () => {
    setShowAddModal(false);
    setNewKey('');
    setNewValue('');
    setNewTTL('');
    setNewKeyType('string');
    setNewHashField('');
  };

  const handleOperation = async () => {
    if (!operationModal.type || !operationModal.key) return;

    setPerforming(true);
    setOperationResult('');
    
    try {
      let response;
      
      switch (operationModal.type) {
        case 'set':
          response = await apiService.setKey(operationModal.key, operationValue, operationField ? parseInt(operationField) : undefined);
          setOperationResult(response.success ? 'OK' : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'expire':
          response = await apiService.setExpire(operationModal.key, parseInt(operationValue));
          setOperationResult(response.success ? `TTL set to ${operationValue} seconds` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'rename':
          response = await apiService.renameKey(operationModal.key, operationValue);
          setOperationResult(response.success ? 'Key renamed successfully' : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'incr':
          response = await apiService.increment(operationModal.key);
          setOperationResult(response.success ? (response.data?.toString() || 'Success') : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'decr':
          response = await apiService.decrement(operationModal.key);
          setOperationResult(response.success ? (response.data?.toString() || 'Success') : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'lpush':
          response = await apiService.lpush(operationModal.key, operationValue);
          setOperationResult(response.success ? `List length: ${response.data || 'Unknown'}` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'rpush':
          response = await apiService.rpush(operationModal.key, operationValue);
          setOperationResult(response.success ? `List length: ${response.data || 'Unknown'}` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'lpop':
          response = await apiService.lpop(operationModal.key);
          setOperationResult(response.success ? `Popped: ${response.data || 'null'}` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'rpop':
          response = await apiService.rpop(operationModal.key);
          setOperationResult(response.success ? `Popped: ${response.data || 'null'}` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'hset':
          response = await apiService.hset(operationModal.key, operationField, operationValue);
          setOperationResult(response.success ? `Field set: ${response.data || 'Unknown'}` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'hget':
          response = await apiService.hget(operationModal.key, operationField);
          setOperationResult(response.success ? `Value: ${response.data || 'null'}` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'hdel':
          response = await apiService.hdel(operationModal.key, operationField);
          setOperationResult(response.success ? `Fields deleted: ${response.data || 'Unknown'}` : `Error: ${response.error || 'Failed'}`);
          break;
          
        case 'hgetall':
          response = await apiService.hgetall(operationModal.key);
          setOperationResult(response.success ? JSON.stringify(response.data || {}, null, 2) : `Error: ${response.error || 'Failed'}`);
          break;
          
        default:
          setOperationResult('Operation not implemented');
      }
      
      if (response?.success) {
        await fetchKeys();
        if (selectedKey) {
          await fetchKeyData(selectedKey);
        }
      }
    } catch (error) {
      console.error('Failed to perform operation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setOperationResult(`Error: ${errorMessage}`);
    } finally {
      setPerforming(false);
    }
  };

  const resetOperationModal = () => {
    setOperationModal({ type: null });
    setOperationValue('');
    setOperationField('');
    setOperationResult('');
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <Key className="w-16 h-16 mb-4 opacity-50" />
      <h3 className="text-lg font-medium mb-2">No Keys Found</h3>
      <p className="text-sm text-center mb-4 max-w-md">
        {searchTerm ? 
          `No keys match "${searchTerm}". Try a different search term.` :
          'No keys are currently stored in the cluster. Add a key to get started.'
        }
      </p>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Cluster Mode</p>
            <p>Keys are distributed across multiple nodes. This view shows keys from all nodes in the cluster.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderKeysList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-32 text-red-600 dark:text-red-400">
          <div className="text-center">
            <p className="mb-2">{error}</p>
            <button onClick={handleRefresh} className="text-sm underline">
              Try Again
            </button>
          </div>
        </div>
      );
    }

    if (filteredKeys.length === 0) {
      return renderEmptyState();
    }

    return paginatedKeys.map((key) => (
      <div
        key={key.key}
        onClick={() => setSelectedKey(key.key)}
        className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
          selectedKey === key.key ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="w-4 h-4 text-primary-500" />
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {key.key}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {key.type} • {key.size} bytes
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              TTL: {key.ttl === -1 ? 'Persistent' : `${key.ttl}s`}
            </div>
          </div>
        </div>
      </div>
    ));
  };

  const renderKeyOperations = () => (
    <div className="space-y-2">
      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
        Key Operations
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Basic Operations */}
        <button
          onClick={() => setOperationModal({ type: 'set', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Edit3 className="w-3 h-3" />
          SET
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'expire', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Clock className="w-3 h-3" />
          EXPIRE
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'rename', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Copy className="w-3 h-3" />
          RENAME
        </button>
        
        <button
          onClick={() => handleDeleteKey(selectedKey!)}
          className="btn-danger text-sm flex items-center gap-2"
        >
          <Trash2 className="w-3 h-3" />
          DELETE
        </button>
        
        {/* Numeric Operations */}
        <button
          onClick={() => setOperationModal({ type: 'incr', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Calculator className="w-3 h-3" />
          INCR
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'decr', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Calculator className="w-3 h-3" />
          DECR
        </button>
        
        {/* List Operations */}
        <button
          onClick={() => setOperationModal({ type: 'lpush', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <List className="w-3 h-3" />
          LPUSH
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'rpush', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <List className="w-3 h-3" />
          RPUSH
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'lpop', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <List className="w-3 h-3" />
          LPOP
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'rpop', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <List className="w-3 h-3" />
          RPOP
        </button>
        
        {/* Hash Operations */}
        <button
          onClick={() => setOperationModal({ type: 'hset', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Hash className="w-3 h-3" />
          HSET
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'hget', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Hash className="w-3 h-3" />
          HGET
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'hdel', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Hash className="w-3 h-3" />
          HDEL
        </button>
        
        <button
          onClick={() => setOperationModal({ type: 'hgetall', key: selectedKey! })}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Hash className="w-3 h-3" />
          HGETALL
        </button>
      </div>
    </div>
  );

  const renderOperationModal = () => {
    if (!operationModal.type || !operationModal.key) return null;

    const operationLabels = {
      set: 'SET Key',
      expire: 'Set Expiration',
      rename: 'Rename Key',
      incr: 'Increment',
      decr: 'Decrement',
      lpush: 'Left Push',
      rpush: 'Right Push',
      lpop: 'Left Pop',
      rpop: 'Right Pop',
      hset: 'Hash Set',
      hget: 'Hash Get',
      hdel: 'Hash Delete',
      hgetall: 'Hash Get All'
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {operationLabels[operationModal.type]}
            </h3>
            <button
              onClick={resetOperationModal}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key: {operationModal.key}
              </label>
            </div>

            {/* Operation-specific inputs */}
            {operationModal.type === 'set' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Value
                  </label>
                  <textarea
                    value={operationValue}
                    onChange={(e) => setOperationValue(e.target.value)}
                    placeholder="Enter value"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    TTL (seconds) - Optional
                  </label>
                  <input
                    type="number"
                    value={operationField}
                    onChange={(e) => setOperationField(e.target.value)}
                    placeholder="Leave empty for persistent"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </>
            )}

            {operationModal.type === 'expire' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TTL (seconds)
                </label>
                <input
                  type="number"
                  value={operationValue}
                  onChange={(e) => setOperationValue(e.target.value)}
                  placeholder="Enter TTL in seconds"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}

            {operationModal.type === 'rename' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Key Name
                </label>
                <input
                  type="text"
                  value={operationValue}
                  onChange={(e) => setOperationValue(e.target.value)}
                  placeholder="Enter new key name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}

            {(operationModal.type === 'lpush' || operationModal.type === 'rpush') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value to Push
                </label>
                <input
                  type="text"
                  value={operationValue}
                  onChange={(e) => setOperationValue(e.target.value)}
                  placeholder="Enter value"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}

            {(operationModal.type === 'lpop' || operationModal.type === 'rpop') && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This operation will remove and return the {operationModal.type === 'lpop' ? 'first' : 'last'} element from the list.
                </p>
              </div>
            )}

            {(operationModal.type === 'hset' || operationModal.type === 'hget' || operationModal.type === 'hdel') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Field
                  </label>
                  <input
                    type="text"
                    value={operationField}
                    onChange={(e) => setOperationField(e.target.value)}
                    placeholder="Enter field name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                {operationModal.type === 'hset' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Value
                    </label>
                    <input
                      type="text"
                      value={operationValue}
                      onChange={(e) => setOperationValue(e.target.value)}
                      placeholder="Enter value"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}
              </>
            )}

            {operationModal.type === 'hgetall' && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This operation will return all fields and values from the hash.
                </p>
              </div>
            )}

            {(operationModal.type === 'incr' || operationModal.type === 'decr') && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This operation will {operationModal.type === 'incr' ? 'increment' : 'decrement'} the numeric value of the key by 1.
                </p>
              </div>
            )}

            {operationResult && (
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Result:
                </label>
                <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {operationResult}
                </pre>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleOperation}
              disabled={performing}
              className="btn-primary flex-1"
            >
              {performing ? 'Executing...' : 'Execute'}
            </button>
            <button
              onClick={resetOperationModal}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderValueDisplay = () => {
    if (!selectedKeyData) return null;

    const value = selectedKeyData.value;
    
    try {
      const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
      
      if (viewMode === 'json') {
        return (
          <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {JSON.stringify(parsedValue, null, 2)}
          </pre>
        );
      }
    } catch (e) {
      // Not valid JSON, show as raw
    }
    
    return (
      <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
        {value}
      </pre>
    );
  };

  return (
    <div className="h-full flex">
      {/* Keys List */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Redis Keys Explorer
          </h2>
          
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {filteredKeys.length > 0 ? (
                <span>Found {filteredKeys.length} key(s) matching "{searchTerm}"</span>
              ) : (
                <span>No keys match "{searchTerm}"</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Key
            </button>
            <button 
              onClick={handleRefresh}
              className="btn-secondary flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={handleFlushAll}
              className="btn-danger flex items-center gap-2"
              disabled={flushing || loading}
              title="Delete all keys from all nodes"
            >
              <Trash2 className={`w-4 h-4 ${flushing ? 'animate-pulse' : ''}`} />
              {flushing ? 'Flushing...' : 'Flush All'}
            </button>
          </div>

          {/* Keys Count */}
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
            <span>
              {keys.length} key(s) in cluster
              {searchTerm && filteredKeys.length !== keys.length && (
                <> • {filteredKeys.length} filtered</>
              )}
            </span>
            {totalPages > 1 && (
              <span>
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Keys List */}
        <div className="overflow-y-auto h-full">
          {renderKeysList()}
          {renderPagination()}
        </div>
      </div>

      {/* Key Details */}
      <div className="w-1/2 p-6">
        {selectedKey ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {selectedKey}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode(viewMode === 'json' ? 'raw' : 'json')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  {viewMode === 'json' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {viewMode === 'json' ? 'Raw' : 'JSON'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Key Information */}
              <div className="card">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Key Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {keys.find(k => k.key === selectedKey)?.type || 'string'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">TTL:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {selectedKeyData?.ttl !== undefined 
                        ? (selectedKeyData.ttl === -1 ? 'Persistent' : `${selectedKeyData.ttl}s`)
                        : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Size:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {keys.find(k => k.key === selectedKey)?.size || 0} bytes
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Operations */}
              <div className="card">
                {renderKeyOperations()}
              </div>

              {/* Value Display */}
              <div className="card flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    Value
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {viewMode.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                  {selectedKeyData ? renderValueDisplay() : 'Loading...'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a key to view its details and operations</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Key Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add New Key
              </h3>
              <button
                onClick={resetAddModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Type
                </label>
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value as 'string' | 'list' | 'hash')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="string">String</option>
                  <option value="list">List</option>
                  <option value="hash">Hash Set</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {newKeyType === 'string' && 'Simple key-value pair'}
                  {newKeyType === 'list' && 'Ordered collection of values (arrays)'}
                  {newKeyType === 'hash' && 'Collection of field-value pairs (objects)'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Name
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Enter key name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {newKeyType === 'hash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Field Name
                  </label>
                  <input
                    type="text"
                    value={newHashField}
                    onChange={(e) => setNewHashField(e.target.value)}
                    placeholder="Enter field name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {newKeyType === 'string' && 'Value'}
                  {newKeyType === 'list' && 'Initial Value'}
                  {newKeyType === 'hash' && 'Field Value'}
                </label>
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={
                    newKeyType === 'string' ? 'Enter key value' :
                    newKeyType === 'list' ? 'Enter first list item' :
                    'Enter field value'
                  }
                  rows={newKeyType === 'string' ? 4 : 2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {newKeyType === 'list' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will be the first item in your list. You can add more items using list operations later.
                  </p>
                )}
                {newKeyType === 'hash' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This will be the first field-value pair in your hash. You can add more fields later.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  TTL (seconds) - Optional
                </label>
                <input
                  type="number"
                  value={newTTL}
                  onChange={(e) => setNewTTL(e.target.value)}
                  placeholder="Leave empty for persistent key"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddKey}
                disabled={addingKey}
                className="btn-primary flex-1"
              >
                {addingKey ? 'Creating...' : `Create ${newKeyType.charAt(0).toUpperCase() + newKeyType.slice(1)}`}
              </button>
              <button
                onClick={resetAddModal}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operation Modal */}
      {renderOperationModal()}
    </div>
  );
};

export default KeyExplorer; 