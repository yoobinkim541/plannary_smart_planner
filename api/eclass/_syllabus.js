const cheerio = require('cheerio');
const crypto = require('crypto');
const { fetchText, toAbsoluteUrl, parseDate, parseKoreanDate, normalizeBaseUrl } = require('./_seoultech');

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

function hashUrl(url) {
  return crypto.createHash('sha1').update(String(url)).digest('hex');
}

function currentSemesterKey(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month <= 7 ? `${year}-1` : `${year}-2`;
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
  const match = source.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})\s*[~\-–]\s*(20\d{2})?[.\-/년\s]*(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (!match) return null;
  const start = `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`;
  return start;
}

function discoverSyllabusUrls(pages, baseUrl) {
  const urls = new Set();
  const normalizedBase = normalizeBaseUrl(baseUrl);
  pages.forEach(page => {
    if (!page.html) return;
    const $ = cheerio.load(page.html);
    $('a').each((_, el) => {
      const a = $(el);
      const text = String(a.text() || '').trim();
      const href = a.attr('href') || '';
      if (!href || href.startsWith('javascript:')) return;
      if (/강의\s*계획서|syllabus|lecture\s*plan|수업계획/i.test(text) || /syllabus|lecture_?plan|sylabus/i.test(href)) {
        urls.add(toAbsoluteUrl(page.url || normalizedBase, href));
      }
    });
    const source = String(page.html);
    for (const match of source.matchAll(/['"]([^'"]*(?:syllabus|lecture_?plan|sylabus)[^'"]*)['"]/gi)) {
      const value = match[1].replace(/&amp;/g, '&');
      if (/^https?:\/\//i.test(value)) urls.add(value);
      else if (value.startsWith('/')) urls.add(toAbsoluteUrl(normalizedBase, value));
    }
  });
  return [...urls].slice(0, 30);
}

async function fetchSyllabusContent(url, cookie) {
  const headers = {
    Cookie: cookie,
    'User-Agent': 'PlanaryEclassSync/1.0',
    Accept: '*/*',
    Referer: url
  };
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (!response.ok) throw new Error(`Syllabus HTTP ${response.status}`);
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const buffer = Buffer.from(await response.arrayBuffer());
  const isPdf = contentType.includes('pdf') || buffer.slice(0, 5).toString() === '%PDF-';
  if (isPdf) {
    let pdfParse;
    try {
      // Import the inner module to avoid pdf-parse's index.js debug branch
      pdfParse = require('pdf-parse/lib/pdf-parse.js');
    } catch (error) {
      try {
        pdfParse = require('pdf-parse');
      } catch (innerError) {
        return { text: '', isPdf: true, error: 'pdf-parse not installed' };
      }
    }
    try {
      const result = await pdfParse(buffer);
      return { text: result.text || '', isPdf: true, contentType };
    } catch (error) {
      return { text: '', isPdf: true, error: error.message };
    }
  }
  const text = buffer.toString('utf8');
  const $ = cheerio.load(text);
  return { text: $('body').text() || text, isPdf: false, contentType };
}

function extractCourseTitle(text) {
  const source = String(text || '').slice(0, 4000);
  const match = source.match(/(?:과목명|교과목명|Course\s*Title)\s*[:：]?\s*([^\n\r|]+)/i);
  if (!match) return null;
  return match[1].trim().split(/\s{2,}|담당|교수|학점/)[0].trim().slice(0, 80) || null;
}

function extractExamDates(rawText, { courseTitle: fallbackCourseTitle, sourceUrl } = {}) {
  if (!rawText) return [];
  const text = String(rawText).replace(/ /g, ' ');
  const lines = text.split(/\r?\n/);
  const courseTitle = extractCourseTitle(text) || fallbackCourseTitle || 'SeoulTech e-Class';
  const semesterStart = parseSemesterPeriod(text) || SEMESTER_STARTS[currentSemesterKey()];
  const range = semesterStart ? semesterRange(semesterStart) : null;

  const candidates = [];
  const seen = new Set();

  function addCandidate({ type, priority, reminders, dueDate, dueTime, note, confidence }) {
    if (!dueDate) return;
    if (range) {
      const d = new Date(dueDate);
      if (Number.isFinite(d.getTime()) && (d < range.start || d > range.end)) return;
    }
    const key = `${type}:${dueDate}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      type, priority, reminderMinutes: reminders,
      dueDate, dueTime: dueTime || null,
      courseTitle, sourceUrl: sourceUrl || null,
      note: note || null,
      confidence: confidence || 'low'
    });
  }

  function findWeekOnSameLine(line) {
    const match = line.match(/(\d{1,2})\s*주차|week\s*(\d{1,2})/i);
    if (!match) return null;
    const week = Number(match[1] || match[2]);
    return Number.isFinite(week) && week >= 1 && week <= 18 ? week : null;
  }

  lines.forEach((line, idx) => {
    KEYWORD_RULES.forEach(rule => {
      if (!rule.pattern.test(line)) return;
      // Prefer a date on the SAME line as the keyword to avoid bleeding from neighbours.
      const sameLineDate = parseDate(line) || parseKoreanDate(line);
      if (sameLineDate) {
        addCandidate({
          ...rule,
          dueDate: sameLineDate,
          confidence: 'high',
          note: line.replace(/\s+/g, ' ').trim().slice(0, 100)
        });
        return;
      }
      const week = findWeekOnSameLine(line);
      if (week && semesterStart) {
        const start = new Date(semesterStart);
        start.setDate(start.getDate() + (week - 1) * 7);
        const dueDate = start.toISOString().slice(0, 10);
        addCandidate({ ...rule, dueDate, confidence: 'low', note: `${week}주차 (추정)` });
        return;
      }
      // Last resort: a date on the next line (e.g. "중간고사\n2026.04.20" layout).
      const next = lines[idx + 1] || '';
      const nextDate = parseDate(next) || parseKoreanDate(next);
      if (nextDate) {
        addCandidate({
          ...rule,
          dueDate: nextDate,
          confidence: 'high',
          note: `${line.trim().slice(0, 60)} / ${next.trim().slice(0, 40)}`
        });
      }
    });
  });

  return candidates;
}

async function fetchSyllabusExams({ baseUrl, sessionCookie, pages, db, admin, uid }) {
  if (!sessionCookie) return [];
  const urls = discoverSyllabusUrls(pages || [], baseUrl);
  if (!urls.length) return [];
  const out = [];
  for (const url of urls) {
    const docId = `${uid}_${hashUrl(url).slice(0, 32)}`;
    const ref = db.collection('eclass_syllabi').doc(docId);
    let cached = null;
    try {
      const snap = await ref.get();
      if (snap.exists) cached = snap.data();
    } catch (error) {}

    const ageMs = cached?.parsedAt?.toMillis ? Date.now() - cached.parsedAt.toMillis() : Infinity;
    let parsed = cached;
    if (!cached || ageMs > 24 * 60 * 60 * 1000) {
      try {
        const content = await fetchSyllabusContent(url, sessionCookie);
        if (!content.text || content.text.length < 50) {
          await ref.set({
            uid, sourceUrl: url,
            lastError: content.error || 'syllabus_no_text',
            parsedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          continue;
        }
        const exams = extractExamDates(content.text, { sourceUrl: url });
        parsed = {
          uid, sourceUrl: url,
          isPdf: content.isPdf,
          examCandidates: exams,
          lastError: null
        };
        await ref.set({
          ...parsed,
          parsedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        await ref.set({
          uid, sourceUrl: url,
          lastError: error.message || String(error),
          parsedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        continue;
      }
    }

    const exams = (parsed && parsed.examCandidates) || [];
    exams.forEach(exam => {
      const courseId = hashUrl(url).slice(0, 12);
      out.push({ ...exam, courseId, sourceUrl: exam.sourceUrl || url });
    });
  }
  return out;
}

module.exports = {
  fetchSyllabusExams,
  extractExamDates,
  discoverSyllabusUrls,
  fetchSyllabusContent,
  SEMESTER_STARTS,
  KEYWORD_RULES
};
