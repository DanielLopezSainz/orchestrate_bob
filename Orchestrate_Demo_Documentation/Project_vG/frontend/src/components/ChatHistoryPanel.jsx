/**
 * frontend/src/components/ChatHistoryPanel.jsx
 * * ARCHITECTURE: DUMB COMPONENT
 * Displays chat history in a SidePanel using Carbon IBM Products component.
 * Uses StructuredList for displaying history items.
 */

import React from 'react';
import { SidePanel } from '@carbon/ibm-products';
import { 
  StructuredListWrapper, 
  StructuredListHead, 
  StructuredListBody, 
  StructuredListRow, 
  StructuredListCell,
  Button
} from '@carbon/react';
import { History, Add, TrashCan } from '@carbon/icons-react';

export const ChatHistoryPanel = ({ 
  open, 
  onClose, 
  chatHistory, 
  onSelectHistory, 
  onNewChat,
  onClearHistory,
  config 
}) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const actions = [
    {
      label: config.app.newChatButton,
      onClick: () => {
        onNewChat();
        onClose();
      },
      kind: 'primary',
      renderIcon: Add
    },
    {
      label: 'Clear History',
      onClick: onClearHistory,
      kind: 'ghost',
      renderIcon: TrashCan,
      disabled: chatHistory.length === 0
    }
  ];

  return (
    <SidePanel
      open={open}
      onRequestClose={onClose}
      title={config.app.historyPanelTitle}
      subtitle={`${chatHistory.length} conversation${chatHistory.length !== 1 ? 's' : ''}`}
      actions={actions}
      placement="left"
      size="md"
      includeOverlay={false}
      className="chat-history-panel"
    >
      {chatHistory.length === 0 ? (
        <div className="history-empty-state">
          <History size={48} />
          <p>{config.app.historyEmptyMessage}</p>
        </div>
      ) : (
        <StructuredListWrapper selection>
          <StructuredListHead>
            <StructuredListRow head>
              <StructuredListCell head>Recent Conversations</StructuredListCell>
            </StructuredListRow>
          </StructuredListHead>
          <StructuredListBody>
            {chatHistory.map((item) => (
              <StructuredListRow 
                key={item.id}
                onClick={() => {
                  onSelectHistory(item);
                  onClose();
                }}
                className="history-list-item"
              >
                <StructuredListCell>
                  <div className="history-item-content">
                    <div className="history-item-preview">{item.preview}</div>
                    <div className="history-item-meta">
                      <span className="history-item-time">{formatTimestamp(item.timestamp)}</span>
                      <span className="history-item-count">{item.messageCount} messages</span>
                    </div>
                  </div>
                </StructuredListCell>
              </StructuredListRow>
            ))}
          </StructuredListBody>
        </StructuredListWrapper>
      )}
    </SidePanel>
  );
};

// Made with Bob
