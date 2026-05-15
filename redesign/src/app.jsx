/* Planary — App root + Tweaks panel wiring */

const { useState, useEffect, useMemo } = React;
const { Rail, Sidebar, Topbar, MobileBar, MobileTabs,
        HomePage, TasksPage, ProjectsPage, NotesPage,
        WikiPage, BookmarksPage, ArchivePage, ProfilePage } = window.Planary;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "violet",
  "font": "jakarta",
  "radius": 12,
  "sidebar": "full",
  "variant": "balanced",
  "density": "regular"
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
  const [page, setPage] = useState("home");
  const [tasks, setTasks] = useState(window.Planary.TASKS);
  const [taskFilter, setTaskFilter] = useState("all");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Listen for "edit this task" requests from TaskCard buttons throughout the app
  useEffect(() => {
    const onEdit = (e) => setEditingTask(e.detail);
    const onToggle = (e) => setTasks(prev => prev.map(t => t.id === e.detail ? { ...t, done: !t.done } : t));
    window.addEventListener("planary:edit-task", onEdit);
    window.addEventListener("planary:toggle-task", onToggle);
    return () => {
      window.removeEventListener("planary:edit-task", onEdit);
      window.removeEventListener("planary:toggle-task", onToggle);
    };
  }, []);

  const saveTask = (draft) => {
    setTasks(prev => prev.map(t => t.id === draft.id ? draft : t));
    setEditingTask(null);
    window.Planary.toast({ type: "ok", title: "변경사항이 저장됐어요" });
  };
  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setEditingTask(null);
    window.Planary.toast({ type: "ok", title: "작업이 삭제됐어요" });
  };

  const renderPage = () => {
    switch (page) {
      case "home":      return <HomePage tasks={tasks} setTasks={setTasks} variant={t.variant} setPage={setPage} setTaskFilter={setTaskFilter} />;
      case "tasks":     return <TasksPage tasks={tasks} setTasks={setTasks} taskFilter={taskFilter} setTaskFilter={setTaskFilter} variant={t.variant} />;
      case "projects":  return <ProjectsPage tasks={tasks} setTasks={setTasks} setPage={setPage} setTaskFilter={setTaskFilter} />;
      case "notes":     return <NotesPage />;
      case "wiki":      return <WikiPage />;
      case "bookmarks": return <BookmarksPage />;
      case "archive":   return <ArchivePage tasks={tasks} />;
      case "profile":   return <ProfilePage tasks={tasks} t={t} setTweak={setTweak} />;
      default:          return null;
    }
  };

  return (
    <div
      className="app-shell"
      data-sidebar={t.sidebar}
      data-density={t.density}
    >
      <window.Planary.Rail page={page} setPage={setPage}
        onToggleSidebar={() => setTweak("sidebar", t.sidebar === "full" ? "icons" : "full")} />
      <window.Planary.Sidebar
        page={page} setPage={setPage}
        taskFilter={taskFilter} setTaskFilter={setTaskFilter}
        tasks={tasks}
      />
      <div className="main">
        <window.Planary.MobileBar
          page={page}
          onOpenDrawer={() => setDrawerOpen(true)}
          onSearch={() => setPaletteOpen(true)}
        />
        <window.Planary.Topbar
          page={page}
          crumbs={PAGE_CRUMBS[page] || []}
          onCommandPalette={() => setPaletteOpen(true)}
          theme={t.theme}
          setTheme={(v) => setTweak("theme", v)}
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
        tasks={tasks}
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

      <PlanaryTweaks t={t} setTweak={setTweak} />
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
