/**
 * Gemini API Client Service
 * Fully compatible with Google Gemini API (v1 & v1beta REST endpoints)
 * Handles multi-turn chat, streaming, non-streaming fallback, and model auto-discovery.
 */

const DEFAULT_SYSTEM_INSTRUCTION = `You are NexusAI, a helpful, intelligent, and friendly AI assistant.
Answer questions accurately, clearly, and concisely. When writing code or technical details, use clean formatting and markdown code blocks.`;

/**
 * List of standard Gemini models to try in order of preference.
 */
const SUPPORTED_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro'
];

/**
 * Format conversation history into Google Gemini API contents array.
 */
function buildGeminiPayload(messages, systemInstruction, temperature) {
  const contents = [];

  // If system instruction exists, add it as first context message or systemInstruction field
  messages.forEach((msg, idx) => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      let textContent = msg.content || '';
      
      // Inject system instruction into first user message for max compatibility
      if (idx === 0 && msg.role === 'user' && systemInstruction && systemInstruction.trim()) {
        textContent = `[System Context: ${systemInstruction.trim()}]\n\n${textContent}`;
      }

      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: textContent }]
      });
    }
  });

  return {
    contents,
    generationConfig: {
      temperature: parseFloat(temperature) || 0.7,
      maxOutputTokens: 2048
    }
  };
}

/**
 * Main streaming chat function with multi-model and multi-endpoint resilience.
 */
export async function streamGeminiChat({
  apiKey,
  model = 'gemini-2.0-flash',
  messages = [],
  systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
  temperature = 0.7,
  onChunk,
  onFinish,
  onError,
  signal
}) {
  // Demo / Fallback Mode if no API Key provided
  if (!apiKey || apiKey.trim() === '') {
    return simulateDemoStream(messages, onChunk, onFinish, signal);
  }

  const cleanKey = apiKey.trim();

  // Create list of models to attempt (requested model first, followed by fallbacks)
  const modelsToTry = [model, ...SUPPORTED_MODELS].filter(
    (item, index, self) => self.indexOf(item) === index
  );

  let lastErrorMsg = '';

  for (const currentModel of modelsToTry) {
    if (signal?.aborted) return;

    console.log(`Attempting Gemini API request with model: ${currentModel}...`);
    const payload = buildGeminiPayload(messages, systemInstruction, temperature);

    // 1. Try Streaming SSE Endpoint on v1beta
    try {
      const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:streamGenerateContent?alt=sse&key=${cleanKey}`;
      const response = await fetch(streamEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });

      if (response.ok) {
        const fullText = await handleSSEResponse(response, onChunk);
        if (onFinish) onFinish(fullText);
        return fullText;
      }

      const errData = await response.json().catch(() => ({}));
      lastErrorMsg = errData.error?.message || `HTTP ${response.status}`;
      console.warn(`Streaming on ${currentModel} failed: ${lastErrorMsg}`);
    } catch (e) {
      if (e.name === 'AbortError') return;
      lastErrorMsg = e.message;
    }

    // 2. Try Standard generateContent Endpoint on v1beta
    try {
      const standardEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${cleanKey}`;
      const response = await fetch(standardEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });

      if (response.ok) {
        const data = await response.json();
        const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (onChunk) onChunk(fullText, fullText);
        if (onFinish) onFinish(fullText);
        return fullText;
      }

      const errData = await response.json().catch(() => ({}));
      lastErrorMsg = errData.error?.message || `HTTP ${response.status}`;
      console.warn(`Standard generateContent on ${currentModel} failed: ${lastErrorMsg}`);
    } catch (e) {
      if (e.name === 'AbortError') return;
      lastErrorMsg = e.message;
    }

    // 3. Try v1 Endpoint
    try {
      const v1Endpoint = `https://generativelanguage.googleapis.com/v1/models/${currentModel}:generateContent?key=${cleanKey}`;
      const response = await fetch(v1Endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });

      if (response.ok) {
        const data = await response.json();
        const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (onChunk) onChunk(fullText, fullText);
        if (onFinish) onFinish(fullText);
        return fullText;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  // If all models and endpoints failed, report detailed user friendly error
  const userFriendlyError = lastErrorMsg.includes('API key not valid')
    ? 'Invalid Gemini API Key. Please check your key in Settings.'
    : `Gemini API Error: ${lastErrorMsg}. Please verify your API Key and network connection in Settings.`;

  console.error('All Gemini API endpoints failed:', lastErrorMsg);
  if (onError) onError(userFriendlyError);
}

/**
 * Handle Server-Sent Events (SSE) streaming output.
 */
async function handleSSEResponse(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.replace('data: ', '').trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr);
          const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (textChunk) {
            fullText += textChunk;
            if (onChunk) onChunk(textChunk, fullText);
          }
        } catch (e) {
          // Ignore JSON parse errors on partial stream lines
        }
      }
    }
  }

  return fullText;
}

/**
 * Demo fallback stream when API Key is missing or user is testing offline.
 */
function simulateDemoStream(messages, onChunk, onFinish, signal) {
  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
  let demoReply = '';

  if (lastUserMsg.includes('hello') || lastUserMsg.includes('hi')) {
    demoReply = "Hello there! 👋 I am **NexusAI** running in Demo Mode. To unlock full AI capabilities, please enter your **Gemini API Key** in the Settings menu (⚙️). How can I help you today?";
  } else if (lastUserMsg.includes('code') || lastUserMsg.includes('python') || lastUserMsg.includes('javascript')) {
    demoReply = "Here is an example code snippet in Python:\n\n```python\ndef greet_user(name):\n    \"\"\"Return a personalized greeting.\"\"\"\n    return f\"Hello, {name}! Welcome to NexusAI Chatbot.\"\n\nprint(greet_user(\"Developer\"))\n```\n\n*(Note: Add your Gemini API Key in Settings to get real-time custom AI responses!)*";
  } else {
    demoReply = `Thank you for your message! 🌟\n\nI am currently operating in **Demo Mode**. You can configure your **Gemini API key** in Settings to chat with **Gemini 2.0 Flash** or **Gemini 1.5 Flash** live.\n\n### What I can help you with once configured:\n- 🚀 **Writing & Debugging Code**\n- 💡 **Brainstorming Ideas & Content**\n- 📚 **Summarizing & Explaining Complex Concepts**\n- 🌐 **Language Translations & Editing**`;
  }

  let index = 0;
  let accumulated = '';

  const interval = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(interval);
      return;
    }

    const chunkSize = Math.floor(Math.random() * 5) + 3;
    const chunk = demoReply.slice(index, index + chunkSize);
    index += chunkSize;
    accumulated += chunk;

    if (onChunk) onChunk(chunk, accumulated);

    if (index >= demoReply.length) {
      clearInterval(interval);
      if (onFinish) onFinish(accumulated);
    }
  }, 30);
}
