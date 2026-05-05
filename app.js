// Global Error Handling
window.addEventListener('error', (event) => {
    console.error("Global error caught:", event.error);
    if (window.showToast) window.showToast("런타임 에러: " + event.message, "error");
});

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(err => console.log('SW registration failed', err));
    });
}

// Firebase Global Instances
let db = null;
let auth = null;

// Core App State (Global)
let currentUser = null;
let allTodos = [];
let allNotes = [];
let allProjects = [];
let allBookmarks = [];
let allWikiPages = [];
let currentFilter = 'all';
let currentProjectId = null;
let selectedProjectOverviewId = null;
let selectedNoteColor = 'yellow';
let pendingDeleteTaskId = null;
let editingTaskId = null;
let currentLanguage = localStorage.getItem('planary-language') || 'ko';
const DEFAULT_APP_FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";
let currentAppFont = localStorage.getItem('planary-app-font') || DEFAULT_APP_FONT;
let onboardingState = null;
let onboardingHighlightEl = null;
let onboardingHighlightTimer = null;
let onboardingFocusIndex = 0;
let onboardingWelcomeVisible = false;
let onboardingSpotlightEls = [];
// auto-scroll suppression and throttling for touch/scroll on mobile/tablet
let onboardingSuppressAutoScroll = false;
let onboardingSuppressTimer = null;
let onboardingLastReposition = 0;
let onboardingRepositionThrottleMs = 160;
let onboardingRepositionFrame = null;
let onboardingScrollSettleTimer = null;
let onboardingLastTargetRect = null;

const GUIDE_STEP_IDS = ['taskCreate', 'taskDetails', 'taskManage', 'taskViews', 'projects', 'notesCreate', 'notesManage', 'wiki'];
const GUIDE_STATUS = ['pending', 'completed', 'skipped'];
const APP_FONT_OPTIONS = [
    { value: DEFAULT_APP_FONT, labelKey: 'defaultSans' },
    { value: "'Gothic A1', sans-serif", label: 'Gothic A1' },
    { value: "'Gowun Dodum', sans-serif", label: 'Gowun Dodum' },
    { value: "'Hahmlet', serif", label: 'Hahmlet' },
    { value: "'Noto Sans KR', sans-serif", label: 'Noto Sans KR' },
    { value: "'Nanum Gothic', sans-serif", labelKey: 'fontNanumGothic' },
    { value: "'IBM Plex Sans KR', sans-serif", label: 'IBM Plex Sans KR' },
    { value: "'Nanum Myeongjo', serif", label: 'Nanum Myeongjo' },
    { value: "'Jua', sans-serif", label: 'Jua' },
    { value: "'Do Hyeon', sans-serif", label: 'Do Hyeon' },
    { value: "'Inter', sans-serif", label: 'Inter' },
    { value: "'Lora', serif", label: 'Lora' },
    { value: "'Noto Serif KR', serif", label: 'Noto Serif KR' },
    { value: "'Roboto Mono', monospace", label: 'Roboto Mono' },
    { value: "'Caveat', cursive", label: 'Caveat' },
    { value: "'Courier New', Courier, monospace", labelKey: 'monospace' },
    { value: "'Georgia', serif", labelKey: 'serif' },
    { value: "'Comic Sans MS', cursive", labelKey: 'handwritten' }
];
const GUIDE_STEPS = {
    taskCreate: {
        icon: 'tasks',
        pageId: 'page-tasks',
        focusSelector: '#todo-input',
        fallbackSelector: '#todo-input',
        filter: 'all',
        titleKey: 'onboardingTaskCreateTitle',
        bodyKey: 'onboardingTaskCreateBody',
        targetKey: 'onboardingTaskCreateTarget',
        whyKey: 'onboardingTaskCreateWhy',
        exampleKey: 'onboardingTaskCreateExample',
        doneKey: 'onboardingTaskCreateDone',
        tipKey: 'onboardingTaskCreateTip',
        focusFlow: [
            { selector: '#todo-input', tipKey: 'onboardingTaskCreateInputTip', targetKey: 'onboardingTaskCreateInputTarget', waitFor: 'input-not-empty' },
            { selector: '#add-btn', tipKey: 'onboardingTaskCreateButtonTip', targetKey: 'onboardingTaskCreateButtonTarget', waitFor: 'click' }
        ],
        completionEvent: 'task-created'
    },
    taskDetails: {
        icon: 'reminders',
        pageId: 'page-tasks',
        focusSelector: '#memo-input',
        fallbackSelector: '#priority-select',
        filter: 'all',
        titleKey: 'onboardingTaskDetailsTitle',
        bodyKey: 'onboardingTaskDetailsBody',
        targetKey: 'onboardingTaskDetailsTarget',
        whyKey: 'onboardingTaskDetailsWhy',
        exampleKey: 'onboardingTaskDetailsExample',
        doneKey: 'onboardingTaskDetailsDone',
        tipKey: 'onboardingTaskDetailsTip',
        focusFlow: [
            { selector: '#todo-input', tipKey: 'onboardingTaskDetailsNameTip', targetKey: 'onboardingTaskDetailsNameTarget', waitFor: 'input-not-empty' },
            { selector: '#memo-input', tipKey: 'onboardingTaskDetailsMemoTip', targetKey: 'onboardingTaskDetailsMemoTarget', waitFor: 'input-not-empty' },
            { selector: '#due-date', tipKey: 'onboardingTaskDetailsDateTip', targetKey: 'onboardingTaskDetailsDateTarget', waitFor: 'input-not-empty' },
            { selector: '#priority-select', tipKey: 'onboardingTaskDetailsPriorityTip', targetKey: 'onboardingTaskDetailsPriorityTarget', waitFor: 'input-not-empty' },
            { selector: '#add-btn', tipKey: 'onboardingTaskDetailsButtonTip', targetKey: 'onboardingTaskDetailsButtonTarget', waitFor: 'click' }
        ],
        completionEvent: 'task-created-with-details'
    },
    taskManage: {
        icon: 'tasks',
        pageId: 'page-tasks',
        focusSelector: '.task-card .btn-edit-task',
        fallbackSelector: '.task-card .btn-toggle',
        filter: 'all',
        titleKey: 'onboardingTaskManageTitle',
        bodyKey: 'onboardingTaskManageBody',
        targetKey: 'onboardingTaskManageTarget',
        whyKey: 'onboardingTaskManageWhy',
        exampleKey: 'onboardingTaskManageExample',
        doneKey: 'onboardingTaskManageDone',
        tipKey: 'onboardingTaskManageTip',
        completionEvent: 'task-managed'
    },
    taskViews: {
        icon: 'reminders',
        pageId: 'page-tasks',
        focusSelector: '.filter-chip[data-filter="important"]',
        fallbackSelector: '.filter-chip[data-filter="reminders"]',
        filter: 'all',
        titleKey: 'onboardingTaskViewsTitle',
        bodyKey: 'onboardingTaskViewsBody',
        targetKey: 'onboardingTaskViewsTarget',
        whyKey: 'onboardingTaskViewsWhy',
        exampleKey: 'onboardingTaskViewsExample',
        doneKey: 'onboardingTaskViewsDone',
        tipKey: 'onboardingTaskViewsTip',
        completionEvent: 'task-view-opened'
    },
    projects: {
        icon: 'projects',
        pageId: 'page-projects',
        focusSelector: '#project-input',
        fallbackSelector: '#project-input',
        titleKey: 'onboardingProjectsTitle',
        bodyKey: 'onboardingProjectsBody',
        targetKey: 'onboardingProjectsTarget',
        whyKey: 'onboardingProjectsWhy',
        exampleKey: 'onboardingProjectsExample',
        doneKey: 'onboardingProjectsDone',
        tipKey: 'onboardingProjectsTip',
        focusFlow: [
            { selector: '#project-input', tipKey: 'onboardingProjectsInputTip', targetKey: 'onboardingProjectsInputTarget', waitFor: 'input-not-empty' },
            { selector: '#add-project-btn', tipKey: 'onboardingProjectsButtonTip', targetKey: 'onboardingProjectsButtonTarget', waitFor: 'click' }
        ],
        completionEvent: 'project-created'
    },
    notesCreate: {
        icon: 'notes',
        pageId: 'page-notes',
        focusSelector: '#note-input',
        fallbackSelector: '#add-note-btn',
        titleKey: 'onboardingNotesCreateTitle',
        bodyKey: 'onboardingNotesCreateBody',
        targetKey: 'onboardingNotesCreateTarget',
        whyKey: 'onboardingNotesCreateWhy',
        exampleKey: 'onboardingNotesCreateExample',
        doneKey: 'onboardingNotesCreateDone',
        tipKey: 'onboardingNotesCreateTip',
        focusFlow: [
            { selector: '#note-color-picker', tipKey: 'onboardingNotesColorTip', targetKey: 'onboardingNotesColorTarget', waitFor: 'none' },
            { selector: '#note-input', tipKey: 'onboardingNotesInputTip', targetKey: 'onboardingNotesInputTarget', waitFor: 'input-not-empty' },
            { selector: '#add-note-btn', tipKey: 'onboardingNotesButtonTip', targetKey: 'onboardingNotesButtonTarget', waitFor: 'click' }
        ],
        completionEvent: 'note-created'
    },
    notesManage: {
        icon: 'notes',
        pageId: 'page-notes',
        focusSelector: '.note-card .note-edit-btn',
        fallbackSelector: '.note-card .note-delete-btn',
        titleKey: 'onboardingNotesManageTitle',
        bodyKey: 'onboardingNotesManageBody',
        targetKey: 'onboardingNotesManageTarget',
        whyKey: 'onboardingNotesManageWhy',
        exampleKey: 'onboardingNotesManageExample',
        doneKey: 'onboardingNotesManageDone',
        tipKey: 'onboardingNotesManageTip',
        completionEvent: 'note-managed'
    },
    wiki: {
        icon: 'wiki',
        pageId: 'page-wiki',
        focusSelector: '#new-wiki-btn',
        fallbackSelector: '#wiki-empty-create-btn',
        titleKey: 'onboardingWikiTitle',
        bodyKey: 'onboardingWikiBody',
        targetKey: 'onboardingWikiTarget',
        whyKey: 'onboardingWikiWhy',
        exampleKey: 'onboardingWikiExample',
        doneKey: 'onboardingWikiDone',
        tipKey: 'onboardingWikiTip',
        focusFlow: [
            { selector: '#new-wiki-btn', fallbackSelector: '#wiki-empty-create-btn', tipKey: 'onboardingWikiButtonTip', targetKey: 'onboardingWikiButtonTarget', waitFor: 'click' }
        ],
        completionEvent: 'wiki-created'
    }
};

// --- CORE UTILITY FUNCTIONS ---
const getEl = (id) => document.getElementById(id);

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || document.body.appendChild(Object.assign(document.createElement('div'), {id: 'toast-container'}));
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}
window.showToast = showToast; // Export to global

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const APP_ICON_PATHS = {
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    tasks: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    projects: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    notes: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    wiki: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    bookmarks: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
    profile: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    reminders: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    complete: '<path d="M20 6 9 17l-5-5"/>',
    progress: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    important: '<path d="M12 2 2 22h20L12 2z"/><path d="M12 9v5"/><path d="M12 18h.01"/>',
    add: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
};

const TASK_EMPTY_STATES = {
    all: { icon: 'tasks', titleKey: 'emptyTasksAllTitle', bodyKey: 'emptyTasksAllBody' },
    completed: { icon: 'complete', titleKey: 'emptyTasksCompletedTitle', bodyKey: 'emptyTasksCompletedBody' },
    active: { icon: 'progress', titleKey: 'emptyTasksActiveTitle', bodyKey: 'emptyTasksActiveBody' },
    important: { icon: 'important', titleKey: 'emptyTasksImportantTitle', bodyKey: 'emptyTasksImportantBody' },
    reminders: { icon: 'reminders', titleKey: 'emptyTasksRemindersTitle', bodyKey: 'emptyTasksRemindersBody' }
};

