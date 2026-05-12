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

function parseDday(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  const match = source.match(/D\s*[-+]\s*(\d+)|D\s*day\s*[:：]?\s*(\d+)/i);
  if (!match) return null;
  const days = Number(match[1] || match[2]);
  if (!Number.isFinite(days)) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

function mergeCookies(existing, setCookieHeaders) {
  const jar = new Map();
  String(existing || '').split(';').map(part => part.trim()).filter(Boolean).forEach(part => {
    const [name, ...rest] = part.split('=');
    if (name) jar.set(name, rest.join('='));
  });
  (setCookieHeaders || []).forEach(header => {
    const cookie = String(header || '').split(';')[0];
    const [name, ...rest] = cookie.split('=');
    if (name && rest.length) jar.set(name.trim(), rest.join('='));
  });
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

async function loginSeoultech({ baseUrl = DEFAULT_BASE_URL, username, password }) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const loginUrl = toAbsoluteUrl(normalizedBase, '/ilos/index.acl');
  const loginPage = await fetch(loginUrl, {
    headers: {
      'User-Agent': 'PlanaryEclassSync/1.0',
      Accept: 'text/html,application/xhtml+xml'
    },
    redirect: 'follow'
  });
  let cookie = mergeCookies('', getSetCookieHeaders(loginPage));
  if (!loginPage.ok) throw new Error(`E-class login page HTTP ${loginPage.status}`);
  const html = await loginPage.text();
  const $ = cheerio.load(html);
  const form = $('form[action*="/ilos/lo/login"], form#myform, form[action*="login"]').first();
  const action = form.attr('action') || '/ilos/lo/login.acl';
  const body = new URLSearchParams();
  form.find('input').each((_, element) => {
    const input = $(element);
    const name = input.attr('name');
    if (!name) return;
    body.set(name, input.attr('value') || '');
  });
  body.set('usr_id', username);
  body.set('usr_pwd', password);

  const response = await fetch(toAbsoluteUrl(loginUrl, action), {
    method: 'POST',
    headers: {
      Cookie: cookie,
      'User-Agent': 'PlanaryEclassSync/1.0',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml'
    },
    body,
    redirect: 'manual'
  });
  cookie = mergeCookies(cookie, getSetCookieHeaders(response));
  if (![200, 302, 303].includes(response.status)) throw new Error(`E-class login HTTP ${response.status}`);
  const location = response.headers.get('location');
  const checkUrl = location ? toAbsoluteUrl(loginUrl, location) : toAbsoluteUrl(normalizedBase, '/ilos/main/main_form.acl');
  const checkHtml = response.status >= 300 ? await fetchText(checkUrl, cookie) : await response.text();
  const check = cheerio.load(checkHtml);
  const stillLoginForm = check('input[name="usr_id"], input[name="usr_pwd"], form[action*="/ilos/lo/login"]').length > 0;
  const bodyText = check('body').text().replace(/\s+/g, ' ');
  if (stillLoginForm || (/아이디|비밀번호|로그인/.test(bodyText) && !/과제|강의|수강|lecture|assignment/i.test(bodyText))) {
    throw new Error('E-class login failed. 아이디 또는 비밀번호를 확인해주세요.');
  }
  return cookie;
}

async function fetchSeoultechItems({ baseUrl = DEFAULT_BASE_URL, sessionCookie, username, password }) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const cookie = sessionCookie || await loginSeoultech({ baseUrl: normalizedBase, username, password });
  const candidatePaths = [
    '/ilos/index.acl',
    '/ilos/main/main_form.acl',
    '/ilos/mp/todo_list_form.acl',
    '/ilos/st/course/submain_form.acl',
    '/ilos/st/course/eclass_list_form.acl',
    '/my/',
    '/course/'
  ];
  const pages = [];
  for (const path of candidatePaths) {
    try {
      pages.push({ url: toAbsoluteUrl(normalizedBase, path), html: await fetchText(toAbsoluteUrl(normalizedBase, path), cookie) });
    } catch (error) {
      pages.push({ url: toAbsoluteUrl(normalizedBase, path), error: error.message });
    }
  }

  const items = new Map();
  pages.forEach(page => {
    if (!page.html) return;
    const $ = cheerio.load(page.html);
    const bodyText = $('body').text();
    const isLoginForm = $('input[name="usr_id"], input[name="usr_pwd"], form[action*="/ilos/lo/login"]').length > 0;
    if (isLoginForm || (/login|로그인/.test(bodyText) && !/과제|강의|수강|lecture|assignment/i.test(bodyText))) return;
    $('a').each((_, element) => {
      const link = $(element);
      const title = link.text().replace(/\s+/g, ' ').trim();
      const href = link.attr('href') || '';
      const type = classify(title, href);
      if (!type || title.length < 2) return;
      const containerText = link.closest('li, tr, .card, .activity, .coursebox, div').text().replace(/\s+/g, ' ').trim();
      const dueDate = parseDate(containerText) || parseDday(containerText);
      const url = toAbsoluteUrl(page.url, href);
      const key = `${type}:${url}`;
      items.set(key, {
        externalId: key,
        type,
        title,
        courseTitle: containerText.slice(0, 120) || 'SeoulTech e-Class',
        dueDate,
        ddayText: (containerText.match(/D\s*[-+]\s*\d+|D\s*day\s*[:：]?\s*\d+/i) || [null])[0],
        url
      });
    });
  });

  return [...items.values()].slice(0, 80);
}

module.exports = { DEFAULT_BASE_URL, fetchSeoultechItems, loginSeoultech, normalizeBaseUrl };
