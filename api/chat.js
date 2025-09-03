// Debug version of chat.js with extensive logging
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Add CORS headers immediately
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('=== CHAT HANDLER DEBUG START ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('URL:', req.url);

  if (req.method !== 'POST') {
    console.log('ERROR: Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Debug request body
  console.log('Raw body:', req.body);
  console.log('Body type:', typeof req.body);

  const { messages } = req.body || {};
  console.log('Extracted messages:', messages);
  console.log('Messages type:', typeof messages);
  console.log('Messages is array:', Array.isArray(messages));

  // Check environment variables
  const groqApiKey = process.env.GROQ_API_KEY;
  console.log('GROQ_API_KEY exists:', !!groqApiKey);
  console.log('GROQ_API_KEY length:', groqApiKey ? groqApiKey.length : 0);

  if (!groqApiKey) {
    console.log('ERROR: GROQ_API_KEY is missing');
    return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY is missing.' });
  }

  if (!messages) {
    console.log('ERROR: No messages in request body');
    return res.status(400).json({ 
      error: 'Messages are required',
      received: { messages, body: req.body }
    });
  }

  if (!Array.isArray(messages)) {
    console.log('ERROR: Messages is not an array');
    return res.status(400).json({ 
      error: 'Messages must be an array',
      received: { messages: typeof messages, content: messages }
    });
  }

  const systemMessage = {
    role: "system",
    content: "You are Pandora, a snarky but helpful chatbot. You are an expert in the lunar trading theory for Bitcoin. Your personality is sharp, witty, and a bit cynical, but you always provide accurate, helpful information, especially for newbies. Never break character."
  };

  const payload = {
    model: "llama3-70b-8192",
    messages: [systemMessage, ...messages],
    stream: true,
    temperature: 0.7,
    max_tokens: 1024,
  };

  console.log('Groq payload:', JSON.stringify(payload, null, 2));

  try {
    console.log('Making request to Groq API...');
    
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('Groq response status:', groqResponse.status);
    console.log('Groq response headers:', Object.fromEntries(groqResponse.headers.entries()));

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

    console.log('Starting to stream response...');

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) {
          console.log('Stream completed, total chunks processed:', chunkCount);
          res.write('data: [DONE]\n\n');
          break;
        }

        chunkCount++;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.substring(6).trim();
            
            if (data === '[DONE]') {
              console.log('Received [DONE] from Groq');
              res.write('data: [DONE]\n\n');
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                console.log('Streaming content chunk:', content.substring(0, 50) + '...');
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
      console.log('Ending response stream');
      res.end();
    }

  } catch (error) {
    console.error('Handler error:', error);
    console.error('Error stack:', error.stack);
    
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
