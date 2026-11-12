import Modal from './Modal';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Focus search' },
  { keys: ['Ctrl', 'N'], description: 'Create a new note' },
  { keys: ['Ctrl', 'S'], description: 'Save note (in editor)' },
  { keys: ['Ctrl', 'B'], description: 'Bold (in editor)' },
  { keys: ['Ctrl', 'I'], description: 'Italic (in editor)' },
  { keys: ['Ctrl', 'U'], description: 'Underline (in editor)' },
  { keys: ['Ctrl', 'Z'], description: 'Undo (in editor)' },
  { keys: ['Ctrl', 'Y'], description: 'Redo (in editor)' },
  { keys: ['Esc'], description: 'Close dialogs / deselect' },
  { keys: ['?'], description: 'Show this help' },
];

export default function ShortcutModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <ul className="space-y-1.5">
        {SHORTCUTS.map(({ keys, description }) => (
          <li key={description} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <span className="text-slate-600 dark:text-slate-300">{description}</span>
            <span className="flex gap-1">
              {keys.map((k) => (
                <kbd
                  key={k}
                  className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-slate-400">On macOS use ⌘ instead of Ctrl.</p>
    </Modal>
  );
}
