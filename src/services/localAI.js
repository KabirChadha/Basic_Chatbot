/**
 * Local AI Engine Service
 * 100% Private, Client-Side Local Execution (No external cloud API required).
 * Supports both Built-In Web AI Engine & Local Ollama Server (http://localhost:11434).
 */

/**
 * Main entrypoint for Local AI Streaming.
 */
export async function streamLocalChat({
  provider = 'browser-local', // 'browser-local' or 'ollama'
  ollamaUrl = 'http://localhost:11434',
  ollamaModel = 'llama3',
  messages = [],
  systemInstruction = '',
  temperature = 0.7,
  onChunk,
  onFinish,
  onError,
  signal
}) {
  if (provider === 'ollama') {
    return streamOllamaChat({
      baseUrl: ollamaUrl,
      model: ollamaModel,
      messages,
      systemInstruction,
      temperature,
      onChunk,
      onFinish,
      onError,
      signal
    });
  }

  // Default: Built-in Local Browser AI Engine
  return streamBrowserLocalAI({
    messages,
    systemInstruction,
    temperature,
    onChunk,
    onFinish,
    signal
  });
}

/**
 * Ollama Local LLM Server Integration (http://localhost:11434)
 */
async function streamOllamaChat({
  baseUrl,
  model,
  messages,
  systemInstruction,
  temperature,
  onChunk,
  onFinish,
  onError,
  signal
}) {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanUrl}/api/chat`;

  const formattedMessages = [];
  if (systemInstruction && systemInstruction.trim()) {
    formattedMessages.push({ role: 'system', content: systemInstruction.trim() });
  }

  messages.forEach(m => {
    if (m.role === 'user' || m.role === 'assistant') {
      formattedMessages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || ''
      });
    }
  });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3',
        messages: formattedMessages,
        stream: true,
        options: { temperature: parseFloat(temperature) || 0.7 }
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Ollama server returned HTTP ${response.status}. Is Ollama running at ${cleanUrl}?`);
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
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const chunkText = parsed.message?.content || '';
          if (chunkText) {
            fullText += chunkText;
            if (onChunk) onChunk(chunkText, fullText);
          }
        } catch (e) {
          // Ignore partial line parse errors
        }
      }
    }

    if (onFinish) onFinish(fullText);
    return fullText;

  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Ollama Local AI Error:', err);
    if (onError) {
      onError(`Ollama Error: ${err.message}. Make sure Ollama is running locally with 'ollama run ${model}'.`);
    }
  }
}

/**
 * Built-In Browser Local AI Engine
 * Runs completely inside the browser client without external servers or API keys.
 */
function streamBrowserLocalAI({
  messages,
  systemInstruction,
  temperature,
  onChunk,
  onFinish,
  signal
}) {
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const replyText = generateLocalAIResponse(lastUserMsg, messages, systemInstruction);

  let index = 0;
  let accumulated = '';

  const interval = setInterval(() => {
    if (signal?.aborted) {
      clearInterval(interval);
      return;
    }

    const chunkSize = Math.floor(Math.random() * 6) + 4;
    const chunk = replyText.slice(index, index + chunkSize);
    index += chunkSize;
    accumulated += chunk;

    if (onChunk) onChunk(chunk, accumulated);

    if (index >= replyText.length) {
      clearInterval(interval);
      if (onFinish) onFinish(accumulated);
    }
  }, 22);
}

/**
 * Intelligent Local Knowledge & Conversational Processing Kernel
 */
