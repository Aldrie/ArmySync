import { useState } from 'react';

export const useForceRender = () => {
  const [, setValue] = useState(false);
  return () => setValue((old) => !old);
};
