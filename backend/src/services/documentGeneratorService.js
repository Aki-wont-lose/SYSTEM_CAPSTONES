// src/services/documentGeneratorService.js
// Placeholder-based automatic document generation from uploaded templates.
// Preserves original template files and formatting (DOCX XML, HTML, TXT, RTF, SVG).
import zlib from 'zlib';
import prisma from '../utils/prisma.js';
import { normalizeCourseCode } from '../utils/studentValidation.js';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const formatDateLabel = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const escapeXml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const COURSE_FULL_NAMES = {
  BSIT: 'Bachelor of Science in Information Technology',
  BSCS: 'Bachelor of Science in Computer Science',
  BSCPE: 'Bachelor of Science in Computer Engineering',
  ACT: 'Associate in Computer Technology',
  BSACT: 'Associate in Computer Technology',
  BSHM: 'Bachelor of Science in Hospitality Management',
  BSTM: 'Bachelor of Science in Tourism Management',
  BSAIS: 'Bachelor of Science in Accounting Information System'
};

export const buildStudentPlaceholders = async (student) => {
  let coordinatorName = 'N/A';
  let coordinatorEmail = 'N/A';
  let coordinatorContact = 'N/A';
  if (student.coordinatorId) {
    const coord = await prisma.user.findUnique({
      where: { id: student.coordinatorId },
      select: { firstName: true, lastName: true, email: true, contactNumber: true }
    });
    if (coord) {
      coordinatorName = [coord.firstName, coord.lastName].filter(Boolean).join(' ').trim() || coord.email;
      coordinatorEmail = coord.email || 'N/A';
      coordinatorContact = coord.contactNumber || 'N/A';
    }
  } else if (student.course) {
    const normCourse = normalizeCourseCode(student.course);
    const courseVariants = normCourse === 'ACT' ? ['ACT', 'BSACT', 'BSAC'] : [normCourse];
    const coords = await prisma.user.findMany({
      where: { role: 'COORDINATOR', isActive: true, isArchived: false, coordinatorCourse: { in: courseVariants } },
      select: { firstName: true, lastName: true, email: true, contactNumber: true, coordinatorSections: true }
    });
    const normSec = String(student.section || '').trim().toUpperCase();
    const matched = coords.find((c) =>
      Array.isArray(c.coordinatorSections) &&
      c.coordinatorSections.some((s) => String(s || '').trim().toUpperCase() === normSec)
    ) || coords[0];
    if (matched) {
      coordinatorName = [matched.firstName, matched.lastName].filter(Boolean).join(' ').trim() || matched.email;
      coordinatorEmail = matched.email || 'N/A';
      coordinatorContact = matched.contactNumber || 'N/A';
    }
  }

  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'N/A';
  const supervisorName = student.supervisorName || student.company?.contactPerson || 'N/A';
  const companyName = student.company?.name || 'N/A';
  const companyAddress = student.company?.address || 'N/A';
  const startDate = formatDateLabel(student.internshipStartDate || student.company?.startDate);
  const endDate = formatDateLabel(student.internshipEndDate || student.company?.expirationDate);
  const today = formatDateLabel(new Date());
  const normCourse = normalizeCourseCode(student.course || '');
  const fullProgramName = COURSE_FULL_NAMES[normCourse] || student.course || 'Bachelor of Science in Information Technology';

  return {
    student_name: fullName,
    student_full_name: fullName,
    full_name: fullName,
    student_first_name: student.firstName || '',
    student_last_name: student.lastName || '',
    student_id: student.studentId || 'N/A',
    course: student.course || 'N/A',
    program: student.course || 'N/A',
    full_program_name: fullProgramName,
    year_level: student.yearLevel || '4th Year',
    section: student.section || 'N/A',
    email: student.email || 'N/A',
    student_email: student.email || 'N/A',
    contact_number: student.contactNumber || 'N/A',
    company_name: companyName,
    company_address: companyAddress,
    supervisor_name: supervisorName,
    supervisor_email: student.supervisorEmail || student.company?.email || 'N/A',
    supervisor_contact: student.supervisorContact || student.company?.contactNumber || 'N/A',
    coordinator_name: coordinatorName,
    coordinator_email: coordinatorEmail,
    coordinator_contact: coordinatorContact,
    internship_start_date: startDate,
    start_date: startDate,
    internship_end_date: endDate,
    end_date: endDate,
    required_hours: String(student.requiredHours ?? 486),
    required_ojt_hours: String(student.requiredHours ?? 486),
    completed_hours: String(student.completedHours ?? 0),
    working_days: student.workingDays || 'Monday - Friday',
    working_hours: student.workingHours || '8:00 AM - 5:00 PM',
    academic_year: student.company?.academicYear || 'N/A',
    date_today: today,
    date: today
  };
};

