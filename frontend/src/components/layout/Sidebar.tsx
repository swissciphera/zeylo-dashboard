import { NavLink } from 'react-router-dom';
import { LucideIcon, PanelLeftClose, PanelLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useUi } from '@/stores/ui';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Smooth collapse: the rail width springs; icons stay put (they only re-center),
// and labels are absolutely positioned so they just fade — never reflow/truncate.
const WIDTH = { expanded: 256, collapsed: 76 };
const widthTransition = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 } as const;
const fade = { duration: 0.15, ease: [0.4, 0, 0.2, 1] } as const;

// Absolute label that fades in/out without affecting the icon's position.
function Label({
  collapsed,
  children,
  className,
}: {
  collapsed: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={fade}
          className={cn(
            'pointer-events-none absolute left-[42px] whitespace-nowrap',
            className,
          )}
        >
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Sidebar({
  items,
  badge,
  logoFull,
  logoIcon,
}: {
  items: NavItem[];
  badge: string;
  logoFull?: React.ReactNode;
  logoIcon?: React.ReactNode;
}) {
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUi();
  const customLogo = Boolean(logoFull || logoIcon);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? WIDTH.collapsed : WIDTH.expanded }}
      transition={widthTransition}
      className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-line bg-white lg:flex"
    >
      {/* Brand */}
      <div
        className={cn(
          'relative flex h-16 items-center border-b border-line',
          collapsed ? 'justify-center px-0' : 'px-4',
        )}
      >
        {customLogo ? (
          <AnimatePresence initial={false} mode="wait">
            {collapsed ? (
              <motion.div
                key="logo-icon"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={fade}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm"
              >
                {logoIcon}
              </motion.div>
            ) : (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={fade}
                className="flex items-center text-ink"
              >
                {logoFull}
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current">
                <path d="M9 9h14l-9 8h9v6H9l9-8H9z" />
              </svg>
            </div>
            <Label collapsed={collapsed} className="left-[64px] leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-ink">
                Zeylo
              </span>
              <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                {badge}
              </span>
            </Label>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-slim">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex h-[42px] items-center rounded-xl text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
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
                    isActive
                      ? 'text-brand-600'
                      : 'text-ink-faint group-hover:text-ink-soft',
                  )}
                />
                <Label collapsed={collapsed}>{item.label}</Label>
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
            'relative flex h-[42px] w-full items-center rounded-xl text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink',
            collapsed ? 'justify-center px-0' : 'px-3',
          )}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={fade}
            className="shrink-0"
          >
            {collapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
          </motion.span>
          <Label collapsed={collapsed}>Réduire</Label>
        </button>
      </div>
    </motion.aside>
  );
}
