
import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, size = 'md' }) => {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${height}`}>
      <div 
        className="bg-pink-500 rounded-full" 
        style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: '100%' }}
      ></div>
    </div>
  );
};
