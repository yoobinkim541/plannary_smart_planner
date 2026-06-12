const cheerio = require('cheerio');

const DEFAULT_BASE_URL = 'https://eclass.seoultech.ac.kr';

function _isPrivateHost(hostname) {
  const h = hostname.split(':')[0].toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '::1') return true;
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0 || a >= 224) return true;
  }
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value || DEFAULT_BASE_URL);
    if (url.protocol !== 'https:') throw new Error('HTTPS required');
    if (_isPrivateHost(url.hostname)) throw new Error('Private network addresses are not allowed');
    return `https://${url.host}`;
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

async function fetchText(url, sessionCookie, options = {}) {
  const headers = {
    Cookie: sessionCookie,
    'User-Agent': 'PlanaryEclassSync/1.0',
    Accept: 'text/html,application/xhtml+xml,*/*',
    Referer: options.referer || url
  };
  if (options.ajax) headers['X-Requested-With'] = 'XMLHttpRequest';
  if (options.method === 'POST') headers['Content-Type'] = 'application/x-www-form-urlencoded';
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`E-class HTTP ${response.status}`);
  return response.text();
}

async function fetchTodoPageVariants(baseUrl, path, cookie, referer) {
  const url = toAbsoluteUrl(baseUrl, path);
  const variants = [];
  for (const options of [
    { referer },
    { referer, ajax: true },
    { referer, ajax: true, method: 'POST', body: new URLSearchParams().toString() }
  ]) {
    try {
      variants.push({ url, html: await fetchText(url, cookie, options) });
    } catch (error) {
      variants.push({ url, error: error.message });
    }
  }
  return variants;
}