const replacePlaceholdersText = (text, map, xmlSafe = false) => {
  let out = String(text || '');
  // Handle Word XML split runs inside `{...}` or `{{...}}` by stripping inline XML tags inside braces
  if (xmlSafe) {
    out = out.replace(/\{(\s*(?:<[^>]+>\s*)*[a-zA-Z0-9_]+(?:\s*<[^>]+>\s*)*)\}/g, (match, inner) => {
      const cleanKey = inner.replace(/<[^>]+>/g, '').trim();
      return `{${cleanKey}}`;
    });
  }
  for (const [key, val] of Object.entries(map)) {
    const safeVal = xmlSafe ? escapeXml(val) : String(val ?? '');
    const reDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    const reSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi');
    out = out.replace(reDouble, safeVal).replace(reSingle, safeVal);
  }
  return out;
};

// Minimal ZIP parser & builder for DOCX files (supports Store=0 and Deflate=8)
const parseZipEntries = (buf) => {
  // Find End of Central Directory (0x06054b50)
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('Invalid DOCX/ZIP archive');

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const entries = [];
  let ptr = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const dosTime = buf.readUInt16LE(ptr + 12);
    const dosDate = buf.readUInt16LE(ptr + 14);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localHeaderOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

    // Read local header to locate compressed payload
    const lhNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const lhExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen;
    const compData = buf.subarray(dataStart, dataStart + compSize);

    let data;
    if (method === 0) {
      data = Buffer.from(compData);
    } else if (method === 8) {
      data = zlib.inflateRawSync(compData);
    } else {
      throw new Error(`Unsupported ZIP compression method: ${method}`);
    }

    entries.push({ name, data, method, dosTime, dosDate });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
};

const buildZipBuffer = (entries) => {
  const localParts = [];
  const cdParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const raw = entry.data;
    const crc = crc32(raw);
    const comp = entry.method === 0 ? raw : zlib.deflateRawSync(raw);
    const method = entry.method === 0 ? 0 : 8;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0x0800, 6); // UTF-8
    lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(entry.dosTime || 0, 10);
    lh.writeUInt16LE(entry.dosDate || 0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    localParts.push(lh, nameBuf, comp);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(entry.dosTime || 0, 12);
    cd.writeUInt16LE(entry.dosDate || 0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);

    cdParts.push(cd, nameBuf);
    offset += lh.length + nameBuf.length + comp.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, cdBuf, eocd]);
};

