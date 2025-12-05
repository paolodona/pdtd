/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { App } from './App';
import { Login } from './pages/Login';
import { Notes } from './pages/Notes';
import { Settings } from './pages/Settings';
import './styles/global.css';

const root = document.getElementById('root');

if (root) {
  render(
    () => (
      <Router root={App}>
        <Route path="/login" component={Login} />
        <Route path="/" component={Notes} />
        <Route path="/settings" component={Settings} />
      </Router>
    ),
    root
  );
}
