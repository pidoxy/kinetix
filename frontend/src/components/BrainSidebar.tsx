'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, ChevronLeft, SlidersHorizontal, BookOpen, BrainCircuit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ThoughtLog } from '@/hooks/useGeminiSession';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

type BrainSidebarProps = {
    logs: ThoughtLog[],
    error: string | null,
    latestSpeechText: string | null
};

type ViewMode = 'simple' | 'pro';

export const BrainSidebar = ({ logs, error, latestSpeechText }: BrainSidebarProps) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('simple');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isCollapsed]);

    const renderSimpleMode = () => (
        <div className="flex-grow flex items-center justify-center p-4">
            <p className="text-2xl font-semibold text-center text-slate-300 italic">
                {latestSpeechText || "Waiting for coach's instruction..."}
            </p>
        </div>
    );

    const renderProMode = () => (
        <div ref={scrollRef} className="font-mono text-xs text-green-400 flex-grow overflow-y-auto space-y-2 pr-2">
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {logs.map((log) => (
                <p key={log.timestamp} className="animate-fade-in break-words whitespace-pre-wrap opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-cyan-400/50 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    {`> ${log.text}`}
                </p>
            ))}
        </div>
    );

    if (isCollapsed) {
        return (
            <div className="absolute top-1/2 right-0 -translate-y-1/2 z-30">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(false)}
                    className="bg-black/50 hover:bg-black/80 text-white rounded-r-none rounded-l-lg h-24 w-10"
                >
                    <BrainCircuit className="h-6 w-6" />
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full md:w-1/3 max-w-md h-full bg-black/80 backdrop-blur-sm p-4 flex flex-col z-20 animate-fade-in">
            <div className="flex items-center gap-2 mb-4 shrink-0">
                <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setIsCollapsed(true)}>
                    <ChevronLeft />
                </Button>
                <Bot className="text-cyan-400" />
                <h2 className="text-lg font-bold text-cyan-400 tracking-wider">The Brain</h2>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-4 bg-slate-900/50 p-1 rounded-md">
                <Button 
                    size="sm" 
                    variant={viewMode === 'simple' ? 'secondary' : 'ghost'} 
                    className="flex-1" 
                    onClick={() => setViewMode('simple')}
                >
                    <BookOpen className="mr-2 h-4 w-4"/> Coach View
                </Button>
                <Button 
                    size="sm" 
                    variant={viewMode === 'pro' ? 'secondary' : 'ghost'} 
                    className="flex-1"
                    onClick={() => setViewMode('pro')}
                >
                   <SlidersHorizontal className="mr-2 h-4 w-4"/> Pro View
                </Button>
            </div>

            <Separator className="mb-4 bg-white/10" />

            {viewMode === 'simple' ? renderSimpleMode() : renderProMode()}
        </div>
    );
};

    