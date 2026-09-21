import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../services/announcementService';

const emptyForm = { title: '', content: '', image: null, isActive: true };

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await getAllAnnouncements();
      setAnnouncements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const openAddModal = () => {
    setForm(emptyForm);
    setEditTarget(null);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (announcement) => {
    setForm({
      title: announcement.title,
      content: announcement.content,
      image: announcement.image || null,
      isActive: announcement.isActive
    });
    setEditTarget(announcement);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editTarget) {
        await updateAnnouncement(editTarget.id, form);
      } else {
        await createAnnouncement(form);
      }
      setModalOpen(false);
      loadAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTarget.id);
      setDeleteTarget(null);
      loadAnnouncements();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sti-blue-50 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-sti-blue" />
          </div>
          <div>
            <p className="font-bold text-sti-gray-dark dark:text-white">Announcements</p>
            <p className="text-xs text-sti-gray">Visible on student dashboards</p>
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAddModal}>
          New Announcement
        </Button>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <p className="text-sm text-sti-gray py-12 text-center">No announcements yet. Create your first one.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((a) => (
            <Card key={a.id} hover className="flex flex-col p-0 overflow-hidden">
              {a.image && <img src={a.image} alt={a.title} className="w-full h-32 object-cover" />}
              <div className="p-4 flex flex-col flex-1">
                <h4 className="font-bold text-sti-gray-dark dark:text-white mb-2">{a.title}</h4>
                <p className="text-sm text-sti-gray flex-1 line-clamp-3">{a.content}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 dark:border-white/10">
                  <span className={`text-xs font-medium ${a.isActive ? 'text-sti-blue' : 'text-sti-gray'}`}>
                    {a.isActive ? 'Published' : 'Draft'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(a)} className="p-2 rounded-lg hover:bg-sti-gray-light text-sti-gray hover:text-sti-blue transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(a)} className="p-2 rounded-lg hover:bg-red-50 text-sti-gray hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Edit Announcement' : 'New Announcement'} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-white mb-1.5">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Announcement title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-white mb-1.5">Content</label>
            <textarea required rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field resize-none" placeholder="Write the announcement details..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-sti-gray-dark dark:text-white mb-1.5">Photos (optional, up to 3 for sliding carousel)</label>
            <input type="file" accept="image/*" multiple onChange={async (e)=>{
              const files=Array.from(e.target.files || []).slice(0,3); if(!files.length) return;
              const results=[];
              for(const file of files){
                if(file.size>4*1024*1024){alert(file.name + ' too large (max 4MB)'); continue;}
                const b64 = await new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); });
                results.push(b64);
              }
              if(results.length===1) setForm(prev=>({...prev, image: results[0], images: null}));
              else if(results.length>1) setForm(prev=>({...prev, image: results[0], images: JSON.stringify(results)}));
            }} className="block w-full text-sm text-sti-gray file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-sti-blue file:text-white" />
            {(form.image || form.images) && (
              <div className="mt-2">
                {form.images ? JSON.parse(form.images).map((img,i)=> <img key={i} src={img} alt={`preview ${i}`} className="w-full h-24 object-cover rounded-lg border mb-2" />) : <img src={form.image} alt="preview" className="w-full h-32 object-cover rounded-lg border" />}
                <button type="button" onClick={()=>setForm(prev=>({...prev, image: null, images: null}))} className="mt-1 text-xs text-red-600 hover:underline">Remove all</button>
                <p className="text-xs text-green-600 mt-1">✓ {form.images ? JSON.parse(form.images).length : 1} photo(s) ready</p>
              </div>
            )}
            {!form.image && !form.images && <p className="text-xs text-sti-gray mt-1">No photos selected - choose 1 or 3 for sliding</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-sti-gray-dark dark:text-white">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded accent-sti-blue" />
            Publish immediately
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {editTarget ? 'Save Changes' : 'Create Announcement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Announcement" maxWidth="max-w-sm">
        <p className="text-sm text-sti-gray-dark dark:text-white">
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AnnouncementManagement;
