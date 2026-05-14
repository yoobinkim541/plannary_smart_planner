const cheerio = require('cheerio');
const { getAdmin } = require('../api/eclass/_admin');

const BATCH_LIMIT = 25;
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024;
const URL_REGEX = /https?:\/\/[^\s<>"')]+/i;

function isPrivateHost(hostname) {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (h === '::1' || h === '0.0.0.0') return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:')) return true;
  return false;
}

function extractTextFromContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const blocks = Array.isArray(content.blocks) ? content.blocks : [];
  const parts = [];
  for (const block of blocks) {
    const d = block && block.data;
    if (!d) continue;
    if (typeof d.text === 'string') parts.push(d.text);
    if (typeof d.url === 'string') parts.push(d.url);
    if (typeof d.link === 'string') parts.push(d.link);
    if (Array.isArray(d.items)) {
      for (const item of d.items) {
        if (typeof item === 'string') parts.push(item);
        else if (item && typeof item.text === 'string') parts.push(item.text);
      }
    }
  }
  return parts.join(' ');
}

function findFirstUrl(text) {
  const m = text.match(URL_REGEX);
  return m ? m[0].replace(/[.,;:!?)\]}>]+$/, '') : null;
}

async function fetchOg(targetUrl) {
  let parsed;
  try { parsed = new URL(targetUrl); } catch { return null; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (isPrivateHost(parsed.hostname)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(parsed.toString(), {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'PlanaryBot/1.0 (+https://memo-omega-lyart.vercel.app)' }
    });
  } catch (error) {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);
  if (!res.ok) return null;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('text/html') && !ct.includes('application/xhtml')) return null;

  const reader = res.body && res.body.getReader ? res.body.getReader() : null;
  let html = '';
  if (reader) {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) { try { reader.cancel(); } catch {} break; }
      html += decoder.decode(value, { stream: true });
    }
  } else {
    html = await res.text();
    if (html.length > MAX_BYTES) html = html.slice(0, MAX_BYTES);
  }

  const $ = cheerio.load(html);
  const pick = sel => ($(sel).attr('content') || '').trim();
  let image = pick('meta[property="og:image"]') || pick('meta[name="og:image"]') || pick('meta[name="twitter:image"]');
  const title = pick('meta[property="og:title"]') || pick('meta[name="twitter:title"]') || ($('title').first().text() || '').trim();
  const description = pick('meta[property="og:description"]') || pick('meta[name="twitter:description"]') || pick('meta[name="description"]');

  if (image) {
    try { image = new URL(image, parsed).toString(); } catch { image = ''; }
  }
  return { image: image || '', title: title || '', description: description || '' };
}

async function wikiOgTick() {
  const admin = getAdmin();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const snap = await db.collection('wiki_pages')
    .where('ogTried', '==', false)
    .limit(BATCH_LIMIT)
    .get();

  let processed = 0;
  let filled = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const text = [data.title || '', extractTextFromContent(data.content)].join(' ');
    const url = findFirstUrl(text);
    const update = {
      ogTried: true,
      ogScrapedAt: FieldValue.serverTimestamp()
    };
    if (url) {
      const og = await fetchOg(url);
      if (og) {
        if (og.title) update.ogTitle = og.title;
        if (og.description) update.ogDescription = og.description;
        if (og.image && !data.coverUrl) {
          update.coverUrl = og.image;
          filled++;
        }
        update.ogSourceUrl = url;
      }
    }
    await doc.ref.set(update, { merge: true });
    processed++;
  }

  return { processed, filled };
}

module.exports = { wikiOgTick };
