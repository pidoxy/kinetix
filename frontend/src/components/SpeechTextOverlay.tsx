'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FormStatus } from '@/hooks/useGeminiSession';

interface SpeechTextOverlayProps {
  text: string | null;
  status: FormStatus;
}

export const SpeechTextOverlay = ({ text, status }: SpeechTextOverlayProps) => {
  const [visibleText, setVisibleText] = useState<string | null>(null);

  useEffect(() => {
    // When a new text prop comes in, set it to be visible
    if (text) {
      setVisibleText(text);
      // Set a timer to hide it after 6 seconds
      const timer = setTimeout(() => {
        setVisibleText(null);
      }, 6000);
      return () => clearTimeout(timer);
    } else {
        // If the text prop becomes null, hide immediately
        setVisibleText(null);
    }
  }, [text]); // Effect runs every time the `text` prop changes

  const statusClasses: Record<FormStatus, string> = {
    idle: 'bg-black/30',
    good: 'bg-green-600/80',
    bad: 'bg-red-600/80',
    yellow: 'bg-yellow-600/80',
    waiting: 'bg-slate-600/80',
  };

  const isVisible = !!visibleText;

  return (
    <div
      className={cn(
        "absolute bottom-24 left-1/2 -translate-x-1/2 w-auto max-w-3xl transition-opacity duration-300 pointer-events-none",
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {isVisible && (
        <div
          className={cn(
            "text-2xl font-bold text-white text-center px-6 py-3 rounded-lg shadow-2xl backdrop-blur-md animate-fade-in",
            statusClasses[status]
          )}
        >
          {visibleText}
        </div>
      )}
    </div>
  );
};

    