import styled from 'styled-components';

const Wrapper = styled.div`
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .sidebar-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    flex: 0 0 auto;
    background: ${({ theme }) => theme.sidebar.bg};
  }

  .sidebar-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    opacity: 0.82;
    font-size: 12px;
    font-weight: 500;
    padding: 6px 10px;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;

    &:hover {
      opacity: 1;
      background: ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    }
  }

  .sidebar-tab.active {
    opacity: 1;
    font-weight: 600;
    border-color: ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    background: ${({ theme }) => theme.sidebar.collection.item.hoverBg};
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
  }

  .sidebar-tab-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    line-height: 1;
  }

  .sidebar-tab-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
`;

export default Wrapper;
