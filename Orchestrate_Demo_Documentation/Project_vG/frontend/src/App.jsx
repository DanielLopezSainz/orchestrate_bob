/**
 * frontend/src/App.jsx
 * * ARCHITECTURE: PRESENTATIONAL ROOT
 * This file binds the state logic (useChat) to the visual layer (Carbon components).
 * It also dynamically injects CSS variables based on the config.json file to 
 * ensure the application is completely "white-label" and template-ready.
 */

import './App.scss';
import { ChatLayout } from './components/ChatLayout';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { useChat } from './hooks/useChat';
import appConfig from './config.json'; // 🛡️ Import central template config

function App() {
  const { messages, loading, sendMessage } = useChat();

  // Map JSON theme settings to CSS Custom Properties (Variables)
  const themeStyles = {
    '--theme-user-bubble-bg': appConfig.theme.userBubbleBackground,
    '--theme-user-bubble-text': appConfig.theme.userBubbleText,
    '--theme-user-icon-bg': appConfig.theme.userIconBackground,
    '--theme-user-icon-color': appConfig.theme.userIconColor,
    '--theme-assistant-bubble-bg': appConfig.theme.assistantBubbleBackground,
    '--theme-assistant-bubble-text': appConfig.theme.assistantBubbleText,
    '--theme-assistant-bubble-border': appConfig.theme.assistantBubbleBorder,
  };

  return (
    <div style={themeStyles}>
      <ChatLayout config={appConfig}>
        <MessageList 
          messages={messages} 
          isLoading={loading} 
          config={appConfig} 
        />
        <ChatInput 
          onSend={sendMessage} 
          disabled={loading} 
          config={appConfig} 
        />
      </ChatLayout>
    </div>
  );
}

export default App;
