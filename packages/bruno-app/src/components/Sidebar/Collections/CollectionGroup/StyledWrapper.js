import styled from 'styled-components';

const Wrapper = styled.div`
  border-radius: 4px;

  &.drop-target {
    background-color: var(--color-bg-hover);
    outline: 1px dashed var(--color-border-strong);
    outline-offset: -1px;
  }

  .collection-group-header {
    padding-left: 4px;
    padding-right: 4px;
    border-radius: 4px;
  }

  .collection-group-header.drop-target {
    outline-offset: -2px;
  }

  .collection-group-row {
    border-radius: 4px;
  }

  .collection-group-children {
    padding-left: 8px;
  }

  .collection-group-children.has-entries {
    min-height: 12px;
    padding-bottom: 4px;
    border-radius: 4px;
  }

  .collection-group-children.has-entries.drop-target {
    background-color: var(--color-bg-hover);
    outline: 1px dashed var(--color-border-strong);
    outline-offset: -1px;
  }

  .empty-drop-zone {
    min-height: 36px;
    margin-left: 8px;
    margin-right: 4px;
    border-radius: 4px;
  }

  .empty-drop-zone.drop-target {
    background-color: var(--color-bg-hover);
    outline: 1px dashed var(--color-border-strong);
  }

  .empty-folder-hint,
  .collapsed-drop-hint {
    pointer-events: none;
  }
`;

export default Wrapper;
