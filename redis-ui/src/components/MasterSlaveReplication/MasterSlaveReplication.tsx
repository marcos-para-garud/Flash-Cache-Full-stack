import React, { useState, useEffect, useCallback } from 'react';
import { 
  Server, 
  Activity, 
  Database, 
  Users, 
  Play, 
  Square, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Terminal,
  Settings,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { apiService } from '../../services/api';
import { ReplicationEvent, SlaveNode, MasterNode, ReplicationStatus, ReplicationKeyComparison } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';

interface ReplicationLog extends Omit<ReplicationEvent, 'timestamp'> {
  timestamp: string;
}

const MasterSlaveReplication: React.FC = () => {
  // State management
  const [masterData, setMasterData] = useState<MasterNode | null>(null);
  const [slaves, setSlaves] = useState<any[]>([]); // Changed to any[] to accommodate merged data
  const [replicationLog, setReplicationLog] = useState<ReplicationLog[]>([]);
  const [replicationStatus, setReplicationStatus] = useState<ReplicationStatus | null>(null);
  const [keyComparisons, setKeyComparisons] = useState<ReplicationKeyComparison[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'logs' | 'testing'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Testing Panel State
  const [testCommand, setTestCommand] = useState('set');
  const [testKey, setTestKey] = useState('test:key');
  const [testValue, setTestValue] = useState('hello world');
  const [testTTL, setTestTTL] = useState('');
  const [commandLoading, setCommandLoading] = useState(false);

  // Slave Management State
  const [slaveCount, setSlaveCount] = useState(1);
  const [slaveProcesses, setSlaveProcesses] = useState<any[]>([]);
  const [slaveMgmtLoading, setSlaveMgmtLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    variant: 'danger' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
    variant: 'warning'
  });

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket();

  // Fetch all replication data
  const fetchReplicationData = useCallback(async () => {
    try {
      setError(null);
      const [statusRes, masterRes, slavesRes, logRes, processesRes] = await Promise.all([
        apiService.getReplicationStatus(),
        apiService.getMasterKeys(),
        apiService.getSlaves(),
        apiService.getReplicationLog(50),
        apiService.getSlaveProcesses()
      ]);

      if (statusRes.success) setReplicationStatus(statusRes.data);
      if (masterRes.success) setMasterData(masterRes.data);
      
      // Merge slave connection data and process data into unified list
      if (slavesRes.success && processesRes.success) {
        const connectionSlaves = slavesRes.data || [];
        const processSlaves = processesRes.data || [];
        
        // Create a map to merge data by slave ID
        const mergedSlaves = new Map();
        
        // Add connection data
        connectionSlaves.forEach((slave: any) => {
          mergedSlaves.set(slave.id, {
            ...slave,
            hasConnection: true,
            isConnected: slave.status === 'connected'
          });
        });
        
        // Merge process data
        processSlaves.forEach((process: any) => {
          const existing = mergedSlaves.get(process.id);
          if (existing) {
            // Merge with existing connection data
            mergedSlaves.set(process.id, {
              ...existing,
              hasProcess: true,
              pid: process.pid,
              port: process.port,
              startedAt: process.startedAt,
              // Use process status if no connection, otherwise keep connection status
              status: existing.isConnected ? existing.status : process.status
            });
          } else {
            // Process-only entry (should be rare with new handshake system)
            mergedSlaves.set(process.id, {
              id: process.id,
              status: process.status,
              hasProcess: true,
              hasConnection: false,
              isConnected: false,
              pid: process.pid,
              port: process.port,
              startedAt: process.startedAt,
              keys: {},
              role: 'slave'
            });
          }
        });
        
        setSlaves(Array.from(mergedSlaves.values()));
        setSlaveProcesses([]); // Clear separate process list since we merged it
      } else if (slavesRes.success) {
        setSlaves(slavesRes.data);
      }
      
      if (logRes.success) {
        setReplicationLog(logRes.data.map((event: ReplicationEvent) => ({
          ...event,
          timestamp: typeof event.timestamp === 'string' ? event.timestamp : new Date(event.timestamp).toISOString()
        })));
      }

      // Generate key comparisons
      if (masterRes.success && slavesRes.success) {
        generateKeyComparisons(masterRes.data, slavesRes.data);
      }
    } catch (err) {
      setError('Failed to fetch replication data');
      console.error('Replication data fetch error:', err);
    }
  }, []);

  // Generate key comparison data
  const generateKeyComparisons = (master: MasterNode, slaveNodes: SlaveNode[]) => {
    const allKeys = new Set([
      ...Object.keys(master.keys || {}),
      ...slaveNodes.flatMap(slave => Object.keys(slave.keys || {}))
    ]);

    const comparisons: ReplicationKeyComparison[] = Array.from(allKeys).map(key => {
      const masterEntry = master.keys?.[key];
      const masterExists = !!masterEntry;
      
      const slaveEntries: Record<string, { exists: boolean; value?: any; synced: boolean }> = {};
      let syncedCount = 0;
      
      slaveNodes.forEach(slave => {
        const slaveValue = slave.keys?.[key];
        const exists = slaveValue !== undefined;
        const synced = exists && masterExists && slaveValue === masterEntry?.value;
        
        slaveEntries[slave.id] = {
          exists,
          value: slaveValue,
          synced: synced
        };
        
        // Only count slaves as synced if they actually have the key with the correct value
        if (synced) syncedCount++;
      });

      let status: 'synced' | 'partial' | 'out_of_sync';
      if (syncedCount === slaveNodes.length) {
        status = 'synced';
      } else if (syncedCount > 0) {
        status = 'partial';
      } else {
        status = 'out_of_sync';
      }

      return {
        key,
        master: {
          exists: masterExists,
          value: masterEntry?.value,
          ttl: masterEntry?.ttl
        },
        slaves: slaveEntries,
        status
      };
    });

    setKeyComparisons(comparisons);
  };

  // Start master server
  const handleStartMaster = async () => {
    setLoading(true);
    try {
      const response = await apiService.startMaster();
      if (response.success) {
        setTimeout(fetchReplicationData, 1000); // Give server time to start
      } else {
        setError(response.error || 'Failed to start master server');
      }
    } catch (err) {
      setError('Failed to start master server');
    } finally {
      setLoading(false);
    }
  };

  // Stop master server
  const handleStopMaster = async () => {
    setLoading(true);
    try {
      const response = await apiService.stopMaster();
      if (response.success) {
        setMasterData(null);
        setSlaves([]);
        setReplicationStatus(null);
        setKeyComparisons([]);
      } else {
        setError(response.error || 'Failed to stop master server');
      }
    } catch (err) {
      setError('Failed to stop master server');
    } finally {
      setLoading(false);
    }
  };

  // Execute test command
  const handleExecuteCommand = async () => {
    if (!testKey.trim()) return;
    
    setCommandLoading(true);
    try {
      const args = [testKey];
      if (testCommand === 'set') {
        args.push(testValue);
        if (testTTL) args.push(testTTL);
      }

      const response = await apiService.executeReplicationCommand(testCommand, args);
      if (response.success) {
        // Refresh data after command execution
        setTimeout(fetchReplicationData, 500);
      } else {
        setError(response.error || 'Failed to execute command');
      }
    } catch (err) {
      setError('Failed to execute command');
    } finally {
      setCommandLoading(false);
    }
  };

  // Simulate slave failure
  const handleSimulateFailure = async (slaveId: string, killProcess: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.simulateSlaveFailure(slaveId, killProcess);
      if (response.success) {
        // Refresh data to show updated slave status
        await fetchReplicationData();
      } else {
        setError(response.error || 'Failed to simulate slave failure');
      }
    } catch (err) {
      setError('Failed to simulate slave failure');
      console.error('Simulate failure error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Slave Management Handlers
  const handleAddSlaves = async () => {
    try {
      setSlaveMgmtLoading(true);
      setError(null);
      
      const response = await apiService.addSlaves(slaveCount);
      if (response.success) {
        await fetchReplicationData();
        // Reset slave count to 1
        setSlaveCount(1);
      } else {
        setError(response.error || 'Failed to add slaves');
      }
    } catch (err) {
      setError('Failed to add slaves');
      console.error('Add slaves error:', err);
    } finally {
      setSlaveMgmtLoading(false);
    }
  };

  const handleStopSlave = async (slaveId: string) => {
    try {
      setSlaveMgmtLoading(true);
      setError(null);
      
      const response = await apiService.stopSlave(slaveId);
      if (response.success) {
        await fetchReplicationData();
      } else {
        setError(response.error || 'Failed to stop slave');
      }
    } catch (err) {
      setError('Failed to stop slave');
      console.error('Stop slave error:', err);
    } finally {
      setSlaveMgmtLoading(false);
    }
  };

  const handleRemoveSlave = async (slaveId: string) => {
    try {
      setSlaveMgmtLoading(true);
      setError(null);
      
      const response = await apiService.removeSlave(slaveId);
      if (response.success) {
        await fetchReplicationData();
      } else {
        setError(response.error || 'Failed to remove slave');
      }
    } catch (err) {
      setError('Failed to remove slave');
      console.error('Remove slave error:', err);
    } finally {
      setSlaveMgmtLoading(false);
    }
  };

  const handleStopAllSlaves = async () => {
    try {
      setSlaveMgmtLoading(true);
      setError(null);
      
      const response = await apiService.stopAllSlaves();
      if (response.success) {
        await fetchReplicationData();
      } else {
        setError(response.error || 'Failed to stop all slaves');
      }
    } catch (err) {
      setError('Failed to stop all slaves');
      console.error('Stop all slaves error:', err);
    } finally {
      setSlaveMgmtLoading(false);
    }
  };

  const handleCleanupZombieSlaves = async () => {
    try {
      setSlaveMgmtLoading(true);
      setError(null);
      
      const response = await apiService.cleanupZombieSlaves();
      if (response.success) {
        const killedProcesses = response.data?.data || [];
        if (killedProcesses.length > 0) {
          setError(null);
          // Show success message temporarily
          setTimeout(() => {
            setError(`Successfully cleaned up ${killedProcesses.length} zombie process(es)`);
            setTimeout(() => setError(null), 3000);
          }, 100);
        }
        await fetchReplicationData();
      } else {
        setError(response.error || 'Failed to cleanup zombie slaves');
      }
    } catch (err) {
      setError('Failed to cleanup zombie slaves');
      console.error('Cleanup zombie slaves error:', err);
    } finally {
      setSlaveMgmtLoading(false);
    }
  };

  // Enhanced handlers with confirmation dialogs
  const handleStopSlaveWithConfirm = (slaveId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Stop Slave Process',
      message: `Are you sure you want to stop slave "${slaveId}"? This will terminate the slave process but keep it in the connection list.`,
      action: () => {
        handleStopSlave(slaveId);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      variant: 'warning'
    });
  };

  const handleRemoveSlaveWithConfirm = (slaveId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Slave',
      message: `Are you sure you want to completely remove slave "${slaveId}"? This will disconnect it from replication and remove it from the system.`,
      action: () => {
        handleRemoveSlave(slaveId);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      variant: 'danger'
    });
  };

  const handleStopAllSlavesWithConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Stop All Slaves',
      message: `Are you sure you want to stop all ${slaves.length} slave(s)? This will terminate all slave processes and clear the replication array.`,
      action: () => {
        handleStopAllSlaves();
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      variant: 'danger'
    });
  };

  const handleRemoveAllSlaves = async () => {
    try {
      setSlaveMgmtLoading(true);
      setError(null);
      
      // First stop all slaves
      const stopResponse = await apiService.stopAllSlaves();
      if (!stopResponse.success) {
        setError(stopResponse.error || 'Failed to stop all slaves');
        return;
      }
      
      // Then cleanup any zombie processes
      const cleanupResponse = await apiService.cleanupZombieSlaves();
      if (!cleanupResponse.success) {
        setError(cleanupResponse.error || 'Failed to cleanup zombie processes');
        return;
      }
      
      const killedProcesses = cleanupResponse.data?.data || [];
      setError(`Successfully removed all slaves and cleaned up ${killedProcesses.length} zombie process(es)`);
      setTimeout(() => setError(null), 3000);
      
      await fetchReplicationData();
    } catch (err) {
      setError('Failed to remove all slaves');
      console.error('Remove all slaves error:', err);
    } finally {
      setSlaveMgmtLoading(false);
    }
  };

  const handleRemoveAllSlavesWithConfirm = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove All Slaves',
      message: `Are you sure you want to completely remove all ${slaves.length} slave(s)? This will:
      
• Stop all slave processes
• Disconnect all slaves from replication
• Clean up any zombie processes
• Clear the replication array

This action cannot be undone.`,
      action: () => {
        handleRemoveAllSlaves();
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      variant: 'danger'
    });
  };

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && replicationStatus?.masterRunning) {
      const interval = setInterval(fetchReplicationData, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, replicationStatus?.masterRunning, fetchReplicationData]);

  // Initial data fetch
  useEffect(() => {
    fetchReplicationData();
  }, [fetchReplicationData]);

  // WebSocket event handling for real-time updates
  useEffect(() => {
    if (isConnected) {
      // Listen for replication events
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handleReplicationEvent = (event: ReplicationEvent) => {
        setReplicationLog(prev => [{
          ...event,
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 49)]);
      };

      // Note: You would need to set up WebSocket event listeners here
      // This is a placeholder for the actual WebSocket integration
    }
  }, [isConnected]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getKeyStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-600 bg-green-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'out_of_sync': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'replicating': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Server className="w-6 h-6" />
            Master-Slave Replication
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time demonstration of Redis master-slave replication with failure simulation
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
            <span className="text-sm text-gray-500">WebSocket</span>
          </div>
          
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
          
          <button
            onClick={fetchReplicationData}
            disabled={loading}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Control Panel</h2>
          <div className="flex items-center gap-2">
            {replicationStatus?.masterRunning ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">
                Master Running
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full text-sm">
                Master Stopped
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-4">
          {!replicationStatus?.masterRunning ? (
            <button
              onClick={handleStartMaster}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Master Server
            </button>
          ) : (
            <button
              onClick={handleStopMaster}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              Stop Master Server
            </button>
          )}
          
          {replicationStatus?.masterRunning && (
            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-4">
              <span>Port: {replicationStatus.masterPort}</span>
              <span>Connected Slaves: {replicationStatus.connectedSlaves}</span>
              <span>Total Events: {replicationStatus.totalReplicationEvents}</span>
            </div>
          )}
        </div>
      </div>

      {/* Slave Management Panel */}
      {replicationStatus?.masterRunning && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Slave Management</h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm">
                {slaves.length} Connected
              </span>
            </div>
          </div>

          {/* Add Slaves Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">Add New Slaves</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="slaveCount" className="text-sm text-gray-600 dark:text-gray-300">
                  Count:
                </label>
                <input
                  id="slaveCount"
                  type="number"
                  min="1"
                  max="10"
                  value={slaveCount}
                  onChange={(e) => setSlaveCount(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                />
              </div>
              <button
                onClick={handleAddSlaves}
                disabled={slaveMgmtLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Add {slaveCount} Slave{slaveCount > 1 ? 's' : ''}
              </button>
            </div>
          </div>

          {/* Bulk Actions Section */}
          {slaves.filter(slave => slave.status !== 'process_only').length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Bulk Actions</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleStopAllSlavesWithConfirm}
                  disabled={slaveMgmtLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop All Slaves
                </button>
                <button
                  onClick={handleRemoveAllSlavesWithConfirm}
                  disabled={slaveMgmtLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Remove All Slaves
                </button>
                <button
                  onClick={handleCleanupZombieSlaves}
                  disabled={slaveMgmtLoading}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                  title="Clean up any zombie slave processes that may be running from previous sessions"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Cleanup Zombies
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <strong>Stop All:</strong> Terminates all slave processes but keeps connection history. 
                <strong>Remove All:</strong> Completely removes all slaves and cleans up zombie processes.
              </p>
            </div>
          )}

          {/* Active Slaves List */}
          <div>
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Active Slaves</h3>
            {slaves.filter(slave => slave.status !== 'process_only').length > 0 ? (
              <div className="space-y-2">
                {slaves.filter(slave => slave.status !== 'process_only').map((slave) => (
                  <div key={slave.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(slave.status)}
                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                          {slave.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className={`px-2 py-1 rounded text-xs ${
                          slave.status === 'connected' ? 'bg-green-100 text-green-700' :
                          slave.status === 'disconnected' ? 'bg-red-100 text-red-700' :
                          slave.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {slave.status}
                        </span>
                        {slave.keys !== undefined && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Keys: {typeof slave.keys === 'object' ? Object.keys(slave.keys).length : slave.keys}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {slave.status === 'connected' && (
                        <div>
                          <select
                            onChange={(e) => {
                              const action = e.target.value;
                              if (action === 'disconnect') {
                                handleSimulateFailure(slave.id, false);
                              } else if (action === 'kill') {
                                handleSimulateFailure(slave.id, true);
                              }
                              e.target.value = ''; // Reset selection
                            }}
                            disabled={slaveMgmtLoading}
                            className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 disabled:opacity-50 transition-colors cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Simulate Failure</option>
                            <option value="disconnect">🔌 Disconnect Socket</option>
                            <option value="kill">💀 Kill Process</option>
                          </select>
                        </div>
                      )}
                      <button
                        onClick={() => handleStopSlaveWithConfirm(slave.id)}
                        disabled={slaveMgmtLoading}
                        className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 disabled:opacity-50 transition-colors"
                      >
                        Stop Process
                      </button>
                      <button
                        onClick={() => handleRemoveSlaveWithConfirm(slave.id)}
                        disabled={slaveMgmtLoading}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No slaves running. Start the master server and add some slaves to begin replication.</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="card">
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'keys', label: 'Key Synchronization', icon: Database },
              { id: 'logs', label: 'Replication Logs', icon: Terminal },
              { id: 'testing', label: 'Manual Testing', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Master Status</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {replicationStatus?.masterRunning ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  <Server className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Connected Slaves</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {replicationStatus?.connectedSlaves || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Synced Keys</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {keyComparisons.filter(k => k.status === 'synced').length}
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-purple-500 opacity-50" />
                </div>
              </div>
            </div>

            {/* Master and Slaves Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Master Node */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Master Node
                </h3>
                {masterData ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(masterData.status)}
                        {masterData.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Keys:</span>
                      <span>{Object.keys(masterData.keys || {}).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Connected Slaves:</span>
                      <span>{masterData.connectedSlaves}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Master not running</p>
                )}
              </div>

              {/* Slave Nodes */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Slave Nodes
                </h3>
                {slaves.length > 0 ? (
                  <div className="space-y-3">
                    {slaves.map(slave => (
                      <div key={slave.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(slave.status)}
                          <span className="font-mono text-sm">{slave.id}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            Keys: {Object.keys(slave.keys || {}).length}
                          </span>
                          {slave.status === 'connected' && (
                            <div className="relative">
                              <select
                                onChange={(e) => {
                                  if (e.target.value === 'disconnect') {
                                    handleSimulateFailure(slave.id, false);
                                  } else if (e.target.value === 'kill') {
                                    handleSimulateFailure(slave.id, true);
                                  }
                                  e.target.value = ''; // Reset selection
                                }}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors cursor-pointer"
                                defaultValue=""
                              >
                                <option value="" disabled>Simulate Failure</option>
                                <option value="disconnect">🔌 Disconnect Socket</option>
                                <option value="kill">💀 Kill Process</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No slaves connected</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Key Synchronization Tab */}
        {activeTab === 'keys' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Real-time Key Synchronization</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  Synced
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  Partial
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  Out of Sync
                </div>
              </div>
            </div>

            {keyComparisons.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Key</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Master</th>
                      {slaves.map(slave => (
                        <th key={slave.id} className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">
                          Slave: {slave.id.slice(-8)}
                        </th>
                      ))}
                      <th className="text-left py-2 px-3 font-medium text-gray-900 dark:text-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyComparisons.map(comparison => (
                      <tr key={comparison.key} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-2 px-3 font-mono text-sm">{comparison.key}</td>
                        <td className="py-2 px-3">
                          {comparison.master.exists ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm truncate max-w-20" title={String(comparison.master.value)}>
                                {String(comparison.master.value)}
                              </span>
                            </div>
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-400" />
                          )}
                        </td>
                        {slaves.map(slave => {
                          const slaveData = comparison.slaves[slave.id];
                          return (
                            <td key={slave.id} className="py-2 px-3">
                              {slaveData?.exists ? (
                                <div className="flex items-center gap-1">
                                  {slaveData.synced ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  )}
                                  <span className="text-sm truncate max-w-20" title={String(slaveData.value)}>
                                    {String(slaveData.value)}
                                  </span>
                                </div>
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-400" />
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getKeyStatusColor(comparison.status)}`}>
                            {comparison.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No keys to display. Start the master server and add some test data.
              </div>
            )}
          </div>
        )}

        {/* Replication Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Live Replication Event Log</h3>
            
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {replicationLog.length > 0 ? (
                replicationLog.map(event => (
                  <div key={event.id} className="flex items-start gap-3 py-1">
                    <span className="text-gray-400 text-xs mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-medium ${getEventStatusColor(event.status)}`}>
                      {event.status === 'success' ? '✅' : 
                       event.status === 'replicating' ? '🔄' : 
                       event.status === 'warning' ? '⚠️' : '❌'}
                    </span>
                    <span className="text-white">
                      [{event.command}] {Array.isArray(event.args) ? event.args.join(' ') : String(event.args || '')}
                      {event.affectedSlaves > 0 && (
                        <span className="text-blue-300 ml-2">
                          → {event.affectedSlaves} slave{event.affectedSlaves !== 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-center py-4">
                  No replication events yet. Execute some commands to see live replication.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Testing Tab */}
        {activeTab === 'testing' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900 dark:text-white">Manual Testing Panel</h3>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                💡 <strong>Testing Instructions:</strong> Use this panel to execute commands on the master server. 
                Watch the Key Synchronization tab to see real-time replication to slaves, and check the Replication Logs 
                for detailed event tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Execute Command</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Command
                    </label>
                    <select
                      value={testCommand}
                      onChange={(e) => setTestCommand(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="set">SET</option>
                      <option value="get">GET</option>
                      <option value="delete">DELETE</option>
                      <option value="flushall">FLUSHALL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Key
                    </label>
                    <input
                      type="text"
                      value={testKey}
                      onChange={(e) => setTestKey(e.target.value)}
                      placeholder="Enter key name"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {testCommand === 'set' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Value
                        </label>
                        <input
                          type="text"
                          value={testValue}
                          onChange={(e) => setTestValue(e.target.value)}
                          placeholder="Enter value"
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          TTL (seconds, optional)
                        </label>
                        <input
                          type="number"
                          value={testTTL}
                          onChange={(e) => setTestTTL(e.target.value)}
                          placeholder="Leave empty for no expiry"
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleExecuteCommand}
                    disabled={commandLoading || !replicationStatus?.masterRunning || !testKey.trim()}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {commandLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Execute Command
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">Quick Test Scenarios</h4>
                
                <div className="space-y-2">
                  {[
                    { name: 'Basic String', cmd: 'set', key: 'user:1', value: 'John Doe' },
                    { name: 'Session Data', cmd: 'set', key: 'session:abc123', value: 'active', ttl: '300' },
                    { name: 'Counter', cmd: 'set', key: 'counter:visits', value: '1000' },
                    { name: 'Cached Object', cmd: 'set', key: 'cache:user:1', value: '{"name":"Alice","role":"admin"}' }
                  ].map(scenario => (
                    <button
                      key={scenario.name}
                      onClick={() => {
                        setTestCommand(scenario.cmd);
                        setTestKey(scenario.key);
                        setTestValue(scenario.value);
                        setTestTTL(scenario.ttl || '');
                      }}
                      className="w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{scenario.name}</div>
                      <div className="text-sm text-gray-500 font-mono">
                        {scenario.cmd.toUpperCase()} {scenario.key} "{scenario.value}"
                        {scenario.ttl && ` EX ${scenario.ttl}`}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Tip:</strong> After executing commands, switch to the "Key Synchronization" tab 
                    to see how data is replicated across all slave nodes in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              {confirmDialog.variant === 'danger' ? (
                <XCircle className="w-6 h-6 text-red-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {confirmDialog.title}
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {confirmDialog.message}
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.action}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {confirmDialog.variant === 'danger' ? 'Remove' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MasterSlaveReplication; 