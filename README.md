# NoteSpace 🗒️

A complete, premium notes-taking web application — React frontend, Express REST API, MySQL persistence.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/Express-4-000) ![stack](https://img.shields.io/badge/MySQL-8-4479a1) ![stack](https://img.shields.io/badge/Vite-5-646cff)

## Features

- **Authentication** — register, login, logout, JWT sessions that survive refreshes, bcrypt-hashed passwords
- **Notes** — full CRUD, rich-text editor (bold/italic/underline/headings/lists/checklists/links/alignment/undo/redo), autosave with save-status indicator, word & character counts, unsaved-changes protection
- **Organize** — pin, favorite, archive, trash (soft delete), restore, delete forever
- **Categories & tags** — create/rename/delete both; multi-tag assignment; duplicate names prevented per user
- **Search & filters** — instant search across titles, content, categories and tags; filter by category/tag; sort by newest, oldest, title
- **Dashboard** — welcome header, responsive grid/list views, sidebar with live counts
- **Settings** — display name, password change, light/dark theme, account info, logout
- **Polish** — toasts, confirmation dialogs, empty states, keyboard shortcuts (`Ctrl+K` search, `Ctrl+N` new note, `Ctrl+S` save, `?` help), error boundary, loading states, accessibility labels, dark mode

