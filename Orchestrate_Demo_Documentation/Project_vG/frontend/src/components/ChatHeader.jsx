// frontend/src/components/ChatHeader.jsx
import { Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Tag } from '@carbon/react';
import { Logout } from '@carbon/icons-react';

export function ChatHeader() {
  const APP_VERSION = "v2.0-MODULAR-AUTH"; // Increment this for every push!

  return (
    <Header aria-label="Watsonx Agent">
      <HeaderName href="/" prefix="IBM">
        Watsonx Orchestrate UI
      </HeaderName>
      {/* Visual Version Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
        <Tag type="green" size="sm">{APP_VERSION}</Tag>
      </div>
      <HeaderGlobalBar>
        <HeaderGlobalAction aria-label="Logout" onClick={() => window.location.href = '/auth/logout'}>
          <Logout size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );
}