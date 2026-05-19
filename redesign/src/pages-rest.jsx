/* Planary — Other pages: Projects, Notes, Wiki, Bookmarks, Archive, Profile */

const { useState: useStateO, useRef: useRefO, useEffect: useEffectO, useMemo: useMemoO } = React;

/* ===========================================================
   PROJECTS
   =========================================================== */
function ProjectsPage({ tasks, setTasks, setPage, setTaskFilter }) {
  const { PROJECTS, ECLASS_COURSES } = window.Planary;
  const [projects, setProjects] = useStateO(PROJECTS);
  const [selected, setSelected] = useStateO(PROJECTS[0].id);
  const [syncing, setSyncing] = useStateO(false);
  const [createOpen, setCreateOpen] = useStateO(false);

  // Live-sync projects from firebase-bridge
  useEffectO(() => {
    const onLoaded = (e) => {
      if (Array.isArray(e.detail) && e.detail.length) {
        setProjects(e.detail);
        setSelected((cur) => e.detail.some((p) => p.id === cur) ? cur : e.detail[0].id);
      }
    };
    window.addEventListener("planary:projects-loaded", onLoaded);
    return () => window.removeEventListener("planary:projects-loaded", onLoaded);
  }, []);
  const proj = projects.find((p) => p.id === selected);
  const projTasks = tasks.filter((t) => t.project === selected);
  const open = projTasks.filter((t) => !t.done);
  const done = projTasks.filter((t) => t.done);

  const toggleTask = (id) => setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : null } : t));

  const handleCreate = (draft) => {
    const id = `p${Date.now()}`;
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

      {proj && (proj.isEclass ?
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

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 0 }}>
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
        </div>)
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

/* ===========================================================
   NOTES (drag-and-drop sticky board)
   =========================================================== */
function NotesPage() {
  const initialNotes = Array.isArray(window.Planary.NOTES) ? window.Planary.NOTES : [];
  const [notes, setNotes] = useStateO(initialNotes);
  const [draftColor, setDraftColor] = useStateO("yellow");
  const [draft, setDraft] = useStateO("");
  const [view, setView] = useStateO("board"); // board | grid
  const [boardW, setBoardW] = useStateO(0);
  const [editing, setEditing] = useStateO(null); // { id, text, color } | null
  const [colorMenuFor, setColorMenuFor] = useStateO(null); // note id whose color menu is open
  const [search, setSearch] = useStateO("");
  const [colorFilter, setColorFilter] = useStateO(null); // null = all
  const boardRef = useRefO(null);
  const dragRef = useRefO(null);
  const editAreaRef = useRefO(null);

  // Focus textarea when entering edit mode
  useEffectO(() => {
    if (editing && editAreaRef.current) {
      const el = editAreaRef.current;
      el.focus();
      // Move cursor to end
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [editing && editing.id]);

  // Live-sync notes from firebase-bridge
  useEffectO(() => {
    const onLoaded = (e) => {
      if (Array.isArray(e.detail)) setNotes(e.detail);
    };
    window.addEventListener("planary:notes-loaded", onLoaded);
    return () => window.removeEventListener("planary:notes-loaded", onLoaded);
  }, []);

  const startEdit = (n) => setEditing({ id: n.id, text: n.text, color: n.color });
  const cancelEdit = () => setEditing(null);
  const commitEdit = () => {
    if (!editing) return;
    const trimmed = editing.text.trim();
    if (!trimmed) {
      // Empty -> delete the note
      setNotes((prev) => prev.filter((n) => n.id !== editing.id));
      window.dispatchEvent(new CustomEvent("planary:delete-note", { detail: editing.id }));
    } else {
      setNotes((prev) => prev.map((n) =>
        n.id === editing.id
          ? { ...n, text: trimmed, color: editing.color, date: "방금 수정", rot: n.dragging ? n.rot : n.rot }
          : n
      ));
      window.dispatchEvent(new CustomEvent("planary:update-note", {
        detail: { id: editing.id, patch: { text: trimmed, color: editing.color } },
      }));
    }
    setEditing(null);
  };

  const cycleColor = (id) => {
    const order = ["yellow", "pink", "blue", "green", "purple", "orange", "mint"];
    let nextColor = null;
    setNotes((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      nextColor = order[(order.indexOf(n.color) + 1) % order.length];
      return { ...n, color: nextColor };
    }));
    if (nextColor) {
      window.dispatchEvent(new CustomEvent("planary:update-note", {
        detail: { id, patch: { color: nextColor } },
      }));
    }
  };

  const duplicateNote = (n) => {
    const id = window.Planary?.generateId?.() || "n" + Date.now();
    setNotes((prev) => [
      { ...n, id, x: n.x + 24, y: n.y + 24, rot: (Math.random() - 0.5) * 4, date: "방금 복제" },
      ...prev,
    ]);
    window.dispatchEvent(new CustomEvent("planary:create-note", {
      detail: { id, text: n.text, color: n.color, x: n.x + 24, y: n.y + 24 },
    }));
  };

  // Track board width so notes can clamp to its bounds on every render & resize
  useEffectO(() => {
    if (!boardRef.current) return;
    const update = () => setBoardW(boardRef.current.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, [view]);

  const onPointerDown = (e, note) => {
    if (e.target.closest(".note-foot") || e.target.closest(".note-toolbar") || e.target.tagName === "BUTTON" || e.target.tagName === "TEXTAREA") return;
    // Don't drag the note we're editing
    if (editing && editing.id === note.id) return;
    // Left click only (pointer button === 0). Touch and pen also report 0.
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();
    dragRef.current = {
      id: note.id,
      offX: e.clientX - rect.left - note.x,
      offY: e.clientY - rect.top - note.y,
      moved: false,
      startX: e.clientX,
      startY: e.clientY
    };
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, dragging: true } : n));
    // Capture pointer so we still get move/up if cursor leaves the element
    try { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  useEffectO(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d || !boardRef.current) return;
      // Track whether the pointer actually moved enough to be a drag
      if (!d.moved && (Math.abs(e.clientX - d.startX) > 3 || Math.abs(e.clientY - d.startY) > 3)) {
        d.moved = true;
      }
      const rect = boardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 200, e.clientX - rect.left - d.offX));
      const y = Math.max(0, Math.min(rect.height - 144, e.clientY - rect.top - d.offY));
      setNotes((prev) => prev.map((n) => n.id === d.id ? { ...n, x, y } : n));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d) {
        let finalPos = null;
        setNotes((prev) => prev.map((n) => {
          if (n.id !== d.id) return n;
          if (d.moved) finalPos = { x: n.x, y: n.y };
          return { ...n, dragging: false };
        }));
        if (finalPos) {
          window.dispatchEvent(new CustomEvent("planary:update-note", {
            detail: { id: d.id, patch: finalPos },
          }));
        }
        dragRef.current = null;
      }
    };
    // Use pointer events so we survive touch + mouse leaving window
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    // Cancel any in-flight drag if user releases off-window
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, []);

  const addNote = () => {
    if (!draft.trim()) return;
    const id = window.Planary?.generateId?.() || "n" + Date.now();
    const x = 60 + Math.random() * 200;
    const y = 60 + Math.random() * 100;
    const text = draft.trim();
    setNotes((prev) => [
    { id, x, y, color: draftColor, text, date: "방금", rot: (Math.random() - 0.5) * 4, dragging: false },
    ...prev]
    );
    window.dispatchEvent(new CustomEvent("planary:create-note", {
      detail: { id, text, color: draftColor, x, y },
    }));
    setDraft("");
  };

  const colors = ["yellow", "pink", "blue", "green", "purple", "orange", "mint"];

  const filteredNotes = notes.filter(n => {
    if (colorFilter && n.color !== colorFilter) return false;
    if (search && !n.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const boardH = notes.length === 0 ? 320 : Math.max(480, Math.max(...notes.map(n => (n.y || 0) + 200)));

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="kicker">WORKSPACE · 포스트잇 보드</div>
          <div className="page-title">포스트잇
</div>
          <div className="page-sub">{filteredNotes.length !== notes.length ? `${filteredNotes.length} / ${notes.length}개` : `${notes.length}개`} · 드래그해 자유롭게 배치하거나 그리드로 정렬하세요</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Icon name="search" size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="메모 검색…"
              style={{
                height: 32, paddingLeft: 30, paddingRight: search ? 28 : 10,
                background: "var(--surface-2)", border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)", fontSize: 13, color: "var(--text-hi)",
                outline: "none", width: 160,
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-faint)" }}>
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
          <div style={{ display: "inline-flex", padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-md)", gap: 2 }}>
            <button onClick={() => setView("board")}
            className="btn btn-sm"
            style={{ height: 28, background: view === "board" ? "var(--surface)" : "transparent", color: view === "board" ? "var(--text-hi)" : "var(--text-lo)", boxShadow: view === "board" ? "var(--shadow-sm)" : "none" }}>
              <Icon name="layers" size={13} />보드
            </button>
            <button
              onClick={() => setView("grid")}
              className="btn btn-sm"
              style={{ height: 28, background: view === "grid" ? "var(--surface)" : "transparent", color: view === "grid" ? "var(--text-hi)" : "var(--text-lo)", boxShadow: view === "grid" ? "var(--shadow-sm)" : "none" }}>
              <Icon name="grid" size={13} />그리드
            </button>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (!notes.length) return;
              const text = notes.map(n => `[${n.color}] ${n.text}`).join("\n\n");
              navigator.clipboard?.writeText(text).then(() =>
                window.Planary.toast?.({ type: "ok", title: "클립보드에 복사됨" })
              );
            }}
          ><Icon name="download" size={14} />내보내기</button>
        </div>
      </div>

      <div className="composer" style={{ marginBottom: 14 }}>
        <div className="composer-row">
          <Icon name="edit" size={16} style={{ color: "var(--accent)" }} />
          <input
            className="composer-input"
            placeholder="떠오른 생각을 그대로 적어두세요… ⌘+Enter로 저장"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();else
              if (e.key === "Enter" && !e.shiftKey) addNote();
            }} />
          
        </div>
        <div className="composer-tools">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-lo)", marginRight: 4, fontWeight: 600 }}>색상</span>
            {colors.map((c) =>
            <button
              key={c}
              className={`note note-${c}`}
              onClick={() => setDraftColor(c)}
              style={{
                position: "static",
                width: 22, height: 22,
                minHeight: 22, padding: 0,
                borderRadius: 5,
                boxShadow: draftColor === c ? "0 0 0 2px var(--accent), 0 0 0 4px var(--bg)" : "var(--shadow-sm)",
                transform: "none", cursor: "pointer"
              }}
              title={c} />

            )}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>⌘ + Enter</span>
          <button className="btn btn-sm btn-primary" onClick={addNote}><Icon name="plus" size={12} />메모 추가</button>
        </div>
      </div>

      {/* Color filter chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          className={`chip ${!colorFilter ? "chip-accent" : ""}`}
          style={{ cursor: "pointer", height: 26, padding: "0 10px", fontSize: 12 }}
          onClick={() => setColorFilter(null)}
        >전체 <span style={{ fontSize: 11, opacity: 0.7 }}>{notes.length}</span></button>
        {colors.map(c => {
          const cnt = notes.filter(n => n.color === c).length;
          if (!cnt) return null;
          return (
            <button
              key={c}
              className={`chip ${colorFilter === c ? "chip-accent" : ""}`}
              style={{ cursor: "pointer", height: 26, padding: "0 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => setColorFilter(colorFilter === c ? null : c)}
            >
              <span className={`note-color-swatch note-${c}`} style={{ width: 10, height: 10, borderRadius: 3, display: "inline-block" }} />
              {cnt}
            </button>
          );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          {notes.length === 0 ? (
            <>
              <Icon name="note" size={28} style={{ color: "var(--text-faint)", marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-lo)" }}>첫 메모를 작성해보세요</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>위 입력창에 생각을 적고 메모 추가를 눌러요</div>
            </>
          ) : (
            <>
              <Icon name="search" size={24} style={{ color: "var(--text-faint)", marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-lo)" }}>검색 결과가 없어요</div>
              <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => { setSearch(""); setColorFilter(null); }}>필터 초기화</button>
            </>
          )}
        </div>
      )}

      {view === "board" ?
      <div className="board" ref={boardRef} style={{ height: boardH, touchAction: "none" }}>
          {filteredNotes.map((n) => {
        const NOTE_W = 200, NOTE_H = 144, PAD = 8;
        const maxX = Math.max(0, boardW - NOTE_W - PAD);
        const safeX = boardW > 0 ? Math.min(n.x, maxX) : n.x;
        const isEditing = editing && editing.id === n.id;
        const displayColor = isEditing ? editing.color : n.color;
        return (
        <div
          key={n.id}
          className={`note note-${displayColor} ${n.dragging ? "dragging" : ""} ${isEditing ? "is-editing" : ""}`}
          style={{
            left: safeX, top: n.y,
            transform: isEditing ? "rotate(0deg) scale(1.06)" : `rotate(${n.dragging ? 0 : n.rot}deg)${n.dragging ? " scale(1.04)" : ""}`,
            zIndex: isEditing ? 20 : (n.dragging ? 10 : "auto"),
            touchAction: "none",
            cursor: isEditing ? "default" : undefined,
          }}
          onPointerDown={(e) => onPointerDown(e, n)}
          onDoubleClick={() => !isEditing && startEdit(n)}
        >
              {isEditing ? (
                <textarea
                  ref={editAreaRef}
                  className="note-edit-area"
                  value={editing.text}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
                  }}
                  onBlur={commitEdit}
                  onPointerDown={(e) => e.stopPropagation()}
                  placeholder="내용을 입력하세요…"
                />
              ) : (
                <div className="note-text">{n.text}</div>
              )}

              <NoteToolbar
                note={n}
                isEditing={isEditing}
                editing={editing}
                setEditing={setEditing}
                onEdit={() => startEdit(n)}
                onCommit={commitEdit}
                onCancel={cancelEdit}
                onCycleColor={() => cycleColor(n.id)}
                onDuplicate={() => duplicateNote(n)}
                onDelete={() => { setNotes((prev) => prev.filter((x) => x.id !== n.id)); window.dispatchEvent(new CustomEvent("planary:delete-note", { detail: n.id })); }}
              />

              {!isEditing && (
                <div className="note-foot">
                  <span>{n.date}</span>
                </div>
              )}
            </div>);
        })}
        </div> :

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filteredNotes.map((n) => {
            const isEditing = editing && editing.id === n.id;
            const displayColor = isEditing ? editing.color : n.color;
            return (
        <div
          key={n.id}
          className={`note note-${displayColor} ${isEditing ? "is-editing" : ""}`}
          style={{
            position: "relative",
            width: "auto",
            left: 0, top: 0,
            transform: "rotate(-0.5deg)",
            minHeight: 140,
            cursor: isEditing ? "default" : "default"
          }}
          onDoubleClick={() => !isEditing && startEdit(n)}
        >
              {isEditing ? (
                <textarea
                  ref={editAreaRef}
                  className="note-edit-area"
                  value={editing.text}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") cancelEdit();
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
                  }}
                  onBlur={commitEdit}
                  placeholder="내용을 입력하세요…"
                />
              ) : (
                <div className="note-text">{n.text}</div>
              )}

              <NoteToolbar
                note={n}
                isEditing={isEditing}
                editing={editing}
                setEditing={setEditing}
                onEdit={() => startEdit(n)}
                onCommit={commitEdit}
                onCancel={cancelEdit}
                onCycleColor={() => cycleColor(n.id)}
                onDuplicate={() => duplicateNote(n)}
                onDelete={() => { setNotes((prev) => prev.filter((x) => x.id !== n.id)); window.dispatchEvent(new CustomEvent("planary:delete-note", { detail: n.id })); }}
              />

              {!isEditing && (
                <div className="note-foot">
                  <span>{n.date}</span>
                </div>
              )}
            </div>);
          })}
        </div>
      }
    </div>);

}

/* ---------- Note Toolbar (hover/edit actions) ---------- */
function NoteToolbar({ note, isEditing, editing, setEditing, onEdit, onCommit, onCancel, onCycleColor, onDuplicate, onDelete }) {
  if (isEditing) {
    const COLORS = ["yellow", "pink", "blue", "green", "purple", "orange", "mint"];
    return (
      <div className="note-toolbar is-editing" onPointerDown={(e) => e.stopPropagation()}>
        <div className="note-color-strip">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              className={`note-color-swatch note-${c} ${editing.color === c ? "is-on" : ""}`}
              onClick={() => setEditing({ ...editing, color: c })}
              onMouseDown={(e) => e.preventDefault()}
            />
          ))}
        </div>
        <div className="note-edit-actions">
          <button
            type="button"
            className="note-edit-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCancel}
            title="취소 (Esc)"
          >취소</button>
          <button
            type="button"
            className="note-edit-btn is-primary"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCommit}
            title="저장 (⌘+Enter)"
          >저장</button>
        </div>
      </div>
    );
  }
  return (
    <div className="note-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="note-icon-btn" onClick={onEdit} title="편집 (더블클릭)">
        <Icon name="edit" size={11} />
      </button>
      <button type="button" className="note-icon-btn" onClick={onCycleColor} title="색상 바꾸기">
        <Icon name="sparkles" size={11} />
      </button>
      <button type="button" className="note-icon-btn" onClick={onDuplicate} title="복제">
        <Icon name="copy" size={11} />
      </button>
      <button type="button" className="note-icon-btn is-danger" onClick={onDelete} title="삭제">
        <Icon name="trash" size={11} />
      </button>
    </div>
  );
}

/* ===========================================================
   WIKI
   =========================================================== */
