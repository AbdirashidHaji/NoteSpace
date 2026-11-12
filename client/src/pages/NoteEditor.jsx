import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft, Star, Pin, Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks, Link2, AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Cloud, CloudUpload, Check, Tag as TagIcon, FolderOpen, Trash2, X, ChevronDown, Search,
} from 'lucide-react';
import { notesApi, categoriesApi, tagsApi } from '../api/services';
import { apiError } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useUnloadWarning } from '../hooks';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { htmlToText, wordCount, formatDateTime } from '../utils/format';
import { Spinner } from '../components/ui/Loading';

const SAVE_DELAY = 900;

export default function NoteEditor() {
  const { id: rawId } = useParams(); // 'new' for /notes/new, otherwise the note id
  const isNew = !rawId || rawId === 'new';
  const id = isNew ? undefined : rawId;
  const navigate = useNavigate();
  const toast = useToast();
  const outlet = useOutletContext();
  const editorRef = useRef(null);
  const titleRef = useRef(null);
  const noteIdRef = useRef(id ? Number(id) : null);
  // Marks that the URL adoption after creating a brand-new note should skip the reload.
  const adoptedRef = useRef(null);

  const [loading, setLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [meta, setMeta] = useState({ created_at: null, updated_at: null });

  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('saved'); // saved | saving | unsaved
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const dirtyRef = useRef(false);

  const setDirtyFlag = (v) => {
    dirtyRef.current = v;
    setDirty(v);
    if (v) setStatus('unsaved');
  };

  // ---- Load data ----
  useEffect(() => {
    Promise.all([categoriesApi.list(), tagsApi.list()])
      .then(([c, t]) => {
        setCategories(c.categories);
        setAllTags(t.tags);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // After the first save of a brand-new note the URL adopts /notes/:id/edit;
    // the same component instance is kept, so skip the reload in that case.
    if (id != null) {
      const numericId = Number(id);
      if (adoptedRef.current === numericId) {
        adoptedRef.current = null;
        return undefined;
      }
    }

    if (!id) {
      // New note: start blank, focus the title.
      noteIdRef.current = null;
      setTitle('');
      setContent('');
      setDirty(false);
      dirtyRef.current = false;
      setStatus('saved');
      setLoading(false);
      setTimeout(() => titleRef.current?.focus(), 50);
      return;
    }
    let cancelled = false;
    setLoading(true);
    notesApi
      .get(id)
      .then(({ note }) => {
        if (cancelled) return;
        noteIdRef.current = note.id;
        setTitle(note.title);
        setContent(note.content || '');
        setCategoryId(note.category_id || '');
        setTags(note.tags || []);
        setIsPinned(!!note.is_pinned);
        setIsFavorite(!!note.is_favorite);
        setMeta({ created_at: note.created_at, updated_at: note.updated_at });
        setDirty(false);
        dirtyRef.current = false;
        setStatus('saved');
      })
      .catch((err) => {
        if (!cancelled) {
          setNotFound(true);
          toast.error(apiError(err, 'Note not found.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Saving ----
  const save = useCallback(async () => {
    if (!dirtyRef.current) return;
    setStatus('saving');
    const payload = {
      title,
      content: editorRef.current?.innerHTML ?? content,
      categoryId: categoryId || null,
      tags: tags.map((t) => t.id),
      isPinned,
      isFavorite,
    };
    try {
      if (noteIdRef.current == null) {
        const { note } = await notesApi.create(payload);
        noteIdRef.current = note.id;
        adoptedRef.current = note.id;
        setMeta({ created_at: note.created_at, updated_at: note.updated_at });
        // Adopt the persisted URL without remounting: the same <NoteEditor>
        // element stays mounted, and the load effect skips because the id matches.
        navigate(`/notes/${note.id}/edit`, { replace: true });
      } else {
        const { note } = await notesApi.update(noteIdRef.current, payload);
        setMeta((m) => ({ ...m, updated_at: note.updated_at }));
      }
      dirtyRef.current = false;
      setDirty(false);
      setStatus('saved');
    } catch (err) {
      setStatus('unsaved');
      toast.error(apiError(err, 'Autosave failed. Your changes are still in the editor.'));
    }
  }, [title, content, categoryId, tags, isPinned, isFavorite, toast]);

  // Debounced autosave while dirty.
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(save, SAVE_DELAY);
    return () => clearTimeout(t);
  }, [dirty, title, content, categoryId, tags, isPinned, isFavorite]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before closing the tab with unsaved work.
  useUnloadWarning(dirty);

  const handleBack = () => {
    if (dirtyRef.current) {
      setConfirmLeave(true);
    } else {
      navigate('/notes');
    }
  };

  const forceLeave = async () => {
    await save();
    setConfirmLeave(false);
    navigate('/notes');
  };

  // ---- Edit handlers ----
  const onTitleChange = (e) => {
    setTitle(e.target.value);
    setDirtyFlag(true);
  };

  const onContentInput = () => {
    setContent(editorRef.current?.innerHTML || '');
    setDirtyFlag(true);
  };

  // Checklist: clicking near the checkbox toggles it (clicking the text keeps editing).
  const onEditorClick = (e) => {
    const li = e.target.closest?.('li');
    if (li && li.parentElement?.classList.contains('checklist') && e.offsetX < 26) {
      li.classList.toggle('checked');
      setContent(editorRef.current?.innerHTML || '');
      setDirtyFlag(true);
    }
  };

  const exec = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setContent(editorRef.current?.innerHTML || '');
    setDirtyFlag(true);
  };

  const insertChecklist = () => {
    editorRef.current?.focus();
    document.execCommand(
      'insertHTML',
      false,
      '<ul class="checklist"><li class="checked">Done</li><li>To do</li></ul><p><br></p>'
    );
    setContent(editorRef.current?.innerHTML || '');
    setDirtyFlag(true);
  };

  const addLink = () => {
    const url = window.prompt('Link URL', 'https://');
    if (url && url !== 'https://') exec('createLink', url);
  };

  // Ctrl+S saves immediately.
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);

  // ---- Tag management ----
  const tagIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);
  const filteredTags = useMemo(
    () =>
      allTags.filter(
        (t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()) && !tagIds.has(t.id)
      ),
    [allTags, tagSearch, tagIds]
  );

  const toggleTag = (tag) => {
    setTags((list) =>
      tagIds.has(tag.id) ? list.filter((t) => t.id !== tag.id) : [...list, tag]
    );
    setDirtyFlag(true);
  };

  const createAndAssignTag = async () => {
    const name = tagSearch.trim();
    if (!name) return;
    try {
      const { tag } = await tagsApi.create({ name });
      setAllTags((list) => [...list, tag]);
      setTags((list) => [...list, tag]);
      setTagSearch('');
      setDirtyFlag(true);
    } catch (err) {
      const msg = apiError(err);
      toast.error(msg);
      // If it's a duplicate, find and assign the existing tag.
      try {
        const { tags: existing } = await tagsApi.list();
        const match = existing.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (match) {
          setAllTags(existing);
          setTags((list) => (list.some((t) => t.id === match.id) ? list : [...list, match]));
          setTagSearch('');
          setDirtyFlag(true);
        }
      } catch {
        /* ignore secondary failure */
      }
    }
  };

  // ---- Category / pin / favorite ----
  const onCategoryChange = (e) => {
    setCategoryId(e.target.value);
    setDirtyFlag(true);
  };

  const togglePin = async () => {
    setIsPinned((v) => !v);
    setDirtyFlag(true);
  };

  const toggleFavorite = async () => {
    setIsFavorite((v) => !v);
    setDirtyFlag(true);
  };

  const moveToTrash = async () => {
    setConfirmTrash(false);
    try {
      if (noteIdRef.current != null) await notesApi.trash(noteIdRef.current);
      toast.success('Note moved to trash.');
      navigate('/notes');
    } catch (err) {
      toast.error(apiError(err));
    }
  };

  // ---- Derived ----
  const plainText = useMemo(() => htmlToText(content), [content]);
  const words = useMemo(() => wordCount(plainText), [plainText]);
  const chars = plainText.length;
  const activeCategory = categories.find((c) => String(c.id) === String(categoryId));

  if (notFound) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Note not found</h1>
        <p className="text-sm text-slate-500">It may have been deleted, or belongs to a different account.</p>
        <Link to="/notes" className="btn-primary">Back to notes</Link>
      </div>
    );
  }

  const StatusBadge = () => {
    if (status === 'saving') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-400">
          <Spinner size={13} /> Saving…
        </span>
      );
    }
    if (status === 'unsaved') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-500">
          <CloudUpload size={14} /> Unsaved changes
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-500">
        <Check size={14} /> Saved
      </span>
    );
  };

  const ToolBtn = ({ icon: Icon, label, onClick, active }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
      }`}
    >
      <Icon size={15} />
    </button>
  );

  const Separator = () => <span className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 px-4 py-2.5 backdrop-blur-md dark:border-slate-800 dark:bg-surface-dark/85 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={outlet?.openMobileNav}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Open navigation menu"
          >
            <ArrowLeft size={18} className="hidden" />
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <button type="button" onClick={handleBack} className="btn-ghost px-2.5" aria-label="Back to notes">
            <ArrowLeft size={17} /> <span className="hidden sm:inline">Notes</span>
          </button>

          <div className="mx-auto flex items-center gap-4">
            <StatusBadge />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleFavorite}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label="Toggle favorite"
              className={`rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${isFavorite ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Star size={17} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={togglePin}
              title={isPinned ? 'Unpin note' : 'Pin note'}
              aria-label="Toggle pin"
              className={`rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 ${isPinned ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Pin size={17} fill={isPinned ? 'currentColor' : 'none'} />
            </button>
            {noteIdRef.current != null && (
              <button
                type="button"
                onClick={() => setConfirmTrash(true)}
                title="Move to trash"
                aria-label="Move to trash"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
              >
                <Trash2 size={17} />
              </button>
            )}
            <button type="button" onClick={save} className="btn-primary ml-2 hidden sm:inline-flex" disabled={!dirty || status === 'saving'}>
              <Cloud size={15} /> Save now
            </button>
          </div>
        </div>
      </header>

      {/* Formatting toolbar */}
      <div className="sticky top-[53px] z-20 border-b border-slate-100 bg-surface-muted/90 px-4 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-surface-dark/90 sm:px-6">
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolBtn icon={Bold} label="Bold (Ctrl+B)" onClick={() => exec('bold')} />
          <ToolBtn icon={Italic} label="Italic (Ctrl+I)" onClick={() => exec('italic')} />
          <ToolBtn icon={Underline} label="Underline (Ctrl+U)" onClick={() => exec('underline')} />
          <Separator />
          <ToolBtn icon={Heading1} label="Heading 1" onClick={() => exec('formatBlock', '<h1>')} />
          <ToolBtn icon={Heading2} label="Heading 2" onClick={() => exec('formatBlock', '<h2>')} />
          <ToolBtn icon={Heading3} label="Heading 3" onClick={() => exec('formatBlock', '<h3>')} />
          <Separator />
          <ToolBtn icon={List} label="Bullet list" onClick={() => exec('insertUnorderedList')} />
          <ToolBtn icon={ListOrdered} label="Numbered list" onClick={() => exec('insertOrderedList')} />
          <ToolBtn icon={ListChecks} label="Checklist" onClick={insertChecklist} />
          <Separator />
          <ToolBtn icon={Link2} label="Insert link" onClick={addLink} />
          <Separator />
          <ToolBtn icon={AlignLeft} label="Align left" onClick={() => exec('justifyLeft')} />
          <ToolBtn icon={AlignCenter} label="Align center" onClick={() => exec('justifyCenter')} />
          <ToolBtn icon={AlignRight} label="Align right" onClick={() => exec('justifyRight')} />
          <Separator />
          <ToolBtn icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => exec('undo')} />
          <ToolBtn icon={Redo2} label="Redo (Ctrl+Y)" onClick={() => exec('redo')} />
          <Separator />
          <ToolBtn icon={Heading3} label="Clear formatting" onClick={() => { exec('removeFormat'); exec('formatBlock', '<p>'); }} />
        </div>
      </div>

      {/* Editor body */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size={26} className="text-primary-500" />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={onTitleChange}
            placeholder="Untitled note"
            maxLength={255}
            aria-label="Note title"
            className="w-full bg-transparent text-[28px] font-bold leading-tight text-slate-900 placeholder-slate-300 outline-none dark:text-slate-100 dark:placeholder-slate-600"
          />

          {/* Meta row: category, tags, dates */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="relative flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
              <FolderOpen size={14} className="text-slate-400" />
              <select
                value={categoryId}
                onChange={onCategoryChange}
                aria-label="Note category"
                className="cursor-pointer appearance-none bg-transparent pr-4 text-[12px] font-medium text-slate-600 outline-none dark:text-slate-300"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-1.5 text-slate-400" />
            </div>

            {/* Tags popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTagMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                aria-expanded={tagMenuOpen}
                aria-haspopup="listbox"
              >
                <TagIcon size={14} className="text-slate-400" /> Tags
                {tags.length > 0 && <span className="rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">{tags.length}</span>}
              </button>

              {tagMenuOpen && (
                <>
                  <button className="fixed inset-0 z-10 cursor-default" onClick={() => setTagMenuOpen(false)} aria-label="Close tags menu" tabIndex={-1} />
                  <div className="absolute left-0 top-9 z-20 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-pop animate-scale-in dark:border-slate-700 dark:bg-surface-dark-2" role="listbox" aria-label="Assign tags">
                    <div className="relative mb-1.5">
                      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createAndAssignTag())}
                        placeholder="Search or create tag…"
                        className="input py-1.5 pl-7 text-[12px]"
                        aria-label="Search or create tag"
                      />
                    </div>
                    <ul className="max-h-44 overflow-y-auto">
                      {filteredTags.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={tagIds.has(t.id)}
                            onClick={() => toggleTag(t)}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            #{t.name}
                            {tagIds.has(t.id) && <Check size={13} className="text-primary-500" />}
                          </button>
                        </li>
                      ))}
                      {tagSearch.trim() && filteredTags.length === 0 && (
                        <li>
                          <button type="button" onClick={createAndAssignTag} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10">
                            <PlusIcon /> Create tag “{tagSearch.trim()}”
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {/* Selected tag chips */}
            {tags.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                #{t.name}
                <button
                  type="button"
                  onClick={() => toggleTag(t)}
                  className="rounded-full p-0.5 hover:bg-primary-100 dark:hover:bg-primary-500/20"
                  aria-label={`Remove tag ${t.name}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}

            <span className="ml-auto text-[11px] text-slate-400">
              {meta.created_at ? `Created ${formatDateTime(meta.created_at)}` : 'Not saved yet'}
            </span>
          </div>

          {/* Content */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Note content"
            data-placeholder="Start writing…"
            className="editor-content mt-4"
            onInput={onContentInput}
            onClick={onEditorClick}
            dangerouslySetInnerHTML={{ __html: content }}
          />

          {/* Footer stats */}
          <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-3 text-[12px] text-slate-400 dark:border-slate-800">
            <span>{words} word{words === 1 ? '' : 's'}</span>
            <span>{chars} character{chars === 1 ? '' : 's'}</span>
            {meta.updated_at && <span className="ml-auto">Last modified {formatDateTime(meta.updated_at)}</span>}
            {activeCategory && (
              <span className="ml-auto inline-flex items-center gap-1" style={{ color: activeCategory.color }}>
                <FolderOpen size={11} /> {activeCategory.name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* dialogs */}
      <ConfirmDialog
        open={confirmTrash}
        title="Move to trash?"
        message="This note will be moved to trash. You can restore it from there."
        confirmLabel="Move to trash"
        danger
        onConfirm={moveToTrash}
        onCancel={() => setConfirmTrash(false)}
      />
      <ConfirmDialog
        open={confirmLeave}
        title="Save changes before leaving?"
        message="You have unsaved changes in this note."
        confirmLabel="Save & leave"
        loading={status === 'saving'}
        onConfirm={forceLeave}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
