const cheerio = require('cheerio');
const crypto = require('crypto');
const { toAbsoluteUrl, parseDate, parseKoreanDate, normalizeBaseUrl, fetchText } = require('./_seoultech');

const SEMESTER_STARTS = {
  '2026-1': '2026-03-02',
  '2026-2': '2026-09-01',
  '2025-2': '2025-09-01',
  '2025-1': '2025-03-04'
};

const KEYWORD_RULES = [
  { type: '중간고사', pattern: /중간\s*(고사|시험)|midterm/i, priority: 'high', reminders: [10080, 4320, 1440] },
  { type: '기말고사', pattern: /기말\s*(고사|시험)|final\s*exam/i, priority: 'high', reminders: [10080, 4320, 1440] },
  { type: '발표', pattern: /발표|presentation/i, priority: 'high', reminders: [10080, 1440] },
  { type: '프로젝트', pattern: /프로젝트\s*(제출|마감|발표)|project\s*(due|deadline|submission)/i, priority: 'medium', reminders: [20160, 10080, 1440] },
  { type: '과제 마감', pattern: /과제\s*제출|term\s*paper|보고서\s*제출/i, priority: 'medium', reminders: [4320, 1440] },
  { type: '퀴즈', pattern: /퀴즈|quiz/i, priority: 'medium', reminders: [4320, 1440] }
];

const WEEK_RE = /(\d{1,2})\s*주차|week\s*(\d{1,2})/i;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SYLLABUS_URLS = 30;

const hashUrl = url => crypto.createHash('sha1').update(String(url)).digest('hex');

function currentSemesterKey(now = new Date()) {
  return `${now.getFullYear()}-${now.getMonth() + 1 <= 7 ? 1 : 2}`;
}

function semesterRange(startIso) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setDate(end.getDate() + 7 * 18);
  return { start, end };
}

function parseSemesterPeriod(text) {
  const source = String(text || '').replace(/\s+/g, ' ');
  const m = source.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})\s*[~\-–]\s*(20\d{2})?[.\-/년\s]*(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : null;
}

