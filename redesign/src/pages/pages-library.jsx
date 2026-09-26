/* ===========================================================
   BOOKMARKS
   =========================================================== */
function BookmarksPage() {
  const [bookmarks, setBookmarks] = useStateO(() => window.Planary.BOOKMARKS || []);
  const [query, setQuery] = useStateO("");
  const [active, setActive] = useStateO("전체");
  const [urlDraft, setUrlDraft] = useStateO("");
  const [tagDraft, setTagDraft] = useStateO("");

  // Live-sync bookmarks from firebase-bridge
  useEffectO(() => {
    const onLoaded = (e) => {
      if (Array.isArray(e.detail)) setBookmarks(e.detail);
    };
    window.addEventListener("planary:bookmarks-loaded", onLoaded);
    return () => window.removeEventListener("planary:bookmarks-loaded", onLoaded);
  }, []);

  const allTags = ["전체", ...new Set(bookmarks.flatMap((b) => Array.isArray(b.tags) ? b.tags : []))];
  const filtered = bookmarks.filter((b) =>
  (active === "전체" || (Array.isArray(b.tags) && b.tags.includes(active))) && (
  !query || b.title.toLowerCase().includes(query.toLowerCase()) || b.url.toLowerCase().includes(query.toLowerCase()) || (b.tags || []).some((tag) => tag.toLowerCase().includes(query.toLowerCase())))
  );
  const parseTags = (value) => [...new Set(String(value || "").split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))];

  const submitBookmark = () => {
    let url = urlDraft.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { new URL(url); } catch (_) {
      window.Planary?.toast?.({ type: "err", title: "유효한 URL이 아니에요", sub: "예: https://example.com" });
      return;
    }
    const tags = parseTags(tagDraft);
    window.dispatchEvent(new CustomEvent("planary:create-bookmark", {
      detail: { url, title: "", tags },
    }));
    setUrlDraft("");
    setTagDraft("");
    window.Planary.toast?.({ type: "ok", title: "북마크가 추가됐어요", sub: url });
  };
  const updateBookmarkTags = (bookmark, tags) => {
    const nextTags = [...new Set(tags.map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))];
    setBookmarks((prev) => prev.map((b) => b.id === bookmark.id ? { ...b, tags: nextTags } : b));
    window.dispatchEvent(new CustomEvent("planary:update-bookmark", {
      detail: { id: bookmark.id, patch: { tags: nextTags } },
    }));
  };
  const addBookmarkTag = (bookmark) => {
    const value = window.prompt("추가할 태그를 입력하세요", "");
    const tag = value && value.trim().replace(/^#/, "");
    if (!tag) return;
    updateBookmarkTags(bookmark, [...(bookmark.tags || []), tag]);
  };

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
        <div>
          <div className="hero-greet">WORKSPACE · 북마크</div>
          <div className="page-title">북마크</div>
          <div className="page-sub">{bookmarks.length}개 · 태그로 정리된 링크 모음</div>
        </div>
        <button className="btn btn-primary" onClick={submitBookmark}><Icon name="plus" size={14} />새 북마크</button>
      </div>

      <div className="composer bookmark-composer">
        <div className="composer-row">
          <Icon name="link" size={16} style={{ color: "var(--accent)" }} />
          <input
            className="composer-input"
            placeholder="URL 붙여넣기 — https://..."
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitBookmark(); }}
          />
          <button className="btn btn-sm btn-primary" onClick={submitBookmark}>저장</button>
        </div>
        <div className="composer-tools bookmark-tag-composer">
          <Icon name="hash" size={13} style={{ color: "var(--text-lo)" }} />
          <input
            className="composer-input"
            placeholder="태그 추가 — 디자인, 자료, 개발"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitBookmark(); }}
          />
        </div>
      </div>

      <div className="search-bar">
        <Icon name="search" size={14} />
        <input
          placeholder="제목, URL, 태그로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)} />
        
      </div>

      <div className="tag-filter-bar">
        <div className="tag-filter-label">
          <Icon name="filter" size={12} />
          <span>태그</span>
        </div>
        <div className="tag-filter-chips">
          {allTags.map((t) =>
          <button
            key={t}
            className={`tag-chip ${active === t ? "is-active" : ""}`}
            onClick={() => setActive(t)}>
            
              <span className="tag-chip-hash">{t === "전체" ? "" : "#"}</span>
              <span>{t}</span>
              <span className="tag-chip-count">{t === "전체" ? bookmarks.length : bookmarks.filter((b) => (b.tags || []).includes(t)).length}</span>
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty card">
          <div className="empty-icon"><Icon name="bookmark" size={24} /></div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{bookmarks.length === 0 ? "아직 북마크가 없어요" : "검색 결과가 없어요"}</div>
          <div style={{ fontSize: 12, color: "var(--text-lo)" }}>{bookmarks.length === 0 ? "URL 입력창에 주소를 붙여넣어 보세요" : "다른 태그나 검색어를 시도해보세요"}</div>
        </div>
      )}
      <div className="bookmarks-grid">
        {filtered.map((b) =>
        <div key={b.id} className="bookmark">
            <div className="bookmark-favicon" style={{ background: b.color }}>{b.letter}</div>
            <div className="bookmark-main">
              <div className="bookmark-title">{b.title}</div>
              <div className="bookmark-url">{b.url}</div>
              <div className="bookmark-tags">
                {(b.tags || []).map((t) => (
                  <button
                    key={t}
                    className="tag"
                    title="태그 제거"
                    onClick={() => updateBookmarkTags(b, (b.tags || []).filter((tag) => tag !== t))}
                  >
                    {t}
                  </button>
                ))}
                <button className="tag bookmark-tag-add" onClick={() => addBookmarkTag(b)} title="태그 추가">
                  <Icon name="plus" size={9} />추가
                </button>
              </div>
            </div>
            <button className="icon-btn" style={{ alignSelf: "start" }} onClick={() => window.open(b.url, "_blank", "noopener")}>
              <Icon name="arrowUpRight" size={14} />
            </button>
            <button
              className="icon-btn"
              style={{ alignSelf: "start", color: "var(--err)" }}
              title="삭제"
              onClick={() => {
                const deleted = b;
                setBookmarks((prev) => prev.filter((x) => x.id !== deleted.id));
                let undone = false;
                window.Planary?.toast?.({
                  type: "ok", title: "북마크가 삭제됐어요",
                  actionLabel: "실행취소", action: () => { undone = true; setBookmarks((prev) => [...prev, deleted]); },
                  onExpire: () => { if (!undone) window.dispatchEvent(new CustomEvent("planary:delete-bookmark", { detail: deleted.id })); },
                  ttl: 4000,
                });
              }}
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
        )}
      </div>
    </div>);

}

