import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'Roboto';
    src: url('./Roboto-Regular.ttf');
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    outline: none;
    color: ${({ theme }) => theme.palette.surface.contrastColor};
    font-family: Roboto, Arial, Helvetica, sans-serif;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
  }
`;
