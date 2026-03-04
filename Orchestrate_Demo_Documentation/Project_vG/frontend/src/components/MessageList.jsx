import React, { useEffect, useRef } from 'react';
import { InlineLoading } from '@carbon/react';
import { User, Bot } from '@carbon/icons-react';

export const MessageList = ({ messages, isLoading }) => {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="message-list">
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
            <InlineLoading description="Watsonx is thinking..." />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
};
