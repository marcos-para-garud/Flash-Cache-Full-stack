import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Save, 
  Download, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  HardDrive,
  Activity,
  Info
} from 'lucide-react';
import { apiService } from '../../services/api';
import { useAppStore } from '../../store';

interface RDBFile {
  node: string;
  filePath: string;
  size: number;
  sizeFormatted: string;
  lastModified: Date;
  keyCount: number;
  corrupted: boolean;
  exists: boolean;
}

interface PersistenceStatus {
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  lastSaveTime: Date | null;
  rdbFiles: RDBFile[];
  totalKeys: number;
}

const RDBPersistence: React.FC = () => {
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus | null>(null);
  const [rdbInfo, setRDBInfo] = useState<RDBFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useAppStore();

  const fetchPersistenceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusResponse, infoResponse] = await Promise.all([
        apiService.getPersistenceStatus(),
        apiService.getRDBInfo()
      ]);

      if (statusResponse.success && statusResponse.data) {
        setPersistenceStatus(statusResponse.data);
      }

      if (infoResponse.success && infoResponse.data) {
        setRDBInfo(infoResponse.data);
      }

      if (!statusResponse.success || !infoResponse.success) {
        setError(statusResponse.error || infoResponse.error || 'Failed to fetch persistence data');
      }
    } catch (error) {
      console.error('Error fetching persistence data:', error);
      setError('Failed to fetch persistence data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSave = async () => {
    try {
      setSaving(true);
      const response = await apiService.saveToDisk();
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'RDB Save Successful',
          message: response.data.message || 'Data saved to disk successfully'
        });
        
        // Refresh the data after save
        await fetchPersistenceData();
      } else {
        addNotification({
          type: 'error',
          title: 'RDB Save Failed',
          message: response.error || 'Failed to save data to disk'
        });
      }
    } catch (error) {
      console.error('Error saving to disk:', error);
      addNotification({
        type: 'error',
        title: 'RDB Save Error',
        message: 'An error occurred while saving to disk'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadFromDisk = async () => {
    try {
      setLoadingData(true);
      const response = await apiService.loadFromDisk();
      
      if (response.success) {
        addNotification({
          type: 'success',
          title: 'RDB Load Successful',
          message: response.data.message || 'Data loaded from disk successfully'
        });
        
        // Refresh the data after load
        await fetchPersistenceData();
      } else {
        addNotification({
          type: 'error',
          title: 'RDB Load Failed',
          message: response.error || 'Failed to load data from disk'
        });
      }
    } catch (error) {
      console.error('Error loading from disk:', error);
      addNotification({
        type: 'error',
        title: 'RDB Load Error',
        message: 'An error occurred while loading from disk'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const formatLastSaveTime = (lastSaveTime: Date | null): string => {
    if (!lastSaveTime) return 'Never';
    const now = new Date();
    const diffInMs = now.getTime() - new Date(lastSaveTime).getTime();
    const diffInSeconds = Math.floor(diffInMs / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else {
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    }
  };

  const formatAutoSaveInterval = (intervalMs: number): string => {
    const seconds = intervalMs / 1000;
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else {
      return `${Math.floor(seconds / 60)} minutes`;
    }
  };

  useEffect(() => {
    fetchPersistenceData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchPersistenceData, 30000);
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
            onClick={fetchPersistenceData}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">RDB Persistence</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage Redis data persistence and RDB snapshots
          </p>
        </div>
        <button
          onClick={fetchPersistenceData}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Persistence Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Auto-Save Status</p>
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {persistenceStatus?.autoSaveEnabled ? 'Enabled' : 'Disabled'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Every {persistenceStatus ? formatAutoSaveInterval(persistenceStatus.autoSaveInterval) : 'N/A'}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Keys</p>
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">
                {persistenceStatus?.totalKeys?.toLocaleString() || 0}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Across all nodes
              </p>
            </div>
            <Database className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Save</p>
              <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {formatLastSaveTime(persistenceStatus?.lastSaveTime || null)}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Automatic save
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="card bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">RDB Files</p>
              <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {rdbInfo.filter(file => file.exists).length} / {rdbInfo.length}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Files available
              </p>
            </div>
            <HardDrive className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Manual Operations */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Save className="w-5 h-5" />
          Manual Operations
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleManualSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save to Disk'}
          </button>
          
          <button
            onClick={handleLoadFromDisk}
            disabled={loadingData}
            className="btn-secondary flex items-center gap-2"
          >
            {loadingData ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {loadingData ? 'Loading...' : 'Load from Disk'}
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Manual Operations:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Save to Disk:</strong> Immediately saves current data to RDB files</li>
                <li>• <strong>Load from Disk:</strong> Loads data from existing RDB files (overwrites current data)</li>
                <li>• Auto-save runs every {persistenceStatus ? formatAutoSaveInterval(persistenceStatus.autoSaveInterval) : 'N/A'} automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* RDB Files Information */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          RDB Files Information
        </h2>
        
        <div className="space-y-4">
          {rdbInfo.map((file) => (
            <div
              key={file.node}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    file.exists ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {file.node}
                  </h3>
                  {file.corrupted && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-xs rounded">
                      Corrupted
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {file.exists ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
              
              {file.exists ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">File Size</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.sizeFormatted}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Keys Stored</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {file.keyCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Last Modified</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(file.lastModified).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No RDB file exists for this node
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                <strong>Path:</strong> {file.filePath}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RDBPersistence; 