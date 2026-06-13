/* Planary — Shared components: Rail, Sidebar, Topbar, primitives */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function UserAvatar({ user = window.Planary.USER, size, className = "", style = {} }) {
  const avatar = user?.avatar;
  const isImage = avatar && typeof avatar === "string" && avatar.startsWith("url(");
  return (
    <div
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size ? Math.round(size * 0.38) : undefined,
        background: isImage ? `${avatar} center/cover no-repeat` : undefined,
        color: isImage ? "transparent" : undefined,
        ...style,
      }}
    >
      {!isImage && (user?.initials || "U")}
    </div>
  );
}

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
      <button className="rail-logo" onClick={onToggleSidebar} title="사이드바 토글">
        <img src="/redesign/assets/icons/planary-logo.png" alt="Planary" style={{ width: 24, height: 24, objectFit: "contain" }} />
      </button>
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
        <UserAvatar size={22} style={{ borderRadius: "var(--r-full)", border: "1px solid var(--border-soft)" }} />
        <span className="rail-tooltip">마이페이지</span>
      </button>
    </div>
  );
}

/* ---------- Sidebar (left, ~248px) ---------- */
function Sidebar({ page, setPage, taskFilter, setTaskFilter, tasks }) {
  const { PROJECTS, WIKI_TREE } = window.Planary;
  const [USER, setUSER] = useState(() => window.Planary.USER);
  const [projOpen, setProjOpen] = useState(true);
  const [favOpen, setFavOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem("planary.sidebar.favorites") || "null") || [
      { id: "f1", name: "디자인 시스템 핸드북", target: "wiki" },
      { id: "f2", name: "이번 주 마감 작업", target: "tasks" },
    ]; } catch (_) { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("planary.sidebar.favorites", JSON.stringify(favorites)); } catch (_) {}
  }, [favorites]);
  useEffect(() => {
    const syncUser = (event) => setUSER(event.detail || window.Planary.USER);
    window.addEventListener("planary:auth-changed", syncUser);
    return () => window.removeEventListener("planary:auth-changed", syncUser);
  }, []);

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

  const SectionHead = ({ label, open, setOpen, action, actionTitle }) => (
    <div
      className={`nav-section ${open ? "is-open" : "is-closed"}`}
      onClick={() => setOpen(!open)}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Icon
          name="chevronDown"
          size={10}
          style={{
            opacity: 0.6,
            transform: open ? "none" : "rotate(-90deg)",
            transition: "transform 200ms var(--ease-out)",
          }}
        />
        {label}
      </span>
      {action && (
        <button onClick={(e) => { e.stopPropagation(); action(); }} title={actionTitle || "새로 만들기"}>
          <Icon name="plus" size={11} />
        </button>
      )}
    </div>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="sidebar-context" onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ position: "relative" }}>
          <UserAvatar user={USER} size={36} className="sidebar-context-icon" />
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

      <div style={{ position: "relative", margin: "0 14px 8px" }}>
        <div className="sidebar-search" tabIndex={0}>
          <Icon name="search" size={14} />
          <input
            placeholder="빠른 검색…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setSearchOpen(false); e.target.blur(); }
              if (e.key === "Enter") {
                // Open command palette with current query
                setSearchOpen(false);
                window.Planary.toast?.({ type: "info", title: "검색은 명령 팔레트에서 더 강력해요", sub: "⌘K로 열어보세요" });
              }
            }}
          />
          {searchQuery ? (
            <button
              className="icon-btn"
              style={{ width: 18, height: 18, padding: 0 }}
              onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }}
              title="지우기"
            >
              <Icon name="x" size={10} />
            </button>
          ) : (
            <span className="kbd">⌘K</span>
          )}
        </div>
        {searchOpen && searchQuery && (
          <SidebarSearchResults
            query={searchQuery}
            tasks={tasks}
            onSelect={(target) => {
              setSearchOpen(false);
              setSearchQuery("");
              if (target.kind === "page") setPage(target.id);
              if (target.kind === "task") { setPage("tasks"); }
              if (target.kind === "project") { setPage("projects"); }
              if (target.kind === "wiki") setPage("wiki");
            }}
            onClose={() => setSearchOpen(false)}
          />
        )}
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
        {favOpen && favorites.length === 0 && (
          <div className="proj-row" style={{ color: "var(--text-faint)", cursor: "default", fontSize: 12 }}>
            <span style={{ width: 16, display: "grid", placeItems: "center" }}>
              <Icon name="star" size={11} />
            </span>
            <span style={{ flex: 1 }}>즐겨찾기가 비어있어요</span>
          </div>
        )}
        {favOpen && favorites.map((fav) => (
          <div
            key={fav.id}
            className="proj-row"
            onClick={() => setPage(fav.target || "wiki")}
            title={fav.name}
          >
            <button
              className="fav-star"
              onClick={(e) => {
                e.stopPropagation();
                setFavorites(prev => prev.filter(x => x.id !== fav.id));
                window.Planary.toast?.({ type: "ok", title: "즐겨찾기에서 제거됨", sub: fav.name });
              }}
              title="즐겨찾기에서 제거"
            >
              <Icon name="star" size={12} />
            </button>
            <span className="proj-name">{fav.name}</span>
          </div>
        ))}

        <SectionHead label="프로젝트" open={projOpen} setOpen={setProjOpen} action={() => { setProjOpen(true); setNewProjectOpen(true); }} actionTitle="새 프로젝트" />
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
        <UserAvatar user={USER} />
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
      {newProjectOpen && (
        <NewProjectDialog
          onClose={() => setNewProjectOpen(false)}
          onCreate={(proj) => {
            window.Planary.PROJECTS.push(proj);
            window.Planary.toast?.({ type: "ok", title: "프로젝트가 만들어졌어요", sub: proj.name });
            setNewProjectOpen(false);
            setPage("projects");
          }}
        />
      )}
    </aside>
  );
}

