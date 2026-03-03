// frontend/src/components/ChatInput.jsx
import { useState } from 'react';
import { TextInput, Button } from '@carbon/react';
import { Send } from '@carbon/icons-react';

export function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText(''); // Clear the input after sending
    }
  };

  return (
    <div style={{ backgroundColor: '#f4f4f4', borderTop: '1px solid #e0e0e0' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '1rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}
      >
        <div style={{ flex: 1 }}>
          <TextInput
            id="chat-input"
            labelText=""
            placeholder="Ask Watsonx..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <Button
          type="submit"
          renderIcon={Send}
          hasIconOnly
          iconDescription="Send message"
          disabled={disabled || !text.trim()}
        />
      </form>
    </div>
  );
}