function discoverTodoPaths(html) {
  const paths = new Set();
  const source = String(html || '');
  for (const match of source.matchAll(/['"]([^'"]*todo[^'"]*\.acl[^'"]*)['"]/gi)) {
    const value = match[1].replace(/&amp;/g, '&');
    if (/^https?:\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        paths.add(`${parsed.pathname}${parsed.search}`);
      } catch (error) {}
    } else if (value.startsWith('/')) {
      paths.add(value);
    } else if (value.includes('/')) {
      paths.add(`/${value.replace(/^\.?\//, '')}`);
    }
  }
  return [...paths];
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

async function fetchSeoultechItems({ baseUrl = DEFAULT_BASE_URL, sessionCookie, username, password, returnPages = false }) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const cookie = sessionCookie || await loginSeoultech({ baseUrl: normalizedBase, username, password });
  const candidatePaths = [
    '/ilos/index.acl',
    '/ilos/main/main_form.acl',
    '/ilos/mp/todo_list_form.acl',
    '/ilos/mp/todo_list.acl',
    '/ilos/mp/todo_list_view.acl',
    '/ilos/main/todo_list_form.acl',
    '/ilos/main/todo_list.acl',
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
  const discoveredPaths = new Set();
  pages.forEach(page => {
    if (!page.html) return;
    discoverTodoPaths(page.html).forEach(path => discoveredPaths.add(path));
  });
  for (const path of discoveredPaths) {
    const variants = await fetchTodoPageVariants(normalizedBase, path, cookie, toAbsoluteUrl(normalizedBase, '/ilos/main/main_form.acl'));
    pages.push(...variants);
  }

  // Discover enrolled courses from the pages fetched so far, then crawl
  // per-course assignment/quiz list pages so items not in the main todo_list
  // (no D-day, or already visible only on course pages) are also captured.
  const enrolledCourses = discoverEnrolledCourses(pages);
  const coursePages = await fetchCourseAssignmentPages(normalizedBase, enrolledCourses, cookie, 12);
  pages.push(...coursePages);

  const items = new Map();
  pages.forEach(page => {
    if (!page.html) return;
    const $ = cheerio.load(page.html);
    const bodyText = $('body').text();
    const isLoginForm = $('input[name="usr_id"], input[name="usr_pwd"], form[action*="/ilos/lo/login"]').length > 0;
    if (isLoginForm || (/login|로그인/.test(bodyText) && !/과제|강의|수강|lecture|assignment/i.test(bodyText))) return;

    // For course-specific pages (assignment/quiz lists): use date-based parser
    // that does not require D-day labels.
    if (page.courseKj && /reportList|quizList/.test(page.url || '')) {
      const courseItems = parseCoursePageItems($, page.url, page.courseName);
      courseItems.forEach(item => {
        if (!items.has(item.externalId)) items.set(item.externalId, item);
      });
      return;
    }

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

  const collected = [...items.values()].slice(0, 120);
  if (returnPages) {
    return { items: collected, pages, cookie, enrolledCourses };
  }
  return { items: collected, enrolledCourses };
}

// Discover enrolled courses and their KJ codes from any already-fetched pages.
// Returns [{ kj, name }] — name may be null if not recoverable from page text.
function discoverEnrolledCourses(pages) {
  const courses = new Map(); // kj → name
  pages.forEach(page => {
    if (!page.html) return;
    const $ = cheerio.load(page.html);
    const html = String(page.html);

    // Pattern A: goLecture('kj', 'courseName', ...)
    for (const m of html.matchAll(/goLecture\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]*)['"]/g)) {
      const kj = m[1].trim();
      const name = cleanText(m[2]);
      if (kj && /^[A-Za-z0-9._-]+$/.test(kj) && kj.length < 64) {
        if (!courses.has(kj) && name && name.length > 1) courses.set(kj, name);
        else if (!courses.get(kj)) courses.set(kj, name || null);
      }
    }

    // Pattern B: <a href="...KJKEY=kj...">Course Name</a>
    $('a[href*="KJKEY"], a[href*="kjkey"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/[?&][Kk][Jj][Kk][Ee][Yy]=([A-Za-z0-9._%-]+)/);
      if (!m) return;
      let kj;
      try { kj = decodeURIComponent(m[1]).trim(); } catch (_) { return; }
      if (!kj || kj.length >= 64 || !/^[A-Za-z0-9._-]+$/.test(kj)) return;
      if (!courses.has(kj)) {
        const name = cleanText($(el).text());
        courses.set(kj, (name && name.length > 1 && name.length < 80) ? name : null);
      }
    });

    // Pattern C: data-kj attribute with nearby text
    $('[data-kj]').each((_, el) => {
      const kj = ($(el).attr('data-kj') || '').trim();
      if (!kj || kj.length >= 64 || !/^[A-Za-z0-9._-]+$/.test(kj)) return;
      if (!courses.has(kj)) {
        const name = cleanText(
          $(el).closest('.coursebox, .course-item, .subject-item, li').find('.course-name, .title, a').first().text()
          || $(el).text()
        );
        courses.set(kj, (name && name.length > 1 && name.length < 80) ? name : null);
      }
    });

    // Pattern D: SeoulTech ilos my_lecture_container — iterate every course div
    // directly so we never miss a course even if its onclick/href format is unusual.
    $('.my_lecture_container .container_body > div').each((_, el) => {
      const itemHtml = $.html(el);
      if (!itemHtml) return;
      let kj = null, name = null;

      // goLecture('kjKey') or goLecture('kjKey', 'name', ...)
      const glm = itemHtml.match(/goLecture\(\s*['"]([A-Za-z0-9._-]+)['"]\s*(?:,\s*['"]([^'"]*)['"]\s*)?/);
      if (glm) {
        kj = glm[1].trim();
        name = (glm[2] !== undefined && glm[2] !== '') ? cleanText(glm[2]) || null : null;
      }

      // KJKEY= in any href or JS string
      if (!kj) {
        const km = itemHtml.match(/[?&]KJKEY=([A-Za-z0-9._%-]{1,63})/i);
        if (km) {
          try { kj = decodeURIComponent(km[1]).trim(); } catch (_) {}
        }
      }

      if (!kj || !/^[A-Za-z0-9._-]+$/.test(kj) || kj.length >= 64) return;

      // Derive name from visible text when goLecture didn't provide one
      if (!name || name.length < 2) {
        const item = $(el);
        const candidate = cleanText(
          item.find('.course_name, .courseName, .name, h4, h3, a').first().text()
          || item.text().split(/[\n\r|·–]/)[0]
        ).slice(0, 80);
        name = (candidate && candidate.length >= 2) ? candidate : null;
      }

      if (!courses.has(kj)) courses.set(kj, name);
      else if (!courses.get(kj) && name) courses.set(kj, name);
    });
  });
  return [...courses.entries()].map(([kj, name]) => ({ kj, name }));
}

// Fetch per-course assignment and quiz list pages for courses whose items
// may not appear in the main todo_list (no D-day or already submitted).
// Returns additional pages to merge into the main pages array.
async function fetchCourseAssignmentPages(normalizedBase, courses, cookie, limit = 12) {
  const extraPages = [];
  for (const course of courses.slice(0, limit)) {
    for (const path of [
      `/ilos/st/course/reportList_form.acl?KJKEY=${encodeURIComponent(course.kj)}`,
      `/ilos/st/course/quizList_form.acl?KJKEY=${encodeURIComponent(course.kj)}`,
    ]) {
      try {
        const url = toAbsoluteUrl(normalizedBase, path);
        const html = await fetchText(url, cookie);
        extraPages.push({ url, html, courseKj: course.kj, courseName: course.name });
      } catch (_) {
        extraPages.push({ url: toAbsoluteUrl(normalizedBase, path), error: 'fetch failed', courseKj: course.kj });
      }
    }
  }
  return extraPages;
}

// Parse assignment/quiz items from a course-specific list page.
// Unlike normalizeTodoWrap/normalizeTodoItem, this does NOT require a D-day
// label — it accepts explicit date strings directly.
function parseCoursePageItems($, pageUrl, courseName) {
  const items = new Map();
  const isReport = /reportList/.test(pageUrl);
  const isQuiz = /quizList/.test(pageUrl);
  const defaultType = isReport ? 'assignment' : isQuiz ? 'quiz' : null;

  $('tr').each((_, tr) => {
    const row = $(tr);
    const cells = row.find('td');
    if (cells.length < 2) return;

    // Title is usually in the first or second cell
    const titleEl = cells.eq(0).find('a').first().length
      ? cells.eq(0).find('a').first()
      : cells.eq(1).find('a').first();
    const title = cleanText(titleEl.text() || cells.eq(0).text() || cells.eq(1).text());
    if (!title || title.length < 3 || title === '제목' || title === 'Title') return;

    const href = titleEl.attr('href') || '';
    const type = classify(title, href) || defaultType;
    if (!type) return;

    // Scan all cells for a date value
    let dueDate = null;
    let dueTime = null;
    cells.each((_, cell) => {
      if (dueDate) return;
      const text = cleanText($(cell).text());
      const d = parseDate(text) || parseKoreanDate(text);
      if (d) { dueDate = d; dueTime = parseKoreanTime(text); }
    });

    const url = href && !href.startsWith('javascript:') ? toAbsoluteUrl(pageUrl, href) : pageUrl;
    const externalId = `${type}:${courseName || 'course'}:${title}:${dueDate || url}`;
    if (!items.has(externalId)) {
      items.set(externalId, {
        externalId, type, title,
        courseTitle: courseName || 'SeoulTech e-Class',
        dueDate, dueTime, ddayText: null, url,
      });
    }
  });
  return [...items.values()];
}

module.exports = {
  DEFAULT_BASE_URL,
  fetchSeoultechItems, loginSeoultech, normalizeBaseUrl,
  fetchText, toAbsoluteUrl, parseDate, parseKoreanDate,
  discoverEnrolledCourses, fetchCourseAssignmentPages, parseCoursePageItems,
};
