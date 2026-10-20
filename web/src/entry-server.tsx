import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './lib/toast';
import Home from './pages/Home';
import ServicePage from './pages/ServicePage';

/* Build-time rendering of the public pages (see scripts/prerender.mjs), so search engines and link previews get the
   full text without running JavaScript. The browser still renders the app itself on load. */

export { applyContent, visibleServices } from './lib/content';
export { headFor, headHtml, ORIGIN } from './lib/seo';

export function render(url: string) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/services/:key" element={<ServicePage />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </StaticRouter>
    </StrictMode>,
  );
}