function appIconSvg(name, size = 20, extraAttrs = '') {
    const paths = APP_ICON_PATHS[name] || APP_ICON_PATHS.tasks;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extraAttrs}>${paths}</svg>`;
}

const I18N = {
    ko: {
        home: '홈', tasks: '작업', allTasks: '전체 작업', completed: '완료됨', progress: '진행 중', important: '중요',
        reminders: '리마인더', projects: '프로젝트', notes: '메모', wiki: '위키', bookmarks: '북마크',
        archive: '보관함', myPage: '마이페이지', dashboardTitle: '대시보드', dashboardSubtitle: '오늘의 작업 흐름을 확인하세요.',
        todayOverview: 'Today Overview', todayHubTitle: '오늘 해야 할 일을 한눈에 확인하세요',
        todayHubSummary: '오늘 마감 {due}개, 중요 작업 {important}개, 진행 중 프로젝트 {projects}개가 있습니다.',
        todayDue: '오늘 마감', todayImportant: '중요', todayProjects: '프로젝트',
        todayFocusTitle: '오늘의 우선 작업', activeProjectsTitle: '진행 중 프로젝트', noTodayFocus: '오늘 바로 처리할 작업이 없습니다.',
        noActiveProjectsToday: '진행 중인 프로젝트가 없습니다.', noProject: '프로젝트 없음',
        totalTasks: '전체 작업', productivity: '생산성', recentNotes: '최근 메모', upcomingReminders: '다가오는 리마인더',
        viewAll: '전체 보기', taskTitle: '작업', defaultSans: '기본 글꼴', addTask: '작업 추가', taskPlaceholder: '무엇을 해야 하나요?',
        memoPlaceholder: '메모 (선택)', noProject: '프로젝트 없음', searchTasks: '작업 검색...', projectsTitle: '프로젝트',
        projectsSubtitle: '작업을 프로젝트별로 정리하세요.', projectPlaceholder: '프로젝트 이름 (예: 업무, 공부)', createProject: '프로젝트 만들기',
        projectWorkspace: '프로젝트 작업 공간', projectSummary: '작업, 리마인더, 위키 페이지를 한 곳에서 봅니다.',
        openTasks: '작업 열기', openReminders: '리마인더 열기', newWikiPage: '새 위키 페이지', stickyNotes: '스티키 메모',
        projectLabel: '프로젝트',
        notePlaceholder: '짧은 생각이나 아이디어를 적어보세요...', addNote: '+ 메모 추가', bookmarksTitle: '북마크',
        bookmarksSubtitle: '중요한 링크를 태그와 함께 저장하세요.', saveBookmark: '북마크 저장', docsWiki: '문서 & 위키',
        wikiSubtitle: '노션 스타일 문서 편집기', searchPages: '페이지 검색...', saveChanges: '변경사항 저장',
        archiveTitle: '보관함', archivedTasks: '보관된 작업', emptyArchive: '보관함 비우기', profileTitle: '마이페이지',
        nameLabel: '이름:', emailLabel: '이메일:', loginMethodsLabel: '로그인 방식:', languageLabel: 'UI 언어',
        appFontLabel: '전체 글꼴',
        guideTitle: '가이드', guideDescription: 'Planary의 기본 사용 흐름을 다시 확인합니다.', replayGuide: '가이드 다시 보기',
        emailPasswordLogin: '이메일 비밀번호 로그인', newPassword: '새 비밀번호', confirmPassword: '비밀번호 확인',
        logout: '로그아웃', taskHeaderTitle: '내 작업', taskHeaderSubtitle: '작업 관리자', overviewHeader: '개요',
        overviewSubtitle: '대시보드 요약', projectHeader: '프로젝트 그룹', projectSubtitle: '분류 관리자',
        notesHeader: '스티키 보드', notesSubtitle: '아이디어 메모', bookmarksHeader: '저장한 웹', bookmarksHeaderSubtitle: '참고 링크',
        archiveHeader: '보관함', archiveSubtitle: '이전 기록', wikiHeader: '위키 & 문서', wikiHeaderSubtitle: '지식 베이스',
        myPageSubtitle: '사용자 계정', googleProvider: '구글', emailPasswordProvider: '이메일 비밀번호',
        emailPasswordAlreadyEnabled: '이메일 비밀번호 로그인이 이미 활성화되어 있습니다. 새 비밀번호를 입력하면 변경됩니다.',
        setPasswordHelp: '이 이메일로 비밀번호 로그인도 할 수 있도록 비밀번호를 설정합니다.',
        updatePassword: '비밀번호 변경', setPasswordLogin: '비밀번호 로그인 설정', passwordPlaceholder: '6자 이상',
        confirmPasswordPlaceholder: '비밀번호 확인', authUnknownError: '알 수 없는 오류입니다.',
        recentLoginRequired: '보안을 위해 로그아웃 후 구글로 다시 로그인한 다음 비밀번호를 설정하세요.',
        weakPassword: '비밀번호는 최소 6자 이상이어야 합니다.', emailAlreadyConnected: '이 이메일은 이미 다른 계정에 연결되어 있습니다. 먼저 해당 방식으로 로그인하세요.',
        providerAlreadyLinked: '이 계정에는 이메일 비밀번호 로그인이 이미 활성화되어 있습니다.',
        emailPasswordDisabled: 'Firebase 프로젝트에서 이메일/비밀번호 로그인이 비활성화되어 있습니다. Firebase Console > Authentication > Sign-in method > Email/Password를 활성화한 뒤 다시 시도하세요.',
        authFailed: '인증에 실패했습니다.', noEmailToConnect: '연결할 이메일 주소가 없는 계정입니다.',
        passwordMismatch: '비밀번호가 일치하지 않습니다.', updatingPassword: '비밀번호 변경 중...', connectingEmailPassword: '이메일 비밀번호 로그인 연결 중...',
        emailPasswordDone: '완료되었습니다. 이제 이 이메일과 비밀번호로 로그인할 수 있습니다.', emailPasswordEnabled: '이메일 비밀번호 로그인이 활성화되었습니다.',
        edit: '수정', delete: '삭제', restore: '복원', archiveVerb: '보관', undo: '되돌리기', complete: '완료',
        deleteConfirm: '삭제할까요?', deleteTaskTitle: '작업을 삭제할까요?', deleteTaskBody: '삭제한 작업은 되돌릴 수 없습니다. 필요한 내용은 삭제 전에 보관하거나 메모로 옮겨두세요.',
        deleteTaskCancel: '유지하기', deleteTaskConfirm: '삭제하기', editTaskTitle: '작업 수정', taskNameLabel: '작업명',
        taskMemoLabel: '메모', dueDateLabel: '마감일', projectSelectLabel: '프로젝트', saveTaskChanges: '변경사항 저장',
        cancel: '취소', taskUpdated: '작업이 수정되었습니다.', noNotes: '메모 없음', dueToday: '오늘 마감', priorityLabel: '우선순위',
        low: '낮음', medium: '보통', high: '높음', noRecentNotes: '최근 메모가 없습니다.', noUpcomingReminders: '다가오는 리마인더가 없습니다.',
        today: '오늘', active: '진행 중', noDate: '날짜 없음', deletePermanently: '영구 삭제',
        permanentDeleteConfirm: '영구 삭제할까요?', stayInspired: '계속 기록하세요.', projectTasksUnit: '작업',
        projectRemindersUnit: '리마인더', projectWikiUnit: '위키', open: '열기', deleteProjectConfirm: '프로젝트를 삭제할까요?',
        taskCountSummary: '{tasks}개 작업, {reminders}개 리마인더, {wiki}개 위키 페이지',
        noTasksInProject: '이 프로젝트에 작업이 없습니다.', noActiveReminders: '활성 리마인더가 없습니다.',
        untitledDocument: '제목 없는 문서', subpage: '하위 페이지', rootPage: '루트 페이지', noWikiInProject: '이 프로젝트에 연결된 위키 페이지가 없습니다.',
        visitWebsite: '웹사이트 방문', deleteBookmark: '북마크 삭제', deleteBookmarkConfirm: '북마크를 삭제할까요?',
        editContent: '내용 수정:', updated: '수정되었습니다.', uploadingImage: '이미지 업로드 중...', imageUploadFailed: '이미지 업로드에 실패해 이미지 없이 저장합니다.',
        added: '추가되었습니다.', taskCreationFailed: '작업 생성에 실패했습니다.', bookmarkSaved: '북마크가 저장되었습니다.',
        projectCreated: '프로젝트가 생성되었습니다.', projectNotesTitle: '{project} 메모', failedCreateWiki: '위키 페이지 생성에 실패했습니다.',
        noteAdded: '메모가 추가되었습니다.', logoutConfirm: '로그아웃할까요?', uploadImageTitle: '이미지 첨부',
        pasteUrl: 'URL 붙여넣기', customTitle: '사용자 지정 제목', tagsPlaceholder: '태그...', newPage: '+ 새 페이지',
        uploadingProgress: '업로드 중... 0%', subpages: '하위 페이지', newSubpage: '새 하위 페이지', deletePage: '페이지 삭제',
        archiveDescription: '완료한 작업과 지난 기록을 다시 확인하세요.', totalAchievements: '전체 성과', itemsArchived: '보관된 항목',
        monospace: '고정폭', serif: '세리프', handwritten: '손글씨', fontNanumGothic: '나눔고딕',
        emptyTasksAllTitle: '할 일을 채워보세요',
        emptyTasksAllBody: '해야 할 일, 마감일, 메모를 한 번에 정리하는 공간입니다.<br>위 입력창에서 첫 작업을 추가해 흐름을 시작하세요.',
        emptyTasksCompletedTitle: '아직 완료한 작업이 없습니다',
        emptyTasksCompletedBody: '작업을 끝내고 완료 처리하면 이곳에서 성과를 한눈에 볼 수 있습니다.<br>먼저 작은 일 하나를 끝내보세요.',
        emptyTasksActiveTitle: '진행 중인 작업이 없습니다',
        emptyTasksActiveBody: '지금 할 일이 없다면 아주 좋은 상태입니다.<br>새로운 할 일이 생기면 입력창에 적어 진행 목록을 채워보세요.',
        emptyTasksImportantTitle: '중요 작업이 없습니다',
        emptyTasksImportantBody: '우선순위를 높음으로 지정한 작업이 이곳에 모입니다.<br>놓치면 안 되는 일만 선별해 집중하세요.',
        emptyTasksRemindersTitle: '예정된 리마인더가 없습니다',
        emptyTasksRemindersBody: '마감일이 있는 미완료 작업이 이곳에 표시됩니다.<br>날짜가 필요한 작업에 마감일을 추가해보세요.',
        firstTaskTitle: '할 일을 채워보세요',
        firstTaskBody: '해야 할 일, 마감일, 메모를 한 번에 정리하는 공간입니다.<br>위 입력창에서 첫 작업을 추가해 흐름을 시작하세요.',
        firstTaskButton: '첫 작업 추가하기', firstNoteTitle: '메모 보드를 채워보세요',
        firstNoteBody: '아이디어와 짧은 기록을 포스트잇처럼 쌓아두는 공간입니다.<br>상단 입력창에 첫 메모를 적고 보드 위에 배치해보세요.',
        firstNoteButton: '첫 메모 작성하기', firstProjectTitle: '프로젝트를 만들어보세요',
        firstProjectBody: '업무와 아이디어를 주제별로 나누면 정리 속도가 빨라집니다.<br>상단 입력창에서 첫 프로젝트를 추가해 작업을 묶어보세요.',
        firstProjectButton: '첫 프로젝트 만들기', firstBookmarkTitle: '북마크를 저장해보세요',
        firstBookmarkBody: '자주 참고하는 링크를 태그와 함께 모아두는 공간입니다.<br>상단 입력창에 URL을 붙여 첫 북마크를 저장하세요.',
        firstBookmarkButton: '첫 북마크 저장하기', emptyArchiveTitle: '보관함이 비어 있습니다',
        emptyArchiveBody: '완료했거나 잠시 치워둔 작업이 여기에 쌓입니다.<br>작업 화면에서 항목을 보관하면 이곳에서 다시 꺼낼 수 있습니다.',
        expandSidebar: '사이드바 펼치기', collapseSidebar: '사이드바 접기',
        openPageFirst: '먼저 페이지를 열어주세요', untitledProject: '제목 없는 프로젝트', noPagesFound: '페이지가 없습니다',
        createFirstSubpage: '첫 하위 페이지 만들기', subpageEmptyHelp: '관련 메모를 이 페이지 아래에 정리하세요.',
        openSubpage: '하위 페이지 열기', loginFirst: '먼저 로그인해주세요', failedCreatePage: '페이지 생성 실패',
        cannotSaveNotReady: '저장할 수 없습니다. 페이지가 준비되지 않았습니다.', saving: '저장 중...', pageSaved: '페이지가 저장되었습니다',
        saveFailed: '저장 실패', deletePageConfirm: '이 페이지를 삭제할까요?',
        deletePageWithSubpagesConfirm: '이 페이지와 하위 페이지 {count}개를 삭제할까요?', pageDeleted: '페이지가 삭제되었습니다',
        failedDeletePage: '페이지 삭제 실패', mathPlaceholder: 'KaTeX 수식을 입력하세요 (예: \\sum_{i=1}^n i = \\frac{n(n+1)}{2})',
        headingShortcutFailed: '제목 단축키 실패', undoFailed: '되돌리기 실패', headingPlaceholder: '제목 입력',
        loginFirstOrStorage: '먼저 로그인하거나 Firebase Storage 초기화를 확인해주세요', uploadFailed: '업로드 실패',
        editorPlaceholder: '명령어는 "/"를 입력하세요...', wikiEmptyTitle: '지식 창고를 채워보세요',
        wikiEmptyBody: '생각을 정리하고 아이디어를 기록하는 당신만의 위키 공간입니다.<br>왼쪽 목록에서 문서를 선택하거나 새로 만들어 시작하세요.',
        createNewPage: '새 페이지 만들기', inspirationTitle: '과거의 나로부터의 영감',
        onboardingEyebrow: 'Planary 시작하기',
        onboardingTitle: '작업을 한 흐름으로 정리하세요',
        onboardingWelcomeTitle: '{name}님, Planary에 오신 것을 환영합니다',
        onboardingWelcomeBody: '해야 할 일, 떠오른 생각, 길어지는 기록을 Planary 안에서 자연스럽게 연결해보세요.',
        onboardingWelcomeHint: '몇 분 동안 직접 눌러보며 작업, 프로젝트, 스티키 노트, 위키 흐름을 익힙니다.',
        onboardingBeginGuide: '가이드 시작하기',
        onboardingLanguageLabel: '가이드 언어 선택',
        onboardingIntro: '처음 시작할 때는 아래 순서만 기억하면 됩니다. 할 일을 만들고, 프로젝트로 묶고, 필요한 기록은 위키에 남기세요.',
        onboardingTaskCreateTitle: '작업 만들기',
        onboardingTaskCreateBody: '가장 먼저 오늘 할 일을 하나 만들어 흐름을 시작합니다.',
        onboardingTaskCreateTarget: '작업 입력창에 할 일을 적고 작업 추가를 누르면 완료됩니다.',
        onboardingTaskCreateWhy: '해야 할 일을 머릿속에 두지 않고 작업 목록으로 옮깁니다.',
        onboardingTaskCreateExample: '예: 오늘 회의 자료 정리',
        onboardingTaskCreateDone: '작업을 하나 추가하면 자동으로 완료됩니다.',
        onboardingTaskCreateTip: '여기에 지금 떠오른 할 일을 짧게 적어보세요.',
        onboardingTaskCreateInputTip: '먼저 작업명을 입력하세요.',
        onboardingTaskCreateInputTarget: '작업명을 입력한 뒤 다음 위치 보기를 누르세요.',
        onboardingTaskCreateButtonTip: '이제 작업 추가를 직접 눌러 완료하세요.',
        onboardingTaskCreateButtonTarget: '작업 추가 버튼을 누르면 이 단계가 완료됩니다.',
        onboardingTaskDetailsTitle: '세부정보 붙이기',
        onboardingTaskDetailsBody: '작업에는 메모, 마감일, 우선순위를 함께 넣을 수 있습니다.',
        onboardingTaskDetailsTarget: '메모나 마감일을 입력하거나 우선순위를 바꾼 뒤 작업을 추가하면 완료됩니다.',
        onboardingTaskDetailsWhy: '마감일을 넣으면 리마인더에 나타나고, 높음 우선순위는 중요 작업으로 모입니다.',
        onboardingTaskDetailsExample: '예: 메모 “초안 먼저 작성”, 마감일 오늘, 우선순위 높음',
        onboardingTaskDetailsDone: '세부정보가 포함된 작업을 추가하면 완료됩니다.',
        onboardingTaskDetailsTip: '메모, 날짜, 우선순위 중 하나만 바꿔도 충분합니다.',
        onboardingTaskDetailsNameTip: '세부정보를 붙일 작업명을 먼저 입력하세요.',
        onboardingTaskDetailsNameTarget: '작업명을 입력한 뒤 다음 위치 보기를 누르세요.',
        onboardingTaskDetailsMemoTip: '작업에 필요한 맥락을 짧게 적어보세요.',
        onboardingTaskDetailsMemoTarget: '메모를 입력한 뒤 다음 위치 보기를 누르세요.',
        onboardingTaskDetailsDateTip: '마감일을 넣으면 리마인더에서 볼 수 있습니다.',
        onboardingTaskDetailsDateTarget: '마감일을 선택한 뒤 다음 위치 보기를 누르세요.',
        onboardingTaskDetailsPriorityTip: '높음 우선순위는 중요 필터에 모입니다.',
        onboardingTaskDetailsPriorityTarget: '우선순위를 바꾼 뒤 다음 위치 보기를 누르세요.',
        onboardingTaskDetailsButtonTip: '세부정보가 들어간 작업을 추가하세요.',
        onboardingTaskDetailsButtonTarget: '작업 추가 버튼을 누르면 이 단계가 완료됩니다.',
        onboardingTaskManageTitle: '작업 수정과 정리',
        onboardingTaskManageBody: '만든 작업은 수정하고, 완료 처리하고, 보관함으로 정리할 수 있습니다.',
        onboardingTaskManageTarget: '작업 카드의 수정, 완료, 보관 중 하나를 눌러보세요.',
        onboardingTaskManageWhy: '끝난 일은 완료, 당장 안 볼 일은 보관으로 정리하면 목록이 가벼워집니다.',
        onboardingTaskManageExample: '예: 수정으로 제목을 고치거나 완료를 눌러 끝낸 일로 표시',
        onboardingTaskManageDone: '수정, 완료, 보관 중 하나를 누르면 완료됩니다.',
        onboardingTaskManageTip: '카드 아래 버튼으로 작업 상태를 바로 바꿀 수 있습니다.',
        onboardingTaskViewsTitle: '중요 작업과 리마인더 보기',
        onboardingTaskViewsBody: '우선순위가 높은 작업과 마감일이 있는 작업은 필터로 따로 볼 수 있습니다.',
        onboardingTaskViewsTarget: '중요 또는 리마인더 필터를 누르면 완료됩니다.',
        onboardingTaskViewsWhy: '오늘 꼭 봐야 할 일과 날짜가 있는 일을 빠르게 좁혀봅니다.',
        onboardingTaskViewsExample: '예: 높음 우선순위는 중요, 마감일 있는 작업은 리마인더에서 확인',
        onboardingTaskViewsDone: '중요 또는 리마인더 필터를 열면 완료됩니다.',
        onboardingTaskViewsTip: '필터를 눌러 목록이 어떻게 바뀌는지 확인하세요.',
        onboardingProjectsTitle: '프로젝트로 묶기',
        onboardingProjectsBody: '작업, 리마인더, 위키를 프로젝트 단위로 모아 관리합니다.',
        onboardingProjectsTarget: '프로젝트 이름을 입력하고 프로젝트 만들기를 누르면 완료됩니다.',
        onboardingProjectsWhy: '관련된 작업과 기록을 한 주제로 묶으면 나중에 다시 찾기 쉽습니다.',
        onboardingProjectsExample: '예: 업무, 공부, 사이드 프로젝트',
        onboardingProjectsDone: '프로젝트를 하나 만들면 완료됩니다.',
        onboardingProjectsTip: '큰 주제 이름을 짧게 적어보세요.',
        onboardingProjectsInputTip: '프로젝트 이름을 입력하세요.',
        onboardingProjectsInputTarget: '이름을 입력한 뒤 다음 위치 보기를 누르세요.',
        onboardingProjectsButtonTip: '프로젝트 만들기를 직접 눌러 완료하세요.',
        onboardingProjectsButtonTarget: '프로젝트 만들기 버튼을 누르면 이 단계가 완료됩니다.',
        onboardingNotesCreateTitle: '스티키 노트 만들기',
        onboardingNotesCreateBody: '짧은 아이디어와 메모는 스티키 노트로 빠르게 남길 수 있습니다.',
        onboardingNotesCreateTarget: '색상을 고르고 노트를 작성한 뒤 메모 추가를 누르면 완료됩니다.',
        onboardingNotesCreateWhy: '작업은 아니지만 잊으면 안 되는 생각을 빠르게 붙잡아둡니다.',
        onboardingNotesCreateExample: '예: 다음 회의에서 물어볼 질문',
        onboardingNotesCreateDone: '스티키 노트를 하나 추가하면 완료됩니다.',
        onboardingNotesCreateTip: '색상을 고른 뒤 짧은 문장으로 남겨보세요.',
        onboardingNotesColorTip: '먼저 노트 색상을 골라보세요.',
        onboardingNotesColorTarget: '색상을 확인한 뒤 다음 위치 보기를 누르세요.',
        onboardingNotesInputTip: '작업은 아니지만 기억할 내용을 적어보세요.',
        onboardingNotesInputTarget: '노트를 입력한 뒤 다음 위치 보기를 누르세요.',
        onboardingNotesButtonTip: '메모 추가를 직접 눌러 완료하세요.',
        onboardingNotesButtonTarget: '메모 추가 버튼을 누르면 이 단계가 완료됩니다.',
        onboardingNotesManageTitle: '스티키 노트 수정하기',
        onboardingNotesManageBody: '만든 노트는 수정하거나 삭제하고, 드래그해서 위치를 바꿀 수 있습니다.',
        onboardingNotesManageTarget: '노트 카드의 수정 또는 삭제를 눌러보세요.',
        onboardingNotesManageWhy: '아이디어가 바뀌면 바로 고치고, 필요 없어진 메모는 지웁니다.',
        onboardingNotesManageExample: '예: 수정으로 내용을 다듬거나 드래그해 보드에서 위치 변경',
        onboardingNotesManageDone: '노트의 수정 또는 삭제를 누르면 완료됩니다.',
        onboardingNotesManageTip: '노트 카드 하단 버튼으로 관리할 수 있습니다.',
        onboardingWikiTitle: '위키에 기록하기',
        onboardingWikiBody: '회의 내용, 아이디어, 자료는 위키 페이지와 하위 페이지로 정리합니다.',
        onboardingWikiTarget: '새 페이지를 만들거나 위키 문서를 열면 완료됩니다.',
        onboardingWikiWhy: '길어지는 정보는 작업에 넣기보다 문서로 옮겨 오래 보관합니다.',
        onboardingWikiExample: '예: 회의록, 아이디어 정리, 참고 링크 모음',
        onboardingWikiDone: '새 위키 페이지를 만들거나 문서를 열면 완료됩니다.',
        onboardingWikiTip: '새 페이지를 눌러 긴 기록을 시작하세요.',
        onboardingWikiButtonTip: '새 페이지를 눌러 긴 기록을 시작하세요.',
        onboardingWikiButtonTarget: '새 페이지를 누르면 이 단계가 완료됩니다.',
        onboardingWhyLabel: '왜 쓰나요',
        onboardingExampleLabel: '이렇게 해보세요',
        onboardingDoneLabel: '완료 조건',
        onboardingStepSummary: '{done}개 완료, {current}번째 단계 진행 중, {remaining}개 남음',
        onboardingShowSteps: '전체 단계 보기',
        onboardingHideSteps: '단계 접기',
        onboardingNextFocus: '다음 위치 보기',
        onboardingClickToComplete: '직접 눌러 완료하기',
        onboardingNeedInput: '먼저 내용을 입력해주세요.',
        onboardingExit: '가이드 나가기', onboardingSkipStep: '이 단계 건너뛰기', onboardingStartStep: '이 단계 시작',
        onboardingNextStep: '다음 단계', onboardingComplete: '완료', onboardingProgressText: '{current} / {total}',
        onboardingDone: '완료', onboardingSkipped: '건너뜀', onboardingPending: '대기 중',
        onboardingLater: '나중에 볼게요', onboardingStart: '작업 만들러 가기', backToList: '목록으로 돌아가기',
        toggleTheme: '테마 전환', toggleNavigation: '내비게이션 열기', attachment: '첨부파일',
        katexNotLoaded: 'KaTeX를 불러오지 못했습니다.', syntaxError: '문법 오류'
    },
    en: {
        home: 'Home', tasks: 'Tasks', allTasks: 'All tasks', completed: 'Completed', progress: 'Progress', important: 'Important',
        reminders: 'Reminders', projects: 'Projects', notes: 'Notes', wiki: 'Wiki', bookmarks: 'Bookmarks',
        archive: 'Archive', myPage: 'My Page', dashboardTitle: 'Dashboard Overview', dashboardSubtitle: "Welcome back! Here's what's happening today.",
        todayOverview: 'Today Overview', todayHubTitle: "See today's work at a glance",
        todayHubSummary: '{due} due today, {important} important, {projects} active projects.',
        todayDue: 'Due today', todayImportant: 'Important', todayProjects: 'Projects',
        todayFocusTitle: "Today's priority tasks", activeProjectsTitle: 'Active projects', noTodayFocus: 'No priority work for today.',
        noActiveProjectsToday: 'No active projects yet.', noProject: 'No project',
        totalTasks: 'Total Tasks', productivity: 'Productivity', recentNotes: 'Recent Notes', upcomingReminders: 'Upcoming Reminders',
        viewAll: 'View All', taskTitle: 'Tasks', defaultSans: 'Default Sans', addTask: 'Add Task', taskPlaceholder: 'What needs to be done?',
        memoPlaceholder: 'Notes (optional)', noProject: 'No Project', searchTasks: 'Search tasks...', projectsTitle: 'Projects',
        projectsSubtitle: 'Organize your tasks into groups.', projectPlaceholder: 'Project name (e.g. Work, Study)', createProject: 'Create Project',
        projectWorkspace: 'Project workspace', projectSummary: 'Tasks, reminders, and wiki pages in one place.',
        openTasks: 'Open tasks', openReminders: 'Open reminders', newWikiPage: 'New wiki page', stickyNotes: 'Sticky Notes',
        projectLabel: 'Project',
        notePlaceholder: 'Jot down a quick thought or idea...', addNote: '+ Add Note', bookmarksTitle: 'Bookmarks',
        bookmarksSubtitle: 'Save important links with tags.', saveBookmark: 'Save Bookmark', docsWiki: 'Docs & Wiki',
        wikiSubtitle: 'Notion-like document editor', searchPages: 'Search pages...', saveChanges: 'Save Changes',
        archiveTitle: 'Archive Vault', archivedTasks: 'Archived Tasks', emptyArchive: 'Empty Archive', profileTitle: 'My Page',
        nameLabel: 'Name:', emailLabel: 'Email:', loginMethodsLabel: 'Login methods:', languageLabel: 'UI language',
        appFontLabel: 'App font',
        guideTitle: 'Guide', guideDescription: 'Review the basic Planary workflow again.', replayGuide: 'Replay guide',
        emailPasswordLogin: 'Email password login', newPassword: 'New password', confirmPassword: 'Confirm password',
        logout: 'Logout', taskHeaderTitle: 'My Tasks', taskHeaderSubtitle: 'Todo Manager', overviewHeader: 'Overview',
        overviewSubtitle: 'Dashboard Summary', projectHeader: 'Project Groups', projectSubtitle: 'Category Manager',
        notesHeader: 'Sticky Board', notesSubtitle: 'Idea Notes', bookmarksHeader: 'Web Saved', bookmarksHeaderSubtitle: 'Reference Links',
        archiveHeader: 'Vault', archiveSubtitle: 'Historical Records', wikiHeader: 'Wiki & Docs', wikiHeaderSubtitle: 'Knowledge Base',
        myPageSubtitle: 'User Account', googleProvider: 'Google', emailPasswordProvider: 'Email password',
        emailPasswordAlreadyEnabled: 'Email password login is already enabled. Enter a new password to update it.',
        setPasswordHelp: 'Set a password for this email so you can sign in with email and password too.',
        updatePassword: 'Update password', setPasswordLogin: 'Set password login', passwordPlaceholder: 'At least 6 characters',
        confirmPasswordPlaceholder: 'Confirm password', authUnknownError: 'Unknown error.',
        recentLoginRequired: 'For security, please log out, sign in with Google again, then set the password.',
        weakPassword: 'Password should be at least 6 characters.', emailAlreadyConnected: 'This email is already connected to another account. Sign in with that method first.',
        providerAlreadyLinked: 'Email password login is already enabled for this account.',
        emailPasswordDisabled: 'Email/Password login is disabled in this Firebase project. Enable Firebase Console > Authentication > Sign-in method > Email/Password, then try again.',
        authFailed: 'Authentication failed.', noEmailToConnect: 'This account has no email address to connect.',
        passwordMismatch: 'Passwords do not match.', updatingPassword: 'Updating password...', connectingEmailPassword: 'Connecting email password login...',
        emailPasswordDone: 'Done. You can now sign in with this email and password.', emailPasswordEnabled: 'Email password login enabled.',
        edit: 'Edit', delete: 'Delete', restore: 'Restore', archiveVerb: 'Archive', undo: 'Undo', complete: 'Complete',
        deleteConfirm: 'Delete?', deleteTaskTitle: 'Delete this task?', deleteTaskBody: 'Deleted tasks cannot be restored. Archive it first if you may need it later.',
        deleteTaskCancel: 'Keep task', deleteTaskConfirm: 'Delete task', editTaskTitle: 'Edit task', taskNameLabel: 'Task name',
        taskMemoLabel: 'Note', dueDateLabel: 'Due date', projectSelectLabel: 'Project', saveTaskChanges: 'Save changes',
        cancel: 'Cancel', taskUpdated: 'Task updated.', noNotes: 'No notes.', dueToday: 'Due Today', priorityLabel: 'Priority',
        low: 'Low', medium: 'Medium', high: 'High', noRecentNotes: 'No recent notes.', noUpcomingReminders: 'No upcoming reminders.',
        today: 'TODAY', active: 'Active', noDate: 'No Date', deletePermanently: 'Delete Permanently',
        permanentDeleteConfirm: 'Permanently delete?', stayInspired: 'Stay inspired.', projectTasksUnit: 'tasks',
        projectRemindersUnit: 'reminders', projectWikiUnit: 'wiki', open: 'Open', deleteProjectConfirm: 'Delete project?',
        taskCountSummary: '{tasks} tasks, {reminders} reminders, {wiki} wiki pages',
        noTasksInProject: 'No tasks in this project.', noActiveReminders: 'No active reminders.',
        untitledDocument: 'Untitled Document', subpage: 'Subpage', rootPage: 'Root page', noWikiInProject: 'No wiki pages linked to this project.',
        visitWebsite: 'Visit Website', deleteBookmark: 'Delete bookmark', deleteBookmarkConfirm: 'Delete bookmark?',
        editContent: 'Edit content:', updated: 'Updated!', uploadingImage: 'Uploading image...', imageUploadFailed: 'Image upload failed, saving task without image',
        added: 'Added!', taskCreationFailed: 'Task creation failed.', bookmarkSaved: 'Bookmark saved!',
        projectCreated: 'Project created!', projectNotesTitle: '{project} Notes', failedCreateWiki: 'Failed to create wiki page.',
        noteAdded: 'Note added!', logoutConfirm: 'Logout?', uploadImageTitle: 'Attach Image',
        pasteUrl: 'Paste URL here', customTitle: 'Custom Title', tagsPlaceholder: 'Tags...', newPage: '+ New Page',
        uploadingProgress: 'Uploading... 0%', subpages: 'Subpages', newSubpage: 'New Subpage', deletePage: 'Delete Page',
        archiveDescription: 'Review your achievements and past thoughts', totalAchievements: 'Total Achievements', itemsArchived: 'Items Archived',
        monospace: 'Monospace', serif: 'Serif', handwritten: 'Handwritten', fontNanumGothic: 'Nanum Gothic',
        emptyTasksAllTitle: 'Fill your task list',
        emptyTasksAllBody: 'Keep tasks, due dates, and notes in one place.<br>Add your first task above to start the flow.',
        emptyTasksCompletedTitle: 'No completed tasks yet',
        emptyTasksCompletedBody: 'Finished tasks will collect here after you mark them complete.<br>Wrap up one small task to start your progress log.',
        emptyTasksActiveTitle: 'No tasks in progress',
        emptyTasksActiveBody: 'Nothing needs your attention right now.<br>When new work appears, add it above to keep the active list moving.',
        emptyTasksImportantTitle: 'No important tasks',
        emptyTasksImportantBody: 'Tasks marked High priority appear here.<br>Use this view for work that should not slip.',
        emptyTasksRemindersTitle: 'No upcoming reminders',
        emptyTasksRemindersBody: 'Incomplete tasks with due dates appear here.<br>Add a due date to any task that needs a reminder.',
        firstTaskTitle: 'Fill your task list',
        firstTaskBody: 'Keep tasks, due dates, and notes in one place.<br>Add your first task above to start the flow.',
        firstTaskButton: 'Add first task', firstNoteTitle: 'Fill your note board',
        firstNoteBody: 'Keep ideas and quick records like sticky notes.<br>Write your first note above and place it on the board.',
        firstNoteButton: 'Write first note', firstProjectTitle: 'Create your first project',
        firstProjectBody: 'Grouping work and ideas by topic makes planning faster.<br>Add your first project above to connect related work.',
        firstProjectButton: 'Create first project', firstBookmarkTitle: 'Save your first bookmark',
        firstBookmarkBody: 'Collect frequently referenced links with tags.<br>Paste a URL above to save your first bookmark.',
        firstBookmarkButton: 'Save first bookmark', emptyArchiveTitle: 'Archive is empty',
        emptyArchiveBody: 'Completed or tucked-away tasks will collect here.<br>Archive items from Tasks to restore them later.',
        expandSidebar: 'Expand sidebar', collapseSidebar: 'Collapse sidebar',
        openPageFirst: 'Open a page first', untitledProject: 'Untitled Project', noPagesFound: 'No pages found',
        createFirstSubpage: 'Create first subpage', subpageEmptyHelp: 'Keep related notes nested under this page.',
        openSubpage: 'Open subpage', loginFirst: 'Please login first', failedCreatePage: 'Failed to create page',
        cannotSaveNotReady: 'Cannot save: not ready', saving: 'Saving...', pageSaved: 'Page saved',
        saveFailed: 'Save failed', deletePageConfirm: 'Delete this page?',
        deletePageWithSubpagesConfirm: 'Delete this page and {count} subpage(s)?', pageDeleted: 'Page deleted',
        failedDeletePage: 'Failed to delete page', mathPlaceholder: 'Enter KaTeX formula (e.g. \\sum_{i=1}^n i = \\frac{n(n+1)}{2})',
        headingShortcutFailed: 'Heading shortcut failed', undoFailed: 'Undo failed', headingPlaceholder: 'Enter a heading',
        loginFirstOrStorage: 'Please login first or Firebase is not initialized', uploadFailed: 'Upload failed',
        editorPlaceholder: 'Type "/" for commands...', wikiEmptyTitle: 'Fill your knowledge base',
        wikiEmptyBody: 'Your own wiki space for organizing thoughts and ideas.<br>Select a document from the left or create a new one to start.',
        createNewPage: 'Create new page', inspirationTitle: 'Inspiration from past notes',
        onboardingEyebrow: 'Welcome to Planary',
        onboardingTitle: 'Organize work into one flow',
        onboardingWelcomeTitle: 'Welcome to Planary, {name}',
        onboardingWelcomeBody: 'Connect tasks, quick thoughts, and long-form notes naturally inside Planary.',
        onboardingWelcomeHint: 'Spend a few minutes trying tasks, projects, sticky notes, and wiki in the real interface.',
        onboardingBeginGuide: 'Start guide',
        onboardingLanguageLabel: 'Choose guide language',
        onboardingIntro: 'To get started, remember this flow: create tasks, group them into projects, and keep important context in wiki pages.',
        onboardingTaskCreateTitle: 'Create a task',
        onboardingTaskCreateBody: 'Start the flow by creating one task for today.',
        onboardingTaskCreateTarget: 'Type a task in the input and press Add Task to complete this step.',
        onboardingTaskCreateWhy: 'Move work out of your head and into a visible list.',
        onboardingTaskCreateExample: 'Example: Prepare today’s meeting notes',
        onboardingTaskCreateDone: 'This step completes after you add one task.',
        onboardingTaskCreateTip: 'Write one short task here.',
        onboardingTaskCreateInputTip: 'Type the task name first.',
        onboardingTaskCreateInputTarget: 'Type a task, then press Next position.',
        onboardingTaskCreateButtonTip: 'Now press Add Task yourself to finish.',
        onboardingTaskCreateButtonTarget: 'Press Add Task to complete this step.',
        onboardingTaskDetailsTitle: 'Add task details',
        onboardingTaskDetailsBody: 'Tasks can carry notes, due dates, and priority.',
        onboardingTaskDetailsTarget: 'Add a note or due date, or change priority, then create the task.',
        onboardingTaskDetailsWhy: 'Due dates appear in reminders, and high priority collects in Important.',
        onboardingTaskDetailsExample: 'Example: note “draft first”, due today, priority high',
        onboardingTaskDetailsDone: 'This step completes when you add a task with details.',
        onboardingTaskDetailsTip: 'Changing one detail is enough.',
        onboardingTaskDetailsNameTip: 'Type the task name before adding details.',
        onboardingTaskDetailsNameTarget: 'Type a task name, then press Next position.',
        onboardingTaskDetailsMemoTip: 'Add a short note for context.',
        onboardingTaskDetailsMemoTarget: 'Enter a note, then press Next position.',
        onboardingTaskDetailsDateTip: 'A due date makes the task show up in Reminders.',
        onboardingTaskDetailsDateTarget: 'Pick a due date, then press Next position.',
        onboardingTaskDetailsPriorityTip: 'High priority collects in the Important filter.',
        onboardingTaskDetailsPriorityTarget: 'Change priority, then press Next position.',
        onboardingTaskDetailsButtonTip: 'Add the detailed task.',
        onboardingTaskDetailsButtonTarget: 'Press Add Task to complete this step.',
        onboardingTaskManageTitle: 'Edit and organize tasks',
        onboardingTaskManageBody: 'Created tasks can be edited, completed, and archived.',
        onboardingTaskManageTarget: 'Use Edit, Complete, or Archive on a task card.',
        onboardingTaskManageWhy: 'Mark finished work complete and archive work you do not need to see right now.',
        onboardingTaskManageExample: 'Example: edit the title or mark the task complete',
        onboardingTaskManageDone: 'This step completes after you use Edit, Complete, or Archive.',
        onboardingTaskManageTip: 'Use the buttons under a task card.',
        onboardingTaskViewsTitle: 'Use important and reminder views',
        onboardingTaskViewsBody: 'High-priority and dated tasks can be reviewed with filters.',
        onboardingTaskViewsTarget: 'Open the Important or Reminders filter to complete this step.',
        onboardingTaskViewsWhy: 'Narrow the list to urgent work or dated work quickly.',
        onboardingTaskViewsExample: 'Example: high priority goes to Important; dated tasks go to Reminders',
        onboardingTaskViewsDone: 'This step completes after you open Important or Reminders.',
        onboardingTaskViewsTip: 'Tap a filter to see the list change.',
        onboardingProjectsTitle: 'Group work into projects',
        onboardingProjectsBody: 'Projects connect tasks, reminders, and wiki pages.',
        onboardingProjectsTarget: 'Enter a project name and press Create Project.',
        onboardingProjectsWhy: 'Keep related tasks and notes under one topic.',
        onboardingProjectsExample: 'Example: Work, Study, Side Project',
        onboardingProjectsDone: 'This step completes after you create one project.',
        onboardingProjectsTip: 'Use a short topic name.',
        onboardingProjectsInputTip: 'Type a project name.',
        onboardingProjectsInputTarget: 'Type a name, then press Next position.',
        onboardingProjectsButtonTip: 'Press Create Project yourself to finish.',
        onboardingProjectsButtonTarget: 'Press Create Project to complete this step.',
        onboardingNotesCreateTitle: 'Create a sticky note',
        onboardingNotesCreateBody: 'Capture quick ideas and notes on the sticky board.',
        onboardingNotesCreateTarget: 'Choose a color, write a note, and press Add Note.',
        onboardingNotesCreateWhy: 'Save thoughts that matter but are not tasks yet.',
        onboardingNotesCreateExample: 'Example: Question to ask in the next meeting',
        onboardingNotesCreateDone: 'This step completes after you add one sticky note.',
        onboardingNotesCreateTip: 'Pick a color and write a short note.',
        onboardingNotesColorTip: 'Choose a note color first.',
        onboardingNotesColorTarget: 'Review the colors, then press Next position.',
        onboardingNotesInputTip: 'Write something worth remembering that is not a task.',
        onboardingNotesInputTarget: 'Type a note, then press Next position.',
        onboardingNotesButtonTip: 'Press Add Note yourself to finish.',
        onboardingNotesButtonTarget: 'Press Add Note to complete this step.',
        onboardingNotesManageTitle: 'Manage sticky notes',
        onboardingNotesManageBody: 'Notes can be edited, deleted, and dragged into place.',
        onboardingNotesManageTarget: 'Use Edit or Delete on a note card.',
        onboardingNotesManageWhy: 'Refine ideas as they change and remove notes you no longer need.',
        onboardingNotesManageExample: 'Example: edit the note or drag it to a better spot',
        onboardingNotesManageDone: 'This step completes after you use Edit or Delete.',
        onboardingNotesManageTip: 'Use the buttons under a sticky note.',
        onboardingWikiTitle: 'Keep context in wiki',
        onboardingWikiBody: 'Organize meetings, ideas, and references into pages and subpages.',
        onboardingWikiTarget: 'Create or open a wiki page to complete this step.',
        onboardingWikiWhy: 'Move longer context out of tasks and into documents.',
        onboardingWikiExample: 'Example: meeting notes, idea draft, reference links',
        onboardingWikiDone: 'This step completes after you create or open a wiki page.',
        onboardingWikiTip: 'Start a longer record with New Page.',
        onboardingWikiButtonTip: 'Start a longer record with New Page.',
        onboardingWikiButtonTarget: 'Press New Page to complete this step.',
        onboardingWhyLabel: 'Why use it',
        onboardingExampleLabel: 'Try this',
        onboardingDoneLabel: 'Done when',
        onboardingStepSummary: '{done} done, step {current} in progress, {remaining} left',
        onboardingShowSteps: 'Show all steps',
        onboardingHideSteps: 'Hide steps',
        onboardingNextFocus: 'Next position',
        onboardingClickToComplete: 'Click to complete',
        onboardingNeedInput: 'Enter something first.',
        onboardingExit: 'Exit guide', onboardingSkipStep: 'Skip this step', onboardingStartStep: 'Start this step',
        onboardingNextStep: 'Next step', onboardingComplete: 'Done', onboardingProgressText: '{current} / {total}',
        onboardingDone: 'Done', onboardingSkipped: 'Skipped', onboardingPending: 'Pending',
        onboardingLater: 'Maybe later', onboardingStart: 'Create a task', backToList: 'Back to list',
        toggleTheme: 'Toggle theme', toggleNavigation: 'Toggle navigation', attachment: 'Attachment',
        katexNotLoaded: 'KaTeX not loaded.', syntaxError: 'Syntax Error'
    }
};

function t(key) {
    return (I18N[currentLanguage] && I18N[currentLanguage][key]) || I18N.ko[key] || key;
}

function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

function setHtml(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = value;
}

function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
}

function setPlaceholder(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.placeholder = value;
}

function setTitle(selector, value) {
    const el = document.querySelector(selector);
    if (el) {
        el.title = value;
        el.setAttribute('aria-label', value);
    }
}

function setOptionText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

function formatText(key, values = {}) {
    return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

function setButtonTextPreserveIcon(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return;
    const icon = el.querySelector('svg');
    el.textContent = '';
    if (icon) {
        el.appendChild(icon);
        el.appendChild(document.createTextNode(' '));
    }
    el.appendChild(document.createTextNode(value));
}

window.PlanaryI18n = {
    t: (key) => t(key),
    format: (key, values) => formatText(key, values),
    getLanguage: () => currentLanguage
};

function applyAppFont(font = currentAppFont) {
    const supportedFont = APP_FONT_OPTIONS.some(option => option.value === font);
    currentAppFont = (!font || font === 'var(--font)' || !supportedFont) ? DEFAULT_APP_FONT : font;
    localStorage.setItem('planary-app-font', currentAppFont);
    document.documentElement.style.setProperty('--font', currentAppFont);
    const fontSelect = getEl('app-font-select');
    if (fontSelect) fontSelect.value = currentAppFont;
}

function renderFontOptions() {
    const fontSelect = getEl('app-font-select');
    if (!fontSelect) return;
    fontSelect.innerHTML = APP_FONT_OPTIONS.map(option => {
        const label = option.label || t(option.labelKey);
        return `<option value="${escapeHtml(option.value)}">${escapeHtml(label)}</option>`;
    }).join('');
    fontSelect.value = currentAppFont;
    if (fontSelect.value !== currentAppFont) {
        fontSelect.value = DEFAULT_APP_FONT;
    }
}

function applyLanguage(lang = currentLanguage) {
    currentLanguage = lang;
    localStorage.setItem('planary-language', lang);
    document.documentElement.lang = lang === 'ko' ? 'ko' : 'en';

    setAllText('[data-target="page-home"] span, .fab-item[data-target="page-home"] .fab-label', t('home'));
    setAllText('[data-target="page-tasks"]:not(.task-subnav-link) span, .fab-item[data-target="page-tasks"] .fab-label', t('tasks'));
    setAllText('[data-target="page-projects"] span, .fab-item[data-target="page-projects"] .fab-label', t('projects'));
    setAllText('[data-target="page-notes"] span, .fab-item[data-target="page-notes"] .fab-label', t('notes'));
    setAllText('[data-target="page-wiki"] span, .fab-item[data-target="page-wiki"] .fab-label', t('wiki'));
    setAllText('[data-target="page-bookmarks"] span, .fab-item[data-target="page-bookmarks"] .fab-label', t('bookmarks'));
    setAllText('[data-target="page-archive"] span, .fab-item[data-target="page-archive"] .fab-label', t('archive'));
    setAllText('[data-target="page-profile"] span, .fab-item[data-target="page-profile"] .fab-label', t('myPage'));
    document.querySelectorAll('[data-target="page-home"]').forEach(el => el.title = t('home'));
    document.querySelectorAll('[data-target="page-tasks"]').forEach(el => el.title = t('tasks'));
    document.querySelectorAll('[data-target="page-projects"]').forEach(el => el.title = t('projects'));
    document.querySelectorAll('[data-target="page-notes"]').forEach(el => el.title = t('notes'));
    document.querySelectorAll('[data-target="page-wiki"]').forEach(el => el.title = t('wiki'));
    document.querySelectorAll('[data-target="page-bookmarks"]').forEach(el => el.title = t('bookmarks'));
    document.querySelectorAll('[data-target="page-archive"]').forEach(el => el.title = t('archive'));
    document.querySelectorAll('[data-target="page-profile"]').forEach(el => el.title = t('myPage'));
    setText('.task-subnav-link[data-filter="all"]', t('allTasks'));
    setText('.task-subnav-link[data-filter="active"]', t('progress'));
    setText('.task-subnav-link[data-filter="important"]', t('important'));
    setText('.task-subnav-link[data-filter="reminders"]', t('reminders'));

    setText('#page-home .main-header h1', t('dashboardTitle'));
    setText('#dashboard-welcome-text', t('dashboardSubtitle'));
    setText('#today-hub-kicker', t('todayOverview'));
    setText('#today-hub-title', t('todayHubTitle'));
    setText('#today-due-label', t('todayDue'));
    setText('#today-important-label', t('todayImportant'));
    setText('#today-project-label', t('todayProjects'));
    setText('#today-focus-title', t('todayFocusTitle'));
    setText('#today-projects-title', t('activeProjectsTitle'));
    setButtonTextPreserveIcon('.today-hub-actions .confirm-btn', t('openTasks'));
    setButtonTextPreserveIcon('.today-hub-actions .text-link-btn', t('important'));
    const statLabels = document.querySelectorAll('.dashboard-stats-row .stat-label');
    if (statLabels[0]) statLabels[0].textContent = t('totalTasks');
    if (statLabels[1]) statLabels[1].textContent = t('completed');
    if (statLabels[2]) statLabels[2].textContent = t('productivity');
    setText('.dashboard-widget:nth-child(1) .widget-header h3', t('recentNotes'));
    setText('.dashboard-widget:nth-child(2) .widget-header h3', t('upcomingReminders'));
    setAllText('.widget-header .text-link-btn', t('viewAll'));

    setText('#welcome-message', t('taskTitle'));
    setText('.filter-chip[data-filter="all"]', t('allTasks'));
    setText('.filter-chip[data-filter="completed"]', t('completed'));
    setText('.filter-chip[data-filter="active"]', t('progress'));
    setText('.filter-chip[data-filter="important"]', t('important'));
    setText('.filter-chip[data-filter="reminders"]', t('reminders'));
    setText('#add-btn', t('addTask'));
    setPlaceholder('#todo-input', t('taskPlaceholder'));
    setPlaceholder('#memo-input', t('memoPlaceholder'));
    setPlaceholder('#search-input', t('searchTasks'));
    setTitle('#task-img-upload-btn', t('uploadImageTitle'));
    setOptionText('#priority-select option[value="low"]', t('low'));
    setOptionText('#priority-select option[value="medium"]', t('medium'));
    setOptionText('#priority-select option[value="high"]', t('high'));
    renderFontOptions();

    setText('#page-projects .main-header h1', t('projectsTitle'));
    setText('#page-projects .main-header p', t('projectsSubtitle'));
    setPlaceholder('#project-input', t('projectPlaceholder'));
    setText('#add-project-btn', t('createProject'));
    setButtonTextPreserveIcon('.project-detail-kicker', t('projectWorkspace'));
    setText('#project-detail-summary', t('projectSummary'));
    const projectSectionTitles = document.querySelectorAll('.project-detail-section-header h3');
    if (projectSectionTitles[0]) projectSectionTitles[0].textContent = t('tasks');
    if (projectSectionTitles[1]) projectSectionTitles[1].textContent = t('reminders');
    if (projectSectionTitles[2]) projectSectionTitles[2].textContent = t('wiki');
    setButtonTextPreserveIcon('#project-view-tasks-btn', t('openTasks'));
    setButtonTextPreserveIcon('#project-view-reminders-btn', t('openReminders'));
    setButtonTextPreserveIcon('#project-create-wiki-btn', t('newWikiPage'));

    setText('#page-notes .main-header h1', t('stickyNotes'));
    setPlaceholder('#note-input', t('notePlaceholder'));
    setText('#add-note-btn', t('addNote'));
    setText('#page-bookmarks .main-header h1', t('bookmarksTitle'));
    setText('#page-bookmarks .main-header p', t('bookmarksSubtitle'));
    setText('#add-bm-btn', t('saveBookmark'));
    setPlaceholder('#bm-url-input', t('pasteUrl'));
    setPlaceholder('#bm-title-input', t('customTitle'));
    setPlaceholder('#bm-tags-input', t('tagsPlaceholder'));
    setText('#page-wiki .main-header h1', t('docsWiki'));
    setText('#page-wiki .main-header p', t('wikiSubtitle'));
    setPlaceholder('#wiki-search-input', t('searchPages'));
    setText('#new-wiki-btn', t('newPage'));
    setPlaceholder('#wiki-title-input', t('untitledDocument'));
    setOptionText('#wiki-project-select option[value=""]', t('noProject'));
    setText('#wiki-upload-text', t('uploadingProgress'));
    setText('.wiki-project-control label', t('projectLabel'));
    setText('#wiki-subpages-section h3', t('subpages'));
    setText('#wiki-create-subpage-btn', t('newSubpage'));
    setText('#wiki-save-btn', t('saveChanges'));
    setText('#wiki-delete-btn', t('deletePage'));
    setText('#wiki-empty-view h2', t('wikiEmptyTitle'));
    setHtml('#wiki-empty-view p', t('wikiEmptyBody'));
    setText('#wiki-empty-create-btn span', t('createNewPage'));
    setText('#page-archive .main-header h1', t('archiveTitle'));
    setText('#page-archive .main-header p', t('archiveDescription'));
    const archiveStatLabels = document.querySelectorAll('#page-archive .archive-stat-card .stat-label');
    if (archiveStatLabels[0]) archiveStatLabels[0].textContent = t('totalAchievements');
    if (archiveStatLabels[1]) archiveStatLabels[1].textContent = t('itemsArchived');
    setText('.archive-list-section .section-header h3', t('archivedTasks'));
    setText('#empty-archive-btn', t('emptyArchive'));
    setText('.inspiration-header span', t('inspirationTitle'));

    setText('#page-profile .main-header h1', t('profileTitle'));
    const profileLabels = document.querySelectorAll('.profile-card > p strong');
    if (profileLabels[0]) profileLabels[0].textContent = t('nameLabel');
    if (profileLabels[1]) profileLabels[1].textContent = t('emailLabel');
    if (profileLabels[2]) profileLabels[2].textContent = t('loginMethodsLabel');
    setText('#profile-language-label', t('languageLabel'));
    setText('#profile-font-label', t('appFontLabel'));
    setText('.profile-guide-panel h3', t('guideTitle'));
    setText('.profile-guide-panel p', t('guideDescription'));
    setText('#profile-guide-btn', t('replayGuide'));
    setText('.profile-password-panel h3', t('emailPasswordLogin'));
    const passwordLabels = document.querySelectorAll('.profile-password-grid label');
    if (passwordLabels[0]) passwordLabels[0].childNodes[0].textContent = `${t('newPassword')} `;
    if (passwordLabels[1]) passwordLabels[1].childNodes[0].textContent = `${t('confirmPassword')} `;
    setPlaceholder('#profile-password', t('passwordPlaceholder'));
    setPlaceholder('#profile-password-confirm', t('confirmPasswordPlaceholder'));
    setText('#profile-logout-btn', t('logout'));
    setText('#task-edit-title', t('editTaskTitle'));
    setText('#task-edit-text-label', t('taskNameLabel'));
    setText('#task-edit-memo-label', t('taskMemoLabel'));
    setText('#task-edit-date-label', t('dueDateLabel'));
    setText('#task-edit-priority-label', t('priorityLabel'));
    setText('#task-edit-project-label', t('projectSelectLabel'));
    setOptionText('#task-edit-priority option[value="low"]', t('low'));
    setOptionText('#task-edit-priority option[value="medium"]', t('medium'));
    setOptionText('#task-edit-priority option[value="high"]', t('high'));
    setText('#task-edit-cancel-btn', t('cancel'));
    setText('#task-edit-save-btn', t('saveTaskChanges'));
    setText('#task-delete-title', t('deleteTaskTitle'));
    setText('#task-delete-body', t('deleteTaskBody'));
    setText('#task-delete-cancel-btn', t('deleteTaskCancel'));
    setText('#task-delete-confirm-btn', t('deleteTaskConfirm'));
    setText('.onboarding-eyebrow', t('onboardingEyebrow'));
    setText('#onboarding-title', t('onboardingTitle'));
    setText('.onboarding-intro', t('onboardingIntro'));
    setTitle('#onboarding-exit-btn', t('onboardingExit'));
    setText('#onboarding-skip-btn', t('onboardingSkipStep'));
    renderOnboarding();

    setTitle('#menu-toggle', t('toggleNavigation'));
    setTitle('#fab-trigger', t('toggleNavigation'));
    setTitle('#theme-toggle-btn', t('toggleTheme'));
    setTitle('#logout-btn', t('logout'));
    setTitle('#wiki-back-btn', t('backToList'));

    const languageSelect = getEl('app-language-select');
    if (languageSelect) languageSelect.value = currentLanguage;
    updateSidebarHeader((window.location.hash || '#page-home').replace('#', '').startsWith('wiki/') ? 'page-wiki' : ((window.location.hash || '#page-home').replace('#', '') || 'page-home'));
    renderProjectsDropdown();
    if (currentUser) updateProfileUI(currentUser);
    applyFilters();
    renderNotes(allNotes);
    renderProjectManagementList();
    renderBookmarks();
    renderArchive();
    updateDashboardUI();
    window.dispatchEvent(new CustomEvent('planary-language-change'));
}

// --- CORE BUSINESS LOGIC (HOISTED) ---
function loadTodos() {
    if (!currentUser || !db) return;
    db.collection('todos').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
        allTodos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFilters();
        updateDashboardUI();
        renderProjectManagementList();
        checkDueNotifications(); // Check for reminders when data updates
    });
}

function loadNotes() {
    if (!currentUser || !db) return;
    db.collection('notes').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
        allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNotes(allNotes);
        updateDashboardUI();
    });
}

function loadProjects() {
    if (!currentUser || !db) return;
    db.collection('projects').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
        allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProjectsDropdown();
        renderProjectManagementList();
    });
}

function loadBookmarks() {
    if (!currentUser || !db) return;
    db.collection('bookmarks').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
        allBookmarks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderBookmarks();
    });
}

function loadWikiPagesForProjects() {
    if (!currentUser || !db) return;
    db.collection('wiki_pages').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
        allWikiPages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderProjectManagementList();
        renderProjectOverview();
    });
}

function applyFilters() {
    const searchInput = getEl('search-input');
    const term = searchInput ? searchInput.value.toLowerCase() : "";
    let filtered = allTodos.filter(t => 
        (t.text && t.text.toLowerCase().includes(term)) || 
        (t.memo && t.memo.toLowerCase().includes(term))
    );
    
    if (currentProjectId) filtered = filtered.filter(t => t.projectId === currentProjectId);
    
    if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed && !t.archived);
    else if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed && !t.archived);
    else if (currentFilter === 'important') filtered = filtered.filter(t => t.priority === 'high' && !t.archived);
    else if (currentFilter === 'reminders') filtered = filtered.filter(t => t.dueDate && !t.completed && !t.archived);
    else if (currentFilter === 'archive') filtered = filtered.filter(t => t.archived);
    else filtered = filtered.filter(t => !t.archived);
    
    filtered.sort((a, b) => getTaskSortValue(b) - getTaskSortValue(a));
    renderTodos(filtered);
}

function getTaskSortValue(task) {
    if (typeof task.orderIndex === 'number') return task.orderIndex;
    const createdAt = task.createdAt;
    if (createdAt && typeof createdAt.toMillis === 'function') return createdAt.toMillis();
    if (createdAt) {
        const parsed = new Date(createdAt).getTime();
        if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
}

function switchPage(targetId) {
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const targetPage = getEl(targetId);
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('[data-target]').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('[data-target]').forEach(el => {
        if (el.getAttribute('data-target') === targetId) {
            const f = el.getAttribute('data-filter');
            if (targetId !== 'page-tasks' || f === currentFilter || (!f && currentFilter === 'all')) el.classList.add('active');
        }
    });
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) sidebarNav.classList.toggle('task-subnav-open', targetId === 'page-tasks');
    document.querySelectorAll('.task-subnav-link').forEach(link => {
        link.classList.toggle('active', targetId === 'page-tasks' && link.dataset.filter === currentFilter);
    });
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', targetId === 'page-tasks' && chip.dataset.filter === currentFilter);
    });
    
    updateSidebarHeader(targetId);
    document.body.classList.remove('nav-open');
    const fab = getEl('mobile-nav-container');
    if (fab) fab.classList.remove('active');
    
    if (targetId === 'page-tasks') applyFilters();
    if (targetId === 'page-archive') renderArchive();
}

function navigateAppPage(targetId, filter = null) {
    if (targetId === 'page-tasks') {
        currentFilter = filter || 'all';
        currentProjectId = null;
    }

    const nextHash = `#${targetId}`;
    if (window.location.hash === nextHash) {
        switchPage(targetId);
    } else {
        window.location.hash = targetId;
    }
}

