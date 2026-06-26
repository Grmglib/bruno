import styled from 'styled-components';

const StyledWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(props) => (props.$size ? `${props.$size}px` : 'auto')};
  height: ${(props) => (props.$size ? `${props.$size}px` : 'auto')};

  .collection-icon-fallback {
    display: inline-block;
  }

  .custom-collection-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  .custom-collection-image {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }
`;

export default StyledWrapper;
