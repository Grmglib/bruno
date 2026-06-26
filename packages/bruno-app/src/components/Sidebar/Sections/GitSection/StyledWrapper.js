import styled from 'styled-components';

const Wrapper = styled.div`
  height: 100%;
  overflow: hidden;

  .git-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: ${({ theme }) => theme.sidebar.bg};
  }

  .git-scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 12px 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .git-scroll-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .git-card {
    border: 1px solid ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    border-radius: 8px;
    padding: 10px;
    background: ${({ theme }) => theme.sidebar.bg};
  }

  .git-card-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .git-card-title.compact {
    margin-bottom: 0;
  }

  .git-muted {
    font-size: 12px;
    opacity: 0.75;
    line-height: 1.45;
  }

  .git-error {
    color: ${({ theme }) => theme.danger || '#ef4444'};
  }

  .meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .meta-label {
    font-size: 12px;
    opacity: 0.8;
  }

  .meta-value {
    font-size: 12px;
    font-weight: 600;
    word-break: break-word;
  }

  .pill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    border: 1px solid ${({ theme }) => theme.sidebar.collection.item.hoverBg};
  }

  .grid-two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .toolbar-actions,
  .git-toolbar-actions,
  .remote-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .git-toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .commit-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .git-input,
  .git-textarea,
  .git-select {
    width: 100%;
    border-radius: 6px;
    border: 1px solid ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    background: transparent;
    color: inherit;
    font-size: 12px;
    padding: 8px 10px;
    outline: none;
  }

  .git-textarea {
    resize: vertical;
    min-height: 56px;
  }

  .git-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .git-section-title {
    font-size: 12px;
    font-weight: 600;
  }

  .changes-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .change-row {
    border: 1px solid ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    border-radius: 6px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.01);
  }

  .change-row-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .change-path {
    font-size: 12px;
    line-height: 1.4;
    word-break: break-word;
    flex: 1;
    min-width: 0;
  }

  .change-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .remote-url {
    font-size: 11px;
    opacity: 0.7;
    word-break: break-all;
  }

  .git-footer {
    flex: 0 0 auto;
    border-top: 1px solid ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: ${({ theme }) => theme.sidebar.bg};
  }

  .git-footer-top,
  .git-footer-bottom {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
  }

  .git-footer-bottom {
    align-items: stretch;
  }

  .branch-summary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    font-weight: 600;
  }

  .branch-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .footer-select {
    min-width: 0;
    flex: 1 1 140px;
  }

  .branch-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    cursor: pointer;
  }

  .branch-dropdown-text {
    display: inline-block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .footer-input {
    min-width: 0;
    flex: 1 1 120px;
  }

  .git-footer-remote {
    font-size: 11px;
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .diff-pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.5;
    padding: 12px;
  }
`;

export default Wrapper;
