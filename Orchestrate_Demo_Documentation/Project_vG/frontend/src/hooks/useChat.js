import { useState } from 'react';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message to UI
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId }),
      });

      if (!response.ok) throw new Error('Failed to connect to backend');

      // Capture Thread ID from headers for continuity
      const xThreadId = response.headers.get('X-IBM-THREAD-ID');
      if (xThreadId) setThreadId(xThreadId);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      // Add placeholder for the assistant response
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine || !cleanLine.startsWith('data: ')) continue;

          try {
            const rawData = cleanLine.replace('data: ', '');
            const data = JSON.parse(rawData);

            // 1. Update text as it streams in
            if (data.object === 'thread.message.delta' && data.choices[0].delta?.content) {
              assistantText += data.choices[0].delta.content;
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = assistantText;
                return newMsgs;
              });
            }

            // 2. Stop loading state when stream explicitly completes
            if (data.object === 'thread.message.completed') {
              setLoading(false);
            }
          } catch (err) {
            // Ignore malformed JSON chunks
            console.error("Stream parse error:", err);
          }
        }
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Error: Connection to Watsonx lost.' 
      }]);
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
};
