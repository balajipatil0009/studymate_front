import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Sparkles, Sprout, Star } from 'lucide-react';
import { Icon, type IconName } from './Icon';

/* ---------------- layout bits ---------------- */

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-5">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </header>
  );
}

export function Spinner() {
  return (
    <div
      role="status"
      aria-label="loading"
      className="mx-auto my-10 h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-brand"
    />
  );
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
    <label className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 transition-colors focus-within:border-brand/60 focus-within:bg-surface">
      <Icon name="search" size={17} className="text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 bg-transparent py-2.5 text-[15px] text-ink outline-none placeholder:text-faint"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="grid h-7 w-7 place-items-center rounded-full text-faint transition-colors hover:bg-surface-strong hover:text-ink"
        >
          <Icon name="close" size={15} />
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
    <div
      className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={opt.id === value}
          onClick={() => onChange(opt.id)}
          className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-bold transition-colors ${
            opt.id === value
              ? 'border-brand bg-brand text-white shadow-[0_8px_20px_-12px_rgba(99,102,241,0.9)]'
              : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink'
          }`}
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
    <span className="inline-flex items-center gap-[1px]" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        return (
          <Star
            key={n}
            size={12}
            strokeWidth={1.5}
            fill={on ? 'currentColor' : 'none'}
            className={on ? 'text-amber' : 'text-line-strong'}
          />
        );
      })}
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
    <span className="inline-flex items-center gap-[1px]">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <button
            key={n}
            type="button"
            className={`px-[1px] leading-none transition-colors disabled:cursor-default ${
              on ? 'text-amber' : 'text-line-strong hover:text-amber/60'
            }`}
            disabled={busy}
            onClick={() => onRate(n)}
            aria-label={`Rate ${n} stars`}
          >
            <Star size={16} strokeWidth={1.5} fill={on ? 'currentColor' : 'none'} />
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-1.5 text-[11.5px] font-bold text-muted">{value.toFixed(1)}</span>
      )}
    </span>
  );
}

/* ---------------- pills ---------------- */

export function KindPill({ kind }: { kind: string }) {
  const cls =
    kind === 'video'
      ? 'bg-rose-400/10 text-rose-300'
      : kind === 'audio'
        ? 'bg-violet-400/10 text-violet-300'
        : 'bg-brand/15 text-brand-soft';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em] ${cls}`}
    >
      {kind.toUpperCase()}
    </span>
  );
}

export function AccessPill({ access }: { access?: string }) {
  if (!access) return null;
  const cls = access === 'free' ? 'bg-mint/10 text-mint' : 'bg-amber/10 text-amber';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em] ${cls}`}
    >
      {access.toUpperCase()}
    </span>
  );
}

export function TimePill({ minutes }: { minutes?: number | null }) {
  if (!minutes) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-[3px] text-[10.5px] font-semibold text-muted">
      <Icon name="clock" size={11} /> {minutes} min
    </span>
  );
}

/** Languages offered in the custom-resource form. */
export const LANGUAGES: ChipOption[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'mr', label: 'Marathi' },
  { id: 'ta', label: 'Tamil' },
  { id: 'te', label: 'Telugu' },
  { id: 'bn', label: 'Bengali' },
  { id: 'gu', label: 'Gujarati' },
  { id: 'kn', label: 'Kannada' },
  { id: 'ml', label: 'Malayalam' },
  { id: 'pa', label: 'Punjabi' },
  { id: 'ur', label: 'Urdu' },
];

const LANG_NAMES: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, l.label]),
);

/** "en" → "English", "hi" → "Hindi"; unknown codes fall back to the tag itself. */
export function languageName(code?: string | null) {
  const c = (code ?? 'en').trim().toLowerCase();
  return LANG_NAMES[c] ?? c.toUpperCase();
}

export function LanguagePill({ language }: { language?: string | null }) {
  const code = (language ?? 'en').trim().toLowerCase();
  const name = languageName(code);
  const alt = code !== 'en' ? 'bg-amber/10 text-amber' : 'bg-surface text-muted';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[10.5px] font-bold tracking-[0.08em] ${alt}`}
      title={`Language: ${name}`}
      aria-label={`Language: ${name}`}
    >
      {code.toUpperCase()}
    </span>
  );
}

