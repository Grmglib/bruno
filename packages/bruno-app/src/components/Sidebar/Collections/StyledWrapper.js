import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;

  .collections-list {
    flex: 1 1 0%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .collections-list.drop-target-root {
    outline: 1px dashed var(--color-border-strong);
    outline-offset: -2px;
  }

  .root-drop-hint {
    margin: 0 8px 6px;
    padding: 6px 8px;
    border: 1px dashed var(--color-border);
    border-radius: 4px;
    font-size: 11px;
    color: var(--color-text-muted);
    text-align: center;

    &.active {
      border-color: var(--color-border-strong);
      color: var(--color-text);
      background: var(--color-bg-subtle);
    }
  }
`;

export default Wrapper;
