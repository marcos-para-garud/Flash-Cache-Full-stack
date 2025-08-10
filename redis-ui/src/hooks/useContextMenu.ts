import { useState, useEffect, useCallback } from 'react';
import { ContextMenuAction } from '../types';

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  actions: ContextMenuAction[];
}

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    actions: [],
  });

  const showContextMenu = useCallback((event: React.MouseEvent, actions: ContextMenuAction[]) => {
    event.preventDefault();
    event.stopPropagation();

    const { clientX, clientY } = event;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const menuWidth = 200; // Approximate menu width
    const menuHeight = actions.length * 32; // Approximate height per item

    // Adjust position to keep menu within viewport
    const x = clientX + menuWidth > windowWidth ? clientX - menuWidth : clientX;
    const y = clientY + menuHeight > windowHeight ? clientY - menuHeight : clientY;

    setContextMenu({
      isOpen: true,
      position: { x, y },
      actions,
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Handle clicks outside context menu
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.isOpen) {
        hideContextMenu();
      }
    };

    const handleScroll = () => {
      if (contextMenu.isOpen) {
        hideContextMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && contextMenu.isOpen) {
        hideContextMenu();
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener('click', handleClick);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [contextMenu.isOpen, hideContextMenu]);

  const executeAction = useCallback((action: ContextMenuAction) => {
    if (!action.disabled) {
      action.action();
    }
    hideContextMenu();
  }, [hideContextMenu]);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
    executeAction,
  };
}; 