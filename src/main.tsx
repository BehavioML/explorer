import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui-react/App';
import './ui-react/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
