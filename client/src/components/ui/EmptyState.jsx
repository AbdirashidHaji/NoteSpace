import { FileText, Search, Star, Archive, Trash2, FolderOpen, Tag as TagIcon } from 'lucide-react';

const ICONS = {
  notes: FileText,
  search: Search,
  favorites: Star,
  archive: Archive,
  trash: Trash2,
  category: FolderOpen,
  tag: TagIcon,
};

/** Friendly empty state with icon, title, description and optional action. */
export default function EmptyState({ icon = 'notes', title, description, action }) {
  const Icon = ICONS[icon] || FileText;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-500/10 dark:to-primary-500/5">
        <Icon className="text-primary-500" size={26} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
