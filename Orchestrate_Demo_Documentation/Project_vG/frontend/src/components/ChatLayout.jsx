// frontend/src/components/ChatLayout.jsx
import { Content, Theme } from '@carbon/react';

export function ChatLayout({ children }) {
  return (
    <Theme theme="g10">
      <Content style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        padding: 0, // Removes default Carbon padding that pushes content away
        margin: 0,
        overflow: 'hidden', // Prevents the whole page from scrolling
        backgroundColor: '#f4f4f4'
      }}>
        {children}
      </Content>
    </Theme>
  );
}
