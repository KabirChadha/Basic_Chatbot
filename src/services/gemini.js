import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_SYSTEM_INSTRUCTION = `You are NexusAI, a helpful, intelligent, and friendly AI assistant.
Answer questions accurately, clearly, and concisely. When writing code or technical details, use clean formatting and markdown code blocks.`;

/**
 * Stream responses using the official @google/generative-ai SDK.
 */
export async function streamGeminiChat({
  apiKey,
  model = 'gemini-1.5-flash',
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

  // Primary model + fallbacks
  const modelsToTry = [
    model,
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash-exp',
    'gemini-pro'
  ].filter((item, index, self) => self.indexOf(item) === index);

  let lastError = null;

  for (const modelName of modelsToTry) {
    if (signal?.aborted) return;

    try {
      console.log(`Connecting to Gemini via SDK with model: ${modelName}...`);
      const genAI = new GoogleGenerativeAI(cleanKey);
      
      const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction ? systemInstruction : undefined,
        generationConfig: {
          temperature: parseFloat(temperature) || 0.7,
          maxOutputTokens: 2048
        }
      });

      // Prepare conversation history (all messages except the very last prompt)
      const history = [];
      const previousMessages = messages.slice(0, -1);
      
      previousMessages.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          history.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content || '' }]
          });
        }
      });

      const chat = generativeModel.startChat({ history });
      const currentPrompt = messages[messages.length - 1]?.content || '';

      const resultStream = await chat.sendMessageStream(currentPrompt);

      let fullText = '';
      for await (const chunk of resultStream.stream) {
        if (signal?.aborted) break;
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          if (onChunk) onChunk(chunkText, fullText);
        }
      }

      if (onFinish) onFinish(fullText);
      return fullText;

    } catch (err) {
      if (signal?.aborted) return;
      console.warn(`Model ${modelName} failed in SDK:`, err.message);
      lastError = err;
    }
  }

  const errorMessage = lastError?.message || 'Failed to connect to Gemini API.';
  console.error('All Gemini SDK models failed:', errorMessage);
  
  if (onError) {
    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('API key not valid')) {
      onError('Invalid Gemini API Key. Please verify your API Key in Settings.');
    } else {
      onError(`Gemini API Error: ${errorMessage}`);
    }
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
    demoReply = `Thank you for your message! 🌟\n\nI am currently operating in **Demo Mode**. You can configure your **Gemini API key** in Settings to chat with **Gemini 1.5 Flash** or **Gemini 1.5 Pro** live.\n\n### What I can help you with once configured:\n- 🚀 **Writing & Debugging Code**\n- 💡 **Brainstorming Ideas & Content**\n- 📚 **Summarizing & Explaining Complex Concepts**\n- 🌐 **Language Translations & Editing**`;
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
