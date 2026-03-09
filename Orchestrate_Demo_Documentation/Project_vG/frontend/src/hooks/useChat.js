/**
 * frontend/src/hooks/useChat.js
 * * ARCHITECTURE: STATE & LOGIC LAYER (CUSTOM HOOK)
 * AI AGENT NOTE: All communication with the Watsonx backend, Server-Sent Events (SSE) 
 * parsing, and Thread state management MUST remain in this file. UI components are 
 * strictly forbidden from making network requests.
 * * CRITICAL FLOW:
 * 1. Stream reading must use a buffer to assemble JSON chunks safely.
 * 2. The Thread ID must be extracted from the inner JSON payload, NOT from HTTP headers.
 */

import { useState } from 'react';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Push the user's message and a blank assistant placeholder to the UI immediately
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the threadId to the backend. If it's null, backend will check its session.
        body: JSON.stringify({ message: text, threadId }),
      });

      if (!response.ok) throw new Error('Failed to connect to backend');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      // BUFFER: Required because TCP streams split JSON payloads arbitrarily.
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // SSE standard uses double newline to mark the end of a complete event chunk
        const parts = buffer.split('\n\n');
        
        // Pop the last element back into the buffer, as it might be an incomplete chunk
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
                
                // --- THREAD ID EXTRACTION ---
                // Watsonx streams do not put thread_ids in the HTTP headers. They are 
                // embedded inside the data payload. We must capture it here to maintain context.
                if (data.thread_id) {
                    setThreadId(prevThreadId => {
                        if (prevThreadId !== data.thread_id) {
                            console.log(`[useChat] Thread Extracted: ${data.thread_id}`);
                        }
                        return data.thread_id;
                    });
                }

                // Extract the specific text delta from the Orchestrate choices array
                const delta = data.choices?.[0]?.delta?.content || '';

                if (delta) {
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const lastIndex = newMsgs.length - 1;
                    // Append the delta to the existing assistant placeholder string
                    newMsgs[lastIndex] = {
                      ...newMsgs[lastIndex],
                      content: newMsgs[lastIndex].content + delta
                    };
                    return newMsgs;
                  });
                }
              } catch (err) {
                 // Silently ignore JSON parse errors here. If a chunk was split, the next 
                 // cycle will append the rest of the string to the buffer and parse successfully.
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