function discoverCourseKjs(pages) {
  const codes = new Set();
  pages.forEach(page => {
    if (!page.html) return;
    for (const m of String(page.html).matchAll(/goLecture\(\s*['"]([^'"]+)['"]/g)) {
      const kj = m[1].trim();
      if (kj && /^[A-Za-z0-9._-]+$/.test(kj) && kj.length < 64) codes.add(kj);
    }
    for (const m of String(page.html).matchAll(/data-kj\s*=\s*["']([^"']+)["']/g)) {
      const kj = m[1].trim();
      if (kj && kj.length < 64) codes.add(kj);
    }
  });
  return [...codes];
}

function syllabusCandidatesForKj(baseUrl, kj) {
  const base = normalizeBaseUrl(baseUrl);
  // Probe order matters: cheapest / most-likely first. Empirically SeoulTech ilos
  // uses several variants depending on the course template, so we try them all
  // and let the parser decide which one carried real content.
  const paths = [
    `/ilos/st/course/lecture_plan_form.acl?KJKEY=${encodeURIComponent(kj)}`,
    `/ilos/st/course/lecture_plan_form.acl?kj=${encodeURIComponent(kj)}`,
    `/ilos/st/course/lecture_plan_view_form.acl?KJKEY=${encodeURIComponent(kj)}`,
    `/ilos/st/course/lecture_plan_pdf_form.acl?KJKEY=${encodeURIComponent(kj)}`,
    `/ilos/st/course/lecture_plan_pdf.acl?KJKEY=${encodeURIComponent(kj)}`,
    `/ilos/st/course/submain_form.acl?KJKEY=${encodeURIComponent(kj)}`
  ];
  return paths.map(p => toAbsoluteUrl(base, p));
}

function discoverSyllabusUrls(pages, baseUrl) {
  const urls = new Set();
  const base = normalizeBaseUrl(baseUrl);
  pages.forEach(page => {
    if (!page.html) return;
    const $ = cheerio.load(page.html);
    $('a').each((_, el) => {
      const a = $(el);
      const href = a.attr('href') || '';
      if (!href || href.startsWith('javascript:')) return;
      const text = String(a.text() || '').trim();
      if (/강의\s*계획서|syllabus|lecture\s*plan|수업계획/i.test(text) || /syllabus|lecture_?plan|sylabus/i.test(href)) {
        urls.add(toAbsoluteUrl(page.url || base, href));
      }
    });
    for (const m of String(page.html).matchAll(/['"]([^'"]*(?:syllabus|lecture_?plan|sylabus)[^'"]*)['"]/gi)) {
      const value = m[1].replace(/&amp;/g, '&');
      if (/^https?:\/\//i.test(value)) urls.add(value);
      else if (value.startsWith('/')) urls.add(toAbsoluteUrl(base, value));
    }
  });
  // Per-course candidate URLs derived from goLecture(...) on top of any direct hits.
  const kjs = discoverCourseKjs(pages);
  kjs.forEach(kj => syllabusCandidatesForKj(baseUrl, kj).forEach(u => urls.add(u)));
  return [...urls].slice(0, MAX_SYLLABUS_URLS);
}

async function fetchSyllabusContent(url, cookie) {
  const response = await fetch(url, {
    headers: {
      Cookie: cookie,
      'User-Agent': 'PlanaryEclassSync/1.0',
      Accept: '*/*',
      Referer: url
    },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`Syllabus HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const isPdf = contentType.includes('pdf') || buffer.slice(0, 5).toString() === '%PDF-';
  if (isPdf) {
    try {
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const { text = '' } = await pdfParse(buffer);
      return { text, isPdf: true, contentType };
    } catch (error) {
      return { text: '', isPdf: true, error: error.message || 'pdf-parse failed' };
    }
  }
  const html = buffer.toString('utf8');
  return { text: cheerio.load(html)('body').text() || html, isPdf: false, contentType };
}

function extractCourseTitle(text) {
  const m = String(text || '').slice(0, 4000).match(/(?:과목명|교과목명|Course\s*Title)\s*[:：]?\s*([^\n\r|]+)/i);
  if (!m) return null;
  return m[1].trim().split(/\s{2,}|담당|교수|학점/)[0].trim().slice(0, 80) || null;
}

function findWeek(line) {
  const m = line.match(WEEK_RE);
  if (!m) return null;
  const week = Number(m[1] || m[2]);
  return Number.isFinite(week) && week >= 1 && week <= 18 ? week : null;
}

function dueFromWeek(semesterStart, week) {
  const d = new Date(semesterStart);
  d.setDate(d.getDate() + (week - 1) * 7);
  return d.toISOString().slice(0, 10);
}

function extractExamDates(rawText, { courseTitle: fallbackCourseTitle, sourceUrl } = {}) {
  if (!rawText) return [];
  const text = String(rawText);
  const lines = text.split(/\r?\n/);
  const courseTitle = extractCourseTitle(text) || fallbackCourseTitle || 'SeoulTech e-Class';
  const semesterStart = parseSemesterPeriod(text) || SEMESTER_STARTS[currentSemesterKey()];
  const range = semesterStart ? semesterRange(semesterStart) : null;

  const candidates = [];
  const seen = new Set();

  function add(rule, dueDate, confidence, note) {
    if (!dueDate) return;
    if (range) {
      const d = new Date(dueDate);
      if (Number.isFinite(d.getTime()) && (d < range.start || d > range.end)) return;
    }
    const key = `${rule.type}:${dueDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      type: rule.type,
      priority: rule.priority,
      reminderMinutes: rule.reminders,
      dueDate, dueTime: null,
      courseTitle, sourceUrl: sourceUrl || null,
      note: note || null,
      confidence
    });
  }

  lines.forEach((line, idx) => {
    // Find matching rules first so we can short-circuit shared work below.
    const matching = KEYWORD_RULES.filter(rule => rule.pattern.test(line));
    if (!matching.length) return;
    // Compute the date candidates ONCE per line, not per rule.
    const sameLineDate = parseDate(line) || parseKoreanDate(line);
    const week = sameLineDate ? null : findWeek(line);
    const next = (!sameLineDate && !week) ? (lines[idx + 1] || '') : '';
    const nextDate = next ? (parseDate(next) || parseKoreanDate(next)) : null;
    const trimmedLine = line.replace(/\s+/g, ' ').trim();

    matching.forEach(rule => {
      if (sameLineDate) {
        add(rule, sameLineDate, 'high', trimmedLine.slice(0, 100));
      } else if (week && semesterStart) {
        add(rule, dueFromWeek(semesterStart, week), 'low', `${week}주차 (추정)`);
      } else if (nextDate) {
        add(rule, nextDate, 'high', `${trimmedLine.slice(0, 60)} / ${next.trim().slice(0, 40)}`);
      }
    });
  });

  return candidates;
}

async function fetchSyllabusExams({ baseUrl, sessionCookie, pages, db, admin, uid }) {
  const metrics = {
    urlsDiscovered: 0,
    urlsProbed: 0,
    urlsWithText: 0,
    urlsHttpErrors: 0,
    urlsLoginRedirect: 0,
    examsExtracted: 0,
    lastError: null
  };
  if (!sessionCookie) return { exams: [], metrics };
  const urls = discoverSyllabusUrls(pages || [], baseUrl);
  metrics.urlsDiscovered = urls.length;
  if (!urls.length) return { exams: [], metrics };

  const col = db.collection('eclass_syllabi');
  const refs = urls.map(url => ({ url, ref: col.doc(`${uid}_${hashUrl(url).slice(0, 32)}`) }));

  let snapshots = [];
  try {
    snapshots = await db.getAll(...refs.map(r => r.ref));
  } catch (error) {
    snapshots = await Promise.all(refs.map(r => r.ref.get()));
  }

  const now = Date.now();
  const out = [];
  for (let i = 0; i < refs.length; i++) {
    const { url, ref } = refs[i];
    const snap = snapshots[i];
    const cached = snap?.exists ? snap.data() : null;
    const ageMs = cached?.parsedAt?.toMillis ? now - cached.parsedAt.toMillis() : Infinity;
    let exams = cached?.examCandidates;

    if (!cached || ageMs > CACHE_TTL_MS) {
      metrics.urlsProbed += 1;
      try {
        const content = await fetchSyllabusContent(url, sessionCookie);
        // Detect login-wall / empty pages early so we don't write garbage candidates.
        const isLoginWall = /usr_id|usr_pwd|form[^>]*action=.{1,40}login/i.test(content.text || '');
        if (isLoginWall) {
          metrics.urlsLoginRedirect += 1;
          await ref.set({
            uid, sourceUrl: url,
            lastError: 'syllabus_login_wall',
            parsedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          continue;
        }
        if (!content.text || content.text.length < 50) {
          await ref.set({
            uid, sourceUrl: url,
            lastError: content.error || 'syllabus_no_text',
            textLength: content.text?.length || 0,
            parsedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          continue;
        }
        metrics.urlsWithText += 1;
        exams = extractExamDates(content.text, { sourceUrl: url });
        await ref.set({
          uid, sourceUrl: url,
          isPdf: content.isPdf,
          textLength: content.text.length,
          examCandidates: exams,
          lastError: null,
          parsedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        const msg = error.message || String(error);
        metrics.urlsHttpErrors += 1;
        metrics.lastError = msg;
        await ref.set({
          uid, sourceUrl: url,
          lastError: msg,
          parsedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        continue;
      }
    }

    const courseId = hashUrl(url).slice(0, 12);
    (exams || []).forEach(exam => out.push({ ...exam, courseId, sourceUrl: exam.sourceUrl || url }));
  }
  metrics.examsExtracted = out.length;
  return { exams: out, metrics };
}

module.exports = {
  fetchSyllabusExams,
  extractExamDates,
  discoverSyllabusUrls,
  discoverCourseKjs,
  syllabusCandidatesForKj,
  fetchSyllabusContent,
  SEMESTER_STARTS,
  KEYWORD_RULES
};
