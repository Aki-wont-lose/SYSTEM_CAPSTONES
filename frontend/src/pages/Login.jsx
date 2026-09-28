import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Clock,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import { forgotPasswordRequest, resetPasswordRequest } from '../services/authService';
import { isMicrosoftLoginEnabled } from '../services/microsoftAuthService';

const MicrosoftIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

const YouTubeIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M21.6 6.2c-.2-.8-.8-1.4-1.6-1.6C18.6 4 12 4 12 4s-6.6 0-8 .6C3.2 4.8 2.6 5.4 2.4 6.2 2 7.6 2 12 2 12s0 4.4.4 5.8c.2.8.8 1.4 1.6 1.6 1.4.6 8 .6 8 .6s6.6 0 8-.6c.8-.2 1.4-.8 1.6-1.6.4-1.4.4-5.8.4-5.8s0-4.4-.4-5.8zm-11.9 9.4V8.4l6.4 3.6-6.4 3.6z"
    />
  </svg>
);

const FacebookIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.5 9.9v-7H7.9v-2.9h2.6V9.3c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6v2h2.8l-.4 2.9h-2.4v7C18.3 21.1 22 17 22 12z"
    />
  </svg>
);

const XIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="currentColor"
      d="M18.2 2.4h3.2l-7 8 8.2 11.2h-6.4l-5-6.8-5.8 6.8H2l7.5-8.6L1.8 2.4h6.6l4.5 6 5.3-6zm-1.1 16.3h1.8L7 4.2H5.1l12 14.5z"
    />
  </svg>
);

const heroImage = { src: '/hero/sti-login.jpg', alt: 'STI College Sta. Maria' };

const socials = [
  { href: 'https://www.youtube.com/user/STIdotEdu', label: 'YouTube', Icon: YouTubeIcon },
  { href: 'https://www.facebook.com/sti.edu', label: 'Facebook', Icon: FacebookIcon },
  { href: 'https://x.com/sticollege', label: 'X', Icon: XIcon }
];

const features = [
  {
    Icon: BookOpen,
    title: 'Every requirement in one place',
    description:
      'Interns open requirement guides, download PDF templates, and see exactly what is still due from any phone or computer, whether they are at school or at the company.'
  },
  {
    Icon: ClipboardCheck,
    title: 'Submit and get graded faster',
    description:
      'Weekly reports and documents upload in a single tap. Auto-graded items score instantly, and everything else goes straight into the coordinator review queue instead of an email thread.'
  },
  {
    Icon: Clock,
    title: 'Camera-verified attendance',
    description:
      'Time in and time out are stamped with a photo, so supervisors see the real hours each intern worked, and late or missed days are flagged automatically.'
  },
  {
    Icon: Users,
    title: 'Stay connected to your batch',
    description:
      'Message classmates, supervisors, and coordinators in one place, keep every conversation attached to the internship, and never lose track of who already replied.'
  }
];

