import { useEffect, useState } from 'react';
import { Plus, Pencil, Archive, X, Building2, Users, Upload, Filter, GraduationCap, FileSpreadsheet, MapPin, Info, HelpCircle, Phone, Mail, UserCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { getCompanies, createCompany, updateCompany, deleteCompany, batchCreateCompanies } from '../services/companyService';
import { normalizeCourseCode, COURSE_LABELS } from '../constants/programs';
import { isValidPersonName, PERSON_NAME_ERROR } from '../constants/studentRules';
import {
  getRegions,
  getProvinces,
  getCities,
  getBarangays,
  isValidPhAddressSelection,
  formatPhAddress,
  parsePhAddress
} from '../constants/phAddresses';

const ALL_PROGRAMS = ['BSIT', 'BSCS', 'BSCPE', 'ACT', 'BSHM', 'BSTM', 'BSAIS'];
const INDUSTRY_GUIDE_EXAMPLES = [
  'Information Technology',
  'Software Development',
  'Hospitality and Tourism',
  'Banking and Finance',
  'Business Process Outsourcing',
  'Telecommunications'
];

const emptyForm = {
  name: '',
  region: '',
  province: '',
  city: '',
  barangay: '',
  address: '',
  latitude: '',
  longitude: '',
  contactPerson: '',
  contactNumber: '',
  email: '',
  industryType: '',
  programs: [],
  availableSlots: 0,
  status: 'ACTIVE'
};

// Manage partner companies, their slots, and accepted programs
const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [acceptedCourses, setAcceptedCourses] = useState(ALL_PROGRAMS);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedCompanyFaq, setSelectedCompanyFaq] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [programFilter, setProgramFilter] = useState('');

  // Build and download an Excel template (with a courses sheet) for company imports
  const downloadTemplate = () => {
    const columns = ['name', 'address', 'contactPerson', 'contactNumber', 'email', 'industryType', 'availableSlots', 'course'];
    const sample = [{
      name: 'Sample Tech Solutions Inc',
      address: 'Poblacion, Santa Maria, Bulacan, Region III - Central Luzon',
      contactPerson: 'Juan Dela Cruz',
      contactNumber: '09171234567',
      email: 'hr@company.com',
      industryType: 'Information Technology',
      availableSlots: 5,
      course: 'BSIT|ACT'
    }];
    const worksheet = XLSX.utils.json_to_sheet(sample, { header: columns });
    const coursesSheet = XLSX.utils.json_to_sheet(acceptedCourses.map((program) => ({ course: program })), { header: ['course'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
    XLSX.utils.book_append_sheet(workbook, coursesSheet, 'Courses');
    XLSX.writeFile(workbook, 'Partner_Company_Templates.xlsx');
  };

  // Parse a CSV/Excel file and bulk-create companies, reporting created and failed rows
  const handleBatchFile = async (file) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { setBatchResult({ created: 0, failed: 1, errors: ['File too large — max 3MB.'] }); return; }
    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    if (!isExcel && !isCsv) { setBatchResult({ created: 0, failed: 1, errors: ['Please use CSV or Excel (.csv, .xlsx)'] }); return; }
    const normalize = (h) => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let payload = [];
    try {
      if (isExcel) {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { setBatchResult({ created: 0, failed: 1, errors: ['Empty sheet'] }); return; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows.length) { setBatchResult({ created: 0, failed: 1, errors: ['File is empty'] }); return; }
        const headers = rows[0].map(normalize);
        payload = rows.slice(1).map(vals=>{
          const obj={}; headers.forEach((h,i)=>obj[h]= vals[i] != null ? String(vals[i]).trim() : '');
          if (!Object.values(obj).some(v=>v)) return null;
          return {
            name: obj['name'] || '',
            address: obj['address'] || '',
            contactPerson: obj['contactperson'] || obj['contact'] || '',
            contactNumber: /^9\d{9}$/.test(String(obj['contactnumber'] || obj['contactno'] || obj['phone'] || '').trim())
              ? `0${String(obj['contactnumber'] || obj['contactno'] || obj['phone'] || '').trim()}`
              : (obj['contactnumber'] || obj['contactno'] || obj['phone'] || ''),
            email: obj['email'] || '',
            industryType: obj['industrytype'] || obj['industry'] || '',
            availableSlots: parseInt(obj['availableslots'] || obj['slots'] || obj['slot'] || '0') || 0,
            programs: String(obj['programs'] || obj['program'] || obj['course'] || '')
              .split(/[|;,/]+/)
              .map((p) => normalizeCourseCode(p))
              .filter((p) => acceptedCourses.includes(p))
          };
        }).filter(Boolean);
      } else {
        const text=await file.text();
        const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
        if (lines.length < 2) { setBatchResult({ created: 0, failed: 1, errors: ['CSV needs header + at least 1 row'] }); return; }
        const headers = lines[0].split(',').map(h=>normalize(h.replace(/^"|"$/g,'')));
        payload = lines.slice(1).map(line=>{
          const vals=[]; let cur=''; let inQuote=false;
          for(let ch of line){ if(ch==='"') inQuote=!inQuote; else if(ch===',' && !inQuote){ vals.push(cur.trim()); cur=''; } else cur+=ch; }
          vals.push(cur.trim());
          const cleaned = vals.map(v=>v.replace(/^"|"$/g,'').trim());
          const obj={}; headers.forEach((h,i)=>obj[h]=cleaned[i]||'');
          if (!Object.values(obj).some(v=>v)) return null;
          return {
            name: obj['name'] || '',
            address: obj['address'] || '',
            contactPerson: obj['contactperson'] || obj['contact'] || '',
            contactNumber: /^9\d{9}$/.test(String(obj['contactnumber'] || obj['contactno'] || obj['phone'] || '').trim())
              ? `0${String(obj['contactnumber'] || obj['contactno'] || obj['phone'] || '').trim()}`
              : (obj['contactnumber'] || obj['contactno'] || obj['phone'] || ''),
            email: obj['email'] || '',
            industryType: obj['industrytype'] || obj['industry'] || '',
            availableSlots: parseInt(obj['availableslots'] || obj['slots'] || obj['slot'] || '0') || 0,
            programs: String(obj['programs'] || obj['program'] || obj['course'] || '')
              .split(/[|;,/]+/)
              .map((p) => normalizeCourseCode(p))
              .filter((p) => acceptedCourses.includes(p))
          };
        }).filter(Boolean);
      }
      if (!payload.length) { setBatchResult({ created: 0, failed: 1, errors: ['No valid rows found - need at least a "name" column'] }); return; }
      setBatchLoading(true);
      const res=await batchCreateCompanies(payload);
      setBatchResult(res.data);
      loadData();
    } catch(err){ setBatchResult({ created: 0, failed: payload.length||1, errors: [err.response?.data?.message || err.message || 'Batch failed'] }); }
    finally { setBatchLoading(false); }
  };

  // Fetch companies
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCompanies({ program: programFilter || undefined });
      setCompanies(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [programFilter]);

  // Open the modal with an empty form for adding a company
  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowModal(true);
  };

  // Fill the form with a company's data for editing
  const openEdit = (company) => {
    setEditing(company);
    const parsedAddr = parsePhAddress(company.address || '');
    setForm({
      name: company.name || '',
      region: parsedAddr.region,
      province: parsedAddr.province,
      city: parsedAddr.city,
      barangay: parsedAddr.barangay,
      address: company.address || '',
      latitude: company.latitude ?? '',
      longitude: company.longitude ?? '',
      contactPerson: company.contactPerson || '',
      contactNumber: company.contactNumber || '',
      email: company.email || '',
      industryType: company.industryType || '',
      availableSlots: company.availableSlots || 0,
      programs: (company.programs || []).map((p) => normalizeCourseCode(p)),
      status: company.status || 'ACTIVE'
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    const cleanName = String(form.name || '').trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      errors.name = 'Company name is required and cannot be empty or whitespace only.';
    } else if (cleanName.length < 3) {
      errors.name = 'Company name must be at least 3 characters long.';
    } else if (cleanName.length > 100) {
      errors.name = 'Company name cannot exceed 100 characters.';
    }

    const cleanIndustry = String(form.industryType || '').trim().replace(/\s+/g, ' ');
    if (!cleanIndustry) {
      errors.industryType = 'Industrial Type is required.';
    } else if (/\d/.test(cleanIndustry)) {
      errors.industryType = 'Numerical characters are not allowed in Industrial Type. Use letters and spaces only.';
    } else if (!/^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(cleanIndustry)) {
      errors.industryType = 'Industrial Type may only contain letters and spaces (e.g., Information Technology).';
    }

    if (!form.region) {
      errors.region = 'Please select a Region.';
    }
    if (!form.province) {
      errors.province = 'Please select a Province.';
    }
    if (!form.city) {
      errors.city = 'Please select a City/Municipality.';
    }
    if (!form.barangay) {
      errors.barangay = 'Please select a Barangay.';
    }
    if (
      form.region &&
      form.province &&
      form.city &&
      form.barangay &&
      !isValidPhAddressSelection({
        region: form.region,
        province: form.province,
        city: form.city,
        barangay: form.barangay
      })
    ) {
      errors.address = 'Selected address combination is invalid. Please re-select from the dropdowns.';
    }

    const cleanContactPerson = String(form.contactPerson || '').trim().replace(/\s+/g, ' ');
    if (!cleanContactPerson) {
      errors.contactPerson = 'Contact person (supervisor name) is required.';
    } else if (!isValidPersonName(cleanContactPerson)) {
      errors.contactPerson = PERSON_NAME_ERROR;
    }

    const cleanContact = String(form.contactNumber || '').trim().replace(/[\s\-()]/g, '');
    if (!cleanContact || !/^(?:09\d{9}|\+?639\d{9}|\d{7,15})$/.test(cleanContact)) {
      errors.contactNumber = 'Please enter a valid contact number (e.g., 09171234567).';
    }

    const cleanEmail = String(form.email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid company email address.';
    }

    const slots = parseInt(form.availableSlots, 10);
    if (Number.isNaN(slots) || slots < 0) {
      errors.availableSlots = 'Available slots cannot be negative.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Coerce the form values and create or update the company
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanName = String(form.name || '').trim().replace(/\s+/g, ' ');
    const cleanIndustry = String(form.industryType || '').trim().replace(/\s+/g, ' ');
    const cleanContactPerson = String(form.contactPerson || '').trim().replace(/\s+/g, ' ');
    const cleanContact = String(form.contactNumber || '').trim().replace(/[\s\-()]/g, '');
    const cleanEmail = String(form.email || '').trim().toLowerCase();
    const formattedAddress = formatPhAddress({
      region: form.region,
      province: form.province,
      city: form.city,
      barangay: form.barangay
    });
    const slots = parseInt(form.availableSlots, 10) || 0;

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: cleanName,
        region: form.region,
        province: form.province,
        city: form.city,
        barangay: form.barangay,
        address: formattedAddress,
        contactPerson: cleanContactPerson,
        contactNumber: cleanContact,
        email: cleanEmail,
        industryType: cleanIndustry,
        programs: (form.programs || []).map((p) => normalizeCourseCode(p)).filter((p) => acceptedCourses.includes(p)),
        availableSlots: slots,
        latitude: form.latitude === '' ? null : parseFloat(form.latitude),
        longitude: form.longitude === '' ? null : parseFloat(form.longitude)
      };
      if (editing) {
        await updateCompany(editing.id, payload);
      } else {
        await createCompany(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err.response?.data?.message || 'Failed to save company'
      }));
    } finally {
      setSaving(false);
    }
  };

  // Archive a company after confirmation (history and student links are kept)
  const handleDelete = async (id) => {
    if (!window.confirm('Archive this partner company?\n\nIt disappears from the list, but its students and history are kept.')) return;
    try {
      await deleteCompany(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive company');
    }
  };

  const regionsList = getRegions();
  const provincesList = getProvinces(form.region);
  const citiesList = getCities(form.region, form.province);
  const barangaysList = getBarangays(form.region, form.province, form.city);
  const previewAddress =
    form.region && form.province && form.city && form.barangay
      ? formatPhAddress({
          region: form.region,
          province: form.province,
          city: form.city,
          barangay: form.barangay
        })
      : '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Partner Companies</h1>
          <p className="text-sm text-sti-gray">Manage OJT host companies, cascading Philippine addresses, and accepted internship courses.</p>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button variant="primary" icon={Plus} onClick={openNew} className="flex-1 sm:flex-none justify-center">Add Company</Button>
          <Button
          variant="secondary"
          icon={FileSpreadsheet}
          onClick={downloadTemplate}
          title="Download the partner company import template"
          aria-label="Download the partner company import template"
          className="!px-3"
        />
        <div
            onDragOver={e=>{e.preventDefault(); setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault(); setDragOver(false); handleBatchFile(e.dataTransfer.files[0]);}}
            className={`flex-1 sm:flex-none ${dragOver ? 'ring-2 ring-sti-blue rounded-xl' : ''}`}
          >
            <input type="file" accept=".csv,.xlsx,.xls" id="batch-company-csv" className="hidden" onChange={e=>{ handleBatchFile(e.target.files[0]); e.target.value=''; }} />
            <Button variant="secondary" icon={Upload} onClick={()=>document.getElementById('batch-company-csv').click()} className="w-full justify-center">Batch Upload</Button>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-sti-blue-50/70 dark:bg-sti-blue/10 border border-sti-blue/15 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-sti-gray-dark dark:text-slate-200 font-medium">
          <GraduationCap className="w-4 h-4 text-sti-blue shrink-0" />
          <span>Courses Accepted for Internship:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {acceptedCourses.map((course) => (
            <span
              key={course}
              title={COURSE_LABELS[course] || course}
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-slate-800 text-sti-blue border border-sti-blue/20"
            >
              {course}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : companies.length === 0 ? (
        <Card className="text-center py-16">
          <Building2 className="w-10 h-10 text-sti-gray mx-auto mb-3" />
          <p className="text-sti-gray text-sm">No partner companies yet. Add the first one.</p>
        </Card>
      ) : (
        <>
          <div className="relative w-full sm:w-56">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="input-field pl-9 text-sm py-2.5">
              <option value="">All Accepted Courses</option>
              {acceptedCourses.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => {
              const normalizedCompanyPrograms = (c.programs || []).map((p) => normalizeCourseCode(p));
              return (
                <Card key={c.id} className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-sti-blue" />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedCompanyFaq(c)}
                          title="Company Details & FAQ"
                          className="p-1.5 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(c)} title="Edit company" className="p-1.5 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} title="Archive company" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-sti-gray-dark dark:text-white">{c.name}</h3>
                    {c.industryType && <p className="text-xs font-medium text-sti-blue dark:text-sky-400 mb-2">{c.industryType}</p>}
                    {c.address && (
                      <p className="text-xs text-sti-gray mb-3 flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sti-gray shrink-0 mt-0.5" />
                        <span>{c.address}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <GraduationCap className="w-3.5 h-3.5 text-sti-gray" />
                      {normalizedCompanyPrograms.length > 0 ? (
                        normalizedCompanyPrograms.map((p) => (
                          <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sti-blue-50 text-sti-blue">{p}</span>
                        ))
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sti-gray-light text-sti-gray">All accepted courses</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-black/5 dark:border-white/10">
                    <span className="flex items-center gap-1 text-sti-gray">
                      <Users className="w-3.5 h-3.5" /> {c._count?.students ?? 0} interns · {c.availableSlots} slots open
                    </span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-sti-blue-50 text-sti-blue' : 'bg-sti-gray-light text-sti-gray'}`}>
                      {c.status}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-lg p-4 sm:p-6 relative my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg font-bold text-sti-gray-dark dark:text-white mb-4 sm:mb-5 pr-8">
              {editing ? 'Edit Partner Company' : 'Register Partner Company'}
            </h2>

            {formErrors.submit && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-medium">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Section 3A: Company Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="company-name-input" className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-sti-gray">
                    {String(form.name || '').trim().length}/100 chars (min 3)
                  </span>
                </div>
                <input
                  id="company-name-input"
                  required
                  minLength={3}
                  maxLength={100}
                  placeholder="Enter official registered company name (3–100 characters)"
                  value={form.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm({ ...form, name: val });
                    const trimmed = val.trim().replace(/\s+/g, ' ');
                    if (!trimmed) {
                      setFormErrors((prev) => ({ ...prev, name: 'Company name is required.' }));
                    } else if (trimmed.length < 3) {
                      setFormErrors((prev) => ({ ...prev, name: 'Company name must be at least 3 characters long.' }));
                    } else if (trimmed.length > 100) {
                      setFormErrors((prev) => ({ ...prev, name: 'Company name cannot exceed 100 characters.' }));
                    } else {
                      setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  onBlur={() => setForm((prev) => ({ ...prev, name: String(prev.name || '').trim().replace(/\s+/g, ' ') }))}
                  className={`input-field text-sm py-2.5 ${formErrors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{formErrors.name}</p>
                )}
              </div>

              {/* Section 3B: Industrial Type */}
              <div>
                <label htmlFor="company-industry-input" className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200 mb-1.5">
                  Industrial Type <span className="text-red-500">*</span>
                </label>
                <div className="mb-2 p-2.5 rounded-xl bg-sti-blue-50/70 dark:bg-slate-700/60 border border-sti-blue/15 text-[11px] text-sti-gray-dark dark:text-slate-300 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sti-blue shrink-0 mt-0.5" />
                    <span>
                      <strong>Input Guide:</strong> Enter the company&apos;s primary industry or sector using <strong>letters and spaces only</strong> (numbers and special symbols are not allowed).
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-[10px] font-semibold text-sti-gray mr-1">Quick examples:</span>
                    {INDUSTRY_GUIDE_EXAMPLES.map((example) => (
                      <button
                        type="button"
                        key={example}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, industryType: example }));
                          setFormErrors((prev) => ({ ...prev, industryType: undefined }));
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 text-sti-blue border border-sti-blue/20 hover:bg-sti-blue hover:text-white transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  id="company-industry-input"
                  required
                  placeholder="e.g., Information Technology, Hospitality and Tourism"
                  value={form.industryType}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    if (/\d/.test(rawVal)) {
                      setFormErrors((prev) => ({
                        ...prev,
                        industryType: 'Numerical characters (0–9) are not allowed in Industrial Type.'
                      }));
                    } else if (rawVal.trim() && !/^[A-Za-z\s]+$/.test(rawVal)) {
                      setFormErrors((prev) => ({
                        ...prev,
                        industryType: 'Industrial Type may only contain letters and spaces.'
                      }));
                    } else {
                      setFormErrors((prev) => ({ ...prev, industryType: undefined }));
                    }
                    setForm({ ...form, industryType: rawVal.replace(/\d+/g, '') });
                  }}
                  onBlur={() => setForm((prev) => ({ ...prev, industryType: String(prev.industryType || '').trim().replace(/\s+/g, ' ') }))}
                  className={`input-field text-sm py-2.5 ${formErrors.industryType ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {formErrors.industryType && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">{formErrors.industryType}</p>
                )}
              </div>

              {/* Section 4: Cascading Philippine Address Dropdowns */}
              <div className="p-3.5 rounded-xl bg-sti-gray-light/60 dark:bg-slate-900/50 border border-black/5 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200">
                    Company Address (Philippine Administrative Selection) <span className="text-red-500">*</span>
                  </label>
                </div>
                {editing && editing.address && !form.region && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    Current saved address: <strong>{editing.address}</strong> — Please select the Region, Province, City/Municipality, and Barangay below.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-sti-gray-dark dark:text-slate-300 mb-1">
                      1. Region <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.region}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          region: e.target.value,
                          province: '',
                          city: '',
                          barangay: ''
                        });
                        setFormErrors((prev) => ({ ...prev, region: undefined, province: undefined, city: undefined, barangay: undefined, address: undefined }));
                      }}
                      className={`input-field text-xs py-2.5 ${formErrors.region ? 'border-red-400' : ''}`}
                    >
                      <option value="">Select Region</option>
                      {regionsList.map((reg) => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                    {formErrors.region && <p className="text-[11px] text-red-600 mt-1">{formErrors.region}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sti-gray-dark dark:text-slate-300 mb-1">
                      2. Province <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!form.region}
                      value={form.province}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          province: e.target.value,
                          city: '',
                          barangay: ''
                        });
                        setFormErrors((prev) => ({ ...prev, province: undefined, city: undefined, barangay: undefined, address: undefined }));
                      }}
                      className={`input-field text-xs py-2.5 disabled:opacity-50 ${formErrors.province ? 'border-red-400' : ''}`}
                    >
                      <option value="">Select Province</option>
                      {provincesList.map((prov) => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                    {formErrors.province && <p className="text-[11px] text-red-600 mt-1">{formErrors.province}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sti-gray-dark dark:text-slate-300 mb-1">
                      3. City/Municipality <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!form.province}
                      value={form.city}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          city: e.target.value,
                          barangay: ''
                        });
                        setFormErrors((prev) => ({ ...prev, city: undefined, barangay: undefined, address: undefined }));
                      }}
                      className={`input-field text-xs py-2.5 disabled:opacity-50 ${formErrors.city ? 'border-red-400' : ''}`}
                    >
                      <option value="">Select City/Municipality</option>
                      {citiesList.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                    {formErrors.city && <p className="text-[11px] text-red-600 mt-1">{formErrors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-sti-gray-dark dark:text-slate-300 mb-1">
                      4. Barangay <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      disabled={!form.city}
                      value={form.barangay}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          barangay: e.target.value
                        });
                        setFormErrors((prev) => ({ ...prev, barangay: undefined, address: undefined }));
                      }}
                      className={`input-field text-xs py-2.5 disabled:opacity-50 ${formErrors.barangay ? 'border-red-400' : ''}`}
                    >
                      <option value="">Select Barangay</option>
                      {barangaysList.map((brgy) => (
                        <option key={brgy} value={brgy}>{brgy}</option>
                      ))}
                    </select>
                    {formErrors.barangay && <p className="text-[11px] text-red-600 mt-1">{formErrors.barangay}</p>}
                  </div>
                </div>
                {previewAddress && (
                  <div className="pt-1 flex items-start gap-1.5 text-xs text-sti-blue dark:text-sky-300 font-medium">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Complete Address: <strong>{previewAddress}</strong></span>
                  </div>
                )}
                {formErrors.address && <p className="text-xs text-red-600">{formErrors.address}</p>}
              </div>

              {/* Contact Person, Phone, Email, Slots */}
              <div>
                <label className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200 mb-1.5">
                  Contact Person (OJT Supervisor Name) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g., Juan Dela Cruz"
                  value={form.contactPerson}
                  onChange={(e) => {
                    setForm({ ...form, contactPerson: e.target.value.replace(/\d+/g, '') });
                    setFormErrors((prev) => ({ ...prev, contactPerson: undefined }));
                  }}
                  onBlur={() => setForm((prev) => ({ ...prev, contactPerson: String(prev.contactPerson || '').trim().replace(/\s+/g, ' ') }))}
                  className={`input-field text-sm py-2.5 ${formErrors.contactPerson ? 'border-red-400' : ''}`}
                />
                {formErrors.contactPerson && <p className="text-xs text-red-600 mt-1">{formErrors.contactPerson}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200 mb-1.5">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    placeholder="e.g., 09171234567"
                    value={form.contactNumber}
                    onChange={(e) => {
                      setForm({ ...form, contactNumber: e.target.value.replace(/[^\d+\s\-()]/g, '') });
                      setFormErrors((prev) => ({ ...prev, contactNumber: undefined }));
                    }}
                    className={`input-field text-sm py-2.5 ${formErrors.contactNumber ? 'border-red-400' : ''}`}
                  />
                  {formErrors.contactNumber && <p className="text-xs text-red-600 mt-1">{formErrors.contactNumber}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200 mb-1.5">
                    Company Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="e.g., hr@company.com"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`input-field text-sm py-2.5 ${formErrors.email ? 'border-red-400' : ''}`}
                  />
                  {formErrors.email && <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200 mb-1.5">
                  Available Internship Slots
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="Available slots"
                  value={form.availableSlots}
                  onChange={(e) => setForm({ ...form, availableSlots: e.target.value })}
                  className="input-field text-sm py-2.5"
                />
              </div>

              {/* Section 2: Courses Accepted for Internship */}
              <div>
                <label className="block text-xs font-bold text-sti-gray-dark dark:text-slate-200 mb-1">
                  Courses Accepted for Internship
                </label>
                <p className="text-[11px] text-sti-gray mb-2">
                  Select which officially accepted courses this company accommodates (leave unselected to accept all eligible internship courses).
                </p>
                <div className="flex flex-wrap gap-2">
                  {acceptedCourses.map((p) => {
                    const active = form.programs.includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setForm({
                          ...form,
                          programs: active ? form.programs.filter((x) => x !== p) : [...form.programs, p]
                        })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-sti-blue text-white border-sti-blue'
                            : 'bg-white dark:bg-slate-700 border-black/10 dark:border-white/10 text-sti-gray hover:border-sti-blue/40'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" variant="primary" className="w-full py-3" loading={saving}>
                {editing ? 'Save Changes' : 'Add Company'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Company Details & Common Questions (FAQ) Modal */}
      <Modal
        isOpen={!!selectedCompanyFaq}
        onClose={() => setSelectedCompanyFaq(null)}
        title={selectedCompanyFaq ? `${selectedCompanyFaq.name} — Details & FAQ` : 'Company Details'}
        maxWidth="max-w-lg"
      >
        {selectedCompanyFaq && (
          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-xl bg-sti-gray-light/70 dark:bg-slate-900/60 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-sti-blue shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sti-gray-dark dark:text-white">Complete Address: </span>
                  <span className="text-sti-gray">{selectedCompanyFaq.address || 'Not specified'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sti-blue shrink-0" />
                <div>
                  <span className="font-bold text-sti-gray-dark dark:text-white">OJT Supervisor / Contact Person: </span>
                  <span className="text-sti-gray">{selectedCompanyFaq.contactPerson || 'Not specified'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sti-blue shrink-0" />
                <div>
                  <span className="font-bold text-sti-gray-dark dark:text-white">Contact Number: </span>
                  <span className="text-sti-gray">{selectedCompanyFaq.contactNumber || 'Not specified'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sti-blue shrink-0" />
                <div>
                  <span className="font-bold text-sti-gray-dark dark:text-white">Email Address: </span>
                  <span className="text-sti-gray">{selectedCompanyFaq.email || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sti-gray">Frequently Asked Questions (FAQ)</h4>
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10">
                <p className="text-xs font-bold text-sti-gray-dark dark:text-white">Where is {selectedCompanyFaq.name} located?</p>
                <p className="text-xs text-sti-gray mt-1">
                  The company is located at <strong>{selectedCompanyFaq.address || 'its registered office'}</strong>.
                </p>
              </div>
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10">
                <p className="text-xs font-bold text-sti-gray-dark dark:text-white">What courses are accepted for internship at this company?</p>
                <p className="text-xs text-sti-gray mt-1">
                  {(selectedCompanyFaq.programs || []).length > 0
                    ? `Accepts interns from: ${(selectedCompanyFaq.programs || []).map((p) => normalizeCourseCode(p)).join(', ')}.`
                    : `Open to all officially accepted internship courses (${acceptedCourses.join(', ')}).`}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-black/5 dark:border-white/10">
                <p className="text-xs font-bold text-sti-gray-dark dark:text-white">What industry sector does this company belong to and how many slots are open?</p>
                <p className="text-xs text-sti-gray mt-1">
                  Industry sector: <strong>{selectedCompanyFaq.industryType || 'General Industry'}</strong>. Currently has <strong>{selectedCompanyFaq.availableSlots ?? 0}</strong> open internship slot(s) and <strong>{selectedCompanyFaq._count?.students ?? 0}</strong> active intern(s).
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!batchResult} onClose={() => setBatchResult(null)} title={batchResult?.failed ? 'Batch Upload Result' : 'Batch Upload Complete'} maxWidth="max-w-md">
        {batchResult && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl text-sm font-medium ${batchResult.failed ? 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200' : 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200'}`}>
              Batch: {batchResult.created} created, {batchResult.failed} failed
            </div>
            {batchResult.errors?.length > 0 && (
              <div className="max-h-64 overflow-y-auto bg-sti-gray-light dark:bg-slate-900 rounded-xl p-3 space-y-1">
                {batchResult.errors.slice(0,20).map((e,i)=><p key={i} className="text-xs text-sti-gray-dark dark:text-slate-300 break-words border-b border-black/5 dark:border-white/10 last:border-0 py-1">{e}</p>)}
                {batchResult.errors.length>20 && <p className="text-xs text-sti-gray">+{batchResult.errors.length-20} more...</p>}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="primary" onClick={()=>setBatchResult(null)}>OK</Button>
            </div>
          </div>
        )}
      </Modal>
      {batchLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 flex items-center gap-3 shadow-xl">
            <div className="w-6 h-6 border-2 border-sti-blue border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Uploading batch...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