const smartReplaceDocxXml = (xmlStr, placeholders, student) => {
  let out = replacePlaceholdersText(xmlStr, placeholders, true);

  const upperFullName = String(placeholders.student_name || '').toUpperCase();
  const fullProgram = placeholders.full_program_name || placeholders.course || 'Bachelor of Science in Information Technology';
  const companyVal = placeholders.company_name && placeholders.company_name !== 'N/A'
    ? placeholders.company_name
    : 'Host Training Establishment';
  const addressVal = placeholders.company_address && placeholders.company_address !== 'N/A'
    ? placeholders.company_address
    : '';
  const supervisorVal = placeholders.supervisor_name && placeholders.supervisor_name !== 'N/A'
    ? placeholders.supervisor_name
    : 'OJT Supervisor';
  const coordNameVal = placeholders.coordinator_name && placeholders.coordinator_name !== 'N/A'
    ? placeholders.coordinator_name
    : 'Ms. Lara Camille V. Vergara';
  const coordEmailVal = placeholders.coordinator_email && placeholders.coordinator_email !== 'N/A'
    ? placeholders.coordinator_email
    : 'laracamille.vergara@stamaria.sti.edu.ph';
  const coordContactVal = placeholders.coordinator_contact && placeholders.coordinator_contact !== 'N/A'
    ? placeholders.coordinator_contact
    : '+639058220825';

  // 1. Endorsement Letter template sample runs replacement
  out = out
    .replace(/<w:t>GIAN GABRIEL G\. DE <\/w:t>/g, `<w:t>${escapeXml(upperFullName)}</w:t>`)
    .replace(/<w:t>GRACIA<\/w:t>/g, '<w:t></w:t>')
    .replace(/<w:t>Bachelor of Science in <\/w:t>/g, `<w:t>${escapeXml(fullProgram)}</w:t>`)
    .replace(/<w:t>Information Technology<\/w:t>/g, '<w:t></w:t>')
    .replace(/<w:t>486<\/w:t>/g, `<w:t>${escapeXml(placeholders.required_hours || '486')}</w:t>`)
    .replace(/<w:t>VastResult Inc\.<\/w:t>/g, `<w:t>${escapeXml(companyVal)}</w:t>`)
    .replace(/<w:t>186 Caballero St\. <\/w:t>/g, `<w:t>${escapeXml(addressVal)}</w:t>`)
    .replace(/<w:t>Mahabang<\/w:t>/g, '<w:t></w:t>')
    .replace(/<w:t xml:space="preserve"> Parang,<\/w:t>/g, '<w:t></w:t>')
    .replace(/<w:t> Parang,<\/w:t>/g, '<w:t></w:t>')
    .replace(/<w:t>Santa Maria, Bulacan 3022<\/w:t>/g, '<w:t></w:t>')
    .replace(/<w:t>EDUARDO <\/w:t>/g, '<w:t></w:t>')
    .replace(/<w:t>MR\. <\/w:t>([\s\S]*?)<w:t>AREJA<\/w:t>/g, `<w:t></w:t>$1<w:t>${escapeXml(supervisorVal)}</w:t>`)
    .replace(/<w:t>August <\/w:t>/g, `<w:t>${escapeXml(placeholders.date_today)}</w:t>`)
    .replace(/<w:t>19<\/w:t>([\s\S]*?)<w:t>,<\/w:t>([\s\S]*?)<w:t xml:space="preserve"> 2025<\/w:t>/g, '<w:t></w:t>$1<w:t></w:t>$2<w:t></w:t>')
    .replace(/<w:t>Ms\. Lara Camille V\. Vergara<\/w:t>/g, `<w:t>${escapeXml(coordNameVal)}</w:t>`)
    .replace(/<w:t>laracamille\.vergara@stamaria\.sti\.edu\.ph<\/w:t>/g, `<w:t>${escapeXml(coordEmailVal)}</w:t>`)
    .replace(/<w:t>\+639<\/w:t>([\s\S]*?)<w:t>058220825<\/w:t>/g, `<w:t>${escapeXml(coordContactVal)}</w:t>$1<w:t></w:t>`);

  // 2. DTR (Daily Time Record) table cell auto-filling
  const scheduleStr = `${placeholders.working_days || 'Mon-Fri'} (${placeholders.working_hours || '8AM-5PM'})`;
  const ojtPeriodStr =
    placeholders.start_date !== 'N/A' && placeholders.end_date !== 'N/A'
      ? `${placeholders.start_date} - ${placeholders.end_date}`
      : placeholders.academic_year !== 'N/A'
        ? `AY ${placeholders.academic_year}`
        : `${placeholders.completed_hours}/${placeholders.required_hours} hrs`;

  const dtrCellMap = {
    'Last Name': student?.lastName || placeholders.student_last_name || '',
    'First Name': student?.firstName || placeholders.student_first_name || '',
    'STI Campus': 'STI College Santa Maria',
    'Program': placeholders.course !== 'N/A' ? placeholders.course : '',
    'Year Level': placeholders.year_level || '4th Year',
    'Section': placeholders.section !== 'N/A' ? placeholders.section : '',
    'Host Company': placeholders.company_name !== 'N/A' ? placeholders.company_name : 'Not Yet Assigned',
    'OJT Supervisor': placeholders.supervisor_name !== 'N/A' ? placeholders.supervisor_name : 'Not Yet Assigned',
    'Schedule': scheduleStr,
    'OJT Period': ojtPeriodStr
  };

  out = out.replace(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g, (tcBlock) => {
    const plainText = tcBlock.replace(/<[^>]+>/g, '').trim();
    if (!Object.prototype.hasOwnProperty.call(dtrCellMap, plainText)) {
      return tcBlock;
    }
    const val = dtrCellMap[plainText];
    if (!val) return tcBlock;
    const injectedParagraph = `<w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(val)}</w:t></w:r></w:p>`;
    return tcBlock.replace(/<\/w:p>/, `</w:p>${injectedParagraph}`);
  });

  return out;
};

