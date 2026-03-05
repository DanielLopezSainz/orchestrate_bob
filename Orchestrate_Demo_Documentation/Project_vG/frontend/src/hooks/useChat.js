import { useState } from 'react';

// This confirms the file itself loaded
console.log("%c 🛠️ DEBUG: useChat Hook Module Loaded - v2.1-THREAD-FIX", "background: #333; color: #bada55; padding: 5px;");

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // DEBUG: Confirm what we are sending to the server
    console.log(`%c 📤 Sending: "${text}" | Current ThreadID: ${threadId || 'NONE'}`, "color: #0f62fe; font-weight: bold;");

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: text, 
            threadId: threadId 
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to backend');

      // 1. Capture and Save the Thread ID - Syncing State
      const xThreadId = response.headers.get('X-IBM-THREAD-ID');
      if (xThreadId) {
          console.log(`%c 🧵 THREAD SYNC: ${xThreadId}`, "color: #24a148; font-weight: bold;");
          setThreadId(xThreadId);
      } else {
          console.warn("⚠️ WARNING: No Thread ID returned from server headers.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

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

            if (data.object === 'thread.message.delta' && data.choices[0].delta?.content) {
              assistantText += data.choices[0].delta.content;
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = assistantText;
                return newMsgs;
              });
            }

            if (data.object === 'thread.message.completed') {
              setLoading(false);
            }
          } catch (err) {
            console.error("Stream parse error:", err);
          }
        }
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Connection Error: Conversation state lost.' 
      }]);
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
};