function WikiPage() {
  const [tree, setTree] = useStateO(() => [...(window.Planary.WIKI_TREE || [])]);
  const [activeId, setActiveId] = useStateO("w3"); // "컬러 토큰"
  const [docBlocks, setDocBlocks] = useStateO([]); // sync from <WikiBlocks/>
  const [pendingDelete, setPendingDelete] = useStateO(null); // node being confirmed for deletion
  const [treeMenuFor, setTreeMenuFor] = useStateO(null); // node id whose ··· menu is open
  const [renamingId, setRenamingId] = useStateO(null); // node id being renamed inline
  const [renameDraft, setRenameDraft] = useStateO("");
  const renameInputRef = useRefO(null);
  const [duplicating, setDuplicating] = useStateO(null); // { node } | null
  const [addMenuFor, setAddMenuFor] = useStateO(null); // node id whose + add menu is open
  // Drag-and-drop reordering
  const [dragId, setDragId] = useStateO(null);
  const [dropTarget, setDropTarget] = useStateO(null); // { id, pos: "before"|"after"|"inside" }
  const [showAside, setShowAside] = useStateO(() => typeof window !== 'undefined' && window.innerWidth > 1280);
  const [showTree, setShowTree] = useStateO(() => typeof window !== 'undefined' && window.innerWidth > 1024);
  const [pageIcons, setPageIcons] = useStateO({});
  const [expanded, setExpanded] = useStateO({ w1: true, w2: true, w5: false, w7: false }); // tree open state
  const [search, setSearch] = useStateO("");
  const [shareOpen, setShareOpen] = useStateO(false);
  const [coverPanelOpen, setCoverPanelOpen] = useStateO(false);
  const [coverMenuOpen, setCoverMenuOpen] = useStateO(false);
  const [coverImage, setCoverImage] = useStateO(null); // url | null
  const [coverPosX, setCoverPosX] = useStateO(50); // 0-100
  const [coverPosY, setCoverPosY] = useStateO(50);
  const [coverHeight, setCoverHeight] = useStateO(180); // 120-360
  const [coverZoom, setCoverZoom] = useStateO(100); // 100-220
  const coverSaveTimerRef = useRefO(null);
  const coverLoadingRef = useRefO(false); // true while syncing from Firestore
  const fileInputRef = useRefO(null);
  const docScrollRef = useRefO(null);
  const [favorite, setFavorite] = useStateO(false);
  const [moreMenuOpen, setMoreMenuOpen] = useStateO(false);
  const [historyOpen, setHistoryOpen] = useStateO(false);
  const [infoOpen, setInfoOpen] = useStateO(false);
  const [favorites, setFavorites] = useStateO(() => new Set());
  const [exportMenuOpen, setExportMenuOpen] = useStateO(false);
  const [tagInputOpen, setTagInputOpen] = useStateO(false);
  const [tagDraft, setTagDraft] = useStateO("");
  const [titleDraft, setTitleDraft] = useStateO("");
  const tagInputRef = useRefO(null);
  const titleInputRef = useRefO(null);
  const active = tree.find((w) => w.id === activeId) || tree[0] || { id: "", title: "", icon: "📄", tags: [], parent: null };
  const activeIcon = pageIcons[activeId] !== undefined ? pageIcons[activeId] : active.icon;
  const setActiveIcon = (v) => {
    setPageIcons(prev => ({ ...prev, [activeId]: v }));
    setTree(prev => prev.map(w => w.id === activeId ? { ...w, icon: v } : w));
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { icon: v } },
    }));
  };
  const currentPageMeta = useMemoO(() => {
    const chain = [];
    let cur = active;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent ? tree.find(w => w.id === cur.parent) : null;
    }
    const headingText = docBlocks
      .filter((b) => /^h[1-3]$/.test(b.type || ""))
      .map((b) => String(b.content || "").replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
    const inferred = new Set([
      ...chain.slice(0, -1).map((w) => w.title),
      ...headingText.slice(0, 2),
      ...(Array.isArray(active.tags) ? active.tags : []),
    ]);
    return {
      section: chain.length > 1 ? chain[chain.length - 2].title : "워크스페이스",
      tags: [...inferred].filter(Boolean).slice(0, 4),
    };
  }, [activeId, tree, docBlocks]);
  useEffectO(() => {
    setTitleDraft(active.title || "");
    setTagInputOpen(false);
    setTagDraft("");
  }, [activeId, active.title]);

  // Sync cover state from Firestore data when active page changes
  useEffectO(() => {
    coverLoadingRef.current = true;
    setCoverImage(active.cover || null);
    setCoverPosX(active.coverPosX ?? 50);
    setCoverPosY(active.coverPosY ?? 50);
    setCoverHeight(active.coverHeight ?? 180);
    setCoverZoom(active.coverZoom ?? 100);
    // Allow one animation frame before enabling slider save-effects
    requestAnimationFrame(() => { coverLoadingRef.current = false; });
  }, [activeId]);

  // Save cover position/size slider changes (debounced)
  useEffectO(() => {
    if (coverLoadingRef.current || !activeId) return;
    clearTimeout(coverSaveTimerRef.current);
    coverSaveTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
        detail: { id: activeId, patch: {
          coverPositionX: coverPosX,
          coverPosition: coverPosY,
          coverHeight,
          coverZoom,
        }},
      }));
    }, 400);
    return () => clearTimeout(coverSaveTimerRef.current);
  }, [coverPosX, coverPosY, coverHeight, coverZoom]);

  useEffectO(() => {
    if (tagInputOpen) tagInputRef.current?.focus();
  }, [tagInputOpen]);
  const commitTitle = () => {
    const title = titleDraft.trim() || "제목 없음";
    if (title === active.title) return;
    setTree((prev) => prev.map((w) => w.id === activeId ? { ...w, title } : w));
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { title } },
    }));
  };
  const addPageTag = (value = tagDraft) => {
    const tag = value && value.trim().replace(/^#/, "");
    if (!tag) return;
    const nextTags = [...new Set([...(Array.isArray(active.tags) ? active.tags : []), tag])];
    setTree((prev) => prev.map((w) => w.id === activeId ? { ...w, tags: nextTags } : w));
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { tags: nextTags } },
    }));
    setTagDraft("");
    setTagInputOpen(false);
  };

  const COVER_GALLERY = [
  { id: "g1", label: "Violet wash", style: { background: "linear-gradient(135deg, #7f0df2, #9b3ff7)" } },
  { id: "g2", label: "Indigo dawn", style: { background: "linear-gradient(135deg, #3b82f6, #7f0df2)" } },
  { id: "g3", label: "Emerald calm", style: { background: "linear-gradient(135deg, #047857, #10b981)" } },
  { id: "g4", label: "Sunset", style: { background: "linear-gradient(135deg, #f59e0b, #e11d48)" } },
  { id: "g5", label: "Slate", style: { background: "linear-gradient(135deg, #1e293b, #475569)" } },
  { id: "g6", label: "Sky", style: { background: "linear-gradient(135deg, #60a5fa, #34d399)" } }];


  const saveCoverUrl = (url) => {
    window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
      detail: { id: activeId, patch: { coverUrl: url } },
    }));
  };

  const handleFilePick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const cssUrl = `url("${reader.result}")`;
      setCoverImage(cssUrl);
      setCoverMenuOpen(false);
      saveCoverUrl(cssUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAddByUrl = () => {
    const url = window.prompt("이미지 URL을 입력하세요", "");
    if (!url) return;
    const cssUrl = `url("${url.replace(/"/g, '\\"')}")`;
    setCoverImage(cssUrl);
    setCoverMenuOpen(false);
    saveCoverUrl(cssUrl);
  };

  const handlePickGallery = (g) => {
    setCoverImage(g.style.background);
    setCoverMenuOpen(false);
    saveCoverUrl(g.style.background);
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    setCoverPanelOpen(false);
    saveCoverUrl(null);
  };

  // Build tree: roots and children
  const roots = tree.filter((w) => !w.parent);
  const childrenOf = (id) => tree.filter((w) => w.parent === id);

  const toggleNode = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const matchSearch = (w) => !search || w.title.toLowerCase().includes(search.toLowerCase());

  // Sync tree → global on every change so other parts of the app see updates
  useEffectO(() => {
    window.Planary.WIKI_TREE = tree;
  }, [tree]);

  // Live-sync wiki tree from firebase-bridge
  useEffectO(() => {
    const onLoaded = (e) => {
      const d = e.detail || {};
      if (Array.isArray(d.tree)) {
        setTree(d.tree);
        setActiveId((cur) => d.tree.some((w) => w.id === cur) ? cur : (d.tree[0]?.id || cur));
      }
    };
    window.addEventListener("planary:wiki-loaded", onLoaded);
    return () => window.removeEventListener("planary:wiki-loaded", onLoaded);
  }, []);

  // Scroll doc area to top on page change
  useEffectO(() => {
    if (docScrollRef.current) docScrollRef.current.scrollTop = 0;
  }, [activeId]);

  // Collect a page and all its descendants
  const collectDescendants = (id) => {
    const result = [id];
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop();
      tree.filter((w) => w.parent === cur).forEach((w) => {
        result.push(w.id);
        stack.push(w.id);
      });
    }
    return result;
  };

  const startRename = (node) => {
    setRenameDraft(node.title);
    setRenamingId(node.id);
    setTreeMenuFor(null);
  };

  // Add a new page (called from + button menu)
  const addPage = (parent, type) => {
    const id = `w${Date.now()}`;
    const presets = {
      blank:    { icon: "📄", title: "새 페이지" },
      meeting:  { icon: "🗓️", title: "회의록", body: "헤더에 일시·참석자, 본문에 안건·결정·액션 아이템" },
      research: { icon: "🔬", title: "리서치 노트", body: "가설 · 방법 · 결과 · 다음 단계" },
      okr:      { icon: "🎯", title: "OKR & 마일스톤", body: "분기 목표와 핵심 결과" },
    };
    const preset = presets[type] || presets.blank;
    const newNode = { id, title: preset.title, icon: preset.icon, parent: parent || null, tags: [], orderIndex: Date.now() };
    setTree((prev) => [...prev, newNode]);
    if (parent) setExpanded((prev) => ({ ...prev, [parent]: true }));
    setActiveId(id);
    // Auto enter rename for the new page
    setTimeout(() => startRename(newNode), 80);
    window.dispatchEvent(new CustomEvent("planary:create-wiki-page", {
      detail: { clientId: id, title: preset.title, parentId: parent || null },
    }));
    window.Planary.toast?.({ type: "ok", title: "새 페이지가 추가됐어요", ttl: 1800 });
  };

  const commitRename = () => {
    if (!renamingId) return;
    const v = renameDraft.trim();
    if (v) {
      setTree((prev) => prev.map((w) => w.id === renamingId ? { ...w, title: v } : w));
      window.dispatchEvent(new CustomEvent("planary:update-wiki-page-meta", {
        detail: { id: renamingId, patch: { title: v } },
      }));
      window.Planary.toast?.({ type: "ok", title: "이름이 변경됐어요", ttl: 1800 });
    }
    setRenamingId(null);
    setRenameDraft("");
  };
  const cancelRename = () => { setRenamingId(null); setRenameDraft(""); };

  // Focus the input when inline rename starts
  useEffectO(() => {
    if (renamingId && renameInputRef.current) {
      const el = renameInputRef.current;
      el.focus();
      el.select();
    }
  }, [renamingId]);
  const executeDelete = () => {
    if (!pendingDelete) return;
    const idsToRemove = new Set(collectDescendants(pendingDelete.id));
    idsToRemove.forEach((wid) => {
      window.dispatchEvent(new CustomEvent("planary:delete-wiki-page", { detail: wid }));
    });
    setTree((prev) => prev.filter((w) => !idsToRemove.has(w.id)));
    if (idsToRemove.has(activeId)) {
      const survivors = tree.filter((w) => !idsToRemove.has(w.id));
      const first = survivors.find((w) => !w.parent) || survivors[0];
      if (first) setActiveId(first.id);
    }
    window.Planary.toast?.({
      type: "ok",
      title: `"${pendingDelete.title}" 삭제됨`,
      sub: idsToRemove.size > 1 ? `${idsToRemove.size}개 페이지가 함께 삭제됐어요` : undefined,
    });
    setPendingDelete(null);
  };

  // Drag-and-drop reorder/reparent helpers
  const isDescendantOf = (ancestorId, candidateId) => {
    if (ancestorId === candidateId) return true;
    let cur = tree.find((w) => w.id === candidateId);
    while (cur && cur.parent) {
      if (cur.parent === ancestorId) return true;
      cur = tree.find((w) => w.id === cur.parent);
    }
    return false;
  };

  const moveNode = (sourceId, targetId, position) => {
    if (sourceId === targetId) return;
    if (isDescendantOf(sourceId, targetId)) {
      window.Planary.toast?.({ type: "err", title: "하위 페이지로 이동할 수 없어요" });
      return;
    }
    setTree((prev) => {
      const src = prev.find((w) => w.id === sourceId);
      const tgt = prev.find((w) => w.id === targetId);
      if (!src || !tgt) return prev;
      const without = prev.filter((w) => w.id !== sourceId);
      let newParent = position === "inside" ? targetId : (tgt.parent || null);
      const newSrc = { ...src, parent: newParent };
      const out = [];
      let inserted = false;
      if (position === "inside") {
        // place at end
        out.push(...without, newSrc);
        inserted = true;
      } else {
        const anchor = position === "before" ? "before" : "after";
        for (const w of without) {
          if (anchor === "before" && w.id === targetId && !inserted) {
            out.push(newSrc); inserted = true;
          }
          out.push(w);
          if (anchor === "after" && w.id === targetId && !inserted) {
            out.push(newSrc); inserted = true;
          }
        }
        if (!inserted) out.push(newSrc);
      }
      return out;
    });
    if (position === "inside") {
      setExpanded((prev) => ({ ...prev, [targetId]: true }));
    }
    window.Planary.toast?.({ type: "ok", title: "페이지가 이동됐어요", ttl: 1800 });
  };

  const TreeNode = ({ node, depth = 0 }) => {
    const kids = childrenOf(node.id);
    const hasKids = kids.length > 0;
    const isOpen = !!expanded[node.id];
    // Auto-expand if any descendant matches search
    const expandedBySearch = search && (matchSearch(node) || tree.some((w) => w.parent === node.id && matchSearch(w)));
    const open = isOpen || expandedBySearch;
    const isDragSource = dragId === node.id;
    const dropPos = dropTarget && dropTarget.id === node.id ? dropTarget.pos : null;
    const isMenuOpen = treeMenuFor === node.id;

    if (search && !matchSearch(node) && !kids.some((k) => matchSearch(k))) return null;

    const onDragStartEvt = (e) => {
      setDragId(node.id);
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", node.id); } catch (_) {}
    };

    const onDragOverEvt = (e) => {
      if (!dragId || dragId === node.id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const h = rect.height;
      let pos;
      if (y < h * 0.25) pos = "before";
      else if (y > h * 0.75) pos = "after";
      else pos = "inside";
      setDropTarget({ id: node.id, pos });
    };

    const onDragLeaveEvt = (e) => {
      // Only clear if leaving the row entirely
      if (!e.currentTarget.contains(e.relatedTarget)) {
        if (dropTarget && dropTarget.id === node.id) setDropTarget(null);
      }
    };

    const onDropEvt = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragId && dragId !== node.id && dropTarget && dropTarget.id === node.id) {
        moveNode(dragId, node.id, dropTarget.pos);
      }
      setDragId(null);
      setDropTarget(null);
    };

    const onDragEndEvt = () => { setDragId(null); setDropTarget(null); };

    return (
      <div>
        <div
          className={`wiki-tree-item ${activeId === node.id ? "is-active" : ""} ${isDragSource ? "is-drag-src" : ""} ${dropPos ? `drop-${dropPos}` : ""}`}
          style={{ paddingLeft: 6 + depth * 14 }}
          onClick={() => setActiveId(node.id)}
          draggable
          onDragStart={onDragStartEvt}
          onDragOver={onDragOverEvt}
          onDragLeave={onDragLeaveEvt}
          onDrop={onDropEvt}
          onDragEnd={onDragEndEvt}
        >

          {hasKids ?
          <button
            className={`wiki-tree-toggle ${open ? "is-open" : ""}`}
            onClick={(e) => {e.stopPropagation();toggleNode(node.id);}}
            title={open ? "접기" : "펼치기"}>

              <Icon name="chevronRight" size={11} />
            </button> :

          <span style={{ width: 18, display: "inline-block" }} />
          }
          <span style={{ fontSize: 14 }}>{node.icon}</span>
          {renamingId === node.id ? (
            <input
              ref={renameInputRef}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") cancelRename();
              }}
              onBlur={commitRename}
              className="wiki-tree-rename-input"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            <span
              style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              onDoubleClick={(e) => { e.stopPropagation(); startRename(node); }}
              title="더블클릭으로 이름 변경"
            >
              {node.title}
            </span>
          )}

          <div className="wiki-tree-actions" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="wiki-tree-action-btn"
              title="페이지 추가"
              onClick={(e) => {
                e.stopPropagation();
                setAddMenuFor(addMenuFor === node.id ? null : node.id);
                setTreeMenuFor(null);
              }}
            >
              <Icon name="plus" size={11} />
            </button>
            <button
              type="button"
              className="wiki-tree-action-btn"
              title="더 보기"
              onClick={(e) => {
                e.stopPropagation();
                setTreeMenuFor(isMenuOpen ? null : node.id);
                setAddMenuFor(null);
              }}
            >
              <Icon name="more" size={12} />
            </button>
          </div>

          {hasKids && !isMenuOpen && addMenuFor !== node.id &&
          <span style={{ fontSize: 10, color: "var(--text-faint)" }} className="wiki-tree-count">
              {kids.length}
            </span>
          }

          {addMenuFor === node.id && (
            <div
              className="popover"
              style={{ position: "absolute", right: 0, top: "calc(100% + 2px)", zIndex: 30, minWidth: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popover-header" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", padding: "6px 10px 4px" }}>
                {node.title} 안에 추가
              </div>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "blank"); setAddMenuFor(null); }}>
                <Icon name="document" size={12} />
                <div style={{ flex: 1 }}>
                  <div>빈 페이지</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>제목 없이 새로 시작</div>
                </div>
              </button>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "meeting"); setAddMenuFor(null); }}>
                <Icon name="calendar" size={12} />
                <div style={{ flex: 1 }}>
                  <div>회의록</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>일시·안건·결정 템플릿</div>
                </div>
              </button>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "research"); setAddMenuFor(null); }}>
                <Icon name="sparkles" size={12} />
                <div style={{ flex: 1 }}>
                  <div>리서치 노트</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>가설·방법·결과 템플릿</div>
                </div>
              </button>
              <button type="button" className="popover-item" onClick={() => { addPage(node.id, "okr"); setAddMenuFor(null); }}>
                <Icon name="target" size={12} />
                <div style={{ flex: 1 }}>
                  <div>OKR & 마일스톤</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)" }}>분기 목표 템플릿</div>
                </div>
              </button>
              <div className="popover-sep" />
              <button type="button" className="popover-item" onClick={() => { addPage(node.parent, "blank"); setAddMenuFor(null); }}>
                <Icon name="arrowRight" size={12} style={{ transform: "rotate(-90deg)" }} />
                <span>같은 레벨에 추가</span>
              </button>
            </div>
          )}

          {isMenuOpen && (
            <div
              className="popover"
              style={{ position: "absolute", right: 0, top: "calc(100% + 2px)", zIndex: 30, minWidth: 160 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="popover-item" onClick={() => { setActiveId(node.id); setTreeMenuFor(null); }}>
                <Icon name="eye" size={12} />열기
              </div>
              <div className="popover-item" onClick={() => { addPage(node.id, "blank"); setTreeMenuFor(null); }}>
                <Icon name="document" size={12} />하위 페이지 추가
              </div>
              <div className="popover-item" onClick={() => startRename(node)}>
                <Icon name="edit" size={12} />이름 변경
              </div>
              <div className="popover-item" onClick={() => { setDuplicating({ node }); setTreeMenuFor(null); }}>
                <Icon name="copy" size={12} />복제
              </div>
              <div className="popover-sep" />
              <div
                className="popover-item is-danger"
                onClick={() => { setPendingDelete(node); setTreeMenuFor(null); }}
              >
                <Icon name="trash" size={12} />삭제
              </div>
            </div>
          )}
        </div>
        {hasKids &&
        <div
          className={`wiki-tree-children ${open ? "is-open" : "is-closed"}`}
          style={{ maxHeight: open ? `${kids.length * 80}px` : 0 }}>

            {kids.map((k) => <TreeNode key={k.id} node={k} depth={depth + 1} />)}
          </div>
        }
      </div>);

  };

  if (tree.length === 0) {
    return (
      <div className="page-wide">
        <div className="wiki-empty">
          <div className="wiki-empty-icon" aria-hidden="true">📝</div>
          <h2 className="wiki-empty-title">노트를 추가하세요!</h2>
          <p className="wiki-empty-sub">아직 페이지가 없어요. 첫 번째 노트를 만들어 시작해 보세요.</p>
          <button
            className="btn btn-primary"
            onClick={() => addPage(null, "blank")}
            type="button"
          >
            <Icon name="plus" size={14} />새 페이지 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wide">
      <div className="wiki-shell" data-tree={showTree ? "open" : "closed"} data-aside={showAside ? "open" : "closed"}>
        {(showTree || showAside) && (
          <div
            className={`wiki-drawer-scrim ${(showTree || showAside) ? "is-open" : ""}`}
            onClick={() => { setShowTree(false); setShowAside(false); }}
          />
        )}
        {showTree && <aside className="wiki-tree">
          <button className="wiki-drawer-close" onClick={() => setShowTree(false)} aria-label="페이지 목록 닫기">
            <Icon name="x" size={16} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 10px", borderBottom: "1px solid var(--border-soft)", marginBottom: 6 }}>
            <Icon name="search" size={12} style={{ color: "var(--text-lo)" }} />
            <input
              placeholder="페이지 검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, border: 0, background: "transparent", outline: "none", fontSize: 13, color: "var(--text-hi)" }} />
            
            {search ?
            <button className="icon-btn" onClick={() => setSearch("")} style={{ width: 18, height: 18 }}>
                <Icon name="x" size={10} />
              </button> :

            <span className="kbd">/</span>
            }
          </div>
          <div>
            {roots.map((r) => <TreeNode key={r.id} node={r} />)}
          </div>
          <button
            className="wiki-tree-item wiki-tree-add"
            type="button"
            onClick={() => addPage(null, "blank")}
            style={{ color: "var(--text-lo)", marginTop: 4, width: "100%" }}>
            <span style={{ width: 18, display: "inline-block" }} />
            <Icon name="plus" size={12} />
            <span>새 페이지</span>
          </button>
        </aside>}

        <div className="wiki-doc" ref={docScrollRef}>
          <div
            className={`wiki-cover ${coverPanelOpen ? "is-editing" : ""}`}
            style={{ height: coverHeight, "--cover-pos-x": `${coverPosX}%`, "--cover-pos-y": `${coverPosY}%`, "--cover-zoom": `${coverZoom}%` }}>
            
            {coverImage ?
            <div
              className="wiki-cover-canvas"
              style={{ background: coverImage, backgroundSize: `${coverZoom}% auto`, backgroundPosition: `${coverPosX}% ${coverPosY}%`, backgroundRepeat: "no-repeat" }} /> :


            <div className="wiki-cover-canvas" style={{ background: "var(--surface-2)", backgroundImage: "none" }} />
            }

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFilePick} />
            

            <div className="wiki-cover-controls">
              {coverImage ?
              <>
                  <button
                  className={`wiki-cover-pill ${coverMenuOpen ? "is-active" : ""}`}
                  onClick={() => {setCoverMenuOpen(!coverMenuOpen);setCoverPanelOpen(false);}}
                  type="button">
                  
                    <Icon name="image" size={11} />커버 변경
                  </button>
                  <button
                  className={`wiki-cover-pill ${coverPanelOpen ? "is-active" : ""}`}
                  onClick={() => {setCoverPanelOpen(!coverPanelOpen);setCoverMenuOpen(false);}}
                  type="button">
                  
                    <Icon name="settings" size={11} />위치 / 크기
                  </button>
                  <button
                  className="wiki-cover-pill"
                  onClick={handleRemoveCover}
                  type="button">
                  
                    <Icon name="x" size={11} />제거
                  </button>
                </> :

              <button
                className={`wiki-cover-pill ${coverMenuOpen ? "is-active" : ""}`}
                onClick={() => setCoverMenuOpen(!coverMenuOpen)}
                type="button">
                
                  <Icon name="plus" size={11} />커버 추가
                </button>
              }
            </div>

            {coverMenuOpen &&
            <div className="wiki-cover-panel" style={{ width: 280, top: 50 }}>
                <div className="kicker" style={{ marginBottom: 10 }}>커버 이미지</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  <button
                  className="popover-item"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  type="button">
                  
                    <Icon name="image" size={14} />
                    <div style={{ flex: 1 }}>
                      <div>로컬 파일 업로드</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>PNG · JPG · WebP · 5MB까지</div>
                    </div>
                  </button>
                  <button className="popover-item" onClick={handleAddByUrl} type="button">
                    <Icon name="link" size={14} />
                    <div style={{ flex: 1 }}>
                      <div>이미지 URL로 추가</div>
                      <div style={{ fontSize: 10, color: "var(--text-faint)" }}>외부 링크</div>
                    </div>
                  </button>
                </div>
                <div className="kicker" style={{ marginBottom: 8 }}>갤러리</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {COVER_GALLERY.map((g) =>
                <button
                  key={g.id}
                  onClick={() => handlePickGallery(g)}
                  type="button"
                  title={g.label}
                  style={{
                    height: 48,
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border-soft)",
                    cursor: "pointer",
                    ...g.style,
                    transition: "transform var(--dur-fast)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"} />

                )}
                </div>
              </div>
            }

            {coverPanelOpen && coverImage &&
            <div className="wiki-cover-panel">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="kicker">위치 & 크기</div>
                  <button
                  className="icon-btn"
                  onClick={() => {setCoverPosX(50);setCoverPosY(50);setCoverHeight(180);setCoverZoom(100);}}
                  title="기본값으로 되돌리기">
                  
                    <Icon name="refresh" size={12} />
                  </button>
                </div>
                <div className="cover-slider-row">
                  <label>가로 위치 <span className="val">{coverPosX}%</span></label>
                  <input className="cover-slider" type="range" min="0" max="100" value={coverPosX} onChange={(e) => setCoverPosX(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverPosX: Number(e.target.value) })} />
                </div>
                <div className="cover-slider-row">
                  <label>세로 위치 <span className="val">{coverPosY}%</span></label>
                  <input className="cover-slider" type="range" min="0" max="100" value={coverPosY} onChange={(e) => setCoverPosY(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverPosY: Number(e.target.value) })} />
                </div>
                <div className="cover-slider-row">
                  <label>면적 (높이) <span className="val">{coverHeight}px</span></label>
                  <input className="cover-slider" type="range" min="120" max="360" value={coverHeight} onChange={(e) => setCoverHeight(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverHeight: Number(e.target.value) })} />
                </div>
                <div className="cover-slider-row">
                  <label>확대 <span className="val">{coverZoom}%</span></label>
                  <input className="cover-slider" type="range" min="100" max="220" value={coverZoom} onChange={(e) => setCoverZoom(Number(e.target.value))} onPointerUp={(e) => persistCoverMeta({ coverZoom: Number(e.target.value) })} />
                </div>
                <button className="btn btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => setCoverPanelOpen(false)}>
                  완료
                </button>
              </div>
            }

            <div className="wiki-icon-host">
              <window.Planary.IconPicker
                value={activeIcon}
                onChange={setActiveIcon}
                size={64}
                color="var(--surface)"
              />
            </div>
          </div>
          <div className="wiki-doc-meta">
            <button
              className="btn btn-sm"
              onClick={() => setShowTree(s => !s)}
              title="페이지 목록"
              style={{ marginRight: 4 }}
            >
              <Icon name="menu" size={12} />페이지
            </button>
            {(() => {
              // Build ancestry chain from root to current page
              const chain = [];
              let cur = active;
              while (cur) {
                chain.unshift(cur);
                cur = cur.parent ? tree.find(w => w.id === cur.parent) : null;
              }
              return chain.map((node, i) => {
                const isLast = i === chain.length - 1;
                return (
                  <React.Fragment key={node.id}>
                    {i > 0 && <Icon name="chevronRight" size={11} />}
                    {isLast ? (
                      <span style={{ color: "var(--text-hi)", fontWeight: 600 }}>{node.title}</span>
                    ) : (
                      <button
                        className="wiki-crumb"
                        onClick={() => setActiveId(node.id)}
                        title={`${node.title}(으)로 이동`}
                      >
                        <span className="wiki-crumb-icon">{node.icon}</span>
                        {node.title}
                      </button>
                    )}
                  </React.Fragment>
                );
              });
            })()}
            <div style={{ flex: 1 }} />
            <button
              className={`btn btn-sm ${showAside ? "btn-ghost" : ""}`}
              onClick={() => setShowAside(s => !s)}
              title="목차"
              style={{ background: showAside ? "var(--accent-soft)" : undefined, color: showAside ? "var(--accent)" : undefined }}
            >
              <Icon name="list" size={12} />목차
            </button>
            <span className="chip"><Icon name="clock" size={10} />12분 전</span>
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-sm btn-ghost"
                data-comment-anchor="03bfe54937-button-603-13"
                onClick={() => setShareOpen(true)}>
                
                <Icon name="share" size={12} />공유
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-sm"
                style={{ width: 28, padding: 0, justifyContent: "center" }}
                onClick={() => setMoreMenuOpen(o => !o)}
                title="페이지 작업"
              >
                <Icon name="more" size={14} />
              </button>
              {moreMenuOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 99 }}
                    onClick={() => setMoreMenuOpen(false)}
                  />
                  <div
                    className="popover"
                    style={{ top: "calc(100% + 6px)", right: 0, minWidth: 220, zIndex: 100 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ padding: "10px 12px 6px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 6, background: "var(--bg-elev)", display: "grid", placeItems: "center", fontSize: 16 }}>
                        {activeIcon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{active.title}</div>
                        <div style={{ fontSize: 10, color: "var(--text-faint)" }}>마지막 수정 · 12분 전</div>
                      </div>
                    </div>
                    <div className="popover-sep" />
                    <div
                      className="popover-item"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        const next = new Set(favorites);
                        const isFav = favorites.has(activeId);
                        if (isFav) next.delete(activeId); else next.add(activeId);
                        setFavorites(next);
                        window.Planary.toast?.({
                          type: "ok",
                          title: isFav ? "즐겨찾기에서 제거됨" : "즐겨찾기에 추가됨",
                          sub: active.title,
                        });
                      }}
                    >
                      <Icon name="star" size={14} style={favorites.has(activeId) ? { color: "var(--warn)", fill: "var(--warn)" } : undefined} />
                      <span style={{ flex: 1 }}>{favorites.has(activeId) ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}</span>
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); setDuplicating({ node: active }); }}>
                      <Icon name="copy" size={14} />페이지 복제
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); navigator.clipboard?.writeText(`https://planary.app/w/${active.id}`); window.Planary.toast?.({ type: "ok", title: "링크가 복사됐어요" }); }}>
                      <Icon name="link" size={14} />링크 복사
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); window.Planary.toast?.({ type: "info", title: "이동 패널을 열었어요" }); }}>
                      <Icon name="folder" size={14} />이동
                      <Icon name="chevronRight" size={11} style={{ marginLeft: "auto", color: "var(--text-faint)" }} />
                    </div>
                    <div className="popover-sep" />
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); setInfoOpen(true); }}>
                      <Icon name="document" size={14} />페이지 정보
                    </div>
                    <div className="popover-item" onClick={() => { setMoreMenuOpen(false); setHistoryOpen(true); }}>
                      <Icon name="clock" size={14} />수정 이력
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-faint)" }}>12</span>
                    </div>
                    <div
                      className="popover-item"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setExportMenuOpen(true);
                      }}
                    >
                      <Icon name="download" size={14} />내보내기
                      <Icon name="chevronRight" size={11} style={{ marginLeft: "auto", color: "var(--text-faint)" }} />
                    </div>
                    <div className="popover-sep" />
                    <div
                      className="popover-item is-danger"
                      onClick={() => { setMoreMenuOpen(false); setPendingDelete(active); }}
                    >
                      <Icon name="trash" size={14} />페이지 삭제
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span className="chip chip-accent"><Icon name="book" size={10} />{currentPageMeta.section}</span>
            {currentPageMeta.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
            {tagInputOpen ? (
              <span className="wiki-tag-input-chip">
                <Icon name="hash" size={10} />
                <input
                  ref={tagInputRef}
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addPageTag();
                    if (e.key === "Escape") { setTagDraft(""); setTagInputOpen(false); }
                  }}
                  onBlur={() => { if (tagDraft.trim()) addPageTag(); else setTagInputOpen(false); }}
                  placeholder="태그"
                />
              </span>
            ) : (
              <button className="chip wiki-tag-add-btn" onClick={() => setTagInputOpen(true)}><Icon name="plus" size={10} />태그</button>
            )}
          </div>
          <input
            ref={titleInputRef}
            className="wiki-doc-title wiki-doc-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitTitle(); titleInputRef.current?.blur(); }
              if (e.key === "Escape") { setTitleDraft(active.title || ""); titleInputRef.current?.blur(); }
            }}
            placeholder="제목 없음"
          />

          <WikiBlocks activeId={activeId} onBlocksChange={setDocBlocks} />
        </div>

        {showAside &&
        <aside className="wiki-aside">
            <button className="wiki-drawer-close" onClick={() => setShowAside(false)} aria-label="목차 닫기">
              <Icon name="x" size={16} />
            </button>
            <div className="wiki-aside-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="kicker">목차</div>
                <button className="icon-btn" onClick={() => setShowAside(false)} title="목차 접기">
                  <Icon name="chevronRight" size={12} />
                </button>
              </div>
              <WikiTOC blocks={docBlocks} />
            </div>

            <div className="wiki-aside-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="kicker">관련 작업</div>
                <span
                  className="info-tip"
                  title="이 페이지의 태그 또는 같은 프로젝트의 작업을 모아 보여줘요"
                  style={{ fontSize: 11, color: "var(--text-faint)", cursor: "help" }}
                >
                  <Icon name="info" size={12} style={{ verticalAlign: -2 }} />
                </span>
              </div>
              <RelatedTasks activePage={active} />
            </div>

            <div className="wiki-aside-card">
              <div className="kicker" style={{ marginBottom: 10 }}>백링크</div>
              <Backlinks activePage={active} />
            </div>
          </aside>}
      </div>
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} title={active.title} />}
      {historyOpen && <VersionHistoryDialog onClose={() => setHistoryOpen(false)} page={active} onRestore={(blocks) => {
        window.dispatchEvent(new CustomEvent("planary:wiki-restore", { detail: { id: active.id, blocks } }));
      }} />}
      {infoOpen && <PageInfoDialog onClose={() => setInfoOpen(false)} page={active} favorites={favorites} />}
      {exportMenuOpen && <ExportDialog onClose={() => setExportMenuOpen(false)} page={active} />}
      {duplicating && (
        <DuplicatePageDialog
          node={duplicating.node}
          tree={tree}
          collectDescendants={collectDescendants}
          onClose={() => setDuplicating(null)}
          onConfirm={(opts) => {
            // Create deep copy: new id for the source, and for each descendant if includeChildren
            const idMap = {};
            const newRoot = { ...duplicating.node, id: `w${Date.now()}`, title: opts.title };
            idMap[duplicating.node.id] = newRoot.id;
            const additions = [newRoot];
            if (opts.includeChildren) {
              const queue = [duplicating.node.id];
              while (queue.length) {
                const curId = queue.shift();
                tree.filter((w) => w.parent === curId).forEach((child) => {
                  const newId = `w${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
                  idMap[child.id] = newId;
                  additions.push({ ...child, id: newId, parent: idMap[child.parent] });
                  queue.push(child.id);
                });
              }
            }
            setTree((prev) => [...prev, ...additions]);
            if (duplicating.node.parent) setExpanded((prev) => ({ ...prev, [duplicating.node.parent]: true }));
            setActiveId(newRoot.id);
            window.Planary.toast?.({
              type: "ok",
              title: `"${opts.title}" 복제됨`,
              sub: additions.length > 1 ? `하위 페이지 ${additions.length - 1}개 포함` : undefined,
            });
            setDuplicating(null);
          }}
        />
      )}
      {pendingDelete && (
        <div className="dialog-scrim" onClick={() => setPendingDelete(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)" }}>
            <div className="dialog-head">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>페이지 삭제</h3>
                <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>이 작업은 되돌릴 수 없습니다</p>
              </div>
              <button className="icon-btn" onClick={() => setPendingDelete(null)}><Icon name="x" size={16} /></button>
            </div>
            <div style={{ padding: "16px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "var(--bg-elev)", borderRadius: "var(--r-md)" }}>
                <span style={{ fontSize: 28 }}>{pendingDelete.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{pendingDelete.title}</div>
                  {(() => {
                    const childCount = collectDescendants(pendingDelete.id).length - 1;
                    return (
                      <div style={{ fontSize: 11, color: childCount > 0 ? "var(--err)" : "var(--text-lo)", marginTop: 2 }}>
                        {childCount > 0 ? `하위 페이지 ${childCount}개가 함께 삭제됩니다` : "하위 페이지 없음"}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="dialog-foot">
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm" onClick={() => setPendingDelete(null)}>취소</button>
              <button
                className="btn btn-sm btn-primary"
                style={{ background: "var(--err)" }}
                onClick={executeDelete}
              >
                <Icon name="trash" size={12} />삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);

}

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
    const url = urlDraft.trim();
    if (!url) return;
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
              onClick={() => window.dispatchEvent(new CustomEvent("planary:delete-bookmark", { detail: b.id }))}
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

function archiveTaskActivityDateKey(task) {
  const value = task.completedAt || task.dueDate || task.due;
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString().slice(0, 10);
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  if (typeof value._seconds === "number") return new Date(value._seconds * 1000).toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return null;
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
    window.Planary.toast({ type: "ok", title: "보관함 내보내기 시작", sub: `${filtered.length}개 항목 · CSV로 다운로드 중…` });
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
        {filtered.map((t) =>
        <window.Planary.TaskCard key={t.id} task={t} onToggle={(id) => window.dispatchEvent(new CustomEvent('planary:toggle-task', { detail: id }))} projects={window.Planary.PROJECTS} />
        )}
      </div>
    </div>);

}

/* ===========================================================
   WIDGET VISIBILITY MANAGER
   =========================================================== */
function WidgetVisibilityManager({ t, setTweak }) {
  const defs = window.Planary.WIDGET_DEFS || [];
  const variant = t?.variant || 'balanced';
  const visibleWidgets = window.Planary.computeVisibleWidgets
    ? window.Planary.computeVisibleWidgets(t?.interests || [], t?.widgetVisibility || null)
    : Object.fromEntries(defs.map(w => [w.id, true]));

  const variantDefs = defs.filter(w => w.variants.includes(variant));
  const otherDefs   = defs.filter(w => !w.variants.includes(variant));

  const toggle = (id) => {
    const next = { ...visibleWidgets, [id]: !visibleWidgets[id] };
    setTweak('widgetVisibility', next);
    window.Planary.toast({ type: 'ok', title: `위젯 ${next[id] ? '켜짐' : '꺼짐'}` });
  };

  const variantLabel = { balanced: 'balanced', conservative: 'conservative', bold: 'bold' }[variant] || variant;

  return (
    <>
      {variantDefs.map(w => (
        <ProfileRow key={w.id} label={w.label} sub={`현재 레이아웃(${variantLabel})에서 사용`}>
          <div className={`switch ${visibleWidgets[w.id] ? 'is-on' : ''}`} onClick={() => toggle(w.id)} />
        </ProfileRow>
      ))}
      {otherDefs.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', margin: '12px 0 4px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            다른 레이아웃
          </div>
          {otherDefs.map(w => (
            <ProfileRow key={w.id} label={w.label} sub={w.variants.join(', ') + ' 레이아웃에서 사용됨'}>
              <div className={`switch ${visibleWidgets[w.id] ? 'is-on' : ''}`} onClick={() => toggle(w.id)} />
            </ProfileRow>
          ))}
        </>
      )}
    </>
  );
}

/* ===========================================================
   PROFILE
   =========================================================== */
function ProfilePage({ tasks, t, setTweak }) {
  const { USER, PROJECTS } = window.Planary;
  const [user, setUser] = useStateO(USER);
  const [editOpen, setEditOpen] = useStateO(false);
  const [signOutOpen, setSignOutOpen] = useStateO(false);
  const [switchOpen, setSwitchOpen] = useStateO(false);
  const [sessionsOpen, setSessionsOpen] = useStateO(false);
  const [tfaOpen, setTfaOpen] = useStateO(false);
  const [openMenu, setOpenMenu] = useStateO(null); // "font" | "sidebar" | "density" | "lang" | null
  const [lang, setLangState] = useStateO(() => window.PlanaryI18n?.getLang?.() || "ko");
  const [notifs, setNotifs] = useStateO({ email: true, push: true, gcal: true, apple: false, slack: false });

  // Sync user doc from firebase-bridge
  useEffectO(() => {
    const onUserDoc = (e) => {
      const d = e.detail || {};
      setUser((prev) => ({
        ...prev,
        name: d.displayName || prev.name,
        email: d.email || prev.email,
        avatar: d.photoURL ? `url("${d.photoURL}")` : prev.avatar,
        initials: (d.displayName || prev.name || "U").slice(0, 1).toUpperCase(),
        school: d.school || prev.school || "",
        studentId: d.studentId || prev.studentId || "",
        bio: d.bio || prev.bio || "",
      }));
      if (d.notifPrefs && typeof d.notifPrefs === "object") {
        setNotifs((prev) => ({ ...prev, ...d.notifPrefs }));
      }
    };
    window.addEventListener("planary:user-doc-loaded", onUserDoc);
    return () => window.removeEventListener("planary:user-doc-loaded", onUserDoc);
  }, []);
  const done = tasks.filter((x) => x.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const isImage = user.avatar && typeof user.avatar === "string" && user.avatar.startsWith("url(");
  const theme = t ? t.theme : "dark";
  const setTheme = (v) => setTweak && setTweak("theme", v);
  const fontOpts = [
    { id: "nanum-gothic", label: "Nanum Gothic" },
    { id: "nanum-myeongjo", label: "Nanum Myeongjo" },
    { id: "jakarta", label: "Plus Jakarta Sans" },
    { id: "pretendard", label: "Pretendard" },
    { id: "inter", label: "Inter" }
  ];
  const sidebarOpts = [{ id: "full", label: "풀 너비" }, { id: "compact", label: "컴팩트" }, { id: "icons", label: "아이콘만" }];
  const densityOpts = [{ id: "compact", label: "촘촘하게" }, { id: "regular", label: "보통" }, { id: "comfortable", label: "여유롭게" }];
  const langOpts = [
    { id: "ko", label: "한국어", flag: "🇰🇷" },
    { id: "en", label: "English", flag: "🇺🇸" },
    { id: "ja", label: "日本語", flag: "🇯🇵" },
    { id: "zh", label: "中文", flag: "🇨🇳" },
    { id: "es", label: "Español", flag: "🇪🇸" },
  ];
  const fontLabel = (fontOpts.find((o) => o.id === (t && t.font)) || fontOpts[0]).label;
  const sidebarLabel = (sidebarOpts.find((o) => o.id === (t && t.sidebar)) || sidebarOpts[0]).label;
  const densityLabel = (densityOpts.find((o) => o.id === (t && t.density)) || densityOpts[1]).label;
  const saveProfile = (draft) => {
    setUser(draft);
    window.Planary.USER = { ...window.Planary.USER, ...draft };
    window.dispatchEvent(new CustomEvent("planary:auth-changed", { detail: window.Planary.USER }));
    setEditOpen(false);
    window.dispatchEvent(new CustomEvent("planary:update-profile", {
      detail: {
        name: draft.name || null,
        avatar: draft.avatar || null,
        school: draft.school || null,
        studentId: draft.studentId || null,
        bio: draft.bio || null,
      },
    }));
    window.Planary.toast({ type: "ok", title: "프로필이 업데이트됐어요" });
  };

  return (
    <div className="page-wide">
      <div className="page-head">
        <div className="kicker">WORKSPACE · 마이페이지</div>
        <div className="page-title">설정 & 통계</div>
        <div className="page-sub">개인 설정과 활동 요약</div>
      </div>

      <div className="profile-grid">
        <div>
          <div className="profile-card">
            <div
              className="profile-avatar"
              style={{
                background: isImage ? `${user.avatar} center/cover no-repeat` : "var(--accent-soft)",
                color: "var(--accent)",
                boxShadow: "none"
              }}>
              
              {!isImage && user.initials}
            </div>
            <div className="profile-name-big">{user.name}</div>
            <div className="profile-email-md">{user.email}</div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              {user.memberSince && <span className="chip"><Icon name="clock" size={10} />{user.memberSince}</span>}
            </div>
            {user.bio && <p style={{ fontSize: 12, color: "var(--text-md)", marginTop: 14, lineHeight: 1.5 }}>{user.bio}</p>}
            <button className="btn btn-ghost" style={{ marginTop: 16, width: "100%" }} onClick={() => setEditOpen(true)}>
              <Icon name="edit" size={12} />프로필 편집
            </button>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="kicker" style={{ marginBottom: 12 }}>이번 주 활동</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div className="ring" style={{ "--p": pct, "--size": "64px", "--stroke": "6px" }}>
                <span className="ring-text">{pct}%</span>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-lo)" }}>완료율</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{done}/{tasks.length} 작업</div>
              </div>
            </div>
            {[
            { label: "포스트잇", val: window.Planary.NOTES.length, icon: "note" },
            { label: "노트 페이지", val: window.Planary.WIKI_TREE.length, icon: "book" },
            { label: "북마크", val: window.Planary.BOOKMARKS.length, icon: "bookmark" },
            { label: "활성 프로젝트", val: PROJECTS.length, icon: "layers" }].
            map((s) =>
            <div key={s.label} className="field-row">
                <span className="field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name={s.icon} size={14} style={{ color: "var(--text-lo)" }} />{s.label}
                </span>
                <span className="field-value" style={{ fontWeight: 700, color: "var(--text-hi)" }}>{s.val}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <EclassConnectionCard />

          <div className="card" style={{ padding: 0, marginTop: 12 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>외관</h3>
              <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>테마와 글꼴, 사이드바 형태를 바꿔보세요</p>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              <ProfileRow label="테마" sub={theme === "dark" ? "다크 모드" : "라이트 모드"}>
                <button className="btn btn-sm btn-ghost" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  <Icon name={theme === "dark" ? "sun" : "moon"} size={12} />{theme === "dark" ? "라이트로" : "다크로"}
                </button>
              </ProfileRow>
              <ProfileDropdownRow label="글꼴" value={fontLabel} options={fontOpts} selected={t && t.font}
              onSelect={(v) => setTweak("font", v)} open={openMenu === "font"}
              onOpen={() => setOpenMenu("font")} onClose={() => setOpenMenu(null)} />
              <ProfileDropdownRow label="사이드바" value={sidebarLabel} options={sidebarOpts} selected={t && t.sidebar}
              onSelect={(v) => setTweak("sidebar", v)} open={openMenu === "sidebar"}
              onOpen={() => setOpenMenu("sidebar")} onClose={() => setOpenMenu(null)} />
              <ProfileDropdownRow label="정보 밀도" value={densityLabel} options={densityOpts} selected={t && t.density}
              onSelect={(v) => setTweak("density", v)} open={openMenu === "density"}
              onOpen={() => setOpenMenu("density")} onClose={() => setOpenMenu(null)} />
              <ProfileDropdownRow
                label="언어 / Language"
                value={(langOpts.find(o => o.id === lang) || langOpts[0]).flag + " " + (langOpts.find(o => o.id === lang) || langOpts[0]).label}
                options={langOpts.map(o => ({ id: o.id, label: `${o.flag}  ${o.label}` }))}
                selected={lang}
                onSelect={(v) => {
                  setLangState(v);
                  window.PlanaryI18n?.setLang?.(v);
                  window.dispatchEvent(new CustomEvent("planary:save-preferences", { detail: { lang: v } }));
                  const msg = window.PlanaryI18n?.t?.("toast.langChanged") || "Language changed";
                  window.Planary.toast({ type: "ok", title: msg });
                }}
                open={openMenu === "lang"}
                onOpen={() => setOpenMenu("lang")}
                onClose={() => setOpenMenu(null)} />
              <ProfileRow label="키보드 단축키" sub="⌘K · ⌘N · / 등">
                <span className="chip chip-ok"><Icon name="check" size={9} stroke={3} />활성</span>
              </ProfileRow>
              <ProfileRow label="온보딩 다시 보기" sub="Planary 시작 가이드를 다시 실행합니다">
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    try { localStorage.removeItem("planary.onboarding.done"); } catch (_) {}
                    window.dispatchEvent(new CustomEvent("planary:open-onboarding"));
                  }}
                >
                  <Icon name="sparkles" size={12} />다시 보기
                </button>
              </ProfileRow>
              <ProfileRow label="사용자 가이드" sub="기능 사용법을 정리한 문서">
                <button
                  className="btn btn-sm"
                  onClick={() => window.dispatchEvent(new CustomEvent("planary:open-guide"))}
                >
                  <Icon name="book" size={12} />열기
                </button>
              </ProfileRow>
            </div>
          </div>

          <PasswordCard />

          {/* HOME WIDGETS */}
          <div className="card" style={{ marginTop: 12, padding: 0 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>홈 위젯</h3>
              <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>홈 화면에 표시할 위젯을 선택하세요</p>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              <WidgetVisibilityManager t={t} setTweak={setTweak} />
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 0 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>알림 & 동기화</h3>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              {[
              { id: "email", label: "이메일 알림", sub: notifs.email ? "주간 요약 발송" : "발송 안 함" },
              { id: "push", label: "백그라운드 푸시 알림", sub: (() => { const p = window.Planary?.getPushPermission?.(); if (!notifs.push) return "꺼짐"; if (p === "granted") return "켜짐 · 리마인더 및 e-Class 새 항목"; if (p === "denied") return "브라우저에서 알림이 차단됨"; return "켜짐 (권한 대기 중)"; })() },
              { id: "gcal", label: "Google Calendar", sub: notifs.gcal ? "연결됨 · 양방향 동기화" : "연결 안 됨" },
              { id: "apple", label: "Apple Calendar", sub: notifs.apple ? "연결됨" : "연결 안 됨" },
              { id: "slack", label: "Slack 통합", sub: notifs.slack ? "연결됨" : "연결 안 됨" }].
              map((r) =>
              <ProfileRow key={r.id} label={r.label} sub={r.sub}>
                  <div
                  className={`switch ${notifs[r.id] ? "is-on" : ""}`}
                  onClick={() => {
                    const next = !notifs[r.id];
                    setNotifs((prev) => ({ ...prev, [r.id]: next }));
                    window.dispatchEvent(new CustomEvent("planary:save-notif-prefs", { detail: { [r.id]: next } }));
                    window.dispatchEvent(new CustomEvent("planary:notif-prefs-changed", { detail: { [r.id]: next } }));
                    window.Planary.toast({ type: "ok", title: `${r.label} ${next ? "켜짐" : "꺼짐"}` });
                  }} />
                
                </ProfileRow>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 0 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>2단계 인증 & 세션</h3>
              <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>로그인 보안과 활성 기기를 관리합니다</p>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              <div className="field-row">
                <div>
                  <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>2단계 인증</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>로그인 시 추가 인증을 요청합니다</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="chip">설정 안 됨</span>
                  <button className="btn btn-sm" onClick={() => setTfaOpen(true)}>설정하기</button>
                </div>
              </div>
              <div className="field-row" style={{ borderBottom: 0 }}>
                <div>
                  <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>활성 세션</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>현재 이 기기 포함 1개 이상 기기에서 로그인됨</div>
                </div>
                <button className="btn btn-sm" onClick={() => setSessionsOpen(true)}>전체 보기</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 22, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>로그아웃 / 계정 관리</div>
              <div style={{ fontSize: 12, color: "var(--text-lo)" }}>이 기기에서 세션을 종료하거나 계정을 전환합니다</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setSwitchOpen(true)}>
                <Icon name="refresh" size={14} />계정 변경
              </button>
              <button className="btn btn-ghost" style={{ color: "var(--err)" }} onClick={() => setSignOutOpen(true)}>
                <Icon name="logout" size={14} />로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      {editOpen && <ProfileEditDialog user={user} onClose={() => setEditOpen(false)} onSave={saveProfile} />}
      {signOutOpen && <SignOutDialog onClose={() => setSignOutOpen(false)} user={user} />}
      {switchOpen && <window.Planary.AccountSwitcherDialog onClose={() => setSwitchOpen(false)} />}
      {sessionsOpen && <SessionsDialog onClose={() => setSessionsOpen(false)} />}
      {tfaOpen && <TwoFactorSetupDialog onClose={() => setTfaOpen(false)} userEmail={user.email} />}
    </div>);

}

/* ===========================================================
   PASSWORD CHANGE CARD
   =========================================================== */
function PasswordCard() {
  const [current, setCurrent] = useStateO("");
  const [next, setNext] = useStateO("");
  const [confirm, setConfirm] = useStateO("");
  const [showCurrent, setShowCurrent] = useStateO(false);
  const [showNext, setShowNext] = useStateO(false);
  const [submitting, setSubmitting] = useStateO(false);

  // Validation
  const hasLength = next.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(next);
  const hasNumber = /[0-9]/.test(next);
  const hasSymbol = /[^a-zA-Z0-9]/.test(next);
  const score = [hasLength, hasLetter, hasNumber, hasSymbol].filter(Boolean).length;
  const matches = next.length > 0 && next === confirm;
  const canSubmit = current.length >= 1 && hasLength && (hasLetter && hasNumber) && matches && !submitting;

  const strengthLabel = ["", "매우 약함", "약함", "보통", "강함", "매우 강함"][score];
  const strengthColor =
    score <= 1 ? "var(--err)" :
    score === 2 ? "var(--warn)" :
    score === 3 ? "var(--info)" :
    "var(--ok)";

  const submit = (e) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    window.dispatchEvent(new CustomEvent("planary:change-password", {
      detail: {
        current,
        next,
        onResult: (res) => {
          setSubmitting(false);
          if (res && res.ok) {
            setCurrent("");
            setNext("");
            setConfirm("");
          }
        },
      },
    }));
  };

  const inputWrap = {
    position: "relative",
  };
  const eyeBtn = {
    position: "absolute",
    right: 8, top: "50%", transform: "translateY(-50%)",
    width: 26, height: 26,
    display: "grid", placeItems: "center",
    color: "var(--text-lo)",
    background: "transparent", border: 0,
    borderRadius: 6, cursor: "pointer",
  };

  return (
    <div className="card" style={{ marginTop: 12, padding: 0 }}>
      <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>비밀번호</h3>
        <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
          정기적으로 변경하면 더 안전해요
        </p>
      </div>
      <form onSubmit={submit} style={{ padding: "16px 22px 18px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Current */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
              현재 비밀번호
            </label>
            <div style={inputWrap}>
              <input
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="현재 비밀번호 입력"
                autoComplete="current-password"
                className="form-input"
                style={{ paddingRight: 38 }}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={eyeBtn} title={showCurrent ? "감추기" : "보이기"} tabIndex={-1}>
                <Icon name={showCurrent ? "lock" : "eye"} size={13} />
              </button>
            </div>
          </div>

          {/* New */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
              새 비밀번호
            </label>
            <div style={inputWrap}>
              <input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="8자 이상, 영문 + 숫자 조합"
                autoComplete="new-password"
                className="form-input"
                style={{ paddingRight: 38 }}
              />
              <button type="button" onClick={() => setShowNext(!showNext)} style={eyeBtn} title={showNext ? "감추기" : "보이기"} tabIndex={-1}>
                <Icon name={showNext ? "lock" : "eye"} size={13} />
              </button>
            </div>
            {next.length > 0 && (
              <>
                <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 999,
                        background: i <= score ? strengthColor : "var(--surface-2)",
                        transition: "all var(--dur-fast)",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
                  <span style={{ color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                  <span style={{ color: "var(--text-faint)" }}>{next.length}자</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { ok: hasLength, label: "8자 이상" },
                    { ok: hasLetter, label: "영문 포함" },
                    { ok: hasNumber, label: "숫자 포함" },
                    { ok: hasSymbol, label: "특수문자 (권장)", optional: true },
                  ].map((req, i) => (
                    <div
                      key={i}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 10, fontWeight: 600,
                        color: req.ok ? "var(--ok)" : req.optional ? "var(--text-faint)" : "var(--text-lo)",
                      }}
                    >
                      <Icon name={req.ok ? "check" : "x"} size={10} stroke={3} />
                      {req.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
              새 비밀번호 확인
            </label>
            <input
              type={showNext ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="새 비밀번호를 다시 입력"
              autoComplete="new-password"
              className="form-input"
              style={confirm.length > 0 ? {
                borderColor: matches ? "color-mix(in oklab, var(--ok) 40%, var(--border))" : "color-mix(in oklab, var(--err) 40%, var(--border))",
              } : undefined}
            />
            {confirm.length > 0 && !matches && (
              <div style={{ fontSize: 11, color: "var(--err)", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="x" size={10} stroke={3} />비밀번호가 일치하지 않아요
              </div>
            )}
            {confirm.length > 0 && matches && (
              <div style={{ fontSize: 11, color: "var(--ok)", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="check" size={10} stroke={3} />일치합니다
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
          <button
            type="button"
            className="btn btn-sm"
            style={{ color: "var(--text-lo)" }}
            onClick={() => {
              const email = window.Planary.USER?.email;
              if (!email) { window.Planary.toast?.({ type: "err", title: "이메일 정보가 없어요" }); return; }
              window.dispatchEvent(new CustomEvent("planary:reset-password-email", { detail: { email } }));
              window.Planary.toast?.({ type: "ok", title: "재설정 메일을 발송했어요", sub: email });
            }}
          >
            <Icon name="send" size={12} />이메일로 재설정
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            <Icon name={submitting ? "refresh" : "lock"} size={12} style={{ animation: submitting ? "spin 1s linear infinite" : "none" }} />
            {submitting ? "변경 중…" : "비밀번호 변경"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileRow({ label, sub, children }) {
  return (
    <div className="field-row">
      <div>
        <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{sub}</div>
      </div>
      {children}
    </div>);

}

function ProfileDropdownRow({ label, value, options, selected, onSelect, open, onOpen, onClose }) {
  return (
    <div style={{ position: "relative" }}>
      <ProfileRow label={label} sub={value}>
        <button className="btn btn-sm btn-ghost" onClick={() => open ? onClose() : onOpen()}>
          변경 <Icon name="chevronDown" size={11} />
        </button>
      </ProfileRow>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={onClose} />
          <div
            className="tool-popover"
            style={{ position: "absolute", top: "100%", right: 0, left: "auto", bottom: "auto", minWidth: 220, zIndex: 50, marginTop: -4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map((o) => (
              <button
                key={o.id}
                className={`tool-popover-item ${selected === o.id ? "is-active" : ""}`}
                onClick={() => { onSelect(o.id); onClose(); }}
                type="button"
              >
                <span style={{ flex: 1 }}>{o.label}</span>
                {selected === o.id && <Icon name="check" size={12} stroke={3} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ===========================================================
   e-CLASS CONNECTION CARD (Profile)
   =========================================================== */
function EclassConnectionCard() {
  const { USER, PROJECTS, TASKS } = window.Planary;
  const eclassProject = PROJECTS.find((p) => p.isEclass) || PROJECTS.find((p) => p.id === "pe");
  const isConnectionLive = (d) => !!(d && d.enabled !== false && (d.encryptedSessionCookie || (d.encryptedUsername && d.encryptedPassword) || d.username || d.connected));
  const initialConn = window.Planary.ECLASS_CONNECTION;
  const [connection, setConnection] = useStateO(initialConn);
  const [connected, setConnected] = useStateO(isConnectionLive(initialConn));
  const [autoSync, setAutoSync] = useStateO(true);
  const [syncing, setSyncing] = useStateO(false);
  const [showCourses, setShowCourses] = useStateO(false);
  const [urlInput, setUrlInput] = useStateO((initialConn && initialConn.baseUrl) || "https://eclass.seoultech.ac.kr");
  const [idInput, setIdInput] = useStateO("");
  const [pwInput, setPwInput] = useStateO("");

  // Live-sync e-Class connection state from firebase-bridge
  useEffectO(() => {
    const onConn = (e) => {
      setConnection(e.detail);
      setConnected(isConnectionLive(e.detail));
    };
    window.addEventListener("planary:eclass-connection", onConn);
    return () => window.removeEventListener("planary:eclass-connection", onConn);
  }, []);

  // Derive real values from synced tasks for this user's eClass project.
  const syncedTasks = eclassProject
    ? TASKS.filter((t) => t.project === eclassProject.id && !t.archived)
    : [];
  const courseTitles = [...new Set(
    syncedTasks.map((t) => t.course || (t._raw && t._raw.courseTitle)).filter(Boolean)
  )];
  const formatRelative = (ts) => {
    if (!ts) return null;
    const ms = ts && ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Number(ts));
    if (!Number.isFinite(ms)) return null;
    const diff = Math.max(0, Date.now() - ms);
    if (diff < 60_000) return "방금";
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}분 전`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}시간 전`;
    return `${Math.round(diff / 86_400_000)}일 전`;
  };
  const lastSyncLabel = formatRelative(connection && connection.lastSyncedAt) || "기록 없음";
  const schoolLabel = USER.school || (connection && connection.platform === "seoultech-moodle" ? "서울과학기술대학교" : "");
  const studentIdLabel = USER.studentId || "";

  const handleSync = () => {
    setSyncing(true);
    window.dispatchEvent(new CustomEvent("planary:eclass-sync", {
      detail: { onResult: () => setSyncing(false) },
    }));
  };

  const handleConnect = () => {
    if (!urlInput.trim() || !idInput.trim() || !pwInput) return;
    window.dispatchEvent(new CustomEvent("planary:eclass-connect", {
      detail: {
        url: urlInput.trim(),
        id: idInput.trim(),
        password: pwInput,
        onResult: (res) => {
          if (res && res.ok) {
            setConnected(true);
            setPwInput("");
          }
        },
      },
    }));
  };

  const handleDisconnect = () => {
    window.dispatchEvent(new CustomEvent("planary:eclass-disconnect", {
      detail: {
        onResult: (res) => {
          if (res && res.ok) setConnected(false);
        },
      },
    }));
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: "color-mix(in oklab, var(--info) 30%, var(--border))" }}>
      <div style={{
        padding: "16px 22px 14px",
        borderBottom: "1px solid var(--border-soft)",
        display: "flex", alignItems: "center", gap: 12
      }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: "var(--r-md)",
          background: "color-mix(in oklab, var(--info) 18%, var(--surface))",
          color: "var(--info)",
          display: "grid", placeItems: "center",
          flexShrink: 0
        }}>
          <Icon name="globe" size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>e-Class 연동</h3>
            {connected ?
            <span className="chip" style={{ background: "color-mix(in oklab, var(--ok) 12%, transparent)", color: "var(--ok)", borderColor: "transparent", height: 20, padding: "0 7px", fontSize: 10 }}>
                <span className="status-dot is-live" style={{ width: 5, height: 5, background: "var(--ok)", boxShadow: "none", animation: "none" }} />연결됨
              </span> :

            <span className="chip" style={{ height: 20, padding: "0 7px", fontSize: 10 }}>연결 전</span>
            }
          </div>
          <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
            {schoolLabel ? `${schoolLabel} ` : ""}e-Class에서 강의·과제·시험 일정을 자동으로 가져옵니다
          </p>
        </div>
      </div>

      {connected ?
      <div style={{ padding: "8px 22px 18px" }}>
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>학교</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{schoolLabel || "—"}</div>
            </div>
            {studentIdLabel && <span className="mono" style={{ fontSize: 11, color: "var(--text-lo)" }}>학번 {studentIdLabel}</span>}
          </div>
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>동기화 대상</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{courseTitles.length}개 강의 · 작업 {syncedTasks.length}개</div>
            </div>
            <button className="btn btn-sm" onClick={() => setShowCourses(s => !s)}>
              강의 {showCourses ? "접기" : "보기"}
            </button>
          </div>
          {showCourses && (
            <div style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: "10px 14px", marginBottom: 8 }}>
              {courseTitles.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-faint)", textAlign: "center", padding: "8px 0" }}>
                  동기화된 강의가 없어요
                </div>
              ) : courseTitles.map((title, i) => (
                <div key={title} style={{ fontSize: 12, color: "var(--text-hi)", padding: "6px 0", borderBottom: i < courseTitles.length - 1 ? "1px solid var(--border-soft)" : "none", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="book" size={11} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
                  {title}
                </div>
              ))}
            </div>
          )}
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>자동 동기화</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>앱 사용 중 5분마다, 백엔드에서 하루 1회</div>
            </div>
            <div className={`switch ${autoSync ? "is-on" : ""}`} onClick={() => setAutoSync(!autoSync)} />
          </div>
          <div className="field-row" style={{ borderBottom: 0 }}>
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>마지막 동기화</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{lastSyncLabel} · 항목 {syncedTasks.length}개</div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleSync} disabled={syncing} style={{ minWidth: 120, justifyContent: "center" }}>
              <Icon name="refresh" size={13} style={{ animation: syncing ? "spin 1s linear infinite" : "none" }} />
              {syncing ? "동기화 중…" : "지금 동기화"}
            </button>
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--border-soft)" }}>
            <div className="kicker" style={{ marginBottom: 10 }}>지원 학교</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span className="chip">서울과학기술대학교</span>
              <button className="chip" style={{ borderStyle: "dashed", color: "var(--text-faint)", cursor: "pointer" }}>
                <Icon name="plus" size={10} />학교 추가 요청
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10, lineHeight: 1.5 }}>
              비밀번호는 서버에서 암호화되어 저장됩니다. 언제든 연결을 해제할 수 있고, 해제 시 동기화된 작업은 보관함으로 이동합니다.
            </p>
            <button
            className="btn btn-sm"
            style={{ color: "var(--err)", marginTop: 8 }}
            onClick={handleDisconnect}>

              <Icon name="lock" size={12} />연결 해제
            </button>
          </div>
        </div> :

      <div style={{ padding: 22 }}>
          <p style={{ fontSize: 13, color: "var(--text-md)", marginBottom: 14, lineHeight: 1.5 }}>
            학교 e-Class 계정을 연결하면 강의·과제·시험이 <strong style={{ color: "var(--text-hi)" }}>e-Class 프로젝트</strong>로 자동 동기화됩니다.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>e-Class URL</label>
              <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              style={{
                width: "100%", marginTop: 4,
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "8px 10px",
                fontSize: 13, color: "var(--text-hi)",
                outline: "none"
              }} />
            
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>아이디</label>
                <input
                type="text"
                placeholder="학번 또는 ID"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                style={{
                  width: "100%", marginTop: 4,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: "8px 10px",
                  fontSize: 13, color: "var(--text-hi)",
                  outline: "none"
                }} />
              
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>비밀번호</label>
                <input
                type="password"
                placeholder="••••••••"
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                style={{
                  width: "100%", marginTop: 4,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: "8px 10px",
                  fontSize: 13, color: "var(--text-hi)",
                  outline: "none"
                }} />
              
              </div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={handleConnect}>
            <Icon name="lock" size={13} />연결 저장
          </button>
          <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10, lineHeight: 1.5 }}>
            비밀번호는 서버에서 암호화(AES-256)되어 저장되며, 동기화 외 다른 용도로 사용되지 않습니다.
          </p>
        </div>
      }
    </div>);

}

/* ===========================================================
   CODE BLOCK — with language selector + copy
   =========================================================== */
const CODE_SAMPLES = {
  css: [
  { type: "com", text: "/* 항상 토큰을 통해 접근 — 직접 hex 금지 */" },
  { type: "code", text: "" },
  [
  { type: "key", text: ".card" },
  { type: "code", text: " { " }],

  [
  { type: "code", text: "  background: " },
  { type: "str", text: "var(--surface)" },
  { type: "code", text: ";" }],

  [
  { type: "code", text: "  border: " },
  { type: "num", text: "1" },
  { type: "code", text: "px solid " },
  { type: "str", text: "var(--border)" },
  { type: "code", text: ";" }],

  [
  { type: "code", text: "  border-radius: " },
  { type: "str", text: "var(--r-xl)" },
  { type: "code", text: ";" }],

  [
  { type: "code", text: "  color: " },
  { type: "str", text: "var(--text-hi)" },
  { type: "code", text: ";" }],

  { type: "code", text: "}" },
  { type: "code", text: "" },
  { type: "com", text: "/* 투명도 변형은 color-mix로 — 자동 다크/라이트 호환 */" },
  [
  { type: "key", text: ".btn-soft" },
  { type: "code", text: " {" }],

  [
  { type: "code", text: "  background: color-mix(" },
  { type: "str", text: "in oklab" },
  { type: "code", text: ", " },
  { type: "str", text: "var(--accent)" },
  { type: "code", text: " " },
  { type: "num", text: "14" },
  { type: "code", text: "%, transparent);" }],

  { type: "code", text: "}" }],

  tsx: [
  { type: "com", text: "// 디자인 시스템 토큰을 React에서 쓰기" },
  [
  { type: "key", text: "import" },
  { type: "code", text: " " },
  { type: "str", text: "\"./tokens.css\"" },
  { type: "code", text: ";" }],

  { type: "code", text: "" },
  [
  { type: "key", text: "export function" },
  { type: "code", text: " Card({ children }) {" }],

  [
  { type: "code", text: "  " },
  { type: "key", text: "return" },
  { type: "code", text: " <div className=" },
  { type: "str", text: "\"card\"" },
  { type: "code", text: ">{children}</div>;" }],

  { type: "code", text: "}" }],

  js: [
  { type: "com", text: "// 토큰 값을 JS에서 읽기" },
  [
  { type: "key", text: "const" },
  { type: "code", text: " accent = " },
  { type: "str", text: "getComputedStyle(document.documentElement)" }],

  [
  { type: "code", text: "  .getPropertyValue(" },
  { type: "str", text: "\"--accent\"" },
  { type: "code", text: ").trim();" }],

  { type: "code", text: "" },
  { type: "com", text: "// → \"#7f0df2\"" }],

  html: [
  [
  { type: "code", text: "<" },
  { type: "key", text: "link" },
  { type: "code", text: " rel=" },
  { type: "str", text: "\"stylesheet\"" },
  { type: "code", text: " href=" },
  { type: "str", text: "\"tokens.css\"" },
  { type: "code", text: " />" }],

  [
  { type: "code", text: "<" },
  { type: "key", text: "div" },
  { type: "code", text: " class=" },
  { type: "str", text: "\"card\"" },
  { type: "code", text: ">Hello</" },
  { type: "key", text: "div" },
  { type: "code", text: ">" }]]


};

function CodeBlock({ anchor }) {
  const [lang, setLang] = useStateO("css");
  const [copied, setCopied] = useStateO(false);
  const lines = CODE_SAMPLES[lang];

  const handleCopy = () => {
    const text = lines.map((line) => {
      if (Array.isArray(line)) return line.map((t) => t.text).join("");
      return line.text;
    }).join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }).catch(() => {});
    }
  };

  const renderToken = (t, i) => {
    if (t.type === "code") return <React.Fragment key={i}>{t.text}</React.Fragment>;
    return <span key={i} className={`tk-${t.type}`}>{t.text}</span>;
  };

  const langs = [
  { id: "css", label: "CSS" },
  { id: "tsx", label: "TSX" },
  { id: "js", label: "JS" },
  { id: "html", label: "HTML" }];


  return (
    <div className="codeblock" data-comment-anchor={anchor}>
      <div className="codeblock-bar">
        <div className="codeblock-langs">
          {langs.map((l) =>
          <button
            key={l.id}
            className={`codeblock-lang ${lang === l.id ? "is-active" : ""}`}
            onClick={() => setLang(l.id)}
            type="button">
            
              {l.label}
            </button>
          )}
        </div>
        <button className="codeblock-copy" onClick={handleCopy} type="button" title="복사">
          <Icon name={copied ? "check" : "copy"} size={12} />
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre><code>
        {lines.map((line, i) =>
          <React.Fragment key={i}>
            {Array.isArray(line) ?
            line.map(renderToken) :
            renderToken(line, 0)}
            {"\n"}
          </React.Fragment>
          )}
      </code></pre>
    </div>);

}

/* ===========================================================
   SHARE DIALOG
   =========================================================== */
/* ===========================================================
   VERSION HISTORY DIALOG — wiki page revisions with restore
   =========================================================== */
function VersionHistoryDialog({ onClose, page, onRestore }) {
  const [versions, setVersions] = useStateO(null); // null = loading
  const [selectedIdx, setSelectedIdx] = useStateO(0);
  const [restoring, setRestoring] = useStateO(false);

  // Load revisions from Firestore on open
  useEffectO(() => {
    let cancelled = false;
    window.Planary.api.loadWikiRevisions(page.id).then(revs => {
      if (!cancelled) setVersions(revs);
    }).catch(err => {
      console.error("[Planary] loadWikiRevisions failed:", err);
      if (!cancelled) setVersions([]);
    });
    return () => { cancelled = true; };
  }, [page.id]);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selected = versions && versions.length ? versions[selectedIdx] : null;

  const formatAgo = (ms) => {
    if (!ms) return "알 수 없음";
    const diff = Date.now() - ms;
    if (diff < 60000)  return "방금";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 172800000) return "어제";
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;
    return new Date(ms).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  const restore = async () => {
    if (!selected || selectedIdx === 0) return;
    if (!window.confirm(`이 버전으로 되돌릴까요? 현재 내용은 새 버전으로 보존됩니다.`)) return;
    setRestoring(true);
    try {
      // Dispatch as if the user saved these blocks (auto-saves + creates new revision)
      window.dispatchEvent(new CustomEvent("planary:save-wiki-blocks", {
        detail: { id: page.id, blocks: selected.blocks },
      }));
      if (onRestore) onRestore(selected.blocks);
      window.Planary.toast({
        type: "ok",
        title: "이전 버전으로 되돌렸어요",
        sub: `${formatAgo(selected.savedAt)} · ${selected.authorName}`,
      });
      onClose();
    } catch (err) {
      console.error("[Planary] restore failed:", err);
      window.Planary.toast({ type: "err", title: "되돌리기 실패", sub: String(err.message) });
    } finally {
      setRestoring(false);
    }
  };

  const renderBlockPreview = (blocks) => {
    if (!blocks || !blocks.length) return <div style={{ fontSize: 12, color: "var(--text-faint)" }}>내용 없음</div>;
    return blocks.slice(0, 8).map((b, i) => {
      const text = b.content || "";
      if (b.type === "h1") return <h2 key={i} style={{ fontSize: 17, fontWeight: 700, color: "var(--text-hi)", margin: "10px 0 6px" }}>{text}</h2>;
      if (b.type === "h2") return <h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", margin: "8px 0 4px" }}>{text}</h3>;
      if (b.type === "h3") return <h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", margin: "6px 0 4px" }}>{text}</h3>;
      if (b.type === "code") return <pre key={i} className="mono" style={{ fontSize: 11.5, padding: 10, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-sm)", margin: "6px 0", overflowX: "auto" }}>{text}</pre>;
      if (b.type === "callout") return <div key={i} className="callout callout-ok" style={{ fontSize: 13 }}><Icon name="sparkles" size={16} style={{ color: "var(--ok)", flexShrink: 0, marginTop: 2 }} />{text}</div>;
      if (b.type === "divider") return <hr key={i} style={{ border: "none", borderTop: "1px solid var(--border-soft)", margin: "8px 0" }} />;
      return <p key={i} style={{ fontSize: 13, color: "var(--text-md)", lineHeight: 1.6, margin: "4px 0" }}>{text}</p>;
    });
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(820px, 96vw)", maxHeight: "82vh", padding: 0, display: "flex", flexDirection: "column" }}>
        <div className="dialog-head" style={{ flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em", display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="clock" size={16} style={{ color: "var(--accent)" }} />
              수정 이력
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
              <span style={{ color: "var(--text-md)", fontWeight: 600 }}>{page.title}</span>
              {versions !== null && ` · ${versions.length}개 버전`}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        {versions === null ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
            <div style={{ fontSize: 13, color: "var(--text-faint)" }}>불러오는 중...</div>
          </div>
        ) : versions.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 8 }}>
            <Icon name="clock" size={28} style={{ color: "var(--text-faint)" }} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>아직 저장된 이력이 없어요</div>
            <div style={{ fontSize: 12, color: "var(--text-lo)" }}>문서를 편집하면 자동으로 이력이 쌓입니다</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", flex: 1, minHeight: 0, overflow: "hidden" }}>
            {/* Left: version list */}
            <div style={{ borderRight: "1px solid var(--border-soft)", overflowY: "auto", padding: "10px 8px" }}>
              <div className="version-thread">
                {versions.map((v, i) => {
                  const active = i === selectedIdx;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`version-item ${active ? "is-active" : ""} ${i === 0 ? "is-current" : ""}`}
                      onClick={() => setSelectedIdx(i)}
                    >
                      <span className="version-dot" />
                      <div className="version-meta">
                        <div className="version-row">
                          <span className="version-time">{formatAgo(v.savedAt)}</span>
                          {i === 0 && <span className="version-now">현재</span>}
                        </div>
                        <div className="version-row" style={{ marginTop: 4 }}>
                          <div className="avatar avatar-xs" style={{ width: 16, height: 16, fontSize: 9 }}>{v.authorInitials}</div>
                          <span className="version-author">{v.authorName}</span>
                        </div>
                        <div className="version-summary">{v.blocks.length}개 블록</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: preview */}
            <div style={{ overflowY: "auto", padding: "18px 22px 8px" }}>
              {selected && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{selected.authorInitials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{selected.authorName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-lo)" }}>
                        {formatAgo(selected.savedAt)} · {new Date(selected.savedAt).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <span className="chip">{selected.blocks.length}블록</span>
                  </div>

                  <div className="kicker" style={{ marginBottom: 8 }}>내용 미리보기</div>
                  <div className="version-preview">
                    {renderBlockPreview(selected.blocks)}
                    {selected.blocks.length > 8 && (
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 8 }}>
                        … 외 {selected.blocks.length - 8}개 블록
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="dialog-foot" style={{ flexShrink: 0 }}>
          {selectedIdx === 0 ? (
            <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
              현재 버전입니다. 다른 버전을 선택하면 되돌릴 수 있어요.
            </span>
          ) : (
            <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
              되돌리기 전 현재 내용은 새 버전으로 자동 보존돼요.
            </span>
          )}
          <button className="btn btn-sm" onClick={onClose}>닫기</button>
          <button
            className="btn btn-sm btn-primary"
            onClick={restore}
            disabled={selectedIdx === 0 || restoring || !selected}
            style={(selectedIdx === 0 || !selected) ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <Icon name="refresh" size={12} />{restoring ? "되돌리는 중..." : "이 버전으로 되돌리기"}
          </button>
        </div>
      </div>
    </div>
  );
}

window.Planary.VersionHistoryDialog = VersionHistoryDialog;

/* ===========================================================
   PAGE INFO DIALOG — metadata + stats card
   =========================================================== */
function PageInfoDialog({ onClose, page, favorites }) {
  const { WIKI_TREE } = window.Planary;
  const parent = page.parent ? WIKI_TREE.find(w => w.id === page.parent) : null;
  const children = WIKI_TREE.filter(w => w.parent === page.id);
  const isFav = favorites && favorites.has(page.id);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Stats — synthetic but realistic
  const stats = {
    blocks: 18,
    words: 412,
    chars: 1247,
    reading: 3, // minutes
    images: 2,
    codeBlocks: 1,
    tables: 1,
    links: 6,
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(540px, 92vw)" }}>
        <div className="dialog-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-elev)", display: "grid", placeItems: "center", fontSize: 20, border: "1px solid var(--border)" }}>
              {page.icon}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em", display: "flex", alignItems: "center", gap: 8 }}>
                {page.title}
                {isFav && <Icon name="star" size={13} style={{ color: "var(--warn)", fill: "var(--warn)" }} />}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                ID · {page.id}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "10px 22px 14px" }}>
          {/* Top stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "블록", val: stats.blocks, icon: "list" },
              { label: "단어", val: stats.words, icon: "edit" },
              { label: "글자", val: stats.chars.toLocaleString(), icon: "hash" },
              { label: "읽기", val: `${stats.reading}분`, icon: "clock" },
            ].map(s => (
              <div key={s.label} style={{
                padding: "10px 12px",
                background: "var(--bg-elev)",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)",
                textAlign: "center",
              }}>
                <Icon name={s.icon} size={12} style={{ color: "var(--text-faint)", marginBottom: 4 }} />
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-hi)" }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "var(--text-lo)", letterSpacing: "0.04em", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Detail rows */}
          <div style={{ background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <InfoRow icon="folder" label="상위 페이지" value={parent ? `${parent.icon}  ${parent.title}` : "최상위"} />
            <InfoRow icon="layers" label="하위 페이지" value={`${children.length}개`} />
            <InfoRow icon="clock" label="생성일" value="2025년 9월 14일 14:32" sub="62일 전" />
            <InfoRow icon="edit" label="마지막 수정" value="방금" sub="도하 김 · 1247자 → 1289자" />
            <InfoRow icon="user" label="작성자" value={(
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <div className="avatar" style={{ width: 18, height: 18, fontSize: 9 }}>DK</div>
                도하 김
              </span>
            )} />
            <InfoRow icon="globe" label="공개 범위" value="비공개" sub="초대된 사람만 볼 수 있음" />
            <InfoRow icon="link" label="링크" value={(
              <button
                className="mono"
                style={{ fontSize: 11, color: "var(--accent)", background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
                onClick={() => { navigator.clipboard?.writeText(`https://planary.app/w/${page.id}`); window.Planary.toast?.({ type: "ok", title: "링크가 복사됐어요" }); }}
              >
                planary.app/w/{page.id} <Icon name="copy" size={10} style={{ verticalAlign: -1, marginLeft: 4 }} />
              </button>
            )} last />
          </div>

          {/* Content composition */}
          <div className="kicker" style={{ marginTop: 18, marginBottom: 8 }}>구성</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span className="chip"><Icon name="image" size={10} />이미지 {stats.images}</span>
            <span className="chip"><Icon name="hash" size={10} />코드 블록 {stats.codeBlocks}</span>
            <span className="chip"><Icon name="grid" size={10} />표 {stats.tables}</span>
            <span className="chip"><Icon name="link" size={10} />링크 {stats.links}</span>
          </div>

          {/* Tags */}
          <div className="kicker" style={{ marginTop: 18, marginBottom: 8 }}>태그</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span className="tag">tokens</span>
            <span className="tag">color</span>
            <span className="tag">v3</span>
          </div>
        </div>

        <div className="dialog-foot">
          <span style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>실시간 정보</span>
          <button className="btn btn-sm btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, sub, last }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 14px",
      borderBottom: last ? 0 : "1px solid var(--border-soft)",
    }}>
      <div style={{ width: 22, color: "var(--text-lo)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={13} />
      </div>
      <div style={{ flex: 1, fontSize: 12, color: "var(--text-lo)", fontWeight: 600 }}>{label}</div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12.5, color: "var(--text-hi)", fontWeight: 600 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ===========================================================
   EXPORT DIALOG — choose format
   =========================================================== */
function ExportDialog({ onClose, page }) {
  const [selected, setSelected] = useStateO("pdf");

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const formats = [
    { id: "pdf", label: "PDF", icon: "document", desc: "인쇄에 적합한 단일 파일", size: "~ 240 KB" },
    { id: "md", label: "Markdown", icon: "hash", desc: "다른 도구로 옮기기 좋음", size: "~ 8 KB" },
    { id: "html", label: "HTML", icon: "globe", desc: "스타일 포함, 웹에 게시", size: "~ 32 KB" },
    { id: "docx", label: "Word (.docx)", icon: "edit", desc: "Microsoft Word 호환", size: "~ 56 KB" },
  ];

  const handleExport = () => {
    const f = formats.find(x => x.id === selected);
    window.Planary.toast?.({
      type: "ok",
      title: `${f.label}(으)로 내보내는 중…`,
      sub: `${page.title} · ${f.size}`,
    });
    setTimeout(() => {
      window.Planary.toast?.({
        type: "ok",
        title: "다운로드 완료",
        sub: `${page.title}.${selected === "docx" ? "docx" : selected}`,
      });
    }, 1000);
    onClose();
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>내보내기</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}><strong style={{ color: "var(--text-md)" }}>{page.title}</strong>을(를) 어떤 형식으로 저장할까요?</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 14 }}>
          {formats.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "12px",
                background: selected === f.id ? "var(--accent-softer)" : "transparent",
                border: selected === f.id ? "1px solid var(--accent-ring)" : "1px solid transparent",
                borderRadius: "var(--r-md)",
                cursor: "pointer", textAlign: "left",
                transition: "all var(--dur-fast)",
                marginBottom: 4,
              }}
              onMouseEnter={(e) => { if (selected !== f.id) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={(e) => { if (selected !== f.id) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: selected === f.id ? "var(--accent-soft)" : "var(--surface-2)",
                color: selected === f.id ? "var(--accent)" : "var(--text-lo)",
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <Icon name={f.icon} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)" }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 1 }}>{f.desc}</div>
              </div>
              <span style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{f.size}</span>
              {selected === f.id && <Icon name="check" size={14} stroke={3} style={{ color: "var(--accent)" }} />}
            </button>
          ))}
        </div>
        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>로컬에 다운로드됩니다</div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-sm btn-primary" onClick={handleExport}>
            <Icon name="download" size={12} />내보내기
          </button>
        </div>
      </div>
    </div>
  );
}

window.Planary.PageInfoDialog = PageInfoDialog;
window.Planary.ExportDialog = ExportDialog;

/* ===========================================================
   DUPLICATE PAGE DIALOG
   =========================================================== */
function DuplicatePageDialog({ node, tree, collectDescendants, onClose, onConfirm }) {
  const [title, setTitle] = useStateO(node.title + " (복사)");
  const [includeChildren, setIncludeChildren] = useStateO(true);
  const childCount = collectDescendants(node.id).length - 1;
  const inputRef = useRefO(null);

  useEffectO(() => {
    setTimeout(() => {
      if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
    }, 50);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [title, includeChildren]);

  const confirm = () => {
    if (!title.trim()) return;
    onConfirm({ title: title.trim(), includeChildren });
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>페이지 복제</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>같은 위치에 사본을 만듭니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          {/* Source preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--bg-elev)", borderRadius: "var(--r-md)", marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>{node.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{node.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>
                {childCount > 0 ? `하위 페이지 ${childCount}개` : "하위 페이지 없음"}
              </div>
            </div>
          </div>

          {/* Title input */}
          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>새 페이지 이름</span>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              style={{ marginTop: 5 }}
              placeholder="페이지 이름"
            />
          </label>

          {/* Include children toggle */}
          {childCount > 0 && (
            <label
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: 12,
                background: "var(--bg-elev)",
                border: includeChildren ? "1px solid var(--accent-ring)" : "1px solid var(--border-soft)",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
                transition: "all var(--dur-fast)",
              }}
              onClick={() => setIncludeChildren(!includeChildren)}
            >
              <button
                type="button"
                className={`checkbox ${includeChildren ? "is-checked" : ""}`}
                onClick={(e) => { e.preventDefault(); setIncludeChildren(!includeChildren); }}
              >
                {includeChildren && <Icon name="check" size={11} stroke={3} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>하위 페이지도 복제</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>
                  {includeChildren ? `${childCount}개 페이지가 함께 복제됩니다` : "이 페이지만 복제합니다"}
                </div>
              </div>
            </label>
          )}
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            <span className="kbd">⌘↵</span>로 빠르게 확인
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-sm btn-primary" onClick={confirm} disabled={!title.trim()}>
            <Icon name="copy" size={12} />복제
          </button>
        </div>
      </div>
    </div>
  );
}

window.Planary.DuplicatePageDialog = DuplicatePageDialog;

/* ===========================================================
   WIKI TOC — auto-generated from h2 / h3 blocks
   =========================================================== */
function WikiTOC({ blocks }) {
  const [activeHash, setActiveHash] = useStateO(null);
  const items = (blocks || [])
    .filter((b) => b.type === "h2" || b.type === "h3")
    .map((b) => {
      const text = (b.content || "").replace(/<[^>]+>/g, "").trim() || "(제목 없음)";
      return { id: b.id, text, level: b.type };
    });

  // Scroll-spy: highlight the heading whose block-row is closest to top
  useEffectO(() => {
    if (items.length === 0) return;
    const onScroll = () => {
      let bestId = items[0].id;
      let bestDist = Infinity;
      for (const it of items) {
        // Find the rendered heading element by its block content id wrapper —
        // we look up the contenteditable inside the matching block row.
        const row = document.querySelector(`.wiki-block-row[data-block-id="${it.id}"]`);
        if (!row) continue;
        const r = row.getBoundingClientRect();
        const dist = Math.abs(r.top - 80);
        if (r.top < window.innerHeight && r.top > -r.height && dist < bestDist) {
          bestDist = dist;
          bestId = it.id;
        }
      }
      setActiveHash(bestId);
    };
    onScroll();
    const main = document.querySelector(".page");
    main && main.addEventListener("scroll", onScroll, { passive: true });
    return () => main && main.removeEventListener("scroll", onScroll);
  }, [items.length, items.map((i) => i.id).join("|")]);

  const scrollTo = (id) => {
    const row = document.querySelector(`.wiki-block-row[data-block-id="${id}"]`);
    if (row) {
      const main = document.querySelector(".page");
      if (main) {
        const targetTop = row.getBoundingClientRect().top + main.scrollTop - 60;
        main.scrollTo({ top: targetTop, behavior: "smooth" });
      } else {
        row.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    setActiveHash(id);
  };

  if (items.length === 0) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-faint)", padding: "8px 4px" }}>
        제목(H2 / H3)을 추가하면 자동으로 목차가 생성돼요
      </div>
    );
  }

  return (
    <div>
      {items.map((it) => (
        <div
          key={it.id}
          className={`toc-link ${it.level === "h3" ? "is-sub" : ""} ${activeHash === it.id ? "is-active" : ""}`}
          onClick={() => scrollTo(it.id)}
          role="button"
          tabIndex={0}
        >
          {it.text}
        </div>
      ))}
    </div>
  );
}