/* ---------- New Project Dialog ---------- */
function NewProjectDialog({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🚀");
  const [color, setColor] = useState("#7f0df2");
  const [deadline, setDeadline] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && name.trim()) submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name]);

  const ICONS_QUICK = ["🚀", "🎯", "✍️", "🔬", "📚", "💼", "🎨", "💡", "📊", "🌱", "🔥", "⭐"];
  const COLORS = [
    "#7f0df2", "#2563eb", "#10b981", "#f59e0b",
    "#e11d48", "#06b6d4", "#a855f7", "#475569",
  ];

  const submit = () => {
    if (!name.trim()) return;
    const id = "p" + Date.now();
    onCreate({
      id,
      name: name.trim(),
      color,
      icon,
      progress: 0,
      members: [window.Planary.USER.initials],
      deadline: deadline || null,
    });
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(500px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>새 프로젝트</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>작업·노트·리마인더가 함께 사는 공간을 만들어요</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          {/* Icon + name row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div
              style={{
                width: 52, height: 52,
                borderRadius: 14,
                background: color,
                display: "grid", placeItems: "center",
                fontSize: 26,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름"
              className="form-input"
              style={{ fontSize: 16, fontWeight: 700, height: 44, padding: "0 14px" }}
            />
          </div>

          {/* Icon picker */}
          <div style={{ marginBottom: 14 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>아이콘</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {ICONS_QUICK.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  style={{
                    width: 34, height: 34,
                    display: "grid", placeItems: "center",
                    borderRadius: 8,
                    fontSize: 18,
                    background: icon === e ? "var(--accent-soft)" : "var(--bg-elev)",
                    border: icon === e ? "1px solid var(--accent-ring)" : "1px solid var(--border-soft)",
                    cursor: "pointer",
                    transition: "all var(--dur-fast)",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div style={{ marginBottom: 14 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>색상</div>
            <div style={{ display: "flex", gap: 6 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: "50%",
                    background: c,
                    border: color === c ? "2px solid var(--text-hi)" : "2px solid transparent",
                    cursor: "pointer",
                    transition: "all var(--dur-fast)",
                    boxShadow: color === c ? "0 0 0 2px var(--bg)" : "none",
                  }}
                  aria-label={`색상 ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Deadline (optional) */}
          <div>
            <div className="kicker" style={{ marginBottom: 8 }}>마감일 (선택)</div>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            만들고 나면 좌측 사이드바에서 바로 확인할 수 있어요
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button
            className="btn btn-primary btn-sm"
            disabled={!name.trim()}
            onClick={submit}
          >
            <Icon name="plus" size={12} />만들기
            <span className="kbd" style={{ marginLeft: 4 }}>⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Top Bar ---------- */
function Topbar({ page, setPage, crumbs, right, onCommandPalette, theme, setTheme, pageActions, onTabletSidebarToggle }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const buildNotifications = (tasks = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = tomorrow.toISOString().slice(0, 10);
    return tasks
      .filter(t => !t.done && !t.archived && (t.dueDate || t.reminder))
      .map(t => {
        const dueDate = t.dueDate || null;
        const overdue = dueDate && dueDate < todayKey;
        const dueToday = dueDate === todayKey;
        const dueTomorrow = dueDate === tomorrowKey;
        let sub = "리마인더";
        if (overdue) sub = `${dueDate} · 지남`;
        else if (dueToday) sub = t.due ? `오늘 ${t.due}` : "오늘 마감";
        else if (dueTomorrow) sub = "내일 마감";
        else if (dueDate) sub = `${dueDate} 마감`;
        return {
          id: t.id,
          icon: overdue ? "bell" : (dueToday ? "zap" : "calendar"),
          iconColor: overdue ? "var(--err)" : (dueToday ? "var(--accent)" : "var(--warn)"),
          title: t.title || "제목 없는 작업",
          sub,
          unread: overdue || dueToday,
          page: "tasks"
        };
      })
      .sort((a, b) => Number(b.unread) - Number(a.unread))
      .slice(0, 8);
  };
  const [notifs, setNotifs] = useState(() => buildNotifications(window.Planary?.TASKS || []));
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = (event) => {
      const tasks = Array.isArray(event?.detail) ? event.detail : (window.Planary?.TASKS || []);
      setNotifs(buildNotifications(tasks));
    };
    window.addEventListener("planary:tasks-loaded", refresh);
    window.addEventListener("planary:tasks-changed-for-projects", refresh);
    refresh();
    return () => {
      window.removeEventListener("planary:tasks-loaded", refresh);
      window.removeEventListener("planary:tasks-changed-for-projects", refresh);
    };
  }, []);
  useEffect(() => {
    if (!window.PlanaryI18n) return;
    return window.PlanaryI18n.subscribe(() => setTick(n => n + 1));
  }, []);
  const LANGS = [
    { id: "ko", label: "한국어", flag: "🇰🇷" },
    { id: "en", label: "English", flag: "🇺🇸" },
    { id: "ja", label: "日本語", flag: "🇯🇵" },
    { id: "zh", label: "中文", flag: "🇨🇳" },
    { id: "es", label: "Español", flag: "🇪🇸" },
  ];
  const lang = window.PlanaryI18n?.getLang?.() || "ko";
  const currentLang = LANGS.find(l => l.id === lang) || LANGS[0];

  return (
    <div className="topbar" onClick={() => { setNotifOpen(false); setUserOpen(false); }}>
      {onTabletSidebarToggle && (
        <button
          className="btn btn-sm tablet-toggle"
          onClick={(e) => { e.stopPropagation(); onTabletSidebarToggle(); }}
          title="사이드바 토글"
          style={{ width: 32, padding: 0, justifyContent: "center", marginRight: 4 }}
        >
          <Icon name="menu" size={16} />
        </button>
      )}
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
            {notifs.some(n => n.unread) && <span className="bell-dot" />}
          </button>
          {notifOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={(e) => { e.stopPropagation(); setNotifOpen(false); }}
              />
              <div className="popover" style={{ top: "calc(100% + 6px)", right: 0, width: 320, zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "8px 12px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>알림</div>
                {notifs.length > 0 && (
                  <button
                    style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}
                    onClick={() => setNotifs(prev => prev.map(n => ({ ...n, unread: false })))}
                  >
                    모두 읽음으로
                  </button>
                )}
              </div>
              <div className="popover-sep" />
              {notifs.length === 0 ? (
                <div className="notif-empty">
                  <Icon name="bell" size={18} />
                  <div>새 알림이 없습니다</div>
                  <span>마감일이나 리마인더가 있는 작업이 생기면 여기에 표시됩니다.</span>
                </div>
              ) : notifs.map((n) => (
                <div
                  key={n.id}
                  className="popover-item"
                  style={{ alignItems: "start", padding: "8px 10px" }}
                  onClick={() => {
                    setNotifOpen(false);
                    if (n.page && setPage) setPage(n.page);
                  }}
                >
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
            </>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); setNotifOpen(false); setUserOpen(false); }}
            className="btn btn-sm"
            title="언어 / Language"
            style={{ width: 36, padding: 0, justifyContent: "center", fontSize: 16 }}
          >
            <span aria-hidden="true">{currentLang.flag}</span>
          </button>
          {langOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={(e) => { e.stopPropagation(); setLangOpen(false); }}
              />
              <div className="popover" style={{ top: "calc(100% + 6px)", right: 0, minWidth: 180, zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-faint)" }}>
                Language
              </div>
              {LANGS.map(l => (
                <button
                  key={l.id}
                  className={`popover-item ${lang === l.id ? "is-active" : ""}`}
                  onClick={() => {
                    window.PlanaryI18n?.setLang(l.id);
                    setLangOpen(false);
                    window.Planary.toast?.({ type: "ok", title: window.PlanaryI18n?.t("toast.langChanged") || "Language changed" });
                  }}
                  style={lang === l.id ? { background: "var(--accent-softer)", color: "var(--accent)" } : undefined}
                >
                  <span style={{ fontSize: 18 }}>{l.flag}</span>
                  <span style={{ flex: 1 }}>{l.label}</span>
                  {lang === l.id && <Icon name="check" size={12} stroke={3} />}
                </button>
              ))}
              </div>
            </>
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
            <UserAvatar user={window.Planary.USER} size={28} />
          </button>
          {userOpen && (
            <>
              <div
                style={{ position: "fixed", inset: 0, zIndex: 99 }}
                onClick={(e) => { e.stopPropagation(); setUserOpen(false); }}
              />
              <div className="popover" style={{ top: "calc(100% + 6px)", right: 0, minWidth: 220, zIndex: 100 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                <UserAvatar user={window.Planary.USER} size={34} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{window.Planary.USER.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{window.Planary.USER.email}</div>
                </div>
              </div>
              <div className="popover-sep" />
              <div className="popover-item" onClick={() => { setPage && setPage("profile"); setUserOpen(false); }}>
                <Icon name="user" size={14} />프로필
              </div>
              <div className="popover-item" onClick={() => { setPage && setPage("profile"); setUserOpen(false); window.Planary.toast?.({ type: "info", title: "설정 페이지로 이동했어요" }); }}>
                <Icon name="settings" size={14} />설정
              </div>
              <div className="popover-item" onClick={() => { setPage && setPage("profile"); setUserOpen(false); setTimeout(() => { document.querySelector(".card h3")?.closest(".card")?.scrollIntoView?.({ behavior: "smooth" }); window.Planary.toast?.({ type: "info", title: "알림 설정으로 이동했어요" }); }, 100); }}>
                <Icon name="bell" size={14} />알림 설정
              </div>
              <div className="popover-item" onClick={() => { setUserOpen(false); window.dispatchEvent(new CustomEvent("planary:open-guide")); }}>
                <Icon name="book" size={14} />사용자 가이드
              </div>
              <div className="popover-sep" />
              <div className="popover-item" onClick={() => { setShortcutsOpen(true); setUserOpen(false); }}>
                <Icon name="command" size={14} />단축키<span style={{ marginLeft: "auto" }} className="kbd">⌘/</span>
              </div>
              <div className="popover-sep" />
              <div className="popover-item" onClick={() => { setSwitchOpen(true); setUserOpen(false); }}>
                <Icon name="refresh" size={14} />계정 변경
                <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-faint)" }}>2</span>
              </div>
              <div className="popover-item is-danger" onClick={() => { setUserOpen(false); if (window.confirm("로그아웃 하시겠어요?")) window.Planary.toast?.({ type: "info", title: "곧 로그아웃됩니다…" }); }}>
                <Icon name="logout" size={14} />로그아웃
              </div>
              </div>
            </>
          )}
        </div>

        {right}
      </div>

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {switchOpen && <AccountSwitcherDialog onClose={() => setSwitchOpen(false)} />}
    </div>
  );
}

/* ---------- Account Switcher Dialog ---------- */
function AccountSwitcherDialog({ onClose }) {
  const me = window.Planary.USER;
  const [accounts, setAccounts] = useState([
    { id: "me", name: me.name, email: me.email, initials: me.initials, avatar: me.avatar, workspace: "개인 워크스페이스", active: true },
    { id: "team", name: "Planary Team", email: "team@planary.app", initials: "TM", workspace: "팀 워크스페이스", active: false, badge: "팀" },
  ]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const switchTo = (id) => {
    const target = accounts.find(a => a.id === id);
    if (!target || target.active) { onClose(); return; }
    setAccounts(prev => prev.map(a => ({ ...a, active: a.id === id })));
    window.Planary.toast?.({ type: "ok", title: `${target.name}로 전환됐어요`, sub: target.workspace });
    setTimeout(onClose, 500);
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>계정 변경</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>다른 계정으로 전환하거나 새 계정을 추가합니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "10px 14px 14px" }}>
          {accounts.map(a => (
            <button
              key={a.id}
              type="button"
              onClick={() => switchTo(a.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "10px 12px",
                background: a.active ? "var(--accent-softer)" : "transparent",
                border: a.active ? "1px solid var(--accent-ring)" : "1px solid transparent",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                transition: "all var(--dur-fast)",
                marginBottom: 4,
              }}
              onMouseEnter={(e) => { if (!a.active) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { if (!a.active) e.currentTarget.style.background = "transparent"; }}
            >
              <UserAvatar user={a} size={36} />
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                  {a.badge && <span className="chip" style={{ height: 18, fontSize: 9, padding: "0 6px" }}>{a.badge}</span>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{a.email}</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>{a.workspace}</div>
              </div>
              {a.active ? (
                <Icon name="check" size={14} stroke={3} style={{ color: "var(--accent)" }} />
              ) : (
                <Icon name="arrowRight" size={14} style={{ color: "var(--text-faint)" }} />
              )}
            </button>
          ))}
        </div>

        <div className="dialog-divider" />

        <div style={{ padding: "10px 14px 14px" }}>
          <button
            type="button"
            onClick={() => { onClose(); window.Planary.toast?.({ type: "info", title: "다른 계정으로 로그인", sub: "로그인 화면으로 이동합니다" }); }}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              width: "100%", padding: "10px 12px",
              borderRadius: "var(--r-md)",
              cursor: "pointer",
              background: "transparent",
              border: "1px dashed var(--border)",
              color: "var(--text-md)",
              transition: "all var(--dur-fast)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent-ring)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-md)"; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)", display: "grid", placeItems: "center" }}>
              <Icon name="plus" size={14} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>다른 계정 추가</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>이메일·Google·Apple로 로그인</div>
            </div>
          </button>
        </div>

        <div className="dialog-foot">
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>계정을 전환해도 다른 기기에는 영향이 없어요</span>
          <button className="btn btn-sm" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

window.Planary.AccountSwitcherDialog = AccountSwitcherDialog;

/* ---------- Shortcuts Help Dialog ---------- */
function ShortcutsDialog({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const groups = [
    {
      label: "탐색",
      items: [
        { keys: ["⌘", "K"], desc: "명령어 / 검색 열기" },
        { keys: ["G", "→", "H"], desc: "홈으로 이동" },
        { keys: ["G", "→", "T"], desc: "작업으로 이동" },
        { keys: ["G", "→", "W"], desc: "노트로 이동" },
      ],
    },
    {
      label: "작업",
      items: [
        { keys: ["N"], desc: "새 작업" },
        { keys: ["E"], desc: "선택한 작업 편집" },
        { keys: ["␣"], desc: "완료 / 미완료 토글" },
        { keys: ["⌫"], desc: "삭제" },
      ],
    },
    {
      label: "에디터",
      items: [
        { keys: ["/"], desc: "블록 메뉴 열기" },
        { keys: ["⌘", "B"], desc: "굵게" },
        { keys: ["⌘", "I"], desc: "기울임" },
        { keys: ["⌘", "↵"], desc: "변경사항 저장" },
      ],
    },
    {
      label: "전체",
      items: [
        { keys: ["⌘", "/"], desc: "단축키 안내 (이 창)" },
        { keys: ["⌘", "."], desc: "다크/라이트 전환" },
        { keys: ["Esc"], desc: "닫기" },
      ],
    },
  ];

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>키보드 단축키</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>빠르게 작업하기 위한 단축키 모음</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "10px 22px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {groups.map((g, gi) => (
            <div key={gi}>
              <div className="kicker" style={{ marginBottom: 8 }}>{g.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {g.items.map((it, ii) => (
                  <div key={ii} style={{ display: "flex", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--border-soft)" }}>
                    <span style={{ flex: 1, fontSize: 12, color: "var(--text-md)" }}>{it.desc}</span>
                    <span style={{ display: "inline-flex", gap: 3 }}>
                      {it.keys.map((k, ki) => (
                        <span key={ki} className="kbd" style={{ fontSize: 10, minWidth: 18, textAlign: "center" }}>{k}</span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="dialog-foot">
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>⌘ + / 로 언제든 열 수 있어요</span>
          <button className="btn btn-sm btn-primary" onClick={onClose}>확인</button>
        </div>
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
          <UserAvatar user={USER} />
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

function planaryTaskDateISO(task) {
  if (task.dueDate) return task.dueDate;
  const d = new Date();
  if (task.time && task.time.startsWith("오늘")) return d.toISOString().slice(0, 10);
  if (task.time === "내일") {
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function escapePlanaryIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toPlanaryIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function downloadTaskAppleCalendar(task) {
  const dueDate = planaryTaskDateISO(task);
  if (!dueDate) return;
  const startTime = task.due || "09:00";
  const start = new Date(`${dueDate}T${startTime}:00`);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const alarms = task.calendarReminderMinutes != null && Number.isFinite(Number(task.calendarReminderMinutes))
    ? [
      "BEGIN:VALARM",
      `TRIGGER:-PT${Number(task.calendarReminderMinutes)}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapePlanaryIcs(task.title)}`,
      "END:VALARM"
    ]
    : [];
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Planary//Task//EN",
    "BEGIN:VEVENT",
    `UID:${task.id || Date.now()}@planary`,
    `DTSTAMP:${toPlanaryIcsDate(new Date())}`,
    `DTSTART:${toPlanaryIcsDate(start)}`,
    `DTEND:${toPlanaryIcsDate(end)}`,
    `SUMMARY:${escapePlanaryIcs(task.title)}`,
    `DESCRIPTION:${escapePlanaryIcs(task.memo || "")}`,
    ...alarms,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${String(task.title || "planary-task").replace(/[\\/:*?"<>|]/g, "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  window.Planary.toast?.({ type: "ok", title: "Apple Calendar 파일을 만들었어요", sub: task.title });
}

/* ---------- Reusable: Task Card ---------- */
function TaskCard({ task, onToggle, projects, appleCalendarEnabled = false }) {
  const proj = projects.find(p => p.id === task.project);
  const prClass = task.priority === "high" ? "is-high" : task.priority === "med" ? "is-med" : "is-low";
  const canExportAppleCalendar = appleCalendarEnabled && !!planaryTaskDateISO(task);

  // Due date urgency
  const isOverdue = task.time === "어제" && !task.done;
  const isToday = task.time && task.time.startsWith("오늘");
  const isTomorrow = task.time === "내일";
  let timeClass = "";
  if (isOverdue) timeClass = "task-due-overdue";
  else if (isToday) timeClass = "task-due-today";
  else if (isTomorrow) timeClass = "task-due-tomorrow";

  return (
    <div
      className={`task ${task.done ? "is-done" : ""} ${isOverdue ? "is-overdue" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => window.dispatchEvent(new CustomEvent("planary:edit-task", { detail: task }))}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("planary:edit-task", { detail: task }));
        }
      }}
    >
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
          {task.imageUrl && (
            <span className="chip" style={{ background: "transparent", borderColor: "var(--border)" }}>
              <Icon name="image" size={11} />첨부 이미지
            </span>
          )}
          {task.priority === "high" && !task.done && !task.source && (
            <span className="chip chip-err"><Icon name="flag" size={10} />중요</span>
          )}
          {task.tags && task.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </div>
      <div className="task-right">
        {canExportAppleCalendar && (
          <button
            className="icon-btn"
            title="Apple Calendar에 추가"
            onClick={(e) => {
              e.stopPropagation();
              downloadTaskAppleCalendar(task);
            }}
          >
            <Icon name="calendar" size={13} />
          </button>
        )}
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
});

/* ---------- Sidebar Search Results dropdown ---------- */
function SidebarSearchResults({ query, tasks, onSelect, onClose }) {
  const q = query.toLowerCase().trim();
  const { PROJECTS, WIKI_TREE, NOTES } = window.Planary;
  const PAGES = [
    { id: "home", name: "홈", icon: "home" },
    { id: "tasks", name: "작업", icon: "check" },
    { id: "projects", name: "프로젝트", icon: "layers" },
    { id: "notes", name: "포스트잇", icon: "note" },
    { id: "wiki", name: "노트", icon: "book" },
    { id: "bookmarks", name: "북마크", icon: "bookmark" },
    { id: "archive", name: "보관함", icon: "archive" },
    { id: "profile", name: "마이페이지", icon: "user" },
  ];
  const matchPages = PAGES.filter((p) => p.name.toLowerCase().includes(q));
  const matchTasks = tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 5);
  const matchProjects = PROJECTS.filter((p) => p.name.toLowerCase().includes(q));
  const matchWiki = WIKI_TREE.filter((w) => w.title.toLowerCase().includes(q));
  const matchNotes = NOTES.filter((n) => n.text.toLowerCase().includes(q)).slice(0, 3);
  const total = matchPages.length + matchTasks.length + matchProjects.length + matchWiki.length + matchNotes.length;

  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest(".sidebar-search-results") && !e.target.closest(".sidebar-search")) onClose();
    };
    setTimeout(() => document.addEventListener("click", onClick), 0);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const NOTE_COLOR = { yellow: "#fef3c7", pink: "#fbcfe8", blue: "#bfdbfe", green: "#bbf7d0", purple: "#ddd6fe", orange: "#fed7aa", mint: "#99f6e4" };

  if (total === 0) {
    return (
      <div className="sidebar-search-results">
        <div className="sidebar-search-empty">
          "{query}"에 대한 결과가 없어요
          <div style={{ marginTop: 6, fontSize: 10 }}>다른 키워드로 시도해보세요</div>
        </div>
      </div>
    );
  }

  const Section = ({ label, items, render }) => items.length === 0 ? null : (
    <>
      <div className="sidebar-search-group-label">{label}</div>
      {items.map(render)}
    </>
  );

  return (
    <div className="sidebar-search-results">
      <Section label="페이지" items={matchPages} render={(p) => (
        <button key={p.id} type="button" className="sidebar-search-result"
          onClick={() => onSelect({ kind: "page", id: p.id })}>
          <Icon name={p.icon} size={13} className="sidebar-search-result-icon" />
          <span>{p.name}</span>
        </button>
      )} />
      <Section label={`작업 (${matchTasks.length})`} items={matchTasks} render={(t) => (
        <button key={t.id} type="button" className="sidebar-search-result"
          onClick={() => onSelect({ kind: "task", id: t.id })}>
          <Icon name="check" size={13} className="sidebar-search-result-icon" />
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
          {t.time && <span className="sidebar-search-result-meta">{t.time}</span>}
        </button>
      )} />
      <Section label="프로젝트" items={matchProjects} render={(p) => (
        <button key={p.id} type="button" className="sidebar-search-result"
          onClick={() => onSelect({ kind: "project", id: p.id })}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>{p.icon}</span>
          <span>{p.name}</span>
        </button>
      )} />
      <Section label="노트" items={matchWiki} render={(w) => (
        <button key={w.id} type="button" className="sidebar-search-result"
          onClick={() => onSelect({ kind: "wiki", id: w.id })}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>{w.icon}</span>
          <span>{w.title}</span>
        </button>
      )} />
      <Section label="포스트잇" items={matchNotes} render={(n) => (
        <button key={n.id} type="button" className="sidebar-search-result"
          onClick={() => onSelect({ kind: "notes", id: n.id })}>
          <span style={{ width: 13, height: 13, borderRadius: 3, background: NOTE_COLOR[n.color] }} className="sidebar-search-result-icon" />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.text.split("\n")[0].slice(0, 30)}</span>
        </button>
      )} />
    </div>
  );
}

