import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, CheckCircle2 } from 'lucide-react';
import { publicApi, apiErrorMessage } from '@/lib/api';
import { Spinner } from '@/components/ui/LoadingState';
import { cn } from '@/lib/cn';

// One-time client rating page: 1–5 stars + optional comment.
export function RatingPage() {
  const { token } = useParams();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ['rating', token],
    queryFn: async () =>
      (await publicApi.get(`/public/rate/${token}`)).data as {
        company: string;
        projectTitle: string;
      },
    retry: false,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError('Veuillez sélectionner une note.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await publicApi.post(`/public/rate/${token}`, { rating, comment });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card animate-scale-in p-8">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-7 w-7" />
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-red-600">
              {apiErrorMessage(qError)}
            </p>
          ) : done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h1 className="mt-4 text-lg font-semibold text-ink">Merci !</h1>
              <p className="mt-1 text-sm text-ink-muted">
                Votre évaluation a bien été enregistrée.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  {data?.company}
                </p>
                <h1 className="mt-1 text-xl font-bold text-ink">
                  Évaluez la prestation
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {data?.projectTitle}
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'h-9 w-9',
                        (hover || rating) >= n
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300',
                      )}
                    />
                  </button>
                ))}
              </div>

              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="Un commentaire ? (optionnel)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              {error && (
                <p className="text-center text-sm text-red-600">{error}</p>
              )}

              <button className="btn-primary w-full" disabled={submitting}>
                {submitting && <Spinner className="h-4 w-4 text-white" />}
                Envoyer mon évaluation
              </button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-ink-faint">
          Propulsé par Zeylo
        </p>
      </div>
    </div>
  );
}
