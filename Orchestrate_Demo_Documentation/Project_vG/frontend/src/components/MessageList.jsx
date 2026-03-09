/**
 * frontend/src/components/MessageList.jsx
 * * ARCHITECTURE: DUMB COMPONENT
 * Renders the array of chat messages. Uses the config file to render the empty 
 * state message if no chat history exists. Handles auto-scrolling to the bottom.
 */

import React, { useEffect, useRef } from 'react';
import { InlineLoading } from '@carbon/react';
import { User, Bot } from '@carbon/icons-react';

export const MessageList = ({ messages, isLoading, config }) => {
  const endRef = useRef(null);

  // Auto-scroll to the bottom whenever messages array updates or loading starts
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <p style={{ color: '#525252', textAlign: 'center', marginTop: '3rem' }}>
          {config.app.welcomeMessage}
        </p>
      )}

      {messages.map((msg, i) => (
        <div key={i} className={`message-row ${msg.role}`}>
          <div className="icon-container">
            {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
          </div>
          <div className="content-bubble">
            {msg.content}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="message-row assistant thinking">
          <div className="icon-container"><Bot size={20} /></div>
          <div className="content-bubble">
            <InlineLoading description={`${config.app.assistantName} is thinking...`} />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
};
