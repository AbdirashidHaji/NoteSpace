import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, Lock, Palette, Sun, Moon, LogOut, Info, Keyboard, Check } from 'lucide-react';
import { authApi } from '../api/services';
import { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatDateTime, initials, avatarColor } from '../utils/format';
import ShortcutModal from '../components/ui/ShortcutModal';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="card mb-5 p-6 animate-fade-in">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-500/10">
          <Icon size={17} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameDirty, setNameDirty] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => setName(user?.name || ''), [user?.name]);

  const saveName = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === user?.name) return;
    setSavingName(true);
    try {
      const { user: updated } = await authApi.updateProfile({ name: name.trim() });
      setUser(updated);
      setNameDirty(false);
      toast.success('Display name updated.');
    } catch (err) {
      toast.error(apiError(err, 'Could not update your name.'));
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error('New password must be at least 8 characters.');
    if (pw.next !== pw.confirm) return toast.error('New passwords do not match.');
    setSavingPw(true);
    try {
      await authApi.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPw({ current: '', next: '', confirm: '' });
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(apiError(err, 'Could not change your password.'));
    } finally {
      setSavingPw(false);
    }
  };

  const doLogout = () => {
    logout();
    toast.info('You have been signed out.');
    navigate('/login');
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-surface-dark/80 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={19} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <Section icon={User} title="Profile" description="How you appear across NoteSpace.">
          <form onSubmit={saveName}>
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${avatarColor(user?.email)}`}>
                {initials(user?.name)}
              </div>
              <div className="flex-1">
                <label htmlFor="display-name" className="label">Display name</label>
                <input
                  id="display-name"
                  className="input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameDirty(true);
                  }}
                  maxLength={100}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingName || !nameDirty || !name.trim()}>
                {savingName ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Section>

        <Section icon={Lock} title="Change password" description="Use at least 8 characters.">
          <form onSubmit={changePassword}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="cur-pw" className="label">Current</label>
                <input id="cur-pw" type="password" autoComplete="current-password" className="input" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} required />
              </div>
              <div>
                <label htmlFor="new-pw" className="label">New</label>
                <input id="new-pw" type="password" autoComplete="new-password" className="input" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} required />
              </div>
              <div>
                <label htmlFor="confirm-pw" className="label">Confirm new</label>
                <input id="confirm-pw" type="password" autoComplete="new-password" className="input" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingPw}>
                {savingPw ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </Section>

        <Section icon={Palette} title="Appearance" description="Choose how NoteSpace looks on this device.">
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Theme">
            {[
              { key: 'light', label: 'Light', icon: Sun },
              { key: 'dark', label: 'Dark', icon: Moon },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={theme === key}
                onClick={() => setTheme(key)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  theme === key
                    ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-500/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                }`}
              >
                <Icon size={18} className={theme === key ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'} />
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
                {theme === key && <Check size={15} className="text-primary-600 dark:text-primary-400" />}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={Info} title="Account information">
          <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 text-sm sm:grid-cols-[160px_1fr]">
            <dt className="text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{user?.name}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{user?.email}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Member since</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{formatDateTime(user?.created_at)}</dd>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setShortcutsOpen(true)} className="btn-secondary">
              <Keyboard size={15} /> Keyboard shortcuts
            </button>
            <button type="button" onClick={() => setConfirmLogout(true)} className="btn-danger">
              <LogOut size={15} /> Log out
            </button>
          </div>
        </Section>
      </div>

      <ShortcutModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        message="You can sign back in any time — your notes are safe."
        confirmLabel="Sign out"
        danger
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
