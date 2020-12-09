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
      additional: {
        playerBackground: string;
      }
    }
  }
}
