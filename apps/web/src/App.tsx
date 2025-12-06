import { Component, JSX, createEffect, Show } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { authStore } from './stores/auth';

interface AppProps {
  children?: JSX.Element;
}

export const App: Component<AppProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  createEffect(() => {
    const isAuthenticated = authStore.isAuthenticated();
    const isLoginPage = location.pathname === '/login';

    if (!isAuthenticated && !isLoginPage) {
      navigate('/login', { replace: true });
    }
  });

  return (
    <div class="app">
      <Show
        when={authStore.isAuthenticated() || location.pathname === '/login'}
        fallback={<div class="loading">Loading...</div>}
      >
        {props.children}
      </Show>
    </div>
  );
};