function updateSidebarHeader(pageId) {
    const iconBox = getEl('sidebar-header-icon'), titleEl = getEl('sidebar-header-title'), subtitleEl = getEl('sidebar-header-subtitle');
    if (!iconBox || !titleEl) return;
    const mapper = {
        'page-home': { title: t('overviewHeader'), subtitle: t('overviewSubtitle'), icon: appIconSvg('home') },
        'page-tasks': { title: t('taskHeaderTitle'), subtitle: t('taskHeaderSubtitle'), icon: appIconSvg('tasks') },
        'page-projects': { title: t('projectHeader'), subtitle: t('projectSubtitle'), icon: appIconSvg('projects') },
        'page-notes': { title: t('notesHeader'), subtitle: t('notesSubtitle'), icon: appIconSvg('notes') },
        'page-bookmarks': { title: t('bookmarksHeader'), subtitle: t('bookmarksHeaderSubtitle'), icon: appIconSvg('bookmarks') },
        'page-archive': { title: t('archiveHeader'), subtitle: t('archiveSubtitle'), icon: appIconSvg('archive') },
        'page-profile': { title: t('profileTitle'), subtitle: t('myPageSubtitle'), icon: appIconSvg('profile') },
        'page-wiki': { title: t('wikiHeader'), subtitle: t('wikiHeaderSubtitle'), icon: appIconSvg('wiki') }
    };
    const config = mapper[pageId] || mapper['page-tasks'];
    iconBox.innerHTML = config.icon; titleEl.textContent = config.title; subtitleEl.textContent = config.subtitle;
}

