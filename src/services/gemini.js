/**
 * Gemini API Client Service
 * Handles multi-turn chat generation, streaming responses, and demo fallbacks.
 */

const DEFAULT_SYSTEM_INSTRUCTION = `You are NexusAI, a helpful, intelligent, and friendly AI assistant.
Answer questions accurately, clearly, and concisely. When writing code or technical details, use clean formatting and markdown code blocks.`;

/**
 * Format conversation history for Gemini API.
 */
function formatHistory(messages, systemInstruction) {
  const contents = [];

  messages.forEach(msg => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
  });

  return {
    contents,
    system_instruction: systemInstruction ? {
      parts: [{ text: systemInstruction }]
    } : undefined
  };
}

/**
 * Stream response from Gemini API.
 */
export async function streamGeminiChat({
  apiKey,
  model = 'gemini-2.5-flash',
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

  try {
    const payload = {
      ...formatHistory(messages, systemInstruction),
      generationConfig: {
        temperature: parseFloat(temperature) || 0.7,
        maxOutputTokens: 2048
      }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey.trim()}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const errorMsg = errJson.error?.message || `API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep remainder in buffer

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
            // Ignore parse errors on partial lines
          }
        }
      }
    }

    if (onFinish) onFinish(fullText);
    return fullText;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Stream generation aborted by user.');
      return;
    }
    console.error('Gemini API Error:', error);
    if (onError) onError(error.message || 'Failed to connect to Gemini API.');
  }
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
    demoReply = `Thank you for your message! 🌟\n\nI am currently operating in **Demo Mode**. You can configure your **Gemini API key** in Settings to chat with **Gemini 2.5 Flash** or **Gemini 2.5 Pro** live.\n\n### What I can help you with once configured:\n- 🚀 **Writing & Debugging Code**\n- 💡 **Brainstorming Ideas & Content**\n- 📚 **Summarizing & Explaining Complex Concepts**\n- 🌐 **Language Translations & Editing**`;
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
