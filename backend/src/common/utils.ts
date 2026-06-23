import { randomBytes, randomInt } from 'crypto';

// URL-safe random token for one-time links (temp access, ratings, refresh jti).
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

// Human-friendly referral code, e.g. "ZEY-7F3K9Q".
export function generateReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[randomInt(alphabet.length)];
  return `ZEY-${out}`;
}

// 6-digit numeric SMS code.
export function generateSmsCode(): string {
  return String(randomInt(100000, 1000000));
}

// Sanitize a user-supplied filename: strip paths, keep a safe subset.
export function sanitizeFilename(name: string): string {
  const base = name.replace(/^.*[\\/]/, '');
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 180);
  return cleaned || 'file';
}
