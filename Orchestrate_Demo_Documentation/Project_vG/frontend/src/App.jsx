// src/App.jsx
import { useState, useRef, useEffect } from 'react';
import { TextInput, Button, InlineLoading, Theme } from '@carbon/react';
import { Send } from '@carbon/icons-react';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Use a ref to store the REAL IBM Thread ID across renders
  const activeThreadId = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '' }
    ]);

    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: userMessage,
            threadId: activeThreadId.current // Will be null on the very first turn
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      // Check if IBM sent the thread ID in the HTTP headers
      const headerThreadId = response.headers.get('X-IBM-THREAD-ID');
      if (headerThreadId && !activeThreadId.current) {
          activeThreadId.current = headerThreadId;
          console.log("Captured IBM Thread ID from header:", activeThreadId.current);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const lines = part.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') continue;

                try {
                  const data = JSON.parse(dataStr);

                  // Catch the thread_id if IBM sent it inside the SSE JSON payload
                  if (data.thread_id && !activeThreadId.current) {
                      activeThreadId.current = data.thread_id;
                      console.log("Captured IBM Thread ID from stream:", activeThreadId.current);
                  }

                  const delta = data.choices?.[0]?.delta?.content || '';

                  if (delta) {
                    setMessages(prev => {
                      const newMsgs = [...prev];
                      const lastIndex = newMsgs.length - 1;
                      newMsgs[lastIndex] = {
                        ...newMsgs[lastIndex],
                        content: newMsgs[lastIndex].content + delta
                      };
                      return newMsgs;
                    });
                  }
                } catch (err) {
                  // Ignore incomplete JSON parses while buffering
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1].content = `Error: ${error.message}`;
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Theme theme="white" style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '800px', margin: '0 auto', borderLeft: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}>

      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f4f4f4' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Watsonx Agent Directory</h1>
      </div>

      {/* Chat History Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 && (
          <p style={{ color: '#525252', textAlign: 'center', marginTop: '2rem' }}>
            Start a conversation with your Watsonx Agent.
          </p>
        )}

        {messages.map((msg, index) => (
          <div key={index} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? '#0f62fe' : '#f4f4f4',
            color: msg.role === 'user' ? '#ffffff' : '#161616',
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            maxWidth: '85%',
            border: msg.role === 'user' ? 'none' : '1px solid #e0e0e0'
          }}>
            <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem', opacity: 0.8 }}>
              {msg.role === 'user' ? 'You' : 'Agent'}
            </strong>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{msg.content}</p>
          </div>
        ))}

        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '1rem', backgroundColor: '#f4f4f4', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
            <InlineLoading description="Agent is thinking..." />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: '#f4f4f4', borderTop: '1px solid #e0e0e0' }}>
        <div style={{ flex: 1 }}>
          <TextInput
            id="chat-input"
            labelText=""
            placeholder="Type your message here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          renderIcon={Send}
          hasIconOnly
          iconDescription="Send message"
          disabled={isLoading || !inputValue.trim()}
          size="lg"
        />
      </form>

    </Theme>
  );
}

export default App;