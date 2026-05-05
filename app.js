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
let currentLanguage = localStorage.getItem('planary-language') || 'ko';

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
    add: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'
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
        totalTasks: '전체 작업', productivity: '생산성', recentNotes: '최근 메모', upcomingReminders: '다가오는 리마인더',
        viewAll: '전체 보기', taskTitle: '작업', defaultSans: '기본 글꼴', addTask: '작업 추가', taskPlaceholder: '무엇을 해야 하나요?',
        memoPlaceholder: '메모 (선택)', noProject: '프로젝트 없음', searchTasks: '작업 검색...', projectsTitle: '프로젝트',
        projectsSubtitle: '작업을 프로젝트별로 정리하세요.', projectPlaceholder: '프로젝트 이름 (예: 업무, 공부)', createProject: '프로젝트 만들기',
        projectWorkspace: '프로젝트 작업 공간', projectSummary: '작업, 리마인더, 위키 페이지를 한 곳에서 봅니다.',
        openTasks: '작업 열기', openReminders: '리마인더 열기', newWikiPage: '새 위키 페이지', stickyNotes: '스티키 메모',
        notePlaceholder: '짧은 생각이나 아이디어를 적어보세요...', addNote: '+ 메모 추가', bookmarksTitle: '북마크',
        bookmarksSubtitle: '중요한 링크를 태그와 함께 저장하세요.', saveBookmark: '북마크 저장', docsWiki: '문서 & 위키',
        wikiSubtitle: '노션 스타일 문서 편집기', searchPages: '페이지 검색...', saveChanges: '변경사항 저장',
        archiveTitle: '보관함', archivedTasks: '보관된 작업', emptyArchive: '보관함 비우기', profileTitle: '마이페이지',
        nameLabel: '이름:', emailLabel: '이메일:', loginMethodsLabel: '로그인 방식:', languageLabel: 'UI 언어',
        guideTitle: '가이드', guideDescription: 'Planary의 기본 사용 흐름을 다시 확인합니다.', replayGuide: '가이드 다시 보기',
        emailPasswordLogin: '이메일 비밀번호 로그인', newPassword: '새 비밀번호', confirmPassword: '비밀번호 확인',
        logout: '로그아웃', taskHeaderTitle: '내 작업', taskHeaderSubtitle: '작업 관리자', overviewHeader: '개요',
        overviewSubtitle: '대시보드 요약', projectHeader: '프로젝트 그룹', projectSubtitle: '분류 관리자',
        notesHeader: '스티키 보드', notesSubtitle: '아이디어 메모', bookmarksHeader: '저장한 웹', bookmarksHeaderSubtitle: '참고 링크',
        archiveHeader: '보관함', archiveSubtitle: '이전 기록', wikiHeader: '위키 & 문서', wikiHeaderSubtitle: '지식 베이스',
        myPageSubtitle: '사용자 계정'
    },
    en: {
        home: 'Home', tasks: 'Tasks', allTasks: 'All tasks', completed: 'Completed', progress: 'Progress', important: 'Important',
        reminders: 'Reminders', projects: 'Projects', notes: 'Notes', wiki: 'Wiki', bookmarks: 'Bookmarks',
        archive: 'Archive', myPage: 'My Page', dashboardTitle: 'Dashboard Overview', dashboardSubtitle: "Welcome back! Here's what's happening today.",
        totalTasks: 'Total Tasks', productivity: 'Productivity', recentNotes: 'Recent Notes', upcomingReminders: 'Upcoming Reminders',
        viewAll: 'View All', taskTitle: 'Tasks', defaultSans: 'Default Sans', addTask: 'Add Task', taskPlaceholder: 'What needs to be done?',
        memoPlaceholder: 'Notes (optional)', noProject: 'No Project', searchTasks: 'Search tasks...', projectsTitle: 'Projects',
        projectsSubtitle: 'Organize your tasks into groups.', projectPlaceholder: 'Project name (e.g. Work, Study)', createProject: 'Create Project',
        projectWorkspace: 'Project workspace', projectSummary: 'Tasks, reminders, and wiki pages in one place.',
        openTasks: 'Open tasks', openReminders: 'Open reminders', newWikiPage: 'New wiki page', stickyNotes: 'Sticky Notes',
        notePlaceholder: 'Jot down a quick thought or idea...', addNote: '+ Add Note', bookmarksTitle: 'Bookmarks',
        bookmarksSubtitle: 'Save important links with tags.', saveBookmark: 'Save Bookmark', docsWiki: 'Docs & Wiki',
        wikiSubtitle: 'Notion-like document editor', searchPages: 'Search pages...', saveChanges: 'Save Changes',
        archiveTitle: 'Archive Vault', archivedTasks: 'Archived Tasks', emptyArchive: 'Empty Archive', profileTitle: 'My Page',
        nameLabel: 'Name:', emailLabel: 'Email:', loginMethodsLabel: 'Login methods:', languageLabel: 'UI language',
        guideTitle: 'Guide', guideDescription: 'Review the basic Planary workflow again.', replayGuide: 'Replay guide',
        emailPasswordLogin: 'Email password login', newPassword: 'New password', confirmPassword: 'Confirm password',
        logout: 'Logout', taskHeaderTitle: 'My Tasks', taskHeaderSubtitle: 'Todo Manager', overviewHeader: 'Overview',
        overviewSubtitle: 'Dashboard Summary', projectHeader: 'Project Groups', projectSubtitle: 'Category Manager',
        notesHeader: 'Sticky Board', notesSubtitle: 'Idea Notes', bookmarksHeader: 'Web Saved', bookmarksHeaderSubtitle: 'Reference Links',
        archiveHeader: 'Vault', archiveSubtitle: 'Historical Records', wikiHeader: 'Wiki & Docs', wikiHeaderSubtitle: 'Knowledge Base',
        myPageSubtitle: 'User Account'
    }
};

