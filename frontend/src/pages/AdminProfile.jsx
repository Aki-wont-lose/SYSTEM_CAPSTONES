import { useEffect, useState, useRef } from 'react';
import { Mail, Shield, Camera, Image as ImageIcon, User, Save } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

// Let an admin view and update their profile, photo, and email
const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({ firstName: '', lastName: '', email: '' });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const defaults = [{bg:'bg-sti-blue'},{bg:'bg-sti-yellow'},{bg:'bg-emerald-500'}];
  const isImg = user?.profilePicture?.startsWith('data:image');
  // Pull the stored default color out of the "DEFAULT:<color>" marker, if that's the current picture
  const bg = user?.profilePicture?.startsWith('DEFAULT:') ? user.profilePicture.split(':')[1] : 'bg-sti-blue';
  const isEmailLocked = user?.role === 'SUPERVISOR' || user?.role === 'COORDINATOR';

  // Load the current profile details from the API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/profile');
        const profileUser = res.data?.data?.user || {};
        setDetails({
          firstName: profileUser.firstName || '',
          lastName: profileUser.lastName || '',
          email: profileUser.email || user?.email || ''
        });
        const patch = {};
        if (profileUser.firstName !== undefined) patch.firstName = profileUser.firstName;
        if (profileUser.lastName !== undefined) patch.lastName = profileUser.lastName;
        if (profileUser.profilePicture) patch.profilePicture = profileUser.profilePicture;
        if (Object.keys(patch).length > 0) updateUser(patch);
      } catch {}
    };
    load();
  }, []);

  const fullName = [details.firstName, details.lastName].filter(Boolean).join(' ');
  // Friendlier label for the user's role
  const roleLabel = user?.isSuperAdmin ? 'Super Admin' : (user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Administrator');

  // Save the name changes
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      const res = await api.put('/profile', {
        firstName: details.firstName,
        lastName: details.lastName
      });
      const updated = res.data?.data || {};
      setDetails(d => ({ ...d, firstName: updated.firstName ?? d.firstName, lastName: updated.lastName ?? d.lastName }));
      updateUser({ firstName: updated.firstName, lastName: updated.lastName });
      setToast({ tone: 'success', msg: 'Profile details saved' });
    } catch (err) {
      setToast({ tone: 'error', msg: err.response?.data?.message || 'Could not save your details' });
    } finally {
      setSavingDetails(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Save the sign-in email address
  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await api.put('/profile', { email: details.email });
      const updated = res.data?.data || {};
      setDetails(d => ({ ...d, email: updated.email || d.email }));
      updateUser({ email: updated.email || details.email });
      setToast({ tone: 'success', msg: 'Email address saved. Use it to sign in next time.' });
    } catch (err) {
      setToast({ tone: 'error', msg: err.response?.data?.message || 'Could not save your email' });
    } finally {
      setSavingEmail(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  // Read a chosen image, reject oversized files, and upload it as the profile picture
  const handleGallery = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4*1024*1024) { alert('Max 4MB'); return; }
    const r = new FileReader(); r.onload = async () => {
      setSaving(true);
      try {
        const res = await api.put('/profile', { profilePicture: r.result });
        const updated = res.data?.data || res.data?.user || {};
        updateUser({ ...updated, profilePicture: r.result });
      } catch {} finally {
        setSaving(false);
        setShowPicker(false);
      }
    }; r.readAsDataURL(file);
  };
  // Apply a preset solid-color avatar
  const handleDefault = async (b) => {
    setSaving(true);
    try {
      const res = await api.put('/profile', { profilePicture: `DEFAULT:${b}` });
      const updated = res.data?.data || res.data?.user || {};
      updateUser({ ...updated, profilePicture: `DEFAULT:${b}` });
    } catch {} finally {
      setSaving(false);
      setShowPicker(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          {isImg ? <img src={user.profilePicture} alt="Pro" className="w-24 h-24 rounded-full object-cover border-2 border-white shadow" /> : <div className={`w-24 h-24 rounded-full ${bg} flex items-center justify-center text-white text-3xl font-bold`}>{user?.email?.[0]?.toUpperCase()}</div>}
          <button onClick={()=>setShowPicker(true)} className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-700 border rounded-full p-1.5 shadow"><Camera className="w-3.5 h-3.5" /></button>
          {showPicker && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setShowPicker(false)}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover border p-4 w-full max-w-xs" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Change photo</p>
                  <button onClick={()=>setShowPicker(false)} className="text-sti-gray">✕</button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleGallery} className="hidden" />
                <button onClick={()=>fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sti-blue text-white text-sm font-semibold"><ImageIcon className="w-4 h-4" /> Gallery</button>
                <p className="text-xs text-sti-gray mt-3 mb-2 text-center">Or choose default</p>
                <div className="flex gap-2 justify-center">{defaults.map(d=> <button key={d.bg} onClick={()=>handleDefault(d.bg)} className={`w-12 h-12 rounded-full ${d.bg} flex items-center justify-center text-white text-sm font-bold border-2 ${bg===d.bg ? 'border-sti-blue ring-2 ring-sti-blue/20' : 'border-transparent'}`}>{user?.email?.[0]?.toUpperCase()}</button>)}</div>
                {saving && <p className="text-xs text-sti-blue mt-3 text-center">Saving...</p>}
              </div>
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-extrabold text-sti-gray-dark dark:text-white">{fullName || roleLabel}</h2>
          <p className="text-sti-gray text-sm">{user?.email}</p>
          <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-sti-blue-50 text-sti-blue">
            {roleLabel} Account
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-sti-gray-dark dark:text-white mb-5">Personal Information</h3>
        <form onSubmit={handleSaveDetails} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <User className="w-3.5 h-3.5" /> First Name
            </label>
            <input
              value={details.firstName}
              onChange={(e) => setDetails({ ...details, firstName: e.target.value })}
              className="input-field"
              placeholder="Your first name"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <User className="w-3.5 h-3.5" /> Last Name
            </label>
            <input
              value={details.lastName}
              onChange={(e) => setDetails({ ...details, lastName: e.target.value })}
              className="input-field"
              placeholder="Your last name"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" icon={Save} loading={savingDetails} className="text-sm px-4 py-2">Save details</Button>
            {toast && <p className={`text-xs ${toast.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{toast.msg}</p>}
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold text-sti-gray-dark dark:text-white mb-5">Account Information</h3>
        <form onSubmit={isEmailLocked ? (e) => e.preventDefault() : handleSaveEmail} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
              {isEmailLocked && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sti-gray-light text-sti-gray dark:bg-white/10">Locked</span>
              )}
            </label>
            <input
              type="email"
              value={details.email || user?.email || ''}
              onChange={(e) => {
                if (!isEmailLocked) setDetails({ ...details, email: e.target.value });
              }}
              readOnly={isEmailLocked}
              disabled={isEmailLocked}
              className={`input-field ${isEmailLocked ? 'bg-sti-gray-light/70 dark:bg-slate-800/70 text-sti-gray-dark dark:text-slate-300 cursor-not-allowed opacity-80' : ''}`}
              placeholder="you@stamaria.sti.edu.ph"
            />
            {isEmailLocked && (
              <p className="text-[11px] text-sti-gray mt-1.5">
                Contact an administrator if your registered email address needs to be updated.
              </p>
            )}
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <Shield className="w-3.5 h-3.5" /> Role
            </label>
            <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 py-2.5 flex items-center gap-2">
              {roleLabel}
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sti-gray-light text-sti-gray dark:bg-white/10">Locked</span>
            </p>
          </div>
          {!isEmailLocked && (
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" icon={Save} loading={savingEmail} className="text-sm px-4 py-2">Save email</Button>
              {toast && <p className={`text-xs ${toast.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{toast.msg}</p>}
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};

export default AdminProfile;