function handleHash() {
    const hash = window.location.hash || '#page-home';
    let pageId = hash.replace('#', '');
    if (pageId.startsWith('wiki/')) pageId = 'page-wiki';
    if (getEl(pageId)) switchPage(pageId);
}

function updateProfileUI(user) {
    if (!user) return;
    const name = getUserGuideName(user);
    const providerLabels = {
        'google.com': t('googleProvider'),
        'password': t('emailPasswordProvider')
    };
    const providerIds = user.providerData.map(provider => provider.providerId);
    const hasPasswordProvider = providerIds.includes('password');
    if (getEl('user-name-sidebar')) getEl('user-name-sidebar').textContent = name;
    if (getEl('user-email-sidebar')) getEl('user-email-sidebar').textContent = user.email;
    if (getEl('user-photo')) {
        if (user.photoURL) getEl('user-photo').src = user.photoURL;
        const mobileAvatar = getEl('mobile-user-avatar');
        if (mobileAvatar) mobileAvatar.innerHTML = `<img src="${user.photoURL || getEl('user-photo').src}" alt="avatar">`;
    }
    if (getEl('profile-view-name')) getEl('profile-view-name').textContent = name;
    if (getEl('profile-view-email')) getEl('profile-view-email').textContent = user.email;
    if (getEl('profile-login-methods')) {
        getEl('profile-login-methods').textContent = providerIds.map(id => providerLabels[id] || id).join(', ') || t('emailPasswordProvider');
    }
    if (getEl('profile-password-help')) {
        getEl('profile-password-help').textContent = hasPasswordProvider
            ? t('emailPasswordAlreadyEnabled')
            : t('setPasswordHelp');
    }
    if (getEl('profile-password-btn')) {
        getEl('profile-password-btn').textContent = hasPasswordProvider ? t('updatePassword') : t('setPasswordLogin');
    }
}

