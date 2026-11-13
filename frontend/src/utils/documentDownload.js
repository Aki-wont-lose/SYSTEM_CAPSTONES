// Helper for downloading personalized documents generated from SIMES templates.
export const downloadGeneratedDocument = (result) => {
  if (!result) return;

  if (result.mode === 'GENERATED_FILE' && result.fileData) {
    const link = document.createElement('a');
    link.href = result.fileData;
    link.download = result.fileName || 'generated_document';
    link.click();
    return;
  }

  // For PDF templates or metadata-only templates:
  // 1. Download the original PDF template untouched if present, AND
  // 2. Open a clean printable summary sheet pre-filled with the student's SIMES profile data.
  if (result.fileData) {
    const link = document.createElement('a');
    link.href = result.fileData;
    link.download = result.fileName || 'template.pdf';
    link.click();
  }

  const p = result.placeholders || {};
  const win = window.open('', '_blank', 'width=820,height=920');
  if (!win) return;
  win.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${result.requirementTitle || 'SIMES Document'} — ${p.student_name || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 36px; color: #1e293b; line-height: 1.5; }
          h1 { color: #003b73; font-size: 20px; margin-bottom: 4px; }
          p.sub { color: #64748b; font-size: 13px; margin-top: 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 13px; }
          td.lbl { background: #f8fafc; font-weight: bold; width: 34%; color: #334155; }
          .actions { margin-top: 24px; }
          @media print { .actions { display: none; } }
        </style>
      </head>
      <body>
        <h1>${result.requirementTitle || 'OJT Monitoring Document'}</h1>
        <p class="sub">Auto-populated from SIMES Student &amp; Placement Records</p>
        <table>
          <tr><td class="lbl">Student Full Name</td><td>${p.student_name || 'N/A'}</td></tr>
          <tr><td class="lbl">Student ID</td><td>${p.student_id || 'N/A'}</td></tr>
          <tr><td class="lbl">Course &amp; Section</td><td>${p.course || 'N/A'} — ${p.section || 'N/A'}</td></tr>
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
        <div class="actions">
          <button onclick="window.print()" style="padding:10px 18px;background:#003b73;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">
            Print / Save as PDF
          </button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
};
