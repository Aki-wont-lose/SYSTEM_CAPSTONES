import test from 'node:test';
import assert from 'node:assert/strict';
import { studentScopeWhere, canAccessStudent } from '../src/services/accessScope.js';
import { generateDocumentFromTemplate } from '../src/services/documentGeneratorService.js';
import * as logEntryService from '../src/services/logEntryService.js';
import logsRouter from '../src/modules/logs/routes.js';
import archiveRouter from '../src/modules/archive/routes.js';
import ojtHoursRouter from '../src/modules/ojtHours/routes.js';
import requirementsRouter from '../src/modules/requirements/routes.js';
import {
  validateScheduleInput,
  validateRequirementInput,
  validateLogEntryInput,
  validateAcademicYearFormat
} from '../src/utils/simesValidation.js';

test('Coordinator course + section scoping enforces assigned sections when configured', () => {
  const coordinator = {
    role: 'COORDINATOR',
    coordinatorCourse: 'BSIT',
    coordinatorSections: ['BSIT 4A', 'BSIT 4B']
  };

  assert.deepEqual(studentScopeWhere(coordinator), {
    course: 'BSIT',
    OR: [
      { section: { equals: 'BSIT 4A', mode: 'insensitive' } },
      { section: { equals: 'BSIT 4B', mode: 'insensitive' } }
    ]
  });

  assert.equal(canAccessStudent(coordinator, { course: 'BSIT', section: 'BSIT 4A' }), true);
  assert.equal(canAccessStudent(coordinator, { course: 'BSIT', section: 'bsit 4b' }), true);
  assert.equal(canAccessStudent(coordinator, { course: 'BSIT', section: 'BSIT 4C' }), false);
  assert.equal(canAccessStudent(coordinator, { course: 'BSCS', section: 'BSIT 4A' }), false);
});

test('Assign Task is completely removed from logEntryService and logs routes', () => {
  assert.equal('assignTask' in logEntryService, false);
  assert.equal('addAssignedTask' in logEntryService, false);
  assert.equal('submitAssignedTask' in logEntryService, false);
  assert.equal('submitMyTask' in logEntryService, false);

  const routePaths = logsRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.equal(routePaths.some((p) => p.includes('/assign')), false);
  assert.equal(routePaths.some((p) => p.includes('/submit')), false);
});

test('documentGeneratorService replaces placeholders in text templates without mutating original', async () => {
  const templateText = 'Certificate for {student_name} ({student_id}) - {course} {section} at {company_name}.';
  const dataUrl = `data:text/plain;base64,${Buffer.from(templateText, 'utf8').toString('base64')}`;

  const requirement = {
    title: 'Certificate of Completion',
    templateFileName: 'certificate.txt',
    templateFile: dataUrl
  };

  const student = {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    studentId: '123456',
    course: 'BSIT',
    section: 'BSIT 4A',
    email: 'juan@sti.edu',
    requiredHours: 500,
    completedHours: 120,
    company: {
      name: 'Acme Tech',
      address: 'Bulacan',
      contactPerson: 'Maria Santos'
    }
  };

  const result = await generateDocumentFromTemplate(requirement, student);
  assert.equal(result.mode, 'GENERATED_FILE');
  assert.match(result.fileName, /certificate_Dela_Cruz_Juan\.txt$/);

  const decoded = Buffer.from(result.fileData.split(',')[1], 'base64').toString('utf8');
  assert.equal(decoded, 'Certificate for Juan Dela Cruz (123456) - BSIT BSIT 4A at Acme Tech.');
  assert.equal(requirement.templateFile, dataUrl);
});

test('Super Admin is blocked from Admin-only mutations on Archive and OJT Hours routes', () => {
  const archiveLayers = archiveRouter.stack.filter((layer) => layer.route);
  const archiveGetRoot = archiveLayers.find((l) => l.route.path === '/' && l.route.methods.get);
  const archiveRestoreCompany = archiveLayers.find((l) => l.route.path === '/companies/:id/restore' && l.route.methods.post);

  assert.ok(archiveGetRoot);
  assert.ok(archiveRestoreCompany);
  assert.equal(archiveRestoreCompany.route.stack.some((s) => s.name === 'denySuperAdmin'), true);

  const ojtLayers = ojtHoursRouter.stack.filter((layer) => layer.route && layer.route.path !== '/accepted-courses');
  for (const layer of ojtLayers) {
    assert.equal(layer.route.stack.some((s) => s.name === 'denySuperAdmin'), true);
  }
  const ojtPutAccepted = ojtHoursRouter.stack.find((l) => l.route?.path === '/accepted-courses' && l.route.methods.put);
  assert.ok(ojtPutAccepted);
  assert.equal(ojtPutAccepted.route.stack.some((s) => s.name === 'denySuperAdmin'), false);

  const reqLayers = requirementsRouter.stack.filter((layer) => layer.route);
  const reqPost = reqLayers.find((l) => l.route.path === '/' && l.route.methods.post);
  assert.ok(reqPost);
  assert.equal(reqPost.route.stack.some((s) => s.name === 'denySuperAdmin'), false);
  const reqSubmissionsAll = reqLayers.find((l) => l.route.path === '/submissions/all' && l.route.methods.get);
  assert.ok(reqSubmissionsAll);
  assert.equal(reqSubmissionsAll.route.stack.some((s) => s.name === 'denySuperAdmin'), true);
});

test('Data validation enforces schedule, requirement deadline, log entry, and academic year rules', () => {
  // Schedule validation
  const validSched = validateScheduleInput({
    workingDays: 'Mon, Tue, Wed, Thu, Fri',
    workingHours: '8:00 AM - 5:00 PM',
    reason: 'Adjusted shift'
  });
  assert.equal(validSched.days, 'Mon, Tue, Wed, Thu, Fri');
  assert.throws(() => validateScheduleInput({ workingDays: '12345', workingHours: '8:00 AM - 5:00 PM' }), /valid day names/i);
  assert.throws(() => validateScheduleInput({ workingDays: 'Mon-Fri', workingHours: 'all day' }), /valid time range/i);

  // Requirement deadline validation
  assert.doesNotThrow(() =>
    validateRequirementInput(
      { title: 'Weekly Report 1', assignedDate: '2026-11-10', dueDate: '2026-11-17', dueTime: '17:00', maxScore: 100 },
      { isCreate: true }
    )
  );
  assert.throws(
    () => validateRequirementInput({ title: 'Report', dueTime: '25:99' }, { isCreate: true }),
    /HH:MM/i
  );
  assert.throws(
    () => validateRequirementInput({ title: 'Report', assignedDate: '2026-11-20', dueDate: '2026-11-10' }, { isCreate: true }),
    /earlier than the assigned date/i
  );

  // Log entry & Integration Paper validation
  const validPaper = validateLogEntryInput({
    logType: 'INTEGRATION_PAPER',
    submissionFile: 'data:application/pdf;base64,AA==',
    submissionFileName: 'paper.pdf'
  });
  assert.equal(validPaper.logType, 'INTEGRATION_PAPER');
  assert.throws(() => validateLogEntryInput({ logType: 'INVALID_TYPE', taskDescription: 'Test' }), /Invalid log type/i);
  assert.throws(() => validateLogEntryInput({ logType: 'INTEGRATION_PAPER' }), /attach your Integration Paper/i);

  // Academic Year validation
  assert.equal(validateAcademicYearFormat('2026-2027'), '2026-2027');
  assert.throws(() => validateAcademicYearFormat('2026-2028'), /one year after/i);
  assert.throws(() => validateAcademicYearFormat('2026'), /YYYY-YYYY/i);
});
