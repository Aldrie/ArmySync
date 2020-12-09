import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.palette.surface.main};
  padding: 44px 128px;
`;

export const Color = styled.div`
  width: 8vw;
  height: 8vw;
  border-radius: 164px;
  background: #222;
  box-shadow: 0 0 16px #222;
`;
