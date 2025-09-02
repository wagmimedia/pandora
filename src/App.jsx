import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(({ role, content }) => ({ role, content })) }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get streaming response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        setMessages(prev => {
          const lastMsgIndex = prev.length - 1;
          const updatedLastMsg = {
            ...prev[lastMsgIndex],
            content: prev[lastMsgIndex].content + chunk,
          };
          return [...prev.slice(0, lastMsgIndex), updatedLastMsg];
        });
      }

    } catch (error) {
      console.error('Fetch error:', error);
      setMessages(prev => {
          const lastMsgIndex = prev.length - 1;
          const updatedLastMsg = {
            ...prev[lastMsgIndex],
            content: "Sorry, I'm having trouble connecting to my brain right now. Try again in a moment.",
          };
          return [...prev.slice(0, lastMsgIndex), updatedLastMsg];
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!showChat) {
    return (
      <div className="landing-page">
        <div className="landing-content">
          <div className="logo"></div>
          <h1>Pandora</h1>
          <p>Your snarky guide to the cosmos of crypto trading.</p>
          <button onClick={() => setShowChat(true)}>Launch Pandora</button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">Talk to Pandora</div>
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
             {msg.role === 'assistant' && msg.content === '' && isLoading && index === messages.length - 1 ? (
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Pandora anything..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}

export default App;

