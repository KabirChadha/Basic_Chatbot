import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, Download, X, Sparkles } from 'lucide-react';

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onExportChat,
  onOpenSettings,
  isOpen,
  onCloseMobile
}) {
  return (
    <aside className={`sidebar glass-panel ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-group">
          <div className="logo-icon">
            <Sparkles size={20} />
          </div>
          <span className="logo-text">NexusAI</span>
        </div>
        <button className="btn-icon mobile-only" onClick={onCloseMobile} style={{ display: isOpen ? 'block' : 'none' }}>
          <X size={20} />
        </button>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        <Plus size={18} />
        <span>New Chat</span>
      </button>

      <div className="chat-history-list">
        {sessions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No chat history yet.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`history-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <MessageSquare size={16} />
                <span className="history-title">{session.title || 'Untitled Chat'}</span>
              </div>

              {session.id === activeSessionId && (
                <button
                  className="btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  title="Delete Chat"
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onExportChat}>
          <Download size={16} />
          <span>Export Conversation</span>
        </button>

        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onOpenSettings}>
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
