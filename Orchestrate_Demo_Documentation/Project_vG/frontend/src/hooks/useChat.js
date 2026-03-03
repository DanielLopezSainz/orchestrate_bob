// frontend/src/hooks/useChat.js
import { useState, useRef } from 'react';
import { postChatMessage } from '../services/orchestrateService';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const activeThreadId = useRef(null);

  const sendMessage = async (userText) => {
    if (!userText.trim()) return;

    setLoading(true);

    // 1. Add User message and a placeholder for the Assistant's streaming response
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userText },
      { role: 'assistant', content: '' }
    ]);

    try {
      const response = await postChatMessage(userText, activeThreadId.current);

      // 2. Capture the Thread ID from headers to maintain stateful conversation
      const threadHeader = response.headers.get('X-IBM-THREAD-ID');
      if (threadHeader) {
          activeThreadId.current = threadHeader;
      }

      // 3. Handle the Stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });

          // 4. Update the placeholder message with incoming text chunks
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsgIndex = newMsgs.length - 1;
            newMsgs[lastMsgIndex] = {
                ...newMsgs[lastMsgIndex],
                content: newMsgs[lastMsgIndex].content + chunk
            };
            return newMsgs;
          });
        }
      }
    } catch (err) {
      console.error("Diagnostic catch triggered:", err);

      let displayError = err.message;

      // 5. DIAGNOSTIC PARSER: Try to see if the error is our JSON diagnostic string
      try {
        const parsed = JSON.parse(err.message);
        // If it's valid JSON, we format it beautifully for the user
        displayError = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // Not JSON, display the raw error message (e.g., "Network Error")
      }

      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsgIndex = newMsgs.length - 1;
        newMsgs[lastMsgIndex] = {
          ...newMsgs[lastMsgIndex],
          content: `🛑 SYSTEM ERROR REPORT:\n\n${displayError}`
        };
        return newMsgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, loading, sendMessage };
}