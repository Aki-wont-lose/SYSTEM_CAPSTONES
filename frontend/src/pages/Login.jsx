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

// Shared background shell — decorative only, no branding text/logo on it,
// so every step underneath can stay minimal.
const LoginShell = ({ children }) => (
  <div className="min-h-screen relative overflow-hidden bg-sti-blue-dark flex items-center justify-center p-4 sm:p-8">
    <div className="absolute inset-0 opacity-95">
      <div className="absolute top-0 left-[-10%] w-[30%] h-[160%] -rotate-12 bg-gradient-to-b from-sti-yellow to-sti-yellow-dark" />
      <div className="absolute top-0 left-[24%] w-[8%] h-[160%] -rotate-12 bg-sti-yellow/25" />
      <div className="absolute top-0 right-[-15%] w-[45%] h-[160%] -rotate-12 bg-sti-blue-light/30" />
      <div className="absolute top-0 right-[10%] w-[10%] h-[160%] -rotate-12 bg-sti-blue-light/15" />
    </div>
    <div className="absolute inset-0 bg-gradient-to-br from-sti-blue-dark/90 via-sti-blue-dark/70 to-sti-blue-dark/90" />
    <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-sti-blue-light/10 blur-2xl" />
    <div className="absolute -top-24 right-10 w-80 h-80 rounded-full bg-sti-yellow/10 blur-2xl" />

    <div className="relative w-full max-w-[380px] bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover p-6 sm:p-8 animate-slide-up">
      {children}
    </div>
  </div>
);

// Step 0: a single "Log In" button, nothing else.
const StartView = ({ onStart }) => (
  <Button variant="primary" className="w-full" onClick={onStart}>
    Log In
  </Button>
);

// Step 1: choose Student vs Staff
const ChoiceView = ({ onChoose, onBack }) => (
  <div className="space-y-3">
    <button
      type="button"
      onClick={() => onChoose('student')}
      className="w-full py-3 rounded-xl bg-sti-blue text-white text-sm font-semibold hover:bg-sti-blue-dark transition-colors"
    >
      Log in with Your Student Account
    </button>
    <button
      type="button"
      onClick={() => onChoose('admin')}
      className="w-full py-3 rounded-xl border border-black/10 dark:border-white/15 text-sti-gray-dark dark:text-white text-sm font-semibold hover:bg-sti-gray-light dark:hover:bg-white/5 transition-colors"
    >
      Log in with Staff Account
    </button>
    <button
      type="button"
      onClick={onBack}
      className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray hover:text-sti-gray-dark dark:hover:text-white pt-1"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> Back
    </button>
  </div>
);

// Step 2a: student — just the SSO button(s) + Back
const StudentView = ({ onBack }) => {
  const [ssoLoading, setSsoLoading] = useState(null); // 'microsoft' | 'google' | null
  const [error, setError] = useState('');
  const { loginWithMicrosoft, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleClick = async (provider) => {
    setError('');
    setSsoLoading(provider);
    try {
      if (provider === 'microsoft') {
        await loginWithMicrosoft();
      } else {
        await loginWithGoogle();
      }
      navigate('/dashboard');
    } catch (err) {
      const cancelled = err?.errorCode === 'user_cancelled' || err?.name === 'BrowserAuthError';
      if (!cancelled) {
        setError(err.response?.data?.message || err.message || 'Sign-in failed. Please try again.');
      }
    } finally {
      setSsoLoading(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="mb-1 flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isGoogleLoginEnabled && (
        <button
          type="button"
          onClick={() => handleClick('google')}
          disabled={ssoLoading !== null}
          className="w-full flex items-center justify-center gap-2.5 border border-black/10 dark:border-white/15 rounded-xl py-3 text-sm font-semibold text-sti-gray-dark dark:text-white hover:bg-sti-gray-light dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {ssoLoading === 'google'
            ? <span className="w-4 h-4 border-2 border-sti-gray border-t-transparent rounded-full animate-spin" />
            : <GoogleIcon />}
          Sign in with Google
        </button>
      )}
      {isMicrosoftLoginEnabled && (
        <button
          type="button"
          onClick={() => handleClick('microsoft')}
          disabled={ssoLoading !== null}
          className="w-full flex items-center justify-center gap-2.5 border border-black/10 dark:border-white/15 rounded-xl py-3 text-sm font-semibold text-sti-gray-dark dark:text-white hover:bg-sti-gray-light dark:hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {ssoLoading === 'microsoft'
            ? <span className="w-4 h-4 border-2 border-sti-gray border-t-transparent rounded-full animate-spin" />
            : <MicrosoftIcon />}
          Sign in with Microsoft
        </button>
      )}
      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray hover:text-sti-gray-dark dark:hover:text-white pt-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
    </div>
  );
};

