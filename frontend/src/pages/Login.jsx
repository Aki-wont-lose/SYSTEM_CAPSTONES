import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, X, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import { forgotPasswordRequest, resetPasswordRequest } from '../services/authService';
import { isMicrosoftLoginEnabled } from '../services/microsoftAuthService';
import { isGoogleLoginEnabled } from '../services/googleAuthService';

const MicrosoftIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

const GoogleIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 009 18z"/>
    <path fill="#FBBC05" d="M3.95 10.71A5.4 5.4 0 013.68 9c0-.59.1-1.17.27-1.71V4.96H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.04l2.99-2.33z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z"/>
  </svg>
);

// Login modal content (same as before but now in STI eLMS style header)
const LoginModalContent = ({ view, setView, onClose }) => {
  if (view === 'choice') {
    return (
      <div className="space-y-3">
        <button onClick={() => setView('student')} className="w-full py-3 rounded-xl bg-sti-blue text-white text-sm font-semibold hover:bg-sti-blue-dark">Log in with Your Student Account</button>
        <button onClick={() => setView('admin')} className="w-full py-3 rounded-xl border border-black/10 text-sm font-semibold hover:bg-sti-gray-light">Log in with Staff Account</button>
        <button onClick={onClose} className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray hover:text-sti-gray-dark pt-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
      </div>
    );
  }
  if (view === 'student') {
    return <StudentView onBack={() => setView('choice')} />;
  }
  if (view === 'admin') {
    return <AdminView onBack={() => setView('choice')} onForgot={() => setView('forgot')} />;
  }
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-lg text-sti-gray-dark">Welcome to SIMES</h3>
      <p className="text-sm text-sti-gray">Student Internship Monitoring and Evaluation System</p>
      <Button variant="primary" className="w-full" onClick={() => setView('choice')}>Log In</Button>
    </div>
  );
};

const StudentView = ({ onBack }) => {
  const [ssoLoading, setSsoLoading] = useState(null);
  const [error, setError] = useState('');
  const { loginWithMicrosoft, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const handleClick = async (provider) => {
    setError(''); setSsoLoading(provider);
    try {
      if (provider === 'microsoft') await loginWithMicrosoft(); else await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      const cancelled = err?.errorCode === 'user_cancelled' || err?.name === 'BrowserAuthError';
      if (!cancelled) setError(err.response?.data?.message || err.message || 'Sign-in failed.');
    } finally { setSsoLoading(null); }
  };
  return (
    <div className="space-y-2.5">
      {error && <div className="flex gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100"><AlertCircle className="w-4 h-4 mt-0.5" /><span>{error}</span></div>}
      {isGoogleLoginEnabled && <button type="button" onClick={() => handleClick('google')} disabled={ssoLoading!==null} className="w-full flex items-center justify-center gap-2.5 border rounded-xl py-3 text-sm font-semibold hover:bg-sti-gray-light disabled:opacity-50">{ssoLoading==='google' ? <span className="w-4 h-4 border-2 border-sti-gray border-t-transparent rounded-full animate-spin" /> : <GoogleIcon />} Sign in with Google</button>}
      {isMicrosoftLoginEnabled && <button type="button" onClick={() => handleClick('microsoft')} disabled={ssoLoading!==null} className="w-full flex items-center justify-center gap-2.5 border rounded-xl py-3 text-sm font-semibold hover:bg-sti-gray-light disabled:opacity-50">{ssoLoading==='microsoft' ? <span className="w-4 h-4 border-2 border-sti-gray border-t-transparent rounded-full animate-spin" /> : <MicrosoftIcon />} Sign in with Microsoft</button>}
      <button type="button" onClick={onBack} className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray pt-2"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
    </div>
  );
};

const AdminView = ({ onBack, onForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const userData = await login(email, password);
      const home = userData.role === 'ADMIN' ? '/admin/dashboard' : userData.role === 'COORDINATOR' ? '/coordinator/dashboard' : userData.role === 'SUPERVISOR' ? '/supervisor/dashboard' : '/dashboard';
      navigate(home);
    } catch (err) { setError(err.response?.data?.message || 'Invalid email or password'); } finally { setLoading(false); }
  };
  return (
    <>
      {error && <div className="mb-4 flex gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100"><AlertCircle className="w-4 h-4 mt-0.5" /><span>{error}</span></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="input-field pl-10" />
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
          <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input-field pl-10 pr-10" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sti-gray"><Eye className={showPassword ? 'hidden' : 'w-4 h-4'} /><EyeOff className={!showPassword ? 'hidden' : 'w-4 h-4'} /></button>
        </div>
        <div className="flex justify-end"><button type="button" onClick={onForgot} className="text-xs font-medium text-sti-blue hover:underline">Forgot password?</button></div>
        <Button type="submit" variant="primary" className="w-full" loading={loading}>Log in</Button>
        <button type="button" onClick={onBack} className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray pt-1"><ArrowLeft className="w-3.5 h-3.5" /> Back</button>
      </form>
    </>
  );
};

const Login = () => {
  const [view, setView] = useState(null); // null = landing, 'choice' | 'student' | 'admin' = modal
  const [showForgot, setShowForgot] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Header like elms.sti.edu - Log in on upper right */}
      <header className="sticky top-0 z-30 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/sti-logo.png" alt="STI" className="w-10 h-10 rounded object-cover" />
            <span className="font-bold text-sti-gray-dark">STI Education Services Group</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hidden sm:block text-sm font-medium text-sti-gray hover:text-sti-blue">Campus Helpdesk</a>
            <a href="#" className="hidden sm:block text-sm font-medium text-sti-gray hover:text-sti-blue">FAQ</a>
            <button onClick={() => setView('choice')} className="bg-[#0a4a8a] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#083a6d]">Log in</button>
          </div>
        </div>
      </header>

      {/* Hero like STI - photo on left, text on right */}
      <section className="bg-[#0a2a5a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="relative rounded-2xl overflow-hidden bg-white">
            <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop" alt="Students" className="w-full h-64 sm:h-80 object-cover" />
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-xl p-3 flex items-center gap-3">
              <span className="bg-[#0a4a8a] text-white text-xs font-bold px-2 py-1 rounded">CASE STUDY</span>
              <span className="font-bold text-[#0a4a8a] text-sm">NEO LMS AND STI COLLEGE</span>
              <img src="/sti-logo.png" alt="STI" className="w-8 h-8 ml-auto" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">For more than 4 years, STI's blended learning approach using eLearning Management System (eLMS) makes education effective and accessible anytime, anywhere.</h1>
            <button onClick={() => setView('choice')} className="mt-6 border border-white text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-white hover:text-[#0a2a5a]">Learn more</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-sti-gray-dark">19,167</p>
            <p className="text-sm text-sti-gray">Courses</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-sti-gray-dark">2,109</p>
            <p className="text-sm text-sti-gray">Teachers</p>
          </div>
        </div>
      </section>

      {/* Photo you will give - placeholder for now */}
      <section className="bg-[#ffcb05] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#0a4a8a] font-bold">BE MORE. BE STI. - Photo you will provide will go here</p>
        </div>
      </section>

      {/* Login Modal */}
      {view && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={()=>setView(null)}>
          <div className="bg-white rounded-2xl shadow-cardHover w-full max-w-md p-6 relative" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setView(null)} className="absolute top-4 right-4 text-sti-gray"><X className="w-5 h-5" /></button>
            <div className="mt-2">
              {view === 'choice' && <LoginModalContent view={view} setView={setView} onClose={()=>setView(null)} />}
              {view === 'student' && <StudentView onBack={()=>setView('choice')} />}
              {view === 'admin' && <AdminView onBack={()=>setView('choice')} onForgot={()=>{setView(null); setShowForgot(true)}} />}
            </div>
          </div>
        </div>
      )}
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
};

