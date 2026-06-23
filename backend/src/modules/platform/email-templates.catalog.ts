// Catalog of transactional email templates: defines the available templates,
// their human labels, the tags (placeholders) each one supports, default
// content, and sample values used for preview / test sends.

export interface TemplateTag {
  tag: string; // e.g. "{{verification_url}}"
  label: string;
  sample: string;
}

export interface TemplateDef {
  key: string;
  label: string;
  description: string;
  tags: TemplateTag[];
  defaultSubject: string;
  defaultHtml: string;
}

const wrap = (inner: string) => `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:Inter,Arial,sans-serif">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7ebf0">
    <div style="background:#2563eb;padding:20px 28px;color:#fff;font-size:18px;font-weight:700">Zeylo</div>
    <div style="padding:28px;color:#0f172a;font-size:15px;line-height:1.6">
${inner}
    </div>
    <div style="padding:18px 28px;color:#94a3b8;font-size:12px;border-top:1px solid #eef2f6">© {{year}} Zeylo · Conçu en Suisse</div>
  </div>
</body></html>`;

const button = (label: string, urlTag: string) =>
  `<a href="${urlTag}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:600">${label}</a>`;

const TAG = {
  name: { tag: '{{name}}', label: 'Nom du destinataire', sample: 'Jean Dupont' },
  company: {
    tag: '{{company_name}}',
    label: "Nom de l'entreprise",
    sample: 'NetClean Sàrl',
  },
  year: { tag: '{{year}}', label: 'Année', sample: String(new Date().getFullYear()) },
  verifyUrl: {
    tag: '{{verification_url}}',
    label: 'Lien de vérification',
    sample: 'https://dashboard.ciphera.ch/verify/abc123',
  },
  verifyCode: {
    tag: '{{verification_code}}',
    label: 'Code de vérification',
    sample: '482913',
  },
  confirmUrl: {
    tag: '{{confirmation_url}}',
    label: 'Lien de confirmation',
    sample: 'https://dashboard.ciphera.ch/confirm/abc123',
  },
  loginUrl: {
    tag: '{{login_url}}',
    label: 'Lien de connexion',
    sample: 'https://dashboard.ciphera.ch/app/login',
  },
  resetUrl: {
    tag: '{{reset_url}}',
    label: 'Lien de réinitialisation',
    sample: 'https://dashboard.ciphera.ch/reset/abc123',
  },
  resetCode: {
    tag: '{{reset_code}}',
    label: 'Code de réinitialisation',
    sample: '204815',
  },
};

export const EMAIL_TEMPLATES: TemplateDef[] = [
  {
    key: 'signup_confirmation',
    label: "Confirmation d'inscription",
    description: "Envoyé après la création d'un compte entreprise.",
    tags: [TAG.name, TAG.company, TAG.loginUrl, TAG.year],
    defaultSubject: 'Bienvenue chez Zeylo 🎉',
    defaultHtml: wrap(
      `<p>Bonjour {{name}},</p>
<p>Votre espace <strong>{{company_name}}</strong> a bien été créé. Vous pouvez dès maintenant vous connecter et commencer à gérer votre activité.</p>
<p style="margin:24px 0">${button('Accéder à mon espace', '{{login_url}}')}</p>
<p>À bientôt,<br/>L'équipe Zeylo</p>`,
    ),
  },
  {
    key: 'email_verification',
    label: "Vérification d'email",
    description: "Demande au destinataire de vérifier son adresse email.",
    tags: [TAG.name, TAG.verifyUrl, TAG.verifyCode, TAG.year],
    defaultSubject: 'Vérifiez votre adresse email',
    defaultHtml: wrap(
      `<p>Bonjour {{name}},</p>
<p>Merci de confirmer votre adresse email pour activer votre compte.</p>
<p style="margin:24px 0">${button('Vérifier mon email', '{{verification_url}}')}</p>
<p>Ou saisissez ce code : <strong style="font-size:20px;letter-spacing:3px">{{verification_code}}</strong></p>`,
    ),
  },
  {
    key: 'email_confirmation',
    label: 'Confirmation par email',
    description: 'Confirmation générique d’une action par email.',
    tags: [TAG.name, TAG.confirmUrl, TAG.year],
    defaultSubject: 'Confirmez votre demande',
    defaultHtml: wrap(
      `<p>Bonjour {{name}},</p>
<p>Veuillez confirmer votre demande en cliquant sur le bouton ci-dessous.</p>
<p style="margin:24px 0">${button('Confirmer', '{{confirmation_url}}')}</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    ),
  },
  {
    key: 'password_reset',
    label: 'Réinitialisation du mot de passe',
    description: 'Envoyé lors d’une demande de réinitialisation de mot de passe.',
    tags: [TAG.name, TAG.resetUrl, TAG.resetCode, TAG.year],
    defaultSubject: 'Réinitialisez votre mot de passe',
    defaultHtml: wrap(
      `<p>Bonjour {{name}},</p>
<p>Vous avez demandé à réinitialiser votre mot de passe. Ce lien expire dans 30 minutes.</p>
<p style="margin:24px 0">${button('Réinitialiser mon mot de passe', '{{reset_url}}')}</p>
<p>Ou utilisez ce code : <strong style="font-size:20px;letter-spacing:3px">{{reset_code}}</strong></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    ),
  },
];

export function getTemplateDef(key: string): TemplateDef | undefined {
  return EMAIL_TEMPLATES.find((t) => t.key === key);
}

// Replace {{tag}} occurrences with values; unknown tags are left untouched.
export function renderTemplate(
  html: string,
  values: Record<string, string>,
): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name) =>
    name in values ? values[name] : match,
  );
}

// Sample values for preview / test, derived from the catalog tags + year.
export function sampleValues(def: TemplateDef): Record<string, string> {
  const values: Record<string, string> = {
    year: String(new Date().getFullYear()),
  };
  for (const t of def.tags) {
    const name = t.tag.replace(/[{}]/g, '').trim();
    values[name] = t.sample;
  }
  return values;
}
