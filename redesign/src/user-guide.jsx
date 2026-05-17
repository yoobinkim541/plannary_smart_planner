/* Planary — Interactive User Guide.
   A floating coach panel that sits beside the live app and validates each substep.
   Auto-detects when the user actually performs the action (via existing events / DOM probes),
   so the user never wonders "did I do it right?". 초등학생도 따라 할 수 있는 단계별 가이드.
*/

const { useState: useStateUG, useEffect: useEffectUG, useRef: useRefUG } = React;

/*
  Each substep declares:
    - title      one-line instruction
    - body       short description
    - hint       what UI element to look for (with inline kbd/icon hints)
    - check      either:
                   • { event: 'planary:create-task' }   – fires when listener catches it
                   • { domQuery: '.task-list .task' }    – passes when DOM matches
                   • { page: 'tasks' }                  – passes when user navigates
                   • { manual: true }                   – user clicks "✓ 했어요"
*/
const COACH_STEPS = [
  {
    id: "taskCreate",
    page: "tasks",
    icon: "check",
    title: "1단계 · 첫 번째 작업 만들기",
    intro: "오늘 해야 할 일 한 가지를 적어볼게요.",
    substeps: [
      { title: "작업 페이지로 이동", body: "왼쪽 사이드바에서 ✓ 모양 \"작업\" 아이콘을 누르세요.", check: { page: "tasks" } },
      { title: "입력창에 작업을 적어보세요", body: "페이지 위쪽의 입력창에 \"오늘 회의 자료 정리\" 같은 한 줄을 적어보세요.", hint: "📥 입력창은 페이지 상단에 있어요", check: { manual: true } },
      { title: "\"작업 추가\" 버튼 누르기", body: "보라색 \"작업 추가\" 버튼을 누르거나 Enter 키를 누르면 작업이 만들어져요.", hint: "또는 Enter 키도 동작해요", check: { event: "planary:create-task" } },
    ],
  },
  {
    id: "taskDetails",
    page: "tasks",
    icon: "edit",
    title: "2단계 · 작업에 정보 더하기",
    intro: "메모·기한·중요도를 함께 넣으면 더 잘 추적할 수 있어요.",
    substeps: [
      { title: "✎ 편집 버튼 누르기", body: "방금 만든 작업 카드 위에 마우스를 올리면 우측에 ✎ 연필 아이콘이 보여요. 클릭하세요.", hint: "터치 기기에선 길게 누르세요", check: { manual: true } },
      { title: "기한을 \"오늘\"로 설정", body: "다이얼로그 안의 \"날짜\" 행을 눌러 \"오늘\"을 고르세요.", check: { manual: true } },
      { title: "우선순위 \"높음\" 설정", body: "\"우선순위\" 행에서 빨간색 \"높음\"을 선택하세요. 왼쪽 컬러 바가 빨갛게 변해요.", check: { manual: true } },
      { title: "\"저장\" 버튼 누르기", body: "다이얼로그 우하단의 보라색 \"저장\" 버튼으로 변경 사항을 적용하세요.", check: { event: "planary:edit-task-saved", fallbackManual: true } },
    ],
  },
  {
    id: "taskViews",
    page: "tasks",
    icon: "filter",
    title: "3단계 · 중요한 작업만 보기",
    intro: "필터를 사용하면 \"오늘 꼭 해야 할 일\"만 추려서 볼 수 있어요.",
    substeps: [
      { title: "\"중요\" 필터 누르기", body: "작업 페이지 상단의 칩 중에서 ⚑ \"중요\"를 클릭하세요. 우선순위가 높은 작업만 남아요.", check: { manual: true } },
      { title: "다시 \"전체\" 필터로", body: "익숙해졌으면 \"전체\" 칩을 눌러 모든 작업을 다시 보세요.", check: { manual: true } },
    ],
  },
  {
    id: "projects",
    page: "projects",
    icon: "layers",
    title: "4단계 · 프로젝트 만들기",
    intro: "관련된 작업·메모·노트를 한 곳에 묶어두면 흐름을 잃지 않아요.",
    substeps: [
      { title: "프로젝트 페이지로 이동", body: "사이드바에서 ◇ \"프로젝트\" 아이콘을 클릭하세요.", check: { page: "projects" } },
      { title: "우상단 \"+ 새 프로젝트\" 버튼", body: "페이지 우측 위의 보라색 버튼을 누르면 만들기 창이 열려요.", check: { manual: true } },
      { title: "이름·아이콘·컬러 선택", body: "프로젝트 이름은 짧고 명확하게 (예: \"공부\", \"업무\"). 아이콘과 컬러도 골라보세요.", check: { manual: true } },
      { title: "\"프로젝트 만들기\" 버튼", body: "다이얼로그 하단의 보라색 버튼을 눌러 완료하세요.", check: { manual: true } },
    ],
  },
  {
    id: "notesCreate",
    page: "notes",
    icon: "note",
    title: "5단계 · 포스트잇 만들기",
    intro: "작업으로 만들기엔 가벼운 짧은 생각을 색깔 메모로 빠르게 붙여둬요.",
    substeps: [
      { title: "포스트잇 페이지로 이동", body: "사이드바에서 ✎ \"포스트잇\" 아이콘을 클릭하세요.", check: { page: "notes" } },
      { title: "색깔 선택", body: "입력창 아래 7개 색상 중 하나를 골라보세요. 같은 주제는 같은 색으로 묶으면 좋아요.", check: { manual: true } },
      { title: "메모 작성", body: "텍스트 영역에 짧은 생각을 적어보세요. 예: \"다음 회의에서 물어볼 질문\"", check: { manual: true } },
      { title: "\"+ 메모 추가\" 버튼", body: "버튼을 클릭하거나 ⌘ + Enter 키로 메모를 보드에 추가하세요.", check: { event: "planary:create-note", fallbackManual: true } },
    ],
  },
  {
    id: "wiki",
    page: "wiki",
    icon: "book",
    title: "6단계 · 노트(위키) 만들기",
    intro: "긴 글이나 자료는 위키 페이지로 정리해 오래 보관할 수 있어요.",
    substeps: [
      { title: "노트 페이지로 이동", body: "사이드바에서 📖 \"노트\" 아이콘을 클릭하세요.", check: { page: "wiki" } },
      { title: "왼쪽 트리에서 페이지 선택", body: "기존 페이지 중 하나를 클릭해 본문을 살펴보세요.", check: { manual: true } },
      { title: "\"/\" 키로 블록 메뉴 열기", body: "본문 안에서 슬래시 키를 누르면 15가지 블록 타입 메뉴가 나타나요.", hint: "헤딩·코드·표·이미지 등 다양한 블록", check: { manual: true } },
      { title: "원하는 블록 선택", body: "메뉴에서 원하는 블록 타입을 골라 클릭하세요. 본문이 그 타입으로 바뀝니다.", check: { manual: true } },
    ],
  },
];

