// src/App.jsx - DIAGNOSTIC VERSION
import { useState, useRef, useEffect } from 'react';
import { TextInput, Button, InlineLoading, Theme } from '@carbon/react';
import { Send } from '@carbon/icons-react';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
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
            threadId: activeThreadId.current 
        })
      });

      // --- NEW DIAGNOSTIC LOGIC ---
      if (!response.ok) {
        // If the server sent our diagnostic JSON, parse it and throw it to the catch block
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData, null, 2));
      }

      const headerThreadId = response.headers.get('X-IBM-THREAD-ID');
      if (headerThreadId && !activeThreadId.current) {
          activeThreadId.current = headerThreadId;
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
                  if (data.thread_id && !activeThreadId.current) {
                      activeThreadId.current = data.thread_id;
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
                  // Silent catch for stream fragments
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Frontend Diagnostic Error:', error);
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastIndex = newMsgs.length - 1;
        newMsgs[lastIndex] = {
          ...newMsgs[lastIndex],
          content: `🛑 DIAGNOSTIC ERROR REPORT:\n\n${error.message}`
        };
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Theme theme="white" style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '800px', margin: '0 auto', borderLeft: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}>
      
      <div style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0', backgroundColor: '#f4f4f4' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Watsonx Agent Directory (Diagnostic Mode)</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 && (
          <p style={{ color: '#525252', textAlign: 'center', marginTop: '2rem' }}>
            Enter a prompt to trigger the diagnostic check.
          </p>
        )}
        
        {messages.map((msg, index) => (
          <div key={index} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            backgroundColor: msg.role === 'user' ? '#0f62fe' : (msg.content.includes('🛑') ? '#fff1f1' : '#f4f4f4'),
            color: msg.role === 'user' ? '#ffffff' : '#161616',
            padding: '0.75rem 1rem',
            borderRadius: '4px',
            maxWidth: '90%',
            border: msg.role === 'user' ? 'none' : (msg.content.includes('🛑') ? '1px solid #da1e28' : '1px solid #e0e0e0')
          }}>
            <strong style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem', opacity: 0.8 }}>
              {msg.role === 'user' ? 'You' : 'Agent / Debugger'}
            </strong>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4', fontFamily: msg.content.includes('🛑') ? 'monospace' : 'inherit', fontSize: msg.content.includes('🛑') ? '0.75rem' : 'inherit' }}>
                {msg.content}
            </p>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '1rem' }}>
            <InlineLoading description="Querying backend..." />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', padding: '1rem', backgroundColor: '#f4f4f4', borderTop: '1px solid #e0e0e0' }}>
        <div style={{ flex: 1 }}>
          <TextInput
            id="chat-input"
            labelText=""
            placeholder="Trigger error..."
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
          iconDescription="Send"
          disabled={isLoading || !inputValue.trim()}
        />
      </form>
      
    </Theme>
  );
}

export default App;