function getAuthActionErrorMessage(error) {
    if (!error) return t('authUnknownError');
    if (error.code === 'auth/requires-recent-login') {
        return t('recentLoginRequired');
    }
    if (error.code === 'auth/weak-password') {
        return t('weakPassword');
    }
    if (error.code === 'auth/email-already-in-use' || error.code === 'auth/credential-already-in-use') {
        return t('emailAlreadyConnected');
    }
    if (error.code === 'auth/provider-already-linked') {
        return t('providerAlreadyLinked');
    }
    if (error.code === 'auth/operation-not-allowed') {
        return t('emailPasswordDisabled');
    }
    return error.message || t('authFailed');
}

async function connectEmailPasswordLogin() {
    if (!auth || !auth.currentUser) return;

    const user = auth.currentUser;
    const passwordInput = getEl('profile-password');
    const confirmInput = getEl('profile-password-confirm');
    const button = getEl('profile-password-btn');
    const status = getEl('profile-password-status');
    const password = passwordInput ? passwordInput.value : '';
    const confirmPassword = confirmInput ? confirmInput.value : '';
    const hasPasswordProvider = user.providerData.some(provider => provider.providerId === 'password');

    const setStatus = (message, type = '') => {
        if (!status) return;
        status.textContent = message;
        status.className = `profile-status-text ${type}`.trim();
    };

    if (!user.email) {
        setStatus(t('noEmailToConnect'), 'error');
        return;
    }
    if (!password || password.length < 6) {
        setStatus(t('weakPassword'), 'error');
        return;
    }
    if (password !== confirmPassword) {
        setStatus(t('passwordMismatch'), 'error');
        return;
    }

    try {
        if (button) button.disabled = true;
        setStatus(hasPasswordProvider ? t('updatingPassword') : t('connectingEmailPassword'));

        if (hasPasswordProvider) {
            await user.updatePassword(password);
        } else {
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            await user.linkWithCredential(credential);
        }

        if (passwordInput) passwordInput.value = '';
        if (confirmInput) confirmInput.value = '';
        await user.reload();
        currentUser = auth.currentUser;
        updateProfileUI(currentUser);
        setStatus(t('emailPasswordDone'), 'success');
        showToast(t('emailPasswordEnabled'));
    } catch (error) {
        setStatus(getAuthActionErrorMessage(error), 'error');
    } finally {
        if (button) button.disabled = false;
    }
}

function createDefaultOnboardingProgress() {
    return GUIDE_STEP_IDS.reduce((progress, id) => {
        progress[id] = 'pending';
        return progress;
    }, {});
}

function getUserGuideName(user = currentUser) {
    if (!user) return currentLanguage === 'ko' ? '사용자' : 'there';
    return user.displayName || (user.email ? user.email.split('@')[0] : (currentLanguage === 'ko' ? '사용자' : 'there'));
}

function normalizeOnboardingProgress(progress = {}) {
    const legacy = progress || {};
    return GUIDE_STEP_IDS.reduce((normalized, id) => {
        if (id === 'taskCreate' && GUIDE_STATUS.includes(legacy.tasks)) {
            normalized[id] = legacy.tasks;
            return normalized;
        }
        const status = progress && GUIDE_STATUS.includes(progress[id]) ? progress[id] : 'pending';
        normalized[id] = status;
        return normalized;
    }, {});
}

function getNextGuideStepId(progress = onboardingState?.progress) {
    const normalized = normalizeOnboardingProgress(progress);
    return GUIDE_STEP_IDS.find(id => normalized[id] === 'pending') || null;
}

function isOnboardingFinished(progress = onboardingState?.progress) {
    return !getNextGuideStepId(progress);
}

function buildOnboardingState(data = {}) {
    const progress = normalizeOnboardingProgress(data.onboardingProgress || {});
    const currentStep = GUIDE_STEP_IDS.includes(data.onboardingCurrentStep) && progress[data.onboardingCurrentStep] === 'pending'
        ? data.onboardingCurrentStep
        : getNextGuideStepId(progress);
    return {
        completed: Boolean(data.onboardingCompleted),
        progress,
        currentStep
    };
}

function clearOnboardingHighlight() {
    if (onboardingHighlightTimer) {
        clearTimeout(onboardingHighlightTimer);
        onboardingHighlightTimer = null;
    }
    if (onboardingRepositionFrame) {
        cancelAnimationFrame(onboardingRepositionFrame);
        onboardingRepositionFrame = null;
    }
    if (onboardingScrollSettleTimer) {
        clearTimeout(onboardingScrollSettleTimer);
        onboardingScrollSettleTimer = null;
    }
    if (onboardingHighlightEl) {
        onboardingHighlightEl.classList.remove('onboarding-highlight-target');
        onboardingHighlightEl = null;
    }
    onboardingLastTargetRect = null;
    onboardingSpotlightEls.forEach(el => el.remove());
    onboardingSpotlightEls = [];
    const modal = getEl('onboarding-modal');
    const card = modal ? modal.querySelector('.onboarding-card') : null;
    if (modal) modal.classList.remove('positioned');
    if (card) {
        card.style.top = '';
        card.style.left = '';
        card.style.right = '';
        card.style.bottom = '';
    }
    document.body.classList.remove('onboarding-spotlight-active');
}

function closeOnboarding() {
    const modal = getEl('onboarding-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('compact');
        modal.classList.remove('steps-expanded');
        modal.classList.remove('welcome');
        modal.setAttribute('aria-hidden', 'true');
    }
    onboardingWelcomeVisible = false;
    clearOnboardingHighlight();
}

async function saveOnboardingState({ progress, currentStep, completed } = {}) {
    if (!currentUser || !db) return;
    const nextProgress = normalizeOnboardingProgress(progress || onboardingState?.progress || {});
    const done = completed ?? isOnboardingFinished(nextProgress);
    onboardingState = {
        completed: done,
        progress: nextProgress,
        currentStep: done ? null : (currentStep || getNextGuideStepId(nextProgress))
    };
    try {
        const payload = {
            uid: currentUser.uid,
            onboardingCompleted: done,
            onboardingProgress: nextProgress,
            onboardingCurrentStep: onboardingState.currentStep,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (done) payload.onboardingCompletedAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(currentUser.uid).set(payload, { merge: true });
    } catch (error) {
        console.warn('Onboarding state was not saved:', error);
    }
}

async function completeOnboarding() {
    const progress = normalizeOnboardingProgress(onboardingState?.progress || {});
    GUIDE_STEP_IDS.forEach(id => {
        if (progress[id] === 'pending') progress[id] = 'completed';
    });
    await saveOnboardingState({ progress, completed: true, currentStep: null });
    closeOnboarding();
}

function getOnboardingTarget(step) {
    return document.querySelector(step.focusSelector) || document.querySelector(step.fallbackSelector);
}

function getCurrentGuideStepId() {
    return onboardingState?.currentStep || getNextGuideStepId();
}

function getGuideFocusFlow(step) {
    return step?.focusFlow && step.focusFlow.length ? step.focusFlow : [{
        selector: step.focusSelector,
        fallbackSelector: step.fallbackSelector,
        tipKey: step.tipKey,
        targetKey: step.targetKey,
        waitFor: 'none'
    }];
}

function getCurrentGuideFocus() {
    const step = GUIDE_STEPS[getCurrentGuideStepId()];
    const flow = getGuideFocusFlow(step);
    return flow[Math.min(onboardingFocusIndex, flow.length - 1)];
}

function getOnboardingFocusTarget(focus) {
    if (!focus) return null;
    return document.querySelector(focus.selector) || (focus.fallbackSelector ? document.querySelector(focus.fallbackSelector) : null);
}

function isTabletGuideLayout() {
    return window.matchMedia('(min-width: 768px) and (max-width: 1366px)').matches;
}

function getTargetRectSnapshot(target) {
    const rect = target.getBoundingClientRect();
    return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height
    };
}

function targetRectMovedEnough(rect, lastRect = onboardingLastTargetRect) {
    if (!lastRect) return true;
    return Math.abs(rect.top - lastRect.top) > 12 ||
        Math.abs(rect.left - lastRect.left) > 12 ||
        Math.abs(rect.width - lastRect.width) > 8 ||
        Math.abs(rect.height - lastRect.height) > 8;
}

function canAdvanceGuideFocus() {
    const focus = getCurrentGuideFocus();
    const target = getOnboardingFocusTarget(focus);
    if (!focus || !target) return false;
    if (focus.waitFor === 'input-not-empty') {
        return 'value' in target ? Boolean(String(target.value || '').trim()) : Boolean(target.textContent.trim());
    }
    return true;
}

function highlightCurrentGuideFocus(retryCount = 0) {
    const step = GUIDE_STEPS[getCurrentGuideStepId()];
    const focus = getCurrentGuideFocus();
    if (!step || !focus) return;
    highlightOnboardingTarget(step, focus, retryCount);
}

function highlightOnboardingTarget(stepOrId, focusConfig = null, retryCount = 0) {
    clearOnboardingHighlight();
    const step = typeof stepOrId === 'string' ? GUIDE_STEPS[stepOrId] : stepOrId;
    if (!step) return;
    const focus = focusConfig || getGuideFocusFlow(step)[0];
    const target = getOnboardingFocusTarget(focus) || getOnboardingTarget(step);
    if (!target && retryCount < 3) {
        onboardingHighlightTimer = setTimeout(() => highlightOnboardingTarget(step, focus, retryCount + 1), 160);
        return;
    }
    if (!target) return;
    onboardingHighlightEl = target;
    onboardingLastTargetRect = getTargetRectSnapshot(target);
    document.body.classList.add('onboarding-spotlight-active');
    target.classList.add('onboarding-highlight-target');
    if (!onboardingSuppressAutoScroll) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } else {
        // avoid fighting user touch-driven scrolling; only jump if fully outside viewport
        const rect = target.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
            target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }
    positionOnboardingSpotlight(target);
    positionOnboardingCardAroundTarget(target);
    setTimeout(() => {
        if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    }, 220);
}

function positionOnboardingSpotlight(target) {
    if (!target) return;
    if (!onboardingSpotlightEls.length) {
        onboardingSpotlightEls = Array.from({ length: 4 }, () => {
            const el = document.createElement('div');
            el.className = 'onboarding-spotlight-shade';
            document.body.appendChild(el);
            return el;
        });
    }

    requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const padding = 10;
        const left = Math.max(0, rect.left - padding);
        const top = Math.max(0, rect.top - padding);
        const right = Math.min(window.innerWidth, rect.right + padding);
        const bottom = Math.min(window.innerHeight, rect.bottom + padding);
        const areas = [
            { left: 0, top: 0, width: window.innerWidth, height: top },
            { left: 0, top: bottom, width: window.innerWidth, height: Math.max(0, window.innerHeight - bottom) },
            { left: 0, top, width: left, height: Math.max(0, bottom - top) },
            { left: right, top, width: Math.max(0, window.innerWidth - right), height: Math.max(0, bottom - top) }
        ];
        onboardingSpotlightEls.forEach((el, index) => {
            const area = areas[index];
            el.style.left = `${area.left}px`;
            el.style.top = `${area.top}px`;
            el.style.width = `${area.width}px`;
            el.style.height = `${area.height}px`;
        });
    });
}

