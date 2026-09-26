// Project page and e-Class project details.
// Uses the shared React hook aliases initialized by pages-rest.jsx.
/* ===========================================================
   PROJECTS
   =========================================================== */
function ProjectsPage({ tasks, setPage, setTaskFilter }) {
  const { PROJECTS, ECLASS_COURSES } = window.Planary;
  const [projects, setProjects] = useStateO(PROJECTS);
  const [selected, setSelected] = useStateO(PROJECTS.length ? PROJECTS[0].id : null);
  const [syncing, setSyncing] = useStateO(false);
  const [createOpen, setCreateOpen] = useStateO(false);

  // Live-sync projects from firebase-bridge
  useEffectO(() => {
    const onLoaded = (e) => {
      if (!Array.isArray(e.detail)) return;
      setProjects(e.detail);
      setSelected((cur) => e.detail.some((p) => p.id === cur) ? cur : (e.detail[0]?.id || null));
    };
    window.addEventListener("planary:projects-loaded", onLoaded);
    return () => window.removeEventListener("planary:projects-loaded", onLoaded);
  }, []);
  const proj = projects.find((p) => p.id === selected);
  const projTasks = tasks.filter((t) => t.project === selected);
  const open = projTasks.filter((t) => !t.done);
  const done = projTasks.filter((t) => t.done);

  const toggleTask = (id) => window.dispatchEvent(new CustomEvent("planary:toggle-task", { detail: id }));

  const handleCreate = (draft) => {
    const id = `p${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const newProj = {
      id,
      name: draft.name,
      color: draft.color,
      icon: draft.icon,
      progress: 0,
      members: [window.Planary.USER.initials],
      deadline: draft.deadline || null,
      description: draft.description || "",
    };
    const next = [...projects, newProj];
    setProjects(next);
    window.Planary.PROJECTS = next; // reflect globally
    setSelected(id);
    setCreateOpen(false);
    window.dispatchEvent(new CustomEvent("planary:create-project", {
      detail: { name: draft.name, color: draft.color, icon: draft.icon },
    }));
    window.Planary.toast({ type: "ok", title: "프로젝트가 만들어졌어요", sub: draft.name });
  };

  const triggerSync = () => {
    setSyncing(true);
    let resolved = false;
    const handler = (e) => {
      if (resolved) return;
      resolved = true;
      setSyncing(false);
      window.removeEventListener("planary:eclass-sync-done", handler);
      if (e.detail?.error) {
        window.Planary.toast({ type: "err", title: "동기화 실패", sub: e.detail.error, ttl: 4200 });
      } else {
        window.Planary.toast({
          type: "ok",
          title: "동기화 완료",
          sub: `${ECLASS_COURSES.length}개 강의에서 항목 확인`,
        });
      }
    };
    window.addEventListener("planary:eclass-sync-done", handler);
    window.dispatchEvent(new CustomEvent("planary:eclass-sync"));
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      setSyncing(false);
      window.removeEventListener("planary:eclass-sync-done", handler);
      window.Planary.toast({ type: "err", title: "동기화 시간 초과", sub: "e-Class 응답이 늦어요. 잠시 후 다시 시도해주세요.", ttl: 4200 });
    }, 15000);
  };

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
        <div>
          <div className="kicker">WORKSPACE · 프로젝트</div>
          <div className="page-title">프로젝트</div>
          <div className="page-sub">작업·위키·리마인더가 함께 사는 작업 공간</div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={14} />새 프로젝트
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 24 }}>
        {projects.map((p) => {
          const ct = tasks.filter((t) => t.project === p.id);
          const active = p.id === selected;
          return (
            <div
              key={p.id}
              className="card card-hover"
              style={{ cursor: "pointer", borderColor: active ? "var(--accent-ring)" : undefined, background: active ? "var(--accent-softer)" : undefined, position: "relative" }}
              onClick={() => setSelected(p.id)}>

              {p.isEclass &&
              <span
                className="chip"
                style={{ position: "absolute", top: 12, right: 12, background: "color-mix(in oklab, var(--info) 12%, transparent)", color: "var(--info)", borderColor: "transparent", height: 20, padding: "0 7px", fontSize: 10 }}>

                  <Icon name="globe" size={9} />SYNC
                </span>
              }
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div className="proj-tile-icon" style={{ background: p.color, width: 36, height: 36, fontSize: 18, borderRadius: 10 }}>{p.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>
                    {p.isEclass ?
                    <>{p.courses}개 강의 · {ct.length}개 작업</> :
                    <>{p.members.length}명 · {ct.length}개 작업{p.deadline ? ` · ${p.deadline} 마감` : ""}</>
                    }
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div className="bar" style={{ flex: 1 }}>
                  <span style={{ width: `${p.progress}%`, background: p.isEclass ? "linear-gradient(90deg, var(--info), color-mix(in oklab, var(--info) 70%, var(--accent)))" : undefined }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: p.progress >= 80 ? "var(--ok)" : "var(--text-md)" }}>{p.progress}%</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
                {p.isEclass ?
                <>
                    <span className="chip" style={{ height: 20, fontSize: 10 }}>{ct.filter((t) => !t.done).length} 진행</span>
                    <span className="chip" style={{ height: 20, fontSize: 10 }}>{ct.filter((t) => t.source === "eclass-exam").length} 시험·발표</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{p.lastSync}</span>
                  </> :

                <>
                    <span className="chip" style={{ height: 20, fontSize: 10 }}>{ct.filter((t) => !t.done).length} 진행</span>
                    <span className="chip" style={{ height: 20, fontSize: 10 }}>{ct.filter((t) => t.priority === "high").length} 중요</span>
                    <div style={{ flex: 1 }} />
                    <window.Planary.AvatarGroup members={p.members} max={3} size={18} />
                  </>
                }
              </div>
            </div>);

        })}
      </div>

      {proj ? (proj.isEclass ?
      <EclassDetail proj={proj} projTasks={projTasks} open={open} done={done} syncing={syncing} triggerSync={triggerSync} setPage={setPage} /> :

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "22px 26px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "start", gap: 16 }}>
            <div className="proj-tile-icon" style={{ background: proj.color, width: 56, height: 56, fontSize: 28, borderRadius: 14 }}>{proj.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="kicker">프로젝트 · {proj.members.length}명{proj.deadline ? ` · ${proj.deadline} 마감` : ""}</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{proj.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-lo)", marginTop: 4 }}>{open.length}개 진행 중 · {done.length}개 완료 · {proj.progress}% 진척률</div>
            </div>
            <div className="ring" style={{ "--p": proj.progress, "--size": "72px", "--stroke": "7px" }}>
              <span className="ring-text">{proj.progress}%</span>
            </div>
          </div>

          <div className="project-detail-grid" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 0 }}>
            <section style={{ padding: 22, borderRight: "1px solid var(--border-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>작업 ({projTasks.length})</h3>
                <button className="btn btn-sm" onClick={() => {setPage("tasks");setTaskFilter("all");}}>모두 보기 <Icon name="arrowRight" size={12} /></button>
              </div>
              <div className="task-list">
                {projTasks.slice(0, 5).map((t) =>
              <window.Planary.TaskCard key={t.id} task={t} onToggle={toggleTask} projects={PROJECTS} />
              )}
                {projTasks.length === 0 && <div className="empty" style={{ padding: 24, fontSize: 12 }}>작업이 없습니다.</div>}
              </div>
            </section>

            <section style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>위키 페이지</h3>
                <button className="btn btn-sm" onClick={() => setPage("wiki")}>새 페이지 <Icon name="plus" size={12} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
              { icon: "📘", title: `${proj.name} 핸드북`, sub: "5개 하위 페이지" },
              { icon: "🎯", title: "OKR & 마일스톤", sub: "최근: 2일 전" },
              { icon: "📝", title: "회의록", sub: "12개" }].
              map((w, i) =>
              <div key={i} className="wiki-tree-item" onClick={() => setPage("wiki")}>
                    <span className="wiki-tree-icon" style={{ fontSize: 14 }}>{w.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div>{w.title}</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>{w.sub}</div>
                    </div>
                    <Icon name="chevronRight" size={12} style={{ color: "var(--text-faint)" }} />
                  </div>
              )}
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>다가오는 리마인더</h3>
                {projTasks.filter((t) => t.reminder).slice(0, 3).map((t) =>
              <div key={t.id} className="focus-row">
                    <Icon name="bell" size={14} style={{ color: "var(--accent)" }} />
                    <span className="focus-text" style={{ fontSize: 12 }}>{t.title}</span>
                    <span style={{ fontSize: 11, color: "var(--text-lo)" }}>{t.time}</span>
                  </div>
              )}
                {projTasks.filter((t) => t.reminder).length === 0 && <div className="empty" style={{ padding: 12, fontSize: 11 }}>리마인더 없음</div>}
              </div>
            </section>
          </div>
        </div>) : <div className="empty" style={{ padding: 48 }}>아직 프로젝트가 없습니다.</div>
      }
      {createOpen && <CreateProjectDialog onClose={() => setCreateOpen(false)} onCreate={handleCreate} />}
    </div>);

}


/* ===========================================================
   CREATE PROJECT DIALOG
   =========================================================== */
function CreateProjectDialog({ onClose, onCreate }) {
  const [name, setName] = useStateO("");
  const [icon, setIcon] = useStateO("🚀");
  const [color, setColor] = useStateO("#7f0df2");
  const [description, setDescription] = useStateO("");
  const [deadline, setDeadline] = useStateO("");

  const COLORS = ["#7f0df2", "#3b82f6", "#10b981", "#f59e0b", "#e11d48", "#0ea5e9", "#8b5cf6", "#475569"];
  const ICONS  = ["🚀", "🎯", "🔬", "✍️", "🎨", "📚", "💼", "🧪", "📊", "🛠️", "💡", "🌱"];

  useEffectO(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name, icon, color, description, deadline]);

  const canSubmit = name.trim().length > 0;
  const submit = () => {
    if (!canSubmit) return;
    onCreate({ name: name.trim(), icon, color, description: description.trim(), deadline: deadline.trim() });
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(540px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>새 프로젝트</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>작업·노트·리마인더를 묶을 새 공간을 만들어요</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          {/* Live preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)", marginBottom: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: color, display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: name ? "var(--text-hi)" : "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || "프로젝트 이름"}</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>1명 · 0개 작업{deadline ? ` · ${deadline} 마감` : ""}</div>
            </div>
            <span className="chip">미리보기</span>
          </div>

          <div>
            <label className="kicker" style={{ display: "block", marginBottom: 6 }}>이름 <span style={{ color: "var(--err)", fontWeight: 600 }}>*</span></label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Planary v3 출시"
              className="form-input"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label className="kicker" style={{ display: "block", marginBottom: 6 }}>아이콘</label>
              <div className="proj-icon-grid">
                {ICONS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`proj-icon-cell ${icon === i ? "is-active" : ""}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="kicker" style={{ display: "block", marginBottom: 6 }}>컬러</label>
              <div className="proj-color-grid">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`proj-color-cell ${color === c ? "is-active" : ""}`}
                    style={{ background: c }}
                  >
                    {color === c && <Icon name="check" size={11} stroke={3} style={{ color: "white" }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="kicker" style={{ display: "block", marginBottom: 6 }}>설명 <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>(선택)</span></label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 프로젝트의 목표나 맥락을 한 줄로"
              className="form-input"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="kicker" style={{ display: "block", marginBottom: 6 }}>마감일 <span style={{ color: "var(--text-faint)", fontWeight: 500 }}>(선택)</span></label>
            <input
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="예: 12월 18일"
              className="form-input"
            />
          </div>
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>나중에 언제든 변경할 수 있어요</div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button
            className="btn btn-sm btn-primary"
            onClick={submit}
            disabled={!canSubmit}
            style={!canSubmit ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <Icon name="plus" size={12} />프로젝트 만들기 <span className="kbd" style={{ marginLeft: 4 }}>⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- e-Class detail view ---------- */
function EclassDetail({ proj, projTasks, open, done, syncing, triggerSync, setPage }) {
  const { USER } = window.Planary;
  const [filter, setFilter] = useStateO("open"); // open | exam | done
  const [icon, setIcon] = useStateO(proj.icon);

  // Derive course list from the actually-synced tasks (not the mock ECLASS_COURSES).
  // Course title from e-class is usually "강의명(코드)"; parse it best-effort.
  const coursePalette = ["#7f0df2", "#10b981", "#f59e0b", "#e11d48", "#3b82f6", "#a855f7"];
  const courseMap = new Map();
  projTasks.forEach((t) => {
    const title = t.course || (t._raw && t._raw.courseTitle);
    if (!title || courseMap.has(title)) return;
    const m = String(title).match(/^(.*?)\(([^)]+)\)\s*$/);
    const name = m ? m[1].trim() : String(title).trim();
    const code = m ? m[2].trim() : "";
    courseMap.set(title, {
      id: title,
      code,
      name,
      prof: "",
      credits: 0,
      color: coursePalette[courseMap.size % coursePalette.length],
    });
  });
  const courses = [...courseMap.values()];

  const filteredTasks = projTasks.filter((t) => {
    if (filter === "open") return !t.done;
    if (filter === "exam") return !t.done && t.source === "eclass-exam";
    if (filter === "done") return t.done;
    return true;
  });

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Hero */}
      <div style={{ padding: "22px 26px", borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ display: "flex", alignItems: "start", gap: 16 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <window.Planary.IconPicker
              value={icon}
              onChange={setIcon}
              color={proj.color}
              size={56} />

            <span
              className="status-dot is-live"
              style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, background: "var(--ok)", border: "2px solid var(--surface)", boxShadow: "none", animation: "none", pointerEvents: "none", borderRadius: "50%" }} />

          </div>
          <div style={{ flex: 1 }}>
            <div className="kicker" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="globe" size={11} style={{ color: "var(--info)" }} />
              <span>{USER.school || proj.school} · e-Class 연동</span>
              <span style={{ color: "var(--text-faint)" }}>·</span>
              <span style={{ color: "var(--text-lo)" }}>학번 {USER.studentId}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4, display: "flex", alignItems: "center", gap: 10 }}>
              {proj.name}
              <span className="chip" style={{ background: "color-mix(in oklab, var(--ok) 12%, transparent)", color: "var(--ok)", borderColor: "transparent" }}>
                <Icon name="check" size={11} stroke={3} />연결됨
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-lo)", marginTop: 4 }}>
              {proj.courses}개 강의 · {projTasks.length}개 동기화된 작업 · 마지막 동기화 <strong style={{ color: "var(--text-md)" }}>{proj.lastSync}</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost" onClick={triggerSync} disabled={syncing}>
              <Icon name="refresh" size={14} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "동기화 중…" : "지금 동기화"}
            </button>
            <button className="btn btn-ghost" onClick={() => setPage("profile")} title="마이페이지 · e-Class 연동 설정으로 이동">
              <Icon name="settings" size={14} />연결 관리
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 18 }}>
          {[
          { label: "총 강의", val: proj.courses, sub: "이번 학기" },
          { label: "다가오는 마감", val: projTasks.filter((t) => !t.done && t.time !== "이틀 전").length, sub: "7일 이내" },
          { label: "시험·발표", val: projTasks.filter((t) => t.source === "eclass-exam").length, sub: "강의계획서에서 추출" },
          { label: "오늘 마감", val: projTasks.filter((t) => t.time && t.time.startsWith("오늘") && !t.done).length, sub: "긴급" }].
          map((s, i) =>
          <div key={i} style={{ background: "var(--bg-elev)", borderRadius: "var(--r-md)", padding: 14, border: "1px solid var(--border-soft)" }}>
              <div className="kicker">{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{s.sub}</div>
            </div>
          )}
        </div>
      </div>

      {/* Courses */}
      <section style={{ padding: 22, borderBottom: "1px solid var(--border-soft)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>이번 학기 강의</h3>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{courses.length}개 강의</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {courses.map((c) => {
            const ct = projTasks.filter((t) => t.course === c.id);
            const ctOpen = ct.filter((t) => !t.done);
            const next = ctOpen.sort((a, b) => (a.due || "") < (b.due || "") ? -1 : 1)[0];
            return (
              <div
                key={c.id}
                style={{
                  padding: 14,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-elev)",
                  cursor: "pointer",
                  transition: "all var(--dur-fast)",
                  borderLeft: `3px solid ${c.color}`
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>

                {(c.code || c.credits > 0) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    {c.code && <span className="mono" style={{ fontSize: 10, color: "var(--text-lo)", fontWeight: 700, letterSpacing: "0.04em" }}>{c.code}</span>}
                    {c.credits > 0 && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{c.code ? "· " : ""}{c.credits}학점</span>}
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", letterSpacing: "-0.01em", marginBottom: 2 }}>{c.name}</div>
                {c.prof && <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{c.prof}</div>}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--border-soft)" }}>
                  {next ?
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name="clock" size={12} style={{ color: next.time && next.time.startsWith("오늘") ? "var(--err)" : "var(--text-lo)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "var(--text-md)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{next.title}</div>
                        <div style={{ fontSize: 10, color: next.time && next.time.startsWith("오늘") ? "var(--err)" : "var(--text-lo)", fontWeight: 600 }}>{next.time}</div>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{ctOpen.length}개</span>
                    </div> :

                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>다가오는 일정 없음</div>
                  }
                </div>
              </div>);

          })}
        </div>
      </section>

      {/* Tasks grouped by course */}
      <section style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>동기화된 작업</h3>
          <div className="seg-control">
            {[
              { id: "open", label: "전체", icon: "list", count: projTasks.filter(t => !t.done).length },
              { id: "exam", label: "시험·발표", icon: "flag", count: projTasks.filter(t => !t.done && t.source === "eclass-exam").length },
              { id: "done", label: "완료", icon: "check", count: projTasks.filter(t => t.done).length },
            ].map(f => (
              <button
                key={f.id}
                className={`seg-btn ${filter === f.id ? "is-active" : ""}`}
                onClick={() => setFilter(f.id)}
                type="button"
              >
                <Icon name={f.icon} size={11} />
                <span>{f.label}</span>
                <span className="seg-count">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
        {courses.map((c) => {
          const ct = projTasks.filter((t) => {
            if (t.course !== c.id) return false;
            if (filter === "open") return !t.done;
            if (filter === "exam") return !t.done && t.source === "eclass-exam";
            if (filter === "done") return t.done;
            return true;
          });
          if (ct.length === 0) return null;
          return (
            <div key={c.id} style={{ marginBottom: 16 }}>
              <div className="group-head" style={{ paddingTop: 4 }}>
                <span style={{ width: 4, height: 14, borderRadius: 2, background: c.color }} />
                <span className="group-label" style={{ letterSpacing: 0, textTransform: "none", fontSize: 13 }}>{c.name}</span>
                <span className="group-count">{ct.length}</span>
                <div className="group-rule" />
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{c.code}</span>
              </div>
              <div className="task-list">
                {ct.map((t) =>
                <window.Planary.TaskCard key={t.id} task={t} onToggle={(id) => window.dispatchEvent(new CustomEvent('planary:toggle-task', { detail: id }))} projects={window.Planary.PROJECTS} />
                )}
              </div>
            </div>);

        })}
      </section>
    </div>);

}


window.Planary = Object.assign(window.Planary || {}, { ProjectsPage });
