import React, { useState } from 'react';
import { X, Key, Sliders, Cpu, FileText, Check } from 'lucide-react';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [model, setModel] = useState(settings.model || 'gemini-1.5-flash');
  const [temperature, setTemperature] = useState(settings.temperature ?? 0.7);
  const [systemInstruction, setSystemInstruction] = useState(settings.systemInstruction || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      apiKey,
      model,
      temperature: parseFloat(temperature),
      systemInstruction
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="var(--accent-purple)" />
            <h2 className="modal-title">Settings & Preferences</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={16} /> Gemini API Key
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your Gemini API key (e.g. AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Leave empty to use <strong>Demo Mode</strong>. Get a key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-purple)' }}>Google AI Studio</a>.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={16} /> AI Model Selection
              </label>
              <select className="form-select" value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Fast & Versatile)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Complex Reasoning)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                <option value="gemini-pro">Gemini 1.0 Pro</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Temperature: <strong>{temperature}</strong>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                style={{ accentColor: 'var(--accent-purple)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Precise (0.0)</span>
                <span>Balanced (0.7)</span>
                <span>Creative (1.0)</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> System Instructions (Personality & Constraints)
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Instruct how the chatbot should behave..."
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
