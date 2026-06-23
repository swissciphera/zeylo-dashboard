-- Add editable Resend email template fields to platform settings
ALTER TABLE "PlatformSettings"
  ADD COLUMN "emailSubject" TEXT NOT NULL DEFAULT 'Bienvenue chez Zeylo',
  ADD COLUMN "emailTemplateHtml" TEXT NOT NULL DEFAULT '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#0f172a"><h1 style="color:#2563eb">Zeylo</h1><p>Bonjour,</p><p>Ceci est un email de test envoyé depuis votre console Zeylo.</p><p>À bientôt,<br/>L''équipe Zeylo</p></div>';