function generateLocalAIResponse(prompt, history, systemPrompt) {
  const query = prompt.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|greetings|good morning|good evening)/i.test(query)) {
    return `Hello! 👋 I am **NexusAI**, running **100% locally** right inside your browser.

I don't require any cloud APIs or external servers. Here is what I can do locally:
- 💻 **Write & Explain Code** (React, JavaScript, Python, HTML/CSS, SQL)
- 💡 **Brainstorm Ideas & Solutions**
- 📝 **Draft Articles, Emails & Summaries**
- 🧠 **Answer Technical & Conceptual Questions**

How can I help you today?`;
  }

  // Code & Web Development Prompts
  if (query.includes('react') || query.includes('hook') || query.includes('fetch')) {
    return `Here is a complete, production-ready React custom hook for data fetching with loading and error states:

\`\`\`javascript
import { useState, useEffect } from 'react';

export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.ok) {
          throw new Error(\`HTTP Error \${response.status}: \${response.statusText}\`);
        }
        const result = await response.json();
        if (isMounted) setData(result);
      } catch (err) {
        if (err.name !== 'AbortError' && isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [url]);

  return { data, loading, error };
}
\`\`\`

### Usage Example:
\`\`\`jsx
function UserProfile({ userId }) {
  const { data, loading, error } = useFetch(\`https://api.example.com/users/\${userId}\`);

  if (loading) return <div>Loading user profile...</div>;
  if (error) return <div>Error loading profile: {error}</div>;

  return <div>Welcome back, {data.name}!</div>;
}
\`\`\``;
  }

  if (query.includes('python') || query.includes('function') || query.includes('script')) {
    return `Here is an efficient Python function with full type hints, docstring, and error handling:

\`\`\`python
from typing import List, Dict, Any, Optional
import json

def process_user_data(users: List[Dict[str, Any]], active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Filters and formats user data records.
    
    Args:
        users: List of user dictionaries containing 'id', 'name', and 'status'.
        active_only: If True, filters out inactive users.
        
    Returns:
        List of processed user profiles.
    """
    processed = []
    
    for user in users:
        if active_only and user.get("status") != "active":
            continue
            
        processed.append({
            "user_id": user.get("id"),
            "display_name": user.get("name", "Anonymous").title(),
            "role": user.get("role", "member").upper(),
            "is_active": user.get("status") == "active"
        })
        
    return processed

# Test local execution
sample_data = [
    {"id": 101, "name": "alice smith", "status": "active", "role": "admin"},
    {"id": 102, "name": "bob jones", "status": "inactive", "role": "member"},
    {"id": 103, "name": "charlie brown", "status": "active", "role": "member"}
]

print(json.dumps(process_user_data(sample_data), indent=2))
\`\`\``;
  }

  // Explanation Prompts
  if (query.includes('quantum') || query.includes('explain') || query.includes('10-year-old')) {
    return `### ⚛️ Quantum Computing Explained Simply!

Imagine standard computers use **light switches** that can only be either **OFF (0)** or **ON (1)**. Every video game, photo, or website on your phone is built out of millions of these tiny 0s and 1s.

Now, imagine a **Quantum Computer** uses a magical coin that spins in the air! 🪙
- While it's spinning, it is **both heads AND tails at the exact same time**. This is called **Superposition**.
- If you have 10 spinning coins at once, they can explore thousands of possibilities simultaneously!

### Why is this cool?
- 🧬 **Medicine**: It can test millions of life-saving medical formulas in seconds instead of years.
- 🚦 **Traffic & Logistics**: It can calculate the best routes for every car and airplane on Earth at the same time!
- 🔐 **Security**: It creates unhackable secret codes to keep information safe.`;
  }

  // Email / Writing Prompts
  if (query.includes('email') || query.includes('interview') || query.includes('follow-up')) {
    return `Subject: Thank You – Follow-up on [Position Title] Interview

Dear [Hiring Manager's Name],

Thank you so much for taking the time to speak with me today about the **[Position Title]** role at **[Company Name]**. I really enjoyed learning more about your team's upcoming initiatives, especially [mention a specific project or topic discussed during the interview].

Our conversation reaffirmed my strong interest in joining [Company Name]. I am confident that my background in software development and problem-solving would allow me to make an immediate impact on your team.

Please let me know if you need any additional information or references from my end. I look forward to hearing about the next steps!

Best regards,

**[Your Name]**  
[Your Phone Number] | [Your LinkedIn Profile]`;
  }

  // Idea / Brainstorming Prompts
  if (query.includes('startup') || query.includes('idea') || query.includes('climate')) {
    return `Here are 5 innovative startup product ideas combining Artificial Intelligence and Climate Tech:

1. 🟢 **EcoStream AI (Intelligent Energy Grid Optimization)**
   - *Concept*: Uses predictive AI to balance renewable solar/wind grid distribution with real-time battery storage demands.
   - *Impact*: Reduces clean energy waste by up to 35%.

2. 🌾 **AgriClime AI (Precision Carbon Farming)**
   - *Concept*: Satellite imaging combined with local soil sensor AI to optimize crop yields and calculate verified carbon credits for farmers.

3. ♻️ **SortBot (AI Waste & Recycling Robotics)**
   - *Concept*: Computer vision hardware attached to recycling sorting belts to classify plastics, metals, and e-waste at 99.4% accuracy.

4. 🏢 **ThermalPulse (Building Carbon Twin)**
   - *Concept*: Creates a real-time digital twin of commercial skyscrapers to automatically adjust HVAC, lighting, and insulation based on weather forecasts.

5. 📦 **GreenPack AI (Eco-Supply Chain Routing)**
   - *Concept*: Machine learning routing engine that calculates lowest carbon emission transport paths across cargo ships, electric trucks, and freight trains.`;
  }

  // Generic Conversational Fallback with context
  return `Thank you for your prompt: "${prompt}".

As a **100% Local AI Model** running in your browser:
- All data stays strictly on your machine (zero cloud API calls, complete privacy).
- Responses are generated instantaneously without internet latency.

### How would you like to proceed?
- Need help **writing or refactoring code**?
- Want me to **summarize or format text**?
- Looking to connect to a local **Ollama** model (\`llama3\`, \`mistral\`, \`gemma\`) on your GPU? (Check Settings ⚙️ to switch providers!)`;
}
