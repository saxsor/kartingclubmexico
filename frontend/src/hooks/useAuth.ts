import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';

export function useAuth() {
  const { user, token, isAuthenticated, login, logout } = useAuthStore();

  const signIn = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    login(data.user, data.token, data.refreshToken);
    return data.user;
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore errors on logout
    } finally {
      logout();
    }
  };

  return { user, token, isAuthenticated, signIn, signOut };
}
