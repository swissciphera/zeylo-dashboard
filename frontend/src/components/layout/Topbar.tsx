import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, LogOut, Menu } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useUi } from '@/stores/ui';

export function Topbar({
  userName,
  userEmail,
  subtitle,
  onLogout,
}: {
  userName?: string;
  userEmail?: string;
  subtitle?: string;
  onLogout: () => void;
}) {
  const { toggleSidebar } = useUi();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line bg-white/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-muted lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          placeholder="Rechercher…"
          className="w-full rounded-xl border border-line bg-surface-subtle py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint transition focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="relative rounded-xl p-2.5 text-ink-muted transition hover:bg-surface-muted hover:text-ink">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />
        </button>

        <div className="mx-1 h-6 w-px bg-line" />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 transition hover:bg-surface-muted"
          >
            <Avatar name={userName} size="sm" />
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-semibold text-ink">{userName}</div>
              {subtitle && (
                <div className="text-xs text-ink-faint">{subtitle}</div>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-ink-faint" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 animate-scale-in rounded-xl border border-line bg-white p-1.5 shadow-elevated">
              <div className="px-3 py-2.5">
                <div className="text-sm font-semibold text-ink">{userName}</div>
                <div className="truncate text-xs text-ink-faint">
                  {userEmail}
                </div>
              </div>
              <div className="my-1 h-px bg-line" />
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
