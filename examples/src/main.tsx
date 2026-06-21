import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

type RootElement = HTMLElement & {
  facenetRoot?: ReturnType<typeof createRoot>;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const facenetRootElement: RootElement = rootElement;
facenetRootElement.facenetRoot ??= createRoot(facenetRootElement);
facenetRootElement.facenetRoot.render(
  <StrictMode>
    <App />
  </StrictMode>
);
