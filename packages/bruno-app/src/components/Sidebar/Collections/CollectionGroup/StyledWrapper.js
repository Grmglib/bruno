import styled from 'styled-components';
import { rgba } from 'polished';

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

    &.is-dragging {
      opacity: 0.5;
    }
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

  .modal-description {
    color: ${(props) => props.theme.text};
    margin-bottom: 12px;

    strong {
      font-weight: 600;
    }
  }

  .folder-summary {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 12px;
  }

  .removal-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .removal-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: 6px;
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;

    &.selected {
      border-color: ${(props) => props.theme.colors.text.danger};
      background-color: ${(props) => rgba(props.theme.colors.text.danger, 0.05)};
    }

    input {
      margin-top: 3px;
      cursor: pointer;
    }
  }

  .removal-option-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 2px;
  }

  .removal-option-description {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .warning-text {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.danger};
    margin-bottom: 0;
  }
`;

export default Wrapper;
