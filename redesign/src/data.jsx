/* Planary — seed data. Static, but mutable in-app via setState. */

const today = new Date();
const day = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const PROJECTS = [
  { id: "pe", name: "e-Class", color: "#3b82f6", icon: "🎓", progress: 0, members: ["DK"], deadline: null, isEclass: true, courses: 5, lastSync: "12분 전", school: "SeoulTech" },
  { id: "p1", name: "Planary v3 출시", color: "#7f0df2", icon: "🚀", progress: 62, members: ["DK", "SY", "JM", "HW"], deadline: "12월 18일" },
  { id: "p2", name: "Q4 콘텐츠", color: "#10b981", icon: "✍️", progress: 38, members: ["DK", "SY"], deadline: "12월 31일" },
  { id: "p3", name: "Onboarding 리뉴얼", color: "#f59e0b", icon: "🎯", progress: 84, members: ["DK", "MJ", "HW"], deadline: "12월 10일" },
  { id: "p4", name: "리서치 노트", color: "#3b82f6", icon: "🔬", progress: 18, members: ["SY"], deadline: null },
];

// e-Class 강의 (서울과기대 e-Class에서 동기화)
const ECLASS_COURSES = [
  { id: "c1", code: "ITM4011", name: "인터랙티브 미디어 디자인", prof: "박지영 교수", credits: 3, color: "#7f0df2" },
  { id: "c2", code: "DDS3022", name: "데이터 시각화", prof: "김민수 교수", credits: 3, color: "#10b981" },
  { id: "c3", code: "GEN1003", name: "비판적 사고와 글쓰기", prof: "이서연 교수", credits: 2, color: "#f59e0b" },
  { id: "c4", code: "ITM4023", name: "사용자 경험 연구방법론", prof: "정현우 교수", credits: 3, color: "#e11d48" },
  { id: "c5", code: "HSS2017", name: "디자인 사상사", prof: "최영은 교수", credits: 2, color: "#3b82f6" },
];