/* ===========================================================
   RELATED TASKS — filtered by tag overlap with the page
   =========================================================== */
function RelatedTasks({ activePage }) {
  const { TASKS } = window.Planary;
  // Derive keywords from the page title (tokenize on space / punctuation)
  const title = (activePage && activePage.title) || "";
  const keywords = title.toLowerCase().split(/[\s·.,/—-]+/).filter((s) => s.length >= 2);

  const matches = TASKS.filter((t) => {
    const tags = (t.tags || []).map((x) => x.toLowerCase());
    if (keywords.some((k) => tags.includes(k))) return true;
    const blob = (t.title + " " + (t.memo || "")).toLowerCase();
    return keywords.some((k) => blob.includes(k));
  }).slice(0, 4);

  if (matches.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "6px 4px" }}>
        제목 키워드와 일치하는 작업이 없어요
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 6, lineHeight: 1.5 }}>
        제목 키워드와 일치하는 작업 · 자동 매칭
      </div>
      {matches.map((t) => (
        <div key={t.id} className="focus-row" style={{ padding: "6px 8px", cursor: "pointer" }}>
          <div
            className={`checkbox ${t.done ? "is-checked" : ""}`}
            style={{ width: 14, height: 14 }}
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("planary:toggle-task", { detail: t.id }));
            }}
          >
            {t.done && <Icon name="check" size={9} stroke={3} />}
          </div>
          <span
            style={{
              flex: 1, fontSize: 12, color: "var(--text-md)",
              textDecoration: t.done ? "line-through" : "none",
              opacity: t.done ? 0.55 : 1,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
            onClick={() => window.dispatchEvent(new CustomEvent("planary:edit-task", { detail: t }))}
          >
            {t.title}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ===========================================================
   BACKLINKS — pages that mention the current page title
   =========================================================== */
function Backlinks({ activePage }) {
  const { WIKI_TREE } = window.Planary;
  const title = (activePage && activePage.title) || "";

  // Show the chain of parent pages (genuine relations) as backlinks
  const parents = [];
  let cur = activePage;
  while (cur && cur.parent) {
    const p = WIKI_TREE.find((w) => w.id === cur.parent);
    if (!p) break;
    parents.unshift(p);
    cur = p;
  }

  if (parents.length === 0) {
    return (
      <div style={{ fontSize: 11, color: "var(--text-faint)", padding: "6px 4px" }}>
        이 페이지를 참조하는 다른 페이지가 없어요
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 6, lineHeight: 1.5 }}>
        하위 페이지로 등록된 위치
      </div>
      {parents.map((p) => (
        <div key={p.id} className="toc-link">
          <span style={{ marginRight: 4 }}>{p.icon}</span>
          {p.title}
        </div>
      ))}
    </div>
  );
}

/* ===========================================================
   SLASH COMMAND MENU — Notion-style block type picker
   =========================================================== */
function SlashCommandMenu({ slashMenu, onClose, onPick }) {
  const [query, setQuery] = useStateO("");
  const [highlight, setHighlight] = useStateO(0);

  const commands = [
    // Basic
    { group: "기본",     id: "p",        label: "본문",        desc: "기본 텍스트 블록",         icon: "edit",     keywords: "text para 본문 글" },
    { group: "기본",     id: "h1",       label: "헤딩 1",      desc: "큰 제목",               icon: "hash",     keywords: "heading h1 대제목 큰제목" },
    { group: "기본",     id: "h2",       label: "헤딩 2",      desc: "중간 크기 제목",          icon: "hash",     keywords: "heading h2 중제목 제목" },
    { group: "기본",     id: "h3",       label: "헤딩 3",      desc: "작은 제목",              icon: "hash",     keywords: "heading h3 소제목 제목" },
    // Lists
    { group: "리스트",   id: "ul",       label: "글머리 기호",   desc: "• 항목 · 자유 순서",       icon: "list",     keywords: "list unordered bullet 글머리" },
    { group: "리스트",   id: "ol",       label: "번호 매기기",   desc: "1. 항목 · 순서 있음",      icon: "list",     keywords: "list ordered 번호" },
    { group: "리스트",   id: "todo",     label: "체크리스트",    desc: "☑ 완료 체크",            icon: "check",    keywords: "todo checklist 체크 할일" },
    // Rich
    { group: "리치",     id: "quote",    label: "인용",        desc: "강조된 한 줄",           icon: "edit",     keywords: "quote 인용 blockquote" },
    { group: "리치",     id: "callout",  label: "콜아웃",      desc: "강조 박스 + 아이콘",      icon: "sparkles", keywords: "callout 콜아웃 강조 박스" },
    { group: "리치",     id: "divider",  label: "구분선",      desc: "섹션 사이 구분",          icon: "list",     keywords: "divider 구분 hr line" },
    // Code & data
    { group: "코드·데이터", id: "code",     label: "코드 블록",   desc: "언어별 코드 + 복사",      icon: "command",  keywords: "code 코드 syntax" },
    { group: "코드·데이터", id: "math",     label: "수식",        desc: "KaTeX LaTeX 수식",       icon: "hash",     keywords: "math 수식 katex latex" },
    { group: "코드·데이터", id: "table",    label: "표",          desc: "행과 열 데이터",         icon: "grid",     keywords: "table 표 데이터" },
    // Media
    { group: "미디어",   id: "image",    label: "이미지",      desc: "PNG · JPG · 업로드/URL",  icon: "image",    keywords: "image 이미지 사진 그림" },
    { group: "미디어",   id: "attach",   label: "파일 첨부",    desc: "어떤 파일이든 첨부",      icon: "paperclip", keywords: "file attach 첨부 파일" },
    { group: "미디어",   id: "link",     label: "북마크/임베드", desc: "URL 미리보기 카드",       icon: "link",     keywords: "link bookmark embed 북마크" },
  ];

  const filtered = query
    ? commands.filter(c => (c.label + " " + c.keywords + " " + c.desc).toLowerCase().includes(query.toLowerCase()))
    : commands;

  useEffectO(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => (h + 1) % Math.max(1, filtered.length)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => (h - 1 + filtered.length) % Math.max(1, filtered.length)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const c = filtered[highlight];
        if (c) onPick(c.id);
        return;
      }
      if (e.key === "Backspace" && query === "") { onClose(); return; }
      // Filter out "/" itself (it was the trigger key)
      if (e.key === "/") { return; }
      if (e.key.length === 1) { setQuery(q => q + e.key); setHighlight(0); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, highlight, query]);

  // Reset highlight on filter change
  useEffectO(() => { setHighlight(0); }, [query]);

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose} />
      <div
        className="slash-menu"
        style={{
          position: "fixed",
          left: Math.min(slashMenu.x, window.innerWidth - 300),
          top: Math.min(slashMenu.y, window.innerHeight - 320),
          zIndex: 200,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slash-menu-head">
          <Icon name="command" size={12} style={{ color: "var(--accent)" }} />
          <span style={{ flex: 1 }}>
            {query ? <span className="mono">/{query}</span> : "블록 타입을 선택하세요"}
          </span>
          <span className="kbd">Esc</span>
        </div>
        <div className="slash-menu-list">
          {filtered.length === 0 && (
            <div style={{ padding: 14, fontSize: 12, color: "var(--text-faint)", textAlign: "center" }}>
              "{query}"에 해당하는 블록이 없어요
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={`slash-menu-item ${i === highlight ? "is-highlight" : ""}`}
              onClick={() => onPick(c.id)}
              onMouseEnter={() => setHighlight(i)}
            >
              <div className="slash-menu-icon">
                <Icon name={c.icon} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="slash-menu-label">{c.label}</div>
                <div className="slash-menu-desc">{c.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="slash-menu-foot">
          <span><span className="kbd">↑↓</span> 이동</span>
          <span><span className="kbd">↵</span> 선택</span>
        </div>
      </div>
    </>
  );
}

window.Planary.SlashCommandMenu = SlashCommandMenu;

/* ===========================================================
   ADDITIONAL WIKI BLOCK TYPES
   (ports of features from memo/wiki.js — list, checklist, code, math, table, image, attach, link)
   =========================================================== */

function ListBlock({ block, onUpdate }) {
  const items = block.items || [""];
  const isOrdered = block.type === "ol";
  const Tag = isOrdered ? "ol" : "ul";
  const focusItem = (index) => {
    window.setTimeout(() => {
      const el = document.querySelector(`[data-list-block-id="${block.id}"][data-list-index="${index}"]`);
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  };
  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    onUpdate({ items: next });
  };
  const addItem = (afterIdx) => {
    onUpdate({ items: [...items.slice(0, afterIdx + 1), "", ...items.slice(afterIdx + 1)] });
    focusItem(afterIdx + 1);
  };
  const removeItem = (i) => onUpdate({ items: items.length > 1 ? items.filter((_, idx) => idx !== i) : items });
  return (
    <Tag style={{ paddingLeft: 22, margin: "8px 0", color: "var(--text-md)", lineHeight: 1.6 }}>
      {items.map((item, i) => (
        <li key={i} style={{ margin: "3px 0" }}>
          <span
            data-list-block-id={block.id}
            data-list-index={i}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateItem(i, e.currentTarget.innerHTML)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addItem(i); }
              if (e.key === "Backspace" && e.currentTarget.textContent === "") { e.preventDefault(); removeItem(i); }
            }}
            style={{ outline: "none", display: "block", minHeight: 22 }}
            dangerouslySetInnerHTML={{ __html: item || "" }}
          />
        </li>
      ))}
    </Tag>
  );
}

function ChecklistBlock({ block, onUpdate }) {
  const items = (block.items || [{ text: "", checked: false }]).map((it) => ({ ...it, checked: !!(it.checked ?? it.done) }));
  const focusItem = (index) => {
    window.setTimeout(() => {
      const el = document.querySelector(`[data-checklist-block-id="${block.id}"][data-checklist-index="${index}"]`);
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  };
  const update = (i, patch) => onUpdate({ items: items.map((x, idx) => idx === i ? { ...x, ...patch } : x) });
  const addItem = (afterIdx) => {
    onUpdate({ items: [...items.slice(0, afterIdx + 1), { text: "", checked: false }, ...items.slice(afterIdx + 1)] });
    focusItem(afterIdx + 1);
  };
  const removeItem = (i) => onUpdate({ items: items.length > 1 ? items.filter((_, idx) => idx !== i) : items });
  return (
    <div style={{ margin: "8px 0", display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "start", gap: 8, padding: "4px 0" }}>
          <button
            type="button"
            className={`checkbox ${it.checked ? "is-checked" : ""}`}
            style={{ marginTop: 3, flexShrink: 0 }}
            onClick={() => update(i, { checked: !it.checked })}
          >
            {it.checked && <Icon name="check" size={11} stroke={3} />}
          </button>
          <span
            data-checklist-block-id={block.id}
            data-checklist-index={i}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => update(i, { text: e.currentTarget.innerHTML })}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addItem(i); }
              if (e.key === "Backspace" && e.currentTarget.textContent === "") { e.preventDefault(); removeItem(i); }
            }}
            style={{
              outline: "none", flex: 1, minHeight: 22,
              color: it.checked ? "var(--text-lo)" : "var(--text-md)",
              textDecoration: it.checked ? "line-through" : "none",
              textDecorationColor: "var(--text-faint)",
            }}
            dangerouslySetInnerHTML={{ __html: it.text || "" }}
          />
        </div>
      ))}
    </div>
  );
}

