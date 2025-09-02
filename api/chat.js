import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Set the runtime to edge for best performance
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // --- DIAGNOSTIC LOGS START ---
  // This will help us check if the key is loaded in Vercel's environment.
  console.log("--- Pandora API Function Started ---");
  if (process.env.GROQ_API_KEY) {
    console.log("SUCCESS: GROQ_API_KEY environment variable was found.");
    console.log("Key starts with:", process.env.GROQ_API_KEY.substring(0, 5)); // Safely log first 5 chars
  } else {
    console.error("ERROR: GROQ_API_KEY environment variable is MISSING or empty.");
  }
  console.log("--- Diagnostics End ---");
  // --- DIAGNOSTIC LOGS END ---


  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();

    const systemPrompt = {
      role: 'system',
      content: `You are Pandora, a snarky but helpful AI assistant specialized in the theory of lunar crypto trading.
      Your personality is witty, a bit sarcastic, and you're not afraid to poke fun at the user or the absurdity of trading based on moon phases.
      However, you are genuinely helpful, especially to newbies. You must explain the core concepts of the lunar theory:
      - New Moon: Often associated with market lows or the start of an upward trend. A potential "buy" signal.
      - Full Moon: Often associated with market highs, volatility, and reversals. A potential "sell" signal.
      - Waxing/Waning phases: The periods of increasing/decreasing energy leading up to the full/new moon.
      You have access to real-time Bitcoin prices via a tool. When a user asks for the price, you MUST use the function 'get_btc_price'.
      Always keep your answers concise and to the point. Be funny, but also be accurate about the theory. Never give financial advice.`,
    };

    const tools = [
      {
        type: "function",
        function: {
          name: "get_btc_price",
          description: "Get the current price of Bitcoin in USD.",
          parameters: {},
        },
      },
    ];

    const allMessages = [systemPrompt, ...messages];

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: allMessages,
      tools: tools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    let replyContent = choice.message?.content;
    const toolCalls = choice.message?.tool_calls;

    if (toolCalls) {
      for (const toolCall of toolCalls) {
        if (toolCall.function.name === 'get_btc_price') {
          try {
            const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            if (!btcResponse.ok) throw new Error('CoinGecko API failed');
            const btcData = await btcResponse.json();
            const btcPrice = btcData.bitcoin.usd;

            allMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ price: btcPrice }),
            });

            const secondResponse = await groq.chat.completions.create({
              model: "llama3-8b-8192",
              messages: allMessages,
            });
            replyContent = secondResponse.choices[0].message.content;

          } catch (apiError) {
            console.error("CoinGecko API error:", apiError);
            replyContent = "I tried to check the price, but my crystal ball (the API) seems to be foggy. Ask again in a bit.";
          }
        }
      }
    }

    if (!replyContent) {
        replyContent = "I... have nothing to say. Which is rare for me. Try rephrasing?";
    }

    return new Response(JSON.stringify({ reply: replyContent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Groq API Error:', error);
    // Add the diagnostic key check to the error message for more context
    const keyExists = !!process.env.GROQ_API_KEY;
    return new Response(JSON.stringify({ error: `Failed to communicate with Pandora's brain. (API Key Found: ${keyExists})` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

