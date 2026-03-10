/**
 * frontend/src/components/ChatLayout.jsx
 * * ARCHITECTURE: THEME WRAPPER
 * This component strictly manages the Carbon UI shell. It applies the dark theme (g100)
 * to the Header and the light theme (g10) to the chat canvas.
 */

import { Content, Theme } from '@carbon/react';
import { ChatHeader } from './ChatHeader';
import { ChatHistoryPanel } from './ChatHistoryPanel';

export function ChatLayout({
  children,
  config,
  historyOpen,
  onToggleHistory,
  chatHistory,
  onSelectHistory,
  onNewChat,
  onClearHistory
}) {
  return (
    <div className="app-layout">
      {/* Dark Theme for standard Carbon Shell Header */}
      <Theme theme="g100">
        <ChatHeader config={config} onToggleHistory={onToggleHistory} />
      </Theme>
      
      {/* Chat History Panel */}
      <ChatHistoryPanel
        open={historyOpen}
        onClose={onToggleHistory}
        chatHistory={chatHistory}
        onSelectHistory={onSelectHistory}
        onNewChat={onNewChat}
        onClearHistory={onClearHistory}
        config={config}
      />
      
      {/* Light Theme for the Chat Canvas */}
      <Theme theme="g10" className="app-main-theme">
        <Content className="app-content">
          {children}
        </Content>
      </Theme>
    </div>
  );
}
