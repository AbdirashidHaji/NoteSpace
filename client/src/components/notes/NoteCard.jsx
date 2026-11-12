import { Link } from 'react-router-dom';
import {
  Star, Pin, Archive, MoreVertical, Trash2, ArchiveRestore, PinOff,
  FileText, RotateCcw, FolderOpen,
} from 'lucide-react';
import { timeAgo, formatDate, highlightSegments } from '../../utils/format';

function IconBtn({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`rounded-lg p-1.5 transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 ${
        active ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function NoteCard({ note, view, query, onDelete, onPermanent, onRestore, onArchive, onTogglePin, onToggleFavorite, onUnarchive, menuOpenId, setMenuOpenId }) {
  const menuOpen = menuOpenId === note.id;
  const isTrash = view === 'trash';
  const isArchive = view === 'archive';
  const menuId = `note-menu-${note.id}`;

  const titleEl = highlightSegments(note.title, query) || note.title || 'Untitled note';
  const excerptEl = highlightSegments(note.excerpt, query) || note.excerpt || 'No content yet…';

  const handleMenu = (e) => {
    e.stopPropagation();
    setMenuOpenId(menuOpen ? null : note.id);
  };

  const action = (fn) => (e) => {
    e?.stopPropagation();
    setMenuOpenId(null);
    fn?.();
  };

  return (
    <div
      className={`group relative flex flex-col rounded-xl border p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover animate-fade-in ${
        note.is_pinned
          ? 'border-primary-200 bg-primary-50/40 dark:border-primary-500/30 dark:bg-primary-500/5'
          : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-surface-dark-2 dark:hover:border-slate-700'
      }`}
    >
      {/* Header row */}
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <Link
          to={`/notes/${note.id}/edit`}
          className="min-w-0 flex-1"
          title="Open note"
        >
          <h3 className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
            {titleEl}
          </h3>
        </Link>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn label={note.is_favorite ? 'Remove from favorites' : 'Add to favorites'} active={note.is_favorite} onClick={() => onToggleFavorite(note)}>
            <Star size={15} fill={note.is_favorite ? 'currentColor' : 'none'} />
          </IconBtn>
          {!isTrash && !isArchive && (
            <IconBtn label={note.is_pinned ? 'Unpin note' : 'Pin note'} active={note.is_pinned} onClick={() => onTogglePin(note)}>
              {note.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </IconBtn>
          )}
          <div className="relative">
            <IconBtn label="More actions" onClick={handleMenu}>
              <MoreVertical size={15} />
            </IconBtn>
            {menuOpen && (
              <>
                <button className="fixed inset-0 z-30 cursor-default" onClick={action(null)()} aria-label="Close menu" tabIndex={-1} />
                <div
                  className="absolute right-0 top-8 z-40 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-pop animate-scale-in dark:border-slate-700 dark:bg-surface-dark-2"
                  role="menu"
                >
                  <Link
                    to={`/notes/${note.id}/edit`}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    onClick={() => setMenuOpenId(null)}
                  >
                    <FileText size={14} /> Open note
                  </Link>
                  {isTrash ? (
                    <>
                      <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={action(onRestore)}>
                        <RotateCcw size={14} /> Restore note
                      </button>
                      <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={action(onPermanent)}>
                        <Trash2 size={14} /> Delete permanently
                      </button>
                    </>
                  ) : isArchive ? (
                    <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={action(onUnarchive)}>
                      <ArchiveRestore size={14} /> Unarchive
                    </button>
                  ) : (
                    <>
                      <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={action(onArchive)}>
                        <Archive size={14} /> {note.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button type="button" role="menuitem" className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={action(onDelete)}>
                        <Trash2 size={14} /> Move to trash
                      </button>
                    </>
                  )}
                  <div className="mt-1 border-t border-slate-100 px-3.5 pt-2 pb-1 text-[11px] text-slate-400 dark:border-slate-800">
                    Created {formatDate(note.created_at)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <Link to={`/notes/${note.id}/edit`} className="mb-3 flex-1">
        <p className="line-clamp-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          {excerptEl}
        </p>
      </Link>

      {/* Footer: category + tags + dates */}
      <div className="flex flex-wrap items-center gap-1.5">
        {note.category_name && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${note.category_color || '#6366f1'}1a`, color: note.category_color || '#6366f1' }}
          >
            <FolderOpen size={11} /> {note.category_name}
          </span>
        )}
        {note.tags?.slice(0, 3).map((t) => (
          <span key={t.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            #{t.name}
          </span>
        ))}
        {note.tags?.length > 3 && (
          <span className="text-[11px] text-slate-400">+{note.tags.length - 3}</span>
        )}
        <span className="ml-auto text-[11px] text-slate-400">{timeAgo(note.updated_at)}</span>
      </div>
    </div>
  );
}