const StudentView = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const handleClick = async () => {
    setError('');
    setLoading(true);
    try {
      const userData = await loginWithMicrosoft();
      navigate(userData?.mustChangePassword ? '/change-password' : '/dashboard');
    } catch (err) {
      const cancelled = err?.errorCode === 'user_cancelled' || err?.name === 'BrowserAuthError';
      if (!cancelled) setError(err.response?.data?.message || err.message || 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="flex gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {isMicrosoftLoginEnabled ? (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className="w-full min-h-[48px] flex items-center justify-center gap-2.5 border rounded-xl px-4 py-3 text-sm font-semibold leading-snug text-center hover:bg-sti-gray-light disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/10 dark:text-white"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-sti-gray border-t-transparent rounded-full animate-spin" />
          ) : (
            <MicrosoftIcon />
          )}
          Sign in with Microsoft
        </button>
      ) : (
        <p className="text-sm text-sti-gray">Microsoft sign-in is not configured yet. Please contact the registrar.</p>
      )}
      <button
        type="button"
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray pt-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>
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
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(email, password);
      if (userData?.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      const home =
        userData.role === 'ADMIN'
          ? '/admin/dashboard'
          : userData.role === 'COORDINATOR'
          ? '/coordinator/dashboard'
          : userData.role === 'SUPERVISOR'
          ? '/supervisor/dashboard'
          : '/dashboard';
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
        <div className="mb-4 flex gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300">
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
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sti-gray"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <Eye className={showPassword ? 'hidden' : 'w-4 h-4'} />
            <EyeOff className={!showPassword ? 'hidden' : 'w-4 h-4'} />
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
          className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray pt-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </form>
    </>
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
      await resetPasswordRequest(resetToken || devToken, newPassword);
      setStage('done');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset link is invalid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-end px-4 pt-4 shrink-0">
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-lg text-sti-gray hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto">
        {stage === 'request' && (
          <>
            <h2 className="text-lg font-bold mb-1 dark:text-white">Reset your password</h2>
            <p className="text-sm text-sti-gray mb-5">Enter your email and we'll generate a reset link.</p>
            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
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
            <h2 className="text-lg font-bold mb-1 dark:text-white">Enter new password</h2>
            {devToken && (
              <div className="mb-4 text-xs bg-sti-yellow/15 px-3 py-2 rounded-lg border dark:border-white/10">
                No email provider — token pre-filled below.
              </div>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
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
                placeholder="New password (min 8)"
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
            <h2 className="text-lg font-bold mb-1 dark:text-white">Password reset</h2>
            <p className="text-sm text-sti-gray mb-5">You can now sign in with your new password.</p>
            <Button variant="primary" className="w-full" onClick={onClose}>
              Back to login
            </Button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [view, setView] = useState(null);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (!view && !showForgot) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [view, showForgot]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setView(null);
        setShowForgot(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const closeDialog = () => {
    setView(null);
    setShowForgot(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-950 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img src="/sti-logo.png" alt="STI College Sta. Maria" className="block h-7 sm:h-9 w-auto shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="font-extrabold text-black dark:text-black text-sm sm:text-base lg:text-lg truncate">
                STI College Sta. Maria
              </p>
              <p className="font-bold text-black dark:text-black text-[11px] sm:text-xs lg:text-sm truncate">
                STI Education Services Group
              </p>
            </div>
          </div>
          <button
            onClick={() => setView('choice')}
            className="px-4 sm:px-5 py-2 rounded-xl bg-sti-blue text-white text-sm font-semibold hover:bg-sti-blue-dark shrink-0"
          >
            Log in
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <section className="w-full">
          <img
            src={heroImage.src}
            alt={heroImage.alt}
            className="block w-full h-auto"
          />
        </section>

        <section className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-sti-gray-light/70 dark:bg-slate-900/60">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col gap-3"
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-sti-blue-50 dark:bg-sti-blue/15 flex items-center justify-center text-sti-blue dark:text-sti-blue-light shrink-0">
                  <feature.Icon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h2 className="font-semibold text-sti-gray-dark dark:text-white leading-tight">{feature.title}</h2>
                <p className="text-sm text-sti-gray leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-sti-gray-light dark:bg-slate-900 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-sti-gray text-center sm:text-left">
            &copy; {new Date().getFullYear()} STI College Sta. Maria
          </p>
          <div className="flex items-center gap-2.5 sm:gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-sti-blue bg-white text-sti-blue hover:bg-sti-blue hover:text-white dark:bg-slate-800 dark:text-sti-blue-light dark:border-sti-blue-light dark:hover:bg-sti-blue-light dark:hover:text-slate-900 transition-colors"
                aria-label={label}
              >
                <Icon size={22} />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {view && !showForgot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col animate-slide-up overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-6 pt-5 shrink-0">
              <h2 className="text-lg font-bold text-sti-gray-dark dark:text-white">Log in</h2>
              <button
                onClick={closeDialog}
                className="p-2 -mr-2 -mt-1 rounded-lg text-sti-gray hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pb-6 pt-4 overflow-y-auto">
            {view === 'choice' && (
              <div className="space-y-3">
                <button
                  onClick={() => setView('student')}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-sti-blue text-white text-sm font-semibold hover:bg-sti-blue-dark leading-snug"
                >
                  Log in with Office 365
                </button>
                <button
                  onClick={() => setView('admin')}
                  className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-black/10 dark:border-white/10 text-sm font-semibold hover:bg-sti-gray-light dark:hover:bg-white/10 dark:text-white leading-snug"
                >
                  Admin Log in
                </button>
                <button
                  onClick={closeDialog}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-sti-gray hover:text-sti-gray-dark pt-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>
            )}
            {view === 'student' && <StudentView onBack={() => setView('choice')} />}
            {view === 'admin' && <AdminView onBack={() => setView('choice')} onForgot={() => setShowForgot(true)} />}
            </div>
          </div>
        </div>
      )}

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  );
};

export default Login;
