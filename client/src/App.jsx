import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NoteEditor from './pages/NoteEditor';
import Settings from './pages/Settings';
import CategoriesPage from './pages/CategoriesPage';
import TagsPage from './pages/TagsPage';
import { Spinner } from './components/ui/Loading';

/** Redirects unauthenticated users to /login while restoring the session. */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={28} className="text-primary-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/** Keeps signed-in users out of /login and /register. */
function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={28} className="text-primary-500" />
      </div>
    );
  }
  if (user) return <Navigate to="/notes" replace />;
  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <RedirectIfAuthed>
                      <Login />
                    </RedirectIfAuthed>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <RedirectIfAuthed>
                      <Register />
                    </RedirectIfAuthed>
                  }
                />
                <Route
                  element={
                    <RequireAuth>
                      <AppLayout />
                    </RequireAuth>
                  }
                >
                <Route path="/notes" element={<Dashboard />} />
                <Route path="/favorites" element={<Dashboard />} />
                <Route path="/pinned" element={<Dashboard />} />
                <Route path="/archive" element={<Dashboard />} />
                <Route path="/trash" element={<Dashboard />} />
                <Route path="/category/:categoryId" element={<Dashboard />} />
                <Route path="/tag/:tagId" element={<Dashboard />} />
                <Route path="/notes/new" element={<NoteEditor />} />
                <Route path="/notes/:id/edit" element={<NoteEditor />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/tags" element={<TagsPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/notes" replace />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
