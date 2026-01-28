import React from 'react';
import { Settings, Video, User } from 'lucide-react';
import './Header.css';

interface HeaderProps {
    status?: 'IDLE' | 'LIVE';
    elapsedTime?: string;
    onSettingsClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ status = 'IDLE', elapsedTime, onSettingsClick }) => {
    return (
        <header className="app-header">
            <div className="status-container">
                {status === 'IDLE' ? (
                    <div className="status-pill idle">
                        <span className="dot"></span>
                        SYSTEM IDLE
                    </div>
                ) : (
                    <div className="live-status-group">
                        <div className="status-pill live">
                            <span className="dot"></span>
                            LIVE
                        </div>
                        {elapsedTime && (
                            <div className="status-pill time">
                                <span className="icon">⏱</span>
                                {elapsedTime}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="header-controls">
                <button className="icon-btn" onClick={onSettingsClick} aria-label="Settings">
                    <Settings size={20} />
                </button>
                <button className="icon-btn" aria-label="Video Settings">
                    <Video size={20} />
                </button>
                <button className="profile-btn" aria-label="Profile">
                    <User size={20} />
                </button>
            </div>
        </header>
    );
};

export default Header;
