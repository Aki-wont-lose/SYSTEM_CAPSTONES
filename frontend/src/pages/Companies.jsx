import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Building2, Users } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import LocationPicker from '../components/LocationPicker';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../services/companyService';

const emptyForm = { name: '', address: '', latitude: '', longitude: '', contactPerson: '', contactNumber: '', email: '', industryType: '', availableSlots: 0, status: 'ACTIVE' };

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getCompanies();
      setCompanies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (company) => {
    setEditing(company);
    setForm({
      name: company.name || '',
      address: company.address || '',
      latitude: company.latitude ?? '',
      longitude: company.longitude ?? '',
      contactPerson: company.contactPerson || '',
      contactNumber: company.contactNumber || '',
      email: company.email || '',
      industryType: company.industryType || '',
      availableSlots: company.availableSlots || 0,
      status: company.status
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        availableSlots: parseInt(form.availableSlots) || 0,
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
      alert(err.response?.data?.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this partner company?')) return;
    try {
      await deleteCompany(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete company');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-sti-gray-dark dark:text-white">Partner Companies</h1>
          <p className="text-sm text-sti-gray">Manage OJT host companies and available slots.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openNew}>Add Company</Button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-sti-blue" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sti-gray hover:text-sti-blue">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-sti-gray hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-sti-gray-dark dark:text-white">{c.name}</h3>
              {c.industryType && <p className="text-xs text-sti-gray mb-2">{c.industryType}</p>}
              {c.address && <p className="text-xs text-sti-gray mb-3">{c.address}</p>}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-black/5 dark:border-white/10">
                <span className="flex items-center gap-1 text-sti-gray">
                  <Users className="w-3.5 h-3.5" /> {c._count?.students ?? 0} interns · {c.availableSlots} slots open
                </span>
                <span className={`font-semibold px-2 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-sti-blue-50 text-sti-blue' : 'bg-sti-gray-light text-sti-gray'}`}>
                  {c.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-md p-6 relative my-8">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white mb-5">
              {editing ? 'Edit Company' : 'Add Company'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
              <input placeholder="Industry type" value={form.industryType} onChange={(e) => setForm({ ...form, industryType: e.target.value })} className="input-field" />
              <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />

              <LocationPicker
                latitude={form.latitude === '' ? null : parseFloat(form.latitude)}
                longitude={form.longitude === '' ? null : parseFloat(form.longitude)}
                onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
                className="w-full h-52"
              />

              <input placeholder="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="input-field" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Contact number" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="input-field" />
                <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" placeholder="Available slots" value={form.availableSlots} onChange={(e) => setForm({ ...form, availableSlots: e.target.value })} className="input-field" />
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <Button type="submit" variant="primary" className="w-full" loading={saving}>
                {editing ? 'Save Changes' : 'Add Company'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
