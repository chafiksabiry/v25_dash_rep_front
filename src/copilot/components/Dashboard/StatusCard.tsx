import React, { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface StatusCardProps {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  status?: 'success' | 'warning' | 'danger' | 'info';
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  disabled?: boolean;
  disabledTitle?: string;
}

const statusColors = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-rose-500',
  info: 'text-blue-400',
};

const StatusCard: React.FC<StatusCardProps> = ({
  icon, title, value, subtitle, status, expandable, expanded, onToggle, children, disabled, disabledTitle = "Coming Soon"
}) => (
  <div className={`relative glass-card rounded-2xl shadow-sm py-5 px-4 w-full h-full flex flex-col justify-between transition-all duration-300 hover:border-harx-200 ${disabled ? 'opacity-50 grayscale-[0.5]' : 'hover:shadow-md'}`}>
    {disabled && (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-2">
        <div className="absolute inset-0 bg-white/5 rounded-2xl backdrop-blur-[1px]" />
        <span className="relative z-20 bg-white/90 text-harx-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-harx-200 uppercase tracking-widest shadow-sm">
          {disabledTitle}
        </span>
      </div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 text-gray-400">
        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-[18px] border border-gray-100 transition-all group-hover:bg-harx-50 group-hover:border-harx-100 group-hover:text-harx-500">
          {icon}
        </div>
        <span className="font-black text-[10px] uppercase tracking-[0.2em]">{title}</span>
      </div>
      {expandable && !disabled && (
        <button className="text-gray-400" onClick={onToggle}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}
    </div>
    <div className={`text-[22px] font-black mt-3 leading-none tracking-tight ${status ? statusColors[status] : 'text-gray-900'}`}>{value}</div>
    {subtitle && (
      <div className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">{subtitle}</div>
    )}
    {children && expanded && !disabled && (
      <div className="mt-2 text-xs text-gray-500">{children}</div>
    )}
  </div>
);

export default StatusCard; 