function CoachGuide({ onClose, currentPage, setPage }) {
  const [stepIdx, setStepIdx] = useStateUG(0);
  const [subIdx, setSubIdx] = useStateUG(0);
  const [minimized, setMinimized] = useStateUG(false);
  const [completed, setCompleted] = useStateUG(() => {
    try { return new Set(JSON.parse(localStorage.getItem("planary.coach.done") || "[]")); }
    catch (_) { return new Set(); }
  });
  const [justCompleted, setJustCompleted] = useStateUG(null); // subId that just completed (for animation)
  const step = COACH_STEPS[stepIdx];
  const sub = step.substeps[subIdx];
  const subKey = `${step.id}.${subIdx}`;

  // Auto-navigate to the step's page when starting a step
  useEffectUG(() => {
    if (subIdx === 0 && step.page && currentPage !== step.page && setPage) {
      setPage(step.page);
    }
  }, [stepIdx]);

  // Listen for event-based checks
  useEffectUG(() => {
    if (!sub) return;
    if (sub.check.event) {
      const handler = () => {
        markSubDone();
      };
      window.addEventListener(sub.check.event, handler);
      return () => window.removeEventListener(sub.check.event, handler);
    }
  }, [stepIdx, subIdx]);

  // Page-based check
  useEffectUG(() => {
    if (sub?.check?.page && currentPage === sub.check.page && !completed.has(subKey)) {
      markSubDone();
    }
  }, [currentPage, stepIdx, subIdx]);

  const markSubDone = () => {
    const next = new Set(completed);
    next.add(subKey);
    setCompleted(next);
    try { localStorage.setItem("planary.coach.done", JSON.stringify([...next])); } catch (_) {}
    setJustCompleted(subKey);
    setTimeout(() => {
      setJustCompleted(null);
      // Auto-advance to next substep
      if (subIdx < step.substeps.length - 1) {
        setSubIdx(subIdx + 1);
      } else if (stepIdx < COACH_STEPS.length - 1) {
        // Move to next step
        setStepIdx(stepIdx + 1);
        setSubIdx(0);
      } else {
        // All done
        window.Planary.toast?.({ type: "ok", title: "가이드를 모두 완료했어요 🎉", sub: "Planary의 핵심 흐름을 익혔어요" });
        try { localStorage.setItem("planary.coach.completed", "1"); } catch (_) {}
        setTimeout(onClose, 1200);
      }
    }, 900);
  };

  const goSubstep = (i) => setSubIdx(i);
  const goStep = (i) => { setStepIdx(i); setSubIdx(0); };

  const totalSubs = COACH_STEPS.reduce((s, st) => s + st.substeps.length, 0);
  const doneCount = completed.size;
  const pct = Math.round((doneCount / totalSubs) * 100);

  if (minimized) {
    return (
      <button className="coach-mini" onClick={() => setMinimized(false)} aria-label="가이드 펼치기">
        <div className="coach-mini-icon"><Icon name="sparkles" size={14} /></div>
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700 }}>가이드 진행 중</div>
          <div style={{ fontSize: 10, color: "var(--text-lo)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {step.title.split("·")[1]?.trim() || step.title}
          </div>
        </div>
        <div className="coach-mini-progress">{Math.round((doneCount / totalSubs) * 100)}%</div>
      </button>
    );
  }

  return (
    <div className="coach-panel">
      {/* Header */}
      <div className="coach-head">
        <div className="coach-head-icon">
          <Icon name={step.icon} size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="coach-head-eyebrow">가이드 · {stepIdx + 1} / {COACH_STEPS.length}</div>
          <div className="coach-head-title">{step.title}</div>
        </div>
        <button className="coach-icon-btn" onClick={() => setMinimized(true)} title="작게 보기">
          <Icon name="chevronDown" size={14} />
        </button>
        <button className="coach-icon-btn" onClick={onClose} title="가이드 닫기">
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Progress */}
      <div className="coach-progress-row">
        <div className="coach-progress-bar">
          <div className="coach-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="coach-progress-text">{doneCount} / {totalSubs}</span>
      </div>

      {/* Intro */}
      <div className="coach-intro">{step.intro}</div>

      {/* Substep list */}
      <ol className="coach-substeps">
        {step.substeps.map((s, i) => {
          const k = `${step.id}.${i}`;
          const isDone = completed.has(k);
          const isCurrent = i === subIdx && !isDone;
          const isPending = !isDone && !isCurrent;
          const justPopped = justCompleted === k;
          return (
            <li
              key={i}
              className={`coach-sub ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""} ${isPending ? "is-pending" : ""} ${justPopped ? "is-pop" : ""}`}
              onClick={() => !isDone && goSubstep(i)}
            >
              <div className="coach-sub-num">
                {isDone ? <Icon name="check" size={11} stroke={3} /> : <span>{i + 1}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="coach-sub-title">{s.title}</div>
                {isCurrent && (
                  <>
                    <div className="coach-sub-body">{s.body}</div>
                    {s.hint && <div className="coach-sub-hint"><Icon name="sparkles" size={9} />{s.hint}</div>}
                    {s.check.manual && (
                      <button className="coach-sub-done-btn" onClick={markSubDone}>
                        <Icon name="check" size={11} stroke={3} />
                        했어요
                      </button>
                    )}
                    {!s.check.manual && (
                      <div className="coach-sub-detecting">
                        <span className="coach-pulse" />
                        <span>실제로 해보면 자동으로 다음으로 넘어가요</span>
                        <button className="coach-sub-skip" onClick={markSubDone}>건너뛰기</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Footer nav */}
      <div className="coach-foot">
        <button
          className="coach-nav-btn"
          onClick={() => goStep(Math.max(0, stepIdx - 1))}
          disabled={stepIdx === 0}
        >
          <Icon name="chevronLeft" size={11} />이전 단계
        </button>
        <div style={{ flex: 1, fontSize: 10, color: "var(--text-faint)", textAlign: "center" }}>
          {COACH_STEPS.map((_, i) => (
            <span
              key={i}
              className={`coach-step-dot ${i === stepIdx ? "is-current" : ""} ${i < stepIdx ? "is-done" : ""}`}
              onClick={() => goStep(i)}
            />
          ))}
        </div>
        <button
          className="coach-nav-btn"
          onClick={() => goStep(Math.min(COACH_STEPS.length - 1, stepIdx + 1))}
          disabled={stepIdx === COACH_STEPS.length - 1}
        >
          다음 단계<Icon name="chevronRight" size={11} />
        </button>
      </div>
    </div>
  );
}

// Wrapper that connects to the app's current page and setPage
function UserGuide({ onClose, setPage, currentPage }) {
  return <CoachGuide onClose={onClose} setPage={setPage} currentPage={currentPage} />;
}

window.Planary = Object.assign(window.Planary || {}, { UserGuide, CoachGuide });
