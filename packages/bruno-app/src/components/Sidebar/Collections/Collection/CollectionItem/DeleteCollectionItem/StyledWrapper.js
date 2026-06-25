import styled from 'styled-components';
import { rgba } from 'polished';

const Wrapper = styled.div`
  button.submit {
    color: white;
    background-color: var(--color-background-danger) !important;
    border: inherit !important;

    &:hover {
      border: inherit !important;
    }
  }

  .modal-description {
    color: ${(props) => props.theme.text};
    margin-bottom: 12px;
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
