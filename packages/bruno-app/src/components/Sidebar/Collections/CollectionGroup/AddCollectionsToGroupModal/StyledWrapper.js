import styled from 'styled-components';

const StyledWrapper = styled.div`
  .modal-help {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 12px;
  }

  .empty-message {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .select-all-row,
  .collection-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    cursor: pointer;
    user-select: none;
  }

  .select-all-row {
    border-bottom: 1px solid ${(props) => props.theme.border.border0};
    margin-bottom: 4px;
    padding-bottom: 8px;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
  }

  .collection-list {
    max-height: 280px;
    overflow-y: auto;
  }

  .collection-section + .collection-section {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid ${(props) => props.theme.border.border0};
  }

  .section-header {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.02em;
    margin-bottom: 4px;
    padding: 0 0 2px;
  }

  .collection-row {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};
  }

  .collection-name {
    flex: 1;
    min-width: 0;
  }

  .collection-folder {
    flex-shrink: 0;
    max-width: 45%;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  input[type='checkbox'] {
    flex-shrink: 0;
  }
`;

export default StyledWrapper;
