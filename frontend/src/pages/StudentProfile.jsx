import { useEffect, useState } from 'react';
import { Mail, Phone, Building2, BookOpen, Users, Hash, Pencil, Save, X, User } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { getMyProfile, updateMyProfile } from '../services/studentService';
import { useAuth } from '../hooks/useAuth';

const statusStyles = {
  NOT_STARTED: 'bg-gray-100 text-sti-gray-dark',
  ONGOING: 'bg-sti-blue-50 text-sti-blue',
  COMPLETED: 'bg-yellow-50 text-sti-yellow-dark',
  ON_HOLD: 'bg-orange-50 text-orange-600',
  FAILED: 'bg-red-50 text-red-600',
};

const StudentProfile = () => {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');

  const loadProfile = async () => {
    try {
      const res = await getMyProfile();
      setProfile(res.data);
      setForm({
        contactNumber: res.data.contactNumber || '',
        email: res.data.email || '',
        section: res.data.section || '',
        course: res.data.course || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await updateMyProfile(form);
      setProfile(res.data);
      updateUser({ student: res.data });
      setEditing(false);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`;

  const infoFields = [
    { label: 'Student ID', value: profile.studentId, icon: Hash, editable: false },
    { label: 'Course', value: profile.course, icon: BookOpen, editable: true, key: 'course' },
    { label: 'Section', value: profile.section, icon: Users, editable: true, key: 'section' },
    { label: 'Email Address', value: profile.email, icon: Mail, editable: true, key: 'email' },
    { label: 'Contact Number', value: profile.contactNumber, icon: Phone, editable: true, key: 'contactNumber' },
    { label: 'Assigned Company', value: profile.company?.name || 'Not yet assigned', icon: Building2, editable: false },
    { label: 'Supervisor', value: profile.supervisorName || 'Not yet assigned', icon: User, editable: false },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {message && (
        <div className="bg-sti-blue-50 text-sti-blue text-sm px-4 py-3 rounded-xl border border-sti-blue-100">
          {message}
        </div>
      )}

      {/* Profile header */}
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-sti-blue flex items-center justify-center text-white text-3xl font-bold shrink-0">
          {initials}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-extrabold text-sti-gray-dark dark:text-white">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-sti-gray text-sm">{profile.course} • {profile.section}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[profile.ojt_status]}`}>
              {profile.ojt_status.replace('_', ' ')}
            </span>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-sti-gray-light dark:bg-slate-700 text-sti-gray-dark dark:text-slate-200">
              {profile.completedHours}/{profile.requiredHours} hrs
            </span>
          </div>
        </div>
        {!editing ? (
          <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
              Save
            </Button>
            <Button variant="secondary" icon={X} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        )}
      </Card>

      {/* Info grid */}
      <Card>
        <h3 className="font-bold text-sti-gray-dark dark:text-white mb-5">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {infoFields.map(({ label, value, icon: Icon, editable, key }) => (
            <div key={label}>
              <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </label>
              {editing && editable ? (
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="input-field"
                />
              ) : (
                <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 py-2.5">{value}</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default StudentProfile;
