import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Surface ALL uncaught errors on screen so we can see them
const errBox = document.createElement('div');
errBox.id = 'global-err';
errBox.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#1a0000;color:#ff8080;font:12px monospace;padding:8px;max-height:200px;overflow:auto;display:none;white-space:pre-wrap;word-break:break-all;';
document.body.appendChild(errBox);

function showErr(msg: string) {
  errBox.style.display = 'block';
  errBox.textContent += msg + '\n';
}

window.addEventListener('error', (e) => showErr(`ERROR: ${e.message}\n  ${e.filename}:${e.lineno}`));
window.addEventListener('unhandledrejection', (e) => showErr(`PROMISE: ${String(e.reason)}`));
console.error = (...args) => { showErr('console.error: ' + args.map(String).join(' ')); };

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <App />
    </HashRouter>
  </QueryClientProvider>
);
