import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './styles.css';
import './styles-v5.css';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { loadSiteContent } from './lib/content';
import Home from './pages/Home';
import ServicePage from './pages/ServicePage';
import { AgentLogin, PartnerLogin } from './pages/Auth';
import Dashboard from './dashboard/Dashboard';
import AdminApp from './admin/AdminApp';

/** Scroll to top on page change, or to the #section when the URL has a hash. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

await loadSiteContent();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ScrollManager />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services/:key" element={<ServicePage />} />
            <Route path="/partner-login" element={<PartnerLogin />} />
            <Route path="/agent-login" element={<AgentLogin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:view" element={<Dashboard />} />
            <Route path="/admin" element={<AdminApp />} />
            <Route path="/admin/:view" element={<AdminApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
