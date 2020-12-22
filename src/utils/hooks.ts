import { useState } from 'react';

export const useForceRender = () => {
  const [, setValue] = useState(0); // integer state
  return () => setValue((old) => old + 1); // update the state to force render
};
