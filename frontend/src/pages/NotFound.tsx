import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle px-6 text-center">
      <span className="font-display text-7xl font-medium text-brand-600">404</span>
      <h1 className="mt-4 text-xl font-semibold text-ink">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        La page que vous cherchez n’existe pas ou a été déplacée.
      </p>
      <Link to="/app" className="btn-primary mt-6">
        Retour à l’accueil
      </Link>
    </div>
  );
}
