/* Planary — App root + Tweaks panel wiring */

const { useState, useEffect, useMemo } = React;
const { Rail, Sidebar, Topbar, MobileBar, MobileTabs,
        HomePage, TasksPage, ProjectsPage, NotesPage,
        WikiPage, BookmarksPage, ArchivePage, ProfilePage } = window.Planary;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "violet",
  "font": "nanum-gothic",
  "radius": 12,
  "sidebar": "full",
  "variant": "balanced",
  "density": "regular",
  "lang": "ko"
}/*EDITMODE-END*/;

const ACCENT_PALETTE = {
  violet:  ["#7f0df2", "#9b3ff7", "#5a06b0"],
  blue:    ["#2563eb", "#3b82f6", "#1d4ed8"],
  emerald: ["#10b981", "#34d399", "#047857"],
  amber:   ["#f59e0b", "#fbbf24", "#b45309"],
  rose:    ["#e11d48", "#f43f5e", "#9f1239"],
  slate:   ["#475569", "#64748b", "#1e293b"],
};

const PAGE_CRUMBS = {
  home:      ["Planary", "홈"],
  tasks:     ["Planary", "작업"],
  projects:  ["Planary", "프로젝트"],
  notes:     ["Planary", "포스트잇"],
  wiki:      ["Planary", "노트", "디자인 시스템"],
  bookmarks: ["Planary", "북마크"],
  archive:   ["Planary", "보관함"],
  profile:   ["Planary", "마이페이지"],
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  // Re-render the whole tree when the language changes so any `t()` calls
  // refresh and the DOM translator gets a fresh pass.
  const [, _bumpLang] = useState(0);
  useEffect(() => {
    if (!window.PlanaryI18n) return;
    const unsub = window.PlanaryI18n.subscribe(() => _bumpLang(n => n + 1));
    return unsub;
  }, []);
  // Start the phrase-level DOM translator once, on the React root.
  useEffect(() => {
    const root = document.getElementById("root") || document.body;
    window.PlanaryI18n?.startDomTranslator?.(root);
  }, []);
  const [page, setPage] = useState("home");
  const [tasks, setTasks] = useState(window.Planary.TASKS);
  const [taskFilter, setTaskFilter] = useState("all");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusModeTask, setFocusModeTask] = useState(null);
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);
  // Onboarding: open by default unless user has finished it before
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.__planaryForceOnboarding) return true;
    try { return !localStorage.getItem("planary.onboarding.done"); } catch (_) { return true; }
  });
  const [guideOpen, setGuideOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authedUser, setAuthedUser] = useState(null);
  const [appleCalendarEnabled, setAppleCalendarEnabled] = useState(false);

  // Persist tweak edits to Firestore (no-op when bridge isn't loaded)
  const saveTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === "object" && keyOrEdits !== null ? keyOrEdits : { [keyOrEdits]: val };
    setTweak(edits);
    window.Planary?.api?.savePreferences?.(edits).catch(err => console.error("[Planary] savePreferences failed:", err));
  }, [setTweak]);

  // Auth gate — listen for bridge events. If Firebase isn't loaded the
  // bridge stays silent and the prototype keeps running on mock data.
  useEffect(() => {
    let alive = true;
    const onAuth = (e) => {
      if (!alive) return;
      setAuthedUser(e.detail);
      setAuthChecked(true);
      if (!e.detail) {
        if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
          window.location.replace("/landing.html");
        }
      }
    };
    window.addEventListener("planary:auth-changed", onAuth);
    const fallback = setTimeout(() => { if (alive && !authChecked) setAuthChecked(true); }, 1500);
    return () => { alive = false; window.removeEventListener("planary:auth-changed", onAuth); clearTimeout(fallback); };
  }, []);

  // Firestore data → state
  useEffect(() => {
    const onTasks = (e) => setTasks(e.detail || []);
    window.addEventListener("planary:tasks-loaded", onTasks);
    return () => window.removeEventListener("planary:tasks-loaded", onTasks);
  }, []);

  useEffect(() => {
    const onUserDoc = (e) => {
      const doc = e.detail || {};
      const prefs = doc.preferences;
      if (prefs && typeof prefs === "object") {
        setTweak(Object.fromEntries(Object.entries(prefs).filter(([, v]) => v !== undefined)));
        if (prefs.lang) window.PlanaryI18n?.setLang?.(prefs.lang);
      }
      if (doc.notifPrefs && typeof doc.notifPrefs === "object") {
        setAppleCalendarEnabled(doc.notifPrefs.apple === true);
      }
      // Sync onboarding-completed flag from Firestore → localStorage so the
      // prompt doesn't reappear for returning users.
      if (doc.onboardingCompleted) {
        try { localStorage.setItem("planary.onboarding.done", "1"); } catch (_) {}
        setOnboardingOpen(false);
      }
    };
    window.addEventListener("planary:user-doc-loaded", onUserDoc);
    return () => window.removeEventListener("planary:user-doc-loaded", onUserDoc);
  }, [setTweak]);

  // Apply tweaks to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
    document.documentElement.setAttribute("data-accent", t.accent);
    document.documentElement.setAttribute("data-font", t.font);
    document.documentElement.style.setProperty("--r-base", `${t.radius}px`);
  }, [t.theme, t.accent, t.font, t.radius]);

  // Keyboard: ⌘K — command palette; G+letter — go to page
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("planary:open-shortcuts"));
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        saveTweak("theme", t.theme === "dark" ? "light" : "dark");
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [t.theme, saveTweak]);

  // Listen for "edit this task" requests from TaskCard buttons throughout the app
  useEffect(() => {
    const onEdit = (e) => setEditingTask(e.detail);
    const onToggle = (e) => setTasks(prev => prev.map(t => t.id === e.detail ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : null } : t));
    const onShortcuts = () => setShortcutsOpen(true);
    const onOpenGuide = () => setGuideOpen(true);
    const onOpenOnboarding = () => setOnboardingOpen(true);
    const onNotifPrefsChanged = (e) => {
      const patch = e.detail || {};
      if (Object.prototype.hasOwnProperty.call(patch, "apple")) setAppleCalendarEnabled(patch.apple === true);
    };
    const onPostpone = (e) => {
      const { id, time } = e.detail || {};
      setTasks(prev => prev.map(t => t.id === id ? { ...t, time } : t));
    };
    const onDeleteTask = (e) => setTasks(prev => prev.filter(t => t.id !== e.detail));
    const onArchiveTask = (e) => setTasks(prev => prev.map(t => t.id === e.detail ? { ...t, archived: true } : t));
    const onUnarchiveTask = (e) => setTasks(prev => prev.map(t => t.id === e.detail ? { ...t, archived: false } : t));
    const onEnterFocus = (e) => setFocusModeTask(e.detail);
    const onCreateTask = (e) => setTasks(prev => [e.detail, ...prev]);
    window.addEventListener("planary:edit-task", onEdit);
    window.addEventListener("planary:toggle-task", onToggle);
    window.addEventListener("planary:open-shortcuts", onShortcuts);
    window.addEventListener("planary:open-guide", onOpenGuide);
    window.addEventListener("planary:open-onboarding", onOpenOnboarding);
    window.addEventListener("planary:postpone-task", onPostpone);
    window.addEventListener("planary:delete-task", onDeleteTask);
    window.addEventListener("planary:archive-task", onArchiveTask);
    window.addEventListener("planary:unarchive-task", onUnarchiveTask);
    window.addEventListener("planary:enter-focus-mode", onEnterFocus);
    window.addEventListener("planary:create-task", onCreateTask);
    window.addEventListener("planary:notif-prefs-changed", onNotifPrefsChanged);
    return () => {
      window.removeEventListener("planary:edit-task", onEdit);
      window.removeEventListener("planary:toggle-task", onToggle);
      window.removeEventListener("planary:open-shortcuts", onShortcuts);
      window.removeEventListener("planary:open-guide", onOpenGuide);
      window.removeEventListener("planary:open-onboarding", onOpenOnboarding);
      window.removeEventListener("planary:postpone-task", onPostpone);
      window.removeEventListener("planary:delete-task", onDeleteTask);
      window.removeEventListener("planary:archive-task", onArchiveTask);
      window.removeEventListener("planary:unarchive-task", onUnarchiveTask);
      window.removeEventListener("planary:enter-focus-mode", onEnterFocus);
      window.removeEventListener("planary:create-task", onCreateTask);
      window.removeEventListener("planary:notif-prefs-changed", onNotifPrefsChanged);
    };
  }, []);

  const saveTask = (draft) => {
    setTasks(prev => prev.map(t => t.id === draft.id ? draft : t));
    setEditingTask(null);
    window.dispatchEvent(new CustomEvent("planary:save-task", { detail: draft }));
    window.Planary.toast({ type: "ok", title: "변경사항이 저장됐어요" });
  };
  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setEditingTask(null);
    window.dispatchEvent(new CustomEvent("planary:delete-task", { detail: id }));
    window.Planary.toast({ type: "ok", title: "작업이 삭제됐어요" });
  };
  const visibleTasks = tasks.filter(t => !t.archived);

  const renderPage = () => {
    switch (page) {
      case "home":      return <HomePage tasks={visibleTasks} setTasks={setTasks} variant={t.variant} setPage={setPage} setTaskFilter={setTaskFilter} />;
      case "tasks":     return <TasksPage tasks={visibleTasks} setTasks={setTasks} taskFilter={taskFilter} setTaskFilter={setTaskFilter} variant={t.variant} appleCalendarEnabled={appleCalendarEnabled} />;
      case "projects":  return <ProjectsPage tasks={visibleTasks} setTasks={setTasks} setPage={setPage} setTaskFilter={setTaskFilter} />;
      case "notes":     return <NotesPage />;
      case "wiki":      return <WikiPage />;
      case "bookmarks": return <BookmarksPage />;
      case "archive":   return <ArchivePage tasks={tasks} />;
      case "profile":   return <ProfilePage tasks={visibleTasks} t={t} setTweak={saveTweak} />;
      default:          return null;
    }
  };

  return (
    <div
      className={`app-shell ${tabletSidebarOpen ? "tablet-sidebar-open" : ""}`}
      data-sidebar={t.sidebar}
      data-density={t.density}
    >
      <window.Planary.Rail page={page} setPage={setPage}
        onToggleSidebar={() => saveTweak("sidebar", t.sidebar === "full" ? "icons" : "full")} />
      <window.Planary.Sidebar
        page={page} setPage={(p) => { setPage(p); setTabletSidebarOpen(false); }}
        taskFilter={taskFilter} setTaskFilter={(f) => { setTaskFilter(f); setTabletSidebarOpen(false); }}
        tasks={visibleTasks}
      />
      {tabletSidebarOpen && (
        <div className="tablet-sidebar-scrim" onClick={() => setTabletSidebarOpen(false)} />
      )}
      <div className="main">
        <window.Planary.MobileBar
          page={page}
          onOpenDrawer={() => setDrawerOpen(true)}
          onSearch={() => setPaletteOpen(true)}
        />
        <window.Planary.Topbar
          page={page}
          setPage={setPage}
          crumbs={PAGE_CRUMBS[page] || []}
          onCommandPalette={() => setPaletteOpen(true)}
          theme={t.theme}
          setTheme={(v) => saveTweak("theme", v)}
          onTabletSidebarToggle={() => setTabletSidebarOpen(o => !o)}
        />
        <div className="page">{renderPage()}</div>
      </div>
      <window.Planary.MobileTabs page={page} setPage={setPage} />
      <window.Planary.MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        page={page}
        setPage={setPage}
        taskFilter={taskFilter}
        setTaskFilter={setTaskFilter}
        tasks={visibleTasks}
      />

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} setPage={setPage} />}

      {editingTask && (
        <window.Planary.TaskEditDialog
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={saveTask}
          onDelete={deleteTask}
        />
      )}

      <window.Planary.ToastHost />

      {onboardingOpen && window.Planary.OnboardingFlow && (
        <window.Planary.OnboardingFlow
          onComplete={() => {
            setOnboardingOpen(false);
            try { localStorage.setItem("planary.onboarding.done", "1"); } catch (_) {}
            window.Planary?.api?.saveOnboarding?.({ completed: true }).catch(err => console.error("[Planary] saveOnboarding failed:", err));
            setTimeout(() => setGuideOpen(true), 500);
          }}
        />
      )}

      {guideOpen && window.Planary.UserGuide && (
        <window.Planary.UserGuide onClose={() => setGuideOpen(false)} setPage={setPage} currentPage={page} />
      )}

      <PlanaryTweaks t={t} setTweak={saveTweak} />
    </div>
  );
}