const TASKS = [
  { id: "t1", title: "디자인 시스템 v3 토큰 정리", memo: "다크/라이트 + 악센트 6종 매핑", project: "p1", priority: "high", due: day(0), time: "오늘", reminder: true, done: false, tags: ["디자인"] },
  { id: "t2", title: "위키 에디터 단축키 가이드 작성", memo: "/, ⌘+K, ⌘+/ 정리", project: "p1", priority: "med", due: day(0), time: "오늘", reminder: true, done: false, tags: ["문서"] },
  { id: "t3", title: "Q4 콘텐츠 캘린더 초안", memo: "주간 2건 × 12주 + 시즈널 4건", project: "p2", priority: "med", due: day(1), time: "내일", reminder: false, done: false, tags: ["기획"] },
  { id: "t4", title: "Onboarding 인터뷰 5명 정리", memo: "스크립트, 클립, 인사이트 보드", project: "p3", priority: "high", due: day(1), time: "내일", reminder: true, done: false, tags: ["리서치"] },
  { id: "t5", title: "DB 마이그레이션 스크립트 리뷰", memo: "PR #482", project: "p1", priority: "high", due: day(2), time: "수요일", reminder: false, done: false, tags: ["엔지니어링"] },
  { id: "t6", title: "랜딩 페이지 카피 2차 수정", memo: "히어로 + 기능 섹션", project: "p1", priority: "med", due: day(2), time: "수요일", reminder: false, done: true, tags: ["디자인", "카피"] },
  { id: "t7", title: "월간 리포트 작성", memo: "지표 + 인사이트 + 다음달 OKR", project: null, priority: "low", due: day(3), time: "목요일", reminder: false, done: false, tags: ["보고서"] },
  { id: "t8", title: "팀 회식 일정 잡기", memo: "넷, 8명", project: null, priority: "low", due: day(5), time: "토요일", reminder: false, done: false, tags: ["팀"] },
  { id: "t9", title: "구독 결제 정보 갱신", memo: null, project: null, priority: "med", due: day(-1), time: "어제", reminder: false, done: true, tags: ["개인"] },
  { id: "t10", title: "운동 30분", memo: "스트레칭 + 코어", project: null, priority: "low", due: day(0), time: "오늘 저녁", reminder: true, done: false, tags: ["루틴"] },
  { id: "t11", title: "온보딩 화면 흐름 정리", memo: "5단계 → 3단계로", project: "p3", priority: "med", due: day(3), time: "목요일", reminder: false, done: false, tags: ["디자인", "UX"] },
  { id: "t12", title: "사용자 인터뷰 가이드 검토", memo: null, project: "p4", priority: "low", due: day(4), time: "금요일", reminder: false, done: false, tags: ["리서치"] },

  // === e-Class 동기화된 작업 (source: "eclass" / "eclass-exam") ===
  { id: "e1", title: "3주차 과제 — 인터랙션 프로토타입", memo: "Figma + 영상 30초 첨부", project: "pe", course: "c1", priority: "high", due: day(0), time: "오늘 23:59", reminder: true, done: false, tags: ["과제"], source: "eclass" },
  { id: "e2", title: "팀 프로젝트 중간 발표", memo: "10분, 슬라이드 + 데모", project: "pe", course: "c1", priority: "high", due: day(4), time: "금요일", reminder: true, done: false, tags: ["발표"], source: "eclass-exam" },
  { id: "e3", title: "데이터 시각화 #2 — d3.js 차트", memo: "랜덤 데이터셋 활용", project: "pe", course: "c2", priority: "med", due: day(2), time: "수요일 23:59", reminder: true, done: false, tags: ["과제"], source: "eclass" },
  { id: "e4", title: "중간고사", memo: "1~5강 범위 · 객관식 + 단답형", project: "pe", course: "c2", priority: "high", due: day(7), time: "다음주 월요일", reminder: true, done: false, tags: ["시험"], source: "eclass-exam" },
  { id: "e5", title: "에세이 #2 — 비판적 분석 글쓰기", memo: "1500자, 한글", project: "pe", course: "c3", priority: "med", due: day(1), time: "내일 18:00", reminder: true, done: false, tags: ["과제"], source: "eclass" },
  { id: "e6", title: "UX 리서치 설계 보고서", memo: "방법론 선택 + 표본 계획", project: "pe", course: "c4", priority: "med", due: day(5), time: "토요일", reminder: false, done: false, tags: ["과제"], source: "eclass" },
  { id: "e7", title: "디자인 사상사 — 독서 노트 #4", memo: "Bauhaus 챕터", project: "pe", course: "c5", priority: "low", due: day(6), time: "일요일", reminder: false, done: false, tags: ["독서노트"], source: "eclass" },
  { id: "e8", title: "1주차 출석 확인 영상 시청", memo: null, project: "pe", course: "c1", priority: "low", due: day(-2), time: "이틀 전", reminder: false, done: true, tags: ["출석"], source: "eclass" },
];

const NOTES = [
  { id: "n1", x: 36, y: 28, color: "yellow", text: "위키 슬래시 메뉴는 /로 시작 — 키보드 첫 손맛이 중요", date: "오늘", rot: -2 },
  { id: "n2", x: 280, y: 60, color: "blue", text: "랜딩 히어로 카피: '생각이 모이는 자리.'\n(짧고 단단하게)", date: "어제", rot: 1.5 },
  { id: "n3", x: 540, y: 32, color: "pink", text: "프로필 페이지 — 통합 통계 추가\n주간 완료 수, 메모 수, 위키 수정 수", date: "2일 전", rot: -1 },
  { id: "n4", x: 100, y: 240, color: "green", text: "사용자 인터뷰\n• 화면 전환 시 컨텍스트 잃음\n• 키보드 우선 동작 원함\n• 모바일에서 메모 보드 어려움", date: "3일 전", rot: 0.5 },
  { id: "n5", x: 420, y: 252, color: "purple", text: "디자인 영감\n• Linear 단축키\n• Things 3 자연어 입력\n• Notion 슬래시 메뉴", date: "오늘", rot: -2.5 },
  { id: "n6", x: 700, y: 130, color: "orange", text: "이번주 OKR\n→ v3 베타 5명 모집\n→ 위키 → 작업 연결 PoC", date: "월요일", rot: 2 },
  { id: "n7", x: 230, y: 420, color: "mint", text: "포커스 모드\n— 알림 차단\n— 단일 작업 풀스크린\n— 25/5 포모도로 옵션", date: "어제", rot: -0.8 },
  { id: "n8", x: 580, y: 460, color: "yellow", text: "키보드 단축키\n⌘K — 명령어\n⌘N — 빠른 메모\nG → T — 작업", date: "오늘", rot: 1.2 },
];

