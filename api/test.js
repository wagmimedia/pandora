// Create this as api/test.js to verify basic functionality
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Return request details for debugging
  return res.status(200).json({
    success: true,
    method: req.method,
    headers: req.headers,
    body: req.body,
    env_vars: {
      GROQ_API_KEY_EXISTS: !!process.env.GROQ_API_KEY,
      GROQ_API_KEY_LENGTH: process.env.GROQ_API_KEY?.length || 0
    }
  });
}
