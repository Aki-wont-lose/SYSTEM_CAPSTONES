// Behavioural test of the object-level authorization rules.
// accessScope.js is pure, so this needs no database and no server.
import {
  studentScopeWhere,
  canAccessStudent,
  assertStudentAccess,
  scopeWhere,
  isStaff
} from '../src/services/accessScope.js';

let pass = 0;
let fail = 0;

const check = (name, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}\n          expected ${e}\n          actual   ${a}`);
  }
};

console.log('\n== scope: what a role may query ==');
check(
  'ADMIN sees every student',
  studentScopeWhere({ role: 'ADMIN' }),
  {}
);
check(
  'COORDINATOR is pinned to their course',
  studentScopeWhere({ role: 'COORDINATOR', coordinatorCourse: 'BSIT' }),
  { course: 'BSIT' }
);
check(
  'COORDINATOR with no course owns nothing (fail closed)',
  studentScopeWhere({ role: 'COORDINATOR' }),
  { id: '__no_access__' }
);
check(
  'SUPERVISOR matches company OR supervisor email',
  studentScopeWhere({ role: 'SUPERVISOR', supervisorCompanyId: 'c1', email: 's@x.com' }),
  { OR: [{ companyId: 'c1' }, { supervisorEmail: 's@x.com' }] }
);
check(
  'UNASSIGNED supervisor owns nothing - was the "show all" backdoor',
  studentScopeWhere({ role: 'SUPERVISOR' }),
  { id: '__no_access__' }
);
check(
  'STUDENT may never query the student collection',
  studentScopeWhere({ role: 'STUDENT' }),
  { id: '__no_access__' }
);
check(
  'no user at all fails closed',
  studentScopeWhere(null),
  { id: '__no_access__' }
);

console.log('\n== record-level access ==');
const bsitStudent = { id: 's1', course: 'BSIT', companyId: 'c1', supervisorEmail: 'sup@x.com' };
const bsbaStudent = { id: 's2', course: 'BSBA', companyId: 'c9', supervisorEmail: 'other@x.com' };

check('ADMIN may act on any student', canAccessStudent({ role: 'ADMIN' }, bsbaStudent), true);
check(
  'COORDINATOR may act on own course',
  canAccessStudent({ role: 'COORDINATOR', coordinatorCourse: 'BSIT' }, bsitStudent),
  true
);
check(
  'COORDINATOR may NOT act on another course',
  canAccessStudent({ role: 'COORDINATOR', coordinatorCourse: 'BSIT' }, bsbaStudent),
  false
);
check(
  'SUPERVISOR may act via company match',
  canAccessStudent({ role: 'SUPERVISOR', supervisorCompanyId: 'c1' }, bsitStudent),
  true
);
check(
  'SUPERVISOR may act via supervisorEmail match',
  canAccessStudent({ role: 'SUPERVISOR', email: 'sup@x.com' }, bsitStudent),
  true
);
check(
  'SUPERVISOR may NOT act outside company and email',
  canAccessStudent({ role: 'SUPERVISOR', supervisorCompanyId: 'c1', email: 'sup@x.com' }, bsbaStudent),
  false
);
check('STUDENT may not use the staff path', canAccessStudent({ role: 'STUDENT' }, bsitStudent), false);

console.log('\n== assertStudentAccess ==');
let threw403 = false;
try {
  assertStudentAccess({ role: 'SUPERVISOR', supervisorCompanyId: 'c1' }, bsbaStudent);
} catch (e) {
  threw403 = e.status === 403;
}
check('throws 403 for out-of-scope record', threw403, true);
check('returns the student when allowed', assertStudentAccess({ role: 'ADMIN' }, bsitStudent), bsitStudent);

console.log('\n== list scoping ==');
check(
  'scopeWhere ANDs the caller filter with the role scope',
  scopeWhere({ role: 'COORDINATOR', coordinatorCourse: 'BSIT' }, { ojt_status: 'ACTIVE' }),
  { AND: [{ ojt_status: 'ACTIVE' }, { course: 'BSIT' }] }
);
check(
  'scopeWhere leaves ADMIN filters untouched',
  scopeWhere({ role: 'ADMIN' }, { ojt_status: 'ACTIVE' }),
  { ojt_status: 'ACTIVE' }
);

console.log('\n== helpers ==');
check('isStaff true for SUPERVISOR', isStaff({ role: 'SUPERVISOR' }), true);
check('isStaff false for STUDENT', isStaff({ role: 'STUDENT' }), false);
check('isStaff false for undefined', isStaff(undefined), false);

console.log('\n== regression: the supervisor fail-open that was removed ==');
// A supervisor with no company and no email used to fall through to "return
// everything". It must now match nothing, so an unassigned supervisor cannot
// enumerate or grade the whole institution.
check(
  'unassigned SUPERVISOR scope matches nothing',
  studentScopeWhere({ role: 'SUPERVISOR' }),
  { id: '__no_access__' }
);
check(
  'SUPERVISOR with neither company nor email is refused on a record',
  canAccessStudent({ role: 'SUPERVISOR' }, bsitStudent),
  false
);
check(
  'a user-less caller is refused',
  canAccessStudent(undefined, bsitStudent),
  false
);
check(
  'a STUDENT can never read the student collection',
  studentScopeWhere({ role: 'STUDENT', userId: 'u1' }),
  { id: '__no_access__' }
);
check(
  'COORDINATOR with no course matches nothing (fail closed, not all)',
  scopeWhere({ role: 'COORDINATOR' }, {}),
  { AND: [{}, { id: '__no_access__' }] }
);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'}  passed=${pass} failed=${fail}\n`);
process.exit(fail === 0 ? 0 : 1);