function positionOnboardingCardAroundTarget(target) {
    const modal = getEl('onboarding-modal');
    const card = modal ? modal.querySelector('.onboarding-card') : null;
    if (!modal || !card || window.matchMedia('(max-width: 520px)').matches) return;
    modal.classList.add('positioned');
    modal.classList.toggle('tablet-stable', isTabletGuideLayout());
    card.style.top = '';
    card.style.left = '';
    card.style.right = '';
    card.style.bottom = '';
    if (isTabletGuideLayout()) return;

    requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const margin = 18;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const fitsRight = viewportW - rect.right >= cardRect.width + margin * 2;
        const fitsLeft = rect.left >= cardRect.width + margin * 2;
        const fitsBelow = viewportH - rect.bottom >= cardRect.height + margin * 2;
        const fitsAbove = rect.top >= cardRect.height + margin * 2;
        let left;
        let top;

        if (fitsRight) {
            left = rect.right + margin;
            top = rect.top + rect.height / 2 - cardRect.height / 2;
        } else if (fitsLeft) {
            left = rect.left - cardRect.width - margin;
            top = rect.top + rect.height / 2 - cardRect.height / 2;
        } else if (fitsBelow) {
            left = rect.left + rect.width / 2 - cardRect.width / 2;
            top = rect.bottom + margin;
        } else if (fitsAbove) {
            left = rect.left + rect.width / 2 - cardRect.width / 2;
            top = rect.top - cardRect.height - margin;
        } else {
            left = viewportW - cardRect.width - margin;
            top = margin;
        }

        card.style.left = `${Math.min(Math.max(left, margin), viewportW - cardRect.width - margin)}px`;
        card.style.top = `${Math.min(Math.max(top, margin), viewportH - cardRect.height - margin)}px`;
    });
}

function renderOnboarding() {
    const modal = getEl('onboarding-modal');
    if (!modal || !onboardingState) return;
    const progress = normalizeOnboardingProgress(onboardingState.progress);
    const stepId = onboardingState.currentStep || getNextGuideStepId(progress) || GUIDE_STEP_IDS[GUIDE_STEP_IDS.length - 1];
    const step = GUIDE_STEPS[stepId];
    const flow = getGuideFocusFlow(step);
    const currentFocus = flow[Math.min(onboardingFocusIndex, flow.length - 1)];
    const currentIndex = GUIDE_STEP_IDS.indexOf(stepId);
    const doneCount = GUIDE_STEP_IDS.filter(id => progress[id] !== 'pending').length;
    const progressFill = getEl('onboarding-progress-fill');
    const progressText = getEl('onboarding-progress-text');
    const stepIcon = getEl('onboarding-step-icon');
    const stepList = getEl('onboarding-step-list');
    const startBtn = getEl('onboarding-start-btn');
    const completeBtn = getEl('onboarding-complete-btn');
    const skipBtn = getEl('onboarding-skip-btn');
    const stepSummaryText = getEl('onboarding-step-summary-text');
    const toggleStepsBtn = getEl('onboarding-toggle-steps-btn');

    modal.classList.toggle('welcome', onboardingWelcomeVisible);
    setText('#onboarding-welcome-title', t('onboardingWelcomeTitle').replace('{name}', getUserGuideName()));
    setText('#onboarding-welcome-body', t('onboardingWelcomeBody'));
    setText('#onboarding-welcome-hint', t('onboardingWelcomeHint'));
    const languageChoice = modal.querySelector('.onboarding-language-choice');
    if (languageChoice) languageChoice.setAttribute('aria-label', t('onboardingLanguageLabel'));
    modal.querySelectorAll('.onboarding-language-option').forEach(button => {
        const active = button.dataset.guideLanguage === currentLanguage;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    setText('#onboarding-step-title', t(step.titleKey));
    setText('#onboarding-step-body', t(step.bodyKey));
    setText('#onboarding-step-tip', t((currentFocus && currentFocus.tipKey) || step.tipKey));
    setText('#onboarding-step-target', t((currentFocus && currentFocus.targetKey) || step.targetKey));
    setText('#onboarding-step-why', t(step.whyKey));
    setText('#onboarding-step-example', t(step.exampleKey));
    setText('#onboarding-step-done', t(step.doneKey));
    setText('#onboarding-why-label', t('onboardingWhyLabel'));
    setText('#onboarding-example-label', t('onboardingExampleLabel'));
    setText('#onboarding-done-label', t('onboardingDoneLabel'));
    if (stepIcon) stepIcon.innerHTML = appIconSvg(step.icon, 20);
    if (progressFill) progressFill.style.width = `${Math.max(doneCount, currentIndex + 1) / GUIDE_STEP_IDS.length * 100}%`;
    if (progressText) progressText.textContent = t('onboardingProgressText')
        .replace('{current}', String(Math.min(currentIndex + 1, GUIDE_STEP_IDS.length)))
        .replace('{total}', String(GUIDE_STEP_IDS.length));

    if (stepList) {
        stepList.innerHTML = GUIDE_STEP_IDS.map(id => {
            const item = GUIDE_STEPS[id];
            const status = progress[id];
            const labelKey = status === 'completed' ? 'onboardingDone' : (status === 'skipped' ? 'onboardingSkipped' : 'onboardingPending');
            return `<div class="onboarding-step-pill ${id === stepId ? 'active' : ''} ${status}">
                ${appIconSvg(item.icon, 16)}
                <span>${t(item.titleKey)}</span>
                <em>${t(labelKey)}</em>
            </div>`;
        }).join('');
    }

    if (stepSummaryText) {
        stepSummaryText.textContent = t('onboardingStepSummary')
            .replace('{done}', String(doneCount))
            .replace('{current}', String(Math.min(currentIndex + 1, GUIDE_STEP_IDS.length)))
            .replace('{remaining}', String(Math.max(GUIDE_STEP_IDS.length - doneCount - 1, 0)));
    }
    if (toggleStepsBtn && modal) {
        toggleStepsBtn.textContent = modal.classList.contains('steps-expanded') ? t('onboardingHideSteps') : t('onboardingShowSteps');
    }
    if (startBtn) {
        startBtn.textContent = onboardingWelcomeVisible ? t('onboardingBeginGuide') : t('onboardingStartStep');
        startBtn.style.display = onboardingHighlightEl ? 'none' : 'inline-flex';
    }
    if (completeBtn) {
        completeBtn.style.display = onboardingHighlightEl && !onboardingWelcomeVisible ? 'inline-flex' : 'none';
        completeBtn.textContent = onboardingFocusIndex >= flow.length - 1 ? t('onboardingClickToComplete') : t('onboardingNextFocus');
    }
    if (skipBtn) {
        skipBtn.disabled = isOnboardingFinished(progress);
        skipBtn.style.display = onboardingWelcomeVisible ? 'none' : 'inline-flex';
    }
}

async function markGuideStepComplete(stepId) {
    if (!currentUser || !db || !GUIDE_STEPS[stepId] || onboardingState?.completed) return;
    const progress = normalizeOnboardingProgress(onboardingState?.progress || {});
    if (progress[stepId] !== 'pending') return;
    progress[stepId] = 'completed';
    const nextStep = getNextGuideStepId(progress);
    await saveOnboardingState({ progress, currentStep: nextStep, completed: !nextStep });
    onboardingFocusIndex = 0;
    if (!nextStep) {
        closeOnboarding();
        return;
    }
    clearOnboardingHighlight();
    renderOnboarding();
}

window.PlanaryGuide = {
    markComplete: markGuideStepComplete
};

function repositionActiveOnboardingGuide() {
    if (!onboardingHighlightEl) return;
    const now = Date.now();
    if (now - onboardingLastReposition < onboardingRepositionThrottleMs) return;
    onboardingLastReposition = now;
    const step = GUIDE_STEPS[getCurrentGuideStepId()];
    const focus = getCurrentGuideFocus();
    if (onboardingRepositionFrame) cancelAnimationFrame(onboardingRepositionFrame);
    onboardingRepositionFrame = requestAnimationFrame(() => {
        onboardingRepositionFrame = null;
        const rect = getTargetRectSnapshot(onboardingHighlightEl);
        if (!targetRectMovedEnough(rect)) return;
        onboardingLastTargetRect = rect;
        positionOnboardingSpotlight(onboardingHighlightEl);
        if (!isTabletGuideLayout()) {
            positionOnboardingCardAroundTarget(onboardingHighlightEl);
        }
    });
}

function openOnboarding(options = {}) {
    const modal = getEl('onboarding-modal');
    if (!modal) return;
    modal.classList.remove('compact');
    const baseProgress = normalizeOnboardingProgress(onboardingState?.progress || {});
    const shouldRestart = options.restart || isOnboardingFinished(baseProgress);
    const progress = shouldRestart ? createDefaultOnboardingProgress() : baseProgress;
    const isFreshGuide = GUIDE_STEP_IDS.every(id => progress[id] === 'pending');
    onboardingState = {
        completed: false,
        progress,
        currentStep: options.stepId || getNextGuideStepId(progress) || GUIDE_STEP_IDS[0]
    };
    onboardingFocusIndex = 0;
    onboardingWelcomeVisible = options.showWelcome ?? isFreshGuide;
    renderOnboarding();
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

async function startCurrentOnboardingStep() {
    if (onboardingWelcomeVisible) {
        onboardingWelcomeVisible = false;
        const modal = getEl('onboarding-modal');
        if (modal) modal.classList.remove('welcome');
        renderOnboarding();
    }
    const stepId = onboardingState?.currentStep || getNextGuideStepId();
    const step = GUIDE_STEPS[stepId];
    if (!step) {
        await completeOnboarding();
        return;
    }
    if (step.pageId === 'page-tasks') navigateAppPage(step.pageId, step.filter || 'all');
    else navigateAppPage(step.pageId);
    onboardingFocusIndex = 0;
    const modal = getEl('onboarding-modal');
    if (modal) modal.classList.add('compact');
    setTimeout(() => {
        highlightCurrentGuideFocus();
        renderOnboarding();
    }, 120);
}

function advanceGuideFocus() {
    const step = GUIDE_STEPS[getCurrentGuideStepId()];
    if (!step) return;
    const flow = getGuideFocusFlow(step);
    if (!canAdvanceGuideFocus()) {
        showToast(t('onboardingNeedInput'), 'error');
        highlightCurrentGuideFocus();
        return;
    }
    if (onboardingFocusIndex < flow.length - 1) {
        onboardingFocusIndex += 1;
        highlightCurrentGuideFocus();
        renderOnboarding();
        return;
    }
    highlightCurrentGuideFocus();
    showToast(t('onboardingClickToComplete'));
}

async function skipCurrentOnboardingStep() {
    const stepId = onboardingState?.currentStep || getNextGuideStepId();
    if (!stepId) return completeOnboarding();
    const progress = normalizeOnboardingProgress(onboardingState.progress);
    progress[stepId] = 'skipped';
    const nextStep = getNextGuideStepId(progress);
    await saveOnboardingState({ progress, currentStep: nextStep, completed: !nextStep });
    onboardingFocusIndex = 0;
    if (!nextStep) {
        closeOnboarding();
        return;
    }
    clearOnboardingHighlight();
    renderOnboarding();
}

async function completeCurrentOnboardingStep() {
    const stepId = onboardingState?.currentStep || getNextGuideStepId();
    if (!stepId) return completeOnboarding();
    const progress = normalizeOnboardingProgress(onboardingState.progress);
    progress[stepId] = 'completed';
    const nextStep = getNextGuideStepId(progress);
    await saveOnboardingState({ progress, currentStep: nextStep, completed: !nextStep });
    if (!nextStep) {
        closeOnboarding();
        return;
    }
    clearOnboardingHighlight();
    renderOnboarding();
}

async function showOnboardingIfNeeded(user) {
    if (!user || !db) return;
    try {
        const ref = db.collection('users').doc(user.uid);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            const progress = createDefaultOnboardingProgress();
            await ref.set({
                uid: user.uid,
                email: user.email || null,
                displayName: user.displayName || null,
                onboardingCompleted: false,
                onboardingProgress: progress,
                onboardingCurrentStep: GUIDE_STEP_IDS[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            onboardingState = buildOnboardingState({ onboardingProgress: progress, onboardingCurrentStep: GUIDE_STEP_IDS[0] });
            openOnboarding();
            return;
        }
        const data = snapshot.data();
        onboardingState = buildOnboardingState(data);
        const hasExpandedGuideProgress = data.onboardingProgress && GUIDE_STEP_IDS.every(id => GUIDE_STATUS.includes(data.onboardingProgress[id]));
        if (!data.onboardingCompleted || !hasExpandedGuideProgress) openOnboarding();
    } catch (error) {
        console.warn('Onboarding state unavailable:', error);
    }
}

// --- RENDER FUNCTIONS ---
function getTaskEmptyState() {
    return TASK_EMPTY_STATES[currentFilter] || TASK_EMPTY_STATES.all;
}

function renderTodos(todos) {
    const todoList = getEl('todo-list');
    if (!todoList) return;
    const emptyState = getTaskEmptyState();
    todoList.innerHTML = todos.length ? '' : `
        <div class="wiki-empty-container task-empty-container">
            <div class="wiki-empty-content task-empty-content">
                <div class="wiki-empty-illustration task-empty-illustration">
                    ${appIconSvg(emptyState.icon, 80)}
                </div>
                <h2>${t(emptyState.titleKey)}</h2>
                <p>${t(emptyState.bodyKey)}</p>
                <button class="confirm-btn task-empty-create-btn" id="task-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">${t('firstTaskButton')}</span>
                </button>
            </div>
        </div>`;

    if (!todos.length) {
        const emptyCreateBtn = getEl('task-empty-create-btn');
        if (emptyCreateBtn) {
            emptyCreateBtn.onclick = () => {
                const todoInput = getEl('todo-input');
                if (todoInput) todoInput.focus();
            };
        }
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];

    todos.forEach(todo => {
        const isDueToday = todo.dueDate === today && !todo.completed && !todo.archived;
        const card = document.createElement('div');
        card.className = `task-card${todo.completed ? ' completed' : ''}`;
        card.draggable = true;
        card.dataset.id = todo.id;
        
        card.ondragstart = () => { card.classList.add('dragging'); };
        card.ondragend = () => { card.classList.remove('dragging'); };
        card.ondragover = (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            const after = getDragAfterElement(todoList, e.clientY);
            if (!after) todoList.appendChild(dragging);
            else todoList.insertBefore(dragging, after);
        };
        card.ondrop = (e) => {
            e.preventDefault();
            const cards = [...todoList.querySelectorAll('.task-card')];
            cards.forEach((c, i) => {
                const t = allTodos.find(x => x.id === c.dataset.id);
                const nextOrder = cards.length - i;
                if (t && t.orderIndex !== nextOrder) db.collection('todos').doc(t.id).update({ orderIndex: nextOrder });
            });
        };

        const p = todo.priority || 'medium';
        const proj = allProjects.find(px => px.id === todo.projectId);
        const tag = proj ? `<span class="project-tag" style="background:${proj.color}33; color:${proj.color}; border: 1px solid ${proj.color}66;">${proj.name}</span>` : '';
        const img = todo.imageUrl ? `<img src="${todo.imageUrl}" class="tc-img" alt="task image" onclick="window.open('${todo.imageUrl}', '_blank')">` : '';
        
        const dueBadge = isDueToday ? `<span class="due-today-badge">${t('dueToday')}</span>` : '';
        const priorityText = `${t(p)} ${t('priorityLabel')}`.toUpperCase();

        card.innerHTML = `
            <button class="tc-delete" data-id="${todo.id}" aria-label="${t('delete')}">&times;</button>
            <div class="tc-top">
                <h3 class="tc-title">${todo.text}${dueBadge}</h3>
                <span class="tc-status ${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}"></span>
            </div>
            <div class="tc-subtitle">${priorityText} ${todo.dueDate ? '• 📅 ' + todo.dueDate : ''}</div>
            ${img}<p class="tc-desc">${todo.memo || t('noNotes')}</p><div style="margin-top: 8px;">${tag}</div>
            <div class="tc-actions">
                <button class="tc-action-btn btn-toggle" data-id="${todo.id}">${todo.completed ? t('undo') : t('complete')}</button>
                <button class="tc-action-btn btn-edit-task" data-id="${todo.id}">${t('edit')}</button>
                <button class="tc-action-btn btn-archive" data-id="${todo.id}">${todo.archived ? t('restore') : t('archiveVerb')}</button>
            </div>`;
        todoList.appendChild(card);
    });

    todoList.querySelectorAll('.btn-toggle').forEach(b => b.onclick = () => {
        const t = allTodos.find(x => x.id === b.dataset.id);
        db.collection('todos').doc(b.dataset.id).update({ completed: !t.completed });
        markGuideStepComplete('taskManage');
    });
    todoList.querySelectorAll('.btn-archive').forEach(b => b.onclick = () => {
        const t = allTodos.find(x => x.id === b.dataset.id);
        db.collection('todos').doc(b.dataset.id).update({ archived: !t.archived });
        markGuideStepComplete('taskManage');
    });
    todoList.querySelectorAll('.tc-delete').forEach(b => b.onclick = () => openTaskDeleteDialog(b.dataset.id));
    todoList.querySelectorAll('.btn-edit-task').forEach(b => b.onclick = () => {
        markGuideStepComplete('taskManage');
        openEditModal('todo', b.dataset.id);
    });
}

function getDragAfterElement(container, y) {
    const draggables = [...container.querySelectorAll('.task-card:not(.dragging)')];
    return draggables.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function renderNotes(notes) {
    const list = getEl('notes-list'); if (!list) return;
    list.innerHTML = notes.length ? '' : `
        <div class="wiki-empty-container collection-empty-container note-empty-container">
            <div class="wiki-empty-content collection-empty-content">
                <div class="wiki-empty-illustration collection-empty-illustration note-empty-illustration">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 3h6"></path>
                        <path d="M12 3v18"></path>
                        <path d="M5 7h14"></path>
                        <path d="M5 11h8"></path>
                        <path d="M5 15h14"></path>
                        <path d="M5 19h9"></path>
                    </svg>
                </div>
                <h2>${t('firstNoteTitle')}</h2>
                <p>${t('firstNoteBody')}</p>
                <button class="confirm-btn collection-empty-create-btn" id="note-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">${t('firstNoteButton')}</span>
                </button>
            </div>
        </div>`;
    if (!notes.length) {
        const emptyCreateBtn = getEl('note-empty-create-btn');
        if (emptyCreateBtn) {
            emptyCreateBtn.onclick = () => {
                const noteInput = getEl('note-input');
                if (noteInput) noteInput.focus();
            };
        }
        return;
    }
    notes.forEach(note => {
        const card = document.createElement('div');
        card.className = `note-card color-${note.color || 'yellow'}`;
        card.dataset.id = note.id; card.style.left = (note.x || 20) + 'px'; card.style.top = (note.y || 20) + 'px';
        card.innerHTML = `<div class="note-content">${note.text}</div><div class="note-footer"><button class="note-edit-btn" data-id="${note.id}">${t('edit')}</button><button class="note-delete-btn" data-id="${note.id}">${t('delete')}</button></div>`;
        list.appendChild(card);
        setupDragging(card);
    });
    list.querySelectorAll('.note-delete-btn').forEach(b => b.onclick = () => {
        markGuideStepComplete('notesManage');
        db.collection('notes').doc(b.dataset.id).delete();
    });
    list.querySelectorAll('.note-edit-btn').forEach(b => b.onclick = () => {
        markGuideStepComplete('notesManage');
        openEditModal('note', b.dataset.id);
    });
}

function setupDragging(el) {
    let isDragging = false, startX, startY, initL, initT;
    const down = (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true; el.style.zIndex = 1000;
        const t = e.type === 'touchstart' ? e.touches[0] : e;
        startX = t.clientX; startY = t.clientY; initL = el.offsetLeft; initT = el.offsetTop;
        document.addEventListener(e.type === 'touchstart' ? 'touchmove' : 'mousemove', move);
        document.addEventListener(e.type === 'touchstart' ? 'touchend' : 'mouseup', up);
    };
    const move = (e) => {
        if (!isDragging) return;
        const t = e.type === 'touchmove' ? e.touches[0] : e;
        el.style.left = (initL + t.clientX - startX) + 'px'; el.style.top = (initT + t.clientY - startY) + 'px';
    };
    const up = () => {
        isDragging = false; el.style.zIndex = 1;
        document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
        document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up);
        db.collection('notes').doc(el.dataset.id).update({ x: parseInt(el.style.left), y: parseInt(el.style.top) });
    };
    el.addEventListener('mousedown', down); el.addEventListener('touchstart', down, { passive: true });
}

function updateDashboardUI() {
    if (!getEl('page-home')) return;
    const total = allTodos.filter(t => !t.archived).length, completed = allTodos.filter(t => t.completed && !t.archived).length, percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const today = new Date().toISOString().split('T')[0];
    const activeTodos = allTodos.filter(todo => !todo.completed && !todo.archived);
    const todayDueTodos = activeTodos.filter(todo => todo.dueDate === today);
    const importantTodos = activeTodos.filter(todo => todo.priority === 'high');
    const activeProjects = allProjects.filter(project => activeTodos.some(todo => todo.projectId === project.id));
    const focusTodos = [...activeTodos]
        .filter(todo => todo.dueDate === today || todo.priority === 'high')
        .sort((a, b) => {
            if ((a.dueDate === today) !== (b.dueDate === today)) return a.dueDate === today ? -1 : 1;
            if ((a.priority === 'high') !== (b.priority === 'high')) return a.priority === 'high' ? -1 : 1;
            return getTaskSortValue(b) - getTaskSortValue(a);
        })
        .slice(0, 4);

    if (getEl('today-due-count')) getEl('today-due-count').textContent = todayDueTodos.length;
    if (getEl('today-important-count')) getEl('today-important-count').textContent = importantTodos.length;
    if (getEl('today-project-count')) getEl('today-project-count').textContent = activeProjects.length;
    if (getEl('today-hub-summary')) {
        getEl('today-hub-summary').textContent = formatText('todayHubSummary', {
            due: todayDueTodos.length,
            important: importantTodos.length,
            projects: activeProjects.length
        });
    }

    if (getEl('stat-total-tasks')) getEl('stat-total-tasks').textContent = total;
    if (getEl('stat-completed-tasks')) getEl('stat-completed-tasks').textContent = completed;
    if (getEl('stat-progress-percent')) getEl('stat-progress-percent').textContent = `${percent}%`;
    if (getEl('stat-progress-bar')) getEl('stat-progress-bar').style.width = `${percent}%`;

    const focusList = getEl('today-focus-list');
    if (focusList) {
        focusList.innerHTML = focusTodos.length ? '' : `<p class="empty-msg">${t('noTodayFocus')}</p>`;
        focusTodos.forEach(todo => {
            const project = allProjects.find(p => p.id === todo.projectId);
            const isToday = todo.dueDate === today;
            const div = document.createElement('button');
            div.className = 'today-focus-item';
            div.type = 'button';
            div.innerHTML = `
                <span class="today-focus-dot ${todo.priority === 'high' ? 'high' : 'normal'}"></span>
                <span class="today-focus-text">${todo.text}</span>
                <span class="today-focus-meta">${isToday ? t('todayDue') : (project ? project.name : t('noProject'))}</span>
            `;
            div.onclick = () => {
                currentFilter = isToday ? 'reminders' : 'important';
                switchPage('page-tasks');
            };
            focusList.appendChild(div);
        });
    }

    const projectList = getEl('today-projects-list');
    if (projectList) {
        projectList.innerHTML = activeProjects.length ? '' : `<p class="empty-msg">${t('noActiveProjectsToday')}</p>`;
        activeProjects.slice(0, 4).forEach(project => {
            const projectTasks = activeTodos.filter(todo => todo.projectId === project.id);
            const div = document.createElement('button');
            div.className = 'today-project-item';
            div.type = 'button';
            div.innerHTML = `
                <span class="today-project-color" style="background:${project.color || 'var(--blue)'}"></span>
                <span class="today-project-name">${project.name}</span>
                <span class="today-project-count">${projectTasks.length}</span>
            `;
            div.onclick = () => {
                selectedProjectOverviewId = project.id;
                switchPage('page-projects');
            };
            projectList.appendChild(div);
        });
    }

    const recentNotesList = getEl('dash-recent-notes');
    if (recentNotesList) {
        recentNotesList.innerHTML = allNotes.length ? '' : `<p style="font-size:0.85rem; color:var(--text-3);">${t('noRecentNotes')}</p>`;
        [...allNotes].reverse().slice(0, 3).forEach(note => {
            const div = document.createElement('div');
            div.className = `dash-recent-note-card ${note.color || 'yellow'}`;
            div.textContent = note.text.length > 50 ? note.text.substring(0, 50) + '...' : note.text;
            div.onclick = () => switchPage('page-notes');
            recentNotesList.appendChild(div);
        });
    }

    const reminderList = getEl('dash-reminders-list');
    if (reminderList) {
        const upcoming = allTodos.filter(t => !t.completed && !t.archived && t.dueDate).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
        
        reminderList.innerHTML = upcoming.length ? '' : `<p class="empty-msg" style="font-size:0.85rem; color:var(--text-3);">${t('noUpcomingReminders')}</p>`;
        upcoming.forEach(todo => {
            const isToday = todo.dueDate === today;
            const div = document.createElement('div');
            div.className = 'dash-reminder-item';
            div.innerHTML = `
                <span class="reminder-text">${todo.text}</span>
                <span class="reminder-date" style="${isToday ? 'color:var(--red);' : 'color:var(--text-2);'}">${isToday ? t('today') : todo.dueDate}</span>
            `;
            div.onclick = () => {
                markGuideStepComplete('taskViews');
                currentFilter = 'reminders';
                switchPage('page-tasks');
            };
            reminderList.appendChild(div);
        });
    }
}

function checkDueNotifications() {
    if (!('Notification' in window)) return;
    const today = new Date().toISOString().split('T')[0];
    const due = allTodos.filter(t => !t.completed && !t.archived && t.dueDate === today);
    
    if (due.length > 0) {
        const lastNotified = localStorage.getItem('last-notified-date');
        if (lastNotified !== today) {
            if (Notification.permission === 'granted') {
                showDueNotification(due.length);
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') showDueNotification(due.length);
                });
            }
        }
    }
}

function showDueNotification(count) {
    const today = new Date().toISOString().split('T')[0];
    const options = {
        body: `오늘 마감인 할 일이 ${count}개 있습니다!`,
        icon: '/icon.svg',
        vibrate: [200, 100, 200],
        badge: '/icon.svg'
    };
    
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("Planary Reminder", options);
        });
    } else {
        new Notification("Planary Reminder", options);
    }
    localStorage.setItem('last-notified-date', today);
}

