import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Plus, Tags, Pencil, Trash2, Check, X, Search } from 'lucide-react';
import { tagsApi } from '../api/services';
import { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { LoadingBlock } from '../components/ui/Loading';

function TagModal({ open, onClose, initial, onSaved }) {
  const toast = useToast();
  const editing = !!initial;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setError('');
    }
  }, [open, initial]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await tagsApi.update(initial.id, { name: name.trim() });
        toast.success('Tag renamed.');
      } else {
        await tagsApi.create({ name: name.trim() });
        toast.success('Tag created.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(apiError(err, 'Could not save the tag.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Rename tag' : 'Create tag'}>
      <form onSubmit={submit}>
        <label htmlFor="tag-name" className="label">Name</label>
        <input
          id="tag-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. urgent, draft, book"
          maxLength={50}
          autoFocus
        />
        {error && <p className="mt-3 text-sm text-red-500" role="alert">{error}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : editing ? 'Rename' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TagsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    tagsApi
      .list()
      .then((data) => setTags(data.tags))
      .catch((err) => toast.error(apiError(err, 'Could not load tags.')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async () => {
    setDeleting(true);
    try {
      await tagsApi.remove(confirmDelete.id);
      toast.success('Tag deleted and removed from all notes.');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-surface-dark/80 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/notes')}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={19} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tags</h1>
          <button type="button" onClick={() => setModal({})} className="btn-primary ml-auto">
            <Plus size={15} /> <span className="hidden sm:inline">Create Tag</span>
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        {loading ? (
          <LoadingBlock label="Loading tags…" />
        ) : tags.length === 0 ? (
          <EmptyState
            icon="tag"
            title="No tags yet"
            description="Tags are flexible labels for cross-cutting topics — assign several to any note from the editor."
            action={
              <button type="button" onClick={() => setModal({})} className="btn-primary">
                <Plus size={15} /> Create your first tag
              </button>
            }
          />
        ) : (
          <>
            <div className="relative mb-4 max-w-sm">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className="input pl-9"
                placeholder="Filter tags…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Filter tags"
              />
            </div>

            <ul className="flex flex-wrap gap-2.5">
              {filtered.map((t) => (
                <li
                  key={t.id}
                  className="card group flex items-center gap-2 py-2.5 pl-4 pr-2 transition-shadow hover:shadow-card-hover"
                >
                  <Link to={`/tag/${t.id}`} className="text-sm font-medium text-slate-700 hover:text-primary-600 dark:text-slate-200 dark:hover:text-primary-400">
                    #{t.name}
                  </Link>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {t.note_count}
                  </span>
                  <span className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => setModal({ initial: t })}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      title="Rename tag"
                      aria-label={`Rename ${t.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(t)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      title="Delete tag"
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            {filtered.length === 0 && <EmptyState icon="search" title="No tags match your filter" />}
          </>
        )}
      </div>

      <TagModal open={!!modal} initial={modal?.initial} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete tag?"
        message={`"${confirmDelete?.name}" will be removed from all notes. The notes themselves are kept.`}
        confirmLabel="Delete tag"
        danger
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
