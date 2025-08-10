import React from 'react';
import { useAppStore } from '../../store';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationPanel from './NotificationPanel';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { sidebarOpen, theme } = useAppStore();
  useKeyboardShortcuts();

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${theme}`}>
      <Header />
      <div className="flex">
        <Sidebar />
        <main 
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-16'
          }`}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
      <NotificationPanel />
    </div>
  );
};

export default Layout; 