import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Video, StopCircle, Settings as SettingsIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';
import { useSettings } from '../App';
import './LiveSessionPage.css';

interface LogEntry {
    time: string;
    text: string;
    type: 'info' | 'active' | 'success' | 'warning' | 'error';
}

const LiveSessionPage: React.FC = () => {
    const navigate = useNavigate();
    const { openSettings, interval: frameInterval } = useSettings();
    const [elapsed, setElapsed] = useState("00:00:00");
    const [isGoodForm, setIsGoodForm] = useState<boolean | null>(null); // null = unknown
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Media & Socket Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingAudioRef = useRef(false);

    // Initial Setup
    useEffect(() => {
        addLog("Initializing Kinetix AI System...", 'info');
        startCamera();
        connectWebSocket();

        // Timer
        const timer = setInterval(() => {
            setElapsed(prev => {
                const parts = prev.split(':').map(Number);
                let [h, m, s] = parts;
                s++;
                if (s >= 60) { s = 0; m++; }
                if (m >= 60) { m = 0; h++; }
                return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            stopSession();
        };
    }, []);

    // Frame Sender Loop
    useEffect(() => {
        if (!frameInterval) return;

        const sender = setInterval(() => {
            sendFrame();
        }, frameInterval * 1000);

        return () => clearInterval(sender);
    }, [frameInterval]);

    const addLog = (text: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLogs(prev => [...prev.slice(-10), { time, text, type }]); // Keep last 10
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: "user" }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Explicitly play to avoid autoplay policy issues or state lag
                await videoRef.current.play();
            }
            streamRef.current = stream;
            addLog("Camera feed active.", 'info');
        } catch (err: any) {
            console.error(err);
            addLog(`Error accessing camera: ${err.message || err}`, 'error');
        }
    };

    const connectWebSocket = () => {
        const ws = new WebSocket('ws://localhost:8080/ws/session');

        ws.onopen = () => {
            addLog("Connected to AI Backend.", 'success');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                handleServerMessage(message);
            } catch (e) {
                console.error("Parse error", e);
            }
        };

        ws.onerror = (e) => {
            console.error("WS Error", e);
            addLog("Connection invalid. Is backend running?", 'error');
        };

        ws.onclose = () => {
            addLog("Connection closed.", 'warning');
        };

        wsRef.current = ws;
    };

    const handleServerMessage = (message: any) => {
        switch (message.type) {
            case 'THOUGHT':
                addLog(`> ${message.data}`, 'active');
                break;
            case 'STATUS':
                setIsGoodForm(message.data === 'GREEN');
                break;
            case 'SPEECH':
                queueAudio(message.data);
                break;
            case 'ERROR':
                addLog(message.data, 'error');
                break;
        }
    };

    const sendFrame = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!videoRef.current || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Draw video frame to canvas
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);

        // Convert to base64 (jpeg for speed). 
        // Note: Canvas.toDataURL returns "data:image/jpeg;base64,..."
        // Backend expects just the base64 string, so we split it.
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
        const base64 = dataUrl.split(',')[1];

        wsRef.current.send(JSON.stringify({
            type: "VIDEO_FRAME",
            data: base64
        }));
    };

    const queueAudio = (base64Audio: string) => {
        audioQueueRef.current.push(base64Audio);
        playNextAudio();
    };

    const playNextAudio = async () => {
        if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return;

        isPlayingAudioRef.current = true;
        const nextAudio = audioQueueRef.current.shift();

        if (nextAudio) {
            try {
                const audio = new Audio(`data:audio/mp3;base64,${nextAudio}`);
                await audio.play();
                audio.onended = () => {
                    isPlayingAudioRef.current = false;
                    playNextAudio();
                };
            } catch (e) {
                console.error("Audio play error", e);
                isPlayingAudioRef.current = false;
                // Try next
                playNextAudio();
            }
        }
    };

    const stopSession = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (wsRef.current) {
            wsRef.current.close();
        }
    };

    const handleEndSession = () => {
        stopSession();
        navigate('/');
    };

    return (
        <div className="live-session-page">
            <Header status="LIVE" elapsedTime={elapsed} onSettingsClick={openSettings} />

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="video-layer">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                />
            </div>
            <div className="video-grid-overlay"></div>

            {/* STATUS INDICATOR */}
            {isGoodForm !== null && (
                <div className={`form-alert ${isGoodForm ? '' : 'bad'}`}>
                    {isGoodForm ? (
                        <span className="flex-center" style={{ gap: '8px' }}><CheckCircle size={20} /> GOOD FORM</span>
                    ) : (
                        <span className="flex-center" style={{ gap: '8px' }}><AlertTriangle size={20} /> CORRECTION NEEDED</span>
                    )}
                </div>
            )}

            <div className="ui-layer">
                {/* LEFT: METRICS (Still Mocked as Backend doesn't provide these yet) */}
                <div className="metrics-column">
                    <div className="metric-card glass-panel" style={{ borderLeft: '4px solid var(--color-alert-red)' }}>
                        <div className="metric-label">Spine Curvature</div>
                        <div className="metric-value-group">
                            <span className="metric-value">15</span>
                            <span className="metric-unit">deg</span>
                        </div>
                        <div className="metric-status text-red">CRITICAL</div>
                        <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: '80%', background: 'var(--color-alert-red)' }}></div></div>
                    </div>

                    <div className="metric-card glass-panel" style={{ borderLeft: '4px solid var(--color-primary-cyan)' }}>
                        <div className="metric-label">Knee Angle</div>
                        <div className="metric-value-group">
                            <span className="metric-value">110</span>
                            <span className="metric-unit">deg</span>
                        </div>
                        <div className="metric-status text-cyan">OPTIMAL</div>
                        <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: '60%', background: 'var(--color-primary-cyan)' }}></div></div>
                    </div>

                    <div className="metric-card glass-panel">
                        <div className="metric-label">Repetitions</div>
                        <div className="metric-value-group">
                            <span className="metric-value">4</span>
                            <span className="metric-unit">/ 12</span>
                        </div>
                    </div>
                </div>

                {/* CENTER: SKELETON (Visual overlay, could be driven by backend coords later) */}
                <div className="center-stage">
                    <svg viewBox="0 0 200 400" style={{ height: '70%', opacity: 0.8 }}>
                        {/* Static SVG for now */}
                        <circle cx="100" cy="40" r="15" stroke="#00F0FF" strokeWidth="2" fill="transparent" />
                        <line x1="100" y1="55" x2="100" y2="150" stroke="#00F0FF" strokeWidth="2" />
                        <line x1="60" y1="70" x2="140" y2="70" stroke="#00F0FF" strokeWidth="2" />
                        <line x1="60" y1="70" x2="40" y2="120" stroke="#00F0FF" strokeWidth="2" />
                        <line x1="140" y1="70" x2="160" y2="120" stroke="#00F0FF" strokeWidth="2" />
                        <line x1="100" y1="150" x2="70" y2="250" stroke="#00F0FF" strokeWidth="2" />
                        <line x1="100" y1="150" x2="130" y2="250" stroke="#00F0FF" strokeWidth="2" />
                        {/* Joints */}
                        <circle cx="100" cy="55" r="4" fill="#00F0FF" />
                        <circle cx="60" cy="70" r="4" fill="#00F0FF" />
                        <circle cx="140" cy="70" r="4" fill="#00F0FF" />
                    </svg>
                </div>

                {/* RIGHT: LOG */}
                <div className="log-column">
                    <div className="agent-log glass-panel">
                        <div className="log-header">
                            <span>// AGENT LOG</span>
                            <div className="dot" style={{ background: 'var(--color-primary-cyan)' }}></div>
                        </div>
                        <div className="log-content">
                            {logs.map((entry, idx) => (
                                <div key={idx} className={`log-line ${entry.type}`}>
                                    <span className="timestamp">[{entry.time}]</span>
                                    <span>{entry.text}</span>
                                </div>
                            ))}
                            <div className="log-line active">
                                <span className="timestamp">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                <span className="blinking-cursor">_</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="controls-container">
                <button className="control-btn"><Mic size={20} /></button>
                <button className="control-btn active"><Video size={20} /></button>
                <button className="end-session-btn" onClick={handleEndSession}>
                    <StopCircle size={20} />
                    End Session
                </button>
                <button className="control-btn" onClick={openSettings}><SettingsIcon size={20} /></button>
            </div>
        </div>
    );
};

export default LiveSessionPage;
