// Verifies the archive's permanent-delete feature stays safe:
//   * only administrators can call the four DELETE endpoints,
//   * the service refuses to delete anything that is not already archived,
//   * a company with linked students/supervisors is blocked,
//   * student deletion goes through a transaction (profile + login row),
//   * every deletion writes an audit entry.
//
// The checks are structural on purpose: they need no database, but a future edit
// that removes a guard will fail here instead of wiping real records.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (relative) => fs.readFileSync(path.join(here, '..', relative), 'utf8');

const routes = read('src/modules/archive/routes.js');
const service = read('src/modules/archive/service.js');
const controller = read('src/modules/archive/controller.js');

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

const deleteLines = routes
  .split('\n')
  .filter((line) => line.trim().startsWith('router.delete('));

console.log('\n== DELETE routes are admin-only ==');

check('four permanent-delete routes exist', deleteLines.length === 4, `found ${deleteLines.length}`);
for (const resource of ['students', 'coordinators', 'supervisors', 'companies']) {
  const line = deleteLines.find((entry) => entry.includes(`/${resource}/:id`));
  check(`${resource} delete route exists`, Boolean(line));
  check(
    `${resource} delete route requires ADMIN`,
    Boolean(line) && line.includes("verifyRole(['ADMIN'])"),
    line?.trim()
  );
  check(
    `${resource} delete route does not allow coordinators`,
    Boolean(line) && !line.includes("'COORDINATOR'"),
    line?.trim()
  );
}

console.log('\n== restore routes unchanged ==');

check('student restore still allows coordinator', routes.includes("router.post('/students/:id/restore', verifyRole(['ADMIN', 'COORDINATOR'])"));
check('company restore still allows coordinator', routes.includes("router.post('/companies/:id/restore', verifyRole(['ADMIN', 'COORDINATOR'])"));

console.log('\n== service refuses non-archived records ==');

const studentFn = service.slice(service.indexOf('export const deleteArchivedStudent'), service.indexOf('const deleteArchivedStaffAccount'));
const staffFn = service.slice(service.indexOf('const deleteArchivedStaffAccount'), service.indexOf('export const deleteArchivedCoordinator'));
const companyFn = service.slice(service.indexOf('export const deleteArchivedCompany'));

check('student delete checks isArchived', studentFn.includes('if (!student.isArchived)'));
check('student delete explains to archive first', /archive this student first/i.test(studentFn));
check('staff delete checks isArchived', staffFn.includes('if (!account.isArchived)'));
check('staff delete explains to archive first', /archive this account first/i.test(staffFn));
check('company delete checks isArchived', companyFn.includes('if (!company.isArchived)'));
check('company delete explains to archive first', /archive this company first/i.test(companyFn));

console.log('\n== destructive operations are scoped ==');

check('student delete runs in a transaction', studentFn.includes('prisma.$transaction'));
check('student delete removes the login row', studentFn.includes('prisma.user.deleteMany'));
check('student delete removes the student row', studentFn.includes('prisma.student.deleteMany'));
check('staff delete removes one account', staffFn.includes('prisma.user.delete('));
check('company delete removes one company', companyFn.includes('prisma.company.delete('));
check(
  'company delete blocks linked students and supervisors',
  companyFn.includes('company._count.students > 0') && companyFn.includes('company._count.supervisors > 0')
);

console.log('\n== audit trail ==');

check('deletions are audit logged', service.includes('action: \'DELETE\''));
check('audit failures cannot fail the deletion', service.includes('const safeAudit') && service.includes('Failed to record delete audit entry'));

console.log('\n== controller wiring ==');

for (const handler of [
  'deleteArchivedStudent',
  'deleteArchivedCoordinator',
  'deleteArchivedSupervisor',
  'deleteArchivedCompany'
]) {
  check(`${handler} is imported`, controller.includes(handler));
  check(`${handler} has a response handler`, new RegExp(`export const ${handler}Handler`).test(controller));
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'}  passed=${pass} failed=${fail}`);
process.exit(fail === 0 ? 0 : 1);
