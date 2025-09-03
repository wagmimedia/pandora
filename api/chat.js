import Groq from 'groq-sdk';

// Initialize the Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Use the Vercel Edge Runtime for speed and streaming support
export const config = {
  runtime: 'edge',
};

// The main handler for the API endpoint
export default async function handler(req) {
  // We only accept POST requests
  if (req.method !== 'POST') {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // Get the conversation history from the request body
    const { messages } = await req.json();

    if (!messages) {
      return new Response("Bad Request: Messages are required", { status: 400 });
    }

    // Define Pandora's personality and instructions
    const systemMessage = {
        role: "system",
        content: "You are Pandora, a snarky but helpful chatbot. You are an expert in the lunar trading theory for Bitcoin. Your personality is sharp, witty, and a bit cynical, but you always provide accurate, helpful information, especially for newbies. Never break character."
    };
    
    // Combine the system prompt with the user's conversation history
    const messagesWithSystem = [systemMessage, ...messages];

    // Request a streaming completion from the Groq API
    const stream = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: messagesWithSystem,
      stream: true,
    });

    // Create a new ReadableStream to send the response back to the client
    const readableStream = new ReadableStream({
      async start(controller) {
        // Iterate over the chunks from the Groq API stream
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          // Send each piece of the response to the client as it arrives
          controller.enqueue(new TextEncoder().encode(content));
        }
        // Signal that the stream is complete
        controller.close();
      },
    });

    // Return the stream as the response
    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('Groq API Error:', error);
    return new Response("An error occurred while connecting to my brain.", { status: 500 });
  }
}

