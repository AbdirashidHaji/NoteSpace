import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  NotebookPen, LayoutGrid, Star, Pin, Archive, Trash2, FolderOpen, Tags,
  Settings, LogOut, Plus, X, Sun, Moon, Keyboard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notesApi, categoriesApi } from '../../api/services';
import { apiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { initials, avatarColor } from '../../utils/format';
import ShortcutModal from '../ui/ShortcutModal';
import Modal from '../ui/Modal';

const NAV = [
  { to: '/notes', label: 'All Notes', icon: LayoutGrid, countKey: 'all' },
  { to: '/favorites', label: 'Favorites', icon: Star, countKey: 'favorites' },
  { to: '/pinned', label: 'Pinned', icon: Pin, countKey: 'pinned' },
  { to: '/archive', label: 'Archived', icon: Archive, countKey: 'archived' },
  { to: '/trash', label: 'Trash', icon: Trash2, countKey: 'trash' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counts, setCounts] = useState({ all: 0, favorites: 0, pinned: 0, archived: 0, trash: 0 });
  const [categoryCount, setCategoryCount] = useState(0);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Refresh counts when the route changes and on window focus.
  useEffect(() => {
    let cancelled = false;
    Promise.all([notesApi.counts(), categoriesApi.list()])
      .then(([c, cats]) => {
        if (!cancelled) {
          setCounts(c.counts);
          setCategoryCount(cats.total ?? cats.categories.length);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Ctrl+K focuses search, Ctrl+N creates a note, ? shows shortcuts.
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/notes', { state: { focusSearch: true } });
      } else if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        navigate('/notes/new');
      } else if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !e.target.isContentEditable) {
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const handleLogout = () => {
    logout();
    toast.info('You have been signed out.');
    navigate('/login');
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-white dark:bg-surface-dark-2 dark:border-r dark:border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 shadow-soft">
          <NotebookPen size={18} className="text-white" />
        </div>
        <div>
          <p className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">NoteSpace</p>
          <p className="text-[11px] text-slate-400">Your space to think</p>
        </div>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 overflow-y-auto px-3" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, countKey }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }`
                }
              >
                <Icon size={17} strokeWidth={2} />
                <span className="flex-1">{label}</span>
                {counts[countKey] > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {counts[countKey]}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Library section */}
        <div className="mt-6 mb-1 flex items-center justify-between px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Library</p>
          <button
            type="button"
            onClick={() => setCatModalOpen(true)}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800"
            title="Create category"
            aria-label="Create category"
          >
            <Plus size={14} />
          </button>
        </div>
        <ul className="space-y-0.5">
          <li>
            <NavLink
              to="/categories"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <FolderOpen size={17} />
              <span className="flex-1">Categories</span>
              {categoryCount > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {categoryCount}
                </span>
              )}
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/tags"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              <Tags size={17} />
              <span>Tags</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${avatarColor(user?.email)}`}>
            {initials(user?.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
            <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`
            }
          >
            <Settings size={16} /> Settings
          </NavLink>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <Keyboard size={13} /> Keyboard shortcuts
          <kbd className="ml-auto rounded border border-slate-200 px-1.5 text-[10px] dark:border-slate-700">?</kbd>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-100 lg:block dark:border-slate-800">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <aside className="relative h-full w-72 shadow-pop animate-slide-up">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close menu"
              type="button"
            >
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Outlet context={{ openMobileNav: () => setMobileOpen(true) }} />
      </main>

      <CategoryQuickCreate open={catModalOpen} onClose={() => setCatModalOpen(false)} onCreated={() => setCategoryCount((c) => c + 1)} />
      <ShortcutModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

/** Small modal to create a category directly from the sidebar. */
function CategoryQuickCreate({ open, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setError('');
      setColor('#6366f1');
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await categoriesApi.create({ name: name.trim(), color });
      toast.success('Category created.');
      onCreated?.();
      onClose();
    } catch (err) {
      const msg = apiError(err, 'Could not create category.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create category">
      <form onSubmit={submit}>
        <label htmlFor="qc-name" className="label">Name</label>
        <input
          id="qc-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Work, Ideas, Recipes"
          maxLength={80}
          autoFocus
        />
        <label className="label mt-4">Color</label>
        <div className="flex gap-2" role="radiogroup" aria-label="Category color">
          {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'].map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-2 dark:ring-offset-surface-dark-2' : ''}`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Creating…' : 'Create category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

