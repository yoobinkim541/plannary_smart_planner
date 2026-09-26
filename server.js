#!/usr/bin/env node
// Express API server — replaces Vercel Functions for Oracle deployment.
// Vercel-style handlers (module.exports = async function(req, res)) are
// Express-compatible and mount directly.

(function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  for (const candidate of [
    path.join(__dirname, '.env'),
    path.join(__dirname, 'worker', '.env'),
  ]) {
    if (!fs.existsSync(candidate)) continue;
    fs.readFileSync(candidate, 'utf8').split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq < 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    });
    break;
  }
})();

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.API_PORT) || 3000;
const HOST = process.env.API_HOST || '127.0.0.1';
const LOG_DIR = process.env.ERROR_LOG_DIR || path.join(__dirname, 'logs');

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── API routes ────────────────────────────────────────────────────────────────
app.all('/api/eclass/sync',                   require('./api/eclass/sync'));
app.all('/api/eclass/connection',             require('./api/eclass/connection'));
app.all('/api/account/mfa',                   require('./api/account/mfa'));
app.all('/api/account/sessions',              require('./api/account/sessions'));
app.all('/api/account/delete-data',           require('./api/account/delete-data'));
app.all('/api/notifications/check-reminders', require('./api/notifications/check-reminders'));
// og.js uses @vercel/og (edge-only). og-node.js is the Node.js fallback.
app.all('/api/og',                            require('./api/og-node'));

// ── Static / SPA ──────────────────────────────────────────────────────────────
// Promote redesign to root (parity with firebase.json / vercel.json redirects)
app.get('/', (req, res) => res.redirect(302, '/redesign/'));
app.get('/index.html', (req, res) => res.redirect(302, '/redesign/'));
app.get(/^\/redesign$/, (req, res) => res.redirect(302, '/redesign/'));

// Never expose deployment secrets or server logs through any static mount.
app.use((req, res, next) => {
  let pathname = req.path;
  try { pathname = decodeURIComponent(pathname); } catch (_) {}
  if (/(?:^|\/)(?:\.env(?:\.[^/]*)?|serviceAccount\.json|logs(?:\/|$))/i.test(pathname)) {
    return res.status(404).end();
  }
  next();
});

// Serve redesign SPA
app.use('/redesign', express.static(path.join(__dirname, 'redesign'), { index: 'index.html' }));
app.get('/redesign/*', (req, res) =>
  res.sendFile(path.join(__dirname, 'redesign', 'index.html'))
);

// site/pages/* used to live at the repo root -- keep the old short URLs working
// (parity with the rewrites in firebase.json / vercel.json)
const SITE_PAGES = {
  '/login': 'login.html', '/login.html': 'login.html',
  '/signup': 'signup.html', '/signup.html': 'signup.html',
  '/landing': 'landing.html', '/landing.html': 'landing.html',
  '/terms': 'terms.html', '/terms.html': 'terms.html',
  '/privacy': 'privacy.html', '/privacy.html': 'privacy.html',
};
for (const [route, file] of Object.entries(SITE_PAGES)) {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, 'site', 'pages', file)));
}
// (site/pages/*.css and the new-style /site/pages/login.html URLs are already covered
// by the generic root static middleware below, since they're real files under __dirname)

// Root static files — extensions:['html'] gives cleanUrls (/login → login.html)
app.use(express.static(path.join(__dirname), {
  index: false,
  dotfiles: 'deny',
  extensions: ['html'],
}));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error pipeline ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const entry = {
    ts: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: err.statusCode || 500,
    error: err.message,
    stack: err.stack,
  };
  console.error('[server]', JSON.stringify(entry));
  writeErrorLog(entry);
  pingHermes(entry);
  res.status(entry.status).json({ error: err.message || 'Internal server error' });
});

function writeErrorLog(entry) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'errors.jsonl'), JSON.stringify(entry) + '\n');
  } catch (_) { /* non-fatal */ }
}

function pingHermes(entry) {
  const url = process.env.HERMES_ERROR_WEBHOOK;
  if (!url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});
}

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`[api] listening on ${HOST}:${PORT}`);
  });
}

module.exports = app;
