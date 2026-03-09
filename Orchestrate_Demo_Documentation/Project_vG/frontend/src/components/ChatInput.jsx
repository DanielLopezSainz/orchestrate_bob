import { useState } from 'react';
import { TextInput, Button } from '@carbon/react';
import { Send } from '@carbon/icons-react';

export function ChatInput({ onSend, disabled }) {
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
          placeholder="Ask Watsonx..."
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
