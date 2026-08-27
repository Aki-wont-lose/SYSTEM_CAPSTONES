import { useEffect, useState, useRef } from 'react';
import { Mail, Phone, BookOpen, Users, Hash, Camera, Image as ImageIcon, Check } from 'lucide-react';
import Card from '../components/Card';
import { getMyProfile, updateMyProfile } from '../services/studentService';

const statusStyles = {
  NOT_STARTED: 'bg-gray-100 text-sti-gray-dark',
  ONGOING: 'bg-sti-blue-50 text-sti-blue',
  COMPLETED: 'bg-yellow-50 text-sti-yellow-dark',
  ON_HOLD: 'bg-orange-50 text-orange-600',
  FAILED: 'bg-red-50 text-red-600',
};

const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [savingPic, setSavingPic] = useState(false);
  const fileRef = useRef(null);
  const defaultAvatars = [
    { bg: 'bg-sti-blue', label: 'Blue' },
    { bg: 'bg-sti-yellow', label: 'Yellow' },
    { bg: 'bg-emerald-500', label: 'Green' },
  ];

  const loadProfile = async () => {
    try {
      const res = await getMyProfile();
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleGalleryPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { alert('Image too large (max 4MB)'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setSavingPic(true);
      try { const res = await updateMyProfile({ profilePicture: base64 }); setProfile(res.data); setShowPicker(false); } catch (err) { alert('Failed to update photo'); }
      finally { setSavingPic(false); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDefaultPick = async (bg) => {
    // Use initials with chosen bg as "default choice" - store as null to use initials with bg, or store bg code
    setSavingPic(true);
    try {
      // Store a marker like "DEFAULT:blue" to indicate default choice, or clear to use default
      const res = await updateMyProfile({ profilePicture: `DEFAULT:${bg}` });
      setProfile(res.data);
      setShowPicker(false);
    } catch { alert('Failed'); } finally { setSavingPic(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-sti-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = `${profile.firstName[0]}${profile.lastName[0]}`;

  // Read-only profile - no editing, no generated company/supervisor placeholders (admin assigns via Companies)
  const infoFields = [
    { label: 'Student ID', value: profile.studentId, icon: Hash },
    { label: 'Course', value: profile.course, icon: BookOpen },
    { label: 'Section', value: profile.section, icon: Users },
    { label: 'Email Address', value: profile.email, icon: Mail },
    { label: 'Contact Number', value: profile.contactNumber, icon: Phone },
  ];

  const getAvatarBg = () => {
    if (profile.profilePicture?.startsWith('DEFAULT:')) return profile.profilePicture.split(':')[1];
    return 'bg-sti-blue';
  };
  const hasPhoto = profile.profilePicture && profile.profilePicture.startsWith('data:image');
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-3xl mx-auto px-1 sm:px-0">
      {/* Profile header - stacked on cp */}
      <Card className="flex flex-col items-center sm:flex-row sm:items-start gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="relative shrink-0">
          {hasPhoto ? (
            <img src={profile.profilePicture} alt="Profile" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-white shadow" />
          ) : (
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full ${getAvatarBg()} flex items-center justify-center text-white text-2xl sm:text-3xl font-bold`}>
              {initials}
            </div>
          )}
          <button onClick={()=>setShowPicker(!showPicker)} className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-700 border border-black/10 rounded-full p-1.5 shadow hover:bg-sti-gray-light">
            <Camera className="w-3.5 h-3.5 text-sti-gray-dark dark:text-white" />
          </button>
          {showPicker && (
            <div className="absolute top-full mt-2 left-1/2 sm:left-0 -translate-x-1/2 sm:translate-x-0 bg-white dark:bg-slate-800 rounded-xl shadow-cardHover border border-black/5 p-3 z-10 w-64">
              <p className="text-xs font-semibold text-sti-gray-dark dark:text-white mb-2">Change profile photo</p>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleGalleryPick} className="hidden" />
              <button onClick={()=>fileRef.current?.click()} disabled={savingPic} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-sti-gray-light dark:hover:bg-white/10 text-sm">
                <ImageIcon className="w-4 h-4" /> Gallery
              </button>
              <p className="text-xs text-sti-gray mt-2 mb-1">Default choices</p>
              <div className="flex gap-2">
                {defaultAvatars.map(d => (
                  <button key={d.bg} onClick={()=>handleDefaultPick(d.bg)} disabled={savingPic} className={`w-10 h-10 rounded-full ${d.bg} flex items-center justify-center text-white text-xs font-bold border-2 ${getAvatarBg()===d.bg ? 'border-sti-blue' : 'border-transparent'}`}>
                    {initials}
                  </button>
                ))}
              </div>
              {savingPic && <p className="text-xs text-sti-blue mt-2">Saving...</p>}
            </div>
          )}
        </div>
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-sti-gray-dark dark:text-white truncate">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-sti-gray text-xs sm:text-sm break-words">{profile.course} • {profile.section}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className={`text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[profile.ojt_status]}`}>
              {profile.ojt_status.replace('_', ' ')}
            </span>
            <span className="text-[11px] sm:text-xs font-medium px-3 py-1 rounded-full bg-sti-gray-light dark:bg-slate-700 text-sti-gray-dark dark:text-slate-200">
              {profile.completedHours}/{profile.requiredHours} hrs
            </span>
          </div>
        </div>
      </Card>

      {/* Info grid - single column on cp */}
      <Card className="p-4 sm:p-6">
        <h3 className="font-bold text-sti-gray-dark dark:text-white mb-4 sm:mb-5 text-sm sm:text-base">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {infoFields.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0">
              <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-sti-gray mb-1 sm:mb-1.5">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </label>
              <p className="text-sm font-medium text-sti-gray-dark dark:text-slate-200 py-2 break-all">{value}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-sti-gray mt-4 sm:mt-6 text-center sm:text-left">Contact your OJT coordinator to update your profile.</p>
      </Card>
    </div>
  );
};

export default StudentProfile;
