// Shared page hooks and task/share dialogs used across the app.

const { useState: useStateO, useRef: useRefO, useEffect: useEffectO, useMemo: useMemoO } = React;

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
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && draft.title?.trim()) onSave(draft);
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
          <button className="btn btn-primary btn-sm" disabled={!draft.title?.trim()} onClick={() => onSave(draft)}>
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
    let listener = null;
    const timer = setTimeout(() => {
      listener = () => onClose();
      window.addEventListener("click", listener);
    }, 0);
    return () => {
      clearTimeout(timer);
      if (listener) window.removeEventListener("click", listener);
    };
  }, []);
  return (
    <div
      className="tool-popover"
      style={{ position: "absolute", top: "100%", right: 4, left: "auto", bottom: "auto", minWidth: 180 }}
      onClick={(e) => e.stopPropagation()}>
      
      {children}
    </div>);

}

function FocusMode({ task, onClose, onDone }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const fmt = (s) => {
    const h = Math.floor(s / 3600);
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
  };
  const priority = task.priority || "med";
  const priorityColor = priority === "high" ? "var(--err)" : priority === "low" ? "var(--info)" : "var(--warn)";
  return (
    <div
      className="focus-mode-overlay"
      onClick={onClose}
    >
      <div className="focus-mode-card" onClick={(e) => e.stopPropagation()}>
        <div className="focus-mode-label">
          <Icon name="zap" size={13} style={{ color: "var(--accent)" }} />
          <span>집중 모드</span>
        </div>
        <div className="focus-mode-timer">{fmt(elapsed)}</div>
        <div className="focus-mode-title">{task.title || "(제목 없음)"}</div>
        {task.time && <div className="focus-mode-due"><Icon name="clock" size={12} />{task.time}</div>}
        {task.priority && task.priority !== "med" && (
          <div className="focus-mode-priority" style={{ color: priorityColor }}>
            <Icon name="flag" size={12} />
            {priority === "high" ? "높은 우선순위" : "낮은 우선순위"}
          </div>
        )}
        <div className="focus-mode-actions">
          <button
            className="btn btn-primary"
            onClick={() => { onDone(task); onClose(); }}
          >
            <Icon name="check" size={15} />완료로 표시
          </button>
          <button className="btn btn-ghost" onClick={onClose}>나가기 (Esc)</button>
        </div>
      </div>
    </div>
  );
}
window.Planary = Object.assign(window.Planary || {}, {
  TaskEditDialog, ShareDialog, FocusMode
});
