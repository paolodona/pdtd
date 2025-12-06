import { createSignal, createRoot } from 'solid-js';
import { api, User } from '../lib/api';

function createAuthStore() {
  const [user, setUser] = createSignal<User | null>(api.getUser());
  const [isAuthenticated, setIsAuthenticated] = createSignal(api.isAuthenticated());
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const login = async (code: string, redirectUri: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const auth = await api.googleAuth(code, redirectUri);
      setUser(auth.user);
      setIsAuthenticated(true);
      return auth;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Login failed';
      setError(message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const checkAuth = () => {
    const authenticated = api.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (authenticated) {
      setUser(api.getUser());
    } else {
      setUser(null);
    }
    return authenticated;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkAuth,
  };
}

export const authStore = createRoot(createAuthStore);
