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

const priorityStyles = {
  URGENT: 'bg-red-50 text-red-600 border-red-100',
  HIGH: 'bg-yellow-50 text-sti-yellow-dark border-yellow-100',
  NORMAL: 'bg-sti-blue-50 text-sti-blue border-sti-blue-100',
  LOW: 'bg-gray-50 text-sti-gray border-gray-100',
};

const emptyForm = { title: '', content: '', category: 'General', priority: 'NORMAL', isActive: true };

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
      category: announcement.category,
      priority: announcement.priority,
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
            <Card key={a.id} hover className="flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-bold text-sti-gray-dark dark:text-white">{a.title}</h4>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${priorityStyles[a.priority]}`}>
                  {a.priority}
                </span>
              </div>
              <p className="text-sm text-sti-gray flex-1 line-clamp-3">{a.content}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-sti-gray">{a.category}</span>
                  <span className="text-sti-gray">•</span>
                  <span className={`text-xs font-medium ${a.isActive ? 'text-sti-blue' : 'text-sti-gray'}`}>
                    {a.isActive ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(a)} className="p-2 rounded-lg hover:bg-sti-gray-light text-sti-gray hover:text-sti-blue transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(a)} className="p-2 rounded-lg hover:bg-red-50 text-sti-gray hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-white mb-1.5">Category</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-sti-gray-dark dark:text-white mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
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