/* ---------- Toast Host (mount once at app root) ---------- */
function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const onToast = (e) => {
      const t = e.detail || {};
      const id = "t" + Date.now() + Math.random().toString(36).slice(2, 6);
      setToasts(prev => [...prev, { id, title: t.title || "", sub: t.sub || "", type: t.type || "info", action: t.action || null, actionLabel: t.actionLabel || null, timer: null }]);
      const ttl = t.ttl || 3200;
      const timer = setTimeout(() => {
        if (t.onExpire) t.onExpire();
        setToasts(prev => prev.map(x => x.id === id ? { ...x, leaving: true } : x));
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 220);
      }, ttl);
      setToasts(prev => prev.map(x => x.id === id ? { ...x, timer } : x));
    };
    window.addEventListener("planary:toast", onToast);
    return () => window.removeEventListener("planary:toast", onToast);
  }, []);

  const dismiss = (id, runAction) => {
    setToasts(prev => {
      const t = prev.find(x => x.id === id);
      if (t && t.timer) clearTimeout(t.timer);
      if (runAction && t && t.action) { try { t.action(); } catch (err) { console.error("[ToastHost] action threw:", err); } }
      return prev.map(x => x.id === id ? { ...x, leaving: true } : x);
    });
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
            {t.action && t.actionLabel && (
              <button className="toast-action" onClick={() => dismiss(t.id, true)}>{t.actionLabel}</button>
            )}
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
        typeof m === "string"
          ? <div key={i} className="avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>{m}</div>
          : <UserAvatar key={i} user={m} size={size} />
      ))}
    </div>
  );
}