/* ---------------- buttons ---------------- */

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'paused' | 'green' | 'danger' | 'ghost' | 'soft';
  block?: boolean;
  large?: boolean;
}

const BTN_VARIANTS: Record<NonNullable<BtnProps['variant']>, string> = {
  primary:
    'bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] text-white shadow-[0_14px_30px_-14px_rgba(99,102,241,0.95)] hover:brightness-110',
  paused: 'border border-brand/30 bg-brand/15 text-brand-soft hover:bg-brand/20',
  green: 'border border-mint/30 bg-mint/15 text-mint hover:bg-mint/20',
  danger: 'border border-danger/40 bg-transparent text-danger hover:bg-danger/10',
  ghost: 'bg-transparent text-muted hover:bg-surface hover:text-ink',
  soft: 'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-strong',
};

export function Btn({
  variant = 'soft',
  block,
  large,
  className = '',
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        large ? 'px-5 py-3 text-[15px]' : 'px-4 py-2.5 text-sm'
      } ${BTN_VARIANTS[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
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
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function MiniBtn({
  children,
  className = '',
  active,
  danger,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; danger?: boolean }) {
  const tone = danger
    ? 'border-danger/30 bg-danger/10 text-danger hover:bg-danger/[0.16]'
    : active
      ? 'border-brand bg-brand text-white shadow-[0_6px_16px_-10px_rgba(99,102,241,0.9)]'
      : 'border-line bg-surface text-muted hover:border-line-strong hover:bg-surface-strong hover:text-ink';

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tone} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- feedback ---------------- */

export function PBar({ pct, large }: { pct: number; large?: boolean }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={`overflow-hidden rounded-full bg-surface-strong ${large ? 'h-2.5' : 'h-1.5'}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#a78bfa)] shadow-[0_0_12px_rgba(99,102,241,0.7)] transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function EncourageCard({ body }: { body?: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-[22px] border border-brand/20 bg-[linear-gradient(110deg,rgba(99,102,241,0.16),rgba(168,85,247,0.06))] p-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber/20 bg-amber/10 text-amber">
        <Sparkles size={20} strokeWidth={2} />
      </div>
      <div>
        <div className="text-[13px] font-bold text-amber">Keep going!</div>
        <div className="text-[13px] text-muted">
          {body ??
            'Your future self is already thanking you — stay consistent and watch the magic unfold.'}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div className="rounded-[22px] border border-dashed border-line bg-surface px-6 py-9 text-center">
      <div className="mb-2 flex justify-center text-brand-soft">
        {icon ?? <Sprout size={34} strokeWidth={1.6} />}
      </div>
      <div className="text-[15px] font-bold text-ink">{title}</div>
      {body && <div className="mt-1 text-[12.5px] text-muted">{body}</div>}
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
    <div className="mb-3 rounded-[22px] border border-danger/25 bg-danger/[0.07] p-5 text-center">
      <h3 className="mb-1 text-[15px] font-bold text-danger">{title}</h3>
      <p className="mb-3 text-[13px] text-muted">{body}</p>
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
    <div className="flex items-center gap-2.5 rounded-[20px] border border-line bg-surface p-3.5">
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
          alt ? 'bg-amber/10 text-amber' : 'bg-brand/15 text-brand-soft'
        }`}
      >
        <Icon name={icon} size={19} />
      </div>
      <div>
        <div className="text-[11px] text-muted">{label}</div>
        <div className="text-[16px] font-extrabold text-ink">{value}</div>
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
    <div
      className="mb-3 flex gap-1 rounded-full border border-line-soft bg-track p-1"
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          role="tab"
          aria-selected={opt.id === value}
          disabled={disabled}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors disabled:opacity-50 ${
            opt.id === value
              ? 'bg-[linear-gradient(135deg,rgba(99,102,241,0.95),rgba(139,92,246,0.9))] text-white shadow-[0_8px_20px_-10px_rgba(99,102,241,0.9)]'
              : 'text-muted hover:text-ink'
          }`}
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
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-5 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-[min(420px,100%)] rounded-[22px] border border-line bg-surface p-5 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1.5 text-[17px] font-bold">{title}</h3>
        {body && <p className="mb-4 text-sm text-muted">{body}</p>}
        <div className="flex justify-end gap-2">
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
