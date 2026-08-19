import React, { useState } from 'react';
import { Bot, User, Copy, Check, Volume2, Sparkles } from 'lucide-react';
import { marked } from 'marked';
import hljs from 'highlight.js';

// Custom renderer for code blocks with language headers and copy buttons
const renderer = new marked.Renderer();
renderer.code = (code, language) => {
  const validLang = hljs.getLanguage(language) ? language : 'plaintext';
  const highlighted = hljs.highlight(code, { language: validLang }).value;
  const escapedCode = encodeURIComponent(code);

  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span>${validLang}</span>
        <button onclick="navigator.clipboard.writeText(decodeURIComponent('${escapedCode}'))">
          📋 Copy Code
        </button>
      </div>
      <pre><code class="hljs ${validLang}">${highlighted}</code></pre>
    </div>
  `;
};

marked.setOptions({ renderer, breaks: true });

export default function ChatMessage({ message, isLast, isGenerating }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(message.content.replace(/[#*`_]/g, ''));
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const renderContent = () => {
    if (isUser) {
      return <div>{message.content}</div>;
    }
    const html = marked.parse(message.content || '');
    return <div class="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className={`chat-msg ${isUser ? 'user' : 'assistant'}`}>
      <div className={`avatar ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? <User size={18} /> : <Bot size={20} />}
      </div>

      <div className="msg-bubble-container">
        <div className="msg-bubble">
          {renderContent()}

          {!isUser && isGenerating && isLast && (
            <div className="typing-dots">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          )}
        </div>

        <div className="msg-actions">
          <button className="btn-icon" onClick={handleCopyText} title="Copy message">
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          </button>
          {!isUser && (
            <button className="btn-icon" onClick={handleReadAloud} title={speaking ? "Stop reading" : "Read aloud"}>
              <Volume2 size={14} color={speaking ? "#ec4899" : "currentColor"} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