const ARCHIVE_QUOTES = [
  { text: "기록은 기억을 지배합니다. 오늘 적어둔 한 줄이 다음 달의 결정을 바꿉니다.", date: "2025. 09. 14 메모에서" },
  { text: "큰 변화는 작은 습관의 누적입니다. 매일 한 가지만, 꾸준히.", date: "2025. 07. 22 메모에서" },
  { text: "할 일 목록은 결심이 아니라 약속입니다. 미래의 나에게 보내는 편지.", date: "2025. 06. 03 메모에서" },
  { text: "완벽하게 시작하려고 기다리지 마세요. 시작하면 점점 더 잘하게 됩니다.", date: "2025. 05. 18 메모에서" },
  { text: "오늘 10분, 내일 10분. 한 주가 모이면 한 시간, 한 달이면 다섯 시간입니다.", date: "2025. 04. 02 메모에서" },
  { text: "계획은 길을 보여주지만, 실천은 길을 만들어요.", date: "2025. 02. 27 메모에서" },
  { text: "느린 발걸음도 멈추지만 않으면 결국 도착합니다.", date: "2025. 01. 11 메모에서" },
  { text: "쉬는 것도 일의 일부입니다. 좋은 결정은 충분히 회복된 마음에서 나와요.", date: "2024. 12. 14 메모에서" },
  { text: "어제의 나보다 1%만 더. 그게 1년이면 38배의 성장입니다.", date: "2024. 11. 03 메모에서" },
  { text: "지금 한 작업은 미래의 자유 시간입니다.", date: "2024. 09. 22 메모에서" },
];

function toDateKey(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString().slice(0, 10);
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  if (typeof value._seconds === "number") return new Date(value._seconds * 1000).toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
}

function archiveTaskActivityDateKey(task) {
  return toDateKey(task.completedAt || task.dueDate || task.due);
}

