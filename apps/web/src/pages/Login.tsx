import { Component, createEffect, onMount } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { authStore } from '../stores/auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const Login: Component = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  onMount(() => {
    // Check if already authenticated
    if (authStore.checkAuth()) {
      navigate('/', { replace: true });
    }
  });

  // Handle OAuth callback
  createEffect(async () => {
    const code = searchParams.code;
    if (code) {
      try {
        const redirectUri = `${window.location.origin}/login`;
        await authStore.login(code, redirectUri);
        navigate('/', { replace: true });
      } catch (e) {
        console.error('Login failed:', e);
      }
    }
  });

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Google Client ID not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/login`;
    const scope = 'openid email profile';
    const responseType = 'code';

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', responseType);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    window.location.href = authUrl.toString();
  };

  return (
    <div class="login-page">
      <div class="login-container">
        <div class="login-header">
          <h1>PDTodo</h1>
          <p>A minimalist lightning-fast distributed TODO app</p>
        </div>

        {authStore.error() && (
          <div class="login-error">
            {authStore.error()}
          </div>
        )}

        {authStore.isLoading() ? (
          <div class="login-loading">Signing in...</div>
        ) : (
          <button class="google-login-btn" onClick={handleGoogleLogin}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        )}

        <p class="login-footer">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
