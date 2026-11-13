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

export const buildStudentPlaceholders = async (student) => {
  let coordinatorName = 'N/A';
  if (student.coordinatorId) {
    const coord = await prisma.user.findUnique({
      where: { id: student.coordinatorId },
      select: { firstName: true, lastName: true, email: true }
    });
    if (coord) {
      coordinatorName = [coord.firstName, coord.lastName].filter(Boolean).join(' ').trim() || coord.email;
    }
  } else if (student.course) {
    const normCourse = normalizeCourseCode(student.course);
    const courseVariants = normCourse === 'ACT' ? ['ACT', 'BSACT', 'BSAC'] : [normCourse];
    const coords = await prisma.user.findMany({
      where: { role: 'COORDINATOR', isActive: true, isArchived: false, coordinatorCourse: { in: courseVariants } },
      select: { firstName: true, lastName: true, email: true, coordinatorSections: true }
    });
    const normSec = String(student.section || '').trim().toUpperCase();
    const matched = coords.find((c) =>
      Array.isArray(c.coordinatorSections) &&
      c.coordinatorSections.some((s) => String(s || '').trim().toUpperCase() === normSec)
    ) || coords[0];
    if (matched) {
      coordinatorName = [matched.firstName, matched.lastName].filter(Boolean).join(' ').trim() || matched.email;
    }
  }

  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'N/A';
  const supervisorName = student.supervisorName || student.company?.contactPerson || 'N/A';
  const companyName = student.company?.name || 'N/A';
  const companyAddress = student.company?.address || 'N/A';
  const startDate = formatDateLabel(student.internshipStartDate || student.company?.startDate);
  const endDate = formatDateLabel(student.internshipEndDate || student.company?.expirationDate);
  const today = formatDateLabel(new Date());

  return {
    student_name: fullName,
    student_full_name: fullName,
    full_name: fullName,
    student_first_name: student.firstName || '',
    student_last_name: student.lastName || '',
    student_id: student.studentId || 'N/A',
    course: student.course || 'N/A',
    program: student.course || 'N/A',
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

  // 1. DOCX: replace placeholders inside word/document.xml, headers, footers while preserving all formatting & logos
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
    const entries = parseZipEntries(rawBuffer);
    const updatedEntries = entries.map((entry) => {
      if (/^word\/(document|header\d*|footer\d*)\.xml$/i.test(entry.name)) {
        const xmlStr = entry.data.toString('utf8');
        const replaced = replacePlaceholdersText(xmlStr, placeholders, true);
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
