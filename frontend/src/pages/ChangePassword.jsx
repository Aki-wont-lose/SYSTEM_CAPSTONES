import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, LogOut, ShieldCheck } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';

const ChangePassword = () => {
  const { user, changePassword, logout, mustChangePassword, roleHome } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordScore = (() => {
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (newPassword.length >= 12) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/\d/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your temporary password.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess('Password updated. Taking you to your dashboard...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate(roleHome || '/dashboard', { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sti-blue-dark flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-95">
        <div className="absolute top-0 left-[-10%] w-[30%] h-[160%] -rotate-12 bg-gradient-to-b from-sti-yellow to-sti-yellow-dark" />
        <div className="absolute top-0 right-[-15%] w-[45%] h-[160%] -rotate-12 bg-sti-blue-light/30" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-sti-blue-dark/90 via-sti-blue-dark/70 to-sti-blue-dark/90" />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-cardHover p-6 sm:p-8">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sti-blue flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sti-gray-dark dark:text-white">Set up your password</h1>
              <p className="text-xs text-sti-gray">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="p-2 rounded-lg text-sti-gray hover:bg-sti-gray-light" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs rounded-xl px-3 py-2.5 mb-5">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>You are signed in with a temporary password. Create your own password to continue using SIMES.</span>
        </div>

        {error && (
          <div className="mb-4 flex gap-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl border border-red-100 dark:border-red-900">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 flex gap-2 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-sm px-4 py-3 rounded-xl border border-green-200 dark:border-green-900">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sti-gray" />
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Temporary password"
              className="input-field pl-10 pr-10"
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sti-gray">
              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <input
              type={showPasswords ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min. 8 characters)"
              className="input-field"
              autoComplete="new-password"
            />
            {newPassword && (
              <div className="flex gap-1 mt-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      i < passwordScore
                        ? passwordScore <= 2 ? 'bg-red-400' : passwordScore <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                        : 'bg-sti-gray-light dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}
            {newPassword && (
              <p className="text-[11px] text-sti-gray mt-1">
                {passwordScore <= 2 ? 'Weak password — add length, numbers, or symbols.' : passwordScore <= 3 ? 'Fair — a little more complexity helps.' : 'Strong password.'}
              </p>
            )}
          </div>

          <input
            type={showPasswords ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="input-field"
            autoComplete="new-password"
          />

          <Button type="submit" variant="primary" className="w-full" loading={loading}>
            Save password and continue
          </Button>
        </form>

        {!mustChangePassword && (
          <button onClick={() => navigate(roleHome || '/dashboard')} className="w-full text-center text-xs text-sti-gray hover:text-sti-blue mt-4">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
