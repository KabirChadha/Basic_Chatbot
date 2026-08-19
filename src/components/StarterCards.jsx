import React from 'react';
import { Code, Lightbulb, PenTool, Compass } from 'lucide-react';

const STARTER_PROMPTS = [
  {
    icon: <Code size={20} />,
    title: "Code & Debugging",
    desc: "Write a React hook for fetching data with loading & error states",
    prompt: "Write a custom React hook `useFetch(url)` with state management for data, loading, and error handling. Include usage examples."
  },
  {
    icon: <Lightbulb size={20} />,
    title: "Explain Concept",
    desc: "Explain Quantum Computing to a 10-year-old using simple analogies",
    prompt: "Explain the fundamentals of Quantum Computing to a 10-year-old child using fun analogies and everyday examples."
  },
  {
    icon: <PenTool size={20} />,
    title: "Draft & Writing",
    desc: "Craft a professional follow-up email after a job interview",
    prompt: "Draft a polite and effective follow-up email after a software engineer job interview expressing continued interest."
  },
  {
    icon: <Compass size={20} />,
    title: "Brainstorming",
    desc: "Give me 5 unique startup ideas in artificial intelligence & climate tech",
    prompt: "Brainstorm 5 innovative startup product ideas at the intersection of Artificial Intelligence and Climate Technology."
  }
];

export default function StarterCards({ onSelectPrompt }) {
  return (
    <div className="welcome-container">
      <div className="welcome-badge">⚡ Powered by Gemini API</div>
      <h1 className="welcome-title">How can NexusAI assist you today?</h1>
      <p className="welcome-subtitle">
        Your intelligent AI companion for coding, creative writing, complex problem-solving, and instant answers.
      </p>

      <div className="starter-grid">
        {STARTER_PROMPTS.map((item, idx) => (
          <div
            key={idx}
            className="starter-card"
            onClick={() => onSelectPrompt(item.prompt)}
          >
            <div className="starter-card-icon">{item.icon}</div>
            <h3 className="starter-card-title">{item.title}</h3>
            <p className="starter-card-desc">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
