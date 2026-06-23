import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Save, Send, RotateCcw, Tag as TagIcon } from 'lucide-react';
import { LoadingState, Spinner } from '@/components/ui/LoadingState';
import { adminApi, apiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';

interface TemplateTag {
  tag: string;
  label: string;
  sample: string;
}
interface Template {
  key: string;
  label: string;
  description: string;
  tags: TemplateTag[];
  subject: string;
  html: string;
  sampleValues: Record<string, string>;
}

function render(html: string, values: Record<string, string>) {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name) =>
    name in values ? values[name] : m,
  );
}

export function EmailTemplatesManager() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () =>
      (await adminApi.get('/admin/email-templates')).data as Template[],
  });

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { subject: string; html: string }>>({});
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; mock?: boolean; message: string } | null>(null);

  useEffect(() => {
    if (data && data.length) {
      setDrafts(
        Object.fromEntries(
          data.map((t) => [t.key, { subject: t.subject, html: t.html }]),
        ),
      );
      setActiveKey((k) => k ?? data[0].key);
    }
  }, [data]);

  if (isLoading || !data || !activeKey) return <LoadingState />;

  const tpl = data.find((t) => t.key === activeKey)!;
  const draft = drafts[activeKey] ?? { subject: tpl.subject, html: tpl.html };

  const setDraft = (patch: Partial<{ subject: string; html: string }>) =>
    setDrafts((d) => ({ ...d, [activeKey]: { ...draft, ...patch } }));

  function insertTag(tag: string) {
    const el = htmlRef.current;
    if (!el) return setDraft({ html: draft.html + tag });
    const start = el.selectionStart ?? draft.html.length;
    const end = el.selectionEnd ?? draft.html.length;
    const next = draft.html.slice(0, start) + tag + draft.html.slice(end);
    setDraft({ html: next });
    // restore caret after the inserted tag
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + tag.length;
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      await adminApi.put(`/admin/email-templates/${activeKey}`, {
        subject: draft.subject,
        html: draft.html,
      });
      setMsg('Modèle enregistré.');
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function resetTpl() {
    setResetting(true);
    setMsg(null);
    setError(null);
    try {
      const res = await adminApi.post(`/admin/email-templates/${activeKey}/reset`);
      setDraft({ subject: res.data.subject, html: res.data.html });
      setMsg('Modèle réinitialisé au contenu par défaut.');
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminApi.post(`/admin/email-templates/${activeKey}/test`, {
        to: testTo,
        subject: draft.subject,
        html: draft.html,
      });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({ ok: false, message: apiErrorMessage(err) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Template list (sub-tabs) */}
      <div className="space-y-1">
        {data.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setActiveKey(t.key);
              setMsg(null);
              setError(null);
              setTestResult(null);
            }}
            className={cn(
              'w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition',
              t.key === activeKey
                ? 'bg-brand-50 text-brand-700'
                : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="space-y-6">
        <div className="card p-6">
          <h3 className="font-semibold text-ink">{tpl.label}</h3>
          <p className="mt-1 text-sm text-ink-muted">{tpl.description}</p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Sujet</label>
              <input
                className="input"
                value={draft.subject}
                onChange={(e) => setDraft({ subject: e.target.value })}
              />
            </div>

            {/* Tag palette */}
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                <TagIcon className="h-4 w-4 text-ink-faint" /> Balises disponibles
              </div>
              <div className="flex flex-wrap gap-2">
                {tpl.tags.map((t) => (
                  <button
                    key={t.tag}
                    type="button"
                    title={`${t.label} — ex: ${t.sample}`}
                    onClick={() => insertTag(t.tag)}
                    className="rounded-lg bg-surface-muted px-2.5 py-1 font-mono text-xs text-brand-700 ring-1 ring-line transition hover:bg-brand-50"
                  >
                    {t.tag}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-faint">
                Cliquez une balise pour l'insérer à la position du curseur dans le HTML.
              </p>
            </div>

            <div>
              <label className="label">Contenu HTML</label>
              <textarea
                ref={htmlRef}
                className="input min-h-[260px] resize-y font-mono text-xs"
                value={draft.html}
                onChange={(e) => setDraft({ html: e.target.value })}
                spellCheck={false}
              />
            </div>
          </div>

          {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" onClick={resetTpl} disabled={resetting}>
              {resetting ? <Spinner className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              Réinitialiser
            </button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-3 text-sm font-semibold text-ink-soft">
            Aperçu (avec valeurs d'exemple)
          </div>
          <iframe
            title="Aperçu"
            className="h-80 w-full bg-white"
            srcDoc={render(draft.html, tpl.sampleValues)}
          />
        </div>

        {/* Test */}
        <div className="card p-6">
          <h3 className="mb-1 font-semibold text-ink">Tester l'envoi</h3>
          <p className="mb-4 text-sm text-ink-muted">
            Envoie ce modèle (avec des valeurs d'exemple) à l'adresse indiquée.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input flex-1"
              type="email"
              placeholder="vous@exemple.ch"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <button className="btn-primary" onClick={sendTest} disabled={testing || !testTo}>
              {testing ? <Spinner className="h-4 w-4 text-white" /> : <Send className="h-4 w-4" />}
              Envoyer un test
            </button>
          </div>
          {testResult && (
            <div
              className={cn(
                'mt-4 rounded-xl px-3.5 py-2.5 text-sm ring-1',
                !testResult.ok
                  ? 'bg-red-50 text-red-700 ring-red-200'
                  : testResult.mock
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
              )}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