function buildArchiveTaskActivity(tasks, days = 371) {
  const countsByDate = new Map();
  tasks.filter(t => t.done).forEach(task => {
    const key = archiveTaskActivityDateKey(task);
    if (key) countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const counts = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    counts.push(countsByDate.get(d.toISOString().slice(0, 10)) || 0);
  }
  const levels = counts.map(count => Math.min(4, count));
  let currentStreak = 0;
  for (let i = counts.length - 1; i >= 0 && counts[i] > 0; i -= 1) currentStreak += 1;
  let longestStreak = 0;
  let run = 0;
  counts.forEach(count => {
    run = count > 0 ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  });
  return {
    counts,
    levels,
    currentStreak,
    longestStreak,
    activeDays: counts.filter(Boolean).length,
  };
}

/* ===========================================================
   ARCHIVE
   =========================================================== */
function ArchivePage({ tasks }) {
  const completed = tasks.filter((t) => t.done);
  const activity = buildArchiveTaskActivity(tasks);
  const heat = activity.levels;
  const [range, setRange] = useStateO("month"); // week | month | quarter | year | all
  const [archiveSearch, setArchiveSearch] = useStateO("");
  const [quoteIdx, setQuoteIdx] = useStateO(() => {
    // start with quote based on day-of-year so daily users see fresh quote
    const d = new Date();
    const day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return day % ARCHIVE_QUOTES.length;
  });

  useEffectO(() => {
    // Auto-rotate every 8s
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % ARCHIVE_QUOTES.length), 8000);
    return () => clearInterval(t);
  }, []);

  const quote = ARCHIVE_QUOTES[quoteIdx];

  // Compute month positions for label row based on starting from "1 year ago"
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - heat.length + 1);
  const monthLabels = [];
  let lastMonth = -1;
  for (let i = 0; i < heat.length; i += 7) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    if (d.getMonth() !== lastMonth) {
      monthLabels.push({ week: Math.floor(i / 7), month: d.getMonth() });
      lastMonth = d.getMonth();
    }
  }

  const filtered = completed.filter((t) => archiveSearch === "" || t.title.toLowerCase().includes(archiveSearch.toLowerCase()));

  const handleExport = () => {
    if (!filtered.length) { window.Planary.toast({ type: "warn", title: "내보낼 항목이 없어요" }); return; }
    const escape = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
    const header = ["제목", "완료일", "우선순위", "프로젝트", "메모"].map(escape).join(",");
    const rows = filtered.map(t => [t.title, toDateKey(t.completedAt) || "", t.priority || "", t.project || "", t.memo || ""].map(escape).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "planary-archive.csv"; a.click();
    URL.revokeObjectURL(url);
    window.Planary.toast({ type: "ok", title: "CSV 다운로드 완료", sub: `${filtered.length}개 항목` });
  };

  return (
    <div className="page-wide">
      <div className="page-head">
        <div className="kicker">WORKSPACE · 보관함</div>
        <div className="page-title">기록</div>
        <div className="page-sub">완료한 일과 지나온 시간</div>
      </div>

      <div className="archive-hero">
        <div className="archive-stat">
          <div className="archive-stat-big">{completed.length}</div>
          <div className="archive-stat-label">완료한 작업</div>
          <div style={{ marginTop: 22 }}>
            <div className="bar" style={{ height: 6 }}><span style={{ width: "68%" }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--text-lo)" }}>
              <span>이번 달 목표 50개</span>
              <span style={{ fontWeight: 600, color: "var(--text-md)" }}>34/50</span>
            </div>
          </div>
        </div>
        <div className="archive-stat">
          <div className="archive-stat-big" style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            {activity.currentStreak}<span style={{ fontSize: 18, color: "var(--accent)", fontWeight: 700 }}>일 연속</span>
          </div>
          <div className="archive-stat-label">최장 스트릭 {activity.longestStreak}일</div>
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 11, color: "var(--text-lo)" }}>이번 주</div>
            <div style={{ display: "flex", gap: 3, flex: 1 }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const v = heat[heat.length - 7 + i] || 0;
                return <div key={i} className={`heat-cell ${v ? `l${v}` : ""}`} style={{ flex: 1, height: 16, borderRadius: 3 }} />;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 1-year heatmap */}
      <div className="card" style={{ marginBottom: 18, padding: 22 }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 18, gap: 14 }}>
          <div>
            <div className="kicker">활동 히트맵</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", marginTop: 4 }}>지난 1년 · {activity.activeDays}일 활동</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 4 }}>매일 작업 1개 이상 완료한 날의 강도</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-faint)" }}>
            적게
            {[0, 1, 2, 3, 4].map((l) => <div key={l} className={`heat-cell ${l ? `l${l}` : ""}`} style={{ width: 11, height: 11, borderRadius: 3 }} />)}
            많이
          </div>
        </div>

        <div className="heat-year-wrap">
          <div className="heat-year-row">
            <div className="heat-year-days">
              <div /><div>월</div><div /><div>수</div><div /><div>금</div><div />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="heat-year-months">
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();d.setMonth(d.getMonth() - 11 + i);
                  return <div key={i}>{d.getMonth() + 1}월</div>;
                })}
              </div>
              <div className="heat-year">
                {heat.map((v, i) =>
                <div
                  key={i}
                  className={`heat-cell ${v ? `l${v}` : ""}`}
                  title={activity.counts[i] ? `${activity.counts[i]}개 완료` : "활동 없음"} />

                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, padding: 22, borderColor: "var(--accent-ring)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "start", gap: 16 }}>
          <Icon name="sparkles" size={22} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kicker">과거의 나로부터</div>
            <div key={quoteIdx} className="archive-quote-text">
              "{quote.text}"
            </div>
            <div style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span>{quote.date}</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span style={{ color: "var(--text-faint)" }}>{quoteIdx + 1} / {ARCHIVE_QUOTES.length}</span>
            </div>
            {/* Dot indicators */}
            <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
              {ARCHIVE_QUOTES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setQuoteIdx(i)}
                  aria-label={`인용 ${i + 1}`}
                  style={{
                    width: i === quoteIdx ? 18 : 6, height: 6,
                    borderRadius: 999,
                    background: i === quoteIdx ? "var(--accent)" : "var(--surface-2)",
                    border: 0,
                    cursor: "pointer",
                    transition: "all var(--dur-base) var(--ease-out)",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            <button
              className="icon-btn"
              title="이전"
              onClick={() => setQuoteIdx(i => (i - 1 + ARCHIVE_QUOTES.length) % ARCHIVE_QUOTES.length)}
            >
              <Icon name="chevronLeft" size={14} />
            </button>
            <button
              className="icon-btn"
              title="다음"
              onClick={() => setQuoteIdx(i => (i + 1) % ARCHIVE_QUOTES.length)}
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>완료된 작업</h3>
        <span style={{ fontSize: 12, color: "var(--text-lo)" }}>{filtered.length}개</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "inline-flex", padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-md)", gap: 1, border: "1px solid var(--border-soft)" }}>
          {[
          { id: "week", label: "이번 주" },
          { id: "month", label: "이번 달" },
          { id: "quarter", label: "분기" },
          { id: "year", label: "올해" },
          { id: "all", label: "전체" }].
          map((r) =>
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            type="button"
            style={{
              height: 26, padding: "0 10px",
              borderRadius: 4,
              fontSize: 11, fontWeight: 600,
              background: range === r.id ? "var(--surface)" : "transparent",
              color: range === r.id ? "var(--text-hi)" : "var(--text-lo)",
              boxShadow: range === r.id ? "var(--shadow-sm)" : "none",
              transition: "all var(--dur-fast)"
            }}>
            
              {r.label}
            </button>
          )}
        </div>
        <div className="search-bar" style={{ width: 200, marginBottom: 0, padding: "6px 10px" }}>
          <Icon name="search" size={13} />
          <input
            placeholder="검색"
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
            style={{ fontSize: 12 }} />
          
        </div>
        <button className="btn btn-sm btn-ghost" onClick={handleExport}>
          <Icon name="download" size={13} />CSV
        </button>
      </div>

      <div className="task-list">
        {filtered.length === 0 &&
        <div className="empty card">
            <div className="empty-icon"><Icon name="archive" size={24} /></div>
            {archiveSearch ? "검색 결과가 없어요." : "아직 완료된 작업이 없어요."}
          </div>
        }
        {filtered.map((t) => (
          <div key={t.id} className="archive-task-wrap">
            <window.Planary.TaskCard task={t} onToggle={(id) => window.dispatchEvent(new CustomEvent('planary:toggle-task', { detail: id }))} projects={window.Planary.PROJECTS} />
            <button
              className="archive-restore-btn"
              title="미완료로 복원"
              onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('planary:toggle-task', { detail: t.id })); }}
            >
              <Icon name="refresh" size={11} />복원
            </button>
          </div>
        ))}
      </div>
    </div>);

}

/* ===========================================================
   SHARE DIALOG
   =========================================================== */

window.Planary = Object.assign(window.Planary || {}, { BookmarksPage, ArchivePage });
