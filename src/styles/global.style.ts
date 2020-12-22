import { createGlobalStyle } from 'styled-components';

import Roboto from './Roboto.ttf';

export const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: 'Roboto';
    src: url(${Roboto}) format('ttf');
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    outline: none;
    color: ${({ theme }) => theme.palette.surface.contrastColor};
    font-family: Roboto, Arial, Helvetica, sans-serif;
  }

  *::-webkit-scrollbar {
    height: 4px;
    width: 4px;
    padding: 12px 0;
  }
  
  *::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.palette.additional.scrollbar};
    border-radius: 6px;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
  }
`;
