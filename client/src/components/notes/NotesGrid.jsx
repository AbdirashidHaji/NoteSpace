import NoteCard from './NoteCard';
import { Link } from 'react-router-dom';
import { List, LayoutGrid } from 'lucide-react';

/** Responsive notes grid with list/grid view switch. */
export function NotesGrid({ notes, view, layout, query, ...handlers }) {
  return (
    <div
      className={
        layout === 'list'
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
      }
    >
      {notes.map((note) => (
        <div key={note.id} className={layout === 'list' ? '[&>div]:flex [&>div]:flex-row [&>div]:items-center' : ''}>
          <NoteCardWrapper note={note} view={view} query={query} {...handlers} />
        </div>
      ))}
    </div>
  );
}

function NoteCardWrapper({ note, view, query, ...handlers }) {
  return (
    <NoteCard
      note={note}
      view={view}
      query={query}
      onDelete={handlers.onDelete}
      onPermanent={handlers.onPermanent}
      onRestore={handlers.onRestore}
      onArchive={handlers.onArchive}
      onUnarchive={handlers.onUnarchive}
      onTogglePin={handlers.onTogglePin}
      onToggleFavorite={handlers.onToggleFavorite}
      menuOpenId={handlers.menuOpenId}
      setMenuOpenId={handlers.setMenuOpenId}
    />
  );
}

/** View toggle control (grid / list). */
export function ViewToggle({ value, onChange }) {
  const options = [
    { key: 'grid', icon: LayoutGrid, label: 'Grid view' },
    { key: 'list', icon: List, label: 'List view' },
  ];
  return (
    <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-soft dark:border-slate-700 dark:bg-surface-dark-2" role="radiogroup" aria-label="View mode">
      {options.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={label}
          title={label}
          onClick={() => onChange(key)}
          className={`rounded-md p-1.5 transition-colors ${
            value === key
              ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
