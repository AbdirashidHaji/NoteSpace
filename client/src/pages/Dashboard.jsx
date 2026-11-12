import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { Search, X, Plus, Menu, Sun, Moon } from 'lucide-react';
import { notesApi, categoriesApi, tagsApi } from '../api/services';
import { apiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks';
import { NotesGrid, ViewToggle } from '../components/notes/NotesGrid';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { LoadingBlock } from '../components/ui/Loading';
import { useLocalStorage } from '../hooks';
import { initials, avatarColor } from '../utils/format';

const VIEW_META = {
  all: { title: 'All Notes', subtitle: 'Every note in your space', icon: 'notes' },
  favorites: { title: 'Favorites', subtitle: 'Notes you starred', icon: 'favorites' },
  pinned: { title: 'Pinned Notes', subtitle: 'Kept at the top of your mind', icon: 'notes' },
  archive: { title: 'Archived Notes', subtitle: 'Filed away, not forgotten', icon: 'archive' },
  trash: { title: 'Trash', subtitle: 'Notes deleted in the last 30 days', icon: 'trash' },
};

function parseRoute(pathname) {
  if (pathname.startsWith('/favorites')) return { view: 'favorites' };
  if (pathname.startsWith('/pinned')) return { view: 'pinned' };
  if (pathname.startsWith('/archive')) return { view: 'archive' };
  if (pathname.startsWith('/trash')) return { view: 'trash' };
  const catMatch = pathname.match(/^\/category\/(\d+)/);
  if (catMatch) return { view: 'all', categoryId: catMatch[1] };
  const tagMatch = pathname.match(/^\/tag\/(\d+)/);
  if (tagMatch) return { view: 'all', tagId: tagMatch[1] };
  return { view: 'all' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutletContext();

  const { view, categoryId: routeCategoryId, tagId: routeTagId } = parseRoute(location.pathname);
  const meta = VIEW_META[view];

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const q = useDebounce(searchInput, 250);
  const [sort, setSort] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState(routeCategoryId || '');
  const [tagFilter, setTagFilter] = useState(routeTagId || '');
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [layout, setLayout] = useLocalStorage('notespace_layout', 'grid');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirm, setConfirm] = useState(null); // {title, message, danger, action}
  const [confirmBusy, setConfirmBusy] = useState(false);
  const searchRef = useRef(null);

  // Focus search when requested via Ctrl+K.
  useEffect(() => {
    if (location.state?.focusSearch && searchRef.current) {
      searchRef.current.focus();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Reset local filters when switching routes.
  useEffect(() => {
    setCategoryFilter(routeCategoryId || '');
    setTagFilter(routeTagId || '');
  }, [routeCategoryId, routeTagId, view]);

  // Load sidebar filter options once.
  useEffect(() => {
    Promise.all([categoriesApi.list(), tagsApi.list()])
      .then(([c, t]) => {
        setCategories(c.categories);
        setTags(t.tags);
      })
      .catch((err) => toast.error(apiError(err, 'Could not load categories and tags.')));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch notes whenever any filter changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { view, sort };
    if (q.trim()) params.q = q.trim();
    if (categoryFilter) params.category = categoryFilter;
    if (tagFilter) params.tag = tagFilter;
    notesApi
      .list(params)
      .then((data) => {
        if (!cancelled) setNotes(data.notes);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiError(err, 'Could not load notes.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, q, sort, categoryFilter, tagFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Actions ----
  const refresh = () => {
    const params = { view, sort };
    if (q.trim()) params.q = q.trim();
    if (categoryFilter) params.category = categoryFilter;
    if (tagFilter) params.tag = tagFilter;
    notesApi.list(params).then((data) => setNotes(data.notes)).catch(() => {});
  };

  const togglePin = async (note) => {
    try {
      await notesApi.update(note.id, { isPinned: !note.is_pinned });
      toast.success(note.is_pinned ? 'Note unpinned.' : 'Note pinned.');
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const toggleFavorite = async (note) => {
    try {
      await notesApi.update(note.id, { isFavorite: !note.is_favorite });
      toast.success(note.is_favorite ? 'Removed from favorites.' : 'Added to favorites.');
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const archive = async (note) => {
    try {
      await notesApi.update(note.id, { isArchived: !note.is_archived });
      toast.success(note.is_archived ? 'Note unarchived.' : 'Note archived.');
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const unarchive = (note) => archive(note);

  const moveToTrash = (note) => {
    setConfirm({
      title: 'Move to trash?',
      message: `"${note.title || 'Untitled note'}" will be moved to trash. You can restore it later.`,
      confirmLabel: 'Move to trash',
      danger: true,
      action: async () => {
        await notesApi.trash(note.id);
        toast.success('Note moved to trash.');
        refresh();
      },
    });
  };

  const restore = async (note) => {
    try {
      await notesApi.update(note.id, { restore: true });
      toast.success('Note restored.');
      refresh();
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  const deletePermanently = (note) => {
    setConfirm({
      title: 'Delete permanently?',
      message: `"${note.title || 'Untitled note'}" will be destroyed forever. This cannot be undone.`,
      confirmLabel: 'Delete forever',
      danger: true,
      action: async () => {
        await notesApi.deletePermanently(note.id);
        toast.success('Note permanently deleted.');
        refresh();
      },
    });
  };

  const emptyTrash = () => {
    if (notes.length === 0) return;
    setConfirm({
      title: 'Empty trash?',
      message: `All ${notes.length} note(s) in trash will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Empty trash',
      danger: true,
      action: async () => {
        await Promise.all(notes.map((n) => notesApi.deletePermanently(n.id)));
        toast.success('Trash emptied.');
        refresh();
      },
    });
  };

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      await confirm.action();
      setConfirm(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setConfirmBusy(false);
    }
  };

  const hasFilters = q.trim() || categoryFilter || tagFilter;
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const clearFilters = () => {
    setSearchInput('');
    setCategoryFilter('');
    setTagFilter('');
  };

  const activeCategory = categories.find((c) => String(c.id) === String(categoryFilter));
  const activeTag = tags.find((t) => String(t.id) === String(tagFilter));
  const pageTitle = activeCategory ? activeCategory.name : activeTag ? `#${activeTag.name}` : meta.title;
  const pageIcon = activeCategory ? 'category' : activeTag ? 'tag' : meta.icon;

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-surface-dark/80 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={outlet?.openMobileNav}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={19} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search notes, categories, tags…"
              aria-label="Search notes"
              className="input pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className={`hidden h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white sm:flex ${avatarColor(user?.email)}`}>
            {initials(user?.name)}
          </div>
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome + actions */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {greeting}, {user?.name?.split(' ')[0]} <span className="inline-block animate-[wiggle_1s_ease-in-out_infinite]">👋</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {activeCategory ? `Notes filed under “${activeCategory.name}”` : activeTag ? `Notes tagged #${activeTag.name}` : meta.subtitle}
            </p>
          </div>
          <Link to="/notes/new" className="btn-primary shadow-soft">
            <Plus size={16} /> Create New Note
          </Link>
        </div>

        {/* Controls row */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input w-auto cursor-pointer py-2 text-[13px]"
            aria-label="Sort notes"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-auto cursor-pointer py-2 text-[13px]"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="input w-auto cursor-pointer py-2 text-[13px]"
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>#{t.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-ghost text-[13px] py-2">
              <X size={14} /> Clear filters
            </button>
          )}

          <div className="ml-auto flex items-center gap-2.5">
            <span className="text-[13px] text-slate-400">
              {loading ? '' : `${notes.length} note${notes.length === 1 ? '' : 's'}`}
            </span>
            <ViewToggle value={layout} onChange={setLayout} />
            {view === 'trash' && notes.length > 0 && (
              <button type="button" onClick={emptyTrash} className="btn-ghost text-[13px] py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <X size={14} /> Empty trash
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        {loading ? (
          <LoadingBlock label="Loading your notes…" />
        ) : notes.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon="search"
              title="No matching notes"
              description="Try a different search term or clear your filters to see everything again."
              action={
                <button type="button" onClick={clearFilters} className="btn-secondary">
                  <X size={15} /> Clear search & filters
                </button>
              }
            />
          ) : view === 'trash' ? (
            <EmptyState icon="trash" title="Trash is empty" description="Deleted notes will appear here before they are permanently removed." />
          ) : view === 'archive' ? (
            <EmptyState icon="archive" title="Nothing archived yet" description="Archive notes you want out of the way but not gone." />
          ) : view === 'favorites' ? (
            <EmptyState icon="favorites" title="No favorites yet" description="Star the notes that matter most and they will show up here." />
          ) : (
            <EmptyState
              icon="notes"
              title="Start your first note"
              description="Capture ideas, plans, and anything worth remembering. Notes save automatically as you type."
              action={
                <Link to="/notes/new" className="btn-primary">
                  <Plus size={16} /> Create New Note
                </Link>
              }
            />
          )
        ) : (
          <NotesGrid
            notes={notes}
            view={view}
            layout={layout}
            query={q.trim()}
            onDelete={moveToTrash}
            onPermanent={deletePermanently}
            onRestore={restore}
            onArchive={archive}
            onUnarchive={unarchive}
            onTogglePin={togglePin}
            onToggleFavorite={toggleFavorite}
            menuOpenId={menuOpenId}
            setMenuOpenId={setMenuOpenId}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        loading={confirmBusy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
