import 'styled-components';

interface IPalette {
  main: string;
  contrastColor: string;
}

declare module 'styled-components' {
  export interface DefaultTheme {
    palette: {
      primary: IPalette;
      surface: IPalette;
      onSurface: IPalette;
      additional: {
        playerBackground: string;
        divider: string;
        red: string;
      }
    }
  }
}