function t(key) {
    return (I18N[currentLanguage] && I18N[currentLanguage][key]) || I18N.ko[key] || key;
}

function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
}

function setPlaceholder(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.placeholder = value;
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
    setText('.task-subnav-link[data-filter="all"]', t('allTasks'));
    setText('.task-subnav-link[data-filter="active"]', t('progress'));
    setText('.task-subnav-link[data-filter="important"]', t('important'));
    setText('.task-subnav-link[data-filter="reminders"]', t('reminders'));

    setText('#page-home .main-header h1', t('dashboardTitle'));
    setText('#dashboard-welcome-text', t('dashboardSubtitle'));
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

    setText('#page-projects .main-header h1', t('projectsTitle'));
    setText('#page-projects .main-header p', t('projectsSubtitle'));
    setPlaceholder('#project-input', t('projectPlaceholder'));
    setText('#add-project-btn', t('createProject'));
    setText('.project-detail-kicker', t('projectWorkspace'));
    setText('#project-detail-summary', t('projectSummary'));
    setText('#project-view-tasks-btn', t('openTasks'));
    setText('#project-view-reminders-btn', t('openReminders'));
    setText('#project-create-wiki-btn', t('newWikiPage'));

    setText('#page-notes .main-header h1', t('stickyNotes'));
    setPlaceholder('#note-input', t('notePlaceholder'));
    setText('#add-note-btn', t('addNote'));
    setText('#page-bookmarks .main-header h1', t('bookmarksTitle'));
    setText('#page-bookmarks .main-header p', t('bookmarksSubtitle'));
    setText('#add-bm-btn', t('saveBookmark'));
    setText('#page-wiki .main-header h1', t('docsWiki'));
    setText('#page-wiki .main-header p', t('wikiSubtitle'));
    setPlaceholder('#wiki-search-input', t('searchPages'));
    setText('#wiki-save-btn', t('saveChanges'));
    setText('#page-archive .main-header h1', t('archiveTitle'));
    setText('.archive-list-section .section-header h3', t('archivedTasks'));
    setText('#empty-archive-btn', t('emptyArchive'));

    setText('#page-profile .main-header h1', t('profileTitle'));
    const profileLabels = document.querySelectorAll('.profile-card > p strong');
    if (profileLabels[0]) profileLabels[0].textContent = t('nameLabel');
    if (profileLabels[1]) profileLabels[1].textContent = t('emailLabel');
    if (profileLabels[2]) profileLabels[2].textContent = t('loginMethodsLabel');
    setText('.profile-language-panel label', t('languageLabel'));
    setText('.profile-guide-panel h3', t('guideTitle'));
    setText('.profile-guide-panel p', t('guideDescription'));
    setText('#profile-guide-btn', t('replayGuide'));
    setText('.profile-password-panel h3', t('emailPasswordLogin'));
    const passwordLabels = document.querySelectorAll('.profile-password-grid label');
    if (passwordLabels[0]) passwordLabels[0].childNodes[0].textContent = `${t('newPassword')} `;
    if (passwordLabels[1]) passwordLabels[1].childNodes[0].textContent = `${t('confirmPassword')} `;
    setText('#profile-logout-btn', t('logout'));

    const languageSelect = getEl('app-language-select');
    if (languageSelect) languageSelect.value = currentLanguage;
    updateSidebarHeader((window.location.hash || '#page-home').replace('#', '').startsWith('wiki/') ? 'page-wiki' : ((window.location.hash || '#page-home').replace('#', '') || 'page-home'));
    renderProjectsDropdown();
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
    
    filtered.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    renderTodos(filtered);
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
    const name = user.displayName || user.email.split('@')[0];
    const providerLabels = {
        'google.com': 'Google',
        'password': 'Email password'
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
        getEl('profile-login-methods').textContent = providerIds.map(id => providerLabels[id] || id).join(', ') || 'Email password';
    }
    if (getEl('profile-password-help')) {
        getEl('profile-password-help').textContent = hasPasswordProvider
            ? 'Email password login is already enabled. Enter a new password to update it.'
            : 'Set a password for this email so you can sign in with email and password too.';
    }
    if (getEl('profile-password-btn')) {
        getEl('profile-password-btn').textContent = hasPasswordProvider ? 'Update password' : 'Set password login';
    }
}