// Step 2b: admin — plain email + password, no headings or hint text.
const AdminView = ({ onBack, onForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      const home = userData.role === 'ADMIN' ? '/admin/dashboard' : userData.role === 'COORDINATOR' ? '/coordinator/dashboard' : userData.role === 'SUPERVISOR' ? '/supervisor/dashboard' : '/dashboard';
      navigate(home);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="input-field pl-10"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="input-field pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sti-gray hover:text-sti-gray-dark"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={onForgot} className="text-xs font-medium text-sti-blue hover:underline">
            Forgot password?
          </button>
        </div>

        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          Log in
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray hover:text-sti-gray-dark dark:hover:text-white pt-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </form>
    </>
  );
};

const Login = () => {
  const [view, setView] = useState('start'); // 'start' | 'choice' | 'student' | 'admin'
  const [showForgot, setShowForgot] = useState(false);

  return (
    <LoginShell>
      {view === 'start' && <StartView onStart={() => setView('choice')} />}
      {view === 'choice' && <ChoiceView onChoose={setView} onBack={() => setView('start')} />}
      {view === 'student' && <StudentView onBack={() => setView('choice')} />}
      {view === 'admin' && (
        <AdminView onBack={() => setView('choice')} onForgot={() => setShowForgot(true)} />
      )}

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </LoginShell>
  );
};

const ForgotPasswordModal = ({ onClose }) => {
  const [stage, setStage] = useState('request'); // 'request' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [devToken, setDevToken] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPasswordRequest(email);
      setDevToken(res.data?.devResetToken || null);
      setStage('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordRequest(resetToken, newPassword);
      setStage('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid or expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-sti-gray hover:text-sti-gray-dark dark:hover:text-white">
          <X className="w-5 h-5" />
        </button>

        {stage === 'request' && (
          <>
            <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white mb-1">Reset your password</h2>
            <p className="text-sm text-sti-gray mb-5">Enter your email and we'll generate a reset link.</p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleRequest} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="input-field"
              />
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Send reset link
              </Button>
            </form>
          </>
        )}

        {stage === 'reset' && (
          <>
            <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white mb-1">Enter new password</h2>
            {devToken && (
              <div className="mb-4 text-xs bg-sti-yellow/15 text-sti-blue-dark dark:text-sti-yellow px-3 py-2 rounded-lg border border-sti-yellow/40">
                No email provider configured — for testing, your reset token is pre-filled below.
              </div>
            )}
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <form onSubmit={handleReset} className="space-y-4">
              <input
                type="text"
                required
                value={resetToken || devToken || ''}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Reset token"
                className="input-field text-xs"
              />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 characters)"
                className="input-field"
              />
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Reset password
              </Button>
            </form>
          </>
        )}

        {stage === 'done' && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-sti-blue mx-auto mb-3" />
            <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white mb-1">Password reset</h2>
            <p className="text-sm text-sti-gray mb-5">You can now sign in with your new password.</p>
            <Button variant="primary" className="w-full" onClick={onClose}>Back to login</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
