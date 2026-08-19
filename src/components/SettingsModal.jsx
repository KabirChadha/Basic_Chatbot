import React, { useState } from 'react';
import { X, Sliders, Cpu, Server, FileText, Check, ShieldCheck } from 'lucide-react';

export default function SettingsModal({ settings, onSave, onClose }) {
  const [provider, setProvider] = useState(settings.provider || 'browser-local');
  const [ollamaUrl, setOllamaUrl] = useState(settings.ollamaUrl || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(settings.ollamaModel || 'llama3');
  const [temperature, setTemperature] = useState(settings.temperature ?? 0.7);
  const [systemInstruction, setSystemInstruction] = useState(settings.systemInstruction || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      provider,
      ollamaUrl,
      ollamaModel,
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
            <h2 className="modal-title">Local AI Settings</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>
                <ShieldCheck size={18} /> 100% Local & Offline Mode Active
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                No API keys or cloud services required. All processing runs locally on your machine.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={16} /> Local AI Engine Provider
              </label>
              <select className="form-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="browser-local">Built-In Browser Engine (Zero Setup, Instant)</option>
                <option value="ollama">Ollama Local Server (http://localhost:11434)</option>
              </select>
            </div>

            {provider === 'ollama' && (
              <>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Server size={16} /> Ollama Server URL
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="http://localhost:11434"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Ollama Model Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. llama3, mistral, gemma, phi3"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                  />
                </div>
              </>
            )}

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
                rows={3}
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
              <Check size={16} /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
