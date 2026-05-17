/* Planary — Home + Tasks pages (with 3 layout variations). */

const { useState: useStateHT, useMemo: useMemoHT, useEffect: useEffectHT } = React;

/* ===========================================================
   HOME / DASHBOARD
   variant = "conservative" | "balanced" | "bold"
   =========================================================== */

function HomePage({ tasks, setTasks, variant, setPage, setTaskFilter }) {
  const { PROJECTS, USER } = window.Planary;

  const today = tasks.filter(t => t.time && t.time.startsWith("오늘"));
  const important = tasks.filter(t => t.priority === "high" && !t.done);
  const completedToday = tasks.filter(t => t.done && t.time && t.time.startsWith("오늘"));
  const completionPct = tasks.length === 0 ? 0 : Math.round(tasks.filter(t => t.done).length / tasks.length * 100);
  const eclassToday = tasks.filter(t => t.project === "pe" && !t.done && t.time && t.time.startsWith("오늘"));
  const eclassSoon  = tasks.filter(t => t.project === "pe" && !t.done && (t.time === "내일" || t.time.startsWith("오늘") || t.time === "수요일 23:59"));

  const toggleTask = (id) =>
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const hour = new Date().getHours();
  const greet = hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "수고하셨어요";

  const sharedProps = {
    greet, user: USER, today, important,
    projects: PROJECTS, tasks, toggleTask,
    completionPct, eclassToday, eclassSoon,
    setPage, setTaskFilter,
  };

  if (variant === "conservative") return <HomeConservative {...sharedProps} />;
  if (variant === "bold") return <HomeBold {...sharedProps} />;
  return <HomeBalanced {...sharedProps} />;
}

