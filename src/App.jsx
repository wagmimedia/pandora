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

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.map(({ role, content }) => ({ role, content })) }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        // Add chunk to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines in the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          // Parse SSE format: "data: {...}"
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.substring(6).trim();
            
            // Check for end of stream
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              // Handle content chunks
              if (parsed.content) {
                setMessages(prev => {
                  const lastMsgIndex = prev.length - 1;
                  const updatedLastMsg = {
                    ...prev[lastMsgIndex],
                    content: prev[lastMsgIndex].content + parsed.content,
                  };
                  return [...prev.slice(0, lastMsgIndex), updatedLastMsg];
                });
              }
              
              // Handle errors from server
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              
            } catch (parseError) {
              console.error('Error parsing SSE data:', data, parseError);
              // If it's a JSON parse error, continue processing other chunks
              // If it's a thrown error from parsed.error, it will be caught by outer try-catch
              if (parseError.message.includes('Unexpected token')) {
                continue;
              } else {
                throw parseError;
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Streaming error:', error);
      setMessages(prev => {
        const lastMsgIndex = prev.length - 1;
        const updatedLastMsg = {
          ...prev[lastMsgIndex],
          content: `Sorry, I'm having trouble connecting to my brain right now. Try again in a moment. (Error: ${error.message})`,
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
