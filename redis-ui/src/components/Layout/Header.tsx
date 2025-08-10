import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useConnectionStatus } from '../../store';
import { 
  Menu, 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  RotateCcw,
  Bell
} from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { 
    toggleSidebar, 
    theme, 
    setTheme, 
    notifications 
  } = useAppStore();
  const connectionStatus = useConnectionStatus();

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          Redis UI
        </h1>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          {connectionStatus.connected ? (
            <>
              <Wifi size={16} className="text-green-500" />
              <span className="text-sm text-green-600 dark:text-green-400">Live Connected</span>
            </>
          ) : connectionStatus.reconnecting ? (
            <>
              <RotateCcw size={16} className="text-yellow-500 animate-spin" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">Reconnecting...</span>
            </>
          ) : connectionStatus.error?.includes('HTTP API only') ? (
            <>
              <Wifi size={16} className="text-blue-500" />
              <span className="text-sm text-blue-600 dark:text-blue-400">API Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Disconnected</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {/* TODO: Add notifications modal */}}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
          >
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun size={20} className="text-yellow-500" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header; 