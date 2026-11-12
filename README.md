# NoteSpace

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

## Project structure

```
notespace/
├── client/               # React + Vite + Tailwind frontend
│   ├── src/api/          # Axios client + API services
│   ├── src/components/   # Layout, notes, UI components
│   ├── src/context/      # Auth / Theme / Toast providers
│   ├── src/hooks/        # useDebounce, useLocalStorage, useHotkeys, useUnloadWarning
│   ├── src/pages/        # Login, Register, Dashboard, NoteEditor, Settings, Categories, Tags
│   └── src/utils/        # Formatting helpers
├── database/
│   └── schema.sql        # Idempotent schema (CREATE TABLE IF NOT EXISTS)
└── server/
    ├── scripts/apply-schema.js
    └── src/
        ├── config/       # env + MySQL pool
        ├── controllers/  # auth / notes / categories / tags
        ├── middleware/   # JWT auth, validation, centralized errors
        ├── routes/       # REST endpoints
        └── utils/        # ApiError, HTML sanitizer (XSS protection)
```

## Windows 11 setup

### Prerequisites

1. **Node.js 18+** — check with `node --version`
2. **MySQL 8** running on `localhost:3306` (the `MySQL80` Windows service)

### 1. Install dependencies

From the project root:

```powershell
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Configure the backend environment

Edit `server\.env` and set your MySQL credentials:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=notespace
JWT_SECRET=leave-as-is   # a strong random secret is already generated
```

Never commit this file (it is gitignored). See `server\.env.example` for the template.

### 3. Create the database schema

```powershell
npm run db:schema
```

This applies `database\schema.sql` — safe to re-run; it only uses `CREATE TABLE IF NOT EXISTS` and never drops tables or data.

### 4. Run the app (development)

```powershell
npm run dev
```

- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:4000** (health check: `http://localhost:4000/api/health`)
- MySQL: `localhost:3306`, database `notespace`

Open http://localhost:5173, register an account, and start writing.

### Production build

```powershell
npm run build        # builds the frontend into client\dist
npm start            # serves the API on :4000
```

## API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in, receive JWT |
| GET | `/api/auth/me` | Current user (auth) |
| PATCH | `/api/auth/profile` | Change display name |
| PATCH | `/api/auth/password` | Change password |
| GET | `/api/notes` | List notes — `view=all\|favorites\|pinned\|archive\|trash`, `q`, `category`, `tag`, `sort=newest\|oldest\|title` |
| GET | `/api/notes/counts` | Sidebar counts |
| POST | `/api/notes` | Create note |
| GET | `/api/notes/:id` | Fetch one note |
| PATCH | `/api/notes/:id` | Partial update (title, content, tags, category, pin, favorite, archive, restore) |
| DELETE | `/api/notes/:id` | Move to trash |
| DELETE | `/api/notes/:id?permanent=1` | Delete forever |
| GET/POST/PATCH/DELETE | `/api/categories[...]` | Manage categories |
| GET/POST/PATCH/DELETE | `/api/tags[...]` | Manage tags |

All protected routes require `Authorization: Bearer <token>` and are scoped to the authenticated user.

## Security

- bcrypt (10 rounds) password hashing; hashes never leave the server
- JWT (7-day expiry) verified on every protected request; user re-fetched from DB
- Parameterized SQL everywhere via `mysql2` named placeholders
- Note content sanitized server-side with `sanitize-html` (allowlist) to prevent stored XSS
- React escapes all rendered text by default; `dangerouslySetInnerHTML` is used only for sanitized editor content
- Centralized error handler returns safe messages; stack traces are logged server-side only
- CORS restricted to the configured frontend origin
- Secrets only in gitignored `.env`

## Deployment (GitHub Pages)

The frontend can be hosted for free on GitHub Pages via GitHub Actions.

1. Push this repository to GitHub (remote: `https://github.com/AbdirashidHaji/NoteSpace.git`).
2. In the GitHub repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow at `.github/workflows/deploy-frontend.yml` builds and deploys the Vite app to Pages on every push to `master`.
4. Set a repository variable `VITE_API_URL` (Settings → Secrets and variables → Actions → Variables) to your deployed backend URL, e.g. `https://your-backend.onrender.com`. If unset, it defaults to `http://localhost:4000`.
5. The site will be available at `https://<username>.github.io/NoteSpace/`.

> The backend (Express + MySQL) cannot run on GitHub Pages; deploy it to a Node host such as Render or Railway and point the frontend at its public URL via `VITE_API_URL`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `ECONNREFUSED` / cannot reach MySQL | Start the MySQL80 service |
| `Database "notespace" was not found` | Run `npm run db:schema` |
| `Database access denied` | Check `DB_USER` / `DB_PASSWORD` in `server\.env` |
| Frontend shows "Could not load notes" | Confirm the API is up on :4000 (`/api/health`) |
