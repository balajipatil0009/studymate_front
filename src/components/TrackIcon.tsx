import {
  Atom,
  BookOpen,
  Braces,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  Layers,
  Palette,
  Route,
  Server,
  Terminal,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  html: Code2,
  css: Palette,
  js: Braces,
  javascript: Braces,
  ts: FileCode2,
  typescript: FileCode2,
  react: Atom,
  next: Layers,
  nextjs: Layers,
  node: Server,
  nodejs: Server,
  express: Route,
  mongo: Database,
  mongodb: Database,
  sql: Database,
  postgres: Database,
  git: GitBranch,
  python: Terminal,
};

const normalize = (id?: string | null) => (id ?? '').trim().toLowerCase().replace(/^p-/, '');

/** Maps backend track ids (html, react, …) to Lucide icons instead of emoji. */
export function TrackIcon({
  id,
  size = 20,
  className,
  strokeWidth = 1.8,
}: {
  id?: string | null;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Component = ICONS[normalize(id)] ?? BookOpen;
  return <Component size={size} className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