/* ---------- BALANCED (default) — refined ---------- */
function HomeBalanced({ greet, user, today, important, projects, tasks, toggleTask, completionPct, eclassToday, eclassSoon, setPage, setTaskFilter }) {
  const [focusMoreOpen, setFocusMoreOpen] = useStateHT(false);
  const todayOpen = today.filter(t => !t.done);
  const todayDone = today.filter(t => t.done);
  const focusTask = todayOpen.find(t => t.priority === "high") || todayOpen[0];
  const date = new Date();
  const dateLabel = date.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });

  // Mini week calendar
  const weekData = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayTasks = i === 0 ? today : i === 1 ? tasks.filter(t => t.time === "내일") : tasks.filter(t => false);
    weekData.push({
      offset: i,
      label: ["일","월","화","수","목","금","토"][d.getDay()],
      num: d.getDate(),
      count: Math.max(0, Math.round(Math.random() * 4 + (i === 0 ? today.length : 0))),
      isToday: i === 0,
    });
  }
  // Make today's count accurate
  weekData[3].count = today.length;

  return (
    <div className="page-wide">
      {eclassToday.length > 0 && (
        <div
          className="notice"
          style={{ cursor: "pointer" }}
          onClick={() => setPage("projects")}
        >
          <div className="notice-icon"><Icon name="globe" size={14} /></div>
          <div style={{ flex: 1 }}>
            <strong style={{ color: "var(--text-hi)" }}>e-Class에서 오늘 마감 {eclassToday.length}개</strong>
            <span style={{ color: "var(--text-lo)" }}> · {eclassToday[0].title}{eclassToday.length > 1 ? ` 외 ${eclassToday.length - 1}개` : ""}</span>
          </div>
          <span className="notice-meta">12분 전 동기화</span>
          <Icon name="arrowRight" size={14} style={{ color: "var(--text-lo)" }} />
        </div>
      )}

      {/* Header — date + greeting, generous typography */}
      <header style={{ marginBottom: 28, display: "flex", alignItems: "end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-lo)", fontWeight: 500, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="status-dot is-live" style={{ width: 6, height: 6, background: "var(--ok)", boxShadow: "none", animation: "none" }} />
            {dateLabel} · {greet}
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.05, color: "var(--text-hi)" }}>
            {todayOpen.length === 0
              ? <>오늘 할 일이 없어요. <span style={{ color: "var(--text-lo)" }}>쉬어가도 좋아요.</span></>
              : <>{user.name.split(" ")[1]}님, 오늘 <span style={{ color: "var(--accent)" }}>{todayOpen.length}개</span>의 할 일이 있어요.</>
            }
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="ring" style={{ "--p": completionPct, "--size": "72px", "--stroke": "6px" }}>
            <span className="ring-text" style={{ fontSize: 14 }}>{completionPct}%</span>
          </div>
          <div>
            <div className="kicker">완료율</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-hi)", marginTop: 2 }}>{tasks.filter(t => t.done).length} / {tasks.length}</div>
            <div style={{ fontSize: 11, color: "var(--text-lo)" }}>이번 주 기준</div>
          </div>
        </div>
      </header>

      {/* Quick capture — always present */}
      <QuickCapture />

      {/* Focus card + week strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginTop: 18 }}>
        {/* Now focus */}
        {focusTask ? (
          <div
            className="card"
            style={{ padding: 0, overflow: "hidden", position: "relative", cursor: "pointer" }}
            onClick={() => setPage("tasks")}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0, width: 4,
              background: focusTask.priority === "high" ? "var(--err)" : focusTask.priority === "med" ? "var(--warn)" : "var(--info)"
            }} />
            <div style={{ padding: "22px 24px 18px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Icon name="target" size={14} style={{ color: "var(--accent)" }} />
                <span className="kicker">지금 집중할 일</span>
                <div style={{ flex: 1 }} />
                <span className="chip" style={{ height: 22, fontSize: 11 }}>
                  <Icon name="clock" size={11} />{focusTask.time || "예정"}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25, color: "var(--text-hi)" }}>
                {focusTask.title}
              </div>
              {focusTask.memo && (
                <div style={{ fontSize: 14, color: "var(--text-md)", marginTop: 8, lineHeight: 1.5 }}>{focusTask.memo}</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); toggleTask(focusTask.id); }}>
                  <Icon name="check" size={12} stroke={3} />완료로 표시
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent("planary:enter-focus-mode", { detail: focusTask }));
                  }}
                >
                  <Icon name="zap" size={12} />포커스 모드
                </button>
                <div style={{ flex: 1 }} />
                <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-sm"
                    onClick={(e) => { e.stopPropagation(); setFocusMoreOpen(o => !o); }}
                  >
                    <Icon name="more" size={14} />
                  </button>
                  {focusMoreOpen && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 99 }}
                        onClick={(e) => { e.stopPropagation(); setFocusMoreOpen(false); }}
                      />
                      <div
                        className="popover"
                        style={{ top: "calc(100% + 6px)", right: 0, minWidth: 200, zIndex: 100 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="popover-item" onClick={() => { setFocusMoreOpen(false); window.dispatchEvent(new CustomEvent("planary:edit-task", { detail: focusTask })); }}>
                          <Icon name="edit" size={13} />편집
                        </div>
                        <div className="popover-item" onClick={() => { setFocusMoreOpen(false); window.dispatchEvent(new CustomEvent("planary:enter-focus-mode", { detail: focusTask })); }}>
                          <Icon name="zap" size={13} />포커스 모드
                        </div>
                        <div className="popover-item" onClick={() => { setFocusMoreOpen(false); window.dispatchEvent(new CustomEvent("planary:postpone-task", { detail: { id: focusTask.id, time: "내일" } })); window.Planary.toast?.({ type: "ok", title: "내일로 미뤘어요", sub: focusTask.title }); }}>
                          <Icon name="calendar" size={13} />내일로 미루기
                        </div>
                        <div className="popover-item" onClick={() => { setFocusMoreOpen(false); navigator.clipboard?.writeText(focusTask.title); window.Planary.toast?.({ type: "ok", title: "제목이 복사됐어요" }); }}>
                          <Icon name="copy" size={13} />제목 복사
                        </div>
                        <div className="popover-sep" />
                        <div
                          className="popover-item is-danger"
                          onClick={() => {
                            setFocusMoreOpen(false);
                            if (window.confirm(`"${focusTask.title}"을(를) 삭제할까요?`)) {
                              window.dispatchEvent(new CustomEvent("planary:delete-task", { detail: focusTask.id }));
                              window.Planary.toast?.({ type: "err", title: "작업이 삭제됐어요" });
                            }
                          }}
                        >
                          <Icon name="trash" size={13} />삭제
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 28, textAlign: "center" }}>
            <div className="empty-icon" style={{ margin: "0 auto 12px" }}><Icon name="check" size={24} /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-hi)" }}>오늘 일정이 비어있어요</div>
            <div style={{ fontSize: 13, color: "var(--text-lo)", marginTop: 4 }}>새 작업을 추가하거나 내일 일정을 미리 확인하세요.</div>
          </div>
        )}

        {/* This week strip */}
        <div className="card" style={{ padding: "20px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span className="kicker">이번 주</span>
            <button className="btn btn-sm" onClick={() => setPage("tasks")} style={{ height: 24, padding: "0 8px", fontSize: 11 }}>
              상세 <Icon name="arrowRight" size={11} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {weekData.map((d, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  padding: "8px 4px 10px",
                  borderRadius: "var(--r-md)",
                  border: d.isToday ? "1px solid var(--accent-ring)" : "1px solid transparent",
                  background: d.isToday ? "var(--accent-softer)" : "transparent",
                  cursor: "pointer",
                  transition: "all var(--dur-fast)",
                }}
              >
                <div style={{ fontSize: 10, color: "var(--text-lo)", fontWeight: 600, letterSpacing: "0.02em" }}>{d.label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4, color: d.isToday ? "var(--accent)" : "var(--text-hi)", letterSpacing: "-0.02em" }}>{d.num}</div>
                <div style={{ display: "flex", gap: 2, justifyContent: "center", marginTop: 6, minHeight: 4 }}>
                  {d.count > 0 && Array.from({ length: Math.min(d.count, 4) }).map((_, k) => (
                    <span key={k} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: d.isToday ? "var(--accent)" : "var(--text-faint)"
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's list + projects, side by side, refined */}
      <div className="dash" style={{ marginTop: 16 }}>
        <div className="widget-card">
          <div className="widget-head">
            <div className="widget-title">
              <Icon name="list" size={15} />
              오늘
              <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 500, marginLeft: 4 }}>
                {todayDone.length} / {today.length}
              </span>
            </div>
            <button className="btn btn-sm" onClick={() => setPage("tasks")}>
              모두 보기 <Icon name="arrowRight" size={11} />
            </button>
          </div>
          <div className="widget-body" style={{ padding: "4px 8px 12px" }}>
            {today.length === 0
              ? <div className="empty" style={{ padding: 32 }}><Icon name="check" size={20} style={{ color: "var(--text-faint)", marginBottom: 8 }} />여유로운 하루네요</div>
              : today.slice(0, 6).map(t => (
                  <div key={t.id} className="focus-row" onClick={() => toggleTask(t.id)}>
                    <button className={`checkbox ${t.done ? "is-checked" : ""}`} onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}>
                      {t.done && <Icon name="check" size={12} stroke={3} />}
                    </button>
                    <span className={`focus-text ${t.done ? "is-done" : ""}`}>{t.title}</span>
                    <div className="focus-meta">
                      {t.source === "eclass" && <Icon name="globe" size={11} style={{ color: "var(--info)" }} />}
                      {t.priority === "high" && !t.done && <span className="dot dot-high" />}
                      {t.reminder && <Icon name="bell" size={11} style={{ color: "var(--text-lo)" }} />}
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-head">
            <div className="widget-title">
              <Icon name="layers" size={15} />
              프로젝트
            </div>
            <button className="btn btn-sm" onClick={() => setPage("projects")}>
              모두 보기 <Icon name="arrowRight" size={11} />
            </button>
          </div>
          <div className="widget-body" style={{ padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.slice(0, 4).map(p => (
              <div
                key={p.id}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer" }}
                onClick={() => setPage("projects")}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: p.color, display: "grid", placeItems: "center", fontSize: 13, flexShrink: 0 }}>{p.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-lo)", fontWeight: 600, marginLeft: 8 }}>{p.progress}%</span>
                  </div>
                  <div className="bar"><span style={{ width: `${p.progress}%` }} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: recent notes + reminders */}
      <div className="dash" style={{ marginTop: 16 }}>
        <div className="widget-card">
          <div className="widget-head">
            <div className="widget-title">
              <Icon name="note" size={15} />최근 메모
            </div>
            <button className="btn btn-sm" onClick={() => setPage("notes")}>전체 <Icon name="arrowRight" size={11} /></button>
          </div>
          <div className="widget-body" style={{ padding: "8px 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {window.Planary.NOTES.slice(0, 3).map(n => (
              <div
                key={n.id}
                className={`note note-${n.color}`}
                style={{ position: "relative", width: "auto", transform: "rotate(-0.5deg)", minHeight: 96, padding: 10, boxShadow: "var(--shadow-sm)", fontSize: 11 }}
                onClick={() => setPage("notes")}
              >
                <div className="note-text" style={{ fontSize: 11, lineHeight: 1.4 }}>{n.text}</div>
                <div className="note-foot" style={{ fontSize: 9, marginTop: 8 }}>{n.date}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-head">
            <div className="widget-title">
              <Icon name="bell" size={15} />다가오는 리마인더
            </div>
            <button className="btn btn-sm" onClick={() => { setPage("tasks"); setTaskFilter("reminders"); }}>전체 <Icon name="arrowRight" size={11} /></button>
          </div>
          <div className="widget-body" style={{ padding: "4px 8px 12px" }}>
            {tasks.filter(t => t.reminder && !t.done).slice(0, 4).map(t => (
              <div key={t.id} className="focus-row" style={{ padding: "8px 10px" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-softer)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon name="bell" size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)" }}>{t.time}</div>
                </div>
              </div>
            ))}
            {tasks.filter(t => t.reminder && !t.done).length === 0 && (
              <div className="empty" style={{ padding: 24, fontSize: 12 }}>리마인더 없음</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Quick capture — pinned inline */
function QuickCapture() {
  const [text, setText] = useStateHT("");
  const [type, setType] = useStateHT("task"); // task | note
  const [openPop, setOpenPop] = useStateHT(null); // "date" | "reminder" | "priority" | "project" | null
  const [dueDate, setDueDate] = useStateHT(null); // { id, label, iso }
  const [reminders, setReminders] = useStateHT([]);
  const [priority, setPriority] = useStateHT({ id: "med", label: "보통", color: "var(--warn)" });
  const [project, setProject] = useStateHT(null); // { id, name, color }

  const toISODate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const addDaysISO = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toISODate(d);
  };
  const addMonthsISO = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return toISODate(d);
  };
  const labelForDate = (iso) => {
    if (!iso) return "기한";
    const today = toISODate(new Date());
    if (iso === today) return "오늘";
    if (iso === addDaysISO(1)) return "내일";
    if (iso === addDaysISO(2)) return "모레";
    return new Date(`${iso}T00:00:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  };
  const today = toISODate(new Date());
  const oneMonthLater = addMonthsISO(1);
  const dateOpts = [
    { id: "today",    label: "오늘",    icon: "zap", desc: "오늘 안에", iso: today },
    { id: "tomorrow", label: "내일",    icon: "calendar", desc: "내일", iso: addDaysISO(1) },
    { id: "after",    label: "모레",    icon: "calendar", desc: "이틀 뒤", iso: addDaysISO(2) },
    { id: "1w",       label: "1주일 뒤", icon: "calendar", desc: "다음 주 같은 요일", iso: addDaysISO(7) },
    { id: "1m",       label: "한 달 뒤", icon: "calendar", desc: "다음 달 같은 날", iso: oneMonthLater },
    { id: "none",     label: "기한 없음", icon: "x", desc: "아무때나" },
  ];
  const reminderOpts = [
    { value: 10, label: "10분 전" },
    { value: 30, label: "30분 전" },
    { value: 60, label: "1시간 전" },
    { value: 1440, label: "1일 전" },
    { value: 10080, label: "1주일 전" },
  ];
  const reminderLabel = (minutes) => reminderOpts.find(r => r.value === minutes)?.label || `${minutes}분 전`;
  const toggleReminder = (minutes) => {
    setReminders(prev => {
      if (prev.includes(minutes)) return prev.filter(v => v !== minutes);
      return [...prev, minutes].sort((a, b) => b - a);
    });
  };
  const reminderButtonLabel = reminders.length
    ? (reminders.length === 1 ? reminderLabel(reminders[0]) : `${reminderLabel(reminders[0])} 외 ${reminders.length - 1}`)
    : "알림";
  const priorityOpts = [
    { id: "high", label: "높음", color: "var(--err)" },
    { id: "med",  label: "보통", color: "var(--warn)" },
    { id: "low",  label: "낮음", color: "var(--info)" },
  ];

  const submit = () => {
    if (!text.trim()) return;
    const selectedReminders = dueDate ? reminders : [];
    const newTask = {
      id: "t" + Date.now(),
      title: text.trim(),
      memo: null,
      project: project?.id || null,
      priority: priority.id,
      due: null,
      dueDate: dueDate?.iso || null,
      time: dueDate?.label || null,
      reminder: selectedReminders.length > 0,
      calendarReminderMinutes: selectedReminders[0] ?? null,
      calendarReminderMinutesList: selectedReminders,
      done: false,
      tags: [],
    };
    if (type === "task") {
      window.dispatchEvent(new CustomEvent("planary:create-task", { detail: newTask }));
      window.Planary.toast?.({
        type: "ok",
        title: "작업이 추가됐어요",
        sub: `${dueDate?.label ? dueDate.label + " · " : ""}${text.trim().slice(0, 30)}${text.length > 30 ? "…" : ""}`,
      });
    } else {
      window.dispatchEvent(new CustomEvent("planary:create-note", { detail: { text: text.trim(), color: "yellow", x: 80, y: 80 } }));
      window.Planary.toast?.({
        type: "ok",
        title: "메모가 추가됐어요",
        sub: text.trim().slice(0, 30) + (text.length > 30 ? "…" : ""),
      });
    }
    setText(""); setDueDate(null); setReminders([]); setProject(null);
  };

  const projects = window.Planary.PROJECTS;

  return (
    <div className="composer" style={{ margin: 0 }}>
      <div className="composer-row">
        <Icon name={type === "task" ? "plus" : "edit"} size={16} style={{ color: "var(--accent)" }} />
        <input
          className="composer-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={type === "task" ? "빠른 작업 추가" : "빠른 메모"}
        />
        <span className="kbd">⏎</span>
      </div>
      <div className="composer-tools">
        <div style={{ display: "inline-flex", padding: 3, background: "var(--bg-elev)", borderRadius: "var(--r-sm)", gap: 1 }}>
          <button
            className="tool-btn"
            onClick={() => setType("task")}
            style={{ height: 22, border: 0, background: type === "task" ? "var(--surface)" : "transparent", color: type === "task" ? "var(--text-hi)" : "var(--text-lo)" }}
          >
            <Icon name="check" size={11} />작업
          </button>
          <button
            className="tool-btn"
            onClick={() => setType("note")}
            style={{ height: 22, border: 0, background: type === "note" ? "var(--surface)" : "transparent", color: type === "note" ? "var(--text-hi)" : "var(--text-lo)" }}
          >
            <Icon name="note" size={11} />메모
          </button>
        </div>
        {type === "task" && (
          <>
            {/* Date */}
            <div style={{ position: "relative" }}>
              <button
                className={`tool-btn ${dueDate ? "is-on" : ""}`}
                onClick={(e) => { e.stopPropagation(); setOpenPop(openPop === "date" ? null : "date"); }}
              >
                <Icon name="calendar" size={11} />{dueDate?.label || "기한"}
              </button>
              {openPop === "date" && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpenPop(null)} />
                  <div className="tool-popover" style={{ minWidth: 248, zIndex: 50, top: "calc(100% + 6px)", bottom: "auto" }} onClick={(e) => e.stopPropagation()}>
                    {dateOpts.map(opt => (
                      <button
                        key={opt.id}
                        className={`tool-popover-item ${dueDate?.id === opt.id ? "is-active" : ""}`}
                        onClick={() => { setDueDate(opt.id === "none" ? null : opt); if (opt.id === "none") setReminders([]); setOpenPop(null); }}
                        type="button"
                      >
                        <Icon name={opt.icon} size={12} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{opt.label}</div>
                          <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{opt.desc}</div>
                        </div>
                        {dueDate?.id === opt.id && <Icon name="check" size={11} stroke={3} style={{ color: "var(--accent)" }} />}
                      </button>
                    ))}
                    <div className="tool-popover-field">
                      <div className="tool-popover-label">직접 선택</div>
                      <input
                        className="tool-date-input"
                        type="date"
                        min={today}
                        max={oneMonthLater}
                        value={dueDate?.iso || ""}
                        onChange={(e) => {
                          const iso = e.target.value;
                          if (!iso) return;
                          setDueDate({ id: "custom", label: labelForDate(iso), icon: "calendar", desc: "직접 선택", iso });
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reminders */}
            <div style={{ position: "relative" }}>
              <button
                className={`tool-btn ${reminders.length ? "is-on" : ""}`}
                onClick={(e) => { e.stopPropagation(); setOpenPop(openPop === "reminder" ? null : "reminder"); }}
              >
                <Icon name="bell" size={11} />{reminderButtonLabel}
              </button>
              {openPop === "reminder" && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpenPop(null)} />
                  <div className="tool-popover" style={{ minWidth: 190, zIndex: 50, top: "calc(100% + 6px)", bottom: "auto" }} onClick={(e) => e.stopPropagation()}>
                    {!dueDate && <div className="tool-popover-hint">기한을 먼저 선택하면 알림이 적용돼요.</div>}
                    {reminderOpts.map(opt => (
                      <button
                        key={opt.value}
                        className={`tool-popover-item ${reminders.includes(opt.value) ? "is-active" : ""}`}
                        onClick={() => toggleReminder(opt.value)}
                        type="button"
                      >
                        <Icon name="bell" size={12} />
                        <span style={{ flex: 1 }}>{opt.label}</span>
                        {reminders.includes(opt.value) && <Icon name="check" size={11} stroke={3} style={{ color: "var(--accent)" }} />}
                      </button>
                    ))}
                    <div className="tool-popover-actions">
                      <button type="button" className="btn btn-sm" onClick={() => setReminders([])}>초기화</button>
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setOpenPop(null)}>완료</button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Priority */}
            <div style={{ position: "relative" }}>
              <button
                className="tool-btn"
                onClick={(e) => { e.stopPropagation(); setOpenPop(openPop === "priority" ? null : "priority"); }}
                style={priority ? { borderColor: priority.color + "55" } : undefined}
              >
                <span style={{ width: 7, height: 7, borderRadius: 2, background: priority.color }} />
                {priority.label}
              </button>
              {openPop === "priority" && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpenPop(null)} />
                  <div className="tool-popover" style={{ minWidth: 160, zIndex: 50, top: "calc(100% + 6px)", bottom: "auto" }} onClick={(e) => e.stopPropagation()}>
                    {priorityOpts.map(p => (
                      <button
                        key={p.id}
                        className={`tool-popover-item ${priority.id === p.id ? "is-active" : ""}`}
                        onClick={() => { setPriority(p); setOpenPop(null); }}
                        type="button"
                      >
                        <span className="dot" style={{ background: p.color, width: 9, height: 9, borderRadius: 2 }} />
                        <span style={{ flex: 1 }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Project */}
            <div style={{ position: "relative" }}>
              <button
                className={`tool-btn ${project ? "is-on" : ""}`}
                onClick={(e) => { e.stopPropagation(); setOpenPop(openPop === "project" ? null : "project"); }}
              >
                {project ? <span className="proj-color" style={{ background: project.color }} /> : <Icon name="folder" size={11} />}
                {project?.name || "프로젝트"}
              </button>
              {openPop === "project" && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setOpenPop(null)} />
                  <div className="tool-popover" style={{ minWidth: 200, zIndex: 50, top: "calc(100% + 6px)", bottom: "auto" }} onClick={(e) => e.stopPropagation()}>
                    <button className={`tool-popover-item ${!project ? "is-active" : ""}`} onClick={() => { setProject(null); setOpenPop(null); }} type="button">
                      <span className="proj-color" style={{ background: "var(--text-faint)" }} />
                      <span>프로젝트 없음</span>
                    </button>
                    {projects.map(p => (
                      <button
                        key={p.id}
                        className={`tool-popover-item ${project?.id === p.id ? "is-active" : ""}`}
                        onClick={() => { setProject(p); setOpenPop(null); }}
                        type="button"
                      >
                        <span className="proj-color" style={{ background: p.color }} />
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm btn-primary" disabled={!text.trim()} onClick={submit}>
          <Icon name="plus" size={12} />추가
        </button>
      </div>
    </div>
  );
}

/* ---------- CONSERVATIVE — clean stat row + classic 2-col widgets ---------- */
function HomeConservative({ greet, user, today, important, projects, tasks, toggleTask, completionPct, setPage, setTaskFilter }) {
  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
        <div>
          <div className="hero-greet">{greet}</div>
          <div className="page-title">{user.name.split(" ")[1]}님의 작업 공간</div>
          <div className="page-sub">오늘 마감 {today.length}개 · 이번 주 완료율 {completionPct}%</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setPage("tasks")}>새 작업</button>
          <button className="btn btn-primary" onClick={() => { setPage("tasks"); setTaskFilter("today"); }}>
            <Icon name="zap" size={14} />오늘 시작
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
        {[
          { label: "오늘 마감", val: today.length, sub: `${today.filter(t => !t.done).length} 진행 중` },
          { label: "중요 작업", val: important.length, sub: "우선순위 높음" },
          { label: "완료율", val: `${completionPct}%`, sub: "전체 기준" },
          { label: "활성 프로젝트", val: projects.length, sub: `${projects.filter(p => p.progress < 100).length}개 진행` },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 11, color: "var(--text-lo)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 12 }}>{s.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, color: "var(--text-lo)", marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash">
        <div className="widget-card">
          <div className="widget-head">
            <div className="widget-title">오늘의 포커스</div>
            <button className="btn btn-sm" onClick={() => setPage("tasks")}>모두 보기 <Icon name="arrowRight" size={12} /></button>
          </div>
          <div className="widget-body">
            {today.slice(0, 6).map(t => (
              <div key={t.id} className="focus-row" onClick={() => toggleTask(t.id)}>
                <button className={`checkbox ${t.done ? "is-checked" : ""}`}>
                  {t.done && <Icon name="check" size={12} stroke={3} />}
                </button>
                <span className={`focus-text ${t.done ? "is-done" : ""}`}>{t.title}</span>
                <span className="chip" style={{ background: "transparent", borderColor: "var(--border-soft)" }}>{t.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="widget-card">
          <div className="widget-head">
            <div className="widget-title">프로젝트 진행률</div>
            <button className="btn btn-sm" onClick={() => setPage("projects")}>전체 <Icon name="arrowRight" size={12} /></button>
          </div>
          <div className="widget-body" style={{ padding: "0 14px 14px" }}>
            {projects.map(p => (
              <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span className="proj-color" style={{ background: p.color, width: 10, height: 10, borderRadius: 3 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-lo)", fontWeight: 600 }}>{p.progress}%</span>
                </div>
                <div className="bar"><span style={{ width: `${p.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- BOLD — Hourly timeline + giant focus card + heatmap ---------- */
function HomeBold({ greet, user, today, important, projects, tasks, toggleTask, completionPct, setPage, setTaskFilter }) {
  const focusTask = today.find(t => !t.done && t.priority === "high") || today.find(t => !t.done) || important[0];
  const hour = new Date().getHours();
  const min = new Date().getMinutes();
  const nowTop = ((hour - 8) * 60 + min) / (12 * 60) * 100; // 8am – 8pm scale, percent
  const heat = window.Planary.WEEKLY_HEATMAP.slice(0, 140);

  return (
    <div className="page-wide">
      <div className="hero" style={{ padding: "32px 36px", marginBottom: 22 }}>
        <div className="hero-greet" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="dot" style={{ background: "var(--ok)", width: 6, height: 6, borderRadius: "50%" }} />
          <span style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
            {greet} · {new Date().toLocaleDateString("ko-KR", { weekday: "long", month: "long", day: "numeric" })}
          </span>
        </div>
        <div className="hero-title" style={{ fontSize: 44, marginTop: 12 }}>
          오늘은 <span className="accent">{focusTask?.title || "잘 쉬는 날"}</span>에<br />
          집중하는 게 좋겠어요.
        </div>
        <div className="hero-sub" style={{ marginTop: 14 }}>
          {focusTask ? "포커스 모드로 들어가면 다른 알림이 잠시 꺼집니다." : "오늘 마감 작업이 없어요. 충분히 쉬셔도 좋아요."}
        </div>
        <div className="hero-actions" style={{ marginTop: 22 }}>
          <button className="btn btn-primary btn-lg">
            <Icon name="target" size={16} />포커스 모드 시작
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => setPage("tasks")}>
            <Icon name="list" size={14} />전체 작업 보기
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        {/* Hourly timeline */}
        <div className="widget-card">
          <div className="widget-head">
            <div className="widget-title">
              <Icon name="clock" size={16} style={{ color: "var(--accent)" }} />
              오늘의 타임라인
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)", borderColor: "transparent" }}>{hour}:{String(min).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="widget-body" style={{ padding: "12px 16px 18px", position: "relative" }}>
            <div className="timeline">
              {[
                { time: "09:00", title: "스탠드업", meta: "팀 미팅 · 15분" },
                { time: "10:30", title: today[0]?.title || "딥워크", meta: "포커스 · 90분", isHighlight: true },
                { time: "13:00", title: today[1]?.title || "런치 & 산책", meta: "휴식" },
                { time: "14:30", title: today[2]?.title || "디자인 리뷰", meta: "프로젝트 · 60분" },
                { time: "16:00", title: today[3]?.title || "월간 리포트", meta: "혼자 작업" },
                { time: "18:00", title: "운동 30분", meta: "루틴" },
              ].map((row, i) => (
                <div key={i} className="tl-row">
                  <div className="tl-time">{row.time}</div>
                  <div className="tl-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 4, height: 16, borderRadius: 2, background: row.isHighlight ? "var(--accent)" : "var(--border-strong)" }} />
                      <div style={{ flex: 1 }}>
                        <div className="tl-card-title">{row.title}</div>
                        <div className="tl-card-meta">{row.meta}</div>
                      </div>
                      <button className="icon-btn"><Icon name="more" size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="widget-card">
            <div className="widget-head">
              <div className="widget-title">
                <Icon name="fire" size={16} style={{ color: "var(--accent)" }} />이번 주 스트릭
              </div>
            </div>
            <div className="widget-body" style={{ padding: "10px 16px 18px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text-hi)" }}>12</span>
                <span style={{ fontSize: 14, color: "var(--text-md)" }}>일 연속 완료</span>
              </div>
              <div className="heat">
                {heat.map((v, i) => (
                  <div key={i} className={`heat-cell ${v ? `l${v}` : ""}`} title={v ? `${v}개 완료` : "없음"} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "var(--text-faint)" }}>
                <span>20주 전</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  적게
                  {[0,1,2,3,4].map(l => <div key={l} className={`heat-cell l${l}`} style={{ width: 10, height: 10 }} />)}
                  많이
                </div>
                <span>이번 주</span>
              </div>
            </div>
          </div>

          <div className="widget-card">
            <div className="widget-head">
              <div className="widget-title"><Icon name="sparkles" size={16} style={{ color: "var(--accent)" }} />빠른 메모</div>
            </div>
            <div className="widget-body" style={{ padding: "10px 16px 16px" }}>
              <textarea
                placeholder="떠오른 생각을 적어두세요…"
                rows={3}
                style={{
                  width: "100%", resize: "none",
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-md)",
                  padding: 12, color: "var(--text-hi)",
                  fontFamily: "var(--font-display)", fontSize: 13, outline: "none"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "var(--text-faint)" }}>⌘ + Enter — 저장</span>
                <button className="btn btn-sm btn-primary"><Icon name="send" size={12} />보관</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ===========================================================
   TASKS PAGE
   =========================================================== */

function TasksPage({ tasks, setTasks, taskFilter, setTaskFilter, variant }) {
  const { PROJECTS } = window.Planary;
  const [search, setSearch] = useStateHT("");
  const [composerOpen, setComposerOpen] = useStateHT(false);
  const [composerText, setComposerText] = useStateHT("");
  const [bulkAction, setBulkAction] = useStateHT(null); // { kind: "postpone"|"reschedule", items, label }

  const filtered = useMemoHT(() => {
    return tasks.filter(t => {
      if (taskFilter === "all") return !t.done;
      if (taskFilter === "today") return t.time && t.time.startsWith("오늘");
      if (taskFilter === "important") return t.priority === "high" && !t.done;
      if (taskFilter === "reminders") return t.reminder;
      if (taskFilter === "completed") return t.done;
      return true;
    }).filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));
  }, [tasks, taskFilter, search]);

  const counts = {
    all: tasks.filter(t => !t.done).length,
    today: tasks.filter(t => t.time && t.time.startsWith("오늘")).length,
    important: tasks.filter(t => t.priority === "high" && !t.done).length,
    reminders: tasks.filter(t => t.reminder).length,
    completed: tasks.filter(t => t.done).length,
  };

  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const addTask = () => {
    if (!composerText.trim()) return;
    const id = "t" + Date.now();
    setTasks(prev => [{ id, title: composerText.trim(), memo: null, project: null, priority: "med", due: null, time: "오늘", reminder: false, done: false, tags: [] }, ...prev]);
    setComposerText("");
    setComposerOpen(false);
  };

  const filters = [
    { id: "all", label: "전체", icon: "list", count: counts.all },
    { id: "today", label: "오늘", icon: "zap", count: counts.today },
    { id: "important", label: "중요", icon: "flag", count: counts.important },
    { id: "reminders", label: "리마인더", icon: "bell", count: counts.reminders },
    { id: "completed", label: "완료됨", icon: "check", count: counts.completed },
  ];

  // Kanban grouping (bold variant)
  const buckets = useMemoHT(() => ({
    today: filtered.filter(t => t.time && t.time.startsWith("오늘")),
    week:  filtered.filter(t => t.time && !t.time.startsWith("오늘") && !t.time.startsWith("어제") && t.time !== "보관"),
    later: filtered.filter(t => t.time && (t.time === "보관" || t.time.startsWith("어제"))),
    done:  filtered.filter(t => t.done),
  }), [filtered]);

  return (
    <div className="page-wide">
      <div className="page-head" style={{ display: "flex", alignItems: "end", justifyContent: "space-between" }}>
        <div>
          <div className="hero-greet">WORKSPACE · 작업</div>
          <div className="page-title">
            {taskFilter === "all" && "모든 작업"}
            {taskFilter === "today" && "오늘"}
            {taskFilter === "important" && "중요"}
            {taskFilter === "reminders" && "리마인더"}
            {taskFilter === "completed" && "완료됨"}
          </div>
          <div className="page-sub">{filtered.length}개 표시 · {tasks.length}개 전체</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost"><Icon name="filter" size={14} />필터</button>
          <button className="btn btn-ghost"><Icon name="grid" size={14} />그룹</button>
          <button className="btn btn-primary" onClick={() => setComposerOpen(true)}><Icon name="plus" size={14} />새 작업</button>
        </div>
      </div>

      <div className="tag-filter-bar">
        <div className="tag-filter-label">
          <Icon name="filter" size={12} />
          <span>필터</span>
        </div>
        <div className="tag-filter-chips">
          {filters.map(f => (
            <button
              key={f.id}
              className={`tag-chip ${taskFilter === f.id ? "is-active" : ""}`}
              onClick={() => setTaskFilter(f.id)}
            >
              <Icon name={f.icon} size={11} />
              <span>{f.label}</span>
              <span className="tag-chip-count">{f.count}</span>
            </button>
          ))}
        </div>
        <button className="tag-filter-action">
          <Icon name="sparkles" size={12} />AI 정리
        </button>
      </div>

      {/* Composer */}
      {composerOpen && (
        <div className="composer">
          <div className="composer-row">
            <Icon name="plus" size={16} style={{ color: "var(--accent)" }} />
            <input
              className="composer-input"
              autoFocus
              placeholder="무엇을 해야 하나요? — '내일 3시 디자인 리뷰' 처럼 입력해보세요"
              value={composerText}
              onChange={e => setComposerText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setComposerOpen(false); }}
            />
            <span className="kbd">Esc</span>
          </div>
          <div className="composer-tools">
            <button className="tool-btn"><Icon name="calendar" size={12} />오늘</button>
            <button className="tool-btn"><Icon name="bell" size={12} />리마인더</button>
            <button className="tool-btn"><Icon name="flag" size={12} />보통</button>
            <button className="tool-btn"><Icon name="folder" size={12} />프로젝트</button>
            <button className="tool-btn"><Icon name="paperclip" size={12} />첨부</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-sm" onClick={() => setComposerOpen(false)}>취소</button>
            <button className="btn btn-sm btn-primary" onClick={addTask}>추가</button>
          </div>
        </div>
      )}

      {!composerOpen && (
        <div className="search-bar" onClick={() => setComposerOpen(true)} style={{ cursor: "text" }}>
          <Icon name="plus" size={14} style={{ color: "var(--accent)" }} />
          <input
            placeholder="새 작업 추가… 또는 검색하기"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => {}}
          />
          <span className="kbd">N</span>
        </div>
      )}

      {/* Variants */}
      {variant === "bold" ? (
        <div className="kanban">
          {[
            { id: "today", label: "오늘", tone: "var(--accent)", items: buckets.today },
            { id: "week",  label: "이번 주", tone: "var(--info)", items: buckets.week },
            { id: "later", label: "나중에", tone: "var(--text-mute)", items: buckets.later },
            { id: "done",  label: "완료", tone: "var(--ok)", items: buckets.done },
          ].map(col => (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-head">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: col.tone }} />
                  <span>{col.label}</span>
                </div>
                <span className="kanban-col-count">{col.items.length}</span>
              </div>
              {col.items.map(t => (
                <window.Planary.TaskCard key={t.id} task={t} onToggle={toggleTask} projects={PROJECTS} />
              ))}
              {col.items.length === 0 && (
                <div className="empty" style={{ padding: "24px 8px", fontSize: 12 }}>비어있음</div>
              )}
            </div>
          ))}
        </div>
      ) : variant === "conservative" ? (
        <div className="task-list">
          {filtered.length === 0 ? (
            <div className="empty card">
              <div className="empty-icon"><Icon name="check" size={24} /></div>
              표시할 작업이 없어요.
            </div>
          ) : filtered.map(t => (
            <window.Planary.TaskCard key={t.id} task={t} onToggle={toggleTask} projects={PROJECTS} />
          ))}
        </div>
      ) : (
        // Balanced: grouped by time bucket with sticky group headers
        <div>
          {[
            { id: "overdue", label: "지연", items: filtered.filter(t => !t.done && t.time === "어제"), action: "재예약", actionKind: "reschedule" },
            { id: "today",   label: "오늘", items: filtered.filter(t => t.time && t.time.startsWith("오늘") && !t.done), action: "모두 미루기", actionKind: "postpone" },
            { id: "week",    label: "이번 주", items: filtered.filter(t => !t.done && t.time && !t.time.startsWith("오늘") && t.time !== "어제") },
            { id: "done",    label: "완료", items: filtered.filter(t => t.done) },
          ].map(group => group.items.length > 0 && (
            <div key={group.id} style={{ marginBottom: 4 }}>
              <div className="group-head">
                <span className="group-label">{group.label}</span>
                <span className="group-count">{group.items.length}</span>
                <div className="group-rule" />
                {group.action && (
                  <button
                    className="group-action"
                    onClick={() => setBulkAction({ kind: group.actionKind, items: group.items, label: group.label })}
                  >
                    {group.action}
                  </button>
                )}
              </div>
              <div className="task-list">
                {group.items.map(t => (
                  <window.Planary.TaskCard key={t.id} task={t} onToggle={toggleTask} projects={PROJECTS} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty card">
              <div className="empty-icon"><Icon name="check" size={24} /></div>
              표시할 작업이 없어요.
            </div>
          )}
        </div>
      )}

      {bulkAction && (
        <BulkActionDialog
          action={bulkAction}
          onClose={() => setBulkAction(null)}
          onConfirm={(targetTime) => {
            const ids = new Set(bulkAction.items.map(x => x.id));
            setTasks(prev => prev.map(t => ids.has(t.id) ? { ...t, time: targetTime } : t));
            const verb = bulkAction.kind === "postpone" ? "미뤘어요" : "재예약했어요";
            window.Planary.toast?.({
              type: "ok",
              title: `${bulkAction.items.length}개 작업을 ${verb}`,
              sub: `→ ${targetTime}`,
            });
            setBulkAction(null);
          }}
        />
      )}
    </div>
  );
}

window.Planary = Object.assign(window.Planary || {}, { HomePage, TasksPage });
