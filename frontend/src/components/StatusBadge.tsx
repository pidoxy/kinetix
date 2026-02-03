'use client';

import { cn } from '@/lib/utils';
import { FormStatus } from '@/hooks/useGeminiSession';

interface StatusBadgeProps {
  status: FormStatus;
}

const statusConfig: Record<FormStatus, { text: string; className: string }> = {
  idle: { text: 'STARTING...', className: 'bg-slate-600/80 text-white' },
  good: { text: 'GOOD FORM', className: 'bg-green-500/90 text-white' },
  yellow: { text: 'ALMOST THERE', className: 'bg-yellow-500/90 text-white' },
  bad: { text: 'CORRECTION NEEDED', className: 'bg-red-500/90 text-white animate-pulse' },
  waiting: { text: 'ADJUSTING...', className: 'bg-sky-600/90 text-white' },
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (status === 'idle') return null;

  const config = statusConfig[status];

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
      <div
        className={cn(
          "flex items-center justify-center min-w-[200px] h-12 rounded-full border-2 border-white/20 shadow-2xl transition-all duration-300",
          "backdrop-blur-sm px-6",
          config.className
        )}
      >
        <span className="font-bold text-lg tracking-wider">{config.text}</span>
      </div>
    </div>
  );
};

    