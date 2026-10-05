/**
 * Minimal inline SVG icon set (Material/Feather-style geometry) so the app
 * ships with zero icon dependencies. Stroke follows the current color.
 */

export type IconName =
  | 'graduation'
  | 'clock'
  | 'book'
  | 'chart'
  | 'checkCircle'
  | 'search'
  | 'plus'
  | 'close'
  | 'chevronLeft'
  | 'chevronRight'
  | 'play'
  | 'pause'
  | 'restart'
  | 'user'
  | 'flame'
  | 'calendar'
  | 'leaf'
  | 'flask'
  | 'external'
  | 'flag'
  | 'award'
  | 'sun';

const PATHS: Record<IconName, React.ReactNode> = {
  graduation: (
    <>
      <path d="M22 10 12 5 2 10l10 5 10-5Z" />
      <path d="M6 12.5V17c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  chart: (
    <>
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </>
  ),
  checkCircle: (
    <>
      <path d="M21.5 11.1V12a9.5 9.5 0 1 1-5.6-8.7" />
      <path d="m21.5 5-9.3 9.3-2.9-2.9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.6-4.6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  play: <path d="M7 4.5v15l13-7.5-13-7.5Z" />,
  pause: (
    <>
      <path d="M8 4.5v15" />
      <path d="M16 4.5v15" />
    </>
  ),
  restart: (
    <>
      <path d="M2.5 4.5v6h6" />
      <path d="M3.6 15a9 9 0 1 0 2.2-9.4L2.5 8.4" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-1.8A4.2 4.2 0 0 0 15.8 15H8.2A4.2 4.2 0 0 0 4 19.2V21" />
      <circle cx="12" cy="7.5" r="4" />
    </>
  ),
  flame: (
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
      <path d="M16 2.5v4" />
      <path d="M8 2.5v4" />
      <path d="M3 10.5h18" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 20.5A7.5 7.5 0 0 1 9.8 6.1C15.6 5 17 4.4 19 1.8c1 2.1 2 4.3 2 8.2 0 5.7-4.9 10.5-10 10.5Z" />
      <path d="M2 22c0-3.1 1.9-5.5 5.1-6.6" />
    </>
  ),
  flask: (
    <>
      <path d="M9 2.5h6" />
      <path d="M10 2.5v6.2L4.8 18a2.2 2.2 0 0 0 1.9 3.3h10.6a2.2 2.2 0 0 0 1.9-3.3L14 8.7V2.5" />
      <path d="M7.4 14.5h9.2" />
    </>
  ),
  external: (
    <>
      <path d="M18 13.5V6a2 2 0 0 0-2-2H6" />
      <path d="m14 8 8-4" />
      <path d="M20 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" />
    </>
  ),
  flag: (
    <>
      <path d="M4.5 15.5s1-1 4-1 5 2 8 2 4-1 4-1V3.5s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
      <path d="M4.5 22.5v-16" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6.5" />
      <path d="m8.4 14.5-1.4 8 5-3 5 3-1.4-8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 1.5v2.5M12 20v2.5M4.2 4.2 6 6M18 18l1.8 1.8M1.5 12H4M20 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </>
  ),
};

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
}

export function Icon({ name, size = 20, className, strokeWidth = 1.9, fill = false }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
