"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Video, User, Square } from 'lucide-react';
import { useGeminiSession, FormStatus } from '@/hooks/useGeminiSession';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { KinetixLogo } from './k-logo';
import { Timer } from './Timer';

import { ActiveSession } from './ActiveSession';
import { IdleScreen } from './IdleScreen';
import { SessionSummary } from './SessionSummary';

const FACING_MODE_USER = "user";
const FACING_MODE_ENVIRONMENT = "environment";

type SessionState = 'idle' | 'active' | 'generating_summary' | 'summary';

const GeneratingSummaryScreen = () => (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-950/80 animate-fade-in">
        <KinetixLogo className="h-12 w-12 text-primary mb-4" />
        <p className="text-xl text-slate-300 tracking-wider">Generating your session summary...</p>
        <p className="text-slate-500">The AI is analyzing your performance.</p>
    </div>
);


export default function Dashboard() {
    const [sessionState, setSessionState] = useState<SessionState>('idle');
    const [frameInterval, setFrameInterval] = useState(4);
    const [facingMode, setFacingMode] = useState(FACING_MODE_USER);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

    const { 
        isConnected, 
        thoughtLogs, 
        error, 
        sendFrame, 
        latestStatus,
        latestSpeechText,
        isProcessing, 
        sessionSummary,
        endSession,
        resetSession,
    } = useGeminiSession();

    useEffect(() => {
        if (sessionSummary && sessionState === 'generating_summary') {
            setSessionState('summary');
        }
    }, [sessionSummary, sessionState]);

    const switchCamera = useCallback(() => {
        setFacingMode(
            (prevState) =>
                prevState === FACING_MODE_USER
                    ? FACING_MODE_ENVIRONMENT
                    : FACING_MODE_USER
        );
    }, []);

    const handleStartSession = () => {
        resetSession();
        setSessionStartTime(Date.now());
        setSessionState('active');
    };

    const handleStopSession = () => {
        setSessionState('generating_summary');
        endSession();
    };

    const handleCloseSummary = () => {
        setSessionState('idle');
        setSessionStartTime(null);
    };

    const isLive = sessionState === 'active' || sessionState === 'generating_summary';

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
            
            <main className="flex-1 relative overflow-hidden flex items-center justify-center">
                {sessionState === 'idle' && <IdleScreen onStart={handleStartSession} />}
                {sessionState === 'active' && 
                    <ActiveSession 
                        frameInterval={frameInterval}
                        facingMode={facingMode}
                        isConnected={isConnected}
                        thoughtLogs={thoughtLogs}
                        error={error}
                        sendFrame={sendFrame}
                        latestStatus={latestStatus}
                        latestSpeechText={latestSpeechText}
                        isProcessing={isProcessing}
                    />
                }
                {sessionState === 'generating_summary' && <GeneratingSummaryScreen />}
                {sessionState === 'summary' && sessionSummary && <SessionSummary summary={sessionSummary} onClose={handleCloseSummary} />}
            </main>

            <footer className="absolute bottom-0 left-0 right-0 z-30 flex items-center p-4 text-xs text-slate-400 shrink-0">
                 {sessionState === 'active' ? (
                    <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-4 text-lg font-mono bg-black/30 px-4 py-2 rounded-lg">
                           <span className="text-red-500 animate-pulse">&#9679;</span>
                           <Timer startTime={sessionStartTime || Date.now()} />
                        </div>
                         <Button
                            onClick={handleStopSession}
                            size="lg"
                            variant="destructive"
                            className="font-bold text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-red-glow transition-all duration-300 disabled:opacity-70"
                            disabled={sessionState === 'generating_summary' || isProcessing}
                        >
                            <Square className="mr-3" />
                            {sessionState === 'generating_summary' ? 'GENERATING...' : 'END SESSION'}
                        </Button>
                        <div className="flex items-center gap-2">
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="bg-black/30 hover:bg-black/60"><Settings className="text-slate-300" /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 mb-2">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Analysis Frequency</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Set how often to analyze your form (in seconds). Higher is less intensive.
                                            </p>
                                        </div>
                                        <Slider
                                            id="frame-interval"
                                            defaultValue={[frameInterval]}
                                            max={10}
                                            min={1}
                                            step={1}
                                            onValueChange={(value) => setFrameInterval(value[0])}
                                            disabled={sessionState === 'active'}
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Fast (1s)</span>
                                            <span>Slow (10s)</span>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Button variant="ghost" size="icon" onClick={switchCamera} className="bg-black/30 hover:bg-black/60"><Video className="text-slate-300" /></Button>
                        </div>
                    </div>
                ) : (sessionState === 'idle' || sessionState === 'summary') ? (
                     <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <KinetixLogo className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-4">
                            <Button variant="link" className="text-slate-400 hover:text-primary p-0 h-auto">Help Center</Button>
                            <Button variant="link" className="text-slate-400 hover:text-primary p-0 h-auto">Privacy Policy</Button>
                        </div>
                     </div>
                ) : null}
            </footer>
        </div>
    );
}

    