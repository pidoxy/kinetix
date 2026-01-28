import React from 'react';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './LandingPage.css';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const handleStartSession = () => {
        navigate('/live');
    };

    return (
        <div className="landing-page">
            <Header status="IDLE" />

            <div className="camera-feed-placeholder">
                {/* Implied camera feed background */}
                <div className="calibration-grid-overlay"></div>
            </div>

            <div className="modal-overlay">
                <div className="ready-modal glass-panel">
                    <div className="logo-section">
                        <span className="logo-icon">programmatic_icon</span>
                        <span className="logo-text">KINETIX AI</span>
                    </div>

                    <h1>Ready for your session?</h1>
                    <p className="instruction-text">
                        Ensure your full body is visible in the frame and the lighting is clear.
                    </p>

                    <button className="start-btn" onClick={handleStartSession}>
                        <Play fill="currentColor" size={16} />
                        START SESSION
                    </button>
                </div>
            </div>

            <div className="footer-stats">
                <div className="stat-item">
                    <span className="icon">###</span>
                    <span>Calibration: Automatic</span>
                </div>
                <div className="stat-item">
                    <span className="icon">@</span>
                    <span>Latency: 12ms</span>
                </div>
            </div>

            <div className="footer-links">
                <a href="#">Help Center</a>
                <a href="#">Privacy Policy</a>
            </div>
        </div>
    );
};

export default LandingPage;
