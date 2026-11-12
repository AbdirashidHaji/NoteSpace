import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, Plus, FolderOpen, Pencil, Trash2, FileText, Check, X, Search,
} from 'lucide-react';
import { categoriesApi } from '../api/services';
import { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { LoadingBlock } from '../components/ui/Loading';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#0ea5e9'];

function CategoryModal({ open, onClose, initial, onSaved }) {
  const toast = useToast();
  const editing = !!initial;
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setColor(initial?.color || COLORS[0]);
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
        await categoriesApi.update(initial.id, { name: name.trim(), color });
        toast.success('Category renamed.');
      } else {
        await categoriesApi.create({ name: name.trim(), color });
        toast.success('Category created.');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(apiError(err, 'Could not save the category.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Rename category' : 'Create category'}>
      <form onSubmit={submit}>
        <label htmlFor="cat-name" className="label">Name</label>
        <input
          id="cat-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Work, Ideas, Recipes"
          maxLength={80}
          autoFocus
        />
        <label className="label mt-4">Color</label>
        <div className="flex gap-2" role="radiogroup" aria-label="Category color">
          {COLORS.map((c) => (
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

export default function CategoriesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // {initial?}
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    categoriesApi
      .list()
      .then((data) => setCategories(data.categories))
      .catch((err) => toast.error(apiError(err, 'Could not load categories.')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async () => {
    setDeleting(true);
    try {
      await categoriesApi.remove(confirmDelete.id);
      toast.success('Category deleted. Its notes are now uncategorized.');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const filtered = categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Categories</h1>
          <button type="button" onClick={() => setModal({})} className="btn-primary ml-auto">
            <Plus size={15} /> <span className="hidden sm:inline">Create Category</span>
            <Plus size={15} className="sm:hidden" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        {loading ? (
          <LoadingBlock label="Loading categories…" />
        ) : categories.length === 0 ? (
          <EmptyState
            icon="category"
            title="No categories yet"
            description="Categories are a great way to group related notes, like Work, Personal, or Recipes."
            action={
              <button type="button" onClick={() => setModal({})} className="btn-primary">
                <Plus size={15} /> Create your first category
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
                placeholder="Filter categories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Filter categories"
              />
            </div>

            <ul className="space-y-2.5">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-card-hover"
                >
                  <span className="h-9 w-9 shrink-0 rounded-lg" style={{ backgroundColor: `${c.color}33`, border: `2px solid ${c.color}` }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/category/${c.id}`} className="truncate text-sm font-semibold text-slate-900 hover:text-primary-600 dark:text-slate-100 dark:hover:text-primary-400">
                      {c.name}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-slate-400">
                      {c.note_count} note{c.note_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModal({ initial: c })}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                      title="Rename category"
                      aria-label={`Rename ${c.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(c)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      title="Delete category"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && (
                <EmptyState icon="search" title="No categories match your filter" />
              )}
            </ul>
          </>
        )}
      </div>

      <CategoryModal open={!!modal} initial={modal?.initial} onClose={() => setModal(null)} onSaved={load} />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete category?"
        message={`"${confirmDelete?.name}" will be deleted. Notes in it are kept but become uncategorized.`}
        confirmLabel="Delete category"
        danger
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
