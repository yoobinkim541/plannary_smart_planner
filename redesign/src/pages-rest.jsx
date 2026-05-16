/* Planary — Other pages: Projects, Notes, Wiki, Bookmarks, Archive, Profile */

const { useState: useStateO, useRef: useRefO, useEffect: useEffectO } = React;

/* ===========================================================
   PROJECTS
   =========================================================== */
function ProjectsPage({ tasks, setTasks, setPage, setTaskFilter }) {
  const { PROJECTS, ECLASS_COURSES } = window.Planary;
  const [selected, setSelected] = useStateO(PROJECTS[0].id);
  const [syncing, setSyncing] = useStateO(false);
  const proj = PROJECTS.find((p) => p.id === selected);
  const projTasks = tasks.filter((t) => t.project === selected);
  const open = projTasks.filter((t) => !t.done);
  const done = projTasks.filter((t) => t.done);

  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const triggerSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      // Random success/failure for prototype demo (90% success)
      const success = Math.random() > 0.1;
      if (success) {
        window.Planary.toast({
          type: "ok",
          title: "동기화 완료",
          sub: `${ECLASS_COURSES.length}개 강의에서 ${projTasks.length}개 항목 확인`,
        });
      } else {
        window.Planary.toast({
          type: "err",
          title: "동기화 실패",
          sub: "e-Class 응답이 늦어요. 잠시 후 다시 시도해주세요.",
          ttl: 4200,
        });
      }
    }, 1400);
  };

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
        <div>
          <div className="kicker">WORKSPACE · 프로젝트</div>
          <div className="page-title">프로젝트</div>
          <div className="page-sub">작업·위키·리마인더가 함께 사는 작업 공간</div>
        </div>
        <button className="btn btn-primary" onClick={() => window.Planary?.toast?.({ type: "info", title: "새 프로젝트 만들기", sub: "곧 추가됩니다" })}><Icon name="plus" size={14} />새 프로젝트</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 24 }}>
        {PROJECTS.map((p) => {
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
    </div>);

}

/* ---------- e-Class detail view ---------- */
function EclassDetail({ proj, projTasks, open, done, syncing, triggerSync, setPage }) {
  const [eclassFilter, setEclassFilter] = useStateO("all"); // all | exam | done
  const { ECLASS_COURSES, USER } = window.Planary;
  const [filter, setFilter] = useStateO("open"); // open | exam | done
  const [icon, setIcon] = useStateO(proj.icon);

  const filteredTasks = projTasks.filter(t => {
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
              size={56}
            />
            <span
              className="status-dot is-live"
              style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, background: "var(--ok)", border: "2px solid var(--surface)", boxShadow: "none", animation: "none", pointerEvents: "none", borderRadius: "50%" }}
            />
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
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{ECLASS_COURSES.reduce((s, c) => s + c.credits, 0)}학점 · {ECLASS_COURSES.length}개 강의</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          {ECLASS_COURSES.map((c) => {
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
                
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--text-lo)", fontWeight: 700, letterSpacing: "0.04em" }}>{c.code}</span>
                  <span style={{ fontSize: 10, color: "var(--text-faint)" }}>· {c.credits}학점</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", letterSpacing: "-0.01em", marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{c.prof}</div>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>동기화된 작업</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button className={`chip-btn ${eclassFilter==="all"?"is-active":""}`} onClick={() => setEclassFilter("all")}><Icon name="list" size={11} />전체</button>
            <button className={`chip-btn ${eclassFilter==="exam"?"is-active":""}`} onClick={() => setEclassFilter("exam")}><Icon name="flag" size={11} />시험·발표</button>
            <button className={`chip-btn ${eclassFilter==="done"?"is-active":""}`} onClick={() => setEclassFilter("done")}><Icon name="check" size={11} />완료</button>
          </div>
        </div>
        {ECLASS_COURSES.map((c) => {
          const ct = projTasks.filter((t) => {
            if (t.course !== c.id) return false;
            if (eclassFilter === "all") return !t.done;
            if (eclassFilter === "exam") return !t.done && t.source === "eclass-exam";
            if (eclassFilter === "done") return t.done;
            return false;
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
  const [notes, setNotes] = useStateO(window.Planary.NOTES);
  const [draftColor, setDraftColor] = useStateO("yellow");
  const [draft, setDraft] = useStateO("");
  const [view, setView] = useStateO("board"); // board | grid
  const boardRef = useRefO(null);
  const dragRef = useRefO(null);

  // Keep global NOTES in sync + react to external additions (e.g. QuickCapture).
  useEffectO(() => {
    if (window.Planary) window.Planary.NOTES = notes;
  }, [notes]);
  useEffectO(() => {
    const onExt = () => {
      if (window.Planary && Array.isArray(window.Planary.NOTES)) {
        setNotes(window.Planary.NOTES);
      }
    };
    window.addEventListener("planary:notes-changed", onExt);
    return () => window.removeEventListener("planary:notes-changed", onExt);
  }, []);

  const onMouseDown = (e, note) => {
    if (e.target.closest(".note-foot") || e.target.tagName === "BUTTON") return;
    const rect = boardRef.current.getBoundingClientRect();
    dragRef.current = {
      id: note.id,
      offX: e.clientX - rect.left - note.x,
      offY: e.clientY - rect.top - note.y
    };
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, dragging: true } : n));
  };

  useEffectO(() => {
    const onMove = (e) => {
      if (!dragRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width - 200, e.clientX - rect.left - dragRef.current.offX));
      const y = Math.max(0, Math.min(rect.height - 100, e.clientY - rect.top - dragRef.current.offY));
      setNotes((prev) => prev.map((n) => n.id === dragRef.current.id ? { ...n, x, y } : n));
    };
    const onUp = () => {
      if (dragRef.current) {
        setNotes((prev) => prev.map((n) => n.id === dragRef.current.id ? { ...n, dragging: false } : n));
        dragRef.current = null;
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const addNote = () => {
    if (!draft.trim()) return;
    const id = "n" + Date.now();
    setNotes((prev) => [
    { id, x: 60 + Math.random() * 200, y: 60 + Math.random() * 100, color: draftColor, text: draft.trim(), date: "방금", rot: (Math.random() - 0.5) * 4, dragging: false },
    ...prev]
    );
    setDraft("");
  };

  const colors = ["yellow", "pink", "blue", "green", "purple", "orange", "mint"];

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="kicker">WORKSPACE · 포스트잇 보드</div>
          <div className="page-title">포스트잇</div>
          <div className="page-sub">{notes.length}개 · 드래그해 자유롭게 배치하거나 그리드로 정렬하세요</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "inline-flex", padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-md)", gap: 2 }}>
            <button
              onClick={() => setView("board")}
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
              const csv = "id,color,text,date\n" + notes.map(n => `${n.id},${n.color},"${(n.text||"").replace(/"/g,'""').replace(/\n/g," ")}",${n.date}`).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `planary-postits-${Date.now()}.csv`;
              document.body.appendChild(a); a.click(); a.remove();
              URL.revokeObjectURL(url);
              window.Planary?.toast?.({ type: "ok", title: "포스트잇을 CSV로 내보냈어요", sub: `${notes.length}개 항목` });
            }}
          >
            <Icon name="download" size={14} />내보내기
          </button>
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

      {view === "board" ?
      <div className="board" ref={boardRef} style={{ height: 620 }}>
          {notes.map((n) =>
        <div
          key={n.id}
          className={`note note-${n.color} ${n.dragging ? "dragging" : ""}`}
          style={{
            left: n.x, top: n.y,
            transform: n.dragging ? undefined : `rotate(${n.rot}deg)`
          }}
          onMouseDown={(e) => onMouseDown(e, n)}>
          
              <div className="note-text">{n.text}</div>
              <div className="note-foot">
                <span>{n.date}</span>
                <button
              style={{ color: "rgba(0,0,0,0.4)", background: "none", border: 0, cursor: "pointer", padding: 2 }}
              onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}
              title="삭제">
              
                  <Icon name="x" size={12} />
                </button>
              </div>
            </div>
        )}
        </div> :

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {notes.map((n) =>
        <div
          key={n.id}
          className={`note note-${n.color}`}
          style={{
            position: "relative",
            width: "auto",
            left: 0, top: 0,
            transform: "rotate(-0.5deg)",
            minHeight: 140,
            cursor: "default"
          }}>
          
              <div className="note-text">{n.text}</div>
              <div className="note-foot">
                <span>{n.date}</span>
                <button
              style={{ color: "rgba(0,0,0,0.4)", background: "none", border: 0, cursor: "pointer", padding: 2 }}
              onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}
              title="삭제">
              
                  <Icon name="x" size={12} />
                </button>
              </div>
            </div>
        )}
        </div>
      }
    </div>);

}

/* ===========================================================
   WIKI
   =========================================================== */
function WikiPage() {
  const { WIKI_TREE } = window.Planary;
  const [activeId, setActiveId] = useStateO("w3"); // "컬러 토큰"
  const [showAside, setShowAside] = useStateO(true);
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
  const fileInputRef = useRefO(null);
  const active = WIKI_TREE.find((w) => w.id === activeId) || WIKI_TREE[0];

  const COVER_GALLERY = [
    { id: "g1", label: "Violet wash", style: { background: "linear-gradient(135deg, #7f0df2, #9b3ff7)" } },
    { id: "g2", label: "Indigo dawn",  style: { background: "linear-gradient(135deg, #3b82f6, #7f0df2)" } },
    { id: "g3", label: "Emerald calm", style: { background: "linear-gradient(135deg, #047857, #10b981)" } },
    { id: "g4", label: "Sunset",       style: { background: "linear-gradient(135deg, #f59e0b, #e11d48)" } },
    { id: "g5", label: "Slate",        style: { background: "linear-gradient(135deg, #1e293b, #475569)" } },
    { id: "g6", label: "Sky",          style: { background: "linear-gradient(135deg, #60a5fa, #34d399)" } },
  ];

  const handleFilePick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage(`url("${reader.result}")`);
      setCoverMenuOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddByUrl = () => {
    const url = window.prompt("이미지 URL을 입력하세요", "");
    if (!url) return;
    setCoverImage(`url("${url.replace(/"/g, '\\"')}")`);
    setCoverMenuOpen(false);
  };

  const handlePickGallery = (g) => {
    // for gallery use the CSS background directly
    setCoverImage(g.style.background);
    setCoverMenuOpen(false);
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    setCoverPanelOpen(false);
  };

  // Build tree: roots and children
  const roots = WIKI_TREE.filter((w) => !w.parent);
  const childrenOf = (id) => WIKI_TREE.filter((w) => w.parent === id);

  const toggleNode = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const matchSearch = (w) => !search || w.title.toLowerCase().includes(search.toLowerCase());

  const TreeNode = ({ node, depth = 0 }) => {
    const kids = childrenOf(node.id);
    const hasKids = kids.length > 0;
    const isOpen = !!expanded[node.id];
    // Auto-expand if any descendant matches search
    const expandedBySearch = search && (matchSearch(node) || WIKI_TREE.some((w) => w.parent === node.id && matchSearch(w)));
    const open = isOpen || expandedBySearch;

    if (search && !matchSearch(node) && !kids.some((k) => matchSearch(k))) return null;

    return (
      <div>
        <div
          className={`wiki-tree-item ${activeId === node.id ? "is-active" : ""}`}
          style={{ paddingLeft: 6 + depth * 14 }}
          onClick={() => setActiveId(node.id)}>
          
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
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.title}</span>
          {hasKids &&
          <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
              {kids.length}
            </span>
          }
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

  return (
    <div className="page-wide">
      <div className="wiki-shell" style={!showAside ? { gridTemplateColumns: "240px 1fr 40px" } : undefined}>
        <aside className="wiki-tree">
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
          <div className="wiki-tree-item" style={{ color: "var(--text-lo)", marginTop: 4 }}>
            <span style={{ width: 18, display: "inline-block" }} />
            <Icon name="plus" size={12} />
            <span>새 페이지</span>
          </div>
        </aside>

        <div className="wiki-doc">
          <div
            className={`wiki-cover ${coverPanelOpen ? "is-editing" : ""}`}
            style={{ height: coverHeight, "--cover-pos-x": `${coverPosX}%`, "--cover-pos-y": `${coverPosY}%`, "--cover-zoom": `${coverZoom}%` }}
          >
            {coverImage ? (
              <div
                className="wiki-cover-canvas"
                style={{ background: coverImage, backgroundSize: `${coverZoom}% auto`, backgroundPosition: `${coverPosX}% ${coverPosY}%`, backgroundRepeat: "no-repeat" }}
              />
            ) : (
              <div className="wiki-cover-canvas" style={{ background: "var(--surface-2)", backgroundImage: "none" }} />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFilePick}
            />

            <div className="wiki-cover-controls">
              {coverImage ? (
                <>
                  <button
                    className={`wiki-cover-pill ${coverMenuOpen ? "is-active" : ""}`}
                    onClick={() => { setCoverMenuOpen(!coverMenuOpen); setCoverPanelOpen(false); }}
                    type="button"
                  >
                    <Icon name="image" size={11} />커버 변경
                  </button>
                  <button
                    className={`wiki-cover-pill ${coverPanelOpen ? "is-active" : ""}`}
                    onClick={() => { setCoverPanelOpen(!coverPanelOpen); setCoverMenuOpen(false); }}
                    type="button"
                  >
                    <Icon name="settings" size={11} />위치 / 크기
                  </button>
                  <button
                    className="wiki-cover-pill"
                    onClick={handleRemoveCover}
                    type="button"
                  >
                    <Icon name="x" size={11} />제거
                  </button>
                </>
              ) : (
                <button
                  className={`wiki-cover-pill ${coverMenuOpen ? "is-active" : ""}`}
                  onClick={() => setCoverMenuOpen(!coverMenuOpen)}
                  type="button"
                >
                  <Icon name="plus" size={11} />커버 추가
                </button>
              )}
            </div>

            {coverMenuOpen && (
              <div className="wiki-cover-panel" style={{ width: 280, top: 50 }}>
                <div className="kicker" style={{ marginBottom: 10 }}>커버 이미지</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  <button
                    className="popover-item"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    type="button"
                  >
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
                  {COVER_GALLERY.map(g => (
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
                        transition: "transform var(--dur-fast)",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    />
                  ))}
                </div>
              </div>
            )}

            {coverPanelOpen && coverImage && (
              <div className="wiki-cover-panel">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="kicker">위치 & 크기</div>
                  <button
                    className="icon-btn"
                    onClick={() => { setCoverPosX(50); setCoverPosY(50); setCoverHeight(180); setCoverZoom(100); }}
                    title="기본값으로 되돌리기"
                  >
                    <Icon name="refresh" size={12} />
                  </button>
                </div>
                <div className="cover-slider-row">
                  <label>가로 위치 <span className="val">{coverPosX}%</span></label>
                  <input className="cover-slider" type="range" min="0" max="100" value={coverPosX} onChange={(e) => setCoverPosX(Number(e.target.value))} />
                </div>
                <div className="cover-slider-row">
                  <label>세로 위치 <span className="val">{coverPosY}%</span></label>
                  <input className="cover-slider" type="range" min="0" max="100" value={coverPosY} onChange={(e) => setCoverPosY(Number(e.target.value))} />
                </div>
                <div className="cover-slider-row">
                  <label>면적 (높이) <span className="val">{coverHeight}px</span></label>
                  <input className="cover-slider" type="range" min="120" max="360" value={coverHeight} onChange={(e) => setCoverHeight(Number(e.target.value))} />
                </div>
                <div className="cover-slider-row">
                  <label>확대 <span className="val">{coverZoom}%</span></label>
                  <input className="cover-slider" type="range" min="100" max="220" value={coverZoom} onChange={(e) => setCoverZoom(Number(e.target.value))} />
                </div>
                <button className="btn btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => setCoverPanelOpen(false)}>
                  완료
                </button>
              </div>
            )}

            <div className="wiki-icon">{active.icon}</div>
          </div>
          <div className="wiki-doc-meta">
            <span>Planary 핸드북</span>
            <Icon name="chevronRight" size={11} />
            <span>디자인 시스템</span>
            <Icon name="chevronRight" size={11} />
            <span style={{ color: "var(--text-hi)" }}>{active.title}</span>
            <div style={{ flex: 1 }} />
            <span className="chip"><Icon name="clock" size={10} />12분 전</span>
            <div style={{ position: "relative" }}>
              <button
                className="btn btn-sm btn-ghost"
                data-comment-anchor="03bfe54937-button-603-13"
                onClick={() => setShareOpen(true)}
              >
                <Icon name="share" size={12} />공유
              </button>
            </div>
            <button
              className="btn btn-sm"
              style={{ width: 28, padding: 0, justifyContent: "center" }}
              onClick={() => window.Planary?.toast?.({ type: "info", title: "옵션", sub: "복제 · 보관 · 삭제는 곧 추가됩니다" })}
              aria-label="더 보기"
            >
              <Icon name="more" size={14} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span className="chip chip-accent"><Icon name="book" size={10} />디자인 시스템</span>
            <span className="tag">tokens</span>
            <span className="tag">color</span>
            <span className="tag">v3</span>
            <button
              className="chip"
              style={{ borderStyle: "dashed", color: "var(--text-faint)", cursor: "pointer" }}
              onClick={() => {
                const t = window.prompt("새 태그를 입력하세요");
                if (t && t.trim()) window.Planary?.toast?.({ type: "ok", title: `'${t.trim()}' 태그를 추가했어요` });
              }}
            >
              <Icon name="plus" size={10} />태그
            </button>
          </div>
          <h1 className="wiki-doc-title">{active.title}</h1>

          <div className="wiki-block">
            <p style={{ fontSize: 17, color: "var(--text-md)", lineHeight: 1.65 }}>
              Planary는 <strong style={{ color: "var(--text-hi)" }}>단일 악센트 컬러</strong> 위에 풍부한 중성색 스택을 쌓아 정보 위계를 만듭니다. 다크 모드를 기본으로 하고, 라이트 모드는 동일한 위계를 반전 톤으로 유지합니다.
            </p>

            <div className="callout callout-ok">
              <Icon name="sparkles" size={18} style={{ color: "var(--ok)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: "var(--text-hi)" }}>설계 원칙.</strong> 새로운 hex를 추가하지 마세요. 악센트의 투명도 단계(<code>--accent-soft</code>, <code>--accent-softer</code>)와 <code>color-mix(in oklab, ...)</code>로 충분히 표현 가능합니다.
              </div>
            </div>

            <h2 id="h-tokens">코어 토큰</h2>
            <p>모든 컬러는 <code>var(--*)</code>로만 접근합니다. 가공이 필요할 때는 <code>color-mix</code>로 표현해 다크/라이트 자동 호환을 보장합니다.</p>

            <table>
              <thead>
                <tr><th>토큰</th><th>다크</th><th>라이트</th><th>용도</th></tr>
              </thead>
              <tbody>
                <tr><td><code>--accent</code></td><td className="mono">#7f0df2</td><td className="mono">#7f0df2</td><td>활성 상태, 주요 CTA</td></tr>
                <tr><td><code>--bg</code></td><td className="mono">#0a070e</td><td className="mono">#f7f6fb</td><td>앱 캔버스</td></tr>
                <tr><td><code>--surface</code></td><td className="mono">#181024</td><td className="mono">#ffffff</td><td>카드, 입력 필드</td></tr>
                <tr><td><code>--text-hi</code></td><td className="mono">#f1f5f9</td><td className="mono">#15131c</td><td>헤딩, 본문</td></tr>
                <tr><td><code>--border-soft</code></td><td className="mono">#221635</td><td className="mono">#efebf6</td><td>구분선, 약한 경계</td></tr>
              </tbody>
            </table>

            <h3 id="h-accent">악센트 팔레트</h3>
            <p>사용자는 6가지 악센트 중 자신의 워크스페이스 톤을 선택할 수 있습니다. 모두 같은 시각적 무게를 가지도록 조정되어 있습니다.</p>

            <div className="wiki-img">
              <Icon name="image" size={28} />
              <div style={{ position: "absolute", bottom: 12, left: 14, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>
                Figma · <em>palette-swatches.fig</em>
              </div>
            </div>

            <h3 id="h-css">CSS 변수 사용</h3>
            <CodeBlock anchor="0f614c02b9-pre-654-13" />

            <h3 id="h-text">텍스트 스택</h3>
            <p>슬레이트 5단계로 위계를 만듭니다. 본문 안에 <code>--text-md</code>, 헤딩에 <code>--text-hi</code>, 메타에 <code>--text-lo</code>, 빈 상태와 힌트에 <code>--text-mute</code>, 입력 placeholder에 <code>--text-faint</code>.</p>

            <blockquote>"좋은 위계는 무엇이 중요한지 말해주지 않습니다. 그저 보이게 만들 뿐이에요."</blockquote>

            <div className="callout callout-warn">
              <Icon name="flag" size={18} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ color: "var(--text-hi)" }}>주의.</strong> 본문 안에 <code>--text-hi</code>를 쓰면 위계가 망가집니다. 본문은 무조건 <code>--text-md</code>.
              </div>
            </div>

            <h2 id="h-shadow">그림자 & 글로우</h2>
            <p>물리적 그림자 3단계 + 악센트 글로우 1종. 활성 CTA·로고·진행중 카드 아래에만 <code>--glow</code>를 깔아 브랜드 시그니처로 사용합니다.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 14 }}>
              {[
              { label: "sm", style: { boxShadow: "var(--shadow-sm)" } },
              { label: "md", style: { boxShadow: "var(--shadow-md)" } },
              { label: "lg", style: { boxShadow: "var(--shadow-lg)" } }].
              map((s) =>
              <div key={s.label} className="card" style={{ ...s.style, textAlign: "center", padding: 28 }}>
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-lo)" }}>--shadow-{s.label}</div>
                </div>
              )}
            </div>

            <div className="slash-hint" style={{ marginTop: 28 }}>
              <Icon name="plus" size={11} />
              <span>여기에서 <span className="kbd">/</span> 입력해 블록 추가</span>
            </div>
          </div>
        </div>

        {showAside ?
        <aside className="wiki-aside">
            <div className="wiki-aside-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div className="kicker">목차</div>
                <button className="icon-btn" onClick={() => setShowAside(false)} title="목차 접기">
                  <Icon name="chevronRight" size={12} />
                </button>
              </div>
              <div className="toc-link is-active">코어 토큰</div>
              <div className="toc-link is-sub">악센트 팔레트</div>
              <div className="toc-link is-sub">CSS 변수 사용</div>
              <div className="toc-link is-sub">텍스트 스택</div>
              <div className="toc-link">그림자 & 글로우</div>
            </div>

            <div className="wiki-aside-card">
              <div className="kicker" style={{ marginBottom: 10 }}>관련 작업</div>
              {window.Planary.TASKS.filter((t) => t.title.includes("디자인")).slice(0, 3).map((t) =>
            <div key={t.id} className="focus-row" style={{ padding: "6px 8px" }}>
                  <div className={`checkbox ${t.done ? "is-checked" : ""}`} style={{ width: 14, height: 14 }}>
                    {t.done && <Icon name="check" size={9} stroke={3} />}
                  </div>
                  <span style={{ flex: 1, fontSize: 12, color: "var(--text-md)" }}>{t.title}</span>
                </div>
            )}
            </div>

            <div className="wiki-aside-card">
              <div className="kicker" style={{ marginBottom: 10 }}>백링크</div>
              <div className="toc-link">← Planary 핸드북</div>
              <div className="toc-link">← 디자인 시스템</div>
              <div className="toc-link">← 주간 회고 #42</div>
            </div>
          </aside> :

        <button
          className="wiki-toc-restore"
          onClick={() => setShowAside(true)}
          title="목차 다시 열기">
          
            <Icon name="chevronLeft" size={14} />
            <span className="wiki-toc-restore-label">목차</span>
          </button>
        }
      </div>
      {shareOpen && <ShareDialog onClose={() => setShareOpen(false)} title={active.title} />}
    </div>);

}

/* ===========================================================
   BOOKMARKS
   =========================================================== */
function BookmarksPage() {
  const [bookmarks, setBookmarks] = useStateO(window.Planary.BOOKMARKS);
  const [query, setQuery] = useStateO("");
  const [active, setActive] = useStateO("전체");
  const [urlDraft, setUrlDraft] = useStateO("");
  const composerRef = useRefO(null);
  const allTags = ["전체", ...new Set(bookmarks.flatMap((b) => b.tags))];
  const filtered = bookmarks.filter((b) =>
  (active === "전체" || b.tags.includes(active)) && (
  !query || b.title.toLowerCase().includes(query.toLowerCase()) || b.url.toLowerCase().includes(query.toLowerCase()))
  );

  const colors = ["#2563eb","#10b981","#f59e0b","#e11d48","#7f0df2","#0ea5e9","#84cc16"];
  const saveBookmark = () => {
    const raw = urlDraft.trim();
    if (!raw) return;
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    let host = url;
    try { host = new URL(url).hostname.replace(/^www\./,""); } catch (_) {}
    const title = host.split(".")[0].replace(/^./, c => c.toUpperCase());
    const letter = title.slice(0,1).toUpperCase();
    const id = "bk" + Date.now();
    setBookmarks(prev => [{ id, title, url, color: colors[Math.floor(Math.random()*colors.length)], letter, tags: ["새로 추가"] }, ...prev]);
    window.Planary.BOOKMARKS = [{ id, title, url, color: colors[Math.floor(Math.random()*colors.length)], letter, tags: ["새로 추가"] }, ...window.Planary.BOOKMARKS];
    setUrlDraft("");
    window.Planary?.toast?.({ type: "ok", title: "북마크가 추가됐어요", sub: host });
  };
  const openBookmark = (b) => {
    window.open(b.url, "_blank", "noopener");
  };

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
        <div>
          <div className="hero-greet">WORKSPACE · 북마크</div>
          <div className="page-title">북마크</div>
          <div className="page-sub">{bookmarks.length}개 · 태그로 정리된 링크 모음</div>
        </div>
        <button className="btn btn-primary" onClick={() => composerRef.current?.focus()}><Icon name="plus" size={14} />새 북마크</button>
      </div>

      <div className="composer">
        <div className="composer-row">
          <Icon name="link" size={16} style={{ color: "var(--accent)" }} />
          <input
            ref={composerRef}
            className="composer-input"
            placeholder="URL 붙여넣기 — https://..."
            value={urlDraft}
            onChange={e => setUrlDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveBookmark(); }}
          />
          <button className="btn btn-sm btn-primary" onClick={saveBookmark} disabled={!urlDraft.trim()}>저장</button>
        </div>
      </div>

      <div className="search-bar">
        <Icon name="search" size={14} />
        <input
          placeholder="제목, URL, 태그로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)} />
        
      </div>

      <div className="tasks-toolbar">
        {allTags.map((t) =>
        <button
          key={t}
          className={`chip-btn ${active === t ? "is-active" : ""}`}
          onClick={() => setActive(t)}>
          
            {t === "전체" ? <Icon name="hash" size={12} /> : <Icon name="hash" size={12} />}
            {t}
            <span className="chip-btn-count">{t === "전체" ? BOOKMARKS.length : BOOKMARKS.filter((b) => b.tags.includes(t)).length}</span>
          </button>
        )}
      </div>

      <div className="bookmarks-grid">
        {filtered.map((b) =>
        <div
          key={b.id}
          className="bookmark"
          onClick={() => openBookmark(b)}
          style={{ cursor: "pointer" }}
        >
            <div className="bookmark-favicon" style={{ background: b.color }}>{b.letter}</div>
            <div className="bookmark-main">
              <div className="bookmark-title">{b.title}</div>
              <div className="bookmark-url">{b.url}</div>
              <div className="bookmark-tags">
                {b.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
              </div>
            </div>
            <button
              className="icon-btn"
              style={{ alignSelf: "start" }}
              onClick={e => { e.stopPropagation(); openBookmark(b); }}
              aria-label={`${b.title} 열기`}
            >
              <Icon name="arrowUpRight" size={14} />
            </button>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="empty card" style={{ gridColumn: "1 / -1" }}>
            <div className="empty-icon"><Icon name="link" size={24} /></div>
            <div style={{ fontWeight: 600, marginTop: 8 }}>북마크가 없어요</div>
            <div style={{ fontSize: 12, color: "var(--text-lo)" }}>위 입력칸에 URL을 붙여넣어 추가하세요</div>
          </div>
        )}
      </div>
    </div>);

}

/* ===========================================================
   ARCHIVE
   =========================================================== */
function ArchivePage({ tasks }) {
  const completed = tasks.filter((t) => t.done);
  const heat = window.Planary.WEEKLY_HEATMAP;
  const [range, setRange] = useStateO("month"); // week | month | quarter | year | all
  const [archiveSearch, setArchiveSearch] = useStateO("");

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

  const filtered = completed.filter(t => archiveSearch === "" || t.title.toLowerCase().includes(archiveSearch.toLowerCase()));

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
            12<span style={{ fontSize: 18, color: "var(--accent)", fontWeight: 700 }}>일 연속</span>
          </div>
          <div className="archive-stat-label">최장 스트릭 24일</div>
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
            <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.015em", marginTop: 4 }}>지난 1년 · {heat.filter(v => v > 0).length}일 활동</h3>
            <p style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 4 }}>매일 작업 1개 이상 완료한 날의 강도</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-faint)" }}>
            적게
            {[0,1,2,3,4].map(l => <div key={l} className={`heat-cell ${l ? `l${l}` : ""}`} style={{ width: 11, height: 11, borderRadius: 3 }} />)}
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
                  const d = new Date(); d.setMonth(d.getMonth() - 11 + i);
                  return <div key={i}>{(d.getMonth() + 1)}월</div>;
                })}
              </div>
              <div className="heat-year">
                {heat.map((v, i) => (
                  <div
                    key={i}
                    className={`heat-cell ${v ? `l${v}` : ""}`}
                    title={v ? `${v}개 완료` : "활동 없음"}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, padding: 22, borderColor: "var(--accent-ring)" }}>
        <div style={{ display: "flex", alignItems: "start", gap: 16 }}>
          <Icon name="sparkles" size={22} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div className="kicker">과거의 나로부터</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, letterSpacing: "-0.01em" }}>
              "기록은 기억을 지배합니다. 오늘 적어둔 한 줄이 다음 달의 결정을 바꿉니다."
            </div>
            <div style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 8 }}>2025. 09. 14 메모에서</div>
          </div>
          <button className="icon-btn" onClick={() => window.Planary.toast({ type: "info", title: "새로운 영감을 가져왔어요" })}>
            <Icon name="refresh" size={14} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.015em" }}>완료된 작업</h3>
        <span style={{ fontSize: 12, color: "var(--text-lo)" }}>{filtered.length}개</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "inline-flex", padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-md)", gap: 1, border: "1px solid var(--border-soft)" }}>
          {[
            { id: "week",   label: "이번 주" },
            { id: "month",  label: "이번 달" },
            { id: "quarter", label: "분기" },
            { id: "year",   label: "올해" },
            { id: "all",    label: "전체" },
          ].map(r => (
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
                transition: "all var(--dur-fast)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="search-bar" style={{ width: 200, marginBottom: 0, padding: "6px 10px" }}>
          <Icon name="search" size={13} />
          <input
            placeholder="검색"
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
            style={{ fontSize: 12 }}
          />
        </div>
        <button className="btn btn-sm btn-ghost" onClick={handleExport}>
          <Icon name="download" size={13} />CSV
        </button>
      </div>

      <div className="task-list">
        {filtered.length === 0 && (
          <div className="empty card">
            <div className="empty-icon"><Icon name="archive" size={24} /></div>
            {archiveSearch ? "검색 결과가 없어요." : "아직 완료된 작업이 없어요."}
          </div>
        )}
        {filtered.map((t) =>
        <window.Planary.TaskCard key={t.id} task={t} onToggle={(id) => window.dispatchEvent(new CustomEvent('planary:toggle-task', { detail: id }))} projects={window.Planary.PROJECTS} />
        )}
      </div>
    </div>);

}

/* ===========================================================
   PROFILE
   =========================================================== */
function ProfilePage({ tasks, t, setTweak }) {
  const { USER, PROJECTS } = window.Planary;
  const [user, setUser] = useStateO(USER);
  const [editOpen, setEditOpen] = useStateO(false);
  const [signOutOpen, setSignOutOpen] = useStateO(false);
  const [plan, setPlan] = useStateO("pro");
  const [openMenu, setOpenMenu] = useStateO(null); // "font" | "sidebar" | "density" | null
  const [notifs, setNotifs] = useStateO({ email: true, push: true, gcal: true, apple: false, slack: false });
  const done = tasks.filter((x) => x.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const isImage = user.avatar && typeof user.avatar === "string" && user.avatar.startsWith("url(");
  const theme = t ? t.theme : "dark";
  const setTheme = (v) => setTweak && setTweak("theme", v);
  const fontOpts = [{ id: "jakarta", label: "Plus Jakarta Sans" }, { id: "pretendard", label: "Pretendard" }, { id: "inter", label: "Inter" }];
  const sidebarOpts = [{ id: "full", label: "풀 너비" }, { id: "compact", label: "컴팩트" }, { id: "icons", label: "아이콘만" }];
  const densityOpts = [{ id: "compact", label: "촘촘하게" }, { id: "regular", label: "보통" }, { id: "comfortable", label: "여유롭게" }];
  const fontLabel = (fontOpts.find(o => o.id === (t && t.font)) || fontOpts[0]).label;
  const sidebarLabel = (sidebarOpts.find(o => o.id === (t && t.sidebar)) || sidebarOpts[0]).label;
  const densityLabel = (densityOpts.find(o => o.id === (t && t.density)) || densityOpts[1]).label;
  const planMeta = plan === "pro"
    ? { chip: "Pro 플랜", chipClass: "chip-accent", price: "월 5,900원", features: ["무제한 프로젝트", "e-Class 자동 동기화", "1년 활동 히트맵", "팀 협업 (베타)"] }
    : { chip: "Basic 플랜", chipClass: "chip",       price: "무료",       features: ["프로젝트 3개", "수동 동기화", "30일 히트맵", "개인 사용 전용"] };
  const saveProfile = (draft) => {
    setUser(draft);
    window.Planary.USER = { ...window.Planary.USER, ...draft };
    setEditOpen(false);
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
                boxShadow: "none",
              }}
            >
              {!isImage && user.initials}
            </div>
            <div className="profile-name-big">{user.name}</div>
            <div className="profile-email-md">{user.email}</div>
            <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <span className={`chip ${planMeta.chipClass}`}>{planMeta.chip}</span>
              <span className="chip"><Icon name="clock" size={10} />가입 8개월</span>
            </div>
            {user.bio && <p style={{ fontSize: 12, color: "var(--text-md)", marginTop: 14, lineHeight: 1.5 }}>{user.bio}</p>}
            <button className="btn btn-ghost" style={{ marginTop: 16, width: "100%" }} onClick={() => setEditOpen(true)}>
              <Icon name="edit" size={12} />프로필 편집
            </button>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-soft)", display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>플랜</h3>
              <div style={{ display: "inline-flex", padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-sm)", gap: 1 }}>
                {["basic", "pro"].map(p => (
                  <button
                    key={p}
                    onClick={() => setPlan(p)}
                    style={{
                      height: 22, padding: "0 9px", borderRadius: 4,
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                      background: plan === p ? "var(--surface)" : "transparent",
                      color: plan === p ? "var(--text-hi)" : "var(--text-lo)",
                      boxShadow: plan === p ? "var(--shadow-sm)" : "none",
                    }}
                  >{p}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: "14px 18px 18px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span className={`chip ${planMeta.chipClass}`}>{planMeta.chip}</span>
                <span style={{ fontSize: 13, color: "var(--text-md)", fontWeight: 600 }}>{planMeta.price}</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {planMeta.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-md)" }}>
                    <Icon name="check" size={11} stroke={3} style={{ color: plan === "pro" ? "var(--accent)" : "var(--text-mute)" }} />
                    {f}
                  </li>
                ))}
              </ul>
              {plan === "basic" && (
                <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center", marginTop: 14 }}>
                  <Icon name="sparkles" size={12} />Pro로 업그레이드
                </button>
              )}
            </div>
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
              { label: "활성 프로젝트", val: PROJECTS.length, icon: "layers" },
            ].map(s =>
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
              <ProfileRow label="키보드 단축키" sub="⌘K · ⌘N · / 등">
                <span className="chip chip-ok"><Icon name="check" size={9} stroke={3} />활성</span>
              </ProfileRow>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 0 }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-soft)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>알림 & 동기화</h3>
            </div>
            <div style={{ padding: "4px 22px 22px" }}>
              {[
                { id: "email", label: "이메일 알림", sub: notifs.email ? "주간 요약 발송" : "발송 안 함" },
                { id: "push", label: "데스크톱 푸시", sub: notifs.push ? "리마인더만" : "꺼짐" },
                { id: "gcal", label: "Google Calendar", sub: notifs.gcal ? "연결됨 · 양방향 동기화" : "연결 안 됨" },
                { id: "apple", label: "Apple Calendar", sub: notifs.apple ? "연결됨" : "연결 안 됨" },
                { id: "slack", label: "Slack 통합", sub: notifs.slack ? "연결됨" : "연결 안 됨" },
              ].map(r => (
                <ProfileRow key={r.id} label={r.label} sub={r.sub}>
                  <div
                    className={`switch ${notifs[r.id] ? "is-on" : ""}`}
                    onClick={() => {
                      const next = !notifs[r.id];
                      setNotifs(prev => ({ ...prev, [r.id]: next }));
                      window.Planary.toast({ type: "ok", title: `${r.label} ${next ? "켜짐" : "꺼짐"}` });
                    }}
                  />
                </ProfileRow>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 12, padding: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>로그아웃 / 계정 관리</div>
              <div style={{ fontSize: 12, color: "var(--text-lo)" }}>이 기기에서 세션을 종료하거나 계정을 삭제합니다</div>
            </div>
            <button className="btn btn-ghost" style={{ color: "var(--err)" }} onClick={() => setSignOutOpen(true)}>
              <Icon name="logout" size={14} />로그아웃
            </button>
          </div>
        </div>
      </div>

      {editOpen && <ProfileEditDialog user={user} onClose={() => setEditOpen(false)} onSave={saveProfile} />}
      {signOutOpen && <SignOutDialog onClose={() => setSignOutOpen(false)} user={user} />}
    </div>);

}

function ProfileRow({ label, sub, children }) {
  return (
    <div className="field-row">
      <div>
        <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{sub}</div>
      </div>
      {children}
    </div>
  );
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
            style={{ position: "absolute", top: "100%", right: 0, left: "auto", bottom: "auto", minWidth: 200, zIndex: 50, marginTop: -4 }}
            onClick={(e) => e.stopPropagation()}
          >
            {options.map(o => (
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
  const { USER, ECLASS_COURSES, PROJECTS } = window.Planary;
  const pe = PROJECTS.find((p) => p.id === "pe");
  const [connected, setConnected] = useStateO(true);
  const [autoSync, setAutoSync] = useStateO(true);
  const [syncing, setSyncing] = useStateO(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1400);
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
            {USER.school} e-Class에서 강의·과제·시험 일정을 자동으로 가져옵니다
          </p>
        </div>
      </div>

      {connected ?
      <div style={{ padding: "8px 22px 18px" }}>
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>학교</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{USER.school}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-lo)" }}>학번 {USER.studentId}</span>
          </div>
          <div className="field-row">
            <div>
              <div className="field-label" style={{ fontWeight: 600, color: "var(--text-hi)" }}>동기화 대상</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{ECLASS_COURSES.length}개 강의 · {ECLASS_COURSES.reduce((s, c) => s + c.credits, 0)}학점</div>
            </div>
            <button className="btn btn-sm" onClick={() => {}}>강의 보기</button>
          </div>
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
              <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{pe?.lastSync || "기록 없음"} · 항목 {window.Planary.TASKS.filter((t) => t.project === "pe").length}개</div>
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
              <button
                className="chip"
                style={{ borderStyle: "dashed", color: "var(--text-faint)", cursor: "pointer" }}
                onClick={() => window.Planary?.toast?.({ type: "ok", title: "학교 추가 요청을 보냈어요", sub: "검토 후 이메일로 안내드릴게요" })}
              >
                <Icon name="plus" size={10} />학교 추가 요청
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 10, lineHeight: 1.5 }}>
              비밀번호는 서버에서 암호화되어 저장됩니다. 언제든 연결을 해제할 수 있고, 해제 시 동기화된 작업은 보관함으로 이동합니다.
            </p>
            <button
            className="btn btn-sm"
            style={{ color: "var(--err)", marginTop: 8 }}
            onClick={() => setConnected(false)}>
            
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
              defaultValue="https://eclass.seoultech.ac.kr"
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
          <button className="btn btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={() => setConnected(true)}>
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
      { type: "code", text: " { " },
    ],
    [
      { type: "code", text: "  background: " },
      { type: "str", text: "var(--surface)" },
      { type: "code", text: ";" },
    ],
    [
      { type: "code", text: "  border: " },
      { type: "num", text: "1" },
      { type: "code", text: "px solid " },
      { type: "str", text: "var(--border)" },
      { type: "code", text: ";" },
    ],
    [
      { type: "code", text: "  border-radius: " },
      { type: "str", text: "var(--r-xl)" },
      { type: "code", text: ";" },
    ],
    [
      { type: "code", text: "  color: " },
      { type: "str", text: "var(--text-hi)" },
      { type: "code", text: ";" },
    ],
    { type: "code", text: "}" },
    { type: "code", text: "" },
    { type: "com", text: "/* 투명도 변형은 color-mix로 — 자동 다크/라이트 호환 */" },
    [
      { type: "key", text: ".btn-soft" },
      { type: "code", text: " {" },
    ],
    [
      { type: "code", text: "  background: color-mix(" },
      { type: "str", text: "in oklab" },
      { type: "code", text: ", " },
      { type: "str", text: "var(--accent)" },
      { type: "code", text: " " },
      { type: "num", text: "14" },
      { type: "code", text: "%, transparent);" },
    ],
    { type: "code", text: "}" },
  ],
  tsx: [
    { type: "com", text: "// 디자인 시스템 토큰을 React에서 쓰기" },
    [
      { type: "key", text: "import" },
      { type: "code", text: " " },
      { type: "str", text: "\"./tokens.css\"" },
      { type: "code", text: ";" },
    ],
    { type: "code", text: "" },
    [
      { type: "key", text: "export function" },
      { type: "code", text: " Card({ children }) {" },
    ],
    [
      { type: "code", text: "  " },
      { type: "key", text: "return" },
      { type: "code", text: " <div className=" },
      { type: "str", text: "\"card\"" },
      { type: "code", text: ">{children}</div>;" },
    ],
    { type: "code", text: "}" },
  ],
  js: [
    { type: "com", text: "// 토큰 값을 JS에서 읽기" },
    [
      { type: "key", text: "const" },
      { type: "code", text: " accent = " },
      { type: "str", text: "getComputedStyle(document.documentElement)" },
    ],
    [
      { type: "code", text: "  .getPropertyValue(" },
      { type: "str", text: "\"--accent\"" },
      { type: "code", text: ").trim();" },
    ],
    { type: "code", text: "" },
    { type: "com", text: "// → \"#7f0df2\"" },
  ],
  html: [
    [
      { type: "code", text: "<" },
      { type: "key", text: "link" },
      { type: "code", text: " rel=" },
      { type: "str", text: "\"stylesheet\"" },
      { type: "code", text: " href=" },
      { type: "str", text: "\"tokens.css\"" },
      { type: "code", text: " />" },
    ],
    [
      { type: "code", text: "<" },
      { type: "key", text: "div" },
      { type: "code", text: " class=" },
      { type: "str", text: "\"card\"" },
      { type: "code", text: ">Hello</" },
      { type: "key", text: "div" },
      { type: "code", text: ">" },
    ],
  ],
};

