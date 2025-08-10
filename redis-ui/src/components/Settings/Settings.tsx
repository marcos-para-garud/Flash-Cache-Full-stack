import React, { useState } from 'react';
import { 
  Save, 
  RefreshCw, 
  Moon, 
  Sun, 
  Database, 
  Server, 
  Shield, 
  Bell,
  Monitor,
  Key,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAppStore } from '../../store';

interface RedisConfig {
  maxMemory: string;
  maxMemoryPolicy: string;
  timeout: number;
  databases: number;
  port: number;
  host: string;
  requireAuth: boolean;
  password: string;
}

const Settings: React.FC = () => {
  const { theme, setTheme } = useAppStore();
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  const [activeTab, setActiveTab] = useState<'redis' | 'app' | 'security' | 'monitoring'>('redis');
  const [redisConfig, setRedisConfig] = useState<RedisConfig>({
    maxMemory: '2gb',
    maxMemoryPolicy: 'allkeys-lru',
    timeout: 300,
    databases: 16,
    port: 6379,
    host: '127.0.0.1',
    requireAuth: false,
    password: ''
  });

  const [appSettings, setAppSettings] = useState({
    autoRefresh: true,
    refreshInterval: 5000,
    enableNotifications: true,
    enableKeyboardShortcuts: true,
    defaultView: 'keys',
    maxKeysDisplay: 100
  });

  const memoryPolicies = [
    'noeviction',
    'allkeys-lru',
    'volatile-lru',
    'allkeys-random',
    'volatile-random',
    'volatile-ttl',
    'allkeys-lfu',
    'volatile-lfu'
  ];

  const tabs = [
    { id: 'redis', label: 'Redis Config', icon: Database },
    { id: 'app', label: 'Application', icon: Monitor },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'monitoring', label: 'Monitoring', icon: Bell }
  ];

  const handleSaveRedisConfig = () => {
    // In a real app, this would save to backend
    console.log('Saving Redis config:', redisConfig);
    // Show success notification
  };

  const handleSaveAppSettings = () => {
    // In a real app, this would save to local storage or backend
    console.log('Saving app settings:', appSettings);
    // Show success notification
  };

  const renderRedisConfig = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Host
            </label>
            <input
              type="text"
              value={redisConfig.host}
              onChange={(e) => setRedisConfig({ ...redisConfig, host: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Port
            </label>
            <input
              type="number"
              value={redisConfig.port}
              onChange={(e) => setRedisConfig({ ...redisConfig, port: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timeout (seconds)
            </label>
            <input
              type="number"
              value={redisConfig.timeout}
              onChange={(e) => setRedisConfig({ ...redisConfig, timeout: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Databases
            </label>
            <input
              type="number"
              value={redisConfig.databases}
              onChange={(e) => setRedisConfig({ ...redisConfig, databases: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Memory
            </label>
            <input
              type="text"
              value={redisConfig.maxMemory}
              onChange={(e) => setRedisConfig({ ...redisConfig, maxMemory: e.target.value })}
              placeholder="e.g., 2gb, 1024mb"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Memory Policy
            </label>
            <select
              value={redisConfig.maxMemoryPolicy}
              onChange={(e) => setRedisConfig({ ...redisConfig, maxMemoryPolicy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {memoryPolicies.map(policy => (
                <option key={policy} value={policy}>{policy}</option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Require Authentication
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable password protection
                </p>
              </div>
              <button
                onClick={() => setRedisConfig({ ...redisConfig, requireAuth: !redisConfig.requireAuth })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  redisConfig.requireAuth ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    redisConfig.requireAuth ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {redisConfig.requireAuth && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={redisConfig.password}
                  onChange={(e) => setRedisConfig({ ...redisConfig, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSaveRedisConfig} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
        <button className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );

  const renderAppSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Theme
            </h4>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-blue-500" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-500" />
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Current theme setting
                </div>
              </div>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default View
            </label>
            <select
              value={appSettings.defaultView}
              onChange={(e) => setAppSettings({ ...appSettings, defaultView: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="keys">Key Explorer</option>
              <option value="monitoring">Monitoring</option>
              <option value="ttl">TTL Playground</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Keys to Display
            </label>
            <input
              type="number"
              value={appSettings.maxKeysDisplay}
              onChange={(e) => setAppSettings({ ...appSettings, maxKeysDisplay: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Auto Refresh
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Enable auto refresh</span>
                <button
                  onClick={() => setAppSettings({ ...appSettings, autoRefresh: !appSettings.autoRefresh })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    appSettings.autoRefresh ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      appSettings.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {appSettings.autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Refresh Interval (ms)
                  </label>
                  <input
                    type="number"
                    value={appSettings.refreshInterval}
                    onChange={(e) => setAppSettings({ ...appSettings, refreshInterval: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable notifications</span>
              <button
                onClick={() => setAppSettings({ ...appSettings, enableNotifications: !appSettings.enableNotifications })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  appSettings.enableNotifications ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    appSettings.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Keyboard shortcuts</span>
              <button
                onClick={() => setAppSettings({ ...appSettings, enableKeyboardShortcuts: !appSettings.enableKeyboardShortcuts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  appSettings.enableKeyboardShortcuts ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    appSettings.enableKeyboardShortcuts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSaveAppSettings} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
        <button className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Security Notice
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              These are demo settings. In production, ensure proper authentication and encryption.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Authentication
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <span className="text-green-600 dark:text-green-400">Enabled</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Method:</span>
              <span className="text-gray-900 dark:text-gray-100">Password</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
              <span className="text-gray-900 dark:text-gray-100">2 min ago</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security Features
          </h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">TLS Encryption:</span>
              <span className="text-gray-900 dark:text-gray-100">Disabled</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Protected Mode:</span>
              <span className="text-green-600 dark:text-green-400">Enabled</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Command Renaming:</span>
              <span className="text-gray-900 dark:text-gray-100">Disabled</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonitoringSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Data Retention
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                Keep metrics for
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">
                <option value="1h">1 Hour</option>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">High memory usage</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">80%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Connection failures</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Enabled</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Slow queries</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">100ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
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
        {activeTab === 'redis' && renderRedisConfig()}
        {activeTab === 'app' && renderAppSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
        {activeTab === 'monitoring' && renderMonitoringSettings()}
      </div>
    </div>
  );
};

export default Settings; 