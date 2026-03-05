import { useState } from 'react';

// Add this at the very top of the file
console.log("🛠️ DEBUG: useChat Hook Loaded - Version 2.1-THREAD-FIX");

// Inside sendMessage, right after receiving the header:
const xThreadId = response.headers.get('X-IBM-THREAD-ID');
if (xThreadId) {
    console.log("🧵 THREAD SYNC SUCCESS:", xThreadId);
    setThreadId(xThreadId);
} else {
    console.warn("⚠️ WARNING: No Thread ID received from server!");
}

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // 1. Add User Message to UI
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message: text, 
            threadId: threadId // Send existing threadId if we have one
        }),
      });

      if (!response.ok) throw new Error('Failed to connect to backend');

      // 2. Capture and Save the Thread ID from Watsonx
      const xThreadId = response.headers.get('X-IBM-THREAD-ID');
      if (xThreadId && !threadId) {
          console.log("🧵 New Thread Started:", xThreadId);
          setThreadId(xThreadId);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      // 3. Prepare Assistant Placeholder
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
