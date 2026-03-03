// frontend/src/components/MessageList.jsx
import { InlineLoading } from '@carbon/react';

export function MessageList({ messages, isLoading }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%'
          }}>
            <div style={{
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: msg.role === 'user' ? '#0f62fe' : '#f4f4f4',
              color: msg.role === 'user' ? '#ffffff' : '#161616',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {/* Using white-space: pre-wrap to preserve formatting/line breaks from the AI */}
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
            </div>
          </div>
        ))}

        {/* This appears only while the 'loading' state is true */}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '1rem' }}>
            <InlineLoading
              description="Watsonx is thinking..."
              status="active"
            />
          </div>
        )}
      </div>
    </div>
  );
}