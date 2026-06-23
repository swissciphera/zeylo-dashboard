// Premium split-screen auth shell: editorial left panel + clean form on the right.
export function AuthShell({
  children,
  side = 'pro',
}: {
  children: React.ReactNode;
  side?: 'pro' | 'platform';
}) {
  const copy =
    side === 'platform'
      ? {
          eyebrow: 'Console plateforme',
          title: 'Pilotez Zeylo,\nde bout en bout.',
          subtitle:
            'Entreprises clientes, facturation, parrainage et santé système — une vue claire et souveraine.',
        }
      : {
          eyebrow: 'Espace entreprise',
          title: 'Votre activité,\nparfaitement orchestrée.',
          subtitle:
            'Employés, chantiers, services et contacts réunis dans une interface simple et élégante.',
        };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Editorial panel */}
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(1200px 500px at 10% -10%, rgba(37,99,235,0.45), transparent), radial-gradient(900px 600px at 110% 110%, rgba(30,58,138,0.55), transparent)',
          }}
        />
        <div className="relative flex items-center gap-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current">
              <path d="M9 9h14l-9 8h9v6H9l9-8H9z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">Zeylo</span>
        </div>

        <div className="relative max-w-md text-white">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
            {copy.eyebrow}
          </span>
          <h1 className="mt-4 whitespace-pre-line font-display text-4xl font-medium leading-tight">
            {copy.title}
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            {copy.subtitle}
          </p>
        </div>

        <div className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Zeylo · Conçu en Suisse 🇨🇭
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
