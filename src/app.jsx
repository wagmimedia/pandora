import React, { useState, useEffect, useRef } from 'react';

// Landing Page Component
const LandingPage = ({ onLaunch }) => {
  return (
    <div className="landing-container">
      <h1 className="landing-title">Pandora</h1>
      <p className="landing-subtitle">
        Your snarky, helpful AI guide to the volatile world of lunar-based crypto trading. Ask anything, but don't expect her to be nice about it.
      </p>
      <button className="launch-button" onClick={onLaunch}>
        Launch Pandora
      </button>
    </div>
  );
};

// Main App Component
const App = () => {
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

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const botMessage = { role: 'bot', content: data.reply };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error("Failed to get response from Pandora:", error);
      const errorMessage = { role: 'bot', content: "Sorry, I'm having trouble connecting to my brain right now. Try again in a moment." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!showChat) {
    return <LandingPage onLaunch={() => setShowChat(true)} />;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">Talk to Pandora</div>
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="message bot loading">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <input
          type="text"
          className="input-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask Pandora anything..."
          disabled={isLoading}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={isLoading || input.trim() === ''}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default App;


