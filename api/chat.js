// Clean final version of chat.js
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY is missing.' });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Validate messages format
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid message format. Each message must have role and content.',
        received: msg
      });
    }
  }

  const systemMessage = {
    role: "system",
    content: "You are Pandora, a snarky but helpful chatbot. You are an expert in the lunar trading theory for Bitcoin. Your personality is sharp, witty, and a bit cynical, but you always provide accurate, helpful information, especially for newbies. Never break character."
  };

  const payload = {
    model: "llama-3.3-70b-versatile", // Updated to current production model
    messages: [systemMessage, ...messages],
    stream: true,
    temperature: 0.7,
    max_tokens: 1024,
  };

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error response:', groqResponse.status, errorText);
      return res.status(groqResponse.status).json({ 
        error: `Groq API Error: ${groqResponse.status}`,
        details: errorText
      });
    }

    // Set proper SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          res.write('data: [DONE]\n\n');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.substring(6).trim();
            
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch (parseError) {
              console.error('Error parsing stream data:', data, parseError);
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Stream processing error:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'Stream processing failed' })}\n\n`);
    } finally {
      res.end();
    }

  } catch (error) {
    console.error('Handler error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'An internal server error occurred.',
        details: error.message 
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Connection failed' })}\n\n`);
      res.end();
    }
  }
}
