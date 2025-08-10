import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { 
  Key, 
  Network, 
  BarChart3, 
  Timer, 
  Layers, 
  ChevronRight,
  Radio,
  Terminal,
  Database,
  Cpu,
  MessageSquare,
  Server
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { sidebarOpen } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'keys', label: 'Key Explorer', icon: Key, path: '/keys' },
    { id: 'cluster', label: 'Cluster View', icon: Network, path: '/cluster' },
    { id: 'monitoring', label: 'Monitoring', icon: BarChart3, path: '/monitoring' },
    { id: 'ttl', label: 'TTL Playground', icon: Timer, path: '/ttl' },
    { id: 'lru', label: 'LRU Demo', icon: Layers, path: '/lru' },
    { id: 'pubsub', label: 'Pub/Sub Viewer', icon: Radio, path: '/pubsub' },
    { id: 'replication', label: 'Master-Slave Replication', icon: Server, path: '/replication' },
    { id: 'cli', label: 'CLI Console', icon: Terminal, path: '/cli' },
    { id: 'persistence', label: 'RDB Persistence', icon: Database, path: '/persistence' },
    { id: 'processes', label: 'Process Monitor', icon: Cpu, path: '/processes' },
  ];

  // Determine current view from URL
  const getCurrentView = () => {
    const path = location.pathname;
    if (path === '/') return 'keys';
    return path.substring(1); // Remove leading slash
  };

  const currentView = getCurrentView();

  return (
    <div className={`fixed left-0 top-16 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-10 ${
      sidebarOpen ? 'w-64' : 'w-16'
    }`}>
      <nav className="mt-8">
        <div className="space-y-2 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary-500 text-white' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={20} className={`${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {isActive && (
                      <ChevronRight size={16} className="text-white" />
                    )}
                  </>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-16 ml-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar; 