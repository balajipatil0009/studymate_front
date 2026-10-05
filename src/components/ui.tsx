import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/* ---------------- layout bits ---------------- */

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="loading" />;
}

/* ---------------- search & chips ---------------- */

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <Icon name="search" size={17} className="icon" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="icon-btn icon-btn--muted"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </label>
  );
}

export interface ChipOption {
  id: string;
  label: string;
}

export function ChipRow({
  options,
  value,
  onChange,
}: {
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="chips" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={opt.id === value}
          className={`chip${opt.id === value ? ' active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- ratings ---------------- */

export function StaticStars({ value }: { value: number }) {
  return (
    <span className="stars stars--static" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`star${n <= Math.round(value) ? ' on' : ''}`}>
          ★
        </span>
      ))}
    </span>
  );
}

export function InteractiveStars({
  value,
  onRate,
  busy = false,
}: {
  value: number;
  onRate: (stars: number) => void;
  busy?: boolean;
}) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star${n <= value ? ' on' : ''}`}
          disabled={busy}
          onClick={() => onRate(n)}
          aria-label={`Rate ${n} stars`}
        >
          ★
        </button>
      ))}
      {value > 0 && <span className="rating-value">{value.toFixed(1)}</span>}
    </span>
  );
}

/* ---------------- pills ---------------- */

export function KindPill({ kind }: { kind: string }) {
  const label = kind.toUpperCase();
  const cls =
    kind === 'video' ? 'pill--video' : kind === 'audio' ? 'pill--audio' : 'pill--text';
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function AccessPill({ access }: { access?: string }) {
  if (!access) return null;
  return (
    <span className={`pill ${access === 'free' ? 'pill--free' : 'pill--paid'}`}>
      {access.toUpperCase()}
    </span>
  );
}

export function TimePill({ minutes }: { minutes?: number | null }) {
  if (!minutes) return null;
  return (
    <span className="pill pill--time">
      <Icon name="clock" size={11} /> {minutes} min
    </span>
  );
}

/* ---------------- buttons ---------------- */

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'paused' | 'green' | 'danger' | 'ghost' | 'soft';
  block?: boolean;
  large?: boolean;
}

export function Btn({
  variant = 'soft',
  block,
  large,
  className = '',
  children,
  ...rest
}: BtnProps) {
  const cls = [
    'btn',
    variant !== 'soft' ? `btn--${variant}` : '',
    block ? 'btn--block' : '',
    large ? 'btn--lg' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

export function CircleBtn({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="circle-btn" aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function MiniBtn({
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`mini-btn ${className}`} {...rest}>
      {children}
    </button>
  );
}

/* ---------------- feedback ---------------- */

export function PBar({ pct, large }: { pct: number; large?: boolean }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`pbar${large ? ' pbar--lg' : ''}`} role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className="pbar__fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function EncourageCard({ body }: { body?: string }) {
  return (
    <div className="encourage">
      <div className="encourage__icon">✨</div>
      <div>
        <div className="encourage__title">Keep going!</div>
        <div className="encourage__body">
          {body ?? "Your future self is already thanking you — stay consistent and watch the magic unfold."}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon = '🌱', title, body }: { icon?: string; title: string; body?: string }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 34, marginBottom: 6 }}>{icon}</div>
      <div className="empty__title">{title}</div>
      {body && <div className="tiny">{body}</div>}
    </div>
  );
}

export function ErrorCard({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  title?: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-card">
      <h3>{title}</h3>
      <p>{body}</p>
      {onRetry && (
        <Btn variant="primary" onClick={onRetry}>
          Try again
        </Btn>
      )}
    </div>
  );
}

export function StatTile({
  icon,
  label,
  value,
  alt,
}: {
  icon: IconName;
  label: string;
  value: string;
  alt?: boolean;
}) {
  return (
    <div className="stat-tile">
      <div className={`stat-tile__icon${alt ? ' alt' : ''}`}>
        <Icon name={icon} size={19} />
      </div>
      <div>
        <div className="stat-tile__label">{label}</div>
        <div className="stat-tile__value">{value}</div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { id: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={opt.id === value}
          disabled={disabled}
          className={`seg__btn${opt.id === value ? ' active' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.icon && <Icon name={opt.icon} size={16} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="dialog-overlay" onClick={onCancel} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>{title}</h3>
        {body && <p>{body}</p>}
        <div className="dialog__actions">
          <Btn variant="ghost" onClick={onCancel}>
            Cancel
          </Btn>
          <Btn variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
