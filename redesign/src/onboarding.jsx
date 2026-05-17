/* Planary — Onboarding flow.
   Multi-step welcome experience for new users.
   Triggered on first visit (localStorage gate), can be re-opened from profile.
*/

const { useState: useStateOB, useEffect: useEffectOB, useRef: useRefOB } = React;

const ONB_STEPS = [
  { id: "welcome",   label: "환영",      icon: "sparkles" },
  { id: "name",      label: "프로필",    icon: "user" },
  { id: "school",    label: "학교",      icon: "globe" },
  { id: "accent",    label: "테마",      icon: "edit" },
  { id: "features",  label: "둘러보기",   icon: "layers" },
  { id: "firstTask", label: "첫 작업",   icon: "check" },
  { id: "ready",     label: "준비 완료",  icon: "zap" },
];

function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useStateOB(0);
  const [draft, setDraft] = useStateOB({
    name: "",
    initials: "",
    school: "",
    studentId: "",
    eclassConnect: false,
    accent: "violet",
    theme: "dark",
    interests: new Set(),
    firstTask: "",
    firstTaskDue: "today",
    firstTaskPriority: "med",
  });

  const update = (k, v) => setDraft(p => ({ ...p, [k]: v }));

  useEffectOB(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onComplete(draft); return; }
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
        // Don't trigger on Enter inside textarea
        if (e.target.tagName === "TEXTAREA") return;
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, draft]);

  const next = () => {
    if (step < ONB_STEPS.length - 1) setStep(step + 1);
    else finish();
  };
  const back = () => setStep(Math.max(0, step - 1));

  const finish = () => {
    // Apply settings to the running app
    if (draft.name) {
      window.Planary.USER = { ...window.Planary.USER, name: draft.name, initials: draft.initials };
    }
    if (draft.school) {
      window.Planary.USER = { ...window.Planary.USER, school: draft.school, studentId: draft.studentId };
    }
    if (draft.accent) document.documentElement.setAttribute("data-accent", draft.accent);
    if (draft.theme) document.documentElement.setAttribute("data-theme", draft.theme);

    // Push the first task into the running app
    if (draft.firstTask && draft.firstTask.trim()) {
      const timeLabel = draft.firstTaskDue === "today" ? "오늘"
        : draft.firstTaskDue === "tomorrow" ? "내일"
        : draft.firstTaskDue === "week" ? "이번 주" : null;
      const newTask = {
        id: "t" + Date.now(),
        title: draft.firstTask.trim(),
        memo: null,
        project: null,
        priority: draft.firstTaskPriority,
        due: null,
        time: timeLabel,
        reminder: false,
        done: false,
        tags: [],
      };
      window.dispatchEvent(new CustomEvent("planary:create-task", { detail: newTask }));
    }

    // Persist profile + preferences to Firestore via firebase-bridge
    if (draft.name || draft.school || draft.studentId) {
      window.dispatchEvent(new CustomEvent("planary:update-profile", {
        detail: {
          name: draft.name || null,
          school: draft.school || null,
          studentId: draft.studentId || null,
        },
      }));
    }
    window.dispatchEvent(new CustomEvent("planary:save-preferences", {
      detail: {
        accent: draft.accent || null,
        theme: draft.theme || null,
        lang: window.PlanaryI18n?.getLang?.() || null,
        interests: draft.interests instanceof Set ? Array.from(draft.interests) : (draft.interests || []),
      },
    }));

    try { localStorage.setItem("planary.onboarding.done", "1"); } catch (_) {}
    window.Planary.toast?.({
      type: "ok",
      title: `${draft.name || "환영해요"}님, 시작해볼까요?`,
      sub: draft.firstTask ? `첫 작업 "${draft.firstTask.slice(0, 24)}"을(를) 추가했어요` : "언제든 마이페이지에서 다시 둘러볼 수 있어요",
    });
    onComplete(draft);
  };

  const skip = () => {
    try { localStorage.setItem("planary.onboarding.done", "1"); } catch (_) {}
    onComplete(null);
  };

  const ACCENTS = [
    { id: "violet",  label: "보라",   color: "#7f0df2" },
    { id: "blue",    label: "블루",   color: "#2563eb" },
    { id: "emerald", label: "에메랄드", color: "#10b981" },
    { id: "amber",   label: "앰버",   color: "#f59e0b" },
    { id: "rose",    label: "로즈",   color: "#e11d48" },
    { id: "slate",   label: "슬레이트", color: "#475569" },
  ];

  return (
    <div className="onb-scrim">
      <div className="onb-card">
        {/* Progress dots */}
        <div className="onb-progress">
          {ONB_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`onb-dot ${i === step ? "is-current" : ""} ${i < step ? "is-done" : ""}`}
              onClick={() => i <= step && setStep(i)}
              title={s.label}
            >
              {i < step ? <Icon name="check" size={11} stroke={3} /> : i === step ? <Icon name={s.icon} size={11} /> : null}
            </div>
          ))}
        </div>

        <button className="onb-skip" onClick={skip}>건너뛰기</button>

        <div className="onb-body">
          {step === 0 && <OnbWelcome />}
          {step === 1 && <OnbName draft={draft} update={update} />}
          {step === 2 && <OnbSchool draft={draft} update={update} />}
          {step === 3 && <OnbTheme draft={draft} update={update} accents={ACCENTS} />}
          {step === 4 && <OnbFeatures draft={draft} update={update} />}
          {step === 5 && <OnbFirstTask draft={draft} update={update} />}
          {step === 6 && <OnbReady draft={draft} />}
        </div>

        <div className="onb-foot">
          {step > 0 ? (
            <button className="btn btn-sm" onClick={back}>
              <Icon name="chevronLeft" size={12} />뒤로
            </button>
          ) : <div />}
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {step + 1} / {ONB_STEPS.length}
          </div>
          <button className="btn btn-sm btn-primary" onClick={next}>
            {step === ONB_STEPS.length - 1 ? (
              <><Icon name="zap" size={12} />시작하기</>
            ) : (
              <>다음 <Icon name="chevronRight" size={12} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function OnbWelcome() {
  return (
    <div className="onb-step onb-step-center">
      <div className="onb-hero-logo">
        <img src="assets/icons/icon-512.png" alt="Planary" className="onb-logo" />
        <div className="onb-spark onb-spark-1" />
        <div className="onb-spark onb-spark-2" />
        <div className="onb-spark onb-spark-3" />
      </div>
      <h1 className="onb-title">Planary에 오신 걸 환영해요</h1>
      <p className="onb-subtitle">
        할 일과 노트, 강의 일정을 한 작업 공간에 두고<br />
        흐름을 잃지 않게 도와드릴게요.
      </p>
      <div className="onb-features-mini">
        <div className="onb-feature-mini"><Icon name="check" size={14} stroke={3} style={{ color: "var(--accent)" }} />작업 · 노트 · 위키</div>
        <div className="onb-feature-mini"><Icon name="check" size={14} stroke={3} style={{ color: "var(--accent)" }} />e-Class 자동 동기화</div>
        <div className="onb-feature-mini"><Icon name="check" size={14} stroke={3} style={{ color: "var(--accent)" }} />어디서나 사용 가능</div>
      </div>
    </div>
  );
}

function OnbName({ draft, update }) {
  return (
    <div className="onb-step">
      <div className="onb-step-icon"><Icon name="user" size={20} /></div>
      <h2 className="onb-step-title">이름을 알려주세요</h2>
      <p className="onb-step-sub">앱에서 표시될 이름이에요. 언제든 변경할 수 있습니다.</p>
      <div className="onb-form">
        <label className="onb-label">이름</label>
        <input
          autoFocus
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
          placeholder="홍길동"
          className="onb-input"
        />
        {draft.name && (
          <div className="onb-preview">
            <div className="avatar avatar-lg" style={{ width: 54, height: 54, fontSize: 22 }}>{draft.initials}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{draft.name}님</div>
              <div style={{ fontSize: 12, color: "var(--text-lo)" }}>안녕하세요 👋</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OnbSchool({ draft, update }) {
  const SCHOOLS = [
    "서울과학기술대학교", "서울대학교", "연세대학교", "고려대학교",
    "한양대학교", "성균관대학교", "이화여자대학교", "중앙대학교",
    "건국대학교", "동국대학교",
  ];
  return (
    <div className="onb-step">
      <div className="onb-step-icon"><Icon name="globe" size={20} /></div>
      <h2 className="onb-step-title">학교 정보 (선택)</h2>
      <p className="onb-step-sub">e-Class에서 강의·과제·시험 일정을 자동으로 가져올 수 있어요.</p>
      <div className="onb-form">
        <label className="onb-label">학교</label>
        <select
          value={draft.school}
          onChange={(e) => update("school", e.target.value)}
          className="onb-input"
        >
          <option value="">선택하지 않음</option>
          {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {draft.school && (
          <>
            <label className="onb-label" style={{ marginTop: 14 }}>학번</label>
            <input
              value={draft.studentId}
              onChange={(e) => update("studentId", e.target.value)}
              placeholder="예: 21900293"
              className="onb-input"
            />
            <label
              className="onb-check"
              onClick={() => update("eclassConnect", !draft.eclassConnect)}
            >
              <button
                type="button"
                className={`checkbox ${draft.eclassConnect ? "is-checked" : ""}`}
                onClick={(e) => { e.stopPropagation(); update("eclassConnect", !draft.eclassConnect); }}
              >
                {draft.eclassConnect && <Icon name="check" size={11} stroke={3} />}
              </button>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>e-Class 연동하기</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>5분마다 자동 동기화 · 비밀번호는 AES-256 암호화</div>
              </div>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function OnbTheme({ draft, update, accents }) {
  useEffectOB(() => {
    document.documentElement.setAttribute("data-accent", draft.accent);
    document.documentElement.setAttribute("data-theme", draft.theme);
  }, [draft.accent, draft.theme]);
  return (
    <div className="onb-step">
      <div className="onb-step-icon"><Icon name="sparkles" size={20} /></div>
      <h2 className="onb-step-title">테마를 골라보세요</h2>
      <p className="onb-step-sub">언제든 마이페이지에서 바꿀 수 있어요.</p>

      <div className="onb-form">
        <label className="onb-label">모드</label>
        <div className="onb-theme-grid">
          {[
            { id: "dark", label: "다크 모드", icon: "moon", desc: "눈에 편안한 어두운 배경" },
            { id: "light", label: "라이트 모드", icon: "sun", desc: "밝고 깨끗한 화이트 배경" },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              className={`onb-theme-card ${draft.theme === t.id ? "is-active" : ""}`}
              onClick={() => update("theme", t.id)}
            >
              <div className={`onb-theme-preview ${t.id}`}>
                <div className="prev-bar" />
                <div className="prev-card" />
                <div className="prev-card short" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                <Icon name={t.icon} size={13} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
                {draft.theme === t.id && <Icon name="check" size={11} stroke={3} style={{ marginLeft: "auto", color: "var(--accent)" }} />}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        <label className="onb-label" style={{ marginTop: 18 }}>악센트 컬러</label>
        <div className="onb-accent-grid">
          {accents.map(a => (
            <button
              key={a.id}
              type="button"
              className={`onb-accent ${draft.accent === a.id ? "is-active" : ""}`}
              onClick={() => update("accent", a.id)}
              title={a.label}
            >
              <span className="onb-accent-swatch" style={{ background: a.color }}>
                {draft.accent === a.id && <Icon name="check" size={13} stroke={3} style={{ color: "white" }} />}
              </span>
              <span className="onb-accent-label">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OnbFeatures({ draft, update }) {
  const FEATURES = [
    { id: "tasks",     icon: "check",    label: "작업 관리",        desc: "오늘 할 일을 우선순위와 기한과 함께", page: "tasks" },
    { id: "wiki",      icon: "book",     label: "노트 작성",        desc: "Notion 스타일 블록 에디터로 빠르게", page: "wiki" },
    { id: "notes",     icon: "note",     label: "포스트잇",         desc: "떠오른 아이디어를 색깔 메모로", page: "notes" },
    { id: "projects",  icon: "layers",   label: "프로젝트 묶기",     desc: "작업·노트·리마인더를 함께", page: "projects" },
    { id: "eclass",    icon: "globe",    label: "e-Class 동기화",   desc: "강의·과제·시험을 자동으로", page: "projects" },
    { id: "calendar",  icon: "calendar", label: "캘린더 연동",       desc: "Google Calendar 양방향 동기화", page: "profile" },
  ];
  const count = draft.interests.size;
  const FEEDBACK = {
    0: { title: "관심 기능을 선택해주세요", sub: "골라주신 기능을 홈 화면 위쪽에 더 잘 보이게 배치할게요" },
    1: { title: "좋은 선택이에요", sub: "고른 기능에 빠르게 접근할 수 있도록 준비할게요" },
    2: { title: "이미 두 개나!", sub: "두 기능을 연결해 더 풍부한 활용이 가능해요" },
    3: { title: "활용도 만점", sub: "Planary의 핵심을 빠짐없이 익히게 됩니다" },
    4: { title: "거의 모든 기능을 살펴보네요", sub: "전체 작업 흐름을 끊김 없이 사용할 수 있어요" },
    5: { title: "파워 유저 등극", sub: "Planary의 모든 자동화 혜택을 누릴 수 있어요" },
    6: { title: "완벽한 선택", sub: "모든 기능이 켜진 상태로 시작합니다 🎉" },
  };
  const fb = FEEDBACK[count] || FEEDBACK[6];

  const toggle = (id) => {
    const next = new Set(draft.interests);
    next.has(id) ? next.delete(id) : next.add(id);
    update("interests", next);
  };

  return (
    <div className="onb-step">
      <div className="onb-step-icon"><Icon name="layers" size={20} /></div>
      <h2 className="onb-step-title">어떤 기능에 관심 있으세요?</h2>
      <p className="onb-step-sub">홈 화면을 관심사에 맞게 구성해드릴게요. 여러 개 선택할 수 있어요.</p>

      <div className="onb-feature-grid">
        {FEATURES.map(f => {
          const active = draft.interests.has(f.id);
          return (
            <button
              key={f.id}
              type="button"
              className={`onb-feature-card ${active ? "is-active" : ""}`}
              onClick={() => toggle(f.id)}
            >
              <div className="onb-feature-icon">
                <Icon name={f.icon} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hi)" }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 2 }}>{f.desc}</div>
              </div>
              {active && <Icon name="check" size={13} stroke={3} style={{ color: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {/* Live feedback */}
      <div key={count} className="onb-feedback">
        <div className="onb-feedback-meter">
          {[...Array(6)].map((_, i) => (
            <span key={i} className={`onb-feedback-bar ${i < count ? "is-on" : ""}`} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div className="onb-feedback-title">
            {fb.title} {count > 0 && <span className="onb-feedback-count">{count}개</span>}
          </div>
          <div className="onb-feedback-sub">{fb.sub}</div>
        </div>
        {count > 0 && <Icon name="sparkles" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />}
      </div>
    </div>
  );
}

function OnbReady({ draft }) {
  return (
    <div className="onb-step onb-step-center">
      <div className="onb-ready-icon">
        <Icon name="check" size={36} stroke={3} />
      </div>
      <h1 className="onb-title">준비됐어요{draft.name ? `, ${draft.name}님` : ""}</h1>
      <p className="onb-subtitle">
        지금부터 Planary의 모든 기능을 사용할 수 있어요.<br />
        오늘 할 일부터 적어볼까요?
      </p>
      <div className="onb-summary">
        {draft.name && (
          <div className="onb-summary-row">
            <Icon name="user" size={13} />
            <span style={{ flex: 1, color: "var(--text-lo)" }}>이름</span>
            <span style={{ color: "var(--text-hi)", fontWeight: 600 }}>{draft.name}</span>
          </div>
        )}
        {draft.school && (
          <div className="onb-summary-row">
            <Icon name="globe" size={13} />
            <span style={{ flex: 1, color: "var(--text-lo)" }}>학교</span>
            <span style={{ color: "var(--text-hi)", fontWeight: 600 }}>{draft.school}</span>
          </div>
        )}
        {draft.eclassConnect && (
          <div className="onb-summary-row">
            <Icon name="check" size={13} style={{ color: "var(--ok)" }} stroke={3} />
            <span style={{ flex: 1, color: "var(--text-lo)" }}>e-Class</span>
            <span style={{ color: "var(--ok)", fontWeight: 600 }}>연동 예정</span>
          </div>
        )}
        <div className="onb-summary-row">
          <Icon name="sparkles" size={13} />
          <span style={{ flex: 1, color: "var(--text-lo)" }}>관심 기능</span>
          <span style={{ color: "var(--text-hi)", fontWeight: 600 }}>{draft.interests.size}개</span>
        </div>
      </div>
    </div>
  );
}

function OnbFirstTask({ draft, update }) {
  const SUGGESTIONS = [
    "디자인 리뷰 준비하기",
    "이번 주 일정 정리하기",
    "운동 30분",
    "독서 1챕터 읽기",
  ];
  const DUE_OPTS = [
    { id: "today",    label: "오늘",    icon: "zap" },
    { id: "tomorrow", label: "내일",    icon: "calendar" },
    { id: "week",     label: "이번 주", icon: "calendar" },
    { id: "none",     label: "없음",    icon: "x" },
  ];
  const PRI_OPTS = [
    { id: "high", label: "높음", color: "var(--err)" },
    { id: "med",  label: "보통", color: "var(--warn)" },
    { id: "low",  label: "낮음", color: "var(--info)" },
  ];
  return (
    <div className="onb-step">
      <div className="onb-step-icon"><Icon name="check" size={20} /></div>
      <h2 className="onb-step-title">첫 작업을 적어볼까요?</h2>
      <p className="onb-step-sub">건너뛰어도 좋아요. 적어두면 바로 작업 페이지에서 만나볼 수 있어요.</p>

      <div className="onb-form">
        <label className="onb-label">할 일</label>
        <input
          autoFocus
          value={draft.firstTask}
          onChange={(e) => update("firstTask", e.target.value)}
          placeholder="예: 디자인 리뷰 준비하기"
          className="onb-input"
        />

        {/* Suggestions */}
        {!draft.firstTask && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                type="button"
                className="chip"
                style={{ borderStyle: "dashed", cursor: "pointer" }}
                onClick={() => update("firstTask", s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Due + priority */}
        <label className="onb-label" style={{ marginTop: 18 }}>언제 할까요?</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DUE_OPTS.map(o => (
            <button
              key={o.id}
              type="button"
              className={`chip ${draft.firstTaskDue === o.id ? "chip-accent" : ""}`}
              style={{ cursor: "pointer", height: 30, padding: "0 12px" }}
              onClick={() => update("firstTaskDue", o.id)}
            >
              <Icon name={o.icon} size={11} />{o.label}
            </button>
          ))}
        </div>

        <label className="onb-label" style={{ marginTop: 14 }}>중요도</label>
        <div style={{ display: "flex", gap: 6 }}>
          {PRI_OPTS.map(p => (
            <button
              key={p.id}
              type="button"
              className={`chip ${draft.firstTaskPriority === p.id ? "chip-accent" : ""}`}
              style={{ cursor: "pointer", height: 30, padding: "0 12px" }}
              onClick={() => update("firstTaskPriority", p.id)}
            >
              <span style={{ width: 7, height: 7, borderRadius: 2, background: p.color }} />
              {p.label}
            </button>
          ))}
        </div>

        {draft.firstTask && (
          <div className="onb-preview" style={{ marginTop: 18 }}>
            <div style={{ width: 4, height: 36, borderRadius: 2, background: PRI_OPTS.find(p => p.id === draft.firstTaskPriority)?.color }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-hi)" }}>{draft.firstTask}</div>
              <div style={{ fontSize: 11, color: "var(--text-lo)", marginTop: 3, display: "flex", gap: 8 }}>
                <span><Icon name="clock" size={10} style={{ verticalAlign: -1, marginRight: 3 }} />{DUE_OPTS.find(o => o.id === draft.firstTaskDue)?.label || "없음"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.Planary = Object.assign(window.Planary || {}, { OnboardingFlow });
