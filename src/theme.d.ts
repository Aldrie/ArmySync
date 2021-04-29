import 'styled-components';
import theme from './styles/themes/dark.theme';

interface IPalette {
  main: string;
  contrastColor: string;
}

export type Theme = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}
}
