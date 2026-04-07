import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';

export function useAuth() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const signIn = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    login(data.user);
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

  return { user, isAuthenticated, signIn, signOut };
}
