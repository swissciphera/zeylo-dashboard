import { useEffect, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { Building2, Loader2, MapPin } from 'lucide-react';

interface Result {
  nom: string;
  adresse: string | null;
  lien: string;
}

// Reusable company-name field with Moneyhouse search autocomplete.
// Falls back to a plain input when the proxy/search is unavailable.
export function CompanyAutocomplete({
  value,
  onChange,
  onPick,
  apiClient,
  basePath,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (result: Result) => void;
  apiClient: AxiosInstance;
  basePath: string; // e.g. "/public/company" or "/app/company-verification"
  placeholder?: string;
  required?: boolean;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const justPicked = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient
      .get(`${basePath}/status`)
      .then((r) => setAvailable(Boolean(r.data?.available)))
      .catch(() => setAvailable(false));
  }, [apiClient, basePath]);

  // Debounced search
  useEffect(() => {
    if (!available) return;
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.post(`${basePath}/search`, { query: q });
        setResults(res.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [value, available, apiClient, basePath]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function pick(r: Result) {
    justPicked.current = true;
    onChange(r.nom);
    onPick(r);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className="relative" ref={boxRef}>
      <input
        className="input"
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-faint" />
      )}

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white p-1.5 shadow-elevated scrollbar-slim">
          {results.map((r) => (
            <button
              key={r.lien}
              type="button"
              onClick={() => pick(r)}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-surface-muted"
            >
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {r.nom}
                </span>
                {r.adresse && (
                  <span className="flex items-center gap-1 truncate text-xs text-ink-faint">
                    <MapPin className="h-3 w-3" /> {r.adresse}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
