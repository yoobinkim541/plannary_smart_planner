#!/usr/bin/env node
/*
 * Static verification gate for the Planary refactor.
 *
 * A real headless browser cannot run the full app in this environment (the
 * sandbox kills any Chromium process that lives more than a second or two), so
 * instead of visual rendering we statically verify the things an ES-module
 * refactor can actually break:
 *
 *   1. SYNTAX        — `node --check` every JS file (V8 parser; all modern syntax).
 *   2. MODULE GRAPH  — compile + link every module entry with vm.SourceTextModule
 *                      (no evaluation, no browser globals needed). V8's linker
 *                      throws if an import path can't be resolved or an imported
 *                      name isn't actually exported. This is the strongest check
 *                      for import/export correctness.
 *   3. HANDLER CONTRACT — every function called from an inline HTML on*="fn()"
 *                      handler must still be reachable as a global: either a
 *                      top-level declaration in a *classic* script, or an explicit
 *                      `window.fn = ...`. Once a file becomes <script type=module>,
 *                      its top-level declarations are no longer global, so this
 *                      forces the window shim to stay complete.
 *
 * Run with:  node --experimental-vm-modules .verify/check.js
 * Exit code 0 = all gates pass, 1 = failure.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HTML_FILES = ['index.html', 'login.html', 'signup.html', 'landing.html'].filter((f) =>
  fs.existsSync(path.join(ROOT, f)));

function listJsFiles() {
  const out = [];
  const skip = new Set(['node_modules', '.git', '.verify', 'redesign', 'worker', 'api', 'server']);
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith('.') && e.isDirectory()) continue;
      if (skip.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') && !e.name.endsWith('.min.js')) out.push(p);
    }
  })(ROOT);
  return out;
}

// Heuristic regex scans below run on RAW source on purpose. Stripping strings
// and comments with regex desyncs on apostrophes-in-comments and regex literals
// (it once swallowed real `window.x =` lines), and for these safety-net scans a
// stray false-positive global is harmless while a false-negative is not. The
// rigorous import/export check is the vm linker gate, not these regexes.

// ---- module entry discovery: <script type="module" src="X"> across HTML ----
function moduleEntries() {
  const entries = new Set();
  for (const f of HTML_FILES) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const re = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(html))) {
      const src = m[1].split('?')[0];
      if (src.startsWith('http')) continue;
      entries.add(path.resolve(ROOT, src.replace(/^\//, '')));
    }
  }
  return [...entries];
}

// ---- gate 1: syntax ----
function checkSyntax(files) {
  const failures = [];
  for (const f of files) {
    try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
    catch (e) { failures.push(`${path.relative(ROOT, f)}: ${String(e.stderr || e.message).split('\n').slice(0, 4).join(' ')}`); }
  }
  return failures;
}

// ---- gate 2: module graph link ----
async function checkModuleGraph(entries) {
  const failures = [];
  const cache = new Map();
  const sharedContext = vm.createContext({}); // all linked modules must share one context
  function loadModule(file) {
    if (cache.has(file)) return cache.get(file);
    const source = fs.readFileSync(file, 'utf8');
    const mod = new vm.SourceTextModule(source, {
      identifier: file,
      context: sharedContext,
    });
    cache.set(file, mod);
    return mod;
  }
  async function linker(specifier, referencingModule) {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
      throw new Error(`bare import "${specifier}" not allowed (keep externals as globals)`);
    }
    const base = path.dirname(referencingModule.identifier);
    let target = path.resolve(base, specifier);
    if (!fs.existsSync(target) && fs.existsSync(target + '.js')) target += '.js';
    if (!fs.existsSync(target)) throw new Error(`cannot resolve "${specifier}" from ${path.relative(ROOT, referencingModule.identifier)}`);
    return loadModule(target);
  }
  for (const entry of entries) {
    try {
      const mod = loadModule(entry);
      await mod.link(linker); // throws on unresolved path OR missing named export
    } catch (e) {
      failures.push(`${path.relative(ROOT, entry)}: ${e.message}`);
    }
  }
  return failures;
}

// ---- gate 3: inline handler contract ----
const HANDLER_BUILTINS = new Set([
  'if', 'for', 'while', 'switch', 'return', 'function', 'typeof', 'instanceof', 'new', 'delete', 'void', 'in', 'of',
  'this', 'event', 'window', 'document', 'console', 'alert', 'confirm', 'prompt', 'parseInt', 'parseFloat',
  'Number', 'String', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'Boolean', 'RegExp', 'Promise',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'encodeURIComponent', 'decodeURIComponent',
  'isNaN', 'isFinite', 'Set', 'Map', 'Array', 'requestAnimationFrame',
]);

function exposedGlobals(jsFiles, moduleFileSet) {
  const set = new Set();
  for (const f of jsFiles) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g)) set.add(m[1]);
    // Object.assign(window, { a, b, c }) style bulk exposure
    for (const blk of src.matchAll(/Object\.assign\(\s*window\s*,\s*\{([^}]*)\}/g)) {
      for (const k of blk[1].matchAll(/([A-Za-z_$][\w$]*)\s*[,:}]/g)) set.add(k[1]);
    }
    // top-level declarations only count as global for CLASSIC scripts
    if (!moduleFileSet.has(f)) {
      for (const m of src.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) set.add(m[1]);
      for (const m of src.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) set.add(m[1]);
    }
  }
  return set;
}

function handlerRefs() {
  const refs = new Map(); // ident -> "file: snippet"
  for (const f of HTML_FILES) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const m of html.matchAll(/\son[a-z]+\s*=\s*(["'])([\s\S]*?)\1/g)) {
      const body = m[2];
      for (const c of body.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
        const id = c[2];
        if (!HANDLER_BUILTINS.has(id) && !refs.has(id)) refs.set(id, `${f}: ${body.slice(0, 60)}`);
      }
    }
  }
  return refs;
}

(async function main() {
  const jsFiles = listJsFiles();
  const moduleFiles = moduleEntries();
  // module graph: also include modules reachable via import (linker walks them);
  // for the "is this file a module" set we approximate with entries + anything
  // they import. Simplest: treat every file under js/ as a module if entries exist.
  const moduleFileSet = new Set(moduleFiles);
  // expand: any file imported by a module is a module too
  for (const f of jsFiles) {
    const src = fs.readFileSync(f, 'utf8');
    if (/^\s*import\s/m.test(src) || /^\s*export\s/m.test(src)) moduleFileSet.add(f);
  }

  console.log('== Planary static verification ==');
  const syntax = checkSyntax(jsFiles);
  console.log(`[1] syntax        : ${syntax.length ? 'FAIL' : 'pass'} (${jsFiles.length} files)`);
  syntax.forEach((s) => console.log('     - ' + s));

  let graph = [];
  if (moduleFiles.length) {
    graph = await checkModuleGraph(moduleFiles);
    console.log(`[2] module graph  : ${graph.length ? 'FAIL' : 'pass'} (${moduleFiles.length} entries)`);
    graph.forEach((s) => console.log('     - ' + s));
  } else {
    console.log('[2] module graph  : skip (no <script type=module> entries yet)');
  }

  const exposed = exposedGlobals(jsFiles, moduleFileSet);
  const refs = handlerRefs();
  const missing = [...refs.keys()].filter((id) => !exposed.has(id));
  console.log(`[3] handler shim  : ${missing.length ? 'FAIL' : 'pass'} (${refs.size} handler fns, ${exposed.size} globals exposed)`);
  missing.forEach((id) => console.log(`     - missing global: ${id}  <- ${refs.get(id)}`));

  const ok = !syntax.length && !graph.length && !missing.length;
  console.log(ok ? '\nRESULT: PASS' : '\nRESULT: FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('CHECK_ERROR', e.stack || e); process.exit(2); });
