// Verifies the super admin cannot manage announcements while ordinary
// administrators still can.
//
// The unit half exercises denySuperAdmin directly. The structural half reads the
// route table so a future edit cannot quietly drop the guard from one endpoint -
// the kind of regression that leaves a single writable hole.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// middleware/auth.js refuses to load without a usable secret, and asserting that
// guard is the point of authGuard.test.js; here we only need the module to boot.
// A realistic random-looking value keeps assertUsableSecret happy.
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'de8b09927c120f3206b8a068e47376eee7f08e4138d3636c163021a06e5363f5b216a78ca5636df1e3c07744eb078c98';
}

const { denySuperAdmin, isSuperAdmin, SUPER_ADMIN_EMAIL } = await import('../src/middleware/auth.js');

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

const runGuard = (user) => {
  const result = { statusCode: null, body: null, nextCalled: false };
  const req = { user };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };
  denySuperAdmin(req, res, () => {
    result.nextCalled = true;
  });
  return result;
};

console.log('\n== denySuperAdmin ==');

const noUser = runGuard(undefined);
check('missing user returns 401', noUser.statusCode === 401, `got ${noUser.statusCode}`);
check('missing user does not continue', noUser.nextCalled === false);

const superAdmin = runGuard({
  userId: 'u1',
  email: SUPER_ADMIN_EMAIL,
  role: 'ADMIN',
  isSuperAdmin: true,
});
check('super admin returns 403', superAdmin.statusCode === 403, `got ${superAdmin.statusCode}`);
check('super admin does not continue', superAdmin.nextCalled === false);
check('super admin message names the module', /Administrators/.test(superAdmin.body?.message || ''));

const admin = runGuard({
  userId: 'u2',
  email: 'laracamille.vergara@stamaria.sti.edu.ph',
  role: 'ADMIN',
  isSuperAdmin: false,
});
check('ordinary admin continues', admin.nextCalled === true);
check('ordinary admin is not rejected', admin.statusCode === null);

// The guard is role-agnostic: verifyRole decides who reaches it, denySuperAdmin
// only carves the super admin out. A coordinator-shaped identity must not be
// rejected by this layer.
const coordinator = runGuard({
  userId: 'u3',
  email: 'coordinator@stamaria.sti.edu.ph',
  role: 'COORDINATOR',
  isSuperAdmin: false,
});
check('non-super-admin continues regardless of role', coordinator.nextCalled === true);

console.log('\n== isSuperAdmin scoping ==');
check(
  'matches configured email with ADMIN role',
  isSuperAdmin({ role: 'ADMIN', email: SUPER_ADMIN_EMAIL.toUpperCase() }) === true
);
check(
  'same email with a non-ADMIN role is not super admin',
  isSuperAdmin({ role: 'COORDINATOR', email: SUPER_ADMIN_EMAIL }) === false
);
check('missing user is not super admin', isSuperAdmin(undefined) === false);

console.log('\n== route table ==');

const here = path.dirname(fileURLToPath(import.meta.url));
const routesSource = fs.readFileSync(
  path.join(here, '..', 'src', 'modules', 'announcements', 'routes.js'),
  'utf8'
);

const routeLines = routesSource
  .split(/\r?\n/)
  .filter((line) => /router\.(get|post|put|delete)\(/.test(line));

check('route table was parsed', routeLines.length >= 8, `found ${routeLines.length} routes`);

// /active is deliberately public for every dashboard.
const publicRoutes = routeLines.filter((line) => line.includes("'/active'"));
check('exactly one public route', publicRoutes.length === 1, `found ${publicRoutes.length}`);
check('public route is unauthenticated', !/verifyToken|denySuperAdmin/.test(publicRoutes[0] || ''));

const managementRoutes = routeLines.filter((line) => !line.includes("'/active'"));
check(
  'every non-public route requires a token',
  managementRoutes.every((line) => line.includes('verifyToken')),
  managementRoutes.filter((line) => !line.includes('verifyToken')).join('\n')
);
check(
  'every non-public route denies the super admin',
  managementRoutes.every((line) => line.includes('denySuperAdmin')),
  managementRoutes.filter((line) => !line.includes('denySuperAdmin')).join('\n')
);

const writeRoutes = routeLines.filter((line) => /router\.(post|put|delete)\(/.test(line));
check(
  'write routes still require the ADMIN role',
  writeRoutes.every((line) => line.includes("verifyRole(['ADMIN'])"))
);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'}  passed=${pass} failed=${fail}\n`);
process.exit(fail === 0 ? 0 : 1);
