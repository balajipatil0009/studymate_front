import type { ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  ListChecks,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Timer,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { useTheme } from '../state/ThemeContext';

export interface NavItem {
  to: string;
  label: string;
  lucide: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Timer', lucide: Timer, end: true },
  { to: '/syllabus', label: 'Syllabus', lucide: BookOpen },
  { to: '/performance', label: 'Performance', lucide: BarChart3 },
  { to: '/todo', label: 'To Do', lucide: ListChecks },
];

const pageTitle = (pathname: string) =>
  NAV_ITEMS.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'StudyMate';

const initials = (name?: string) =>
  (name ?? 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || 'S';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const title = pageTitle(pathname);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col gap-6 border-r border-line bg-[var(--app-shell-bg)] px-3.5 py-5 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2.5 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-white shadow-[0_12px_26px_-12px_rgba(99,102,241,0.95)]">
            <GraduationCap size={21} strokeWidth={1.9} />
          </div>
          <div>
            <div className="text-[17px] font-bold tracking-[-0.02em]">StudyMate</div>
            <div className="text-[10.5px] text-faint">Learn · Build · Bloom</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const NavIcon = item.lucide;
            return (
              <NavLink key={item.to} to={item.to} end={item.end}>
                {({ isActive }) => (
                  <span
                    className={`group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-surface-strong text-ink shadow-[var(--shadow-card)]'
                        : 'text-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${
                        isActive
                          ? 'bg-[linear-gradient(135deg,rgba(99,102,241,0.95),rgba(168,85,247,0.85))] text-white shadow-[0_8px_18px_-8px_rgba(99,102,241,0.95)]'
                          : 'bg-surface text-muted group-hover:text-ink'
                      }`}
                    >
                      <NavIcon size={17} strokeWidth={1.9} />
                    </span>
                    {item.label}
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-soft shadow-[0_0_10px_rgba(167,139,250,0.95)]" />
                    )}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-line bg-[linear-gradient(160deg,rgba(99,102,241,0.16),rgba(168,85,247,0.05))] p-3.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-soft">
              <Sparkles size={13} strokeWidth={2} />
              Focus tip
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
              One 25-minute session beats three hours of fragmented attention.
            </p>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface p-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface-strong text-xs font-bold text-brand-soft">
              {initials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{user?.name ?? 'Student'}</div>
              <div className="truncate text-[11px] text-muted">{user?.email ?? ''}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-surface hover:text-ink"
            >
              <LogOut size={16} strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line-soft bg-canvas/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-white">
              <GraduationCap size={19} strokeWidth={1.9} />
            </div>
            <span className="text-[16px] font-bold tracking-[-0.02em]">StudyMate</span>
          </div>

          <div className="hidden items-center gap-2 text-sm lg:flex">
            <span className="text-faint">StudyMate</span>
            <span className="text-faint">/</span>
            <span className="font-semibold text-ink">{title}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-strong hover:text-ink"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11.5px] font-semibold text-muted sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              In focus
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface-strong text-xs font-bold text-brand-soft">
              {initials(user?.name)}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1140px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label="Primary"
        className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-[22px] border border-line bg-[var(--app-shell-bg-strong)] px-2 py-2 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const NavIcon = item.lucide;
          return (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {({ isActive }) => (
                <span
                  className={`flex min-w-[68px] flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                    isActive ? 'bg-surface-strong text-brand-soft' : 'text-faint'
                  }`}
                >
                  <NavIcon size={20} strokeWidth={1.9} />
                  {item.label}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
