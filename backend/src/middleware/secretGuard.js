// src/middleware/secretGuard.js
//
// Kept separate from auth.js so it can be unit-tested without side effects:
// importing auth.js constructs a PrismaClient, which loads backend/.env as a
// side effect and makes the "no secret anywhere" case impossible to reproduce.

export const MIN_SECRET_LENGTH = 32;

// Documentation/template wording. The realistic failure is not a random weak
// string, it is a human pasting the instruction text itself:
//
//   jwt_secret - replace-with-random-32-chars-now
//   your-super-secret-jwt-key-change-this-in-production
//
// That first example is 45 characters and originally PASSED this guard, because
// only "change this"/"change me" was matched and not "replace". Length alone is
// therefore not evidence of randomness - which is what MIN_DISTINCT_CHARS below
// and the repetition check in isUsableSecret are for.
const PLACEHOLDER_PATTERN =
  /(your[-_ ]|replace|insert|placeholder|example|sample|dummy|change[-_ ]?(this|me)|changeme|secret[-_ ]?key|token[-_ ]?key|put[-_ ]?here|fill[-_ ]?in|just[-_ ]?a|not[-_ ]?(a[-_ ])?real|real[-_ ]?secret|todo|fixme|test[-_ ]?only|temporary|xxx+|^abc123|^1234)/i;

// A genuine random secret from randomBytes(48) is 96 hex chars drawn from a
// 16-symbol alphabet, so it reliably uses well over half of them. Placeholder and
// human-typed secrets are drawn from ~30 symbols and concentrate on a few.
const MIN_DISTINCT_CHARS = 10;

// Six identical characters in a row has probability ~62^-5 per position, i.e.
// never in real random output, but is common in typed filler ("aaaaaaaaaaaa",
// "xxxxxxxx", "0000000000").
const REPEATED_RUN = /(.)\1{5,}/;

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
        'JWT_SECRET reads like placeholder or instruction text rather than a generated secret. ' +
        'Guessing it is trivial, so anyone could forge an ADMIN token. Generate a real one with: ' +
        "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    };
  }

  if (REPEATED_RUN.test(secret)) {
    return {
      ok: false,
      reason:
        'JWT_SECRET contains a long run of repeated characters, which a real random value would not. ' +
        "Generate a real one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    };
  }

  const distinct = new Set(secret).size;
  if (distinct < MIN_DISTINCT_CHARS) {
    return {
      ok: false,
      reason:
        `JWT_SECRET uses only ${distinct} distinct characters across ${secret.length} characters, so it is ` +
        'far too easy to guess. Generate a real one with: ' +
        "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    };
  }

  return { ok: true, reason: '' };
};

export const assertUsableSecret = (value) => {
  const result = isUsableSecret(value);
  if (!result.ok) throw new Error(result.reason);
  return value.trim();
};