/* ---------- Reusable: Icon Picker ---------- */
const EMOJI_PICKS = [
  "📄","📃","📑","🎓","📚","📝","✏️","🚀","🎯","🔬","💡","📌","🗂️","📊","📈","💼",
  "💻","🎨","🖼️",
  "📷","🎬","🎵","🎮","⚽","🏃","🍱","☕","🌱","🌿","🌸","🌎","🔥","⚡","✨","💫",
  "📅","📆","⏰","⌛","🔔","💬","💭","📣","🎉","🎁","🏆","💪","❤️","🧠","👀","✅",
];

function IconPicker({ value, onChange, size = 56, color = "#7f0df2", onClose, anchor = "bottom-start" }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("emoji"); // emoji | upload | url
  const [urlDraft, setUrlDraft] = useState("");
  const [urlPreviewError, setUrlPreviewError] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const fileRef = useRef(null);
  const isImage = value && typeof value === "string" && value.startsWith("url(");
  const menuWidth = 280;

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const margin = 12;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || menuWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 360;
    const estimatedHeight = tab === "emoji" ? 314 : 260;
    const openAbove = rect.bottom + gap + estimatedHeight > viewportHeight && rect.top > estimatedHeight;
    const rawLeft = anchor.endsWith("end") ? rect.right - menuWidth : rect.left;
    setMenuPos({
      top: openAbove ? Math.max(margin, rect.top - gap - estimatedHeight) : Math.min(rect.bottom + gap, viewportHeight - margin),
      left: Math.min(Math.max(margin, rawLeft), Math.max(margin, viewportWidth - menuWidth - margin)),
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, tab, anchor]);

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

  const handleApplyUrl = () => {
    const u = urlDraft.trim();
    if (!u) return;
    onChange && onChange(`url("${u.replace(/"/g, '\\"')}")`);
    setUrlDraft("");
    setOpen(false);
  };

  const close = () => { setOpen(false); onClose && onClose(); };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={triggerRef}
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
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuWidth,
              maxWidth: "calc(100vw - 24px)",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-lg)",
              padding: 10,
              zIndex: 260,
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

            {tab === "url" && (
              <div style={{ padding: "4px 4px 8px" }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                  이미지 URL
                </label>
                <input
                  type="url"
                  autoFocus
                  value={urlDraft}
                  onChange={(e) => { setUrlDraft(e.target.value); setUrlPreviewError(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleApplyUrl(); }}
                  placeholder="https://example.com/icon.png"
                  className="form-input"
                  style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
                />
                {urlDraft.trim() && (
                  <div style={{
                    marginTop: 10,
                    padding: 12,
                    background: "var(--bg-elev)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "var(--r-sm)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 40, height: 40,
                      borderRadius: 8,
                      background: urlPreviewError ? "var(--surface-2)" : `url("${urlDraft.trim().replace(/"/g, '\\"')}") center/cover no-repeat, var(--surface-2)`,
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                      display: "grid", placeItems: "center",
                    }}>
                      {urlPreviewError && <Icon name="x" size={14} style={{ color: "var(--err)" }} />}
                      {/* Hidden img to detect load errors */}
                      <img
                        src={urlDraft.trim()}
                        alt=""
                        onError={() => setUrlPreviewError(true)}
                        onLoad={() => setUrlPreviewError(false)}
                        style={{ width: 0, height: 0, position: "absolute", opacity: 0 }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: urlPreviewError ? "var(--err)" : "var(--text-md)" }}>
                        {urlPreviewError ? "이미지를 불러올 수 없어요" : "미리보기"}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {urlDraft.trim()}
                      </div>
                    </div>
                  </div>
                )}
                <p style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.5 }}>
                  외부 이미지 URL을 직접 붙여넣어 아이콘으로 사용합니다. <code style={{ fontSize: 9 }}>https://</code>로 시작하는 직접 링크여야 해요.
                </p>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button type="button" className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setUrlDraft(""); setUrlPreviewError(false); }}>
                    지우기
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={handleApplyUrl}
                    disabled={!urlDraft.trim() || urlPreviewError}
                  >
                    <Icon name="check" size={11} stroke={3} />적용
                  </button>
                </div>
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


// Final exports — placed at the end so all function declarations are guaranteed defined.
window.Planary = Object.assign(window.Planary || {}, {
  Rail, Sidebar, Topbar, MobileBar, MobileTabs, MobileDrawer,
  TaskCard, UserAvatar, AvatarGroup, DatePicker, IconPicker, ToastHost,
  SidebarSearchResults, ShortcutsDialog, NewProjectDialog,
});
