import React, { useEffect, useState } from 'react';
import { Header, HeaderName, HeaderGlobalBar, Tag } from '@carbon/react';

export const ChatHeader = () => {
  const FRONTEND_BUILD = "v2.5-UI-POLISH";
  const [backendVersion, setBackendVersion] = useState("Loading...");

  useEffect(() => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => setBackendVersion(data.version))
      .catch(() => setBackendVersion("Unknown Backend"));
  }, []);

  return (
    <Header aria-label="IBM Watsonx UI">
      <HeaderName href="#" prefix="IBM">
        Watsonx Orchestrate UI Demo
      </HeaderName>
      <HeaderGlobalBar style={{ display: 'flex', alignItems: 'center', paddingRight: '1rem', gap: '0.5rem' }}>
        <Tag type="blue" size="sm" title="Frontend Build Version">
          UI: {FRONTEND_BUILD}
        </Tag>
        <Tag type="green" size="sm" title="Backend Server Version">
          API: {backendVersion}
        </Tag>
      </HeaderGlobalBar>
    </Header>
  );
};
