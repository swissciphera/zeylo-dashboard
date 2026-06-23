import { NavLink } from 'react-router-dom';
import { LucideIcon, PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUi } from '@/stores/ui';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function Sidebar({
  items,
  badge,
  logoFull,
  logoIcon,
}: {
  items: NavItem[];
  badge: string; // small label under the logo, e.g. "Plateforme" / "Espace pro"
  // Optional custom branding (e.g. admin platform). When provided, replaces
  // the default Zeylo mark + badge.
  logoFull?: React.ReactNode;
  logoIcon?: React.ReactNode;
}) {
  const { sidebarCollapsed, toggleSidebar } = useUi();

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-white transition-all duration-300 lg:flex',
        sidebarCollapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 items-center gap-3 border-b border-line px-4',
          sidebarCollapsed && 'justify-center px-0',
        )}
      >
        {logoFull || logoIcon ? (
          sidebarCollapsed ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              {logoIcon}
            </div>
          ) : (
            <div className="flex items-center text-ink">{logoFull}</div>
          )
        ) : (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current">
                <path d="M9 9h14l-9 8h9v6H9l9-8H9z" />
              </svg>
            </div>
            {!sidebarCollapsed && (
              <div className="leading-tight">
                <div className="text-[15px] font-bold tracking-tight text-ink">
                  Zeylo
                </div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                  {badge}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-slim">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={sidebarCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                sidebarCollapsed && 'justify-center px-0',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive ? 'text-brand-600' : 'text-ink-faint group-hover:text-ink-soft',
                  )}
                />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-line p-3">
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-surface-muted hover:text-ink',
            sidebarCollapsed && 'justify-center px-0',
          )}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