function CodeEditorBlock({ block, onUpdate }) {
  const langs = ["javascript", "typescript", "tsx", "css", "html", "python", "java", "kotlin", "swift", "go", "rust", "sql", "shell", "json", "yaml", "markdown"];
  const lang = block.lang || "javascript";
  const code = block.code || "";
  const [copied, setCopied] = useStateO(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="codeblock" style={{ margin: "10px 0" }}>
      <div className="codeblock-bar">
        <select
          value={lang}
          onChange={(e) => onUpdate({ lang: e.target.value })}
          style={{ fontSize: 11, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "2px 6px", color: "var(--text-md)", fontFamily: "var(--font-mono)" }}
        >
          {langs.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <button className="codeblock-copy" onClick={handleCopy} type="button">
          <Icon name={copied ? "check" : "copy"} size={12} />{copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre style={{ margin: 0, border: 0 }}>
        <code
          contentEditable
          suppressContentEditableWarning
          spellCheck="false"
          onBlur={(e) => onUpdate({ code: e.currentTarget.textContent })}
          style={{
            display: "block", padding: "12px 14px",
            fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.55,
            color: "var(--text-md)", outline: "none", whiteSpace: "pre",
          }}
        >{code}</code>
      </pre>
    </div>
  );
}

function MathBlock({ block, onUpdate }) {
  const [tex, setTex] = useStateO(block.tex || "");
  const [edit, setEdit] = useStateO(!block.tex);
  // Render via KaTeX (loaded externally) or as plain text if not loaded
  const renderedRef = useRefO(null);
  useEffectO(() => {
    if (edit || !renderedRef.current) return;
    if (typeof window.katex !== "undefined") {
      try {
        window.katex.render(tex, renderedRef.current, { throwOnError: false, displayMode: true, strict: false });
      } catch (_) { renderedRef.current.textContent = tex; }
    } else {
      renderedRef.current.textContent = tex || "수식을 입력하세요";
    }
  }, [tex, edit]);
  return (
    <div style={{ margin: "10px 0", padding: 16, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)", textAlign: "center" }}>
      {edit ? (
        <textarea
          autoFocus
          value={tex}
          onChange={(e) => setTex(e.target.value)}
          onBlur={() => { onUpdate({ tex }); setEdit(false); }}
          placeholder={"\\sum_{i=1}^n i = \\frac{n(n+1)}{2}"}
          rows={2}
          style={{
            width: "100%",
            fontFamily: "var(--font-mono)", fontSize: 13,
            background: "var(--bg)", color: "var(--text-hi)",
            border: "1px solid var(--border)", borderRadius: 6,
            padding: 10, resize: "vertical", outline: "none",
          }}
        />
      ) : (
        <div ref={renderedRef} style={{ minHeight: 30, cursor: "pointer", color: "var(--text-hi)", fontSize: 18 }} onClick={() => setEdit(true)} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 10, color: "var(--text-faint)" }}>
        <span>KaTeX · LaTeX</span>
        {!edit && <button type="button" className="btn btn-sm" onClick={() => setEdit(true)}><Icon name="edit" size={11} />수정</button>}
      </div>
    </div>
  );
}

function TableBlock({ block, onUpdate }) {
  const rows = Array.isArray(block.rows) && block.rows.length
    ? block.rows.map((row) => Array.isArray(row) && row.length ? row : [""])
    : [["헤더 1", "헤더 2", "헤더 3"], ["", "", ""]];
  const focusCell = (r, c) => {
    window.setTimeout(() => {
      const el = document.querySelector(`[data-table-block-id="${block.id}"][data-row="${r}"][data-col="${c}"]`);
      if (!el) return;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  };
  const updateCell = (r, c, val) => {
    const next = rows.map(row => [...row]);
    next[r][c] = val;
    onUpdate({ rows: next });
  };
  const addRow = (focusCol = 0) => {
    onUpdate({ rows: [...rows, Array(rows[0].length).fill("")] });
    focusCell(rows.length, focusCol);
  };
  const addCol = () => {
    onUpdate({ rows: rows.map(r => [...r, ""]) });
    focusCell(0, rows[0].length);
  };
  return (
    <div style={{ margin: "10px 0", overflow: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-md)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => {
                const isHeader = r === 0;
                const Tag = isHeader ? "th" : "td";
                return (
                  <Tag
                    key={c}
                    data-table-block-id={block.id}
                    data-row={r}
                    data-col={c}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCell(r, c, e.currentTarget.textContent)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addRow(c); }
                      if (e.key === "Tab") {
                        e.preventDefault();
                        if (c === row.length - 1 && r === rows.length - 1) {
                          addRow(c);
                        } else {
                          const nextRow = c === row.length - 1 ? r + 1 : r;
                          const nextCol = c === row.length - 1 ? 0 : c + 1;
                          focusCell(nextRow, nextCol);
                        }
                      }
                    }}
                    style={{
                      padding: "8px 10px",
                      border: "1px solid var(--border-soft)",
                      background: isHeader ? "var(--bg-elev)" : "transparent",
                      fontWeight: isHeader ? 700 : 500,
                      color: isHeader ? "var(--text-hi)" : "var(--text-md)",
                      textAlign: "left", outline: "none",
                      minWidth: 80,
                    }}
                  >{cell}</Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 6, padding: 6, borderTop: "1px solid var(--border-soft)", background: "var(--surface-2)" }}>
        <button type="button" className="btn btn-sm" onClick={() => addRow()}><Icon name="plus" size={11} />행 추가</button>
        <button type="button" className="btn btn-sm" onClick={addCol}><Icon name="plus" size={11} />열 추가</button>
      </div>
    </div>
  );
}

function ImageBlock({ block, onUpdate }) {
  const fileRef = useRefO(null);
  const [caption, setCaption] = useStateO(block.caption || "");
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onUpdate({ url: reader.result, name: file.name });
    reader.readAsDataURL(file);
  };
  const handleUrl = () => {
    const u = window.prompt("이미지 URL을 입력하세요");
    if (u) onUpdate({ url: u, name: u.split("/").pop() });
  };
  if (!block.url) {
    return (
      <div style={{ margin: "10px 0", padding: 24, border: "1px dashed var(--border)", borderRadius: "var(--r-md)", background: "var(--bg-elev)", textAlign: "center" }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <Icon name="image" size={28} style={{ color: "var(--text-faint)", marginBottom: 8 }} />
        <div style={{ fontSize: 13, color: "var(--text-md)", fontWeight: 600 }}>이미지를 추가하세요</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 4 }}>PNG · JPG · WebP · GIF</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
          <button type="button" className="btn btn-sm" onClick={() => fileRef.current?.click()}><Icon name="image" size={11} />업로드</button>
          <button type="button" className="btn btn-sm" onClick={handleUrl}><Icon name="link" size={11} />URL</button>
        </div>
      </div>
    );
  }
  return (
    <figure style={{ margin: "10px 0", padding: 0 }}>
      <img src={block.url} alt={block.name || ""} style={{ maxWidth: "100%", borderRadius: "var(--r-md)", border: "1px solid var(--border-soft)", display: "block" }} />
      <figcaption
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onUpdate({ caption: e.currentTarget.textContent })}
        style={{ fontSize: 11, color: "var(--text-lo)", textAlign: "center", marginTop: 6, outline: "none", fontStyle: "italic" }}
        data-placeholder="캡션 추가"
      >{caption || ""}</figcaption>
    </figure>
  );
}

