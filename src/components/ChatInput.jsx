import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square, Trash2 } from 'lucide-react';

export default function ChatInput({ onSendMessage, onStopGeneration, isGenerating, disabled }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!text.trim() || disabled || isGenerating) return;
    onSendMessage(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Speech Recognition (Voice Input)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setText(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div className="input-container-wrapper">
      <form className="input-box" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Ask NexusAI anything... (Shift+Enter for new line)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
        />

        <div className="input-controls">
          {text.trim() && (
            <button
              type="button"
              className="btn-icon"
              onClick={() => setText('')}
              title="Clear input"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            type="button"
            className={`btn-icon mic-btn ${isListening ? 'active' : ''}`}
            onClick={toggleSpeechRecognition}
            title={isListening ? "Listening... Click to stop" : "Voice input"}
          >
            <Mic size={18} />
          </button>

          {isGenerating ? (
            <button
              type="button"
              className="send-btn"
              onClick={onStopGeneration}
              title="Stop generating"
              style={{ background: '#ef4444' }}
            >
              <Square size={16} fill="white" />
            </button>
          ) : (
            <button
              type="submit"
              className="send-btn"
              disabled={!text.trim() || disabled}
              title="Send message"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
