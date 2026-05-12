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

function parseKoreanDate(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  const matches = [...source.matchAll(/(?:(20\d{2})[.\-/년\s]+)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)];
  if (!matches.length) return null;
  const match = matches[matches.length - 1];
  const now = new Date();
  const year = match[1] || String(now.getFullYear());
  return `${year}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
}

function parseDday(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  const match = source.match(/D\s*([-+])\s*(\d+)|D\s*day\s*[:：]?\s*(\d+)/i);
  if (!match) return null;
  const sign = match[1] === '+' ? -1 : 1;
  const days = Number(match[2] || match[3]);
  if (!Number.isFinite(days)) return null;
  const date = new Date();
  date.setDate(date.getDate() + (days * sign));
  return date.toISOString().slice(0, 10);
}

function parseKoreanTime(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  const matches = [...source.matchAll(/(오전|오후)\s*(\d{1,2})\s*:\s*(\d{2})/g)];
  if (!matches.length) return null;
  const match = matches[matches.length - 1];
  let hour = Number(match[2]);
  const minute = Number(match[3]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (match[1] === '오후' && hour < 12) hour += 12;
  if (match[1] === '오전' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function classify(text, href) {
  const value = `${text} ${href}`.toLowerCase();
  if (/report|assign|과제|homework/.test(value)) return 'assignment';
  if (/quiz|퀴즈/.test(value)) return 'quiz';
  if (/lecture|weeks|vod|video|영상|contents|동영상|온라인/.test(value)) return 'lecture';
  return null;
}

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function extractTitle(text) {
  const source = cleanText(text);
  const typed = source.match(/\[(?:영상|과제|퀴즈)\]\s*/);
  if (!typed) return '';
  const afterType = source.slice(typed.index);
  const courseIndex = afterType.search(/\s+[가-힣A-Za-z0-9][가-힣A-Za-z0-9\s&()._-]*\(\d{5,}-\d{4,}\)/);
  const ddayIndex = afterType.search(/\s+D\s*[-+]\s*\d+/i);
  const endCandidates = [courseIndex, ddayIndex].filter(index => index > 0);
  const end = endCandidates.length ? Math.min(...endCandidates) : afterType.length;
  return cleanText(afterType.slice(0, end));
}

function extractCourseTitle(text, title) {
  const source = cleanText(text).replace(cleanText(title), ' ');
  const beforeDday = source.split(/D\s*[-+]\s*\d+/)[0];
  const candidates = beforeDday.match(/[가-힣A-Za-z0-9][가-힣A-Za-z0-9\s&()._-]*\(\d{5,}-\d{4,}\)/g);
  if (candidates && candidates.length) return cleanText(candidates[candidates.length - 1]);
  return null;
}

function normalizeTodoItem({ text, href, pageUrl, externalId }) {
  const source = cleanText(text);
  if (!/D\s*[-+]\s*\d+/i.test(source)) return null;
  const type = classify(source, href);
  if (!type) return null;
  const title = extractTitle(source);
  if (!title || title.length < 3 || !/\[(영상|과제|퀴즈)\]/.test(title)) return null;
  const courseTitle = extractCourseTitle(source, title);
  const dueDate = parseDate(source) || parseKoreanDate(source) || parseDday(source);
  const dueTime = parseKoreanTime(source);
  const url = href && !href.startsWith('javascript:') ? toAbsoluteUrl(pageUrl, href) : pageUrl;
  const ddayText = (source.match(/D\s*[-+]\s*\d+/i) || [null])[0];
  return {
    externalId: externalId || `${type}:${courseTitle || 'course'}:${title}:${dueDate || ddayText || url}`,
    type,
    title,
    courseTitle: courseTitle || 'SeoulTech e-Class',
    dueDate,
    dueTime,
    ddayText,
    url
  };
}

function getGoLectureArgs(href) {
  const match = String(href || '').match(/goLecture\(([^)]+)\)/);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map(arg => arg[1] || arg[2] || '');
}

function normalizeTodoWrap($, element, pageUrl) {
  const todo = $(element);
  const href = todo.attr('href') || '';
  const lectureArgs = getGoLectureArgs(href);
  const gubun = todo.attr('data-id') || lectureArgs[1] || '';
  const kj = todo.attr('data-kj') || lectureArgs[0] || '';
  const itemId = lectureArgs[2] || todo.find('input[id*="todo_list_gubun"]').val() || '';
  const title = cleanText(todo.find('.todo_title').text());
  const courseTitle = cleanText(todo.find('.todo_subjt').text());
  const dateText = cleanText(todo.find('.todo_sub_wrap .todo_date').text() || todo.find('.todo_date').text());
  const combinedText = cleanText(`${title} ${courseTitle} ${dateText}`);
  const type = classify(`${title} ${gubun}`, href);
  if (!type || !title || !/D\s*[-+]\s*\d+/i.test(dateText)) return null;
  return {
    externalId: [kj, gubun, itemId || title].filter(Boolean).join(':'),
    type,
    title,
    courseTitle: courseTitle || 'SeoulTech e-Class',
    dueDate: parseDate(dateText) || parseKoreanDate(dateText) || parseDday(dateText),
    dueTime: parseKoreanTime(dateText),
    ddayText: (dateText.match(/D\s*[-+]\s*\d+/i) || [null])[0],
    url: href && !href.startsWith('javascript:') ? toAbsoluteUrl(pageUrl, href) : pageUrl,
    rawText: combinedText
  };
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
    const todoWraps = $('.todo_wrap');
    todoWraps.each((_, element) => {
      const item = normalizeTodoWrap($, element, page.url);
      if (!item) return;
      items.set(item.externalId, item);
    });
    if (todoWraps.length) return;
    $('li, tr, .todo, .card, .activity, .coursebox, div').each((_, element) => {
      const container = $(element);
      const containerText = cleanText(container.text());
      if (containerText.length < 8 || containerText.length > 600) return;
      const link = container.find('a').filter((__, linkEl) => classify($(linkEl).text(), $(linkEl).attr('href') || '')).first();
      const href = link.attr('href') || '';
      const item = normalizeTodoItem({ text: containerText, href, pageUrl: page.url });
      if (!item) return;
      items.set(item.externalId, item);
    });
  });

  return [...items.values()].slice(0, 80);
}

module.exports = { DEFAULT_BASE_URL, fetchSeoultechItems, loginSeoultech, normalizeBaseUrl };
