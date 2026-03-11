/**
 * frontend/src/components/ChatHeader.jsx
 * * ARCHITECTURE: DUMB COMPONENT
 * AI AGENT NOTE: Do not add state or API logic here. This component only displays
 * data passed via the config prop and a simple fetch for the backend version tag.
 */

import React, { useEffect, useState } from 'react';
import { Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, Tag } from '@carbon/react';
import { TimeFilled } from '@carbon/icons-react';

export const ChatHeader = ({ config, onToggleHistory }) => {
  const FRONTEND_BUILD = "v3.1-ICON-FIX";
  const [backendVersion, setBackendVersion] = useState("Loading...");

  useEffect(() => {
    console.log('🎨 ChatHeader: Component mounted with TimeFilled icon');
    console.log('🎨 ChatHeader: Frontend Build:', FRONTEND_BUILD);
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        setBackendVersion(data.version);
        console.log('🎨 ChatHeader: Backend version:', data.version);
      })
      .catch(() => {
        setBackendVersion("Unknown Backend");
        console.error('🎨 ChatHeader: Failed to fetch backend version');
      });
  }, []);

  return (
    <Header aria-label="IBM Watsonx UI">
      <HeaderName href="#" prefix={config.app.headerPrefix}>
        {config.app.headerTitle}
      </HeaderName>
      <HeaderGlobalBar>
        <HeaderGlobalAction
          aria-label="Chat History"
          tooltipAlignment="end"
          onClick={onToggleHistory}
        >
          <TimeFilled size={20} />
        </HeaderGlobalAction>
        <div style={{ display: 'flex', alignItems: 'center', paddingRight: '1rem', gap: '0.5rem' }}>
          <Tag type="blue" size="sm" title="Frontend Build Version">
            UI: {FRONTEND_BUILD}
          </Tag>
          <Tag type="green" size="sm" title="Backend Server Version">
            API: {backendVersion}
          </Tag>
        </div>
      </HeaderGlobalBar>
    </Header>
  );
};
