// src/middleware/secretGuard.js
//
// Kept separate from auth.js so it can be unit-tested without side effects:
// importing auth.js constructs a PrismaClient, which loads backend/.env as a
// side effect and makes the "no secret anywhere" case impossible to reproduce.

// Matched by pattern rather than exact value, because the realistic failure is
// someone copying backend/.env.example verbatim, e.g.
// "your-super-secret-jwt-key-change-this-in-production".
const PLACEHOLDER_PATTERN =
  /(your[-_ ]?|change[-_ ]?(this|me)|example|placeholder|secret[-_ ]?key|dummy|sample|test[-_ ]?only|^abc123|^1234)/i;

export const MIN_SECRET_LENGTH = 32;

export const isUsableSecret = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, reason: 'JWT_SECRET is not set. The server refuses to start with a fallback secret.' };
  }
  const secret = value.trim();
  if (secret.length < MIN_SECRET_LENGTH) {
    return {
      ok: false,
      reason:
        `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters (got ${secret.length}). ` +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    };
  }
  if (PLACEHOLDER_PATTERN.test(secret)) {
    return {
      ok: false,
      reason:
        'JWT_SECRET still looks like the placeholder from backend/.env.example. That file is in the ' +
        'public repository, so anyone can read it and forge an ADMIN token. Generate a random secret.'
    };
  }
  return { ok: true, reason: '' };
};

export const assertUsableSecret = (value) => {
  const result = isUsableSecret(value);
  if (!result.ok) throw new Error(result.reason);
  return value.trim();
};
