import axios, { AxiosInstance } from 'axios';
import { useAdminAuth, useClientAuth } from '@/stores/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

type AuthStore = typeof useAdminAuth;

interface ApiConfig {
  store: AuthStore;
  refreshPath: string; // e.g. /admin/auth/refresh
  loginPath: string; // where to redirect on hard auth failure
}

// Builds an axios instance bound to one of the two auth stores, with automatic
// access-token injection and one-shot refresh-token rotation on 401.
function createApi({ store, refreshPath, loginPath }: ApiConfig): AxiosInstance {
  const instance = axios.create({ baseURL: BASE_URL });

  instance.interceptors.request.use((config) => {
    const token = store.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  let refreshing: Promise<string | null> | null = null;

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      const status = error.response?.status;
      if (status !== 401 || original?._retry) {
        return Promise.reject(error);
      }
      original._retry = true;

      const refreshToken = store.getState().refreshToken;
      if (!refreshToken) {
        store.getState().clear();
        return Promise.reject(error);
      }

      if (!refreshing) {
        refreshing = axios
          .post(`${BASE_URL}${refreshPath}`, { refreshToken })
          .then((r) => {
            store.getState().setAuth({
              accessToken: r.data.accessToken,
              refreshToken: r.data.refreshToken,
              user: r.data.user ?? store.getState().user!,
            });
            return r.data.accessToken as string;
          })
          .catch(() => {
            store.getState().clear();
            if (typeof window !== 'undefined') {
              window.location.assign(loginPath);
            }
            return null;
          })
          .finally(() => {
            refreshing = null;
          });
      }

      const newToken = await refreshing;
      if (!newToken) return Promise.reject(error);
      original.headers.Authorization = `Bearer ${newToken}`;
      return instance(original);
    },
  );

  return instance;
}

export const adminApi = createApi({
  store: useAdminAuth,
  refreshPath: '/admin/auth/refresh',
  loginPath: '/admin/login',
});

export const clientApi = createApi({
  store: useClientAuth,
  refreshPath: '/auth/refresh',
  loginPath: '/app/login',
});

// Public (no auth) instance for token-based pages.
export const publicApi = axios.create({ baseURL: BASE_URL });

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return 'Une erreur est survenue. Veuillez réessayer.';
}
