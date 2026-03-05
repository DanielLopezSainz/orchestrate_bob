import React from 'react';
import { Header, HeaderName, Tag } from '@carbon/react';

export const ChatHeader = () => {
  // Update this string to match your GitHub Build Number (e.g., #31)
  const CURRENT_BUILD = "v2.1-BUILD-31-FORCE-SYNC"; 

  return (
    <Header aria-label="IBM Watsonx UI">
      <HeaderName href="#" prefix="IBM">
        Watsonx Orchestrate UI Demo
      </HeaderName>
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
        <Tag type="green" size="sm">
          {CURRENT_BUILD}
        </Tag>
      </div>
    </Header>
  );
};
