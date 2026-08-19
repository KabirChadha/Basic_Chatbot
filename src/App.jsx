import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import StarterCards from './components/StarterCards';
import SettingsModal from './components/SettingsModal';
import { streamGeminiChat } from './services/gemini';
import { Menu, Sparkles, Sliders } from 'lucide-react';

const STORAGE_KEY_SESSIONS = 'nexus_ai_sessions_v1';
const STORAGE_KEY_SETTINGS = 'nexus_ai_settings_v1';

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  systemInstruction: 'You are NexusAI, a helpful, intelligent, and friendly AI assistant. Answer questions accurately, clearly, and concisely.'
};

export default function App() {
  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Sessions State
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
    return [{ id: Date.now().toString(), title: 'New Chat', messages: [] }];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => sessions[0]?.id || Date.now().toString());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Active Session helper
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Chat Actions
  const handleNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (id) => {
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      const fresh = { id: Date.now().toString(), title: 'New Chat', messages: [] };
      setSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
      }
    }
    showToast('Chat session deleted.');
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isGenerating) return;

    const userMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date().toISOString() };
    
    // Auto-generate title for first message in session
    let updatedTitle = activeSession.title;
    if (messages.length === 0 || activeSession.title === 'New Chat') {
      updatedTitle = text.slice(0, 24) + (text.length > 24 ? '...' : '');
    }

    const updatedMessages = [...messages, userMessage];

    // Update active session with user message
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId
          ? { ...s, title: updatedTitle, messages: updatedMessages }
          : s
      )
    );

    // Placeholder assistant message for streaming
    const assistantMsgId = (Date.now() + 1).toString();
    const placeholderAssistantMsg = { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date().toISOString() };

    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: [...updatedMessages, placeholderAssistantMsg] }
          : s
      )
    );

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    await streamGeminiChat({
      apiKey: settings.apiKey,
      model: settings.model,
      messages: updatedMessages,
      systemInstruction: settings.systemInstruction,
      temperature: settings.temperature,
      signal: abortControllerRef.current.signal,
      onChunk: (chunk, accumulated) => {
        setSessions(prev =>
          prev.map(s => {
            if (s.id !== activeSessionId) return s;
            const msgs = s.messages.map(m =>
              m.id === assistantMsgId ? { ...m, content: accumulated } : m
            );
            return { ...s, messages: msgs };
          })
        );
      },
      onFinish: (fullText) => {
        setIsGenerating(false);
      },
      onError: (errMsg) => {
        setIsGenerating(false);
        showToast(errMsg);
        setSessions(prev =>
          prev.map(s => {
            if (s.id !== activeSessionId) return s;
            const msgs = s.messages.map(m =>
              m.id === assistantMsgId ? { ...m, content: `⚠️ **Error**: ${errMsg}` } : m
            );
            return { ...s, messages: msgs };
          })
        );
      }
    });
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      showToast('Generation stopped.');
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) {
      showToast('No messages to export.');
      return;
    }
    const mdContent = messages.map(m => `### ${m.role === 'user' ? 'User' : 'NexusAI'}\n\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Conversation exported as Markdown.');
  };

  return (
    <div className="app-container">
      <div className="app-bg-mesh" />

      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onExportChat={handleExportChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      <main className="chat-main">
        <header className="chat-header glass-panel">
          <div className="header-title-group">
            <button className="btn-icon mobile-only" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{activeSession?.title || 'Chat'}</h2>
            <div className="model-badge">
              <Sparkles size={12} />
              {settings.apiKey ? settings.model : 'Demo Mode'}
            </div>
          </div>

          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
            <Sliders size={18} />
          </button>
        </header>

        {messages.length === 0 ? (
          <StarterCards onSelectPrompt={handleSendMessage} />
        ) : (
          <div className="messages-container">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={msg.id || idx}
                message={msg}
                isLast={idx === messages.length - 1}
                isGenerating={isGenerating}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isGenerating={isGenerating}
          disabled={false}
        />
      </main>

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(newSettings) => {
            setSettings(newSettings);
            showToast('Settings saved successfully!');
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {toastMessage && (
        <div className="toast">
          <Sparkles size={16} color="var(--accent-cyan)" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
