import test from 'node:test';
import assert from 'node:assert/strict';
import { studentScopeWhere, canAccessStudent } from '../src/services/accessScope.js';
import { generateDocumentFromTemplate } from '../src/services/documentGeneratorService.js';
import * as logEntryService from '../src/services/logEntryService.js';
import logsRouter from '../src/modules/logs/routes.js';
import archiveRouter from '../src/modules/archive/routes.js';
import ojtHoursRouter from '../src/modules/ojtHours/routes.js';
import requirementsRouter from '../src/modules/requirements/routes.js';
import messagingRouter from '../src/modules/messaging/routes.js';
import studentsRouter from '../src/modules/students/routes.js';
import { createStaffAccount } from '../src/modules/accounts/service.js';
import {
  normalizeMiddleInitial,
  isValidMiddleInitial,
  formatStudentFullName
} from '../src/utils/studentValidation.js';
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

  // Log entry & Integration Paper validation (file attachment is optional)
  const validPaper = validateLogEntryInput({
    logType: 'INTEGRATION_PAPER',
    submissionFile: 'data:application/pdf;base64,AA==',
    submissionFileName: 'paper.pdf'
  });
  assert.equal(validPaper.logType, 'INTEGRATION_PAPER');
  const paperWithoutFile = validateLogEntryInput({ logType: 'INTEGRATION_PAPER' });
  assert.equal(paperWithoutFile.logType, 'INTEGRATION_PAPER');
  assert.throws(() => validateLogEntryInput({ logType: 'INVALID_TYPE', taskDescription: 'Test' }), /Invalid log type/i);

  // Academic Year validation
  assert.equal(validateAcademicYearFormat('2026-2027'), '2026-2027');
  assert.throws(() => validateAcademicYearFormat('2026-2028'), /one year after/i);
  assert.throws(() => validateAcademicYearFormat('2026'), /YYYY-YYYY/i);
});

test('documentGeneratorService smart-fills Endorsement Letter and DTR XML even when student OJT is ongoing', async () => {
  const sampleXml = `
    <w:document>
      <w:body>
        <w:p><w:r><w:t xml:space="preserve">August </w:t></w:r><w:r><w:t>19</w:t></w:r><w:r><w:t>,</w:t></w:r><w:r><w:t xml:space="preserve"> 2025</w:t></w:r></w:p>
        <w:p><w:r><w:t xml:space="preserve">MR. </w:t></w:r><w:r><w:t xml:space="preserve">EDUARDO </w:t></w:r><w:r><w:t>AREJA</w:t></w:r></w:p>
        <w:p><w:r><w:t xml:space="preserve">GIAN GABRIEL G. DE </w:t></w:r><w:r><w:t>GRACIA</w:t></w:r></w:p>
        <w:p><w:r><w:t xml:space="preserve">Bachelor of Science in </w:t></w:r><w:r><w:t>Information Technology</w:t></w:r></w:p>
        <w:p><w:r><w:t>VastResult Inc.</w:t></w:r></w:p>
        <w:tbl>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Last Name</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>First Name</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>MI</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>Program</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
      </w:body>
    </w:document>
  `;
  const result = await generateDocumentFromTemplate(
    {
      title: 'Test XML Template',
      templateFileName: 'template.xml',
      templateFile: `data:text/xml;base64,${Buffer.from(sampleXml, 'utf8').toString('base64')}`
    },
    {
      firstName: 'Maria',
      middleInitial: 'G',
      lastName: 'Santos',
      studentId: '02000123456',
      course: 'BSTM',
      section: 'BSTM 4A',
      ojt_status: 'ONGOING',
      requiredHours: 486,
      completedHours: 120,
      supervisorName: 'Engr. Jose Rizal',
      company: { name: 'Grand Hotel Manila', address: 'Roxas Blvd, Manila' }
    }
  );
  assert.equal(result.mode, 'GENERATED_FILE');
  assert.equal(result.placeholders.full_program_name, 'Bachelor of Science in Tourism Management');
  assert.equal(result.placeholders.student_name, 'Maria G. Santos');
  assert.equal(result.placeholders.student_middle_initial, 'G.');

  const outXml = Buffer.from(result.fileData.split(',')[1], 'base64').toString('utf8');
  assert.ok(outXml.includes('<w:t>MARIA G. SANTOS</w:t>'));
  assert.ok(outXml.includes('<w:t>Bachelor of Science in Tourism Management</w:t>'));
  assert.ok(outXml.includes('<w:t>Grand Hotel Manila</w:t>'));
  assert.ok(outXml.includes('<w:t>Engr. Jose Rizal</w:t>'));
  assert.ok(outXml.includes('<w:t>G.</w:t>'));
});

