'use client';

import { useState, useEffect } from 'react';

const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const Timer = ({ startTime }: { startTime: number }) => {
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedTime(Date.now() - startTime);
        }, 1000);

        return () => clearInterval(interval);
    }, [startTime]);

    return <span>{formatTime(elapsedTime)}</span>;
};

    