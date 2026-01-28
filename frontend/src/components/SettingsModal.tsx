import React from 'react';
import { X, Info, Check } from 'lucide-react';
import './SettingsModal.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    interval: number;
    onIntervalChange: (value: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, interval, onIntervalChange }) => {

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="settings-modal glass-panel">
                <div className="modal-header">
                    <div className="modal-title-group">
                        <span className="icon">⎚</span>
                        <div>
                            <h2>API & Performance</h2>
                            <p className="subtext">Configure AI processing intensity and limits.</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    <p className="description">
                        Optimize your session by adjusting how frequently the AI analyzes your movement.
                        This setting balances real-time accuracy with data usage.
                    </p>

                    <div className="control-group">
                        <div className="slider-label">
                            <span>FRAME ANALYSIS INTERVAL</span>
                            <span className="highlight-value">{interval} <span className="unit">seconds</span></span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            step="0.5"
                            value={interval}
                            onChange={(e) => onIntervalChange(parseFloat(e.target.value))}
                            className="styled-slider"
                        />
                        <div className="slider-labels">
                            <span>1s (High)</span>
                            <span>5s</span>
                            <span>10s (Eco)</span>
                        </div>
                    </div>

                    <div className="info-box">
                        <Info size={16} className="info-icon" />
                        <div>
                            <strong>Performance Impact</strong>
                            <p>Lower intervals provide smoother feedback but increase API usage. Higher intervals save data bandwidth and battery life.</p>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="save-btn" onClick={onClose}>
                        <Check size={16} />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
