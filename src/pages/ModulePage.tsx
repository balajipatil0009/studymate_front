import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Check, FlaskConical, Plus, Search } from 'lucide-react';
import { catalogApi } from '../api/catalog';
import type { LabItem, ResourceItem } from '../api/types';
import { LabRow, ResourceCard } from '../components/cards';
import { Icon } from '../components/Icon';
import {
  Btn,
  ChipRow,
  CircleBtn,
  EmptyState,
  ErrorCard,
  LANGUAGES,
  MiniBtn,
  PBar,
  Segmented,
  Spinner,
  languageName,
} from '../components/ui';
import { useToast } from '../state/ToastContext';
import { useWorkspace } from '../state/WorkspaceContext';

type Tab = 'res' | 'lab';
type FormKind = 'none' | 'res' | 'lab';

const FIELD =
  'min-w-0 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-brand/60 focus:bg-surface-strong';

export function ModulePage() {
  const { trackId = '', moduleId = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    findTrack,
    moduleItems,
    copyTrack,
    addCatalogResource,
    addCatalogLab,
    addCustomResource,
    addCustomLab,
    removeItem,
    setStatus,
  } = useWorkspace();

  const [meta, setMeta] = useState<{ title: string; stage: string; description: string } | null>(null);
  const [resources, setResources] = useState<ResourceItem[] | null>(null);
  const [labs, setLabs] = useState<LabItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('res');
  const [form, setForm] = useState<FormKind>('none');
  const [busy, setBusy] = useState(false);
  const [langFilter, setLangFilter] = useState('all');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [m, r, l] = await Promise.all([
          catalogApi.module(trackId, moduleId, signal),
          catalogApi.resources(trackId, moduleId, 1, 50, signal),
          catalogApi.labs(trackId, moduleId, 1, 50, signal),
        ]);
        setMeta({ title: m.title, stage: m.stage, description: m.description });
        setResources(r.items);
        setLabs(l.items);
      } catch (err) {
        if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Could not load module');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [trackId, moduleId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const personalTrack = findTrack(trackId);
  const personalModule = personalTrack?.modules.find(
    (m) => m.originModuleId === moduleId || m.id === moduleId,
  );
  const bundle = personalTrack ? moduleItems(personalTrack.uid, moduleId) : undefined;

  const personalRes = useMemo(
    () => new Map((bundle?.resources ?? []).filter((r) => r.catalogId).map((r) => [r.catalogId!, r])),
    [bundle],
  );
  const personalLab = useMemo(
    () => new Map((bundle?.labs ?? []).filter((l) => l.catalogId).map((l) => [l.catalogId!, l])),
    [bundle],
  );

  const languages = useMemo(() => {
    const set = new Set((resources ?? []).map((r) => (r.language || 'en').toLowerCase()));
    return Array.from(set).sort((a, b) =>
      a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b),
    );
  }, [resources]);

  const visibleResources = useMemo(
    () =>
      (resources ?? []).filter(
        (r) => langFilter === 'all' || (r.language || 'en').toLowerCase() === langFilter,
      ),
    [resources, langFilter],
  );

  const ensureTrack = useCallback(async (): Promise<string> => {
    const existing = findTrack(trackId);
    if (existing) return existing.uid;
    try {
      const created = await copyTrack(trackId);
      if (!created) throw new Error('Could not create your copy of this track');
      return created.uid;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add this track', 'error');
      throw new Error('track-add-failed');
    }
  }, [findTrack, trackId, copyTrack, toast]);

  const withTrack = (fn: (personalId: string) => Promise<void>) => async () => {
    setBusy(true);
    try {
      const personalId = await ensureTrack();
      await fn(personalId);
    } catch (err) {
      if (err instanceof Error && err.message !== 'track-add-failed') toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const addRes = (r: ResourceItem) =>
    withTrack(async (personalId) => {
      const res = await addCatalogResource(personalId, moduleId, {
        trackId,
        moduleId,
        url: r.url!,
      });
      toast(res === 'exists' ? 'Already in your To Do list' : 'Resource added to To Do', res === 'exists' ? 'info' : 'success');
    })();

  const addLab = (l: LabItem) =>
    withTrack(async (personalId) => {
      const res = await addCatalogLab(personalId, moduleId, { trackId, moduleId, task: l.task });
      toast(res === 'exists' ? 'Already in your To Do list' : 'Lab added to To Do', res === 'exists' ? 'info' : 'success');
    })();

  const drop = (uid: string) =>
    withTrack(async () => {
      await removeItem(uid);
      toast('Removed from To Do');
    })();

  const toggle = (uid: string, next: 'active' | 'completed') =>
    withTrack(async () => {
      await setStatus(uid, next);
      toast(next === 'completed' ? 'Completed — nice work!' : 'Marked active', 'success');
    })();

  const addAll = async () => {
    if (!resources || !labs) return;
    setBusy(true);
    try {
      const personalId = await ensureTrack();
      let added = 0;
      for (const r of resources) {
        if (personalRes.has(r.id) || !r.url) continue;
        const res = await addCatalogResource(personalId, moduleId, {
          trackId,
          moduleId,
          url: r.url,
        });
        if (res === 'added') added++;
      }
      for (const l of labs) {
        if (personalLab.has(l.id)) continue;
        const res = await addCatalogLab(personalId, moduleId, { trackId, moduleId, task: l.task });
        if (res === 'added') added++;
      }
      toast(added ? `Added ${added} items to To Do` : 'Everything is already in To Do', added ? 'success' : 'info');
    } catch (err) {
      if (err instanceof Error && err.message !== 'track-add-failed') toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (error || !meta) {
    return (
      <div>
        <ModuleTopbar stage="" title="Module" onBack={() => navigate(`/syllabus/${trackId}`)} />
        <ErrorCard body={error ?? 'Module not found'} onRetry={() => void load()} />
      </div>
    );
  }

  const pct =
    personalModule && personalModule.total ? (personalModule.done / personalModule.total) * 100 : 0;

  return (
    <div>
      <ModuleTopbar stage={meta.stage} title={meta.title} onBack={() => navigate(`/syllabus/${trackId}`)} />

      <div className="relative mt-3 overflow-hidden rounded-[24px] border border-line bg-[linear-gradient(135deg,var(--hero-from),var(--hero-mid)_60%,var(--hero-to))] p-5 shadow-[var(--shadow-card)]">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand-soft">
          {meta.stage.toUpperCase()}
        </div>
        <h1 className="mt-1.5 text-[22px] font-extrabold tracking-[-0.025em]">{meta.title}</h1>
        <p className="mt-1 max-w-[62ch] text-[13px] text-muted">{meta.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-[3px] text-[10.5px] font-semibold text-muted">
            <Icon name="clock" size={11} /> {resources?.length ?? 0} resources
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-[3px] text-[10.5px] font-semibold text-muted">
            <Icon name="flask" size={11} /> {labs?.length ?? 0} labs
          </span>
          <span className="flex-1" />
          {personalTrack ? (
            <MiniBtn active onClick={() => navigate('/todo')} title="Open To Do list">
              {personalModule
                ? `${personalModule.done}/${personalModule.total} done`
                : 'In To Do'}
              <Check size={12} />
            </MiniBtn>
          ) : (
            <MiniBtn active disabled={busy} onClick={() => void addAll()}>
              <Plus size={13} /> Add all to To Do
            </MiniBtn>
          )}
        </div>
        {personalModule && personalModule.total > 0 && (
          <div className="mt-3">
            <PBar pct={pct} large />
          </div>
        )}
      </div>

      <div className="mt-4">
        <Segmented<Tab>
          options={[
            { id: 'res', label: `Resources (${resources?.length ?? 0})`, icon: 'book' },
            { id: 'lab', label: `Labs (${labs?.length ?? 0})`, icon: 'flask' },
          ]}
          value={tab}
          onChange={(t) => {
            setTab(t);
            setForm('none');
          }}
        />
      </div>

      {tab === 'res' ? (
        <div>
          <div className="mb-2.5 flex flex-wrap gap-2">
            <MiniBtn active={form === 'res'} onClick={() => setForm(form === 'res' ? 'none' : 'res')}>
              <Plus size={13} /> Custom resource
            </MiniBtn>
            <MiniBtn disabled={busy} onClick={() => void addAll()}>
              Add all
            </MiniBtn>
          </div>

          {languages.length > 1 && (
            <div className="mb-2.5">
              <ChipRow
                options={[
                  { id: 'all', label: `All (${resources?.length ?? 0})` },
                  ...languages.map((code) => ({
                    id: code,
                    label: `${languageName(code)} (${
                      (resources ?? []).filter((r) => (r.language || 'en').toLowerCase() === code)
                        .length
                    })`,
                  })),
                ]}
                value={langFilter}
                onChange={setLangFilter}
              />
            </div>
          )}

          {form === 'res' && (
            <CustomResourceForm
              onCancel={() => setForm('none')}
              onSubmit={(input) =>
                withTrack(async (personalId) => {
                  const res = await addCustomResource(personalId, moduleId, input);
                  setForm('none');
                  toast(
                    res === 'exists' ? 'Already in this module' : 'Resource added to To Do',
                    res === 'exists' ? 'info' : 'success',
                  );
                })()
              }
            />
          )}

          {(resources?.length ?? 0) === 0 && (
            <EmptyState
              icon={<BookOpen size={34} strokeWidth={1.6} />}
              title="No resources yet"
              body="Add your own with the button above."
            />
          )}
          {(resources?.length ?? 0) > 0 && visibleResources.length === 0 && (
            <EmptyState
              icon={<Search size={34} strokeWidth={1.6} />}
              title={`Nothing in ${languageName(langFilter)}`}
              body="Pick another language above."
            />
          )}
          {visibleResources.map((r) => (
            <ResourceCard
              key={r.id}
              item={r}
              personal={personalRes.get(r.id)}
              onAdd={r.url ? () => addRes(r) : undefined}
              onRemove={personalRes.get(r.id) ? () => drop(personalRes.get(r.id)!.uid) : undefined}
              onToggle={
                personalRes.get(r.id)
                  ? () =>
                      toggle(
                        personalRes.get(r.id)!.uid,
                        personalRes.get(r.id)!.status === 'completed' ? 'active' : 'completed',
                      )
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div>
          <div className="mb-2.5 flex flex-wrap gap-2">
            <MiniBtn active={form === 'lab'} onClick={() => setForm(form === 'lab' ? 'none' : 'lab')}>
              <Plus size={13} /> Custom lab
            </MiniBtn>
            <MiniBtn disabled={busy} onClick={() => void addAll()}>
              Add all
            </MiniBtn>
          </div>

          {form === 'lab' && (
            <CustomLabForm
              onCancel={() => setForm('none')}
              onSubmit={(input) =>
                withTrack(async (personalId) => {
                  const res = await addCustomLab(personalId, moduleId, input);
                  setForm('none');
                  toast(
                    res === 'exists' ? 'Already in this module' : 'Lab added to To Do',
                    res === 'exists' ? 'info' : 'success',
                  );
                })()
              }
            />
          )}

          <div className="rounded-[20px] border border-line bg-surface p-3">
            {(labs?.length ?? 0) === 0 && (
              <EmptyState
                icon={<FlaskConical size={34} strokeWidth={1.6} />}
                title="No labs yet"
                body="Practice makes progress — add your own."
              />
            )}
            {labs?.map((l) => (
              <LabRow
                key={l.id}
                item={l}
                personal={personalLab.get(l.id)}
                onAdd={() => addLab(l)}
                onRemove={personalLab.get(l.id) ? () => drop(personalLab.get(l.id)!.uid) : undefined}
                onOpen={() =>
                  navigate(`/syllabus/${trackId}/modules/${moduleId}/labs/${Math.max(0, l.rank - 1)}`)
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleTopbar({
  stage,
  title,
  onBack,
}: {
  stage: string;
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <CircleBtn label="Back to track" onClick={onBack}>
        <Icon name="chevronLeft" size={20} />
      </CircleBtn>
      <div className="min-w-0 flex-1 text-center">
        <h2 className="truncate text-[17px] font-bold">{title}</h2>
        <p className="truncate text-[12.5px] text-muted">{stage}</p>
      </div>
      <span className="w-9" />
    </div>
  );
}

const KINDS = ['video', 'audio', 'text'];
const ACCESS = ['free', 'paid'];

function CustomResourceForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: {
    title: string;
    url: string;
    kind: string;
    access: string;
    language: string;
    estMinutes: number;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState('video');
  const [access, setAccess] = useState('free');
  const [language, setLanguage] = useState('en');
  const [minutes, setMinutes] = useState(30);

  const valid = title.trim().length > 0 && url.trim().length > 0;

  return (
    <div className="mb-3 rounded-[20px] border border-line bg-surface p-4">
      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">
        Custom resource
      </div>
      <input
        className={`${FIELD} mb-2 w-full`}
        placeholder="Title, e.g. CSS Grid course"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className={`${FIELD} mb-2 w-full`}
        placeholder="https://link.to/resource"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="mb-2 flex gap-2">
        <select className={`${FIELD} flex-1`} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          className={`${FIELD} flex-1`}
          value={access}
          onChange={(e) => setAccess(e.target.value)}
          aria-label="Access"
        >
          {ACCESS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <input
          className={`${FIELD} w-[84px]`}
          type="number"
          min={5}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="Estimated minutes"
        />
      </div>
      <div className="mb-3">
        <select
          className={`${FIELD} w-full`}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Content language"
          title="Content language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="primary"
          disabled={!valid}
          onClick={() =>
            onSubmit({
              title: title.trim(),
              url: url.trim(),
              kind,
              access,
              language,
              estMinutes: Math.max(5, minutes),
            })
          }
        >
          Add resource
        </Btn>
      </div>
    </div>
  );
}

function CustomLabForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: { task: string; estMinutes: number }) => void;
  onCancel: () => void;
}) {
  const [task, setTask] = useState('');
  const [minutes, setMinutes] = useState(45);

  return (
    <div className="mb-3 rounded-[20px] border border-line bg-surface p-4">
      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-faint">
        Custom lab
      </div>
      <input
        className={`${FIELD} mb-2 w-full`}
        placeholder="What will you build? e.g. Build a todo app"
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <input
        className={`${FIELD} mb-3 w-full`}
        type="number"
        min={5}
        step={5}
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        aria-label="Estimated minutes"
      />
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="primary"
          disabled={task.trim().length === 0}
          onClick={() => onSubmit({ task: task.trim(), estMinutes: Math.max(5, minutes) })}
        >
          Add lab
        </Btn>
      </div>
    </div>
  );
}
