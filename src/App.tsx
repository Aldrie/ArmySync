import React from 'react';
import { render } from 'react-dom';
import { ThemeProvider } from 'styled-components';
import PlayerPage from './pages/Player';
import EditorPage from './pages/Editor';
import { GlobalStyle } from './styles/global.style';

import darkTheme from './styles/themes/dark.theme';

const mainElement = document.createElement('div');
mainElement.setAttribute('id', 'root');
document.body.appendChild(mainElement);

const App = () => (
  <ThemeProvider theme={darkTheme}>
    <GlobalStyle />
    <EditorPage />
  </ThemeProvider>
);

render(<App />, mainElement);