function CodeBlock({ anchor }) {
  const [lang, setLang] = useStateO("css");
  const [copied, setCopied] = useStateO(false);
  const lines = CODE_SAMPLES[lang];

  const handleCopy = () => {
    const text = lines.map(line => {
      if (Array.isArray(line)) return line.map(t => t.text).join("");
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
    { id: "css",  label: "CSS" },
    { id: "tsx",  label: "TSX" },
    { id: "js",   label: "JS" },
    { id: "html", label: "HTML" },
  ];

  return (
    <div className="codeblock" data-comment-anchor={anchor}>
      <div className="codeblock-bar">
        <div className="codeblock-langs">
          {langs.map(l => (
            <button
              key={l.id}
              className={`codeblock-lang ${lang === l.id ? "is-active" : ""}`}
              onClick={() => setLang(l.id)}
              type="button"
            >
              {l.label}
            </button>
          ))}
        </div>
        <button className="codeblock-copy" onClick={handleCopy} type="button" title="복사">
          <Icon name={copied ? "check" : "copy"} size={12} />
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre><code>
        {lines.map((line, i) => (
          <React.Fragment key={i}>
            {Array.isArray(line)
              ? line.map(renderToken)
              : renderToken(line, 0)}
            {"\n"}
          </React.Fragment>
        ))}
      </code></pre>
    </div>
  );
}

/* ===========================================================
   SHARE DIALOG
   =========================================================== */
function ShareDialog({ onClose, title }) {
  const [visibility, setVisibility] = useStateO("private");
  const [emailDraft, setEmailDraft] = useStateO("");
  const [copied, setCopied] = useStateO(false);
  const [collaborators, setCollaborators] = useStateO([
    { name: "도하 김", email: "doha@planary.app", role: "owner", initials: "DK" },
  ]);

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
    setCollaborators(prev => [...prev, { name, email: emailDraft.trim(), role: "editor", initials }]);
    setEmailDraft("");
  };

  useEffectO(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
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
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              style={{
                flex: 1,
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "9px 12px",
                fontSize: 13, color: "var(--text-hi)",
                outline: "none",
              }}
            />
            <select
              defaultValue="editor"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-md)",
                padding: "0 10px",
                fontSize: 12, color: "var(--text-md)",
                outline: "none",
              }}
            >
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
              {collaborators.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: "var(--r-sm)" }}>
                  <div className="avatar" style={{ width: 28, height: 28 }}>{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{c.email}</div>
                  </div>
                  {c.role === "owner" ? (
                    <span className="chip" style={{ height: 22 }}>소유자</span>
                  ) : (
                    <>
                      <select
                        defaultValue={c.role}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border-soft)",
                          borderRadius: "var(--r-sm)",
                          padding: "4px 8px",
                          fontSize: 11, color: "var(--text-md)",
                          outline: "none", cursor: "pointer",
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "remove") setCollaborators(prev => prev.filter((_, idx) => idx !== i));
                          else setCollaborators(prev => prev.map((x, idx) => idx === i ? { ...x, role: v } : x));
                        }}
                      >
                        <option value="viewer">읽기</option>
                        <option value="editor">편집</option>
                        <option value="admin">관리자</option>
                        <option value="remove" style={{ color: "var(--err)" }}>제거</option>
                      </select>
                    </>
                  )}
                </div>
              ))}
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
              { id: "public", icon: "globe", title: "공개 (검색 허용)", body: "검색엔진과 모든 인터넷 사용자에게 공개돼요" },
            ].map(opt => (
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
                  transition: "all var(--dur-fast)",
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: visibility === opt.id ? "var(--accent-soft)" : "var(--surface-2)",
                  color: visibility === opt.id ? "var(--accent)" : "var(--text-lo)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icon name={opt.icon} size={14} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>{opt.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{opt.body}</div>
                </div>
                {visibility === opt.id && <Icon name="check" size={14} style={{ color: "var(--accent)", marginTop: 8 }} stroke={3} />}
              </button>
            ))}
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
    </div>
  );
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

  const update = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
  const proj = PROJECTS.find(p => p.id === draft.project);
  const course = ECLASS_COURSES && ECLASS_COURSES.find(c => c.id === draft.course);

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
    med:  { label: "보통", color: "var(--warn)" },
    low:  { label: "낮음", color: "var(--info)" },
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
              onClick={() => update("done", !draft.done)}
            >
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
                textDecoration: draft.done ? "line-through" : "none",
              }}
            />
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
              padding: 0,
            }}
          />

          {/* Property rows */}
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 0, borderTop: "1px solid var(--border-soft)" }}>
            {/* Date */}
            <PropRow icon="calendar" label="날짜" value={dateLabel} onClick={() => { setDatePopover(true); setPriorityPopover(false); setProjectPopover(false); }}>
              {datePopover && (
                <PropPopover onClose={() => setDatePopover(false)}>
                  {[
                    { label: "오늘",  value: "오늘" },
                    { label: "내일",  value: "내일" },
                    { label: "이번 주", value: "수요일" },
                    { label: "다음 주", value: "다음주 월요일" },
                    { label: "없음", value: null },
                  ].map(opt => (
                    <button
                      key={opt.label}
                      className={`tool-popover-item ${draft.time === opt.value ? "is-active" : ""}`}
                      onClick={() => { update("time", opt.value); setDatePopover(false); }}
                      type="button"
                    >
                      <Icon name="calendar" size={12} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </PropPopover>
              )}
            </PropRow>

            {/* Time / Reminder */}
            <PropRow
              icon="bell"
              label="리마인더"
              value={draft.reminder ? "알림 켜짐" : "없음"}
              onClick={() => update("reminder", !draft.reminder)}
              chip={draft.reminder && <span className="chip chip-accent" style={{ height: 22 }}>활성</span>}
            />

            {/* Priority */}
            <PropRow icon="flag" label="우선순위" valueColor={p.color} value={p.label} onClick={() => { setPriorityPopover(true); setDatePopover(false); setProjectPopover(false); }}>
              {priorityPopover && (
                <PropPopover onClose={() => setPriorityPopover(false)}>
                  {Object.entries(priorityMeta).map(([k, v]) => (
                    <button
                      key={k}
                      className={`tool-popover-item ${draft.priority === k ? "is-active" : ""}`}
                      onClick={() => { update("priority", k); setPriorityPopover(false); }}
                      type="button"
                    >
                      <span className="dot" style={{ background: v.color, width: 9, height: 9, borderRadius: 2 }} />
                      <span>{v.label}</span>
                    </button>
                  ))}
                </PropPopover>
              )}
            </PropRow>

            {/* Project */}
            <PropRow
              icon="folder"
              label="프로젝트"
              value={proj ? proj.name : course ? course.name : "프로젝트 없음"}
              onClick={() => { setProjectPopover(true); setDatePopover(false); setPriorityPopover(false); }}
            >
              {projectPopover && (
                <PropPopover onClose={() => setProjectPopover(false)}>
                  <button
                    className={`tool-popover-item ${!draft.project ? "is-active" : ""}`}
                    onClick={() => { update("project", null); setProjectPopover(false); }}
                    type="button"
                  >
                    <span className="proj-color" style={{ background: "var(--text-faint)" }} />
                    <span>프로젝트 없음</span>
                  </button>
                  {PROJECTS.map(p => (
                    <button
                      key={p.id}
                      className={`tool-popover-item ${draft.project === p.id ? "is-active" : ""}`}
                      onClick={() => { update("project", p.id); setProjectPopover(false); }}
                      type="button"
                    >
                      <span className="proj-color" style={{ background: p.color }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </PropPopover>
              )}
            </PropRow>

            {/* Tags */}
            <PropRow icon="hash" label="태그" value={draft.tags && draft.tags.length ? "" : "태그 없음"}>
              {draft.tags && draft.tags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1, justifyContent: "flex-end" }}>
                  {draft.tags.map(tag => (
                    <span key={tag} className="tag" onClick={() => update("tags", draft.tags.filter(x => x !== tag))}>
                      {tag} <Icon name="x" size={9} style={{ marginLeft: 2, opacity: 0.6 }} />
                    </span>
                  ))}
                </div>
              )}
            </PropRow>
          </div>
        </div>

        <div className="dialog-foot">
          <button
            className="btn btn-sm"
            style={{ color: "var(--err)" }}
            onClick={() => { if (window.confirm("이 작업을 삭제할까요?")) onDelete(task.id); }}
          >
            <Icon name="trash" size={12} />삭제
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(draft)}>
            저장 <span className="kbd" style={{ marginLeft: 4 }}>⌘↵</span>
          </button>
        </div>
      </div>
    </div>
  );
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
          transition: "background var(--dur-fast)",
        }}
        onMouseEnter={(e) => onClick && (e.currentTarget.style.background = "var(--hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div style={{ width: 24, color: "var(--text-lo)", display: "grid", placeItems: "center" }}>
          <Icon name={icon} size={14} />
        </div>
        <div style={{ flex: 1, fontSize: 13, color: "var(--text-lo)", fontWeight: 600 }}>{label}</div>
        {chip}
        {value && (
          <div style={{ fontSize: 13, color: valueColor || "var(--text-hi)", fontWeight: 600 }}>{value}</div>
        )}
        {onClick && <Icon name="chevronRight" size={11} style={{ color: "var(--text-faint)" }} />}
      </button>
      {children}
    </div>
  );
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
      onClick={(e) => e.stopPropagation()}
    >
      {children}
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
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = () => {
    window.Planary.toast({ type: "info", title: "로그아웃 중…", sub: "잠시 후 로그인 화면으로 이동합니다" });
    setTimeout(onClose, 600);
  };
  const deleteAccount = () => {
    if (confirmText !== expected) return;
    window.Planary.toast({ type: "err", title: "계정 삭제 처리됨", sub: "복구는 30일 이내에만 가능합니다", ttl: 4800 });
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
              {mode === "signout"
                ? "이 기기에서 세션을 종료합니다. 데이터는 그대로 유지돼요."
                : "계정과 모든 데이터를 영구 삭제합니다. 되돌릴 수 없습니다."}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: "16px 22px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, padding: 3, background: "var(--surface-2)", borderRadius: "var(--r-sm)" }}>
            {[
              { id: "signout", label: "로그아웃", icon: "logout" },
              { id: "delete",  label: "계정 탈퇴", icon: "trash" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => { setMode(t.id); setConfirmText(""); }}
                style={{
                  flex: 1, height: 30, borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontSize: 12, fontWeight: 600,
                  background: mode === t.id ? "var(--surface)" : "transparent",
                  color: mode === t.id ? (t.id === "delete" ? "var(--err)" : "var(--text-hi)") : "var(--text-lo)",
                  boxShadow: mode === t.id ? "var(--shadow-sm)" : "none",
                }}
              >
                <Icon name={t.icon} size={12} />{t.label}
              </button>
            ))}
          </div>

          {mode === "signout" ? (
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
                  "다른 기기에는 영향 없음",
                ].map((p, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-md)" }}>
                    <Icon name="check" size={11} stroke={3} style={{ color: "var(--ok)" }} />{p}
                  </li>
                ))}
              </ul>
            </>
          ) : (
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
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>
            </>
          )}
        </div>

        <div className="dialog-foot">
          <div style={{ flex: 1, fontSize: 11, color: "var(--text-faint)" }}>
            {mode === "delete" && confirmText !== expected ? "이메일이 일치하지 않습니다" : ""}
          </div>
          <button className="btn btn-sm" onClick={onClose}>취소</button>
          {mode === "signout" ? (
            <button className="btn btn-sm" style={{ color: "var(--err)", borderColor: "color-mix(in oklab, var(--err) 30%, var(--border))" }} onClick={signOut}>
              <Icon name="logout" size={12} />로그아웃
            </button>
          ) : (
            <button
              className="btn btn-sm btn-primary"
              style={{ background: "var(--err)", color: "white" }}
              disabled={confirmText !== expected}
              onClick={deleteAccount}
            >
              <Icon name="trash" size={12} />영구 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===========================================================
   PROFILE EDIT DIALOG
   =========================================================== */
function ProfileEditDialog({ user, onClose, onSave }) {
  const [draft, setDraft] = useStateO({ ...user });
  const fileRef = useRefO(null);
  const update = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
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
    "건국대학교", "동국대학교", "기타",
  ];

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
                flexShrink: 0, overflow: "hidden",
              }}
            >
              {!isImage && draft.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                <button className="btn btn-sm btn-ghost" onClick={() => fileRef.current && fileRef.current.click()} type="button">
                  <Icon name="image" size={12} />사진 업로드
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => { const url = window.prompt("이미지 URL", ""); if (url) update("avatar", `url("${url}")`); }}
                  type="button"
                >
                  <Icon name="link" size={12} />URL로 추가
                </button>
                {isImage && (
                  <button className="btn btn-sm" style={{ color: "var(--err)" }} onClick={() => update("avatar", null)} type="button">
                    <Icon name="trash" size={12} />제거
                  </button>
                )}
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
                  const initials = parts.length > 1
                    ? (parts[1][0] + parts[0][0]).toUpperCase()
                    : v.slice(0, 2).toUpperCase();
                  update("initials", initials);
                }}
                className="form-input"
                placeholder="이름"
              />
            </FormField>
            <FormField label="이메일" hint="변경하려면 인증이 필요합니다">
              <div style={{ position: "relative" }}>
                <input value={draft.email} onChange={(e) => update("email", e.target.value)} className="form-input" placeholder="email@example.com" />
                <span className="chip chip-ok" style={{ position: "absolute", right: 6, top: 6, height: 22, fontSize: 10 }}>
                  <Icon name="check" size={9} stroke={3} />인증됨
                </span>
              </div>
            </FormField>
            <FormField label="학교">
              <select value={draft.school || ""} onChange={(e) => update("school", e.target.value)} className="form-input">
                {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
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
                style={{ resize: "vertical", lineHeight: 1.5 }}
              />
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
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-lo)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}

window.Planary = Object.assign(window.Planary || {}, {
  ProjectsPage, NotesPage, WikiPage, BookmarksPage, ArchivePage, ProfilePage,
  TaskEditDialog, ShareDialog,
});