const ForgotPasswordModal = ({ onClose }) => {
  const [stage, setStage] = useState('request');
  const [email, setEmail] = useState('');
  const [devToken, setDevToken] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleRequest = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { const res = await forgotPasswordRequest(email); setDevToken(res.data?.devResetToken || null); setStage('reset'); } catch (err) { setError(err.response?.data?.message || 'Something went wrong'); } finally { setLoading(false); }
  };
  const handleReset = async (e) => {
    e.preventDefault(); setError(''); if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; } setLoading(true);
    try { await resetPasswordRequest(resetToken, newPassword); setStage('done'); } catch (err) { setError(err.response?.data?.message || 'Reset link is invalid'); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-cardHover w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-sti-gray"><X className="w-5 h-5" /></button>
        {stage === 'request' && (
          <>
            <h2 className="text-lg font-bold mb-1">Reset your password</h2>
            <p className="text-sm text-sti-gray mb-5">Enter your email and we'll generate a reset link.</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleRequest} className="space-y-4">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="input-field" />
              <Button type="submit" variant="primary" className="w-full" loading={loading}>Send reset link</Button>
            </form>
          </>
        )}
        {stage === 'reset' && (
          <>
            <h2 className="text-lg font-bold mb-1">Enter new password</h2>
            {devToken && <div className="mb-4 text-xs bg-sti-yellow/15 px-3 py-2 rounded-lg border">No email provider — token pre-filled below.</div>}
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleReset} className="space-y-4">
              <input type="text" required value={resetToken || devToken || ''} onChange={(e) => setResetToken(e.target.value)} placeholder="Reset token" className="input-field text-xs" />
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8)" className="input-field" />
              <Button type="submit" variant="primary" className="w-full" loading={loading}>Reset password</Button>
            </form>
          </>
        )}
        {stage === 'done' && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-sti-blue mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-1">Password reset</h2>
            <p className="text-sm text-sti-gray mb-5">You can now sign in with your new password.</p>
            <Button variant="primary" className="w-full" onClick={onClose}>Back to login</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