function AttachBlock({ block, onUpdate }) {
  const fileRef = useRefO(null);
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdate({ name: file.name, size: file.size });
  };
  if (!block.name) {
    return (
      <div style={{ margin: "10px 0", padding: 14, border: "1px dashed var(--border)", borderRadius: "var(--r-md)", background: "var(--bg-elev)", display: "flex", alignItems: "center", gap: 12 }}>
        <input ref={fileRef} type="file" style={{ display: "none" }} onChange={handleFile} />
        <Icon name="paperclip" size={18} style={{ color: "var(--text-lo)", flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, color: "var(--text-lo)" }}>파일 첨부</div>
        <button type="button" className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()}>
          <Icon name="paperclip" size={11} />선택
        </button>
      </div>
    );
  }
  const sizeKB = block.size ? Math.round(block.size / 1024) : 0;
  return (
    <div style={{ margin: "10px 0", padding: 12, border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name="paperclip" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{block.name}</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{sizeKB > 0 ? `${sizeKB.toLocaleString()} KB` : "—"}</div>
      </div>
      <button type="button" className="btn btn-sm"><Icon name="download" size={11} />다운로드</button>
    </div>
  );
}

function BookmarkBlock({ block, onUpdate }) {
  const [editing, setEditing] = useStateO(!block.url);
  const [urlDraft, setUrlDraft] = useStateO(block.url || "");
  if (editing) {
    return (
      <div style={{ margin: "10px 0", padding: 14, border: "1px dashed var(--border)", borderRadius: "var(--r-md)", background: "var(--bg-elev)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Icon name="link" size={16} style={{ color: "var(--text-lo)", flexShrink: 0 }} />
          <input
            autoFocus
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onUpdate({ url: urlDraft, title: urlDraft.replace(/^https?:\/\//, "").split("/")[0] });
                setEditing(false);
              }
            }}
            placeholder="URL을 붙여넣고 Enter"
            className="form-input"
            style={{ flex: 1, fontFamily: "var(--font-mono)" }}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => { onUpdate({ url: urlDraft, title: urlDraft.replace(/^https?:\/\//, "").split("/")[0] }); setEditing(false); }}
            disabled={!urlDraft.trim()}
          >
            가져오기
          </button>
        </div>
      </div>
    );
  }
  return (
    <a
      href={block.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => { if (e.target.closest(".bookmark-edit-btn")) e.preventDefault(); }}
      style={{
        margin: "10px 0", padding: 14,
        display: "flex", gap: 14,
        background: "var(--bg-elev)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-md)",
        color: "inherit", textDecoration: "none",
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name="globe" size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{block.title || block.url}</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{block.url}</div>
      </div>
      <button
        type="button"
        className="btn btn-sm bookmark-edit-btn"
        onClick={(e) => { e.preventDefault(); setEditing(true); }}
        style={{ alignSelf: "start" }}
      >
        <Icon name="edit" size={11} />
      </button>
    </a>
  );
}

/* ===========================================================
   SHARE DIALOG (existing — leave below)
   =========================================================== */

function ShareDialog({ onClose, title }) {
  const [visibility, setVisibility] = useStateO("private");
  const [emailDraft, setEmailDraft] = useStateO("");
  const [copied, setCopied] = useStateO(false);
  const [collaborators, setCollaborators] = useStateO([
  { name: "도하 김", email: "doha@planary.app", role: "owner", initials: "DK" }]
  );

  const url = `https://planary.app/w/${title.replace(/\s+/g, "-").toLowerCase()}-x9k2`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }).catch(() => {});
    }
  };

  const handleInvite = () => {
    if (!emailDraft.trim() || !emailDraft.includes("@")) return;
    const name = emailDraft.split("@")[0];
    const initials = name.slice(0, 2).toUpperCase();
    setCollaborators((prev) => [...prev, { name, email: emailDraft.trim(), role: "editor", initials }]);
    setEmailDraft("");
  };

  useEffectO(() => {
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>공유 · <span style={{ color: "var(--text-lo)", fontWeight: 600 }}>{title}</span></h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>이 페이지에 접근할 수 있는 사람을 관리합니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          {/* Invite by email */}
          <label className="kicker" style={{ marginBottom: 8, display: "block" }}>이메일로 초대</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="email"
              placeholder="name@example.com"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => {if (e.key === "Enter") handleInvite();}}
              style={{
                flex: 1,
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "9px 12px",
                fontSize: 13, color: "var(--text-hi)",
                outline: "none"
              }} />
            
            <select
              defaultValue="editor"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "0 10px",
                fontSize: 12, color: "var(--text-md)",
                outline: "none"
              }}>
              
              <option value="viewer">읽기 전용</option>
              <option value="editor">편집 가능</option>
              <option value="admin">관리자</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleInvite} disabled={!emailDraft.includes("@")} style={{ height: 36 }}>
              초대
            </button>
          </div>

          {/* Collaborator list */}
          <div style={{ marginTop: 16 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>접근 가능한 사용자 · {collaborators.length}명</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {collaborators.map((c, i) =>
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: "var(--r-sm)" }}>
                  <div className="avatar" style={{ width: 28, height: 28 }}>{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{c.email}</div>
                  </div>
                  {c.role === "owner" ?
                <span className="chip" style={{ height: 22 }}>소유자</span> :

                <>
                      <select
                    defaultValue={c.role}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-soft)",
                      borderRadius: "var(--r-sm)",
                      padding: "4px 8px",
                      fontSize: 11, color: "var(--text-md)",
                      outline: "none", cursor: "pointer"
                    }}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "remove") setCollaborators((prev) => prev.filter((_, idx) => idx !== i));else
                      setCollaborators((prev) => prev.map((x, idx) => idx === i ? { ...x, role: v } : x));
                    }}>
                    
                        <option value="viewer">읽기</option>
                        <option value="editor">편집</option>
                        <option value="admin">관리자</option>
                        <option value="remove" style={{ color: "var(--err)" }}>제거</option>
                      </select>
                    </>
                }
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dialog-divider" />

        <div style={{ padding: "16px 22px" }}>
          <label className="kicker" style={{ marginBottom: 10, display: "block" }}>일반 액세스</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
            { id: "private", icon: "lock", title: "비공개", body: "초대된 사람만 볼 수 있어요" },
            { id: "link", icon: "link", title: "링크 있는 모든 사람", body: "링크를 가진 사람은 누구나 읽을 수 있어요" },
            { id: "public", icon: "globe", title: "공개 (검색 허용)", body: "검색엔진과 모든 인터넷 사용자에게 공개돼요" }].
            map((opt) =>
            <button
              key={opt.id}
              onClick={() => setVisibility(opt.id)}
              type="button"
              style={{
                display: "flex", alignItems: "start", gap: 12,
                padding: 12,
                border: visibility === opt.id ? "1px solid var(--accent-ring)" : "1px solid var(--border-soft)",
                background: visibility === opt.id ? "var(--accent-softer)" : "transparent",
                borderRadius: "var(--r-md)",
                cursor: "pointer", textAlign: "left",
                transition: "all var(--dur-fast)"
              }}>
              
                <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: visibility === opt.id ? "var(--accent-soft)" : "var(--surface-2)",
                color: visibility === opt.id ? "var(--accent)" : "var(--text-lo)",
                display: "grid", placeItems: "center", flexShrink: 0
              }}>
                  <Icon name={opt.icon} size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{opt.body}</div>
                </div>
                {visibility === opt.id && <Icon name="check" size={14} style={{ color: "var(--accent)", marginTop: 8 }} stroke={3} />}
              </button>
            )}
          </div>
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0, background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding: "7px 10px", overflow: "hidden" }}>
            <Icon name="link" size={12} style={{ color: "var(--text-lo)", flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--text-md)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{url}</span>
          </div>
          <button className="btn btn-sm" onClick={handleCopy} type="button">
            <Icon name={copied ? "check" : "copy"} size={12} />
            {copied ? "복사됨" : "링크 복사"}
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>);

}

