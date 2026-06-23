import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HardHat, MapPin, Users, CalendarClock, Lock } from 'lucide-react';
import { publicApi, apiErrorMessage } from '@/lib/api';
import { Spinner } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { PROJECT_STATUS, formatDate } from '@/lib/format';

// Temporary employee access: one screen, the assigned project only, no menu.
export function TempAccessPage() {
  const { token } = useParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<any>(null);

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ['temp-access', token],
    queryFn: async () =>
      (await publicApi.get(`/public/access/${token}`)).data as {
        company: string;
        projectTitle: string;
      },
    retry: false,
  });

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await publicApi.post(`/public/access/${token}/verify`, {
        code,
      });
      setProject(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <HardHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Zeylo</span>
        </div>

        <div className="card animate-scale-in p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-7 w-7" />
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-red-600">
              {apiErrorMessage(qError)}
            </p>
          ) : project ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {project.company}
                </p>
                <h1 className="mt-1 text-xl font-bold text-ink">
                  {project.project.title}
                </h1>
                <div className="mt-2">
                  <Badge tone={PROJECT_STATUS[project.project.status]?.tone}>
                    {PROJECT_STATUS[project.project.status]?.label}
                  </Badge>
                </div>
              </div>
              {project.project.description && (
                <p className="text-sm text-ink-soft">
                  {project.project.description}
                </p>
              )}
              <div className="space-y-2.5 text-sm text-ink-soft">
                {project.project.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-ink-faint" />
                    {project.project.address}
                  </div>
                )}
                {project.project.dueDate && (
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-ink-faint" />
                    Échéance : {formatDate(project.project.dueDate)}
                  </div>
                )}
                {project.project.team?.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-ink-faint" />
                    {project.project.team.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Lock className="h-5 w-5" />
                </div>
                <h1 className="mt-3 text-lg font-semibold text-ink">
                  Accès chantier
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {data?.company} · {data?.projectTitle}
                </p>
                <p className="mt-1 text-xs text-ink-faint">
                  Entrez le code reçu par SMS.
                </p>
              </div>
              <input
                className="input text-center text-lg tracking-[0.3em]"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••"
              />
              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}
              <button className="btn-primary w-full" disabled={submitting}>
                {submitting && <Spinner className="h-4 w-4 text-white" />}
                Accéder au chantier
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