test('Middle Initial normalization and messaging Edit/Delete routes are registered', () => {
  assert.equal(normalizeMiddleInitial('g'), 'G.');
  assert.equal(normalizeMiddleInitial('G.'), 'G.');
  assert.equal(normalizeMiddleInitial(''), '');
  assert.equal(isValidMiddleInitial('A.'), true);
  assert.equal(isValidMiddleInitial('12'), false);
  assert.equal(
    formatStudentFullName({ firstName: 'Juan', middleInitial: 'p', lastName: 'Dela Cruz' }),
    'Juan P. Dela Cruz'
  );

  const msgRoutes = messagingRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.equal(msgRoutes.some((r) => r.includes('PUT /:id')), true);
  assert.equal(msgRoutes.some((r) => r.includes('DELETE /:id')), true);
});

test('Super Admin is view-only on Students and Coordinators and can only create Admins', async () => {
  const studentLayers = studentsRouter.stack.filter((layer) => layer.route);
  const studentGet = studentLayers.find((l) => l.route.path === '/' && l.route.methods.get);
  const studentPost = studentLayers.find((l) => l.route.path === '/' && l.route.methods.post);
  const studentBatch = studentLayers.find((l) => l.route.path === '/batch' && l.route.methods.post);
  const studentPut = studentLayers.find((l) => l.route.path === '/:id' && l.route.methods.put);
  const studentDelete = studentLayers.find((l) => l.route.path === '/:id' && l.route.methods.delete);

  assert.ok(studentGet);
  assert.equal(studentGet.route.stack.some((s) => s.name === 'denySuperAdmin'), false);
  for (const mutationRoute of [studentPost, studentBatch, studentPut, studentDelete]) {
    assert.ok(mutationRoute);
    assert.equal(mutationRoute.route.stack.some((s) => s.name === 'denySuperAdmin'), true);
  }

  await assert.rejects(
    () =>
      createStaffAccount({
        email: 'coord.test@stamaria.sti.edu.ph',
        firstName: 'Coord',
        lastName: 'Test',
        role: 'COORDINATOR',
        coordinatorCourse: 'BSIT',
        requesterIsSuperAdmin: true,
        requesterRole: 'ADMIN'
      }),
    (err) => err.status === 403 && /only create Administrator/i.test(err.message)
  );
});

test('documentGeneratorService smart-fills Application Letter, Consent Form, and Weekly Journal XML placeholders', async () => {
  const sampleXml = `
    <w:document>
      <w:body>
        <w:p><w:r><w:t>Date</w:t></w:r></w:p>
        <w:p><w:r><w:t>&lt;Name of Host Training Establishment Representative&gt;</w:t></w:r></w:p>
        <w:p><w:r><w:t>Dear Mr./Ms. &lt;Name of Host Training Establishment&gt;</w:t></w:r></w:p>
        <w:p><w:r><w:t>I, a student of STI &lt;name of campus&gt;, am required to undergo &lt;no. of training hours&gt; hours for my &lt;Name of Program&gt; program.</w:t></w:r></w:p>
        <w:p><w:r><w:t>I, ____________________________________________________, of legal age</w:t></w:r></w:p>
        <w:p><w:r><w:t>&lt;Name of Student Trainee&gt;</w:t></w:r></w:p>
        <w:tbl>
          <w:tr>
            <w:tc><w:p><w:r><w:t>Host Training Establishment</w:t></w:r></w:p></w:tc>
            <w:tc><w:p><w:r><w:t>Number of Working Hours:</w:t></w:r></w:p></w:tc>
          </w:tr>
        </w:tbl>
      </w:body>
    </w:document>
  `;

  const result = await generateDocumentFromTemplate(
    {
      title: 'Student Application Letter',
      templateFileName: 'app_letter.xml',
      templateFile: `data:text/xml;base64,${Buffer.from(sampleXml, 'utf8').toString('base64')}`
    },
    {
      firstName: 'Ana',
      middleInitial: 'B',
      lastName: 'Reyes',
      studentId: '02000999888',
      course: 'BSIT',
      section: 'BSIT 4A',
      requiredHours: 486,
      completedHours: 80,
      supervisorName: 'Engr. Mark Tan',
      company: { name: 'Tech Solutions Inc.', address: 'Bulacan' }
    }
  );

  const outXml = Buffer.from(result.fileData.split(',')[1], 'base64').toString('utf8');
  assert.ok(outXml.includes('Dear Mr./Ms. Engr. Mark Tan'));
  assert.ok(outXml.includes('STI Santa Maria'));
  assert.ok(outXml.includes('486 hours'));
  assert.ok(outXml.includes('Bachelor of Science in Information Technology'));
  assert.ok(outXml.includes('I, Ana B. Reyes, of legal age'));
  assert.ok(outXml.includes('Tech Solutions Inc.'));
});
