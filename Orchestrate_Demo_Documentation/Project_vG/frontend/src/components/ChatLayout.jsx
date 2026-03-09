import { Content, Theme } from '@carbon/react';
import { ChatHeader } from './ChatHeader';

export function ChatLayout({ children }) {
  return (
    <div className="app-layout">
      {/* The Header uses the dark g100 theme */}
      <Theme theme="g100">
        <ChatHeader />
      </Theme>
      
      {/* The main chat interface uses the light g10 theme */}
      <Theme theme="g10" className="app-main-theme">
        <Content className="app-content">
          {children}
        </Content>
      </Theme>
    </div>
  );
}
