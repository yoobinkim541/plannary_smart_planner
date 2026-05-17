/* Planary i18n — vanilla, no dependencies.
   Usage:
     <link rel="stylesheet" href="...">
     <script src="src/i18n.js"></script>
     <script>PlanaryI18n.init();</script>

   Add data-i18n="key" to any element. Text is replaced.
   Add data-i18n-attr="placeholder:key,title:key" to set attributes.
   Switch language: PlanaryI18n.set('ko' | 'en' | 'ja')
*/
(function () {
  const STRINGS = {
    ko: {
      // Nav + brand
      "nav.howItWorks": "사용방법",
      "nav.features": "기능",
      "nav.security": "보안",
      "nav.privacy": "개인정보",
      "nav.signIn": "로그인",
      "nav.signUp": "무료로 시작하기",
      "nav.app": "앱 열기",

      // Hero
      "hero.kicker": "한국 대학생을 위한 작업 공간",
      "hero.title.1": "할 일과 강의 일정이",
      "hero.title.2": "하나의 흐름으로",
      "hero.subtitle": "Planary는 작업·메모·위키·북마크를 한 작업 공간에 두고, e-Class 강의와 과제를 자동으로 동기화합니다.",
      "hero.cta.primary": "무료로 시작하기",
      "hero.cta.secondary": "기능 둘러보기",
      "hero.tag.free": "무료 시작",
      "hero.tag.eclass": "e-Class 자동 동기화",
      "hero.tag.pwa": "PWA · 어디서나 설치",

      // Stats
      "stats.users": "활성 사용자",
      "stats.tasks": "관리되는 작업",
      "stats.uptime": "가용성",

      // Features
      "features.kicker": "기능",
      "features.title": "오늘 할 일부터 졸업까지, 같은 작업 공간에서",
      "features.subtitle": "복잡한 설정 없이 시작할 수 있고, 필요한 만큼 자라납니다.",
      "features.tasks.title": "스마트한 작업",
      "features.tasks.body": "우선순위·기한·리마인더를 한 줄에 자연어로 입력하세요. 마감 임박은 자동으로 부각됩니다.",
      "features.wiki.title": "가볍고 빠른 위키",
      "features.wiki.body": "Notion 슬래시 메뉴 그대로. 코드·표·이미지·콜아웃 블록을 자유롭게 조합하세요.",
      "features.notes.title": "스티키 메모 보드",
      "features.notes.body": "떠오른 생각을 색깔 메모로 적어 책상처럼 자유롭게 배치합니다. 위치는 자동 저장.",
      "features.eclass.title": "e-Class 연동",
      "features.eclass.body": "서울과기대 e-Class 강의·과제·시험이 자동으로 작업으로 들어옵니다. 5분마다 동기화.",
      "features.projects.title": "프로젝트 워크스페이스",
      "features.projects.body": "작업·위키·리마인더를 프로젝트 단위로 묶어 컨텍스트를 잃지 않고 일합니다.",
      "features.calendar.title": "Google Calendar",
      "features.calendar.body": "Google Calendar와 양방향 연동. 작업에 알림을 걸면 캘린더에도 일정이 생깁니다.",

      // How it works
      "how.kicker": "사용 방법",
      "how.title": "3단계로 시작합니다",
      "how.step1.title": "계정 만들기",
      "how.step1.body": "이메일이나 Google 계정으로 5초 안에 시작할 수 있습니다.",
      "how.step2.title": "e-Class 연결",
      "how.step2.body": "학교 e-Class 계정을 입력하면 강의와 과제가 자동으로 들어옵니다.",
      "how.step3.title": "흐름 잡기",
      "how.step3.body": "오늘 할 일을 적고, 메모를 남기고, 위키에 정리하면서 작업 공간을 키우세요.",

      // Security
      "security.kicker": "보안",
      "security.title": "걱정 없이 맡기세요",
      "security.subtitle": "Firebase Auth + Firestore 보안 규칙으로 본인 데이터만 본인이 봅니다.",
      "security.point1.title": "암호화된 자격증명",
      "security.point1.body": "e-Class 비밀번호는 AES-256으로 암호화되어 저장됩니다.",
      "security.point2.title": "Firebase Auth",
      "security.point2.body": "구글이 운영하는 인증 인프라 위에서 동작합니다.",
      "security.point3.title": "개인 공간 격리",
      "security.point3.body": "Firestore 보안 규칙이 다른 사용자의 데이터 접근을 차단합니다.",

      // CTA
      "cta.title": "오늘 할 일을 적어볼까요",
      "cta.subtitle": "Planary는 무료로 시작할 수 있습니다.",
      "cta.button": "지금 시작하기",
      "cta.note": "신용카드 필요 없음 · 1분이면 가입",

      // Footer
      "footer.product": "프로덕트",
      "footer.features": "기능",
      "footer.changelog": "업데이트 내역",
      "footer.roadmap": "로드맵",
      "footer.company": "회사",
      "footer.about": "소개",
      "footer.contact": "문의",
      "footer.legal": "법적 고지",
      "footer.privacy": "개인정보처리방침",
      "footer.terms": "이용약관",
      "footer.copyright": "© 2025 Planary. Made with care.",

      // Login
      "auth.signIn.title": "다시 오신 것을 환영해요",
      "auth.signIn.subtitle": "작업 공간으로 이어서 들어가세요.",
      "auth.signUp.title": "Planary와 함께 시작해요",
      "auth.signUp.subtitle": "1분이면 충분합니다. 신용카드 필요 없어요.",
      "auth.email": "이메일",
      "auth.email.placeholder": "이메일을 입력하세요",
      "auth.password": "비밀번호",
      "auth.password.placeholder": "비밀번호를 입력하세요",
      "auth.password.new.placeholder": "8자 이상으로 만들어주세요",
      "auth.name": "이름",
      "auth.name.placeholder": "표시할 이름",
      "auth.signIn.button": "로그인",
      "auth.signUp.button": "계정 만들기",
      "auth.google": "Google로 계속하기",
      "auth.or": "또는",
      "auth.noAccount": "계정이 없으신가요?",
      "auth.haveAccount": "이미 계정이 있으신가요?",
      "auth.forgot": "비밀번호를 잊으셨나요?",
      "auth.terms": "가입하면 이용약관과 개인정보처리방침에 동의하는 것으로 간주됩니다.",
      "auth.embedded.warning": "이 브라우저는 Google 로그인을 지원하지 않을 수 있어요. Chrome이나 Safari에서 열어주세요:",
      "auth.embedded.open": "기본 브라우저로 열기",
      "auth.embedded.copy": "링크 복사",

      // Common
      "common.back": "돌아가기",
      "common.language": "언어",
    },

    en: {
      "nav.howItWorks": "How it works",
      "nav.features": "Features",
      "nav.security": "Security",
      "nav.privacy": "Privacy",
      "nav.signIn": "Sign in",
      "nav.signUp": "Get started — free",
      "nav.app": "Open app",

      "hero.kicker": "A workspace for Korean university students",
      "hero.title.1": "Your tasks and lectures",
      "hero.title.2": "in one flow",
      "hero.subtitle": "Planary keeps tasks, notes, wiki, and bookmarks in one workspace, and syncs e-Class lectures and assignments automatically.",
      "hero.cta.primary": "Get started — free",
      "hero.cta.secondary": "See features",
      "hero.tag.free": "Free to start",
      "hero.tag.eclass": "e-Class auto sync",
      "hero.tag.pwa": "PWA · installable everywhere",

      "stats.users": "Active students",
      "stats.tasks": "Tasks managed",
      "stats.uptime": "Uptime",

      "features.kicker": "Features",
      "features.title": "From today's task to graduation, in one workspace",
      "features.subtitle": "Start without setup. Grow as you need.",
      "features.tasks.title": "Smart tasks",
      "features.tasks.body": "Type priorities, dates, and reminders inline. Approaching deadlines are surfaced automatically.",
      "features.wiki.title": "Light, fast wiki",
      "features.wiki.body": "A Notion-style slash menu. Compose code, tables, images, and callouts freely.",
      "features.notes.title": "Sticky note board",
      "features.notes.body": "Capture ideas in colored notes and arrange them like a real desk. Position is saved.",
      "features.eclass.title": "e-Class integration",
      "features.eclass.body": "SeoulTech e-Class courses, assignments, and exams flow in automatically. Syncs every 5 minutes.",
      "features.projects.title": "Project workspaces",
      "features.projects.body": "Group tasks, wiki, and reminders by project so you never lose context.",
      "features.calendar.title": "Google Calendar",
      "features.calendar.body": "Two-way sync. Add a reminder to a task and it shows up on your calendar too.",

      "how.kicker": "How it works",
      "how.title": "Three steps to get started",
      "how.step1.title": "Create an account",
      "how.step1.body": "Sign up in five seconds with email or Google.",
      "how.step2.title": "Connect e-Class",
      "how.step2.body": "Add your school e-Class credentials and your courses flow in.",
      "how.step3.title": "Build your flow",
      "how.step3.body": "Write today's tasks, capture ideas, and grow your wiki as you go.",

      "security.kicker": "Security",
      "security.title": "Trust us with your work",
      "security.subtitle": "Firebase Auth + Firestore security rules keep your data yours alone.",
      "security.point1.title": "Encrypted credentials",
      "security.point1.body": "e-Class passwords are encrypted with AES-256 at rest.",
      "security.point2.title": "Firebase Auth",
      "security.point2.body": "Runs on Google's authentication infrastructure.",
      "security.point3.title": "Isolated user data",
      "security.point3.body": "Firestore security rules block any cross-user access.",

      "cta.title": "Ready to start your day?",
      "cta.subtitle": "Planary is free to start.",
      "cta.button": "Get started",
      "cta.note": "No credit card · One minute to sign up",

      "footer.product": "Product",
      "footer.features": "Features",
      "footer.changelog": "Changelog",
      "footer.roadmap": "Roadmap",
      "footer.company": "Company",
      "footer.about": "About",
      "footer.contact": "Contact",
      "footer.legal": "Legal",
      "footer.privacy": "Privacy",
      "footer.terms": "Terms",
      "footer.copyright": "© 2025 Planary. Made with care.",

      "auth.signIn.title": "Welcome back",
      "auth.signIn.subtitle": "Pick up where you left off in your workspace.",
      "auth.signUp.title": "Start with Planary",
      "auth.signUp.subtitle": "One minute is enough. No credit card needed.",
      "auth.email": "Email",
      "auth.email.placeholder": "Enter your email",
      "auth.password": "Password",
      "auth.password.placeholder": "Enter your password",
      "auth.password.new.placeholder": "Use at least 8 characters",
      "auth.name": "Name",
      "auth.name.placeholder": "How should we call you",
      "auth.signIn.button": "Sign in",
      "auth.signUp.button": "Create account",
      "auth.google": "Continue with Google",
      "auth.or": "or",
      "auth.noAccount": "Don't have an account?",
      "auth.haveAccount": "Already have an account?",
      "auth.forgot": "Forgot password?",
      "auth.terms": "By signing up you agree to our Terms and Privacy Policy.",
      "auth.embedded.warning": "Google sign-in may not work in this browser. Open this page in Chrome or Safari:",
      "auth.embedded.open": "Open in default browser",
      "auth.embedded.copy": "Copy link",

      "common.back": "Back",
      "common.language": "Language",
    },

    ja: {
      "nav.howItWorks": "使い方",
      "nav.features": "機能",
      "nav.security": "セキュリティ",
      "nav.privacy": "プライバシー",
      "nav.signIn": "ログイン",
      "nav.signUp": "無料で始める",
      "nav.app": "アプリを開く",

      "hero.kicker": "韓国の大学生のためのワークスペース",
      "hero.title.1": "タスクと講義スケジュールを",
      "hero.title.2": "一つの流れに",
      "hero.subtitle": "Planaryはタスク·メモ·ウィキ·ブックマークを一つのワークスペースに集め、e-Classの講義と課題を自動で同期します。",
      "hero.cta.primary": "無料で始める",
      "hero.cta.secondary": "機能を見る",
      "hero.tag.free": "無料スタート",
      "hero.tag.eclass": "e-Class 自動同期",
      "hero.tag.pwa": "PWA · どこでもインストール可",

      "stats.users": "アクティブユーザー",
      "stats.tasks": "管理中のタスク",
      "stats.uptime": "稼働率",

      "features.kicker": "機能",
      "features.title": "今日のタスクから卒業まで、同じワークスペースで",
      "features.subtitle": "複雑な設定なしで始められ、必要な分だけ成長します。",
      "features.tasks.title": "スマートなタスク",
      "features.tasks.body": "優先度·期限·リマインダーを自然言語で入力できます。締切が近いものは自動で目立ちます。",
      "features.wiki.title": "軽くて速いウィキ",
      "features.wiki.body": "Notion風のスラッシュメニュー。コード·表·画像·コールアウトを自由に組み合わせます。",
      "features.notes.title": "付箋メモボード",
      "features.notes.body": "思いついたアイデアを色付きメモにして、机のように自由に配置できます。位置は自動保存。",
      "features.eclass.title": "e-Class 連携",
      "features.eclass.body": "ソウル科学技術大学のe-Class講義·課題·試験が自動でタスクに取り込まれます。5分ごとに同期。",
      "features.projects.title": "プロジェクトワークスペース",
      "features.projects.body": "タスク·ウィキ·リマインダーをプロジェクト単位でまとめ、コンテキストを失わずに作業できます。",
      "features.calendar.title": "Google カレンダー",
      "features.calendar.body": "Googleカレンダーと双方向同期。タスクにリマインダーを設定するとカレンダーにも反映されます。",

      "how.kicker": "使い方",
      "how.title": "3ステップで始まります",
      "how.step1.title": "アカウント作成",
      "how.step1.body": "メールまたはGoogleアカウントで5秒で始められます。",
      "how.step2.title": "e-Class 接続",
      "how.step2.body": "学校のe-Classアカウントを入力すると、講義と課題が自動で読み込まれます。",
      "how.step3.title": "流れを作る",
      "how.step3.body": "今日のタスクを書き、メモを残し、ウィキに整理しながらワークスペースを育てます。",

      "security.kicker": "セキュリティ",
      "security.title": "安心してお任せください",
      "security.subtitle": "Firebase Auth + Firestoreセキュリティルールで、あなたのデータはあなただけが見られます。",
      "security.point1.title": "暗号化された認証情報",
      "security.point1.body": "e-ClassパスワードはAES-256で暗号化して保存されます。",
      "security.point2.title": "Firebase Auth",
      "security.point2.body": "Google運営の認証インフラ上で動作します。",
      "security.point3.title": "個人空間の分離",
      "security.point3.body": "Firestoreセキュリティルールが他ユーザーのデータアクセスを防ぎます。",

      "cta.title": "今日のタスク、書いてみませんか?",
      "cta.subtitle": "Planaryは無料で始められます。",
      "cta.button": "今すぐ始める",
      "cta.note": "クレジットカード不要 · 1分で登録",

      "footer.product": "プロダクト",
      "footer.features": "機能",
      "footer.changelog": "更新履歴",
      "footer.roadmap": "ロードマップ",
      "footer.company": "会社",
      "footer.about": "について",
      "footer.contact": "お問い合わせ",
      "footer.legal": "法的事項",
      "footer.privacy": "プライバシーポリシー",
      "footer.terms": "利用規約",
      "footer.copyright": "© 2025 Planary. Made with care.",

      "auth.signIn.title": "お帰りなさい",
      "auth.signIn.subtitle": "ワークスペースの続きから始めましょう。",
      "auth.signUp.title": "Planaryで始めましょう",
      "auth.signUp.subtitle": "1分で十分です。クレジットカードは不要。",
      "auth.email": "メール",
      "auth.email.placeholder": "メールアドレスを入力",
      "auth.password": "パスワード",
      "auth.password.placeholder": "パスワードを入力",
      "auth.password.new.placeholder": "8文字以上で設定してください",
      "auth.name": "名前",
      "auth.name.placeholder": "表示する名前",
      "auth.signIn.button": "ログイン",
      "auth.signUp.button": "アカウント作成",
      "auth.google": "Googleで続ける",
      "auth.or": "または",
      "auth.noAccount": "アカウントをお持ちでない方は",
      "auth.haveAccount": "すでにアカウントをお持ちの方は",
      "auth.forgot": "パスワードをお忘れですか?",
      "auth.terms": "登録すると利用規約とプライバシーポリシーに同意したとみなされます。",
      "auth.embedded.warning": "このブラウザではGoogleログインができない場合があります。ChromeかSafariで開いてください:",
      "auth.embedded.open": "デフォルトブラウザで開く",
      "auth.embedded.copy": "リンクをコピー",

      "common.back": "戻る",
      "common.language": "言語",
    },
  };

  const LS_KEY = "planary.lang";
  const SUPPORTED = ["ko", "en", "ja"];

  function detectLang() {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const nav = (navigator.language || "ko").toLowerCase();
    if (nav.startsWith("ja")) return "ja";
    if (nav.startsWith("ko")) return "ko";
    return "en";
  }

  let current = "ko";

  function t(key) {
    return (STRINGS[current] && STRINGS[current][key]) || (STRINGS.ko[key]) || key;
  }

  function apply(root = document) {
    document.documentElement.setAttribute("lang", current);

    root.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    root.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html");
      el.innerHTML = t(key);
    });
    root.querySelectorAll("[data-i18n-attr]").forEach(el => {
      const pairs = el.getAttribute("data-i18n-attr").split(",");
      pairs.forEach(pair => {
        const [attr, key] = pair.split(":").map(s => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });

    // Sync any language pickers
    root.querySelectorAll("[data-i18n-picker] [data-lang]").forEach(el => {
      el.classList.toggle("is-active", el.getAttribute("data-lang") === current);
    });
  }

  function set(lang) {
    if (!SUPPORTED.includes(lang)) return;
    current = lang;
    localStorage.setItem(LS_KEY, lang);
    apply();
    document.dispatchEvent(new CustomEvent("planary:lang", { detail: { lang } }));
  }

  function init(opts = {}) {
    current = opts.lang || detectLang();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => apply());
    } else {
      apply();
    }
  }

  window.PlanaryI18n = { init, set, t, apply, current: () => current, supported: SUPPORTED };
})();
