import './App.scss';
import { ChatLayout } from './components/ChatLayout';
import { MessageList } from './components/MessageList';
import { ChatInput } from './components/ChatInput';
import { useChat } from './hooks/useChat';

function App() {
  const { messages, loading, sendMessage } = useChat();

  return (
    <ChatLayout>
      <MessageList messages={messages} isLoading={loading} />
      <ChatInput onSend={sendMessage} disabled={loading} />
    </ChatLayout>
  );
}

export default App;