function getAuthActionErrorMessage(error) {
    if (!error) return 'Unknown error.';
    if (error.code === 'auth/requires-recent-login') {
        return 'For security, please log out, sign in with Google again, then set the password.';
    }
    if (error.code === 'auth/weak-password') {
        return 'Password should be at least 6 characters.';
    }
    if (error.code === 'auth/email-already-in-use' || error.code === 'auth/credential-already-in-use') {
        return 'This email is already connected to another account. Sign in with that method first.';
    }
    if (error.code === 'auth/provider-already-linked') {
        return 'Email password login is already enabled for this account.';
    }
    if (error.code === 'auth/operation-not-allowed') {
        return 'Email/Password login is disabled in this Firebase project. Enable Firebase Console > Authentication > Sign-in method > Email/Password, then try again.';
    }
    return error.message || 'Authentication failed.';
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
        setStatus('This account has no email address to connect.', 'error');
        return;
    }
    if (!password || password.length < 6) {
        setStatus('Password should be at least 6 characters.', 'error');
        return;
    }
    if (password !== confirmPassword) {
        setStatus('Passwords do not match.', 'error');
        return;
    }

    try {
        if (button) button.disabled = true;
        setStatus(hasPasswordProvider ? 'Updating password...' : 'Connecting email password login...');

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
        setStatus('Done. You can now sign in with this email and password.', 'success');
        showToast('Email password login enabled.');
    } catch (error) {
        setStatus(getAuthActionErrorMessage(error), 'error');
    } finally {
        if (button) button.disabled = false;
    }
}

