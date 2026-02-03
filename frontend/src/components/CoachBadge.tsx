'use client';

import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Wifi, WifiOff, Loader } from 'lucide-react';

interface CoachBadgeProps {
  isConnected: boolean;
  isProcessing: boolean;
}

export const CoachBadge = ({ isConnected, isProcessing }: CoachBadgeProps) => {
  let text = 'LIVE';
  let className = 'bg-red-500/80 text-white';
  let Icon = Wifi;

  if (!isConnected) {
    text = 'OFFLINE';
    className = 'bg-slate-500/80 text-white';
    Icon = WifiOff;
  } else if (isProcessing) {
    text = 'ANALYZING';
    className = 'bg-cyan-500/80 text-white';
    Icon = Loader;
  }
  
  return (
    <div className="absolute top-6 left-6 z-20">
      <Badge
        className={cn(
          'text-md transition-all duration-300 border-0 shadow-lg',
          className
        )}
      >
        <Icon className={cn('mr-2 h-4 w-4', isProcessing && 'animate-spin')} />
        {text}
      </Badge>
    </div>
  );
};

    