const BOOKMARKS = [
  { id: "b1", title: "Refactoring UI", url: "refactoringui.com", color: "#7f0df2", letter: "R", tags: ["디자인", "참고"] },
  { id: "b2", title: "Linear's design principles", url: "linear.app/method", color: "#5b5bd6", letter: "L", tags: ["프로덕트"] },
  { id: "b3", title: "Inter Font", url: "rsms.me/inter", color: "#111111", letter: "I", tags: ["타이포"] },
  { id: "b4", title: "Radix UI Primitives", url: "radix-ui.com/primitives", color: "#0066ff", letter: "R", tags: ["개발", "컴포넌트"] },
  { id: "b5", title: "Pretendard", url: "cactus.tistory.com", color: "#10b981", letter: "P", tags: ["타이포", "한글"] },
  { id: "b6", title: "Notion API Reference", url: "developers.notion.com", color: "#000000", letter: "N", tags: ["개발"] },
  { id: "b7", title: "Firebase Console", url: "console.firebase.google.com", color: "#f59e0b", letter: "F", tags: ["인프라"] },
  { id: "b8", title: "Vercel Dashboard", url: "vercel.com/dashboard", color: "#111111", letter: "V", tags: ["인프라"] },
  { id: "b9", title: "OKLCH Color Picker", url: "oklch.com", color: "#e11d48", letter: "O", tags: ["디자인", "툴"] },
];

const WIKI_TREE = [
  { id: "w1", title: "Planary 핸드북", icon: "📘", depth: 0 },
  { id: "w2", title: "디자인 시스템", icon: "🎨", depth: 1, parent: "w1" },
  { id: "w3", title: "컬러 토큰", icon: "🟣", depth: 2, parent: "w2" },
  { id: "w4", title: "타이포 스케일", icon: "🔤", depth: 2, parent: "w2" },
  { id: "w5", title: "엔지니어링", icon: "⚙️", depth: 1, parent: "w1" },
  { id: "w6", title: "Firestore 스키마", icon: "🗄️", depth: 2, parent: "w5" },
  { id: "w7", title: "리서치 노트", icon: "🔬", depth: 0 },
  { id: "w8", title: "온보딩 인터뷰 정리", icon: "🎤", depth: 1, parent: "w7" },
  { id: "w9", title: "주간 회고", icon: "📓", depth: 0 },
];

const hasFirebaseRuntime = typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0;
const useLiveDataShell = true;

window.Planary = {
  LIVE_DATA_SHELL: useLiveDataShell,
  PROJECTS: useLiveDataShell ? [] : PROJECTS,
  TASKS: useLiveDataShell ? [] : TASKS,
  NOTES: useLiveDataShell ? [] : NOTES,
  BOOKMARKS: useLiveDataShell ? [] : BOOKMARKS,
  WIKI_TREE: useLiveDataShell ? [] : WIKI_TREE,
  ECLASS_COURSES: useLiveDataShell ? [] : ECLASS_COURSES,
  USER: useLiveDataShell
    ? { name: "사용자", email: "", initials: "U", school: "", studentId: "" }
    : { name: "도하 김", email: "doha@planary.app", initials: "DK", school: "서울과학기술대학교", studentId: "21900293" },
};

// Compute e-Class progress from synced tasks
(function() {
  const ecTasks = TASKS.filter(t => t.project === "pe");
  const done = ecTasks.filter(t => t.done).length;
  const pe = PROJECTS.find(p => p.id === "pe");
  if (pe) pe.progress = ecTasks.length ? Math.round(done / ecTasks.length * 100) : 0;
})();
