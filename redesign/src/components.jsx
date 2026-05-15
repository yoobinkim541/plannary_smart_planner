/* Planary — Shared components: Rail, Sidebar, Topbar, primitives */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- Icon Rail (left, 60px) ---------- */
function Rail({ page, setPage, onToggleSidebar }) {
  const items = [
    { id: "home",      icon: "home",     label: "홈" },
    { id: "tasks",     icon: "check",    label: "작업" },
    { id: "projects",  icon: "layers",   label: "프로젝트" },
    { id: "notes",     icon: "note",     label: "포스트잇" },
    { id: "wiki",      icon: "book",     label: "노트" },
    { id: "bookmarks", icon: "bookmark", label: "북마크" },
    { id: "archive",   icon: "archive",  label: "보관함" },
  ];
  return (
    <div className="rail">
      <button className="rail-logo" onClick={onToggleSidebar} title="사이드바 토글">P</button>
      <div style={{ height: 6 }} />
      {items.map(it => (
        <button
          key={it.id}
          className={`rail-btn ${page === it.id ? "is-active" : ""}`}
          onClick={() => setPage(it.id)}
        >
          <Icon name={it.icon} size={18} />
          <span className="rail-tooltip">{it.label}</span>
        </button>
      ))}
      <div className="rail-spacer" />
      <button className={`rail-btn ${page === "profile" ? "is-active" : ""}`} onClick={() => setPage("profile")}>
        <Icon name="user" size={18} />
        <span className="rail-tooltip">마이페이지</span>
      </button>
    </div>
  );
}

