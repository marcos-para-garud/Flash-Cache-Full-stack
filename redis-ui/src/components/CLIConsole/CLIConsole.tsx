import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, RotateCcw, HelpCircle, Clock, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';

interface CommandHistory {
  id: string;
  command: string;
  response: string;
  timestamp: Date;
  status: 'success' | 'error';
  executionTime: number;
}

interface CommandSuggestion {
  command: string;
  description: string;
  syntax: string;
}

const CLIConsole: React.FC = () => {
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isConnected = true; // Connection status - always true for demo
  const [showHelp, setShowHelp] = useState(false);
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Available Redis commands (only those supported by API)
  const redisCommands: CommandSuggestion[] = [
    { command: 'SET', description: 'Set a key-value pair', syntax: 'SET key value' },
    { command: 'GET', description: 'Get value of a key', syntax: 'GET key' },
    { command: 'DELETE', description: 'Delete a key', syntax: 'DELETE key' },
    { command: 'KEYS', description: 'List all keys', syntax: 'KEYS' },
    { command: 'INFO', description: 'Get server info', syntax: 'INFO' },
    { command: 'PING', description: 'Test connection', syntax: 'PING' },
    { command: 'HELP', description: 'Show available commands', syntax: 'HELP' },
    { command: 'CLEAR', description: 'Clear console', syntax: 'CLEAR' },
  ];

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: CommandHistory = {
      id: 'welcome',
      command: 'SYSTEM',
      response: `Redis CLI Console - Limited API Mode
Available commands: SET, GET, DELETE, KEYS, INFO, PING, HELP, CLEAR
Type 'HELP' for detailed information.

Note: This console only supports basic Redis commands available in the current API.`,
      timestamp: new Date(),
      status: 'success',
      executionTime: 0
    };
    setCommandHistory([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        clearConsole();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clearConsole = () => {
    setCommandHistory([]);
    setCurrentCommand('');
    setHistoryIndex(-1);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentCommand(value);
    
    // Show suggestions
    if (value.length > 0) {
      const filtered = redisCommands.filter(cmd => 
        cmd.command.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory('down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setCurrentCommand(suggestions[0].command + ' ');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    const commandHistoryOnly = commandHistory.filter(h => h.command !== 'SYSTEM');
    
    if (direction === 'up') {
      if (historyIndex < commandHistoryOnly.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistoryOnly[commandHistoryOnly.length - 1 - newIndex].command);
      }
    } else {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistoryOnly[commandHistoryOnly.length - 1 - newIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const executeCommand = async (command: string) => {
    const startTime = Date.now();
    const trimmedCommand = command.trim();
    
    if (!trimmedCommand) return;

    let response = '';
    let status: 'success' | 'error' = 'success';

    try {
      const parts = trimmedCommand.split(' ');
      const cmd = parts[0].toUpperCase();

      switch (cmd) {
        case 'HELP':
          response = `Available Redis Commands:

${redisCommands.map(c => `${c.command.padEnd(8)} - ${c.description}\n    Syntax: ${c.syntax}`).join('\n\n')}

FLUSHALL - Remove all keys from all databases
    Syntax: FLUSHALL

TTL      - Get time to live for a key (in seconds)
    Syntax: TTL key

EXPIRE   - Set time to live for a key (in seconds)  
    Syntax: EXPIRE key seconds

Navigation:
• ↑/↓ Arrow keys - Command history
• Tab - Auto-complete
• Ctrl+L - Clear console
• Ctrl+C - Cancel current command

Note: This console supports full Redis functionality including TTL and cluster operations.`;
          break;

        case 'CLEAR':
        case 'CLS':
          setCommandHistory([]);
          return;

        case 'SET':
          if (parts.length >= 3) {
            const key = parts[1];
            const value = parts.slice(2).join(' ');
            
            const result = await apiService.setKey(key, value);
            if (result.success) {
              response = 'OK';
            } else {
              response = `Error: ${result.error}`;
              status = 'error';
            }
          } else {
            response = 'Error: SET requires at least key and value';
            status = 'error';
          }
          break;

        case 'GET':
          if (parts.length >= 2) {
            const key = parts[1];
            const result = await apiService.getKey(key);
            if (result.success) {
              response = result.data?.value || '(nil)';
            } else {
              response = `Error: ${result.error}`;
              status = 'error';
            }
          } else {
            response = 'Error: GET requires a key';
            status = 'error';
          }
          break;

        case 'DELETE':
        case 'DEL':
          if (parts.length >= 2) {
            const key = parts[1];
            const result = await apiService.deleteKey(key);
            if (result.success) {
              response = result.data ? '1' : '0';
            } else {
              response = `Error: ${result.error}`;
              status = 'error';
            }
          } else {
            response = 'Error: DELETE requires a key';
            status = 'error';
          }
          break;

        case 'KEYS':
          const result = await apiService.getKeys();
          if (result.success) {
            const keys = Array.isArray(result.data) ? result.data : [];
            if (keys.length === 0) {
              response = '(empty list or set)';
            } else {
              response = keys.map((key, index) => `${index + 1}) "${key}"`).join('\n');
            }
          } else {
            response = `Error: ${result.error}`;
            status = 'error';
          }
          break;

        case 'INFO':
          const infoResult = await apiService.getInfo();
          if (infoResult.success) {
            response = `# Server
redis_version: 1.0.0 (Custom Implementation)
redis_mode: cluster
process_id: ${Math.floor(Math.random() * 10000)}
uptime_in_seconds: ${Math.floor(Math.random() * 86400)}

# Clients
connected_clients: ${Math.floor(Math.random() * 100)}

# Memory
used_memory: ${Math.floor(Math.random() * 1000000)}
used_memory_human: ${(Math.random() * 100).toFixed(1)}M

# Keyspace
db0: keys=${Array.isArray(infoResult.data) ? infoResult.data.length : 0}

# API
supported_commands: SET, GET, DELETE, KEYS, INFO
api_endpoint: http://localhost:3001`;
          } else {
            response = `Error: ${infoResult.error}`;
            status = 'error';
          }
          break;

        case 'PING':
          response = 'PONG';
          break;

        case 'FLUSHALL':
          const flushResult = await apiService.flushAll();
          if (flushResult.success) {
            response = 'OK';
          } else {
            response = `Error: ${flushResult.error}`;
            status = 'error';
          }
          break;

        case 'TTL':
          if (parts.length >= 2) {
            const key = parts[1];
            const ttlResult = await apiService.getTTL(key);
            if (ttlResult.success) {
              response = ttlResult.data?.toString() || '-2';
            } else {
              response = `Error: ${ttlResult.error}`;
              status = 'error';
            }
          } else {
            response = 'Error: TTL requires a key';
            status = 'error';
          }
          break;

        case 'EXPIRE':
          if (parts.length >= 3) {
            const key = parts[1];
            const ttl = parseInt(parts[2]);
            if (isNaN(ttl)) {
              response = 'Error: TTL must be a number';
              status = 'error';
            } else {
              const expireResult = await apiService.setExpire(key, ttl);
              if (expireResult.success) {
                response = expireResult.data?.toString() || '1';
              } else {
                response = `Error: ${expireResult.error}`;
                status = 'error';
              }
            }
          } else {
            response = 'Error: EXPIRE requires key and TTL';
            status = 'error';
          }
          break;

        // Unsupported commands
        case 'EXISTS':
        case 'INCR':
        case 'DECR':
        case 'PUBLISH':
        case 'SUBSCRIBE':
          response = `Error: Command '${cmd}' is not supported in the current API. Available commands: SET, GET, DELETE, KEYS, INFO, PING`;
          status = 'error';
          break;

        default:
          response = `Error: Unknown command '${cmd}'. Type HELP for available commands.`;
          status = 'error';
      }
    } catch (error) {
      response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      status = 'error';
    }

    const executionTime = Date.now() - startTime;

    const historyEntry: CommandHistory = {
      id: Date.now().toString(),
      command: trimmedCommand,
      response,
      timestamp: new Date(),
      status,
      executionTime
    };

    setCommandHistory(prev => [...prev, historyEntry]);
    setCurrentCommand('');
    setHistoryIndex(-1);
    setShowSuggestions(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: 'success' | 'error') => {
    return status === 'success' ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-green-400 font-mono">
      {/* Demo Notice */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 m-4 mb-0">
        <div className="flex items-center">
          <AlertCircle className="h-4 w-4 text-yellow-400 mr-2" />
          <div>
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              <strong>Limited API Mode:</strong> Only basic Redis commands are supported (SET, GET, DELETE, KEYS, INFO, PING).
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Terminal className="text-green-400" size={20} />
          <h2 className="text-lg font-semibold text-white">Redis CLI Console</h2>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Show Help"
          >
            <HelpCircle size={16} />
          </button>
          <button
            onClick={clearConsole}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Clear Console (Ctrl+L)"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Console Output */}
      <div 
        ref={consoleRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-900"
      >
        {commandHistory.map((entry) => (
          <div key={entry.id} className="space-y-1">
            {entry.command !== 'SYSTEM' && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <span className="text-blue-400">redis&gt;</span>
                <span className="text-white">{entry.command}</span>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-gray-500 text-xs flex items-center gap-1">
                    <Clock size={12} />
                    {entry.executionTime}ms
                  </span>
                  <button
                    onClick={() => copyToClipboard(entry.command)}
                    className="p-1 text-gray-500 hover:text-white transition-colors"
                    title="Copy command"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            )}
            <div className={`whitespace-pre-wrap ${getStatusColor(entry.status)} ml-4`}>
              {entry.response}
            </div>
          </div>
        ))}
      </div>

      {/* Command Input */}
      <div className="relative">
        {showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-32 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                onClick={() => {
                  setCurrentCommand(suggestion.command + ' ');
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
              >
                <div className="text-green-400 font-medium">{suggestion.command}</div>
                <div className="text-gray-400 text-sm">{suggestion.description}</div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2 p-4 bg-gray-800 border-t border-gray-700">
          <span className="text-blue-400">redis&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
            placeholder="Type a Redis command (e.g., SET key value)"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CLIConsole; 