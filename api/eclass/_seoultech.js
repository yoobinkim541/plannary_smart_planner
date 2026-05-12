const cheerio = require('cheerio');

const DEFAULT_BASE_URL = 'https://eclass.seoultech.ac.kr';

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value || DEFAULT_BASE_URL);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    return DEFAULT_BASE_URL;
  }
}

function toAbsoluteUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).toString();
  } catch (error) {
    return baseUrl;
  }
}

function parseDate(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  const match = source.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function classify(text, href) {
  const value = `${text} ${href}`.toLowerCase();
  if (/assign|과제|homework|report/.test(value)) return 'assignment';
  if (/vod|video|lecture|contents|동영상|온라인|강의|차시/.test(value)) return 'lecture';
  return null;
}

async function fetchText(url, sessionCookie) {
  const response = await fetch(url, {
    headers: {
      Cookie: sessionCookie,
      'User-Agent': 'PlanaryEclassSync/1.0',
      Accept: 'text/html,application/xhtml+xml'
    },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`E-class HTTP ${response.status}`);
  return response.text();
}

async function fetchSeoultechItems({ baseUrl = DEFAULT_BASE_URL, sessionCookie }) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const candidatePaths = ['/my/', '/local/ubion/user/', '/course/'];
  const pages = [];
  for (const path of candidatePaths) {
    try {
      pages.push({ url: toAbsoluteUrl(normalizedBase, path), html: await fetchText(toAbsoluteUrl(normalizedBase, path), sessionCookie) });
    } catch (error) {
      pages.push({ url: toAbsoluteUrl(normalizedBase, path), error: error.message });
    }
  }

  const items = new Map();
  pages.forEach(page => {
    if (!page.html) return;
    const $ = cheerio.load(page.html);
    const bodyText = $('body').text();
    if (/login|로그인/.test(bodyText) && !/과제|강의|lecture|assignment/i.test(bodyText)) return;
    $('a').each((_, element) => {
      const link = $(element);
      const title = link.text().replace(/\s+/g, ' ').trim();
      const href = link.attr('href') || '';
      const type = classify(title, href);
      if (!type || title.length < 2) return;
      const containerText = link.closest('li, tr, .card, .activity, .coursebox, div').text().replace(/\s+/g, ' ').trim();
      const dueDate = parseDate(containerText);
      const url = toAbsoluteUrl(page.url, href);
      const key = `${type}:${url}`;
      items.set(key, {
        externalId: key,
        type,
        title,
        courseTitle: containerText.slice(0, 120) || 'SeoulTech e-Class',
        dueDate,
        url
      });
    });
  });

  return [...items.values()].slice(0, 80);
}

module.exports = { DEFAULT_BASE_URL, fetchSeoultechItems, normalizeBaseUrl };