function renderArchive() {
    const archiveListEl = getEl('archive-tasks-list'); if (!archiveListEl) return;
    const archived = allTodos.filter(t => t.archived);
    if (getEl('archive-total-items')) getEl('archive-total-items').textContent = archived.length;
    if (getEl('archive-total-completed')) getEl('archive-total-completed').textContent = allTodos.filter(t => t.completed).length;
    archiveListEl.innerHTML = archived.length ? '' : `
        <div class="wiki-empty-container collection-empty-container archive-empty-container">
            <div class="wiki-empty-content collection-empty-content">
                <div class="wiki-empty-illustration collection-empty-illustration archive-empty-illustration">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="21 8 21 21 3 21 3 8"></polyline>
                        <rect x="1" y="3" width="22" height="5"></rect>
                        <line x1="10" y1="12" x2="14" y2="12"></line>
                    </svg>
                </div>
                <h2>${t('emptyArchiveTitle')}</h2>
                <p>${t('emptyArchiveBody')}</p>
            </div>
        </div>`;
    if (!archived.length) return;
    archived.forEach(task => {
        const item = document.createElement('div'); 
        item.className = 'archive-task-item';
        item.innerHTML = `
            <div class="archive-item-left">
                <div class="archive-item-title">${task.text}</div>
                <div class="archive-item-meta">
                    <span class="archive-status-badge ${task.completed ? 'status-completed' : 'status-pending'}">
                        ${task.completed ? t('completed') : t('active')}
                    </span>
                    <span>📅 ${task.dueDate || t('noDate')}</span>
                </div>
            </div>
            <div class="archive-item-actions">
                <button class="archive-btn restore-btn" data-id="${task.id}" title="${t('restore')}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
                <button class="archive-btn del-perm-btn" data-id="${task.id}" title="${t('deletePermanently')}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        archiveListEl.appendChild(item);
    });
    archiveListEl.querySelectorAll('.restore-btn').forEach(b => b.onclick = () => db.collection('todos').doc(b.dataset.id).update({ archived: false }));
    archiveListEl.querySelectorAll('.del-perm-btn').forEach(b => b.onclick = () => confirm(t('permanentDeleteConfirm')) && db.collection('todos').doc(b.dataset.id).delete());
    window.refreshInspiration();
}

window.refreshInspiration = () => {
    const textEl = getEl('inspiration-text'), dateEl = getEl('inspiration-date');
    if (!textEl) return;
    let source = allNotes.filter(n => n.archived);
    if (source.length === 0) source = allNotes; if (source.length === 0) source = allTodos.filter(t => t.memo);
    if (source.length > 0) {
        const r = source[Math.floor(Math.random() * source.length)];
        textEl.textContent = `"${r.text || r.memo}"`;
        dateEl.textContent = r.createdAt ? new Date(r.createdAt.toMillis ? r.createdAt.toMillis() : r.createdAt).toLocaleDateString() : t('stayInspired');
    } else {
        textEl.textContent = currentLanguage === 'ko' ? '"기록은 기억을 지배합니다."' : '"Records shape memory."'; dateEl.textContent = t('stayInspired');
    }
};

function renderProjectsDropdown() {
    const select = getEl('todo-project-select'); // Fixed ID
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">${t('noProject')}</option>`;
    allProjects.forEach(p => select.innerHTML += `<option value="${p.id}">${p.name}</option>`);
    select.value = current;
}

function renderTaskProjectSelect(select, currentProjectIdValue = '') {
    if (!select) return;
    select.innerHTML = `<option value="">${t('noProject')}</option>`;
    allProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);
    });
    select.value = currentProjectIdValue || '';
}

function renderProjectManagementList() {
    const list = getEl('projects-list'); // Fixed ID
    if (!list) return;
    list.innerHTML = allProjects.length ? '' : `
        <div class="wiki-empty-container collection-empty-container project-empty-container">
            <div class="wiki-empty-content collection-empty-content">
                <div class="wiki-empty-illustration collection-empty-illustration project-empty-illustration">
                    ${appIconSvg('projects', 80)}
                </div>
                <h2>${t('firstProjectTitle')}</h2>
                <p>${t('firstProjectBody')}</p>
                <button class="confirm-btn collection-empty-create-btn" id="project-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">${t('firstProjectButton')}</span>
                </button>
            </div>
        </div>`;
    if (!allProjects.length) {
        const emptyCreateBtn = getEl('project-empty-create-btn');
        if (emptyCreateBtn) {
            emptyCreateBtn.onclick = () => {
                const projectInput = getEl('project-input');
                if (projectInput) projectInput.focus();
            };
        }
        return;
    }
    allProjects.forEach(p => {
        const div = document.createElement('div'); div.className = 'project-card';
        div.dataset.id = p.id;
        const projectTasks = allTodos.filter(t => t.projectId === p.id && !t.archived);
        const projectReminders = projectTasks.filter(t => t.dueDate && !t.completed);
        const projectWikiPages = allWikiPages.filter(page => page.projectId === p.id);
        div.innerHTML = `
            <div class="stat-icon" style="background:${p.color}33; color:${p.color}; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                ${appIconSvg('projects')}
            </div>
            <h3 style="margin-bottom:4px;">${escapeHtml(p.name)}</h3>
            <p style="font-size:0.8rem; color:var(--text-2); margin-bottom:10px;">${projectTasks.length} ${t('projectTasksUnit')} · ${projectReminders.length} ${t('projectRemindersUnit')} · ${projectWikiPages.length} ${t('projectWikiUnit')}</p>
            <div class="project-card-actions">
                <button class="text-link-btn project-open-btn" data-id="${p.id}" type="button">${t('open')}</button>
                <button class="text-link-btn project-delete-btn" data-id="${p.id}" type="button">${t('delete')}</button>
            </div>
        `;
        div.onclick = () => openProjectOverview(p.id);
        list.appendChild(div);
    });
    list.querySelectorAll('.project-open-btn').forEach(b => b.onclick = (event) => {
        event.stopPropagation();
        openProjectOverview(b.dataset.id);
    });
    list.querySelectorAll('.project-delete-btn').forEach(b => b.onclick = (event) => {
        event.stopPropagation();
        window.deleteProject(b.dataset.id);
    });
    renderProjectOverview();
}
window.deleteProject = (id) => confirm(t('deleteProjectConfirm')) && db.collection('projects').doc(id).delete();

function openProjectOverview(projectId) {
    selectedProjectOverviewId = projectId;
    renderProjectOverview();
    const panel = getEl('project-detail-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderProjectOverview() {
    const panel = getEl('project-detail-panel');
    if (!panel) return;

    const project = allProjects.find(p => p.id === selectedProjectOverviewId);
    if (!project) {
        panel.style.display = 'none';
        return;
    }

    const projectTasks = allTodos.filter(t => t.projectId === project.id && !t.archived);
    const projectReminders = projectTasks
        .filter(t => t.dueDate && !t.completed)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const projectWikiPages = allWikiPages
        .filter(page => page.projectId === project.id)
        .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));

    panel.style.display = 'block';
    if (getEl('project-detail-title')) getEl('project-detail-title').textContent = project.name;
    if (getEl('project-detail-summary')) {
        getEl('project-detail-summary').textContent = formatText('taskCountSummary', { tasks: projectTasks.length, reminders: projectReminders.length, wiki: projectWikiPages.length });
    }

    const renderTaskItem = (task) => `
        <button class="project-detail-item project-task-link" data-id="${task.id}" type="button">
            <span>
                <strong>${escapeHtml(task.text)}</strong>
                <small>${task.memo ? escapeHtml(task.memo) : t('noNotes')}</small>
            </span>
            <em>${task.completed ? t('completed') : (task.dueDate || t(task.priority || 'tasks'))}</em>
        </button>
    `;

    const tasksList = getEl('project-detail-tasks');
    if (tasksList) {
        tasksList.innerHTML = projectTasks.length
            ? projectTasks.slice(0, 6).map(renderTaskItem).join('')
            : `<p class="project-detail-empty">${t('noTasksInProject')}</p>`;
    }

    const remindersList = getEl('project-detail-reminders');
    if (remindersList) {
        remindersList.innerHTML = projectReminders.length
            ? projectReminders.slice(0, 6).map(renderTaskItem).join('')
            : `<p class="project-detail-empty">${t('noActiveReminders')}</p>`;
    }

    const wikiList = getEl('project-detail-wiki');
    if (wikiList) {
        wikiList.innerHTML = projectWikiPages.length
            ? projectWikiPages.map(page => `
                <button class="project-detail-item project-wiki-link" data-id="${page.id}" type="button">
                    <span>
                        <strong>${escapeHtml(page.title || t('untitledDocument'))}</strong>
                        <small>${page.parentId ? t('subpage') : t('rootPage')}</small>
                    </span>
                    <em>${t('open')}</em>
                </button>
            `).join('')
            : `<p class="project-detail-empty">${t('noWikiInProject')}</p>`;
    }

    document.querySelectorAll('.project-task-link').forEach(item => item.onclick = () => {
        currentProjectId = project.id;
        currentFilter = 'all';
        switchPage('page-tasks');
    });
    document.querySelectorAll('.project-wiki-link').forEach(item => item.onclick = () => {
        window.location.hash = `wiki/${item.dataset.id}`;
    });
}

