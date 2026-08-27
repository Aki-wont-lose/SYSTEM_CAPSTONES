import { useState, useRef } from 'react';
import { Mail, Shield, Camera, Image as ImageIcon } from 'lucide-react';
import Card from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const AdminProfile = () => {
  const { user, updateUser } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const defaults = [{bg:'bg-sti-blue'},{bg:'bg-sti-yellow'},{bg:'bg-emerald-500'}];
  const isImg = user?.profilePicture?.startsWith('data:image');
  const bg = user?.profilePicture?.startsWith('DEFAULT:') ? user.profilePicture.split(':')[1] : 'bg-sti-blue';
  const handleGallery = (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    if (file.size > 4*1024*1024) { alert('Max 4MB'); return; }
    const r = new FileReader(); r.onload = async () => {
      setSaving(true);
      try { const res = await api.put('/profile', { profilePicture: r.result }); updateUser({ profilePicture: r.result, ...res.data.user || {} }); } catch{} finally{setSaving(false); setShowPicker(false);}
    }; r.readAsDataURL(file); e.target.value='';
  };
  const handleDefault = async (b) => {
    setSaving(true);
    try { const res = await api.put('/profile', { profilePicture: `DEFAULT:${b}` }); updateUser({ profilePicture: `DEFAULT:${b}`, ...res.data.user || {} }); } catch{} finally{setSaving(false); setShowPicker(false);}
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative shrink-0">
          {isImg ? <img src={user.profilePicture} alt="Pro" className="w-24 h-24 rounded-full object-cover border-2 border-white shadow" /> : <div className={`w-24 h-24 rounded-full ${bg} flex items-center justify-center text-white text-3xl font-bold`}>{user?.email?.[0]?.toUpperCase()}</div>}
          <button onClick={()=>setShowPicker(!showPicker)} className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-700 border rounded-full p-1.5 shadow"><Camera className="w-3.5 h-3.5" /></button>
          {showPicker && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-xl shadow border p-3 z-10 w-64">
              <p className="text-xs font-semibold mb-2">Change photo</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleGallery} className="hidden" />
              <button onClick={()=>fileRef.current?.click()} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sti-gray-light text-sm"><ImageIcon className="w-4 h-4" /> Gallery</button>
              <p className="text-xs text-sti-gray mt-2 mb-1">Default choices</p>
              <div className="flex gap-2">{defaults.map(d=> <button key={d.bg} onClick={()=>handleDefault(d.bg)} className={`w-10 h-10 rounded-full ${d.bg} flex items-center justify-center text-white text-xs font-bold border-2 ${bg===d.bg ? 'border-sti-blue' : 'border-transparent'}`}>{user?.email?.[0]?.toUpperCase()}</button>)}</div>
              {saving && <p className="text-xs text-sti-blue mt-2">Saving...</p>}
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-extrabold text-sti-gray-dark dark:text-white">{user?.role ? user.role.charAt(0)+user.role.slice(1).toLowerCase() : 'Administrator'}</h2>
          <p className="text-sti-gray text-sm">{user?.email}</p>
          <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full bg-sti-blue-50 text-sti-blue">
            {user?.role ? user.role.charAt(0)+user.role.slice(1).toLowerCase() : 'Admin'} Account
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-sti-gray-dark dark:text-white mb-5">Account Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 py-2.5">{user?.email}</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-sti-gray mb-1.5">
              <Shield className="w-3.5 h-3.5" /> Role
            </label>
            <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 py-2.5">Administrator</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminProfile;
