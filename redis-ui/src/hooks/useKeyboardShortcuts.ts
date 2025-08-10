import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { toggleSidebar, clearSelection, setTheme, theme } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if any input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           activeElement?.getAttribute('contenteditable') === 'true';

      // Don't handle shortcuts when input is focused
      if (isInputFocused) return;

      const { ctrlKey, metaKey, shiftKey, altKey, key } = event;
      const isCmd = ctrlKey || metaKey;

      // Global shortcuts
      if (isCmd && !shiftKey && !altKey) {
        switch (key) {
          case '1':
            event.preventDefault();
            navigate('/keys');
            break;
          case '2':
            event.preventDefault();
            navigate('/cluster');
            break;
          case '3':
            event.preventDefault();
            navigate('/monitoring');
            break;
          case '4':
            event.preventDefault();
            navigate('/ttl');
            break;
          case '5':
            event.preventDefault();
            navigate('/lru');
            break;
          case 'b':
            event.preventDefault();
            toggleSidebar();
            break;
          case 'k':
            event.preventDefault();
            // Focus search input
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
          case 'a':
            event.preventDefault();
            // Select all visible keys
            // This would need to be implemented based on current view
            break;
        }
      }

      // Shift + shortcuts
      if (shiftKey && !ctrlKey && !metaKey && !altKey) {
        switch (key) {
          case '?':
            event.preventDefault();
            // Show help modal
            break;
          case 'D':
            event.preventDefault();
            setTheme(theme === 'dark' ? 'light' : 'dark');
            break;
        }
      }

      // Escape key
      if (key === 'Escape') {
        event.preventDefault();
        clearSelection();
        // Close any open modals
        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
          const closeButton = modal.querySelector('[data-dismiss="modal"]') as HTMLElement;
          if (closeButton) {
            closeButton.click();
          }
        });
      }

      // Delete key
      if (key === 'Delete' || key === 'Backspace') {
        const selectedKeys = useAppStore.getState().selectedKeys;
        if (selectedKeys.size > 0) {
          event.preventDefault();
          // Show delete confirmation
          console.log('Delete selected keys:', Array.from(selectedKeys));
        }
      }

      // F5 or Cmd+R for refresh
      if (key === 'F5' || (isCmd && key === 'r')) {
        event.preventDefault();
        // Refresh current view data
        console.log('Refresh data');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggleSidebar, clearSelection, setTheme, theme]);

  return {
    shortcuts: [
      { key: 'Cmd+1', description: 'Go to Keys', global: true },
      { key: 'Cmd+2', description: 'Go to Cluster', global: true },
      { key: 'Cmd+3', description: 'Go to Monitoring', global: true },
      { key: 'Cmd+4', description: 'Go to TTL Playground', global: true },
      { key: 'Cmd+5', description: 'Go to LRU Demo', global: true },
      { key: 'Cmd+B', description: 'Toggle Sidebar', global: true },
      { key: 'Cmd+K', description: 'Focus Search', global: true },
      { key: 'Cmd+A', description: 'Select All', global: true },
      { key: 'Shift+?', description: 'Show Help', global: true },
      { key: 'Shift+D', description: 'Toggle Dark Mode', global: true },
      { key: 'Escape', description: 'Clear Selection/Close Modals', global: true },
      { key: 'Delete', description: 'Delete Selected Keys', global: true },
      { key: 'F5', description: 'Refresh Data', global: true },
    ],
  };
}; 