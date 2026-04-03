import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './app';
import { registerBuiltinEffects } from '../domains/effects';

registerBuiltinEffects();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
