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

// Smooth collapse: width springs, labels fade + slide via AnimatePresence.
const WIDTH = { expanded: 256, collapsed: 76 };
const widthTransition = { type: 'spring', stiffness: 320, damping: 34, mass: 0.9 } as const;
const labelTransition = { duration: 0.18, ease: [0.4, 0, 0.2, 1] } as const;

const labelMotion = {
  initial: { opacity: 0, width: 0, marginLeft: 0 },
  animate: { opacity: 1, width: 'auto', marginLeft: 0 },
  exit: { opacity: 0, width: 0, marginLeft: 0 },
  transition: labelTransition,
};

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
  const { sidebarCollapsed, toggleSidebar } = useUi();
  const customLogo = Boolean(logoFull || logoIcon);

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? WIDTH.collapsed : WIDTH.expanded }}
      transition={widthTransition}
      className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-line bg-white lg:flex"
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-16 items-center gap-3 border-b border-line px-4',
          sidebarCollapsed && 'justify-center px-0',
        )}
      >
        {customLogo ? (
          <AnimatePresence initial={false} mode="wait">
            {sidebarCollapsed ? (
              <motion.div
                key="logo-icon"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={labelTransition}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm"
              >
                {logoIcon}
              </motion.div>
            ) : (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={labelTransition}
                className="flex items-center overflow-hidden text-ink"
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
            <AnimatePresence initial={false}>
              {!sidebarCollapsed && (
                <motion.div {...labelMotion} className="overflow-hidden leading-tight">
                  <div className="whitespace-nowrap text-[15px] font-bold tracking-tight text-ink">
                    Zeylo
                  </div>
                  <div className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                    {badge}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            title={sidebarCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
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
                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.span {...labelMotion} className="overflow-hidden whitespace-nowrap">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
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
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink',
            sidebarCollapsed && 'justify-center px-0',
          )}
        >
          <motion.span
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={labelTransition}
            className="shrink-0"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
          </motion.span>
          <AnimatePresence initial={false}>
            {!sidebarCollapsed && (
              <motion.span {...labelMotion} className="overflow-hidden whitespace-nowrap">
                Réduire
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