function renderBookmarks() {
    const list = getEl('bookmarks-list'); if (!list) return;
    list.innerHTML = allBookmarks.length ? '' : `
        <div class="wiki-empty-container collection-empty-container bookmark-empty-container">
            <div class="wiki-empty-content collection-empty-content">
                <div class="wiki-empty-illustration collection-empty-illustration bookmark-empty-illustration">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <h2>${t('firstBookmarkTitle')}</h2>
                <p>${t('firstBookmarkBody')}</p>
                <button class="confirm-btn collection-empty-create-btn" id="bookmark-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">${t('firstBookmarkButton')}</span>
                </button>
            </div>
        </div>`;
    if (!allBookmarks.length) {
        const emptyCreateBtn = getEl('bookmark-empty-create-btn');
        if (emptyCreateBtn) {
            emptyCreateBtn.onclick = () => {
                const bookmarkInput = getEl('bm-url-input');
                if (bookmarkInput) bookmarkInput.focus();
            };
        }
        return;
    }
    allBookmarks.forEach(bm => {
        let domain = "";
        try { domain = new URL(bm.url).hostname; } catch(e) { domain = bm.url; }
        const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        
        const div = document.createElement('div'); div.className = 'bookmark-card';
        const tags = bm.tags ? bm.tags.map(t => `<span class="bm-tag">#${t}</span>`).join(' ') : '';
        div.innerHTML = `
            <button class="bm-delete-btn" onclick="deleteBookmark('${bm.id}')" aria-label="${t('deleteBookmark')}">×</button>
            <div class="bm-main">
                <img src="${favicon}" class="bm-favicon" onerror="this.src='icon.svg'">
                <div class="bm-info">
                    <div class="bm-title">${bm.title || domain}</div>
                    <div class="bm-url">${bm.url}</div>
                </div>
            </div>
            <div style="margin-top:12px;">${tags}</div>
            <div class="tc-actions" style="margin-top:auto; padding-top:16px;">
                <button class="tc-action-btn" onclick="window.open('${bm.url}', '_blank')">${t('visitWebsite')}</button>
            </div>`;
        list.appendChild(div);
    });
}
window.deleteBookmark = (id) => confirm(t('deleteBookmarkConfirm')) && db.collection('bookmarks').doc(id).delete();

function setTaskModalOpen(modalId, open) {
    const modal = getEl(modalId);
    if (!modal) return;
    modal.classList.toggle('active', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function openTaskDeleteDialog(id) {
    pendingDeleteTaskId = id;
    setTaskModalOpen('task-delete-modal', true);
}

function closeTaskDeleteDialog() {
    pendingDeleteTaskId = null;
    setTaskModalOpen('task-delete-modal', false);
}

async function confirmTaskDelete() {
    if (!pendingDeleteTaskId || !db) return;
    const id = pendingDeleteTaskId;
    closeTaskDeleteDialog();
    await db.collection('todos').doc(id).delete();
}

function openTaskEditDialog(id) {
    const item = allTodos.find(x => x.id === id);
    if (!item) return;
    editingTaskId = id;
    if (getEl('task-edit-text')) getEl('task-edit-text').value = item.text || '';
    if (getEl('task-edit-memo')) getEl('task-edit-memo').value = item.memo || '';
    if (getEl('task-edit-due-date')) getEl('task-edit-due-date').value = item.dueDate || '';
    if (getEl('task-edit-priority')) getEl('task-edit-priority').value = item.priority || 'medium';
    renderTaskProjectSelect(getEl('task-edit-project'), item.projectId || '');
    setTaskModalOpen('task-edit-modal', true);
    setTimeout(() => {
        const input = getEl('task-edit-text');
        if (input) input.focus();
    }, 50);
}

function closeTaskEditDialog() {
    editingTaskId = null;
    setTaskModalOpen('task-edit-modal', false);
}

async function saveTaskEditDialog() {
    if (!editingTaskId || !db) return;
    const text = (getEl('task-edit-text')?.value || '').trim();
    if (!text) {
        const input = getEl('task-edit-text');
        if (input) input.focus();
        return;
    }
    const priority = getEl('task-edit-priority')?.value || 'medium';
    await db.collection('todos').doc(editingTaskId).update({
        text,
        memo: (getEl('task-edit-memo')?.value || '').trim() || null,
        dueDate: getEl('task-edit-due-date')?.value || null,
        priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
        projectId: getEl('task-edit-project')?.value || null
    });
    closeTaskEditDialog();
    showToast(t('taskUpdated'));
}

function openEditModal(type, id) {
    if (type === 'todo') {
        openTaskEditDialog(id);
        return;
    }
    const item = type === 'todo' ? allTodos.find(x => x.id === id) : allNotes.find(x => x.id === id);
    if (!item) return;
    const next = prompt(t('editContent'), item.text);
    if (next && next.trim()) db.collection(type === 'todo' ? 'todos' : 'notes').doc(id).update({ text: next.trim() }).then(() => showToast(t('updated')));
}

// --- INITIALIZATION ---
try {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.firestore();
        auth = firebase.auth();
    }
} catch (e) { console.error("Firebase Init Error", e); }

document.addEventListener('DOMContentLoaded', () => {
    // Auth State Listener
    if (auth) {
        auth.onAuthStateChanged(user => {
            const path = window.location.pathname.toLowerCase();
            const isAuthPage = path.includes('login') || path.includes('signup') || path.includes('landing');
            if (!user) {
                if (!isAuthPage) window.location.href = 'landing.html';
            } else {
                currentUser = user;
                updateProfileUI(user);
                if (isAuthPage) window.location.replace('/');
                else { 
                    loadTodos(); loadNotes(); loadProjects(); loadBookmarks(); loadWikiPagesForProjects();
                    showOnboardingIfNeeded(user);
                }
            }
        });
    }

    // Theme & Navigation Init
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    applyAppFont(currentAppFont);
    applyLanguage(currentLanguage);
    
    // Hash router
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('resize', () => repositionActiveOnboardingGuide());
    window.addEventListener('scroll', () => {
        if (isTabletGuideLayout()) {
            if (onboardingScrollSettleTimer) clearTimeout(onboardingScrollSettleTimer);
            onboardingScrollSettleTimer = setTimeout(repositionActiveOnboardingGuide, 180);
            return;
        }
        repositionActiveOnboardingGuide();
    }, true);

    // suppress auto-scroll when user is interacting via touch to avoid fighting user scroll on mobile/tablet
    document.addEventListener('touchstart', () => {
        onboardingSuppressAutoScroll = true;
        if (onboardingSuppressTimer) clearTimeout(onboardingSuppressTimer);
    }, { passive: true });
    document.addEventListener('touchmove', () => {
        onboardingSuppressAutoScroll = true;
        if (onboardingSuppressTimer) clearTimeout(onboardingSuppressTimer);
    }, { passive: true });
    document.addEventListener('touchend', () => {
        if (onboardingSuppressTimer) clearTimeout(onboardingSuppressTimer);
        onboardingSuppressTimer = setTimeout(() => { onboardingSuppressAutoScroll = false; }, 250);
    }, { passive: true });

    handleHash();

    // Event Listeners
    if (getEl('theme-toggle-btn')) getEl('theme-toggle-btn').onclick = () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const next = isDark ? 'light' : 'dark';
        localStorage.setItem('app-theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };
    if (getEl('app-language-select')) {
        getEl('app-language-select').onchange = (event) => applyLanguage(event.target.value);
    }
    document.querySelectorAll('.onboarding-language-option').forEach(button => {
        button.onclick = () => applyLanguage(button.dataset.guideLanguage || 'ko');
    });
    if (getEl('app-font-select')) {
        getEl('app-font-select').onchange = (event) => applyAppFont(event.target.value);
    }

    if (getEl('search-input')) getEl('search-input').oninput = () => applyFilters();

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            if (['important', 'reminders'].includes(chip.dataset.filter)) markGuideStepComplete('taskViews');
            navigateAppPage('page-tasks', chip.dataset.filter || 'all');
        };
    });

    document.querySelectorAll('[data-target]').forEach(link => {
        if (link.id === 'sidebar-toggle-btn') return;
        link.onclick = (e) => {
            e.preventDefault();
            const tid = link.dataset.target;
            if (tid === 'page-tasks' && ['important', 'reminders'].includes(link.dataset.filter)) markGuideStepComplete('taskViews');
            navigateAppPage(tid, link.dataset.filter || null);
        };
    });

    // Mobile Nav
    const menuToggle = getEl('menu-toggle'), overlay = getEl('sidebar-overlay'), fabTrigger = getEl('fab-trigger'), fabContainer = getEl('mobile-nav-container');
    const appShell = getEl('app-shell'), sidebarToggleBtn = getEl('sidebar-toggle-btn');
    if (sidebarToggleBtn && appShell) {
        sidebarToggleBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const collapsed = appShell.classList.toggle('sidebar-collapsed');
            sidebarToggleBtn.setAttribute('aria-expanded', String(!collapsed));
            sidebarToggleBtn.setAttribute('aria-label', collapsed ? t('expandSidebar') : t('collapseSidebar'));
            sidebarToggleBtn.setAttribute('title', collapsed ? t('expandSidebar') : t('collapseSidebar'));
        };
    }
    if (fabTrigger) fabTrigger.onclick = (e) => { e.stopPropagation(); fabContainer.classList.toggle('active'); };
    if (menuToggle) menuToggle.onclick = (e) => { e.stopPropagation(); document.body.classList.toggle('nav-open'); };
    if (overlay) overlay.onclick = () => document.body.classList.remove('nav-open');
    document.addEventListener('click', (e) => { if (fabContainer && !fabContainer.contains(e.target)) fabContainer.classList.remove('active'); });

    // Task Add
    let selectedTaskImgFile = null;

    if (getEl('task-img-upload-btn')) {
        getEl('task-img-upload-btn').onclick = () => getEl('task-img-input').click();
    }

    if (getEl('task-img-input')) {
        getEl('task-img-input').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedTaskImgFile = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    getEl('task-img-preview').src = ev.target.result;
                    getEl('task-img-preview-container').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (getEl('remove-task-img')) {
        getEl('remove-task-img').onclick = () => {
            selectedTaskImgFile = null;
            getEl('task-img-input').value = '';
            getEl('task-img-preview-container').style.display = 'none';
        };
    }

    if (getEl('add-btn')) getEl('add-btn').onclick = async () => {
        const input = getEl('todo-input'), memoInput = getEl('memo-input'), dateInput = getEl('due-date'), priorityInput = getEl('priority-select'), projectInput = getEl('todo-project-select');
        const text = input.value.trim();
        if (!text || !currentUser) return;

        let imageUrl = null;
        if (selectedTaskImgFile) {
            try {
                showToast(t('uploadingImage'));
                const filePath = `tasks/${currentUser.uid}/${Date.now()}_${selectedTaskImgFile.name}`;
                const storageRef = firebase.storage().ref().child(filePath);
                const snapshot = await storageRef.put(selectedTaskImgFile);
                imageUrl = await snapshot.ref.getDownloadURL();
            } catch (err) {
                console.error("Image upload failed:", err);
                showToast(t('imageUploadFailed'), "error");
            }
        }

        const selectedPriority = priorityInput && ['low', 'medium', 'high'].includes(priorityInput.value)
            ? priorityInput.value
            : 'medium';
        const payload = {
            uid: currentUser.uid,
            text,
            memo: memoInput.value.trim() || null,
            dueDate: dateInput.value || null,
            priority: selectedPriority,
            projectId: projectInput.value || null,
            imageUrl,
            completed: false,
            archived: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            orderIndex: Date.now()
        };

        try {
            await db.collection('todos').add(payload);
            markGuideStepComplete('taskCreate');
            if (payload.memo || payload.dueDate || payload.priority !== 'medium') markGuideStepComplete('taskDetails');
            input.value = '';
            memoInput.value = '';
            dateInput.value = '';
            if (priorityInput) priorityInput.value = 'medium';
            if (projectInput) projectInput.value = '';
            if (getEl('remove-task-img')) getEl('remove-task-img').click();
            showToast(t('added'));
        } catch (error) {
            console.error("Task creation failed:", error, payload);
            showToast(error && error.message ? error.message : t('taskCreationFailed'), "error");
        }
    };

    // Bookmark Add
    if (getEl('add-bm-btn')) getEl('add-bm-btn').onclick = async () => {
        const urlInput = getEl('bm-url-input'), titleInput = getEl('bm-title-input'), tagsInput = getEl('bm-tags-input');
        const url = urlInput.value.trim(); if (!url || !currentUser) return;
        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        db.collection('bookmarks').add({
            uid: currentUser.uid, url, title: titleInput.value.trim(), tags, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => { urlInput.value = ''; titleInput.value = ''; tagsInput.value = ''; showToast(t('bookmarkSaved')); });
    };

    if (getEl('add-project-btn')) getEl('add-project-btn').onclick = async () => {
        const projectInput = getEl('project-input');
        const name = projectInput ? projectInput.value.trim() : '';
        if (!name || !currentUser) return;

        const palette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];
        const color = palette[allProjects.length % palette.length];

        db.collection('projects').add({
            uid: currentUser.uid,
            name,
            color,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            if (projectInput) projectInput.value = '';
            markGuideStepComplete('projects');
            showToast(t('projectCreated'));
        });
    };

    if (getEl('project-detail-close')) {
        getEl('project-detail-close').onclick = () => {
            selectedProjectOverviewId = null;
            renderProjectOverview();
        };
    }

    if (getEl('project-view-tasks-btn')) {
        getEl('project-view-tasks-btn').onclick = () => {
            if (!selectedProjectOverviewId) return;
            currentProjectId = selectedProjectOverviewId;
            currentFilter = 'all';
            switchPage('page-tasks');
        };
    }

    if (getEl('project-view-reminders-btn')) {
        getEl('project-view-reminders-btn').onclick = () => {
            if (!selectedProjectOverviewId) return;
            markGuideStepComplete('taskViews');
            currentProjectId = selectedProjectOverviewId;
            currentFilter = 'reminders';
            switchPage('page-tasks');
        };
    }

    if (getEl('project-create-wiki-btn')) {
        getEl('project-create-wiki-btn').onclick = async () => {
            const project = allProjects.find(p => p.id === selectedProjectOverviewId);
            if (!project || !currentUser || !db) return;

            try {
                const docRef = await db.collection('wiki_pages').add({
                    uid: currentUser.uid,
                    title: formatText('projectNotesTitle', { project: project.name }),
                    parentId: null,
                    projectId: project.id,
                    content: { blocks: [] },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                markGuideStepComplete('wiki');
                window.location.hash = `wiki/${docRef.id}`;
            } catch (error) {
                console.error("Project wiki creation failed:", error);
                showToast(error && error.message ? error.message : t('failedCreateWiki'), "error");
            }
        };
    }

    if (getEl('add-note-btn')) getEl('add-note-btn').onclick = async () => {
        const noteInput = getEl('note-input');
        const text = noteInput ? noteInput.value.trim() : '';
        if (!text || !currentUser) return;

        db.collection('notes').add({
            uid: currentUser.uid,
            text,
            color: selectedNoteColor || 'yellow',
            x: 20 + (allNotes.length % 4) * 28,
            y: 20 + (allNotes.length % 4) * 28,
            archived: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            if (noteInput) noteInput.value = '';
            markGuideStepComplete('notesCreate');
            showToast(t('noteAdded'));
        });
    };

    if (getEl('note-color-picker')) {
        getEl('note-color-picker').querySelectorAll('.color-option').forEach(option => {
            option.onclick = () => {
                selectedNoteColor = option.dataset.color || 'yellow';
                getEl('note-color-picker').querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
                option.classList.add('selected');
            };
        });
    }

    // Logout
    if (getEl('profile-password-btn')) getEl('profile-password-btn').onclick = connectEmailPasswordLogin;
    if (getEl('onboarding-exit-btn')) getEl('onboarding-exit-btn').onclick = closeOnboarding;
    if (getEl('onboarding-skip-btn')) getEl('onboarding-skip-btn').onclick = skipCurrentOnboardingStep;
    if (getEl('onboarding-start-btn')) {
        getEl('onboarding-start-btn').onclick = startCurrentOnboardingStep;
    }
    if (getEl('onboarding-complete-btn')) getEl('onboarding-complete-btn').onclick = advanceGuideFocus;
    if (getEl('onboarding-toggle-steps-btn')) {
        getEl('onboarding-toggle-steps-btn').onclick = () => {
            const modal = getEl('onboarding-modal');
            if (!modal) return;
            modal.classList.toggle('steps-expanded');
            renderOnboarding();
        };
    }
    if (getEl('profile-guide-btn')) getEl('profile-guide-btn').onclick = () => openOnboarding();
    if (getEl('task-edit-close-btn')) getEl('task-edit-close-btn').onclick = closeTaskEditDialog;
    if (getEl('task-edit-cancel-btn')) getEl('task-edit-cancel-btn').onclick = closeTaskEditDialog;
    if (getEl('task-edit-save-btn')) getEl('task-edit-save-btn').onclick = saveTaskEditDialog;
    if (getEl('task-delete-cancel-btn')) getEl('task-delete-cancel-btn').onclick = closeTaskDeleteDialog;
    if (getEl('task-delete-confirm-btn')) getEl('task-delete-confirm-btn').onclick = confirmTaskDelete;
    document.querySelectorAll('.task-modal').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target !== modal) return;
            if (modal.id === 'task-edit-modal') closeTaskEditDialog();
            if (modal.id === 'task-delete-modal') closeTaskDeleteDialog();
        });
    });

    const logout = () => confirm(t('logoutConfirm')) && auth.signOut().then(() => window.location.href = 'login.html');
    if (getEl('logout-btn')) getEl('logout-btn').onclick = logout;
    if (getEl('profile-logout-btn')) getEl('profile-logout-btn').onclick = logout;
});