/* ===========================================================
   TASK EDIT DIALOG
   =========================================================== */
function TaskEditDialog({ task, onClose, onSave, onDelete }) {
  const { PROJECTS, ECLASS_COURSES } = window.Planary;
  const [draft, setDraft] = useStateO({ ...task });
  const [datePopover, setDatePopover] = useStateO(false);
  const [priorityPopover, setPriorityPopover] = useStateO(false);
  const [projectPopover, setProjectPopover] = useStateO(false);

  const update = (k, v) => setDraft((prev) => ({ ...prev, [k]: v }));
  const proj = PROJECTS.find((p) => p.id === draft.project);
  const course = ECLASS_COURSES && ECLASS_COURSES.find((c) => c.id === draft.course);

  useEffectO(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(draft);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  const priorityMeta = {
    high: { label: "높음", color: "var(--err)" },
    med: { label: "보통", color: "var(--warn)" },
    low: { label: "낮음", color: "var(--info)" }
  };
  const p = priorityMeta[draft.priority] || priorityMeta.med;

  const dateLabel = draft.time || "날짜 없음";

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(580px, 92vw)" }}>
        <div className="dialog-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <button
              className={`checkbox ${draft.done ? "is-checked" : ""}`}
              onClick={() => update("done", !draft.done)}>
              
              {draft.done && <Icon name="check" size={12} stroke={3} />}
            </button>
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="작업 제목"
              style={{
                flex: 1, minWidth: 0,
                fontSize: 18, fontWeight: 700,
                background: "transparent", border: 0, outline: "none",
                color: "var(--text-hi)",
                letterSpacing: "-0.015em",
                textDecoration: draft.done ? "line-through" : "none"
              }} />
            
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="닫기"><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "12px 22px 18px" }}>
          {/* Memo */}
          <textarea
            value={draft.memo || ""}
            onChange={(e) => update("memo", e.target.value)}
            placeholder="메모 추가… (선택)"
            rows={3}
            style={{
              width: "100%",
              background: "transparent",
              border: 0, outline: "none",
              color: "var(--text-md)",
              fontSize: 14, lineHeight: 1.6,
              fontFamily: "var(--font-display)",
              resize: "vertical",
              padding: 0
            }} />

          {draft.imageUrl && (
            <div className="task-attachment-preview">
              <div className="task-attachment-head">
                <div>
                  <div className="task-attachment-title">
                    <Icon name="image" size={13} />첨부 이미지
                  </div>
                  <div className="task-attachment-sub">작업에 연결된 사진</div>
                </div>
                <a className="btn btn-sm" href={draft.imageUrl} target="_blank" rel="noreferrer">
                  <Icon name="arrowUpRight" size={12} />열기
                </a>
              </div>
              <a href={draft.imageUrl} target="_blank" rel="noreferrer" className="task-attachment-image-link">
                <img src={draft.imageUrl} alt="첨부 이미지" className="task-attachment-image" />
              </a>
            </div>
          )}

          {/* Property rows */}
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid var(--border-soft)" }}>
            {/* Date */}
            <PropRow icon="calendar" label="날짜" value={dateLabel} onClick={() => {setDatePopover(true);setPriorityPopover(false);setProjectPopover(false);}}>
              {datePopover &&
              <PropPopover onClose={() => setDatePopover(false)}>
                  {[
                { label: "오늘", value: "오늘" },
                { label: "내일", value: "내일" },
                { label: "이번 주", value: "수요일" },
                { label: "다음 주", value: "다음주 월요일" },
                { label: "없음", value: null }].
                map((opt) =>
                <button
                  key={opt.label}
                  className={`tool-popover-item ${draft.time === opt.value ? "is-active" : ""}`}
                  onClick={() => {update("time", opt.value);setDatePopover(false);}}
                  type="button">
                  
                      <Icon name="calendar" size={12} />
                      <span>{opt.label}</span>
                    </button>
                )}
                </PropPopover>
              }
            </PropRow>

            {/* Time / Reminder */}
            <PropRow
              icon="bell"
              label="리마인더"
              value={draft.reminder ? "알림 켜짐" : "없음"}
              onClick={() => update("reminder", !draft.reminder)}
              chip={draft.reminder && <span className="chip chip-accent" style={{ height: 22 }}>활성</span>} />
            

            {/* Priority */}
            <PropRow icon="flag" label="우선순위" valueColor={p.color} value={p.label} onClick={() => {setPriorityPopover(true);setDatePopover(false);setProjectPopover(false);}}>
              {priorityPopover &&
              <PropPopover onClose={() => setPriorityPopover(false)}>
                  {Object.entries(priorityMeta).map(([k, v]) =>
                <button
                  key={k}
                  className={`tool-popover-item ${draft.priority === k ? "is-active" : ""}`}
                  onClick={() => {update("priority", k);setPriorityPopover(false);}}
                  type="button">
                  
                      <span className="dot" style={{ background: v.color, width: 9, height: 9, borderRadius: 2 }} />
                      <span>{v.label}</span>
                    </button>
                )}
                </PropPopover>
              }
            </PropRow>

            {/* Project */}
            <PropRow
              icon="folder"
              label="프로젝트"
              value={proj ? proj.name : course ? course.name : "프로젝트 없음"}
              onClick={() => {setProjectPopover(true);setDatePopover(false);setPriorityPopover(false);}}>
              
              {projectPopover &&
              <PropPopover onClose={() => setProjectPopover(false)}>
                  <button
                  className={`tool-popover-item ${!draft.project ? "is-active" : ""}`}
                  onClick={() => {update("project", null);setProjectPopover(false);}}
                  type="button">
                  
                    <span className="proj-color" style={{ background: "var(--text-faint)" }} />
                    <span>프로젝트 없음</span>
                  </button>
                  {PROJECTS.map((p) =>
                <button
                  key={p.id}
                  className={`tool-popover-item ${draft.project === p.id ? "is-active" : ""}`}
                  onClick={() => {update("project", p.id);setProjectPopover(false);}}
                  type="button">
                  
                      <span className="proj-color" style={{ background: p.color }} />
                      <span>{p.name}</span>
                    </button>
                )}
                </PropPopover>
              }
            </PropRow>

            {/* Tags */}
            <PropRow icon="hash" label="태그" value={draft.tags && draft.tags.length ? "" : "태그 없음"}>
              {draft.tags && draft.tags.length > 0 &&
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1, justifyContent: "flex-end" }}>
                  {draft.tags.map((tag) =>
                <span key={tag} className="tag" onClick={() => update("tags", draft.tags.filter((x) => x !== tag))}>
                      {tag} <Icon name="x" size={9} style={{ marginLeft: 2, opacity: 0.6 }} />
                    </span>
                )}
                </div>
              }
            </PropRow>
          </div>
        </div>

        <div className="dialog-foot">
          <button
            className="btn btn-sm"
            style={{ color: "var(--err)" }}
            onClick={() => {if (window.confirm("이 작업을 삭제할까요?")) onDelete(task.id);}}>
            
            <Icon name="trash" size={12} />삭제
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>
            저장 <span className="kbd" style={{ marginLeft: 4 }}>⌘↵</span>
          </button>
        </div>
      </div>
    </div>);

}

