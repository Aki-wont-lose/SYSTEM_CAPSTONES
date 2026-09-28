// Unit tests for the JWT_SECRET guard. secretGuard.js is a pure module, so these
// run without a database, a server, or any environment setup.
import { isUsableSecret, assertUsableSecret, MIN_SECRET_LENGTH } from '../src/middleware/secretGuard.js';

let pass = 0;
let fail = 0;

const check = (name, condition, detail = '') => {
  if (condition) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`);
  }
};

const rejects = (name, value) => {
  const result = isUsableSecret(value);
  check(name, result.ok === false, `got ok=${result.ok}`);
};

const accepts = (name, value) => {
  const result = isUsableSecret(value);
  check(name, result.ok === true, result.ok ? '' : `rejected with: ${result.reason}`);
};

console.log('\n== must REJECT ==');
rejects('undefined', undefined);
rejects('null', null);
rejects('empty string', '');
rejects('whitespace only', '    ');
rejects('non-string (number)', 12345);
rejects('too short', 'a'.repeat(MIN_SECRET_LENGTH - 1));
rejects('the exact committed .env.example value', 'your-super-secret-jwt-key-change-this-in-production');
rejects('legacy hardcoded fallback', 'your-secret-key');
rejects('changeme', 'changeme');
rejects('contains "example"', 'this-is-an-example-secret-value-1234567890');
rejects('contains "placeholder"', 'placeholder-value-goes-here-1234567890');
rejects('contains "dummy"', 'dummy-secret-for-testing-purposes-12345');
rejects('contains "test-only"', 'test-only-secret-value-1234567890abcd');
rejects('contains "secret-key"', 'a-secret-key-that-is-long-enough-123456789');
rejects('starts with 1234', '1234567890abcdefghijklmnopqrstuvwxyz');
rejects('starts with abc123', 'abc123456789abcdefghijklmnopqrstuv');

// The template string that motivated this rewrite. It is 45 characters, so a
// length check alone accepted it.
rejects('the "replace-with-random-32-chars-now" template', 'jwt_secret - replace-with-random-32-chars-now');
rejects('contains "replace"', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
rejects('contains "insert"', 'insert-your-real-secret-value-here-now');
rejects('contains "put here"', 'put-here-something-long-enough-1234567');
rejects('contains "fill in"', 'fill-in-a-real-secret-before-deploy-1234');
rejects('contains "todo"', 'todo-replace-this-secret-with-random-1a2b3c');
rejects('contains "fixme"', 'fixme-rotate-this-before-production-123456a');
rejects('contains "changeme"', 'changeme-to-something-random-123456789a');
rejects('contains "temporary"', 'temporary-only-rotate-before-deploy-12a34');
rejects('contains "token key"', 'token-key-placeholder-value-1234567890');
rejects('all x filler', 'x'.repeat(48));

// Long, correct length, but not random. Length is not evidence of randomness.
rejects('six repeated characters in a row', 'a1b2c3d4aaaa1111222233334444555');
rejects('too few distinct characters', 'abcabcabcabcabcabcabcabcabcabcabcab');
rejects('digit run with no variety', '1234567890'.repeat(4));

console.log('\n== must ACCEPT ==');
// Realistic generated values, not 'a'.repeat(96). The guard now rejects degenerate
// filler, so the accept cases have to be shaped like actual randomBytes() output.
accepts('96-char hex secret', 'de8b09927c120f3206b8a068e47376eee7f08e4138d3636c163021a06e5363f5b216a78ca5636df1e3c07744eb078c98');
accepts('random-looking 48-char secret', 'f3a9c1e07b4d28f6a93c5e1b7d0f4a28c6e3b9d15f0a2c7e4b8d1f6a3c9e5b2d');
accepts('exactly the minimum length', 'tVoYvJAWXmxrHFXMxbk_-XCG2D5d42x_');
accepts('base64url-looking secret', 'kJ8-x_9QzA1bC2dE3fG4hI5jK6lM7nO8pQ9rS0tU1vW2xY3zA4bC5');
accepts('the generated 40-char value', 'uGX2K4ycdCZ3TOxwfywFD-Vr02Mh630Lmob3k8Wy');

console.log('\n== assertUsableSecret throws and trims ==');
let threw = false;
let message = '';
try {
  assertUsableSecret('short');
} catch (e) {
  threw = true;
  message = e.message;
}
check('assertUsableSecret throws on a bad secret', threw);
check('the error names JWT_SECRET so the operator knows what to fix', /JWT_SECRET/.test(message));
check('assertUsableSecret returns the trimmed value', assertUsableSecret(`  uGX2K4ycdCZ3TOxwfywFD-Vr02Mh630Lmob3k8Wy  `) === 'uGX2K4ycdCZ3TOxwfywFD-Vr02Mh630Lmob3k8Wy');

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'}  passed=${pass} failed=${fail}\n`);
process.exit(fail === 0 ? 0 : 1);
