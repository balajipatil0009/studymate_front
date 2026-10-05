import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Spinner } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { LabDetailPage } from './pages/LabDetailPage';
import { ModulePage } from './pages/ModulePage';
import { PerformancePage } from './pages/PerformancePage';
import { SyllabusListPage } from './pages/SyllabusListPage';
import { TimerPage } from './pages/TimerPage';
import { TodoPage } from './pages/TodoPage';
import { TrackDetailPage } from './pages/TrackDetailPage';
import { AuthProvider, useAuth } from './state/AuthContext';
import { PerformanceProvider } from './state/PerformanceContext';
import { TimerProvider } from './state/TimerContext';
import { ToastProvider } from './state/ToastContext';
import { WorkspaceProvider } from './state/WorkspaceContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Routed() {
  return (
    <AppShell>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<TimerPage />} />
        <Route path="/syllabus" element={<SyllabusListPage />} />
        <Route path="/syllabus/:trackId" element={<TrackDetailPage />} />
        <Route path="/syllabus/:trackId/modules/:moduleId" element={<ModulePage />} />
        <Route
          path="/syllabus/:trackId/modules/:moduleId/labs/:labIdx"
          element={<LabDetailPage />}
        />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/todo" element={<TodoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function Gate() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="auth-page">
        <Spinner />
      </div>
    );
  }
  if (status === 'anon') return <AuthPage />;
  return <Routed />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <PerformanceProvider>
              <TimerProvider>
                <Gate />
              </TimerProvider>
            </PerformanceProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
