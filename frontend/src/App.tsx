// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import NavigationBar from './components/NavigationBar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdventuresPage from './pages/AdventuresPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ObservabilityPage from './pages/ObservabilityPage';
import SavedAdventuresPage from './pages/SavedAdventuresPage';
import AboutPage from './pages/AboutPage';
import './App.css';

const DARK_BG = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
const LIGHT_BG = 'linear-gradient(135deg, #e0e7ff 0%, #f0fdf4 50%, #fef9c3 100%)';
const OBSERVABILITY_ENABLED = (import.meta as any).env.VITE_OBSERVABILITY_ENABLED === 'true';
// ── Protected / Public route guards ──────────────────────────

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? <Navigate to="/app" replace /> : <>{children}</>;
};

// ── Loading screen ────────────────────────────────────────────

const LoadingScreen: React.FC = () => {
  const { isDark } = useTheme();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: isDark ? DARK_BG : LIGHT_BG,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '4rem', marginBottom: '20px',
          animation: 'spin-slow 2s linear infinite',
          display: 'inline-block',
        }}>
          🗺️
        </div>
        <div style={{ color: isDark ? 'white' : '#1e293b', fontSize: '1.2rem', fontWeight: 600 }}>
          Loading MiniQuest...
        </div>
        <div style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: '0.85rem', marginTop: 8 }}>
          7 AI agents warming up...
        </div>
      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ── AppShell — reads theme INSIDE ThemeProvider ───────────────

const AppShell: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <div style={{
      background: isDark ? DARK_BG : LIGHT_BG,
      minHeight: '100vh',
    }}>
      <NavigationBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/app" element={<ProtectedRoute><AdventuresPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        {OBSERVABILITY_ENABLED && (
          <Route path="/observability" element={<ObservabilityPage />} />
        )}
        <Route path="/saved-adventures" element={<ProtectedRoute><SavedAdventuresPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;