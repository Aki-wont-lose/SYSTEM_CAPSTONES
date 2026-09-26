import { useEffect, useState } from 'react';
import { Link2, Unlink, ShieldCheck } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { isMicrosoftLoginEnabled, getLinkedAccounts, linkMicrosoftAccount, unlinkMicrosoftAccount } from '../services/microsoftAuthService';

const providerLabel = (provider) => (provider === 'MICROSOFT' ? 'Microsoft' : provider.charAt(0) + provider.slice(1).toLowerCase());

const LinkedAccountsCard = () => {
  const [state, setState] = useState({ loading: true, accounts: [], hasPassword: false });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      const res = await getLinkedAccounts();
      setState({ loading: false, accounts: res.data?.accounts || [], hasPassword: !!res.data?.hasPassword });
    } catch {
      setState({ loading: false, accounts: [], hasPassword: false });
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (tone, msg) => { setToast({ tone, msg }); setTimeout(() => setToast(null), 4000); };

  const handleLink = async () => {
    setBusy(true);
    try {
      const res = await linkMicrosoftAccount();
      showToast('success', res.message || 'Microsoft account linked');
      await load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not link your Microsoft account');
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Unlink your Microsoft account? You will sign in with your email and password instead.')) return;
    setBusy(true);
    try {
      const res = await unlinkMicrosoftAccount();
      showToast('success', res.message || 'Microsoft account unlinked');
      await load();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Could not unlink your Microsoft account');
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return null;

  const microsoft = state.accounts.find((a) => a.provider === 'MICROSOFT');
  const otherAccounts = state.accounts.filter((a) => a.provider !== 'MICROSOFT');

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-sti-blue-50 dark:bg-sti-blue/20 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-sti-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sti-gray-dark dark:text-white">Sign-in Methods</h3>
          <p className="text-xs text-sti-gray mt-0.5">Link a Microsoft account so you can sign in with either your password or your school account.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-black/5 dark:border-white/10">
          <div className="w-9 h-9 rounded-lg bg-[#0078D4] flex items-center justify-center text-white text-xs font-bold shrink-0">M</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">Microsoft</p>
            {microsoft ? (
              <p className="text-xs text-sti-gray truncate">Linked to {microsoft.email}</p>
            ) : (
              <p className="text-xs text-sti-gray">Not linked — you sign in with your email and password</p>
            )}
          </div>
          {microsoft ? (
            <Button
              variant="secondary"
              icon={Unlink}
              loading={busy}
              onClick={handleUnlink}
              disabled={!state.hasPassword}
              className="text-xs px-2.5 py-1.5 shrink-0"
            >
              Unlink
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={Link2}
              loading={busy}
              onClick={handleLink}
              disabled={!isMicrosoftLoginEnabled}
              className="text-xs px-2.5 py-1.5 shrink-0"
            >
              Link
            </Button>
          )}
        </div>

        {otherAccounts.map((account) => (
          <div key={account.id} className="flex items-center gap-3 p-3 rounded-xl border border-black/5 dark:border-white/10">
            <div className="w-9 h-9 rounded-lg bg-sti-gray-light flex items-center justify-center text-sti-gray text-xs font-bold shrink-0">{providerLabel(account.provider).charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sti-gray-dark dark:text-white">{providerLabel(account.provider)}</p>
              <p className="text-xs text-sti-gray truncate">Linked to {account.email}</p>
            </div>
          </div>
        ))}
      </div>

      {microsoft && !state.hasPassword && (
        <p className="text-[11px] text-sti-gray mt-3">Set a password before unlinking, otherwise you would have no way to sign in.</p>
      )}
      {!isMicrosoftLoginEnabled && (
        <p className="text-[11px] text-sti-gray mt-3">Microsoft sign-in is not configured on this deployment yet.</p>
      )}
      {toast && (
        <p className={`text-xs mt-3 ${toast.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>{toast.msg}</p>
      )}
    </Card>
  );
};

export default LinkedAccountsCard;
