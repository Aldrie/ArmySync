import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  svg {
    margin-top: -5%;
    width: 4vw;
    z-index: 2;
  }
`;

export const Lamp = styled.div`
  position: relative;
  width: 10vw;
  height: 10vw;
  padding: .6vw;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;

  .core {
    border-radius: 50%;
    width: 100%;
    height: 100%;
    background: #fff;
    box-shadow: 0 0 2vw #fff, 0 0 2vw #fff;
  }
`;

export const Cap = styled.div`
  width: 28%;
  height: 6%;
  border-radius: 4px;
  background: #090909;
  position: absolute;
  top: 5%;
  right: 8%;
  transform: rotateZ(32deg);

  &:after {
    content: '';
    display: block;
    height: 28%;
    width: 28%;
    z-index: 1;
    position: absolute;
    top: -25%;
    left: 0;
    right: 0;
    margin: 0 auto;
    border-radius: 4px 4px 0 0;
    background: #6D0B0B;
  }
`;
