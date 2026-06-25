import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .modal-description {
    color: ${(props) => props.theme.text};
    margin-bottom: 12px;

    strong {
      font-weight: 600;
    }
  }

  .collection-info-card {
    background-color: ${(props) => props.theme.modal.title.bg};
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .collection-name {
    font-weight: 500;
    padding-left: 0 !important;
    color: ${(props) => props.theme.text};
    margin-bottom: 4px;
    cursor: default !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover {
      background: none !important;
    }
  }

  .collection-path {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    word-break: break-all;
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

  .warning-icon {
    color: ${(props) => props.theme.status.warning.text};
  }

  .draft-list-item {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .transient-hint {
    color: ${(props) => props.theme.colors.text.warning};
  }

  .transient-item {
    background-color: ${(props) => props.theme.background.surface0};
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: 4px;
  }

  .transient-item-name {
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;
