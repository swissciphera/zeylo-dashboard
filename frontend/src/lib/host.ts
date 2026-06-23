// Distinguish the main dashboard host from a client's connected custom domain.
// VITE_APP_HOST is the dashboard hostname (e.g. dashboard.ciphera.ch).
const MAIN_HOST = (import.meta.env.VITE_APP_HOST || '').toLowerCase().trim();

export function isCustomDomain(): boolean {
  if (!MAIN_HOST) return false; // not configured → single-host behaviour
  const h = (window.location.hostname || '').toLowerCase();
  if (!h || h === 'localhost' || h === '127.0.0.1') return false;
  if (h === MAIN_HOST || h === `www.${MAIN_HOST}`) return false;
  // Raw IPs are treated as the main host (direct server access).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
  return true;
}
