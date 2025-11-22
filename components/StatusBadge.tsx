
import React from 'react';
import { Icon } from './Icon';

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: StatusType;
  text: string;
  icon?: string; // Optional icon name override
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  text, 
  icon, 
  className = '',
  showIcon = true
}) => {
  
  const getStyle = (type: StatusType) => {
    switch (type) {
      case 'success': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800';
      case 'error': return 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800';
      case 'warning': return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800';
      case 'info': return 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800';
      case 'neutral': 
      default: return 'text-slate-500 bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-800';
    }
  };

  const getDefaultIcon = (type: StatusType) => {
    switch (type) {
      case 'success': return 'CheckCircle2';
      case 'error': return 'AlertCircle';
      case 'warning': return 'AlertTriangle'; // or Clock for pending
      case 'info': return 'Loader2';
      case 'neutral': return 'HelpCircle';
    }
  };

  const iconName = icon || getDefaultIcon(status);

  return (
    <div className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 justify-center ${getStyle(status)} ${className}`}>
      {showIcon && <Icon name={iconName} size={12} className={status === 'info' ? 'animate-spin' : ''} />}
      <span className="hidden md:inline whitespace-nowrap">{text}</span>
    </div>
  );
};
