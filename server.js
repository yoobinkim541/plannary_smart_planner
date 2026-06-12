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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/redesign', (req, res) => res.redirect(302, '/redesign/'));

// Serve redesign SPA
app.use('/redesign', express.static(path.join(__dirname, 'redesign'), { index: 'index.html' }));
app.get('/redesign/*', (req, res) =>
  res.sendFile(path.join(__dirname, 'redesign', 'index.html'))
);

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

app.listen(PORT, HOST, () => {
  console.log(`[api] listening on ${HOST}:${PORT}`);
});
