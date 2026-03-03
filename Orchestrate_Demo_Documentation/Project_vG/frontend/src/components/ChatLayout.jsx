// frontend/src/components/ChatLayout.jsx
import { Content, Theme } from '@carbon/react';

export function ChatLayout({ children }) {
  return (
    <Theme theme="g10">
      <Content style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        backgroundColor: '#ffffff'
      }}>
        {children}
      </Content>
    </Theme>
  );
}
