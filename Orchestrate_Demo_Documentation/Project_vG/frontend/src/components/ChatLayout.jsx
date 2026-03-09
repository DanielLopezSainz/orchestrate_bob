import { Content, Theme } from '@carbon/react';

export function ChatLayout({ children }) {
  return (
    <Theme theme="g10">
      <Content style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        paddingTop: '3rem', // 🛡️ Fixes the overlap by clearing the 48px Header
        margin: 0,
        overflow: 'hidden', 
        backgroundColor: '#f4f4f4'
      }}>
        {children}
      </Content>
    </Theme>
  );
}