export const generateDocumentFromTemplate = async (requirement, student) => {
  const placeholders = await buildStudentPlaceholders(student);
  const fileName = requirement.templateFileName || `${requirement.title}.pdf`;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const dataUrl = requirement.templateFile || '';

  const safeStudentSlug = `${student.lastName || 'Student'}_${student.firstName || ''}`
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  const baseTitle = fileName.replace(/\.[^.]+$/, '');
  const generatedFileName = `${baseTitle}_${safeStudentSlug}.${ext || 'pdf'}`;

  if (!dataUrl || !dataUrl.includes(',')) {
    return {
      mode: 'METADATA_ONLY',
      fileName: generatedFileName,
      mimeType: 'application/json',
      fileData: null,
      placeholders,
      requirementTitle: requirement.title
    };
  }

  const [header, base64Body] = dataUrl.split(',');
  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const rawBuffer = Buffer.from(base64Body, 'base64');

  // 1. DOCX: replace placeholders and smart-fill sample fields/table cells inside word/document.xml, headers, footers
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
    const entries = parseZipEntries(rawBuffer);
    const updatedEntries = entries.map((entry) => {
      if (/^word\/(document|header\d*|footer\d*)\.xml$/i.test(entry.name)) {
        const xmlStr = entry.data.toString('utf8');
        const replaced = smartReplaceDocxXml(xmlStr, placeholders, student);
        return { ...entry, data: Buffer.from(replaced, 'utf8') };
      }
      return entry;
    });
    const outBuf = buildZipBuffer(updatedEntries);
    return {
      mode: 'GENERATED_FILE',
      fileName: generatedFileName,
      mimeType,
      fileData: `data:${mimeType};base64,${outBuf.toString('base64')}`,
      placeholders,
      requirementTitle: requirement.title
    };
  }

  // 1b. XLSX: replace placeholders and sample student rows inside xl/sharedStrings.xml
  if (ext === 'xlsx' || mimeType.includes('spreadsheetml')) {
    const entries = parseZipEntries(rawBuffer);
    const formattedLastFirst = `${(student.lastName || '').toUpperCase()}, ${(student.firstName || '').toUpperCase()}`
      .replace(/^,\s*/, '')
      .trim() || placeholders.student_name.toUpperCase();
    const updatedEntries = entries.map((entry) => {
      if (/^xl\/sharedStrings\.xml$/i.test(entry.name)) {
        let xmlStr = entry.data.toString('utf8');
        xmlStr = replacePlaceholdersText(xmlStr, placeholders, true);
        xmlStr = xmlStr
          .replace(/<t>CRUZ, MARVIN<\/t>/g, `<t>${escapeXml(formattedLastFirst)}</t>`)
          .replace(/<t>CABATU, WENZER<\/t>/g, '<t></t>');
        return { ...entry, data: Buffer.from(xmlStr, 'utf8') };
      }
      return entry;
    });
    const outBuf = buildZipBuffer(updatedEntries);
    return {
      mode: 'GENERATED_FILE',
      fileName: generatedFileName,
      mimeType,
      fileData: `data:${mimeType};base64,${outBuf.toString('base64')}`,
      placeholders,
      requirementTitle: requirement.title
    };
  }

  // 2. Text-based templates (HTML, TXT, RTF, SVG, XML, CSV)
  if (['html', 'htm', 'txt', 'rtf', 'svg', 'xml', 'csv'].includes(ext) || mimeType.startsWith('text/')) {
    const textStr = rawBuffer.toString('utf8');
    const replaced = replacePlaceholdersText(textStr, placeholders, ext === 'svg' || ext === 'xml');
    const outBuf = Buffer.from(replaced, 'utf8');
    return {
      mode: 'GENERATED_FILE',
      fileName: generatedFileName,
      mimeType,
      fileData: `data:${mimeType};base64,${outBuf.toString('base64')}`,
      placeholders,
      requirementTitle: requirement.title
    };
  }

  // 3. PDF or other binary template: return original template + populated student placeholders
  // so the client can render/download a personalized summary/packet without ever altering the original template.
  return {
    mode: 'PDF_WITH_METADATA',
    fileName: generatedFileName,
    mimeType,
    fileData: dataUrl,
    placeholders,
    requirementTitle: requirement.title
  };
};
