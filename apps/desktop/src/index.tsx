/* @refresh reload */
import { render } from 'solid-js/web';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { App } from './App';
import { LogsPage } from './pages/LogsPage';
import './styles/global.css';

const root = document.getElementById('root');

if (root) {
  // Check which window we're in and render the appropriate component
  const windowLabel = getCurrentWindow().label;

  if (windowLabel === 'logs') {
    render(() => <LogsPage />, root);
  } else {
    render(() => <App />, root);
  }
}
