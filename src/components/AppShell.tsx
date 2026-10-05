import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { Icon, type IconName } from './Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** emoji used in the mobile tab bar (matches the Flutter app's glyphs) */
  glyph: string;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Timer', icon: 'clock', glyph: '⏳', end: true },
  { to: '/syllabus', label: 'Syllabus', icon: 'book', glyph: '📚' },
  { to: '/performance', label: 'Performance', icon: 'chart', glyph: '📈' },
  { to: '/todo', label: 'To Do', icon: 'checkCircle', glyph: '✅' },
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
  const { pathname } = useLocation();
  const title = pageTitle(pathname);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__mark">
            <Icon name="graduation" size={20} />
          </div>
          <div>
            <div className="sidebar__name">StudyMate</div>
            <div className="sidebar__tag">Learn · Build · Bloom</div>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <span className="nav-link__icon">
                <Icon name={item.icon} size={18} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <span className="avatar" aria-hidden="true">
            {initials(user?.name)}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sidebar__foot-name">{user?.name ?? 'Student'}</div>
            <div className="sidebar__foot-sub">{user?.email ?? ''}</div>
          </div>
          <button type="button" className="icon-btn icon-btn--muted" onClick={logout} title="Sign out" aria-label="Sign out">
            <Icon name="external" size={17} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="brandbar">
          <div className="brandbar__logo">
            <Icon name="graduation" size={20} />
          </div>
          <div className="brandbar__name">StudyMate</div>
          <div className="brandbar__page">{title}</div>
          <span className="avatar" title={user?.email}>
            {initials(user?.name)}
          </span>
        </header>

        <main className="content">{children}</main>
      </div>

      <nav className="tabbar" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="tabbar__item">
            <span className="icon" aria-hidden="true">
              {item.glyph}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
