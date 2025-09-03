// This function now uses a direct `fetch` call, inspired by your working code,
// but adapted for robust streaming on Vercel.

// We are NOT using the edge runtime for better compatibility.
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY is missing.' });
  }

  if (!messages) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  const systemMessage = {
      role: "system",
      content: "You are Pandora, a snarky but helpful chatbot. You are an expert in the lunar trading theory for Bitcoin. Your personality is sharp, witty, and a bit cynical, but you always provide accurate, helpful information, especially for newbies. Never break character."
  };

  const payload = {
    model: "llama3-70b-8192",
    messages: [systemMessage, ...messages],
    stream: true, // We must stream to avoid timeouts
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
        console.error('Groq API error response:', errorText);
        return res.status(groqResponse.status).json({ error: `Groq API Error: ${errorText}` });
    }

    // Pipe the streaming response directly to the client
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value);
      
      // SSE (Server-Sent Events) format is what the Groq stream uses
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data.trim() === '[DONE]') {
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              res.write(content);
            }
          } catch (e) {
            console.error('Error parsing stream data chunk:', data);
          }
        }
      }
    }
    
    res.end();

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}

