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

import { useState, useEffect } from 'react';

const HISTORY_STORAGE_KEY = 'watsonx_chat_history';
const MAX_HISTORY_ITEMS = 50;

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setChatHistory(parsed);
      }
    } catch (error) {
      console.error('[useChat] Failed to load chat history:', error);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (error) {
      console.error('[useChat] Failed to save chat history:', error);
    }
  }, [chatHistory]);

  // Save current conversation to history when messages change
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length > 0) {
        const firstMessage = userMessages[0].content;
        const preview = firstMessage.length > 50
          ? firstMessage.substring(0, 50) + '...'
          : firstMessage;
        
        setChatHistory(prev => {
          const existingIndex = prev.findIndex(item => item.id === currentChatId);
          const historyItem = {
            id: currentChatId,
            preview,
            firstMessage,
            timestamp: existingIndex >= 0 ? prev[existingIndex].timestamp : Date.now(),
            messageCount: messages.length
          };

          if (existingIndex >= 0) {
            // Update existing item
            const updated = [...prev];
            updated[existingIndex] = historyItem;
            return updated;
          } else {
            // Add new item at the beginning
            const updated = [historyItem, ...prev];
            // Keep only MAX_HISTORY_ITEMS
            return updated.slice(0, MAX_HISTORY_ITEMS);
          }
        });
      }
    }
  }, [messages, currentChatId]);

  const startNewChat = () => {
    setMessages([]);
    setThreadId(null);
    setCurrentChatId(`chat_${Date.now()}`);
  };

  const loadHistoryItem = (historyItem) => {
    // Start a new chat and send the first message from history
    setMessages([]);
    setThreadId(null);
    setCurrentChatId(historyItem.id);
    // Send the original first message
    sendMessage(historyItem.firstMessage);
  };

  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Initialize chat ID if this is the first message
    if (!currentChatId) {
      setCurrentChatId(`chat_${Date.now()}`);
    }

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

  return {
    messages,
    loading,
    sendMessage,
    chatHistory,
    startNewChat,
    loadHistoryItem,
    clearHistory,
    currentChatId
  };
};
