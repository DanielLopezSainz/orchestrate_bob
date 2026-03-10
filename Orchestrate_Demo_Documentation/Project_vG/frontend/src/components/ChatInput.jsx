/**
 * frontend/src/components/ChatInput.jsx
 * * ARCHITECTURE: DUMB COMPONENT
 * AI AGENT NOTE: This component handles local input typing state only. It triggers 
 * the onSend prop (passed from useChat.js) to communicate with the backend. 
 * Placeholder text is dynamically loaded from config.json.
 */

import { useState } from 'react';
import { TextInput, Button } from '@carbon/react';
import Send from '@carbon/icons-react/lib/Send';

export function ChatInput({ onSend, disabled, config }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText(''); 
    }
  };

  return (
    <div className="chat-input-wrapper">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <TextInput
          id="chat-input"
          labelText="Chat Input"
          hideLabel
          placeholder={config.app.inputPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        <Button
          type="submit"
          renderIcon={Send}
          hasIconOnly
          iconDescription="Send message"
          disabled={disabled || !text.trim()}
          size="lg"
        />
      </form>
    </div>
  );
}
