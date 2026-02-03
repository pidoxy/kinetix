'use client';

import React, { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { SkeletonOverlay } from '@/components/skeleton-overlay';
import { BrainSidebar } from '@/components/BrainSidebar';
import { ThoughtLog, FormStatus } from '@/hooks/useGeminiSession';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';
import { CoachBadge } from './CoachBadge';
import { SpeechTextOverlay } from './SpeechTextOverlay';

const FACING_MODE_USER = "user";

interface ActiveSessionProps {
    frameInterval: number;
    facingMode: string;
    isConnected: boolean;
    thoughtLogs: ThoughtLog[];
    error: string | null;
    sendFrame: (frame: string) => void;
    latestStatus: FormStatus;
    latestSpeechText: string | null;
    isProcessing: boolean;
}

export const ActiveSession = ({
    frameInterval,
    facingMode,
    isConnected,
    thoughtLogs,
    error,
    sendFrame,
    latestStatus,
    latestSpeechText,
    isProcessing,
}: ActiveSessionProps) => {
    const webcamRef = useRef<Webcam>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isConnected && !isProcessing) {
            interval = setInterval(() => {
                const imageSrc = webcamRef.current?.getScreenshot();
                if (imageSrc) {
                    const base64Image = imageSrc.split(',')[1];
                    sendFrame(base64Image);
                }
            }, frameInterval * 1000);
        }
        return () => {
            if(interval) clearInterval(interval);
        }
    }, [isConnected, isProcessing, sendFrame, frameInterval]);

    const glowClasses: Record<FormStatus, string> = {
        idle: '',
        good: 'shadow-green-glow',
        bad: 'shadow-red-glow',
        yellow: 'shadow-yellow-glow',
        waiting: 'shadow-gray-glow'
    };

    return (
        <div className={cn("flex h-full w-full relative transition-shadow duration-500 rounded-lg", glowClasses[latestStatus])}>
            <div className="relative flex-1 w-full h-full overflow-hidden">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    mirrored={facingMode === FACING_MODE_USER}
                    videoConstraints={{ facingMode, width: 1920, height: 1080 }}
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <SkeletonOverlay status={latestStatus} />

                {/* Overlays */}
                <div className="absolute inset-0 pointer-events-none">
                    <CoachBadge isConnected={isConnected} isProcessing={isProcessing} />
                    <StatusBadge status={latestStatus} />
                    <SpeechTextOverlay text={latestSpeechText} status={latestStatus} />
                </div>
            </div>
            <BrainSidebar logs={thoughtLogs} error={error} latestSpeechText={latestSpeechText} />
        </div>
    );
}