/* ---------- Sidebar (left, ~248px) ---------- */
function Sidebar({ page, setPage, taskFilter, setTaskFilter, tasks }) {
  const { PROJECTS, USER, WIKI_TREE } = window.Planary;
  const [projOpen, setProjOpen] = useState(true);
  const [favOpen, setFavOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const counts = useMemo(() => ({
    all: tasks.filter(t => !t.done).length,
    today: tasks.filter(t => !t.done && t.time && t.time.startsWith("오늘")).length,
    important: tasks.filter(t => !t.done && t.priority === "high").length,
    reminders: tasks.filter(t => !t.done && t.reminder).length,
    completed: tasks.filter(t => t.done).length,
  }), [tasks]);

  const NavLink = ({ id, label, icon, count, accent }) => (
    <div
      className={`nav-link ${page === id ? "is-active" : ""}`}
      onClick={() => setPage(id)}
    >
      <div className="nav-link-icon"><Icon name={icon} size={16} /></div>
      <div className="nav-link-label">{label}</div>
      {accent !== undefined && accent !== null && (
        <span className="status-dot" style={{ background: accent, width: 6, height: 6 }} />
      )}
      {count !== undefined && count !== null && <div className="nav-link-count">{count}</div>}
    </div>
  );

  const SubLink = ({ filter, label, count }) => (
    <div
      className={`nav-sub-link ${page === "tasks" && taskFilter === filter ? "is-active" : ""}`}
      onClick={() => { setPage("tasks"); setTaskFilter(filter); }}
    >
      <span className="nav-sub-dot" />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{count}</span>
    </div>
  );

  const SectionHead = ({ label, open, setOpen, action }) => (
    <div className="nav-section" onClick={() => setOpen(!open)} style={{ cursor: "pointer" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="chevronDown" size={10} style={{ opacity: 0.6, transform: open ? "none" : "rotate(-90deg)", transition: "transform 120ms" }} />
        {label}
      </span>
      {action && (
        <button onClick={(e) => { e.stopPropagation(); action(); }} title="새로 만들기">
          <Icon name="plus" size={11} />
        </button>
      )}
    </div>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-context" onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ position: "relative" }}>
          <div className="sidebar-context-icon">P</div>
          <div className="sidebar-context-meta">
            <div className="sidebar-context-title">Planary</div>
            <div className="sidebar-context-sub">{USER.name}님의 작업 공간</div>
          </div>
          <Icon name="chevronDown" size={14} style={{ color: "var(--text-lo)" }} />
          {userMenuOpen && (
            <div
              className="popover"
              style={{ top: "calc(100% + 4px)", left: 8, right: 8, minWidth: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popover-item"><Icon name="layers" size={14} /><span style={{ flex: 1 }}>개인 워크스페이스</span><Icon name="check" size={12} style={{ color: "var(--accent)" }} /></div>
              <div className="popover-item"><Icon name="layers" size={14} /><span>Team Planary</span></div>
              <div className="popover-sep" />
              <div className="popover-item"><Icon name="plus" size={14} />새 워크스페이스</div>
              <div className="popover-item"><Icon name="settings" size={14} />작업 공간 설정</div>
              <div className="popover-sep" />
              <div className="popover-item is-danger"><Icon name="logout" size={14} />로그아웃</div>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-search" tabIndex={0}>
        <Icon name="search" size={14} />
        <input placeholder="빠른 검색…" />
        <span className="kbd">⌘K</span>
      </div>

      <nav className="sidebar-nav" onClick={() => setUserMenuOpen(false)}>
        <NavLink id="home" icon="home" label="홈" />

        <NavLink id="tasks" icon="check" label="작업" count={counts.all} />
        {page === "tasks" && (
          <div className="nav-sub">
            <SubLink filter="all" label="전체" count={counts.all} />
            <SubLink filter="today" label="오늘" count={counts.today} />
            <SubLink filter="important" label="중요" count={counts.important} />
            <SubLink filter="reminders" label="리마인더" count={counts.reminders} />
            <SubLink filter="completed" label="완료됨" count={counts.completed} />
          </div>
        )}

        <NavLink id="notes" icon="note" label="포스트잇" count={window.Planary.NOTES.length} />
        <NavLink id="wiki" icon="book" label="노트" />
        <NavLink id="bookmarks" icon="bookmark" label="북마크" />
        <NavLink id="archive" icon="archive" label="보관함" />

        <SectionHead label="즐겨찾기" open={favOpen} setOpen={setFavOpen} />
        {favOpen && (
          <>
            <div className="proj-row" onClick={() => setPage("wiki")}>
              <span style={{ width: 16, display: "grid", placeItems: "center", color: "var(--text-lo)" }}>
                <Icon name="star" size={12} style={{ color: "var(--warn)", fill: "var(--warn)" }} />
              </span>
              <span className="proj-name">디자인 시스템 핸드북</span>
            </div>
            <div className="proj-row" onClick={() => setPage("tasks")}>
              <span style={{ width: 16, display: "grid", placeItems: "center", color: "var(--text-lo)" }}>
                <Icon name="star" size={12} style={{ color: "var(--warn)", fill: "var(--warn)" }} />
              </span>
              <span className="proj-name">이번 주 마감 작업</span>
            </div>
          </>
        )}

        <SectionHead label="프로젝트" open={projOpen} setOpen={setProjOpen} action={() => {}} />
        {projOpen && PROJECTS.map(p => (
          <div
            key={p.id}
            className="proj-row"
            onClick={() => setPage("projects")}
            title={p.isEclass ? `${p.school} e-Class · 마지막 동기화: ${p.lastSync}` : ""}
          >
            {p.isEclass ? (
              <span style={{ width: 8, height: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <span className="status-dot is-live" style={{ width: 7, height: 7, background: "var(--info)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--info) 20%, transparent)" }} />
              </span>
            ) : (
              <span className="proj-color" style={{ background: p.color }} />
            )}
            <span className="proj-name">{p.name}</span>
            {p.isEclass ? (
              <span style={{ fontSize: 10, color: "var(--info)", fontWeight: 600 }}>SYNC</span>
            ) : (
              <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600 }}>{p.progress}%</span>
            )}
          </div>
        ))}

        <SectionHead label="최근 문서" open={recentOpen} setOpen={setRecentOpen} />
        {recentOpen && WIKI_TREE.slice(0, 4).map(w => (
          <div key={w.id} className="proj-row" onClick={() => setPage("wiki")}>
            <span style={{ width: 16, display: "grid", placeItems: "center", fontSize: 12 }}>{w.icon}</span>
            <span className="proj-name">{w.title}</span>
          </div>
        ))}

        <div style={{ height: 16 }} />
      </nav>

      <div className="sidebar-foot">
        <div className="avatar">{USER.initials}</div>
        <div className="user-meta">
          <div className="user-name">{USER.name}</div>
          <div className="user-email" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="status-dot is-live" style={{ width: 6, height: 6 }} />
            온라인
          </div>
        </div>
        <button className="icon-btn" onClick={() => setPage("profile")} title="설정">
          <Icon name="settings" size={14} />
        </button>
      </div>
    </aside>
  );
}

/* ---------- Top Bar ---------- */
function Topbar({ page, crumbs, right, onCommandPalette, theme, setTheme, pageActions }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <div className="topbar" onClick={() => { setNotifOpen(false); setUserOpen(false); }}>
      <div className="crumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumb-sep"><Icon name="chevronRight" size={11} /></span>}
            <span className={`crumb-item ${i === crumbs.length - 1 ? "is-current" : ""}`}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div
        className="topbar-search"
        onClick={(e) => { e.stopPropagation(); onCommandPalette(); }}
        style={{ cursor: "text" }}
      >
        <Icon name="search" size={14} />
        <input readOnly placeholder="검색하거나 명령을 입력하세요…" style={{ cursor: "text" }} />
        <span className="kbd">⌘K</span>
      </div>

      <div className="topbar-divider" />

      <div className="topbar-actions">
        {pageActions}
        <div style={{ position: "relative" }}>
          <button
            className="btn btn-sm"
            onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); setUserOpen(false); }}
            title="알림"
            style={{ position: "relative", width: 32, padding: 0, justifyContent: "center" }}
          >
            <Icon name="bell" size={15} />
            <span className="bell-dot" />
          </button>
          {notifOpen && (
            <div className="popover" style={{ top: "calc(100% + 6px)", right: 0, width: 320 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "8px 12px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>알림</div>
                <button style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>모두 읽음으로</button>
              </div>
              <div className="popover-sep" />
              {[
                { icon: "bell", iconColor: "var(--accent)", title: "디자인 시스템 v3 토큰 정리", sub: "5분 전 · 리마인더", unread: true },
                { icon: "user", iconColor: "var(--info)", title: "박서연님이 노트를 수정했습니다", sub: "디자인 시스템 / 컬러 토큰 · 12분 전", unread: true },
                { icon: "check", iconColor: "var(--ok)", title: "랜딩 페이지 카피 2차 수정", sub: "완료됨 · 1시간 전", unread: false },
                { icon: "calendar", iconColor: "var(--warn)", title: "Q4 콘텐츠 캘린더 초안", sub: "내일 마감 · 마감 임박", unread: false },
              ].map((n, i) => (
                <div key={i} className="popover-item" style={{ alignItems: "start", padding: "8px 10px" }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--bg-elev)", display: "grid", placeItems: "center", flexShrink: 0, color: n.iconColor }}>
                    <Icon name={n.icon} size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 1 }}>{n.sub}</div>
                  </div>
                  {n.unread && <span style={{ width: 6, height: 6, background: "var(--accent)", borderRadius: "50%", flexShrink: 0, marginTop: 9 }} />}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="테마 전환"
          style={{ width: 32, padding: 0, justifyContent: "center" }}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={15} />
        </button>

        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setUserOpen(!userOpen); setNotifOpen(false); }}
            style={{ display: "flex", alignItems: "center", padding: 0, background: "transparent", border: 0 }}
          >
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{window.Planary.USER.initials}</div>
          </button>
          {userOpen && (
            <div className="popover" style={{ top: "calc(100% + 6px)", right: 0, minWidth: 220 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <div className="avatar" style={{ width: 34, height: 34 }}>{window.Planary.USER.initials}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{window.Planary.USER.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{window.Planary.USER.email}</div>
                </div>
              </div>
              <div className="popover-sep" />
              <div className="popover-item"><Icon name="user" size={14} />프로필</div>
              <div className="popover-item"><Icon name="settings" size={14} />설정</div>
              <div className="popover-item"><Icon name="bell" size={14} />알림 설정</div>
              <div className="popover-sep" />
              <div className="popover-item"><Icon name="command" size={14} />단축키<span style={{ marginLeft: "auto" }} className="kbd">⌘/</span></div>
              <div className="popover-item is-danger"><Icon name="logout" size={14} />로그아웃</div>
            </div>
          )}
        </div>

        {right}
      </div>
    </div>
  );
}

/* ---------- Mobile bar + bottom tabs ---------- */
function MobileBar({ page, onOpenDrawer, onSearch }) {
  const pageLabel = {
    home: "홈", tasks: "작업", projects: "프로젝트",
    notes: "포스트잇", wiki: "노트", bookmarks: "북마크",
    archive: "보관함", profile: "마이페이지",
  }[page] || "Planary";
  return (
    <div className="mobile-bar">
      <button className="icon-btn" onClick={onOpenDrawer} aria-label="메뉴 열기">
        <Icon name="menu" size={20} />
      </button>
      <div className="mobile-bar-title">{pageLabel}</div>
      <button className="icon-btn" onClick={onSearch} aria-label="검색"><Icon name="search" size={18} /></button>
    </div>
  );
}

function MobileTabs({ page, setPage }) {
  const items = [
    { id: "home",  icon: "home",  label: "홈" },
    { id: "tasks", icon: "check", label: "작업" },
    { id: "notes", icon: "note",  label: "포스트잇" },
    { id: "wiki",  icon: "book",  label: "노트" },
    { id: "profile", icon: "user", label: "나" },
  ];
  return (
    <div className="mobile-tabs">
      {items.map(it => (
        <button
          key={it.id}
          className={`mobile-tab ${page === it.id ? "is-active" : ""}`}
          onClick={() => setPage(it.id)}
        >
          <Icon name={it.icon} size={20} />
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Mobile Drawer (slides in with full nav) ---------- */
function MobileDrawer({ open, onClose, page, setPage, taskFilter, setTaskFilter, tasks }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const { PROJECTS, USER } = window.Planary;
  return (
    <>
      <div className={`drawer-scrim ${open ? "is-open" : ""}`} onClick={onClose} />
      <div className={`drawer ${open ? "is-open" : ""}`}>
        <div className="drawer-head">
          <div className="sidebar-context-icon">P</div>
          <div style={{ flex: 1 }}>
            <div className="sidebar-context-title">Planary</div>
            <div className="sidebar-context-sub">{USER.name}님</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <nav className="drawer-body">
          {[
            { id: "home", icon: "home", label: "홈" },
            { id: "tasks", icon: "check", label: "작업" },
            { id: "projects", icon: "layers", label: "프로젝트" },
            { id: "notes", icon: "note", label: "포스트잇" },
            { id: "wiki", icon: "book", label: "노트" },
            { id: "bookmarks", icon: "bookmark", label: "북마크" },
            { id: "archive", icon: "archive", label: "보관함" },
          ].map(it => (
            <div
              key={it.id}
              className={`nav-link ${page === it.id ? "is-active" : ""}`}
              onClick={() => { setPage(it.id); onClose(); }}
            >
              <div className="nav-link-icon"><Icon name={it.icon} size={16} /></div>
              <div className="nav-link-label">{it.label}</div>
            </div>
          ))}

          <div className="nav-section" style={{ paddingTop: 18 }}>프로젝트</div>
          {PROJECTS.map(p => (
            <div
              key={p.id}
              className="proj-row"
              onClick={() => { setPage("projects"); onClose(); }}
            >
              {p.isEclass ? (
                <span className="status-dot is-live" style={{ width: 7, height: 7, background: "var(--info)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--info) 20%, transparent)" }} />
              ) : (
                <span className="proj-color" style={{ background: p.color }} />
              )}
              <span className="proj-name">{p.name}</span>
              <span style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 600 }}>{p.isEclass ? "SYNC" : `${p.progress}%`}</span>
            </div>
          ))}
        </nav>
        <div className="drawer-foot">
          <div className="avatar">{USER.initials}</div>
          <div className="user-meta">
            <div className="user-name">{USER.name}</div>
            <div className="user-email">{USER.email}</div>
          </div>
          <button className="icon-btn" onClick={() => { setPage("profile"); onClose(); }}>
            <Icon name="settings" size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ---------- Reusable: Task Card ---------- */
function TaskCard({ task, onToggle, projects }) {
  const proj = projects.find(p => p.id === task.project);
  const prClass = task.priority === "high" ? "is-high" : task.priority === "med" ? "is-med" : "is-low";

  // Due date urgency
  const isOverdue = task.time === "어제" && !task.done;
  const isToday = task.time && task.time.startsWith("오늘");
  const isTomorrow = task.time === "내일";
  let timeClass = "";
  if (isOverdue) timeClass = "task-due-overdue";
  else if (isToday) timeClass = "task-due-today";
  else if (isTomorrow) timeClass = "task-due-tomorrow";

  return (
    <div className={`task ${task.done ? "is-done" : ""} ${isOverdue ? "is-overdue" : ""}`}>
      <div className={`task-priority-bar ${prClass}`} />
      <button
        className={`checkbox ${task.done ? "is-checked" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
      >
        {task.done && <Icon name="check" size={12} stroke={3} />}
      </button>
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        {task.memo && <div className="task-memo">{task.memo}</div>}
        <div className="task-meta">
          {task.time && (
            <span className="chip" style={{ background: "transparent", borderColor: "var(--border)" }}>
              <Icon name="clock" size={11} />
              <span className={timeClass}>{isOverdue ? `지연 · ${task.time}` : task.time}</span>
            </span>
          )}
          {task.source === "eclass" && (
            <span className="chip" style={{ background: "color-mix(in oklab, var(--info) 12%, transparent)", color: "var(--info)", borderColor: "transparent" }} title="서울과기대 e-Class에서 동기화됨">
              <Icon name="globe" size={10} />e-Class
            </span>
          )}
          {task.source === "eclass-exam" && (
            <span className="chip chip-err" title="시험 / 큰 일정 — e-Class 강의계획서">
              <Icon name="flag" size={10} />시험·발표
            </span>
          )}
          {task.course && (() => {
            const c = window.Planary.ECLASS_COURSES && window.Planary.ECLASS_COURSES.find(x => x.id === task.course);
            return c ? (
              <span className="chip" style={{ background: "transparent", borderColor: "var(--border)" }}>
                <span className="proj-color" style={{ background: c.color }} />{c.name}
              </span>
            ) : null;
          })()}
          {proj && !task.source && (
            <span className="chip" style={{ background: "transparent", borderColor: "var(--border)" }}>
              <span className="proj-color" style={{ background: proj.color }} />{proj.name}
            </span>
          )}
          {task.reminder && (
            <span className="chip chip-accent">
              <Icon name="bell" size={11} />리마인더
            </span>
          )}
          {task.priority === "high" && !task.done && !task.source && (
            <span className="chip chip-err"><Icon name="flag" size={10} />중요</span>
          )}
          {task.tags && task.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
      <div className="task-right">
        <button
          className="icon-btn"
          title="편집"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent("planary:edit-task", { detail: task }));
          }}
        >
          <Icon name="edit" size={13} />
        </button>
        <button className="icon-btn" title="더보기" onClick={(e) => e.stopPropagation()}><Icon name="more" size={14} /></button>
      </div>
    </div>
  );
}

window.Planary = Object.assign(window.Planary || {}, {
  Rail, Sidebar, Topbar, MobileBar, MobileTabs, MobileDrawer, TaskCard, AvatarGroup, DatePicker, IconPicker, ToastHost,
});

/* ---------- Toast Host (mount once at app root) ---------- */
function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail || {};
      const id = "t" + Date.now() + Math.random().toString(36).slice(2, 6);
      setToasts(prev => [...prev, { id, title: t.title || "", sub: t.sub || "", type: t.type || "info" }]);
      const ttl = t.ttl || 3200;
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === id ? { ...x, leaving: true } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 220);
      }, ttl);
    };
    window.addEventListener("planary:toast", onToast);
    return () => window.removeEventListener("planary:toast", onToast);
  }, []);

  const dismiss = (id) => {
    setToasts(prev => prev.map(x => x.id === id ? { ...x, leaving: true } : x));
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 220);
  };

  return (
    <div className="toast-stack">
      {toasts.map(t => {
        const icon = t.type === "ok" ? "check" : t.type === "err" ? "x" : "info";
        return (
          <div key={t.id} className={`toast ${t.type} ${t.leaving ? "is-out" : ""}`}>
            <div className="toast-icon"><Icon name={icon} size={12} stroke={3} /></div>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.sub && <div className="toast-sub">{t.sub}</div>}
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="닫기">
              <Icon name="x" size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Global helper — fire from anywhere: window.Planary.toast({title, sub, type:'ok'|'err'|'info', ttl})
window.Planary.toast = function (opts) {
  window.dispatchEvent(new CustomEvent("planary:toast", { detail: opts }));
};

/* ---------- Reusable: Avatar Group ---------- */
function AvatarGroup({ members = [], max = 3, size = 24 }) {
  const shown = members.slice(0, max);
  const more = members.length - shown.length;
  return (
    <div className="avatar-group" style={{ "--size": size }}>
      {more > 0 && <div className="avatar-group-more">+{more}</div>}
      {shown.map((m, i) => (
        <div key={i} className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
          {typeof m === "string" ? m : m.initials}
        </div>
      ))}
    </div>
  );
}

/* ---------- Reusable: Icon Picker ---------- */
const EMOJI_PICKS = [
  "🎓","📚","📝","✏️","🚀","🎯","🔬","💡","📌","🗂️","📊","📈","💼","💻","🎨","🖼️",
  "📷","🎬","🎵","🎮","⚽","🏃","🍱","☕","🌱","🌿","🌸","🌎","🔥","⚡","✨","💫",
  "📅","📆","⏰","⌛","🔔","💬","💭","📣","🎉","🎁","🏆","💪","❤️","🧠","👀","✅",
];

function IconPicker({ value, onChange, size = 56, color = "#7f0df2", onClose, anchor = "bottom-start" }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("emoji"); // emoji | upload
  const fileRef = useRef(null);
  const isImage = value && typeof value === "string" && value.startsWith("url(");

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange && onChange(`url("${reader.result}")`);
      setOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePickEmoji = (emoji) => {
    onChange && onChange(emoji);
    setOpen(false);
  };

  const close = () => { setOpen(false); onClose && onClose(); };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="아이콘 변경"
        style={{
          width: size, height: size,
          borderRadius: Math.round(size * 0.25),
          background: isImage ? `${value} center/cover no-repeat` : color,
          display: "grid", placeItems: "center",
          fontSize: Math.round(size * 0.5),
          border: "0",
          cursor: "pointer",
          transition: "transform var(--dur-fast)",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
      >
        {!isImage && value}
        <span
          style={{
            position: "absolute",
            bottom: 0, right: 0,
            width: 18, height: 18,
            borderRadius: "50%",
            background: "var(--surface)",
            border: "2px solid var(--surface)",
            display: "grid", placeItems: "center",
            color: "var(--text-md)",
            opacity: 0,
            transition: "opacity var(--dur-fast)",
            pointerEvents: "none",
            boxShadow: "var(--shadow-sm)",
          }}
          className="icon-picker-edit-hint"
        >
          <Icon name="edit" size={9} />
        </span>
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50 }}
            onClick={close}
          />
          <div
            style={{
              position: "absolute",
              top: `calc(100% + 8px)`,
              left: 0,
              width: 280,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: 10,
              zIndex: 51,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />

            <div style={{ display: "flex", gap: 4, marginBottom: 10, padding: 3, background: "var(--bg-elev)", borderRadius: "var(--r-sm)" }}>
              <button
                type="button"
                onClick={() => setTab("emoji")}
                style={{
                  flex: 1, height: 26, borderRadius: 4,
                  fontSize: 11, fontWeight: 600,
                  background: tab === "emoji" ? "var(--surface)" : "transparent",
                  color: tab === "emoji" ? "var(--text-hi)" : "var(--text-lo)",
                  boxShadow: tab === "emoji" ? "var(--shadow-sm)" : "none",
                }}
              >
                <Icon name="smile" size={11} style={{ marginRight: 4, verticalAlign: -2 }} />이모지
              </button>
              <button
                type="button"
                onClick={() => setTab("upload")}
                style={{
                  flex: 1, height: 26, borderRadius: 4,
                  fontSize: 11, fontWeight: 600,
                  background: tab === "upload" ? "var(--surface)" : "transparent",
                  color: tab === "upload" ? "var(--text-hi)" : "var(--text-lo)",
                  boxShadow: tab === "upload" ? "var(--shadow-sm)" : "none",
                }}
              >
                <Icon name="image" size={11} style={{ marginRight: 4, verticalAlign: -2 }} />업로드
              </button>
            </div>

            {tab === "emoji" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2, maxHeight: 240, overflowY: "auto" }}>
                {EMOJI_PICKS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handlePickEmoji(e)}
                    style={{
                      height: 30, width: 30,
                      display: "grid", placeItems: "center",
                      fontSize: 17,
                      borderRadius: 6,
                      transition: "background var(--dur-fast)",
                    }}
                    onMouseEnter={(ev) => ev.currentTarget.style.background = "var(--hover)"}
                    onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}
                  >{e}</button>
                ))}
              </div>
            )}

            {tab === "upload" && (
              <div style={{ padding: "8px 4px" }}>
                <button
                  type="button"
                  onClick={() => fileRef.current && fileRef.current.click()}
                  style={{
                    width: "100%",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--r-md)",
                    padding: "22px 14px",
                    background: "var(--bg-elev)",
                    color: "var(--text-md)",
                    cursor: "pointer",
                    transition: "all var(--dur-fast)",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-softer)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elev)"; }}
                >
                  <Icon name="image" size={20} style={{ color: "var(--text-lo)", marginBottom: 8 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>이미지 업로드</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 4 }}>PNG · JPG · WebP · 정사각형 권장</div>
                </button>
                {isImage && (
                  <button
                    type="button"
                    onClick={() => { onChange(EMOJI_PICKS[0]); setOpen(false); }}
                    className="btn btn-sm"
                    style={{ marginTop: 8, color: "var(--err)", width: "100%", justifyContent: "center" }}
                  >
                    <Icon name="trash" size={11} />이미지 제거
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Reusable: Date Picker ---------- */
function DatePicker({ value, onChange, onClose }) {
  const initial = value instanceof Date ? value : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-11
  const today = new Date(); today.setHours(0,0,0,0);
  const selected = value instanceof Date ? new Date(value.getFullYear(), value.getMonth(), value.getDate()) : null;

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Previous month tail
  const prevLast = new Date(viewYear, viewMonth, 0).getDate();
  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: prevLast - i, otherMonth: true, date: new Date(viewYear, viewMonth - 1, prevLast - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, otherMonth: false, date: new Date(viewYear, viewMonth, d) });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const overflow = cells.length - startOffset - daysInMonth + 1;
    cells.push({ day: overflow, otherMonth: true, date: new Date(viewYear, viewMonth + 1, overflow) });
    if (cells.length >= 42) break;
  }

  const monthName = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(viewYear, viewMonth, 1));

  const sameDay = (a, b) => a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const pick = (d) => { onChange && onChange(d); };
  const nav = (delta) => {
    const m = viewMonth + delta;
    const y = viewYear + Math.floor(m / 12);
    const mm = ((m % 12) + 12) % 12;
    setViewYear(y); setViewMonth(mm);
  };

  const presets = [
    { label: "오늘",  date: new Date() },
    { label: "내일",  date: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })() },
    { label: "다음 주 월요일", date: (() => { const d = new Date(); const off = ((1 - d.getDay()) + 7) % 7 || 7; d.setDate(d.getDate() + off); return d; })() },
    { label: "다음 주말", date: (() => { const d = new Date(); const off = ((6 - d.getDay()) + 7) % 7 || 7; d.setDate(d.getDate() + off); return d; })() },
  ];

  return (
    <div className="datepicker" onClick={(e) => e.stopPropagation()}>
      <div className="datepicker-head">
        <button className="icon-btn" onClick={() => nav(-1)} title="이전 달"><Icon name="chevronLeft" size={14} /></button>
        <div className="datepicker-month">{monthName}</div>
        <button className="icon-btn" onClick={() => nav(1)} title="다음 달"><Icon name="chevronRight" size={14} /></button>
      </div>
      <div className="datepicker-presets">
        {presets.map(p => (
          <button key={p.label} className="datepicker-preset" onClick={() => pick(p.date)} type="button">
            {p.label}
          </button>
        ))}
      </div>
      <div className="datepicker-grid">
        {["일","월","화","수","목","금","토"].map(d => (
          <div key={d} className="datepicker-dow">{d}</div>
        ))}
        {cells.map((c, i) => {
          const isToday = sameDay(c.date, today);
          const isSelected = sameDay(c.date, selected);
          const dow = c.date.getDay();
          return (
            <button
              key={i}
              className={`datepicker-cell ${c.otherMonth ? "is-other" : ""} ${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""}`}
              style={dow === 0 ? { color: "var(--err)" } : undefined}
              onClick={() => pick(c.date)}
              type="button"
            >
              {c.day}
            </button>
          );
        })}
      </div>
      <div className="datepicker-foot">
        <button className="btn btn-sm" onClick={() => pick(null)} type="button">날짜 제거</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={onClose} type="button">닫기</button>
      </div>
    </div>
  );
}