/* ---------- Tweaks panel ---------- */
function PlanaryTweaks({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Variation" />
      <TweakRadio
        label="레이아웃"
        value={t.variant}
        options={["conservative", "balanced", "bold"]}
        onChange={(v) => setTweak("variant", v)}
      />
      <div style={{ fontSize: 10, color: "rgba(41,38,27,0.5)", marginTop: -4, marginBottom: 4 }}>
        {t.variant === "conservative" && "정돈된 stat row + 클래식 위젯"}
        {t.variant === "balanced"     && "히어로 + 그리드 위젯 + 메모/리마인더"}
        {t.variant === "bold"         && "오늘의 한 줄 + 타임라인 + 스트릭"}
      </div>

      <TweakSection label="Appearance" />
      <TweakRadio
        label="테마"
        value={t.theme}
        options={["dark", "light"]}
        onChange={(v) => setTweak("theme", v)}
      />
      <TweakColor
        label="악센트"
        value={ACCENT_PALETTE[t.accent]}
        options={Object.values(ACCENT_PALETTE)}
        onChange={(v) => {
          const key = Object.keys(ACCENT_PALETTE).find(k => ACCENT_PALETTE[k][0] === v[0]) || "violet";
          setTweak("accent", key);
        }}
      />
      <TweakSelect
        label="글꼴"
        value={t.font}
        options={[
          { value: "nanum-gothic", label: "Nanum Gothic" },
          { value: "nanum-myeongjo", label: "Nanum Myeongjo" },
          { value: "jakarta",    label: "Plus Jakarta Sans" },
          { value: "pretendard", label: "Pretendard" },
          { value: "inter",      label: "Inter" },
        ]}
        onChange={(v) => setTweak("font", v)}
      />
      <TweakSlider
        label="모서리 곡률"
        value={t.radius}
        min={4} max={20} unit="px"
        onChange={(v) => setTweak("radius", v)}
      />

      <TweakSection label="Layout" />
      <TweakRadio
        label="사이드바"
        value={t.sidebar}
        options={["icons", "compact", "full"]}
        onChange={(v) => setTweak("sidebar", v)}
      />
      <TweakRadio
        label="밀도"
        value={t.density}
        options={["compact", "regular", "comfortable"]}
        onChange={(v) => setTweak("density", v)}
      />
    </TweaksPanel>
  );
}

