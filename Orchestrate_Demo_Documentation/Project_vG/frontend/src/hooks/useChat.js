import { useState } from 'react';

console.log("%c 🛠️ DEBUG: useChat Hook Module Loaded - v2.3-SSE-THREAD-FIX", "background: #333; color: #bada55; padding: 5px;");

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    console.log(`%c 📤 Sending: "${text}" | Current Frontend ThreadID: ${threadId || 'Waiting for stream payload...'}`, "color: #0f62fe; font-weight: bold;");

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId }),
      });

      if (!response.ok) throw new Error('Failed to connect to backend');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; 

        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              
              if (dataStr === '[DONE]') {
                  setLoading(false);
                  continue;
              }

              try {
                const data = JSON.parse(dataStr);
                
                // ✨ THE ROOT FIX: Extract Thread ID directly from the Watsonx JSON payload
                if (data.thread_id) {
                    setThreadId(prevThreadId => {
                        if (prevThreadId !== data.thread_id) {
                            console.log(`%c 🧵 THREAD EXTRACTED FROM STREAM: ${data.thread_id}`, "color: #24a148; font-weight: bold;");
                        }
                        return data.thread_id;
                    });
                }

                const delta = data.choices?.[0]?.delta?.content || '';

                if (delta) {
                  setMessages((prev) => {
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
                 // Ignore incomplete JSON chunks until fully buffered
              }
            }
          }
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = '⚠️ Connection Error: Failed to communicate with Watsonx.';
          return newMsgs;
      });
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
};
