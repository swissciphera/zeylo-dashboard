import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (p: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
}

// Factory so admin and client each get an isolated, separately-persisted store.
function createAuthStore(storageKey: string) {
  return create<AuthState>()(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        user: null,
        setAuth: ({ accessToken, refreshToken, user }) =>
          set({ accessToken, refreshToken, user }),
        setUser: (user) => set({ user }),
        clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      }),
      { name: storageKey },
    ),
  );
}

// Two strictly separated identity stores.
export const useAdminAuth = createAuthStore('zeylo_admin_auth');
export const useClientAuth = createAuthStore('zeylo_client_auth');
