import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '../app/globals.css';
import { registerBuiltinEffects } from '../domains/effects';

registerBuiltinEffects();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="flex h-dvh items-center justify-center bg-black text-white">
      ArmySync Remote
    </div>
  </StrictMode>,
);