function PropRow({ icon, label, value, valueColor, onClick, children, chip }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        style={{
          width: "100%",
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 4px",
          borderBottom: "1px solid var(--border-soft)",
          background: "transparent",
          cursor: onClick ? "pointer" : "default",
          textAlign: "left",
          transition: "background var(--dur-fast)"
        }}
        onMouseEnter={(e) => onClick && (e.currentTarget.style.background = "var(--hover)")}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
        
        <div style={{ width: 24, color: "var(--text-lo)", display: "grid", placeItems: "center" }}>
          <Icon name={icon} size={14} />
        </div>
        <div style={{ flex: 1, fontSize: 13, color: "var(--text-lo)", fontWeight: 600 }}>{label}</div>
        {chip}
        {value &&
        <div style={{ fontSize: 13, color: valueColor || "var(--text-hi)", fontWeight: 600 }}>{value}</div>
        }
        {onClick && <Icon name="chevronRight" size={11} style={{ color: "var(--text-faint)" }} />}
      </button>
      {children}
    </div>);

}

function PropPopover({ children, onClose }) {
  useEffectO(() => {
    const onClick = () => onClose();
    setTimeout(() => window.addEventListener("click", onClick), 0);
    return () => window.removeEventListener("click", onClick);
  }, []);
  return (
    <div
      className="tool-popover"
      style={{ position: "absolute", top: "100%", right: 4, left: "auto", bottom: "auto", minWidth: 180 }}
      onClick={(e) => e.stopPropagation()}>
      
      {children}
    </div>);

}

/* ===========================================================
   SESSIONS DIALOG
   =========================================================== */
function SessionsDialog({ onClose }) {
  const ua = navigator.userAgent;
  const browser = /Edg/.test(ua) ? "Edge" : /Chrome/.test(ua) ? "Chrome" : /Firefox/.test(ua) ? "Firefox" : /Safari/.test(ua) ? "Safari" : "브라우저";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "기기";
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(480px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>활성 세션</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>로그인된 기기 목록입니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--surface-2)", borderRadius: "var(--r-md)", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="globe" size={18} style={{ color: "var(--accent)" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{browser} · {os}</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{today} 로그인</div>
              </div>
            </div>
            <span className="chip chip-ok" style={{ height: 20, fontSize: 10, padding: "0 7px" }}>현재 기기</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 14, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
            <Icon name="info" size={11} style={{ verticalAlign: -2, marginRight: 5 }} />
            다른 기기의 세션을 강제로 종료하려면 비밀번호를 변경하세요.
          </div>
        </div>
        <div className="dialog-foot">
          <button
            className="btn btn-sm btn-ghost"
            style={{ color: "var(--err)" }}
            onClick={() => { window.dispatchEvent(new CustomEvent("planary:sign-out")); onClose(); }}
          >
            <Icon name="logout" size={12} />이 기기에서 로그아웃
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   2FA SETUP DIALOG
   =========================================================== */
function TwoFactorSetupDialog({ onClose, userEmail }) {
  const [method, setMethod] = useStateO("email");
  const [sent, setSent] = useStateO(false);

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSetup = () => {
    window.dispatchEvent(new CustomEvent("planary:setup-2fa", { detail: { method, email: userEmail } }));
    setSent(true);
    if (method === "email") {
      window.Planary.toast?.({ type: "ok", title: "인증 코드를 이메일로 발송했어요", sub: userEmail });
    } else {
      window.Planary.toast?.({ type: "info", title: "준비 중인 기능이에요" });
    }
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>2단계 인증 설정</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>로그인 시 추가 인증 방법을 선택하세요</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: "16px 22px" }}>
          {[
            { id: "email", icon: "send", label: "이메일 인증", desc: `${userEmail || "등록된 이메일"}로 코드 전송` },
            { id: "totp",  icon: "clock", label: "인증 앱 (TOTP)", desc: "Google Authenticator 등 사용 (준비 중)" },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => m.id !== "totp" && setMethod(m.id)}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                padding: "12px 14px", borderRadius: "var(--r-md)", marginBottom: 8, cursor: m.id === "totp" ? "not-allowed" : "pointer",
                background: method === m.id ? "var(--accent-soft)" : "var(--surface-2)",
                border: `1.5px solid ${method === m.id ? "var(--accent)" : "transparent"}`,
                opacity: m.id === "totp" ? 0.5 : 1,
              }}
            >
              <Icon name={m.icon} size={18} style={{ color: method === m.id ? "var(--accent)" : "var(--text-lo)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{m.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{m.desc}</div>
              </div>
              {method === m.id && <Icon name="check" size={14} stroke={3} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
            </button>
          ))}
          {sent && (
            <div style={{ fontSize: 12, color: "var(--ok)", display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <Icon name="check" size={12} stroke={3} />코드가 발송됐어요. 받은편지함을 확인하세요.
            </div>
          )}
        </div>
        <div className="dialog-foot">
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-sm btn-primary" onClick={handleSetup} disabled={sent}>
            <Icon name="send" size={12} />{sent ? "발송됨" : "코드 발송"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   SIGN OUT / DELETE ACCOUNT DIALOG
   =========================================================== */
function SignOutDialog({ onClose, user }) {
  const [mode, setMode] = useStateO("signout"); // signout | delete
  const [confirmText, setConfirmText] = useStateO("");
  const expected = user && user.email ? user.email : "";

  useEffectO(() => {
    const onKey = (e) => {if (e.key === "Escape") onClose();};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = () => {
    window.Planary.toast({ type: "info", title: "로그아웃 중…", sub: "잠시 후 로그인 화면으로 이동합니다" });
    window.dispatchEvent(new CustomEvent("planary:sign-out"));
    setTimeout(onClose, 600);
  };
  const deleteAccount = () => {
    if (confirmText !== expected) return;
    window.dispatchEvent(new CustomEvent("planary:delete-account", {
      detail: {
        onResult: (res) => {
          if (res && res.ok) {
            window.Planary.toast({ type: "err", title: "계정이 삭제됐어요", sub: "복구는 30일 이내에만 가능합니다", ttl: 4800 });
          } else {
            window.Planary.toast({ type: "err", title: "계정 삭제 실패", sub: res && res.error });
          }
        },
      },
    }));
    setTimeout(onClose, 600);
  };

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(520px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>
              {mode === "signout" ? "로그아웃" : "계정 탈퇴"}
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>
              {mode === "signout" ?
              "이 기기에서 세션을 종료합니다. 데이터는 그대로 유지돼요." :
              "계정과 모든 데이터를 영구 삭제합니다. 되돌릴 수 없습니다."}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-sm)" }}>
            {[
            { id: "signout", label: "로그아웃", icon: "logout" },
            { id: "delete", label: "계정 탈퇴", icon: "trash" }].
            map((t) =>
            <button
              key={t.id}
              onClick={() => {setMode(t.id);setConfirmText("");}}
              style={{
                flex: 1, height: 30, borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontSize: 12, fontWeight: 600,
                background: mode === t.id ? "var(--surface)" : "transparent",
                color: mode === t.id ? t.id === "delete" ? "var(--err)" : "var(--text-hi)" : "var(--text-lo)",
                boxShadow: mode === t.id ? "var(--shadow-sm)" : "none"
              }}>
              
                <Icon name={t.icon} size={12} />{t.label}
              </button>
            )}
          </div>

          {mode === "signout" ?
          <>
              <div style={{ padding: 14, background: "var(--bg-elev)", border: "1px solid var(--border-soft)", borderRadius: "var(--r-md)" }}>
                <div style={{ fontSize: 13, color: "var(--text-md)", lineHeight: 1.6 }}>
                  로그아웃해도 작업·노트·위키·북마크는 모두 안전하게 보관됩니다. 같은 계정으로 다시 로그인하면 그대로 이어집니다.
                </div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
                {[
              "이 기기에서 세션만 종료",
              "데이터는 클라우드에 그대로 유지",
              "다른 기기에는 영향 없음"].
              map((p, i) =>
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-md)" }}>
                    <Icon name="check" size={11} stroke={3} style={{ color: "var(--ok)" }} />{p}
                  </li>
              )}
              </ul>
            </> :

          <>
              <div style={{ padding: 14, background: "color-mix(in oklab, var(--err) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--err) 30%, var(--border))", borderRadius: "var(--r-md)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                  <Icon name="flag" size={16} style={{ color: "var(--err)", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: "var(--text-hi)", lineHeight: 1.55 }}>
                    <strong>이 작업은 되돌릴 수 없습니다.</strong><br />
                    <span style={{ color: "var(--text-md)" }}>
                      계정과 함께 모든 작업·노트·위키·북마크·메모·e-Class 연결이 영구 삭제됩니다. 30일 이내에는 같은 이메일로 복구 요청을 보낼 수 있습니다.
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  확인을 위해 이메일을 입력하세요
                </label>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, marginBottom: 6, fontFamily: "var(--font-mono)" }}>{expected}</div>
                <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={expected}
                className="form-input"
                style={{ fontFamily: "var(--font-mono)" }} />
              
              </div>
            </>
          }
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            {mode === "delete" && confirmText !== expected ? "이메일이 일치하지 않습니다" : ""}
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          {mode === "signout" ?
          <button className="btn btn-sm" style={{ color: "var(--err)", borderColor: "color-mix(in oklab, var(--err) 30%, var(--border))" }} onClick={signOut}>
              <Icon name="logout" size={12} />로그아웃
            </button> :

          <button
            className="btn btn-sm btn-primary"
            style={{ background: "var(--err)", color: "white" }}
            disabled={confirmText !== expected}
            onClick={deleteAccount}>
            
              <Icon name="trash" size={12} />영구 삭제
            </button>
          }
        </div>
      </div>
    </div>);

}

/* ===========================================================
   PROFILE EDIT DIALOG
   =========================================================== */
function ProfileEditDialog({ user, onClose, onSave }) {
  const [draft, setDraft] = useStateO({ ...user });
  const fileRef = useRefO(null);
  const update = (k, v) => setDraft((prev) => ({ ...prev, [k]: v }));
  const isImage = draft.avatar && typeof draft.avatar === "string" && draft.avatar.startsWith("url(");

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("avatar", `url("${reader.result}")`);
    reader.readAsDataURL(file);
  };

  const SCHOOLS = [
  "서울과학기술대학교", "서울대학교", "연세대학교", "고려대학교",
  "한양대학교", "성균관대학교", "이화여자대학교", "중앙대학교",
  "건국대학교", "동국대학교", "기타"];


  useEffectO(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSave(draft);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ width: "min(620px, 92vw)" }}>
        <div className="dialog-head">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>프로필 편집</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 2 }}>이름·아바타·학교 정보를 변경합니다</p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div className="kicker" style={{ marginBottom: 10 }}>프로필 사진</div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
            <div
              style={{
                width: 76, height: 76,
                borderRadius: "50%",
                background: isImage ? `${draft.avatar} center/cover no-repeat` : "var(--accent-soft)",
                color: "var(--accent)",
                display: "grid", placeItems: "center",
                fontSize: 30, fontWeight: 800,
                border: "1px solid var(--border)",
                flexShrink: 0, overflow: "hidden"
              }}>
              
              {!isImage && draft.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <button className="btn btn-sm btn-ghost" onClick={() => fileRef.current && fileRef.current.click()} type="button">
                  <Icon name="image" size={12} />사진 업로드
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => {const url = window.prompt("이미지 URL", "");if (url) update("avatar", `url("${url}")`);}}
                  type="button">
                  
                  <Icon name="link" size={12} />URL로 추가
                </button>
                {isImage &&
                <button className="btn btn-sm" style={{ color: "var(--err)" }} onClick={() => update("avatar", null)} type="button">
                    <Icon name="trash" size={12} />제거
                  </button>
                }
              </div>
              <p style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5 }}>
                정사각형 이미지 권장 · 5MB까지. 비워두면 이니셜이 표시됩니다.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 }}>
            <FormField label="이름">
              <input
                value={draft.name}
                onChange={(e) => {
                  const v = e.target.value;
                  update("name", v);
                  const parts = v.split(/\s+/).filter(Boolean);
                  const initials = parts.length > 1 ?
                  (parts[1][0] + parts[0][0]).toUpperCase() :
                  v.slice(0, 2).toUpperCase();
                  update("initials", initials);
                }}
                className="form-input"
                placeholder="이름" />
              
            </FormField>
            <FormField label="이메일" hint="이메일은 변경할 수 없습니다">
              <div style={{ position: "relative" }}>
                <input value={draft.email} readOnly className="form-input" style={{ cursor: "default", color: "var(--text-lo)" }} placeholder="email@example.com" />
                <span className="chip chip-ok" style={{ position: "absolute", right: 6, top: 6, height: 22, fontSize: 10 }}>
                  <Icon name="check" size={9} stroke={3} />인증됨
                </span>
              </div>
            </FormField>
            <FormField label="학교">
              <select value={draft.school || ""} onChange={(e) => update("school", e.target.value)} className="form-input">
                {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="학번">
              <input value={draft.studentId || ""} onChange={(e) => update("studentId", e.target.value)} className="form-input" placeholder="학번" />
            </FormField>
          </div>

          <div style={{ marginTop: 12 }}>
            <FormField label="자기소개" hint="선택 · 최대 140자">
              <textarea
                value={draft.bio || ""}
                onChange={(e) => update("bio", e.target.value.slice(0, 140))}
                placeholder="간단한 자기소개를 적어주세요"
                rows={2}
                className="form-input"
                style={{ resize: "vertical", lineHeight: 1.5 }} />
              
              <div style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "right", marginTop: 2 }}>
                {(draft.bio || "").length}/140
              </div>
            </FormField>
          </div>
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            변경사항은 모든 기기에서 동기화됩니다
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>
            저장 <span className="kbd" style={{ marginLeft: 4 }}>⌘↵</span>
          </button>
        </div>
      </div>
    </div>);

}

function FormField({ label, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{hint}</span>}
      </div>
      {children}
    </label>);

}

/* ===========================================================
   WIKI BLOCKS — editable + drag-reorderable
   =========================================================== */
