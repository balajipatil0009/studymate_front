import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { catalogApi } from '../api/catalog';
import type { LabItem, ResourceItem } from '../api/types';
import { LabRow, ResourceCard } from '../components/cards';
import { Icon } from '../components/Icon';
import { Btn, EmptyState, ErrorCard, MiniBtn, PBar, Segmented, Spinner } from '../components/ui';
import { useToast } from '../state/ToastContext';
import { useWorkspace } from '../state/WorkspaceContext';

type Tab = 'res' | 'lab';
type FormKind = 'none' | 'res' | 'lab';

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

  /** Items may only live inside a personal track copy — create it on demand. */
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
      toast(next === 'completed' ? 'Completed — nice work! 🎉' : 'Marked active', 'success');
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

      <div className="detail-hero">
        <div className="eyebrow">{meta.stage.toUpperCase()}</div>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
        <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
          <span className="pill pill--time">
            <Icon name="clock" size={11} /> {resources?.length ?? 0} resources
          </span>
          <span className="pill pill--time">
            <Icon name="flask" size={11} /> {labs?.length ?? 0} labs
          </span>
          <span style={{ flex: 1 }} />
          {personalTrack ? (
            <MiniBtn onClick={() => navigate('/todo')} title="Open To Do list">
              {personalModule
                ? `${personalModule.done}/${personalModule.total} done ✓`
                : 'In To Do ✓'}
            </MiniBtn>
          ) : (
            <MiniBtn className="on" disabled={busy} onClick={() => void addAll()}>
              ＋ Add all to To Do
            </MiniBtn>
          )}
        </div>
        {personalModule && personalModule.total > 0 && (
          <div style={{ marginTop: 10 }}>
            <PBar pct={pct} large />
          </div>
        )}
      </div>

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

      {tab === 'res' ? (
        <div>
          <div className="row" style={{ marginBottom: 10 }}>
            <MiniBtn
              className={form === 'res' ? 'on' : ''}
              onClick={() => setForm(form === 'res' ? 'none' : 'res')}
            >
              ＋ Custom resource
            </MiniBtn>
            <MiniBtn disabled={busy} onClick={() => void addAll()}>
              Add all
            </MiniBtn>
          </div>

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
            <EmptyState icon="📖" title="No resources yet" body="Add your own with the button above." />
          )}
          {resources?.map((r) => (
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
          <div className="row" style={{ marginBottom: 10 }}>
            <MiniBtn
              className={form === 'lab' ? 'on' : ''}
              onClick={() => setForm(form === 'lab' ? 'none' : 'lab')}
            >
              ＋ Custom lab
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

          <div className="lab-list">
            {(labs?.length ?? 0) === 0 && (
              <EmptyState icon="🧪" title="No labs yet" body="Practice makes progress — add your own." />
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
    <div className="detail-topbar">
      <button type="button" className="circle-btn" onClick={onBack} aria-label="Back to track">
        <Icon name="chevronLeft" size={20} />
      </button>
      <div className="detail-topbar__title">
        <h2>{title}</h2>
        <p>{stage}</p>
      </div>
      <span style={{ width: 36 }} />
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
    estMinutes: number;
  }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState('video');
  const [access, setAccess] = useState('free');
  const [minutes, setMinutes] = useState(30);

  const valid = title.trim().length > 0 && url.trim().length > 0;

  return (
    <div className="form-card">
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        CUSTOM RESOURCE
      </div>
      <input
        className="field"
        placeholder="Title, e.g. CSS Grid course"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="field"
        placeholder="https://link.to/resource"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="row" style={{ gap: 8 }}>
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Kind">
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          className="field"
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
          className="field"
          type="number"
          min={5}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          aria-label="Estimated minutes"
        />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
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
    <div className="form-card">
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        CUSTOM LAB
      </div>
      <input
        className="field"
        placeholder="What will you build? e.g. Build a todo app"
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <input
        className="field"
        type="number"
        min={5}
        step={5}
        value={minutes}
        onChange={(e) => setMinutes(Number(e.target.value))}
        aria-label="Estimated minutes"
      />
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
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
