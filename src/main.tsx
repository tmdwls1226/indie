import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadManifest } from './assets/assets';
import './styles.css';
import './town.css';

void loadManifest();
// Pick up newly added art when returning to the tab, without a manual reload.
window.addEventListener('focus', () => { void loadManifest(); });
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
