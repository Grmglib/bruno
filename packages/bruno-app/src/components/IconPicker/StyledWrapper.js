import styled from 'styled-components';

const StyledWrapper = styled.div`
  .icon-picker-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .icon-picker-tab {
    border: 1px solid ${(props) => props.theme.dropdown.border};
    border-radius: 0.375rem;
    padding: 0.25rem 0.625rem;
    font-size: 0.75rem;
    cursor: pointer;
    background: transparent;
    color: inherit;

    &.active {
      border-color: ${(props) => props.theme.sidebar.collection.item.focusBorder};
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .icon-picker-search {
    width: 100%;
    margin-bottom: 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid ${(props) => props.theme.dropdown.border};
    border-radius: 0.375rem;
    background: transparent;
    color: inherit;
  }

  .icon-picker-grid {
    height: 320px;
    overflow: auto;
  }

  .icon-picker-row {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .icon-picker-item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    cursor: pointer;
    background: transparent;
    color: inherit;

    &:hover,
    &.selected {
      border-color: ${(props) => props.theme.dropdown.border};
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }
  }

  .icon-picker-empty {
    padding: 2rem 1rem;
    text-align: center;
    color: ${(props) => props.theme.sidebar.muted};
    font-size: 0.875rem;
  }

  .icon-picker-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .icon-picker-help {
    font-size: 0.75rem;
    color: ${(props) => props.theme.sidebar.muted};
  }
`;

export default StyledWrapper;
