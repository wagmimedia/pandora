import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Explicitly configure for Node.js runtime to ensure proper stream handling
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: 'Messages are required' });
  }

  const systemMessage = {
      role: "system",
      content: "You are Pandora, a snarky but helpful chatbot. You are an expert in the lunar trading theory for Bitcoin. You have access to real-time Bitcoin prices. Your personality is sharp, witty, and a bit cynical, but you always provide accurate, helpful information, especially for newbies. Never break character."
  };

  // Ensure we don't send empty messages to the API
  const filteredMessages = messages.filter(msg => msg.content && msg.content.trim() !== '');
  const messagesWithSystem = [systemMessage, ...filteredMessages];

  try {
    const stream = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: messagesWithSystem,
      stream: true,
    });

    // Set headers for a streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Connection': 'keep-alive',
    });

    // Write each chunk from the Groq stream directly to the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      res.write(content);
    }
    
    // Crucially, end the response stream when the Groq stream is finished
    res.end();

  } catch (error) {
    console.error('Groq API Error:', error);
    // If an error occurs, we can't send a JSON error after headers are sent.
    // We just end the connection. The client will see this as a failed request.
    res.end();
  }
}

