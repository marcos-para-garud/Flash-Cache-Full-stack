import React from 'react';
import { TTLEntry } from '../../types';
import { Trash2, RotateCcw, Clock, AlertTriangle } from 'lucide-react';

interface TTLKeyCardProps {
  entry: TTLEntry;
  onDelete: (key: string) => void;
  onReset: (key: string) => void;
}

const TTLKeyCard: React.FC<TTLKeyCardProps> = ({ entry, onDelete, onReset }) => {
  const progressPercentage = (entry.progress / 100) * 100;
  const isExpiringSoon = entry.remainingTime <= 5;
  const isExpired = entry.remainingTime <= 0;

  const getProgressColor = () => {
    if (isExpired) return 'bg-red-500';
    if (isExpiringSoon) return 'bg-yellow-500';
    if (progressPercentage > 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getCardStyle = () => {
    if (isExpired) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (isExpiringSoon) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-gray-200 dark:border-gray-700';
  };

  return (
    <div className={`card ${getCardStyle()} transition-all duration-300`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {entry.key}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {entry.value}
          </p>
        </div>
        <div className="flex items-center space-x-1 ml-2">
          {isExpiringSoon && (
            <AlertTriangle className="text-yellow-500" size={16} />
          )}
          <button
            onClick={() => onReset(entry.key)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Reset TTL"
          >
            <RotateCcw size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(entry.key)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Delete Key"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            TTL: {entry.ttl}s
          </span>
          <span className={`font-medium ${
            isExpired 
              ? 'text-red-600 dark:text-red-400' 
              : isExpiringSoon 
                ? 'text-yellow-600 dark:text-yellow-400' 
                : 'text-green-600 dark:text-green-400'
          }`}>
            {isExpired ? 'EXPIRED' : `${entry.remainingTime.toFixed(1)}s`}
          </span>
        </div>

        <div className="ttl-bar">
          <div 
            className={`ttl-progress ${getProgressColor()}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Clock size={12} />
            <span>Started: {entry.startTime.toLocaleTimeString()}</span>
          </div>
          <span>{progressPercentage.toFixed(1)}% elapsed</span>
        </div>
      </div>
    </div>
  );
};

export default TTLKeyCard; 