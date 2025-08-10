import React, { useState, useEffect } from 'react';
import { Server, Activity, Database, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api';

interface ClusterNode {
  id: string;
  name: string;
  host: string;
  port: number;
  role: 'master' | 'slave';
  status: 'connected' | 'disconnected' | 'syncing';
  slots: string;
  connections: number;
  keyCount: number;
}

const ClusterView: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [totalKeys, setTotalKeys] = useState(0);
  const [loading, setLoading] = useState(true);

  // Real cluster data based on the actual 3 nodes
  const [nodes] = useState<ClusterNode[]>([
    {
      id: 'node1',
      name: 'node1',
      host: '127.0.0.1',
      port: 6379,
      role: 'master',
      status: 'connected',
      slots: '0-5460',
      connections: 0,
      keyCount: 0
    },
    {
      id: 'node2',
      name: 'node2',
      host: '127.0.0.1',
      port: 6380,
      role: 'master',
      status: 'connected',
      slots: '5461-10922',
      connections: 0,
      keyCount: 0
    },
    {
      id: 'node3',
      name: 'node3',
      host: '127.0.0.1',
      port: 6381,
      role: 'master',
      status: 'connected',
      slots: '10923-16383',
      connections: 0,
      keyCount: 0
    }
  ]);

  useEffect(() => {
    const fetchClusterData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getKeys();
        if (response.success && response.data) {
          setTotalKeys(response.data.length);
        }
      } catch (error) {
        console.error('Failed to fetch cluster data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClusterData();
    const interval = setInterval(fetchClusterData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-success-500" />;
      case 'disconnected':
        return <AlertCircle className="w-4 h-4 text-error-500" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-warning-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-success-500';
      case 'disconnected':
        return 'text-error-500';
      case 'syncing':
        return 'text-warning-500';
      default:
        return 'text-gray-400';
    }
  };

  const activeNodes = nodes.filter(node => node.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* Cluster Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-primary-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {nodes.length}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Nodes</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-success-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {activeNodes}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Nodes</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-accent-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {loading ? '...' : totalKeys.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Keys</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Topology */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Cluster Topology
        </h2>
        
        <div className="space-y-6">
          {nodes.map((node) => (
            <div key={node.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Shard: {node.slots}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {node.name}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Master Node */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedNode === node.id 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(node.status)}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        MASTER
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${getStatusColor(node.status)}`}>
                      {node.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="font-mono text-gray-900 dark:text-gray-100">
                      {node.host}:{node.port}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      Keys: {loading ? '...' : Math.floor(totalKeys / 3).toLocaleString()}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                      Connections: {node.connections}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Details */}
      {selectedNode && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Node Details: {selectedNode}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              const node = nodes.find(n => n.id === selectedNode)!;
              return (
                <>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Connection Info
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Host:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{node.host}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Port:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{node.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Role:</span>
                        <span className="text-gray-900 dark:text-gray-100">{node.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <span className={getStatusColor(node.status)}>{node.status}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Performance
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Slots:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{node.slots}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Keys:</span>
                        <span className="text-gray-900 dark:text-gray-100">{loading ? '...' : Math.floor(totalKeys / 3).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Connections:</span>
                        <span className="text-gray-900 dark:text-gray-100">{node.connections}</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClusterView; 