// Regression tests for the supervisor-recorded attendance rules.
//
// These are pure logic checks - no database, no server. They guard the two
// mistakes that matter most here: counting hours that were never approved, and
// re-introducing a student write route for attendance.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { isCountableRecord, resolveStatus, canTransitionReview } from '../src/services/attendanceService.js';
import { coordinatorCourseFor } from '../src/services/studentService.js';

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

const throwsWithStatus = (name, fn, status) => {
  try {
    fn();
    check(name, false, 'expected a throw');
  } catch (error) {
    check(name, error.status === status, `expected status ${status}, got ${error.status}`);
  }
};

console.log('\n== hours only come from approved, complete days ==');
check('APPROVED with both times counts', isCountableRecord({ reviewStatus: 'APPROVED', timeIn: new Date(), timeOut: new Date() }));
check('APPROVED without a time out does not count', !isCountableRecord({ reviewStatus: 'APPROVED', timeIn: new Date(), timeOut: null }));
check('APPROVED without a time in does not count', !isCountableRecord({ reviewStatus: 'APPROVED', timeIn: null, timeOut: new Date() }));
check('REJECTED complete day does not count', !isCountableRecord({ reviewStatus: 'REJECTED', timeIn: new Date(), timeOut: new Date() }));
check('SUBMITTED complete day does not count', !isCountableRecord({ reviewStatus: 'SUBMITTED', timeIn: new Date(), timeOut: new Date() }));
check('DRAFT complete day does not count', !isCountableRecord({ reviewStatus: 'DRAFT', timeIn: new Date(), timeOut: new Date() }));
check('null record does not count', !isCountableRecord(null));

console.log('\n== attendance status validation ==');
check('blank status falls back to PRESENT', resolveStatus('') === 'PRESENT');
check('lowercase status is normalised', resolveStatus('late') === 'LATE');
check('a supplied fallback is honoured', resolveStatus(undefined, 'EXCUSED') === 'EXCUSED');
throwsWithStatus('an invented status is rejected', () => resolveStatus('HOLIDAY'), 400);

console.log('\n== legacy review transitions ==');
check('SUBMITTED may be approved', canTransitionReview('SUBMITTED', 'APPROVED'));
check('SUBMITTED may be rejected', canTransitionReview('SUBMITTED', 'REJECTED'));
check('APPROVED cannot be silently re-approved', !canTransitionReview('APPROVED', 'APPROVED'));

console.log('\n== coordinator program lock ==');
check('admin is not course-locked', coordinatorCourseFor({ role: 'ADMIN' }) === null);
check('student is not course-locked', coordinatorCourseFor({ role: 'STUDENT' }) === null);
check('coordinator is pinned to their course', coordinatorCourseFor({ role: 'COORDINATOR', coordinatorCourse: 'BSIT' }) === 'BSIT');
throwsWithStatus('coordinator with no course is refused', () => coordinatorCourseFor({ role: 'COORDINATOR', coordinatorCourse: null }), 403);

console.log('\n== attendance routes: no student write path ==');
const routesPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'routes', 'attendanceRoutes.js');
const routes = readFileSync(routesPath, 'utf8');
const routeLines = routes
  .split(/\r?\n/)
  .filter((line) => line.trim().startsWith('router.'));

const hasRoute = (method, path) =>
  routeLines.some((line) => line.includes(`router.${method}('${path}'`) || line.includes(`router.${method}(\"${path}\"`));

check('no POST /attendance/time-in', !hasRoute('post', '/time-in'));
check('no POST /attendance/time-out', !hasRoute('post', '/time-out'));
check('no POST /:id/submit', !routeLines.some((line) => /router\.post\('\/:id\/submit'/.test(line)));

const lineFor = (needle) => routeLines.find((line) => line.includes(needle)) || '';

check(
  'recording is SUPERVISOR-only',
  /verifyRole\(\[\s*'SUPERVISOR'\s*\]\)/.test(lineFor("router.post('/record/time-in'"))
    && /verifyRole\(\[\s*'SUPERVISOR'\s*\]\)/.test(lineFor("router.post('/record/time-out'"))
);
check(
  'corrections are SUPERVISOR-only',
  /verifyRole\(\[\s*'SUPERVISOR'\s*\]\)/.test(lineFor("router.put('/:id'"))
);
check(
  'the legacy review endpoint is SUPERVISOR-only',
  /verifyRole\(\[\s*'SUPERVISOR'\s*\]\)/.test(lineFor("router.put('/review/:id'"))
);

console.log('\n== admin has no attendance access ==');
const staffReads = [
  "router.get('/records'",
  "router.get('/student/:studentId/history'",
  "router.get('/student/:studentId/summary'",
  "router.get('/review-queue'"
];
check(
  'staff monitoring reads allow COORDINATOR and SUPERVISOR only',
  staffReads.every((needle) =>
    /verifyRole\(\[\s*'COORDINATOR'\s*,\s*'SUPERVISOR'\s*\]\)/.test(lineFor(needle))
  )
);
check(
  'no attendance route grants ADMIN',
  routeLines.every((line) => !/'ADMIN'/.test(line))
);

const logsRoutes = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'modules', 'logs', 'routes.js'),
  'utf8'
);
check(
  'the legacy /logs/dtr/:id correction is SUPERVISOR-only',
  /router\.put\('\/dtr\/:id',\s*verifyRole\(\[\s*'SUPERVISOR'\s*\]\)/.test(logsRoutes)
);

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES PRESENT'}  passed=${pass} failed=${fail}`);
process.exitCode = fail === 0 ? 0 : 1;
