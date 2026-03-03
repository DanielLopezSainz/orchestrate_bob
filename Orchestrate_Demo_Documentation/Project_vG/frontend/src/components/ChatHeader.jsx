// frontend/src/components/ChatHeader.jsx
import { Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction } from '@carbon/react';
import { Logout } from '@carbon/icons-react';

export function ChatHeader() {
  const handleLogout = () => {
    // This hits our backend logout route (which we'll add to server.js)
    window.location.href = '/auth/logout';
  };

  return (
    <Header aria-label="Watsonx Agent">
      <HeaderName href="/" prefix="IBM">
        Watsonx Orchestrate UI
      </HeaderName>
      <HeaderGlobalBar>
        <HeaderGlobalAction
          aria-label="Logout"
          tooltipAlignment="end"
          onClick={handleLogout}
        >
          <Logout size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );
}