const INITIAL_BLOCKS_BY_PAGE = {
  w3: [
    { id: "b1", type: "p", content: "Planary는 <strong>단일 악센트 컬러</strong> 위에 풍부한 중성색 스택을 쌓아 정보 위계를 만듭니다. 다크 모드를 기본으로 하고, 라이트 모드는 동일한 위계를 반전 톤으로 유지합니다." },
    { id: "b2", type: "callout", variant: "ok", title: "설계 원칙.", body: "새로운 hex를 추가하지 마세요. 악센트의 투명도 단계(<code>--accent-soft</code>, <code>--accent-softer</code>)와 <code>color-mix(in oklab, ...)</code>로 충분히 표현 가능합니다." },
    { id: "b3", type: "h2", content: "코어 토큰" },
    { id: "b4", type: "p", content: "모든 컬러는 <code>var(--*)</code>로만 접근합니다. 가공이 필요할 때는 <code>color-mix</code>로 표현해 다크/라이트 자동 호환을 보장합니다." },
    { id: "b5", type: "h3", content: "악센트 팔레트" },
    { id: "b6", type: "p", content: "사용자는 6가지 악센트 중 자신의 워크스페이스 톤을 선택할 수 있습니다. 모두 같은 시각적 무게를 가지도록 조정되어 있습니다." },
    { id: "b7", type: "h3", content: "텍스트 스택" },
    { id: "b8", type: "p", content: "슬레이트 5단계로 위계를 만듭니다. 본문 안에 <code>--text-md</code>, 헤딩에 <code>--text-hi</code>, 메타에 <code>--text-lo</code>, 빈 상태에 <code>--text-mute</code>." },
    { id: "b9", type: "quote", content: "좋은 위계는 무엇이 중요한지 말해주지 않습니다. 그저 보이게 만들 뿐이에요." },
    { id: "b10", type: "callout", variant: "warn", title: "주의.", body: "본문 안에 <code>--text-hi</code>를 쓰면 위계가 망가집니다. 본문은 무조건 <code>--text-md</code>." },
    { id: "b11", type: "h2", content: "그림자 & 글로우" },
    { id: "b12", type: "p", content: "물리적 그림자 3단계 + 악센트 글로우 1종. 활성 CTA·로고에만 사용해 브랜드 시그니처로 살립니다." },
  ],
};

function WikiBlocks({ activeId, onBlocksChange }) {
  const [blocks, setBlocks] = useStateO(() => INITIAL_BLOCKS_BY_PAGE[activeId] || [
    { id: "b1", type: "p", content: "" }
  ]);
  const [activeBlockId, setActiveBlockId] = useStateO(null);
  const [focusBlockId, setFocusBlockId] = useStateO(null);
  const [dragId, setDragId] = useStateO(null);
  const [dropId, setDropId] = useStateO(null);
  const [dropPos, setDropPos] = useStateO("after"); // before | after
  const [menuOpenId, setMenuOpenId] = useStateO(null);
  const [slashMenu, setSlashMenu] = useStateO(null); // { blockId, x, y } | null
  const lastSavedRef = useRefO("");
  const liveBlocksRef = useRefO(blocks);
  const liveSaveTimerRef = useRefO(null);
  const undoStackRef = useRefO([]);
  const isRestoringRef = useRefO(false);

  // Re-load blocks when switching pages — prefer live WIKI_PAGES from firebase-bridge
  useEffectO(() => {
    const live = window.Planary.WIKI_PAGES && window.Planary.WIKI_PAGES[activeId];
    const initial = (live && Array.isArray(live.blocks) && live.blocks.length)
      ? live.blocks
      : (INITIAL_BLOCKS_BY_PAGE[activeId] || [{ id: `b${Date.now()}`, type: "p", content: "" }]);
    setBlocks(initial);
    setActiveBlockId(null);
    setSlashMenu(null);
    // Mark this load as "remote" so the save-effect below skips it
    lastSavedRef.current = JSON.stringify(initial);
    liveBlocksRef.current = initial;
    undoStackRef.current = [initial];
    return () => {
      // Force-save any pending unsaved typing before switching to another page
      clearTimeout(liveSaveTimerRef.current);
      const data = liveBlocksRef.current;
      const serialized = JSON.stringify(data);
      if (activeId && serialized !== lastSavedRef.current) {
        lastSavedRef.current = serialized;
        window.dispatchEvent(new CustomEvent("planary:save-wiki-blocks", {
          detail: { id: activeId, blocks: data },
        }));
      }
    };
  }, [activeId]);

  // Refresh blocks when the bridge emits fresh wiki data for the current page
  useEffectO(() => {
    const onLoaded = (e) => {
      const d = e.detail || {};
      const live = d.byId && d.byId[activeId];
      if (live && Array.isArray(live.blocks)) {
        const serialized = JSON.stringify(live.blocks);
        if (serialized !== lastSavedRef.current) {
          setBlocks(live.blocks);
          lastSavedRef.current = serialized;
        }
      }
    };
    window.addEventListener("planary:wiki-loaded", onLoaded);
    return () => window.removeEventListener("planary:wiki-loaded", onLoaded);
  }, [activeId]);

  // Apply restored blocks from VersionHistoryDialog
  useEffectO(() => {
    const onRestore = (e) => {
      const d = e.detail || {};
      if (d.id !== activeId || !Array.isArray(d.blocks)) return;
      setBlocks(d.blocks);
      liveBlocksRef.current = d.blocks;
      lastSavedRef.current = JSON.stringify(d.blocks);
      undoStackRef.current = [d.blocks];
    };
    window.addEventListener("planary:wiki-restore", onRestore);
    return () => window.removeEventListener("planary:wiki-restore", onRestore);
  }, [activeId]);

  // Notify parent of block changes (for TOC etc.)
  useEffectO(() => {
    onBlocksChange && onBlocksChange(blocks);
  }, [blocks]);

  // Keep a live ref of the latest blocks for ref-based reads (Ctrl+S, autosave from input).
  useEffectO(() => {
    liveBlocksRef.current = blocks;
    if (!isRestoringRef.current) {
      const last = undoStackRef.current[undoStackRef.current.length - 1];
      const serialized = JSON.stringify(blocks);
      if (!last || JSON.stringify(last) !== serialized) {
        undoStackRef.current.push(blocks);
        if (undoStackRef.current.length > 80) undoStackRef.current.shift();
      }
    }
  }, [blocks]);

  const flushSave = (sourceBlocks) => {
    if (!activeId) return;
    const data = sourceBlocks || liveBlocksRef.current;
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;
    window.dispatchEvent(new CustomEvent("planary:save-wiki-blocks", {
      detail: { id: activeId, blocks: data },
    }));
  };

  const scheduleAutoSave = () => {
    clearTimeout(liveSaveTimerRef.current);
    liveSaveTimerRef.current = setTimeout(() => flushSave(), 800);
  };

  // Debounced auto-save to Firestore when blocks state changes (structural ops, blur commits).
  useEffectO(() => {
    if (!activeId) return;
    const serialized = JSON.stringify(blocks);
    if (serialized === lastSavedRef.current) return;
    const t = setTimeout(() => flushSave(blocks), 800);
    return () => clearTimeout(t);
  }, [blocks, activeId]);

  // Live edit from contenteditable onInput — updates the live ref without
  // triggering re-render (avoids caret jump), and schedules autosave.
  const onLiveEdit = (blockId, key, value) => {
    liveBlocksRef.current = liveBlocksRef.current.map(b =>
      b.id === blockId ? { ...b, [key]: value } : b
    );
    scheduleAutoSave();
  };

  // Ctrl+S to force save now, Ctrl+Z to undo.
  useEffectO(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.isComposing) return;
      const k = (e.key || "").toLowerCase();
      if (k === "s") {
        e.preventDefault();
        e.stopPropagation();
        const active = document.activeElement;
        if (active && active.isContentEditable) {
          const editable = active;
          // Find which block this belongs to by walking up to nearest [data-block-id]
          const blockEl = editable.closest && editable.closest("[data-block-id]");
          if (blockEl) {
            onLiveEdit(blockEl.dataset.blockId, "content", editable.innerHTML);
          }
        }
        clearTimeout(liveSaveTimerRef.current);
        // Sync React state with live ref so blur won't overwrite, and snapshot for undo.
        setBlocks(liveBlocksRef.current);
        flushSave();
        window.Planary?.toast?.({ type: "ok", title: "저장됨", ttl: 1200 });
        return;
      }
      if (k === "z" && !e.shiftKey) {
        const active = document.activeElement;
        const inWiki = active && (active.isContentEditable || active.closest?.(".wiki-block"));
        if (!inWiki) return;
        if (undoStackRef.current.length < 2) return;
        e.preventDefault();
        e.stopPropagation();
        // If user typed since last commit, push current live state so undo lands on prior commit.
        const liveSerialized = JSON.stringify(liveBlocksRef.current);
        const topSerialized = JSON.stringify(undoStackRef.current[undoStackRef.current.length - 1]);
        if (liveSerialized !== topSerialized) {
          undoStackRef.current.push(liveBlocksRef.current);
        }
        undoStackRef.current.pop();
        const prev = undoStackRef.current[undoStackRef.current.length - 1];
        isRestoringRef.current = true;
        setBlocks(prev);
        liveBlocksRef.current = prev;
        scheduleAutoSave();
        setTimeout(() => { isRestoringRef.current = false; }, 0);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [activeId]);

  const updateBlock = (id, patch) =>
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  const defaultsForType = (type, content = "") => {
    if (type === "ul" || type === "ol") return { type, items: [content] };
    if (type === "todo") return { type, items: [{ text: content, checked: false }] };
    if (type === "table") return { type, rows: [["헤더 1", "헤더 2", "헤더 3"], ["", "", ""]] };
    if (type === "callout") return { type, variant: "ok", title: "포인트", body: content };
    return { type, content };
  };

  const addBlockAfter = (afterId, type = "p", { focus = true } = {}) => {
    const newId = `b${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    const newBlock = { id: newId, ...defaultsForType(type, "") };
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId);
      if (idx < 0) return [...prev, newBlock];
      return [...prev.slice(0, idx + 1), newBlock, ...prev.slice(idx + 1)];
    });
    setActiveBlockId(newId);
    if (focus) setFocusBlockId(newId);
    return newId;
  };

  const removeBlock = (id) =>
    setBlocks(prev => prev.filter(b => b.id !== id));

  const duplicateBlock = (id) =>
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const orig = prev[idx];
      const copy = { ...orig, id: `b${Date.now()}${Math.random().toString(36).slice(2, 5)}` };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });

  const openSlashMenu = (blockId, rect) => {
    setSlashMenu({ blockId, x: rect.left, y: rect.bottom + 6 });
  };

  // Drag handlers
  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", id); } catch (_) {}
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    if (id === dragId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientY - rect.top) < rect.height / 2 ? "before" : "after";
    setDropId(id);
    setDropPos(pos);
  };
  const onDragEnd = () => { setDragId(null); setDropId(null); };
  const onDrop = (e, id) => {
    e.preventDefault();
    if (!dragId || dragId === id) { onDragEnd(); return; }
    setBlocks(prev => {
      const src = prev.find(b => b.id === dragId);
      if (!src) return prev;
      const remaining = prev.filter(b => b.id !== dragId);
      const targetIdx = remaining.findIndex(b => b.id === id);
      if (targetIdx < 0) return prev;
      const insertAt = dropPos === "before" ? targetIdx : targetIdx + 1;
      return [...remaining.slice(0, insertAt), src, ...remaining.slice(insertAt)];
    });
    onDragEnd();
  };

  const addAtEnd = () => {
    const lastId = blocks[blocks.length - 1]?.id;
    addBlockAfter(lastId, "p");
  };

  return (
    <div className="wiki-block" onClick={() => setMenuOpenId(null)}>
      {blocks.map((b, i) => (
        <WikiBlockItem
          key={b.id}
          block={b}
          isActive={activeBlockId === b.id}
          autoFocus={focusBlockId === b.id}
          onAutoFocused={() => setFocusBlockId(null)}
          isDragging={dragId === b.id}
          dropIndicator={dropId === b.id ? dropPos : null}
          isMenuOpen={menuOpenId === b.id}
          onActivate={() => setActiveBlockId(b.id)}
          onUpdate={(patch) => updateBlock(b.id, patch)}
          onAddAfter={(type) => addBlockAfter(b.id, type)}
          onDuplicate={() => duplicateBlock(b.id)}
          onRemove={() => {
            removeBlock(b.id);
            // focus previous block on remove
            if (i > 0) setFocusBlockId(blocks[i - 1].id);
          }}
          onMenuToggle={() => setMenuOpenId(menuOpenId === b.id ? null : b.id)}
          onMenuClose={() => setMenuOpenId(null)}
          onLiveEdit={(key, value) => onLiveEdit(b.id, key, value)}
          onSlashCommand={(rect) => openSlashMenu(b.id, rect)}
          onDragStart={(e) => onDragStart(e, b.id)}
          onDragOver={(e) => onDragOver(e, b.id)}
          onDrop={(e) => onDrop(e, b.id)}
          onDragEnd={onDragEnd}
        />
      ))}

      {/* Notion-style trailing affordance — click to add a focused block */}
      <div
        className="wiki-block-trail"
        onClick={addAtEnd}
        title="클릭해서 추가 · /로 명령 메뉴"
      >
        <span className="wiki-block-trail-hint">
          <Icon name="plus" size={11} />
          <span>이어서 입력하거나 <kbd className="kbd">/</kbd>로 명령 메뉴 열기</span>
        </span>
      </div>

      {slashMenu && (
        <SlashCommandMenu
          slashMenu={slashMenu}
          onClose={() => setSlashMenu(null)}
          onPick={(type) => {
            const cur = liveBlocksRef.current.find(b => b.id === slashMenu.blockId);
            const content = cur ? (cur.content || "").replace(/\/\s*$/, "").trimEnd() : "";
            updateBlock(slashMenu.blockId, defaultsForType(type, content));
            setFocusBlockId(slashMenu.blockId);
            setSlashMenu(null);
          }}
        />
      )}
    </div>
  );
}

function WikiBlockItem({ block, isActive, autoFocus, onAutoFocused, isDragging, dropIndicator, isMenuOpen, onActivate, onUpdate, onAddAfter, onDuplicate, onRemove, onMenuToggle, onMenuClose, onLiveEdit, onSlashCommand, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const ref = useRefO(null);
  const bodyRef = useRefO(null);

  const commitContent = (key, val) => onUpdate({ [key]: val });
  const defaultsForType = (type, content = "") => {
    if (type === "ul" || type === "ol") return { type, items: [content] };
    if (type === "todo") return { type, items: [{ text: content, checked: false }] };
    if (type === "table") return { type, rows: [["헤더 1", "헤더 2", "헤더 3"], ["", "", ""]] };
    if (type === "callout") return { type, variant: "ok", title: "포인트", body: content };
    return { type, content };
  };
  const handleInput = (e) => onLiveEdit && onLiveEdit("content", e.currentTarget.innerHTML);

  useEffectO(() => {
    if (!autoFocus || !bodyRef.current) return;
    const editable = bodyRef.current.querySelector("[contenteditable]");
    if (editable) {
      editable.focus();
      // Move caret to end
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    onAutoFocused && onAutoFocused();
  }, [autoFocus]);

  // Handle keyboard:
  // - "/" opens slash menu (works anywhere — like Notion)
  // - Enter creates a new block (instead of newline)
  // - Backspace at empty content removes block and focuses previous
  // Markdown shorthand: when Space is pressed and the line so far matches
  // a markdown prefix (e.g. "#", ">", "$$"), convert the block type.
  const MD_PREFIX_MAP = {
    "#": "h1",
    "##": "h2",
    "###": "h3",
    ">": "quote",
    "$$": "math",
    "-": "ul",
    "*": "ul",
    "1.": "ol",
    "[]": "todo",
  };

  const tryMarkdownShortcut = (e) => {
    if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return false;
    const text = (e.currentTarget.textContent || "").trimEnd();
    const nextType = MD_PREFIX_MAP[text];
    if (!nextType) return false;
    // Only convert from a plain text block — avoid re-converting an already-h1 etc.
    if (block.type !== "p" && block.type !== "h1" && block.type !== "h2" && block.type !== "h3" && block.type !== "quote") return false;
    e.preventDefault();
    // Clear the visible prefix immediately so the caret resets.
    e.currentTarget.innerHTML = "";
    onUpdate(defaultsForType(nextType, ""));
    window.setTimeout(() => {
      const nextEditable = document.querySelector(`.wiki-block-row[data-block-id="${block.id}"] [contenteditable]`);
      if (!nextEditable) return;
      nextEditable.focus();
      const range = document.createRange();
      range.selectNodeContents(nextEditable);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
    return true;
  };

  const handleKeyDown = (e) => {
    if (tryMarkdownShortcut(e)) return;
    if (e.key === "/") {
      e.preventDefault();
      const rect = e.target.getBoundingClientRect();
      // Position menu just below the current block
      onSlashCommand && onSlashCommand(rect);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onAddAfter && onAddAfter("p");
      return;
    }
    if (e.key === "Backspace" && e.target.textContent === "") {
      e.preventDefault();
      onRemove && onRemove();
      return;
    }
  };

  const renderContent = () => {
    const t = block.type;
    if (t === "h1") return <h1 ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onBlur={(e) => commitContent("content", e.currentTarget.innerHTML)} style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.025em", margin: "16px 0 6px" }} dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (t === "h2") return <h2 ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onBlur={(e) => commitContent("content", e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (t === "h3") return <h3 ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onBlur={(e) => commitContent("content", e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (t === "p") return <p ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onBlur={(e) => commitContent("content", e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (t === "quote") return <blockquote ref={ref} data-block-id={block.id} contentEditable suppressContentEditableWarning onKeyDown={handleKeyDown} onInput={handleInput} onBlur={(e) => commitContent("content", e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: block.content }} />;
    if (t === "ul" || t === "ol") {
      return <ListBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "todo") {
      return <ChecklistBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "code") {
      return <CodeEditorBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "math") {
      return <MathBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "table") {
      return <TableBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "image") {
      return <ImageBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "attach") {
      return <AttachBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "link") {
      return <BookmarkBlock block={block} onUpdate={onUpdate} />;
    }
    if (t === "callout") {
      return (
        <div className={`callout callout-${block.variant || "ok"}`}>
          <Icon name={block.variant === "warn" ? "flag" : block.variant === "err" ? "x" : "sparkles"} size={18} style={{ color: block.variant === "warn" ? "var(--warn)" : block.variant === "err" ? "var(--err)" : "var(--ok)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong
              contentEditable suppressContentEditableWarning
              onBlur={e => commitContent("title", e.currentTarget.textContent)}
              style={{ color: "var(--text-hi)" }}
              dangerouslySetInnerHTML={{ __html: block.title || "" }}
            />{" "}
            <span
              contentEditable suppressContentEditableWarning
              onBlur={e => commitContent("body", e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: block.body || "" }}
            />
          </div>
        </div>
      );
    }
    if (t === "divider") return <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }} />;
    return <p ref={ref} contentEditable dangerouslySetInnerHTML={{ __html: block.content }} />;
  };

  return (
    <div
      className={`wiki-block-row ${isActive ? "is-active" : ""} ${isDragging ? "is-dragging" : ""} ${dropIndicator ? `drop-${dropIndicator}` : ""}`}
      data-block-id={block.id}
      data-block-type={block.type}
      onClick={(e) => { e.stopPropagation(); onActivate(); }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="wiki-block-handles">
        <button
          className="wiki-block-handle"
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          title="드래그해서 이동 · 클릭해서 메뉴"
          aria-label="블록 이동 / 메뉴"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="6" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="15" cy="18" r="1.6" />
          </svg>
        </button>
        {isMenuOpen && (
          <>
            <div
              style={{ position: "fixed", inset: 0, zIndex: 79 }}
              onClick={(e) => { e.stopPropagation(); onMenuClose(); }}
            />
            <div className="wiki-block-menu" onClick={(e) => e.stopPropagation()}>
            <div className="kicker" style={{ padding: "6px 10px 4px" }}>전환</div>
            {[
              { type: "p",       label: "본문",        icon: "edit" },
              { type: "h1",      label: "헤딩 1",      icon: "hash" },
              { type: "h2",      label: "헤딩 2",      icon: "hash" },
              { type: "h3",      label: "헤딩 3",      icon: "hash" },
              { type: "ul",      label: "글머리 기호",   icon: "list" },
              { type: "ol",      label: "번호 매기기",   icon: "list" },
              { type: "todo",    label: "체크리스트",    icon: "check" },
              { type: "quote",   label: "인용",        icon: "edit" },
              { type: "callout", label: "콜아웃",       icon: "sparkles" },
              { type: "code",    label: "코드 블록",    icon: "command" },
              { type: "math",    label: "수식",         icon: "hash" },
              { type: "table",   label: "표",           icon: "grid" },
              { type: "image",   label: "이미지",       icon: "image" },
              { type: "attach",  label: "파일 첨부",     icon: "paperclip" },
              { type: "link",    label: "북마크",        icon: "link" },
              { type: "divider", label: "구분선",       icon: "list" },
            ].map(o => (
              <button
                key={o.type}
                className={`popover-item ${block.type === o.type ? "is-active" : ""}`}
                onClick={() => { onUpdate(defaultsForType(o.type, block.content || "")); onMenuClose(); }}
                style={block.type === o.type ? { color: "var(--accent)", background: "var(--accent-softer)" } : undefined}
              >
                <Icon name={o.icon} size={13} />{o.label}
              </button>
            ))}
            <div className="popover-sep" />
            <button className="popover-item" onClick={() => { onAddAfter("p"); onMenuClose(); }}>
              <Icon name="plus" size={13} />아래 블록 추가
            </button>
            <button className="popover-item" onClick={() => { onDuplicate(); onMenuClose(); }}>
              <Icon name="copy" size={13} />복제
            </button>
            <div className="popover-sep" />
            <button className="popover-item is-danger" onClick={() => { onRemove(); onMenuClose(); }}>
              <Icon name="trash" size={13} />삭제
            </button>
            </div>
          </>
        )}
      </div>
      <div className="wiki-block-body" ref={bodyRef}>
        {renderContent()}
      </div>
    </div>
  );
}

window.Planary = Object.assign(window.Planary || {}, {
  ProjectsPage, NotesPage, WikiPage, BookmarksPage, ArchivePage, ProfilePage,
  TaskEditDialog, ShareDialog
});
