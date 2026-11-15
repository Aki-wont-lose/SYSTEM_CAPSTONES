// Helper for downloading personalized documents generated from SIMES templates.
export const downloadGeneratedDocument = (result) => {
  if (!result) return;

  if (result.fileData) {
    const link = document.createElement('a');
    link.href = result.fileData;
    link.download = result.fileName || 'generated_document';
    link.click();
    return;
  }

  // For metadata-only templates without an uploaded file (e.g. Certificate placeholder entry):
  // Generate and download a Word-compatible .doc file pre-populated with the student's SIMES data.
  const p = result.placeholders || {};
  const htmlDoc = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${result.requirementTitle || 'SIMES Document'} — ${p.student_name || ''}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; padding: 36px; color: #1e293b; line-height: 1.5; }
          h1 { color: #003b73; font-size: 20pt; margin-bottom: 4px; }
          p.sub { color: #64748b; font-size: 11pt; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 11pt; }
          td.lbl { background: #f8fafc; font-weight: bold; width: 35%; color: #334155; }
        </style>
      </head>
      <body>
        <h1>${result.requirementTitle || 'OJT Monitoring Document'}</h1>
        <p class="sub">Auto-populated from SIMES Student &amp; Placement Records</p>
        <table>
          <tr><td class="lbl">Student Full Name</td><td><b>${p.student_name || 'N/A'}</b></td></tr>
          <tr><td class="lbl">Student ID</td><td>${p.student_id || 'N/A'}</td></tr>
          <tr><td class="lbl">Course &amp; Section</td><td>${p.course || 'N/A'} — ${p.section || 'N/A'}</td></tr>
          <tr><td class="lbl">Program</td><td>${p.full_program_name || p.course || 'N/A'}</td></tr>
          <tr><td class="lbl">Company Name</td><td>${p.company_name || 'N/A'}</td></tr>
          <tr><td class="lbl">Company Address</td><td>${p.company_address || 'N/A'}</td></tr>
          <tr><td class="lbl">Supervisor Name</td><td>${p.supervisor_name || 'N/A'}</td></tr>
          <tr><td class="lbl">Coordinator Name</td><td>${p.coordinator_name || 'N/A'}</td></tr>
          <tr><td class="lbl">Academic Year</td><td>${p.academic_year || 'N/A'}</td></tr>
          <tr><td class="lbl">Internship Start Date</td><td>${p.internship_start_date || 'N/A'}</td></tr>
          <tr><td class="lbl">Internship End Date</td><td>${p.internship_end_date || 'N/A'}</td></tr>
          <tr><td class="lbl">Required OJT Hours</td><td>${p.required_hours || '486'} hrs</td></tr>
          <tr><td class="lbl">Completed OJT Hours</td><td>${p.completed_hours || '0'} hrs</td></tr>
          <tr><td class="lbl">Working Schedule</td><td>${p.working_days || 'N/A'} (${p.working_hours || 'N/A'})</td></tr>
          <tr><td class="lbl">Generated Date</td><td>${p.date_today || 'N/A'}</td></tr>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', htmlDoc], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const baseName = (result.fileName || result.requirementTitle || 'document').replace(/\.[^.]+$/, '');
  link.href = url;
  link.download = `${baseName}.doc`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