async function completeOnboarding() {
    const modal = getEl('onboarding-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    }
    if (!currentUser || !db) return;
    try {
        await db.collection('users').doc(currentUser.uid).set({
            uid: currentUser.uid,
            onboardingCompleted: true,
            onboardingCompletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.warn('Onboarding completion was not saved:', error);
    }
}

function openOnboarding() {
    const modal = getEl('onboarding-modal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

async function showOnboardingIfNeeded(user) {
    if (!user || !db) return;
    try {
        const ref = db.collection('users').doc(user.uid);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            await ref.set({
                uid: user.uid,
                email: user.email || null,
                displayName: user.displayName || null,
                onboardingCompleted: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            openOnboarding();
            return;
        }
        if (!snapshot.data().onboardingCompleted) openOnboarding();
    } catch (error) {
        console.warn('Onboarding state unavailable:', error);
    }
}

// --- RENDER FUNCTIONS ---
function renderTodos(todos) {
    const todoList = getEl('todo-list');
    if (!todoList) return;
    todoList.innerHTML = todos.length ? '' : `
        <div class="wiki-empty-container task-empty-container">
            <div class="wiki-empty-content task-empty-content">
                <div class="wiki-empty-illustration task-empty-illustration">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                </div>
                <h2>할 일을 채워보세요</h2>
                <p>해야 할 일, 마감일, 메모를 한 번에 정리하는 공간입니다.<br>위 입력창에서 첫 작업을 추가해 흐름을 시작하세요.</p>
                <button class="confirm-btn task-empty-create-btn" id="task-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">첫 작업 추가하기</span>
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
                if (t && t.orderIndex !== i) db.collection('todos').doc(t.id).update({ orderIndex: i });
            });
        };

        const p = todo.priority || 'medium';
        const proj = allProjects.find(px => px.id === todo.projectId);
        const tag = proj ? `<span class="project-tag" style="background:${proj.color}33; color:${proj.color}; border: 1px solid ${proj.color}66;">${proj.name}</span>` : '';
        const img = todo.imageUrl ? `<img src="${todo.imageUrl}" class="tc-img" alt="task image" onclick="window.open('${todo.imageUrl}', '_blank')">` : '';
        
        const dueBadge = isDueToday ? `<span class="due-today-badge">Due Today</span>` : '';

        card.innerHTML = `
            <button class="tc-delete" data-id="${todo.id}">×</button>
            <div class="tc-top">
                <h3 class="tc-title">${todo.text}${dueBadge}</h3>
                <span class="tc-status ${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}"></span>
            </div>
            <div class="tc-subtitle">${p.toUpperCase()} PRIORITY ${todo.dueDate ? '• 📅 ' + todo.dueDate : ''}</div>
            ${img}<p class="tc-desc">${todo.memo || 'No notes.'}</p><div style="margin-top: 8px;">${tag}</div>
            <div class="tc-actions">
                <button class="tc-action-btn btn-toggle" data-id="${todo.id}">${todo.completed ? 'Undo' : 'Complete'}</button>
                <button class="tc-action-btn btn-edit-task" data-id="${todo.id}">Edit</button>
                <button class="tc-action-btn btn-archive" data-id="${todo.id}">${todo.archived ? 'Restore' : 'Archive'}</button>
            </div>`;
        todoList.appendChild(card);
    });

    todoList.querySelectorAll('.btn-toggle').forEach(b => b.onclick = () => {
        const t = allTodos.find(x => x.id === b.dataset.id);
        db.collection('todos').doc(b.dataset.id).update({ completed: !t.completed });
    });
    todoList.querySelectorAll('.btn-archive').forEach(b => b.onclick = () => {
        const t = allTodos.find(x => x.id === b.dataset.id);
        db.collection('todos').doc(b.dataset.id).update({ archived: !t.archived });
    });
    todoList.querySelectorAll('.tc-delete').forEach(b => b.onclick = () => confirm('Delete?') && db.collection('todos').doc(b.dataset.id).delete());
    todoList.querySelectorAll('.btn-edit-task').forEach(b => b.onclick = () => openEditModal('todo', b.dataset.id));
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
                <h2>메모 보드를 채워보세요</h2>
                <p>아이디어와 짧은 기록을 포스트잇처럼 쌓아두는 공간입니다.<br>상단 입력창에 첫 메모를 적고 보드 위에 배치해보세요.</p>
                <button class="confirm-btn collection-empty-create-btn" id="note-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">첫 메모 작성하기</span>
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
        card.innerHTML = `<div class="note-content">${note.text}</div><div class="note-footer"><button class="note-edit-btn" data-id="${note.id}">Edit</button><button class="note-delete-btn" data-id="${note.id}">Delete</button></div>`;
        list.appendChild(card);
        setupDragging(card);
    });
    list.querySelectorAll('.note-delete-btn').forEach(b => b.onclick = () => db.collection('notes').doc(b.dataset.id).delete());
    list.querySelectorAll('.note-edit-btn').forEach(b => b.onclick = () => openEditModal('note', b.dataset.id));
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
    if (getEl('stat-total-tasks')) getEl('stat-total-tasks').textContent = total;
    if (getEl('stat-completed-tasks')) getEl('stat-completed-tasks').textContent = completed;
    if (getEl('stat-progress-percent')) getEl('stat-progress-percent').textContent = `${percent}%`;
    if (getEl('stat-progress-bar')) getEl('stat-progress-bar').style.width = `${percent}%`;

    const recentNotesList = getEl('dash-recent-notes');
    if (recentNotesList) {
        recentNotesList.innerHTML = allNotes.length ? '' : '<p style="font-size:0.85rem; color:var(--text-3);">No recent notes.</p>';
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
        const today = new Date().toISOString().split('T')[0];
        const upcoming = allTodos.filter(t => !t.completed && !t.archived && t.dueDate).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
        
        reminderList.innerHTML = upcoming.length ? '' : '<p class="empty-msg" style="font-size:0.85rem; color:var(--text-3);">No upcoming reminders.</p>';
        upcoming.forEach(t => {
            const isToday = t.dueDate === today;
            const div = document.createElement('div');
            div.className = 'dash-reminder-item';
            div.innerHTML = `
                <span class="reminder-text">${t.text}</span>
                <span class="reminder-date" style="${isToday ? 'color:var(--red);' : 'color:var(--text-2);'}">${isToday ? 'TODAY' : t.dueDate}</span>
            `;
            div.onclick = () => { currentFilter = 'reminders'; switchPage('page-tasks'); };
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
                <h2>보관함이 비어 있습니다</h2>
                <p>완료했거나 잠시 치워둔 작업이 여기에 쌓입니다.<br>Tasks 화면에서 항목을 보관하면 이곳에서 다시 꺼낼 수 있습니다.</p>
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
                        ${task.completed ? 'Completed' : 'Active'}
                    </span>
                    <span>📅 ${task.dueDate || 'No Date'}</span>
                </div>
            </div>
            <div class="archive-item-actions">
                <button class="archive-btn restore-btn" data-id="${task.id}" title="Restore">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
                <button class="archive-btn del-perm-btn" data-id="${task.id}" title="Delete Permanently">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        archiveListEl.appendChild(item);
    });
    archiveListEl.querySelectorAll('.restore-btn').forEach(b => b.onclick = () => db.collection('todos').doc(b.dataset.id).update({ archived: false }));
    archiveListEl.querySelectorAll('.del-perm-btn').forEach(b => b.onclick = () => confirm('Permanently delete?') && db.collection('todos').doc(b.dataset.id).delete());
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
        dateEl.textContent = r.createdAt ? new Date(r.createdAt.toMillis ? r.createdAt.toMillis() : r.createdAt).toLocaleDateString() : 'Stay inspired.';
    } else {
        textEl.textContent = '"기록은 기억을 지배합니다."'; dateEl.textContent = 'Stay inspired.';
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

function renderProjectManagementList() {
    const list = getEl('projects-list'); // Fixed ID
    if (!list) return;
    list.innerHTML = allProjects.length ? '' : `
        <div class="wiki-empty-container collection-empty-container project-empty-container">
            <div class="wiki-empty-content collection-empty-content">
                <div class="wiki-empty-illustration collection-empty-illustration project-empty-illustration">
                    ${appIconSvg('projects', 80)}
                </div>
                <h2>프로젝트를 만들어보세요</h2>
                <p>업무와 아이디어를 주제별로 나누면 정리 속도가 빨라집니다.<br>상단 입력창에서 첫 프로젝트를 추가해 작업을 묶어보세요.</p>
                <button class="confirm-btn collection-empty-create-btn" id="project-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">첫 프로젝트 만들기</span>
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
            <p style="font-size:0.8rem; color:var(--text-2); margin-bottom:10px;">${projectTasks.length} tasks · ${projectReminders.length} reminders · ${projectWikiPages.length} wiki</p>
            <div class="project-card-actions">
                <button class="text-link-btn project-open-btn" data-id="${p.id}" type="button">Open</button>
                <button class="text-link-btn project-delete-btn" data-id="${p.id}" type="button">Delete</button>
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
window.deleteProject = (id) => confirm('Delete project?') && db.collection('projects').doc(id).delete();

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
        getEl('project-detail-summary').textContent = `${projectTasks.length} tasks, ${projectReminders.length} reminders, ${projectWikiPages.length} wiki pages`;
    }

    const renderTaskItem = (task) => `
        <button class="project-detail-item project-task-link" data-id="${task.id}" type="button">
            <span>
                <strong>${escapeHtml(task.text)}</strong>
                <small>${task.memo ? escapeHtml(task.memo) : 'No notes'}</small>
            </span>
            <em>${task.completed ? 'Done' : (task.dueDate || task.priority || 'Task')}</em>
        </button>
    `;

    const tasksList = getEl('project-detail-tasks');
    if (tasksList) {
        tasksList.innerHTML = projectTasks.length
            ? projectTasks.slice(0, 6).map(renderTaskItem).join('')
            : '<p class="project-detail-empty">No tasks in this project.</p>';
    }

    const remindersList = getEl('project-detail-reminders');
    if (remindersList) {
        remindersList.innerHTML = projectReminders.length
            ? projectReminders.slice(0, 6).map(renderTaskItem).join('')
            : '<p class="project-detail-empty">No active reminders.</p>';
    }

    const wikiList = getEl('project-detail-wiki');
    if (wikiList) {
        wikiList.innerHTML = projectWikiPages.length
            ? projectWikiPages.map(page => `
                <button class="project-detail-item project-wiki-link" data-id="${page.id}" type="button">
                    <span>
                        <strong>${escapeHtml(page.title || 'Untitled Document')}</strong>
                        <small>${page.parentId ? 'Subpage' : 'Root page'}</small>
                    </span>
                    <em>Open</em>
                </button>
            `).join('')
            : '<p class="project-detail-empty">No wiki pages linked to this project.</p>';
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
                <h2>북마크를 저장해보세요</h2>
                <p>자주 참고하는 링크를 태그와 함께 모아두는 공간입니다.<br>상단 입력창에 URL을 붙여 첫 북마크를 저장하세요.</p>
                <button class="confirm-btn collection-empty-create-btn" id="bookmark-empty-create-btn" style="width: auto; padding: 12px 32px; margin-top: 24px; border-radius: 14px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px; vertical-align: middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span style="vertical-align: middle;">첫 북마크 저장하기</span>
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
            <button class="bm-delete-btn" onclick="deleteBookmark('${bm.id}')" aria-label="Delete bookmark">×</button>
            <div class="bm-main">
                <img src="${favicon}" class="bm-favicon" onerror="this.src='icon.svg'">
                <div class="bm-info">
                    <div class="bm-title">${bm.title || domain}</div>
                    <div class="bm-url">${bm.url}</div>
                </div>
            </div>
            <div style="margin-top:12px;">${tags}</div>
            <div class="tc-actions" style="margin-top:auto; padding-top:16px;">
                <button class="tc-action-btn" onclick="window.open('${bm.url}', '_blank')">Visit Website</button>
            </div>`;
        list.appendChild(div);
    });
}
window.deleteBookmark = (id) => confirm('Delete bookmark?') && db.collection('bookmarks').doc(id).delete();

function openEditModal(type, id) {
    const item = type === 'todo' ? allTodos.find(x => x.id === id) : allNotes.find(x => x.id === id);
    if (!item) return;
    const next = prompt("Edit content:", item.text);
    if (next && next.trim()) db.collection(type === 'todo' ? 'todos' : 'notes').doc(id).update({ text: next.trim() }).then(() => showToast("Updated!"));
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
    applyLanguage(currentLanguage);
    
    // Hash router
    window.addEventListener('hashchange', handleHash);
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

    if (getEl('search-input')) getEl('search-input').oninput = () => applyFilters();

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            navigateAppPage('page-tasks', chip.dataset.filter || 'all');
        };
    });

    document.querySelectorAll('[data-target]').forEach(link => {
        if (link.id === 'sidebar-toggle-btn') return;
        link.onclick = (e) => {
            e.preventDefault();
            const tid = link.dataset.target;
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
            sidebarToggleBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
            sidebarToggleBtn.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
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
                showToast("Uploading image...");
                const filePath = `tasks/${currentUser.uid}/${Date.now()}_${selectedTaskImgFile.name}`;
                const storageRef = firebase.storage().ref().child(filePath);
                const snapshot = await storageRef.put(selectedTaskImgFile);
                imageUrl = await snapshot.ref.getDownloadURL();
            } catch (err) {
                console.error("Image upload failed:", err);
                showToast("Image upload failed, saving task without image", "error");
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
            input.value = '';
            memoInput.value = '';
            dateInput.value = '';
            if (priorityInput) priorityInput.value = 'medium';
            if (projectInput) projectInput.value = '';
            if (getEl('remove-task-img')) getEl('remove-task-img').click();
            showToast("Added!");
        } catch (error) {
            console.error("Task creation failed:", error, payload);
            showToast(error && error.message ? error.message : "Task creation failed.", "error");
        }
    };

    // Bookmark Add
    if (getEl('add-bm-btn')) getEl('add-bm-btn').onclick = async () => {
        const urlInput = getEl('bm-url-input'), titleInput = getEl('bm-title-input'), tagsInput = getEl('bm-tags-input');
        const url = urlInput.value.trim(); if (!url || !currentUser) return;
        const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        db.collection('bookmarks').add({
            uid: currentUser.uid, url, title: titleInput.value.trim(), tags, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => { urlInput.value = ''; titleInput.value = ''; tagsInput.value = ''; showToast("Bookmark saved!"); });
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
            showToast("Project created!");
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
                    title: `${project.name} Notes`,
                    parentId: null,
                    projectId: project.id,
                    content: { blocks: [] },
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                window.location.hash = `wiki/${docRef.id}`;
            } catch (error) {
                console.error("Project wiki creation failed:", error);
                showToast(error && error.message ? error.message : "Failed to create wiki page.", "error");
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
            showToast("Note added!");
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
    if (getEl('onboarding-skip-btn')) getEl('onboarding-skip-btn').onclick = completeOnboarding;
    if (getEl('onboarding-start-btn')) {
        getEl('onboarding-start-btn').onclick = async () => {
            await completeOnboarding();
            navigateAppPage('page-tasks', 'all');
            setTimeout(() => {
                const input = getEl('todo-input');
                if (input) input.focus();
            }, 50);
        };
    }
    if (getEl('profile-guide-btn')) getEl('profile-guide-btn').onclick = openOnboarding;

    const logout = () => confirm('Logout?') && auth.signOut().then(() => window.location.href = 'login.html');
    if (getEl('logout-btn')) getEl('logout-btn').onclick = logout;
    if (getEl('profile-logout-btn')) getEl('profile-logout-btn').onclick = logout;
});