/* ---------- Command Palette (⌘K) ---------- */
function CommandPalette({ onClose, setPage }) {
  const [q, setQ] = useState("");
  const items = [
    { label: "홈으로", icon: "home", action: () => setPage("home") },
    { label: "작업 보기", icon: "check", action: () => setPage("tasks") },
    { label: "프로젝트 열기", icon: "layers", action: () => setPage("projects") },
    { label: "포스트잇 보드", icon: "note", action: () => setPage("notes") },
    { label: "노트 페이지", icon: "book", action: () => setPage("wiki") },
    { label: "북마크 모음", icon: "bookmark", action: () => setPage("bookmarks") },
    { label: "보관함 (완료된 작업)", icon: "archive", action: () => setPage("archive") },
    { label: "마이페이지 / 설정", icon: "user", action: () => setPage("profile") },
  ];
  const filtered = items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(8,4,15,0.55)",
        backdropFilter: "blur(8px)",
        display: "grid", placeItems: "start center",
        paddingTop: "12vh", zIndex: 1000,
        animation: "fadeIn 180ms var(--ease-out)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--border-soft)" }}>
          <Icon name="command" size={16} style={{ color: "var(--accent)" }} />
          <input
            autoFocus
            placeholder="명령어, 페이지, 작업 검색…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 16, color: "var(--text-hi)", fontFamily: "var(--font-display)" }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div style={{ padding: 8, maxHeight: 380, overflowY: "auto" }}>
          {filtered.length === 0 && <div className="empty" style={{ padding: 30 }}>일치하는 항목이 없어요.</div>}
          {filtered.map((it, i) => (
            <button
              key={i}
              onClick={() => { it.action(); onClose(); }}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px",
                borderRadius: "var(--r-md)",
                color: "var(--text-md)",
                fontSize: 14,
                textAlign: "left",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Icon name={it.icon} size={16} style={{ color: "var(--text-lo)" }} />
              <span style={{ flex: 1 }}>{it.label}</span>
              <Icon name="arrowRight" size={12} style={{ color: "var(--text-faint)" }} />
            </button>
          ))}
        </div>
        <div style={{ padding: "10px 18px", fontSize: 11, color: "var(--text-faint)", borderTop: "1px solid var(--border-soft)", display: "flex", gap: 14 }}>
          <span><span className="kbd">↑↓</span> 이동</span>
          <span><span className="kbd">↵</span> 선택</span>
          <span style={{ flex: 1 }} />
          <span>Planary v3</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Error Boundary ---------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[Planary ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24,
          minHeight: "100vh",
          background: "var(--bg, #0a070e)",
          color: "var(--text-hi, #f1f5f9)",
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          lineHeight: 1.5,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f87171", fontFamily: "system-ui, sans-serif" }}>
            ⚠ 렌더 오류가 발생했습니다
          </div>
          <div style={{ fontSize: 13, color: "rgba(241,245,249,0.7)", marginBottom: 18, fontFamily: "system-ui, sans-serif" }}>
            아래 오류 정보를 복사해서 알려주시면 즉시 수정할 수 있어요.
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 8, marginBottom: 12 }}>
            <strong style={{ color: "#fbbf24" }}>Error:</strong> {String(this.state.error?.message || this.state.error)}
          </div>
          {this.state.error?.stack && (
            <pre style={{ background: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 8, overflow: "auto", whiteSpace: "pre-wrap" }}>
              {this.state.error.stack}
            </pre>
          )}
          {this.state.info?.componentStack && (
            <pre style={{ background: "rgba(0,0,0,0.3)", padding: 14, borderRadius: 8, overflow: "auto", whiteSpace: "pre-wrap", marginTop: 12 }}>
              <strong style={{ color: "#a78bfa" }}>Component stack:</strong>
              {this.state.info.componentStack}
            </pre>
          )}
          <button
            style={{ marginTop: 14, padding: "8px 16px", borderRadius: 6, background: "#7f0df2", color: "white", border: 0, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
