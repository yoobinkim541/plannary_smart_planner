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

function bindResilientMobileNav() {
    const menuToggle = getEl('menu-toggle');
    const overlay = getEl('sidebar-overlay');

    if (menuToggle && !menuToggle.dataset.mobileNavBound) {
        menuToggle.dataset.mobileNavBound = 'true';
        menuToggle.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const isOpen = document.body.classList.toggle('nav-open');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    if (overlay && !overlay.dataset.mobileNavBound) {
        overlay.dataset.mobileNavBound = 'true';
        overlay.addEventListener('click', () => {
            document.body.classList.remove('nav-open');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        });
    }

    document.querySelectorAll('[data-target]').forEach(link => {
        if (link.dataset.mobileNavCloseBound) return;
        link.dataset.mobileNavCloseBound = 'true';
        link.addEventListener('click', () => {
            document.body.classList.remove('nav-open');
            if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

document.addEventListener('DOMContentLoaded', bindResilientMobileNav);

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
const SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh', 'es'];
function resolveInitialLanguage() {
    const stored = localStorage.getItem('planary-language');
    if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
    const nav = (navigator.language || 'en').toLowerCase().split('-')[0];
    if (SUPPORTED_LANGS.includes(nav)) return nav;
    return 'en';
}
let currentLanguage = resolveInitialLanguage();
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
let eclassStatus = null;
let eclassForegroundSyncTimer = null;
let taskCalendarAccessToken = null;
let lastCalendarImportAt = null;
const reminderNotificationTimers = new Map();
const DEFAULT_NOTIFICATION_SETTINGS = {
    dailyTasks: false,
    dailyTime: '09:00',
    reminders: true
};
let notificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...loadNotificationSettings() };
let onboardingRepositionFrame = null;
let onboardingScrollSettleTimer = null;
let onboardingLastTargetRect = null;
let onboardingLockScrollY = 0;

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

function loadNotificationSettings() {
    try {
        return JSON.parse(localStorage.getItem('planary-notification-settings') || '{}');
    } catch (error) {
        return {};
    }
}

function saveNotificationSettings() {
    localStorage.setItem('planary-notification-settings', JSON.stringify(notificationSettings));
}

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

const I18N = window.PlanaryI18nDict || {};

function t(key) {
    const cur = I18N[currentLanguage];
    if (cur && cur[key] != null) return cur[key];
    if (I18N.en && I18N.en[key] != null) return I18N.en[key];
    if (I18N.ko && I18N.ko[key] != null) return I18N.ko[key];
    return key;
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

function setAllTitle(selector, value, includeAria = true) {
    document.querySelectorAll(selector).forEach(el => {
        el.title = value;
        if (includeAria) el.setAttribute('aria-label', value);
    });
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

function setAllButtonTextPreserveIcon(selector, value) {
    document.querySelectorAll(selector).forEach(el => {
        const icon = el.querySelector('svg');
        el.textContent = '';
        if (icon) {
            el.appendChild(icon);
            el.appendChild(document.createTextNode(' '));
        }
        el.appendChild(document.createTextNode(value));
    });
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
    if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
    currentLanguage = lang;
    localStorage.setItem('planary-language', lang);
    document.documentElement.lang = lang;

    setAllText('[data-target="page-home"] span, .fab-item[data-target="page-home"] .fab-label', t('home'));
    setAllText('[data-target="page-tasks"]:not(.task-subnav-link) span, .fab-item[data-target="page-tasks"] .fab-label', t('tasks'));
    setAllText('[data-target="page-projects"] span, .fab-item[data-target="page-projects"] .fab-label', t('projects'));
    setAllText('[data-target="page-notes"] span, .fab-item[data-target="page-notes"] .fab-label', t('notes'));
    setAllText('[data-target="page-wiki"] span, .fab-item[data-target="page-wiki"] .fab-label', t('wiki'));
    setAllText('[data-target="page-bookmarks"] span, .fab-item[data-target="page-bookmarks"] .fab-label', t('bookmarks'));
    setAllText('[data-target="page-archive"] span, .fab-item[data-target="page-archive"] .fab-label', t('archive'));
    setAllText('[data-target="page-profile"] span, .fab-item[data-target="page-profile"] .fab-label', t('myPage'));
    setAllTitle('[data-target="page-home"]', t('home'));
    setAllTitle('[data-target="page-tasks"]', t('tasks'));
    setAllTitle('[data-target="page-projects"]', t('projects'));
    setAllTitle('[data-target="page-notes"]', t('notes'));
    setAllTitle('[data-target="page-wiki"]', t('wiki'));
    setAllTitle('[data-target="page-bookmarks"]', t('bookmarks'));
    setAllTitle('[data-target="page-archive"]', t('archive'));
    setAllTitle('[data-target="page-profile"]', t('myPage'));
    setAllTitle('.rail-icon.mobile-only[data-target="page-tasks"]', t('undo'));
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
    setAllButtonTextPreserveIcon('.today-hub-actions .confirm-btn', t('openTasks'));
    setAllButtonTextPreserveIcon('.today-hub-actions .text-link-btn', t('important'));
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
    setText('#task-details-toggle', t('taskDetailsToggle'));
    setPlaceholder('#todo-input', t('taskPlaceholder'));
    setPlaceholder('#memo-input', t('memoPlaceholder'));
    setPlaceholder('#search-input', t('searchTasks'));
    setTitle('#task-img-upload-btn', t('uploadImageTitle'));
    setTitle('#task-calendar-connect-btn', t('calendarConnectTask'));
    setTitle('#task-calendar-import-btn', t('calendarImportTask'));
    setText('#task-calendar-import-btn', t('calendarImportTask'));
    setTitle('#task-apple-calendar-btn', t('appleCalendarTask'));
    setTitle('#task-apple-calendar-btn', t('appleCalendarTask'));
    const dueTimeInput = getEl('due-time');
    if (dueTimeInput) dueTimeInput.setAttribute('aria-label', t('dueTimeLabel'));
    const calendarReminderSelect = getEl('calendar-reminder-select');
    if (calendarReminderSelect) calendarReminderSelect.setAttribute('aria-label', t('calendarReminderLabel'));
    setOptionText('#calendar-reminder-select option[value="0"]', t('notifyAtTime'));
    setOptionText('#calendar-reminder-select option[value="10"]', t('notifyBefore10'));
    setOptionText('#calendar-reminder-select option[value="30"]', t('notifyBefore30'));
    setOptionText('#calendar-reminder-select option[value="60"]', t('notifyBefore60'));
    setOptionText('#calendar-reminder-select option[value="120"]', t('notifyBefore120'));
    setOptionText('#calendar-reminder-select option[value="1440"]', t('notifyBefore1440'));
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
    setTitle('#project-detail-close', t('closeProjectView'));
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
    const wikiProjectSelect = getEl('wiki-project-select');
    if (wikiProjectSelect) wikiProjectSelect.setAttribute('aria-label', t('wikiProjectSelect'));
    setText('#wiki-upload-text', t('uploadingProgress'));
    setText('.wiki-project-control label', t('projectLabel'));
    setText('#wiki-subpages-section h3', t('subpages'));
    setText('#wiki-create-subpage-btn', t('newSubpage'));
    setText('#wiki-save-btn', t('saveChanges'));
    setText('#wiki-delete-btn', t('deletePage'));
    setText('#wiki-empty-view h2', t('wikiEmptyTitle'));
    setHtml('#wiki-empty-view p', t('wikiEmptyBody'));
    setText('#wiki-empty-create-btn span', t('createNewPage'));
    setText('#wiki-tree-title', t('wikiPageTree'));
    setText('#wiki-widget-title', t('documentTools'));
    setText('#wiki-info-title', t('documentInfo'));
    setText('#wiki-info-project-label', t('projectLabel'));
    setText('#wiki-info-updated-label', t('recentlyUpdated'));
    setText('#wiki-info-subpages-label', t('subpages'));
    setText('#wiki-widget-subpages-title', t('subpages'));
    setText('#wiki-widget-new-subpage-btn', t('newSubpage'));
    setText('#wiki-widget-tasks-title', t('todayFocusTitle'));
    setText('#wiki-widget-calendar-title', t('calendar'));
    setText('#wiki-calendar-connect-btn', t('googleCalendarConnect'));
    setText('#wiki-calendar-create-btn', t('createCalendarFromPage'));
    setText('#wiki-cover-btn', t('changeCover'));
    setTitle('#wiki-tree-toggle-btn', t('collapsePageTree'));
    setTitle('#wiki-widget-toggle-btn', t('collapseWidgets'));
    setTitle('#wiki-widget-close-btn', t('collapseWidgets'));
    const wikiStepList = getEl('onboarding-step-list');
    if (wikiStepList) wikiStepList.setAttribute('aria-label', t('onboardingStepsLabel'));
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
    setText('#profile-notification-title', t('notificationSettings'));
    setText('#notify-daily-tasks-label', t('notifyDailyTasks'));
    setText('#notify-daily-time-label', t('notifyDailyTime'));
    setText('#notify-reminders-label', t('notifyReminderTime'));
    setText('#notification-permission-btn', t('allowBrowserNotifications'));
    syncNotificationSettingsUI();
    setText('#profile-eclass-title', t('eclassTitle'));
    setText('#profile-eclass-description', t('eclassDescription'));
    setText('#profile-eclass-url-label', t('eclassUrl'));
    setText('#profile-eclass-username-label', t('eclassUsername'));
    setText('#profile-eclass-password-label', t('eclassPassword'));
    setText('#profile-eclass-help', t('eclassHelp'));
    setText('#profile-eclass-save-btn', t('eclassSave'));
    setText('#profile-eclass-sync-btn', t('eclassSyncNow'));
    setText('#profile-eclass-supported-summary', t('eclassSupportedSchools'));
    const supportedSchool = document.querySelector('#profile-eclass-supported-list li');
    if (supportedSchool) supportedSchool.textContent = t('eclassSupportedSeoultech');
    setText('#profile-eclass-request-text', t('eclassRequestText'));
    setText('#profile-eclass-request-link', t('eclassRequestSchool'));
    placeEclassPanelNearProfileTop();
    updateEclassStatusBadge();
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
    setText('#profile-delete-title', t('deleteAccountTitle'));
    setText('#profile-delete-description', t('deleteAccountDescription'));
    setText('#profile-delete-account-btn', t('deleteAccountButton'));
    setText('.onboarding-language-option[data-guide-language="ko"]', t('koreanLanguage'));
    setText('.onboarding-language-option[data-guide-language="en"]', t('englishLanguage'));
    setText('#task-edit-title', t('editTaskTitle'));
    setText('#task-edit-text-label', t('taskNameLabel'));
    setText('#task-edit-memo-label', t('taskMemoLabel'));
    setText('#task-edit-date-label', t('dueDateLabel'));
    setText('#task-edit-time-label', t('dueTimeLabel'));
    setText('#task-edit-calendar-label', t('calendarReminderLabel'));
    setOptionText('#task-edit-calendar-reminder option[value="0"]', t('notifyAtTime'));
    setOptionText('#task-edit-calendar-reminder option[value="10"]', t('notifyBefore10'));
    setOptionText('#task-edit-calendar-reminder option[value="30"]', t('notifyBefore30'));
    setOptionText('#task-edit-calendar-reminder option[value="60"]', t('notifyBefore60'));
    setOptionText('#task-edit-calendar-reminder option[value="120"]', t('notifyBefore120'));
    setOptionText('#task-edit-calendar-reminder option[value="1440"]', t('notifyBefore1440'));
    setText('#task-edit-priority-label', t('priorityLabel'));
    setText('#task-edit-project-label', t('projectSelectLabel'));
    setOptionText('#task-edit-priority option[value="low"]', t('low'));
    setOptionText('#task-edit-priority option[value="medium"]', t('medium'));
    setOptionText('#task-edit-priority option[value="high"]', t('high'));
    setText('#task-edit-cancel-btn', t('cancel'));
    setText('#task-edit-save-btn', t('saveTaskChanges'));
    setTitle('#task-edit-close-btn', t('close'));
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

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const v = t(el.dataset.i18nTitle);
        el.title = v;
        el.setAttribute('aria-label', v);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset.i18nHtml);
    });

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
        scheduleReminderNotifications();
    });
}

function updateEclassStatusBadge() {
    const badge = getEl('profile-eclass-status-badge');
    if (!badge) return;
    const connected = !!eclassStatus?.connected;
    badge.textContent = connected ? t('eclassConnected') : t('eclassDisconnected');
    badge.classList.toggle('connected', connected);
}

function placeEclassPanelNearProfileTop() {
    const panel = getEl('profile-eclass-panel');
    const languagePanel = document.querySelector('.profile-language-panel');
    if (panel && languagePanel && panel.previousElementSibling !== languagePanel.previousElementSibling) {
        languagePanel.parentNode.insertBefore(panel, languagePanel);
    }
}

async function getAuthHeaders() {
    if (!currentUser) throw new Error(t('loginFirst'));
    const token = await currentUser.getIdToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function loadEclassStatusFromFirestore() {
    if (!currentUser || !db) return null;
    const snap = await db.collection('eclass_connections').doc(currentUser.uid).get();
    if (!snap.exists) return { connected: false, baseUrl: 'https://eclass.seoultech.ac.kr' };
    const data = snap.data() || {};
    const hasCredentials = !!data.encryptedSessionCookie || (!!data.encryptedUsername && !!data.encryptedPassword);
    return {
        connected: data.enabled === false ? false : hasCredentials,
        baseUrl: data.baseUrl || 'https://eclass.seoultech.ac.kr',
        platform: data.platform || 'seoultech-moodle',
        lastSyncedAt: data.lastSyncedAt || null,
        lastError: data.lastError || null
    };
}

async function loadEclassStatus() {
    if (!currentUser) return;
    try {
        const response = await fetch('/api/eclass/connection', { headers: await getAuthHeaders() });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        eclassStatus = await response.json();
        const urlInput = getEl('profile-eclass-url');
        if (urlInput) urlInput.value = eclassStatus.baseUrl || 'https://eclass.seoultech.ac.kr';
        updateEclassStatusBadge();
    } catch (error) {
        console.warn('E-class status unavailable:', error);
        eclassStatus = await loadEclassStatusFromFirestore().catch(() => ({ connected: false }));
        updateEclassStatusBadge();
    }
}

async function saveEclassConnection() {
    const urlInput = getEl('profile-eclass-url');
    const usernameInput = getEl('profile-eclass-username');
    const passwordInput = getEl('profile-eclass-password');
    const status = getEl('profile-eclass-status');
    const button = getEl('profile-eclass-save-btn');
    const username = usernameInput?.value?.trim() || '';
    const password = passwordInput?.value || '';
    if (!username || !password) {
        if (status) status.textContent = t('eclassCredentialsRequired');
        return;
    }
    try {
        if (button) button.textContent = t('eclassSaving');
        const response = await fetch('/api/eclass/connection', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                baseUrl: urlInput?.value?.trim() || 'https://eclass.seoultech.ac.kr',
                username,
                password
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        eclassStatus = data;
        if (passwordInput) passwordInput.value = '';
        updateEclassStatusBadge();
        if (status) {
            status.className = 'profile-status-text success';
            status.textContent = t('eclassSaved');
        }
        showToast(t('eclassSaved'), 'success');
        await syncEclassNow();
    } catch (error) {
        if (status) {
            status.className = 'profile-status-text error';
            status.textContent = `${t('eclassFailed')}: ${error.message || error}`;
        }
    } finally {
        if (button) button.textContent = t('eclassSave');
    }
}

let eclassSyncUnsub = null;
async function syncEclassNow() {
    const status = getEl('profile-eclass-status');
    const button = getEl('profile-eclass-sync-btn');
    try {
        if (button) button.textContent = t('eclassSyncing');
        const requestedAt = Date.now();
        const response = await fetch('/api/eclass/sync', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ uid: currentUser.uid })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
        if (status) {
            status.className = 'profile-status-text';
            status.textContent = t('eclassSyncing');
        }
        if (eclassSyncUnsub) { try { eclassSyncUnsub(); } catch {} eclassSyncUnsub = null; }
        const timeout = setTimeout(() => {
            if (eclassSyncUnsub) { try { eclassSyncUnsub(); } catch {} eclassSyncUnsub = null; }
            if (button) button.textContent = t('eclassSyncNow');
        }, 5 * 60 * 1000);
        eclassSyncUnsub = db.collection('eclass_connections').doc(currentUser.uid)
            .onSnapshot(snap => {
                const d = snap.data() || {};
                const syncedMs = d.lastSyncedAt && d.lastSyncedAt.toMillis ? d.lastSyncedAt.toMillis() : 0;
                if (d.syncStatus === 'ok' && syncedMs >= requestedAt) {
                    if (status) {
                        status.className = 'profile-status-text success';
                        status.textContent = window.PlanaryI18n?.format?.('eclassSynced', { count: d.lastTodoCount || 0 }) || t('eclassSynced');
                    }
                    showToast(status?.textContent || t('eclassSyncNow'), 'success');
                    loadEclassStatus();
                    if (button) button.textContent = t('eclassSyncNow');
                    clearTimeout(timeout);
                    if (eclassSyncUnsub) { try { eclassSyncUnsub(); } catch {} eclassSyncUnsub = null; }
                } else if (d.syncStatus === 'error' && syncedMs >= requestedAt) {
                    if (status) {
                        status.className = 'profile-status-text error';
                        status.textContent = `${t('eclassFailed')}: ${d.lastError || ''}`;
                    }
                    if (button) button.textContent = t('eclassSyncNow');
                    clearTimeout(timeout);
                    if (eclassSyncUnsub) { try { eclassSyncUnsub(); } catch {} eclassSyncUnsub = null; }
                }
            }, error => {
                console.warn('[eclass] status subscription failed', error);
            });
    } catch (error) {
        if (status) {
            status.className = 'profile-status-text error';
            status.textContent = `${t('eclassFailed')}: ${error.message || error}`;
        }
        if (button) button.textContent = t('eclassSyncNow');
    }
}

function startEclassForegroundSync() {
    clearInterval(eclassForegroundSyncTimer);
    eclassForegroundSyncTimer = setInterval(async () => {
        if (!currentUser || !eclassStatus?.connected || document.hidden) return;
        try {
            await fetch('/api/eclass/sync', {
                method: 'POST',
                headers: await getAuthHeaders(),
                body: JSON.stringify({ uid: currentUser.uid })
            });
        } catch (error) {
            console.warn('Foreground E-class sync failed:', error);
        }
    }, 5 * 60 * 1000);
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
    updateSidebarMode(hash);
}

function updateSidebarMode(hash) {
    const nav = document.querySelector('#sidebar .sidebar-nav');
    const tree = document.getElementById('sidebar-note-tree');
    if (!nav || !tree) return;
    const inNote = (hash || '').startsWith('#wiki/');
    nav.hidden = inNote;
    tree.hidden = !inNote;
    if (inNote && typeof window.renderNoteSidebarTree === 'function') {
        window.renderNoteSidebarTree();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('sidebar-note-back');
    if (backBtn) backBtn.onclick = () => { window.location.hash = 'page-wiki'; };
});

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

async function deleteCurrentUserData(uid) {
    try {
        const response = await fetch('/api/account/delete-data', {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({ uid })
        });
        if (response.ok) return;
        console.warn('[Account] Server-side data deletion failed, falling back to client delete:', await response.text());
    } catch (error) {
        console.warn('[Account] Server-side data deletion unavailable, falling back to client delete:', error);
    }

    const collections = ['todos', 'notes', 'projects', 'bookmarks', 'wiki_pages'];
    const storageUrls = new Set();
    for (const name of collections) {
        let snapshot = await db.collection(name).where('uid', '==', uid).limit(300).get();
        while (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                collectStorageUrlsFromValue(doc.data(), storageUrls);
                batch.delete(doc.ref);
            });
            await batch.commit();
            snapshot = await db.collection(name).where('uid', '==', uid).limit(300).get();
        }
    }
    await deleteStorageUrls(storageUrls);
    await db.collection('users').doc(uid).delete().catch(() => {});
}

function getFirebaseStoragePathFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        const parsed = new URL(url);
        const marker = '/o/';
        const index = parsed.pathname.indexOf(marker);
        if (index === -1) return null;
        return decodeURIComponent(parsed.pathname.slice(index + marker.length));
    } catch (error) {
        return null;
    }
}

function collectStorageUrlsFromValue(value, target = new Set()) {
    if (!value) return target;
    if (typeof value === 'string') {
        if (getFirebaseStoragePathFromUrl(value)) target.add(value);
        return target;
    }
    if (Array.isArray(value)) {
        value.forEach(item => collectStorageUrlsFromValue(item, target));
        return target;
    }
    if (typeof value === 'object') {
        Object.values(value).forEach(item => collectStorageUrlsFromValue(item, target));
    }
    return target;
}

async function deleteStorageUrls(urls) {
    if (!firebase?.storage) return;
    const uid = auth?.currentUser?.uid;
    const uniqueUrls = [...urls].filter(Boolean);
    await Promise.allSettled(uniqueUrls.map(async (url) => {
        const path = getFirebaseStoragePathFromUrl(url);
        if (!path) return;
        if (uid && !path.startsWith(`tasks/${uid}/`) && !path.startsWith(`wiki/${uid}/`)) return;
        try {
            await firebase.storage().ref().child(path).delete();
        } catch (error) {
            if (error.code !== 'storage/object-not-found') console.warn('[Storage] Failed to delete orphaned file:', path, error);
        }
    }));
}

async function reauthenticateForAccountDeletion(user) {
    const providers = user.providerData.map(provider => provider.providerId);
    if (providers.includes('google.com')) {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await user.reauthenticateWithPopup(provider);
        return;
    }
    if (providers.includes('password') && user.email) {
        const password = prompt(t('deleteAccountPasswordPrompt'));
        if (!password) throw new Error(t('recentLoginRequired'));
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        return;
    }
    throw new Error(t('recentLoginRequired'));
}

async function deleteAccount() {
    if (!auth || !auth.currentUser || !db) return;
    const user = auth.currentUser;
    const status = getEl('profile-delete-status');
    const button = getEl('profile-delete-account-btn');
    const setStatus = (message, type = '') => {
        if (!status) return;
        status.textContent = message;
        status.className = `profile-status-text ${type}`.trim();
    };

    if (!confirm(t('deleteAccountConfirm'))) return;
    if (user.email) {
        const typedEmail = prompt(formatMessage('deleteAccountConfirmEmail', { email: user.email }));
        if (typedEmail !== user.email) return;
    }

    try {
        if (button) button.disabled = true;
        setStatus(t('deletingAccount'));
        await deleteCurrentUserData(user.uid);
        await user.delete();
        showToast(t('accountDeleted'));
        window.location.href = 'signup.html';
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            try {
                await reauthenticateForAccountDeletion(user);
                await deleteCurrentUserData(user.uid);
                await user.delete();
                showToast(t('accountDeleted'));
                window.location.href = 'signup.html';
                return;
            } catch (reauthError) {
                setStatus(`${t('accountDeleteFailed')}: ${getAuthActionErrorMessage(reauthError)}`, 'error');
                return;
            }
        }
        setStatus(`${t('accountDeleteFailed')}: ${getAuthActionErrorMessage(error)}`, 'error');
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
    if (!user) return t('defaultUserName');
    return user.displayName || (user.email ? user.email.split('@')[0] : t('defaultUserName'));
}

function getSocialAuthProfile(user) {
    if (!user) return {};
    const hasSocialProvider = user.providerData.some(provider => provider.providerId !== 'password');
    if (!hasSocialProvider) return {};
    return {
        displayName: user.displayName || null,
        photoURL: user.photoURL || null
    };
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
        card.style.width = '';
        card.style.maxHeight = '';
    }
    document.body.classList.remove('onboarding-spotlight-active');
}

function lockOnboardingScroll() {
    onboardingLockScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.style.setProperty('--onboarding-lock-scroll-y', `${onboardingLockScrollY}px`);
    document.body.classList.add('onboarding-interaction-locked');
}

function unlockOnboardingScroll() {
    const shouldRestore = document.body.classList.contains('onboarding-interaction-locked');
    document.body.classList.remove('onboarding-interaction-locked');
    document.documentElement.style.removeProperty('--onboarding-lock-scroll-y');
    if (shouldRestore) window.scrollTo(0, onboardingLockScrollY || 0);
}

function isOnboardingInteractionLocked() {
    const modal = getEl('onboarding-modal');
    return Boolean(modal && modal.classList.contains('active'));
}

function canScrollWithinOnboardingTarget(target, deltaY) {
    let el = target;
    while (el && el !== document.body) {
        if (isOnboardingAllowedContainer(el)) {
            const style = window.getComputedStyle(el);
            const canScroll = /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
            if (canScroll) {
                if (deltaY < 0 && el.scrollTop > 0) return true;
                if (deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
                return false;
            }
        }
        el = el.parentElement;
    }
    return false;
}

function isOnboardingAllowedContainer(target) {
    if (!target || !isOnboardingInteractionLocked()) return true;
    const modalCard = document.querySelector('#onboarding-modal .onboarding-card');
    if (modalCard && modalCard.contains(target)) return true;
    return Boolean(onboardingHighlightEl && onboardingHighlightEl.contains(target));
}

function isAllowedOnboardingTarget(target) {
    return isOnboardingAllowedContainer(target);
}

function blockOnboardingBackgroundEvent(event) {
    if (!isOnboardingInteractionLocked()) return;
    if (isAllowedOnboardingTarget(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
}

function blockOnboardingBackgroundScroll(event) {
    if (!isOnboardingInteractionLocked()) return;
    const deltaY = event.deltaY || 0;
    if (isAllowedOnboardingTarget(event.target) && canScrollWithinOnboardingTarget(event.target, deltaY)) return;
    event.preventDefault();
    event.stopPropagation();
}

function blockOnboardingBackgroundKeys(event) {
    if (!isOnboardingInteractionLocked()) return;
    if (isAllowedOnboardingTarget(event.target)) return;
    const blockedKeys = [' ', 'Spacebar', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
    if (!blockedKeys.includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
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
    unlockOnboardingScroll();
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
    const isDesktopGuide = !isTabletGuideLayout() && !window.matchMedia('(max-width: 520px)').matches;
    if (!onboardingSuppressAutoScroll && !isDesktopGuide) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } else {
        // avoid fighting user touch-driven scrolling; only jump if fully outside viewport
        const rect = target.getBoundingClientRect();
        if (!isDesktopGuide && (rect.top < 0 || rect.bottom > window.innerHeight)) {
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
    card.style.maxHeight = '';
    card.style.width = '';
    if (isTabletGuideLayout()) return;

    requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const margin = 18;
        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        card.style.maxHeight = `${Math.max(320, Math.min(720, viewportH - margin * 2))}px`;
        const cardRect = card.getBoundingClientRect();
        const fitsRight = viewportW - rect.right >= cardRect.width + margin * 2;
        const fitsLeft = rect.left >= cardRect.width + margin * 2;
        const fitsBelow = viewportH - rect.bottom >= cardRect.height + margin * 2;
        const fitsAbove = rect.top >= cardRect.height + margin * 2;
        const targetSpansWide = rect.width > viewportW * 0.42;
        let left;
        let top;

        if (targetSpansWide) {
            const belowSpace = viewportH - rect.bottom - margin;
            const aboveSpace = rect.top - margin;
            const placeBelow = belowSpace >= aboveSpace || belowSpace >= 320;
            const wideWidth = Math.min(Math.max(720, rect.width), viewportW - margin * 2);
            card.style.width = `${wideWidth}px`;
            const availableHeight = Math.max(320, Math.min(720, (placeBelow ? belowSpace : aboveSpace) - margin));
            card.style.maxHeight = `${availableHeight}px`;
            const nextCardRect = card.getBoundingClientRect();
            left = Math.min(Math.max(rect.left + rect.width / 2 - nextCardRect.width / 2, margin), viewportW - nextCardRect.width - margin);
            top = placeBelow ? rect.bottom + margin : rect.top - nextCardRect.height - margin;
            card.style.left = `${left}px`;
            card.style.top = `${Math.min(Math.max(top, margin), viewportH - nextCardRect.height - margin)}px`;
            return;
        }

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

        const clampLeft = value => Math.min(Math.max(value, margin), viewportW - cardRect.width - margin);
        const clampTop = value => Math.min(Math.max(value, margin), viewportH - cardRect.height - margin);
        const overlapArea = (candidateLeft, candidateTop) => {
            const overlapW = Math.max(0, Math.min(candidateLeft + cardRect.width, rect.right) - Math.max(candidateLeft, rect.left));
            const overlapH = Math.max(0, Math.min(candidateTop + cardRect.height, rect.bottom) - Math.max(candidateTop, rect.top));
            return overlapW * overlapH;
        };
        let finalLeft = clampLeft(left);
        let finalTop = clampTop(top);

        if (overlapArea(finalLeft, finalTop) > 0) {
            const candidates = [
                { left: rect.right + margin, top: rect.top + rect.height / 2 - cardRect.height / 2 },
                { left: rect.left - cardRect.width - margin, top: rect.top + rect.height / 2 - cardRect.height / 2 },
                { left: rect.left + rect.width / 2 - cardRect.width / 2, top: rect.bottom + margin },
                { left: rect.left + rect.width / 2 - cardRect.width / 2, top: rect.top - cardRect.height - margin }
            ].map(candidate => {
                const candidateLeft = clampLeft(candidate.left);
                const candidateTop = clampTop(candidate.top);
                return {
                    left: candidateLeft,
                    top: candidateTop,
                    overlap: overlapArea(candidateLeft, candidateTop)
                };
            }).sort((a, b) => a.overlap - b.overlap || Math.abs(a.top - rect.top) - Math.abs(b.top - rect.top));
            finalLeft = candidates[0].left;
            finalTop = candidates[0].top;
        }

        card.style.left = `${finalLeft}px`;
        card.style.top = `${finalTop}px`;
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
    lockOnboardingScroll();
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
    onboardingWelcomeVisible = false;
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

async function userHasNoWork(uid) {
    if (!uid || !db) return false;
    const collections = ['todos', 'notes', 'projects', 'bookmarks', 'wiki_pages'];
    const checks = collections.map(name =>
        db.collection(name).where('uid', '==', uid).limit(1).get()
    );
    const snapshots = await Promise.all(checks);
    return snapshots.every(snapshot => snapshot.empty);
}

async function showOnboardingIfNeeded(user) {
    if (!user || !db) return;
    try {
        const ref = db.collection('users').doc(user.uid);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            const progress = createDefaultOnboardingProgress();
            const socialProfile = getSocialAuthProfile(user);
            await ref.set({
                uid: user.uid,
                email: user.email || null,
                displayName: socialProfile.displayName || user.displayName || null,
                photoURL: socialProfile.photoURL || null,
                plan: 'basis',
                onboardingCompleted: false,
                onboardingCompletedAt: null,
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
        const socialProfile = getSocialAuthProfile(user);
        const profileUpdates = {};
        if (!data.displayName && socialProfile.displayName) profileUpdates.displayName = socialProfile.displayName;
        if (!data.photoURL && socialProfile.photoURL) profileUpdates.photoURL = socialProfile.photoURL;
        if (Object.keys(profileUpdates).length) {
            await ref.set({
                ...profileUpdates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
        onboardingState = buildOnboardingState(data);
        const hasExpandedGuideProgress = data.onboardingProgress && GUIDE_STEP_IDS.every(id => GUIDE_STATUS.includes(data.onboardingProgress[id]));
        const hasNoWork = await userHasNoWork(user.uid);
        if (!data.onboardingCompleted || !hasExpandedGuideProgress || hasNoWork) {
            openOnboarding({ restart: hasNoWork && data.onboardingCompleted });
        }
    } catch (error) {
        console.warn('Onboarding state unavailable:', error);
    }
}

// --- RENDER FUNCTIONS ---
function getTaskEmptyState() {
    return TASK_EMPTY_STATES[currentFilter] || TASK_EMPTY_STATES.all;
}

function isEclassTask(todo) {
    return todo?.source === 'eclass' || todo?.source === 'eclass-exam';
}

function renderEclassGroupHeader(todo) {
    const project = allProjects.find(p => p.id === todo.projectId);
    const courseName = project?.name || todo.courseTitle || 'e-Class';
    const courseTasks = allTodos.filter(item => !item.archived && isEclassTask(item) && (item.projectId === todo.projectId || (!todo.projectId && item.courseTitle === todo.courseTitle)));
    const code = String(courseName).match(/[A-Z]{2,}\d{3,}/)?.[0] || '';
    return `
        <div class="eclass-course-divider">
            <span class="eclass-course-dot" style="background:${project?.color || 'var(--accent)'}"></span>
            <strong>${escapeHtml(courseName)}</strong>
            <em>${courseTasks.length}</em>
            <span>${escapeHtml(code)}</span>
        </div>
    `;
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

    let lastEclassGroupKey = null;
    todos.forEach(todo => {
        if (isEclassTask(todo)) {
            const groupKey = todo.projectId || todo.courseTitle || 'eclass';
            if (groupKey !== lastEclassGroupKey) {
                todoList.insertAdjacentHTML('beforeend', renderEclassGroupHeader(todo));
                lastEclassGroupKey = groupKey;
            }
        } else {
            lastEclassGroupKey = null;
        }
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
        const sourceTag = isEclassTask(todo) ? `<span class="project-tag eclass-source-tag">e-Class</span>` : '';
        const typeTag = todo.source === 'eclass-exam' ? `<span class="project-tag eclass-type-tag">시험·발표</span>` : '';
        const tag = `${sourceTag}${proj ? `<span class="project-tag" style="background:${proj.color}33; color:${proj.color}; border: 1px solid ${proj.color}66;">${escapeHtml(proj.name)}</span>` : ''}${typeTag}`;
        const img = todo.imageUrl ? `<img src="${todo.imageUrl}" class="tc-img" alt="task image" onclick="window.open('${todo.imageUrl}', '_blank')">` : '';
        
        const dueBadge = isDueToday ? `<span class="due-today-badge">${t('dueToday')}</span>` : '';
        const priorityText = `${t(p)} ${t('priorityLabel')}`;

        card.innerHTML = `
            <div class="tc-top">
                <h3 class="tc-title">${todo.text}${dueBadge}</h3>
                <div class="tc-top-actions">
                    <span class="tc-priority-chip ${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}">
                        <span class="tc-status ${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}"></span>
                        ${priorityText}
                    </span>
                    <button class="tc-delete" data-id="${todo.id}" aria-label="${t('delete')}">&times;</button>
                </div>
            </div>
            <div class="tc-subtitle">${todo.dueDate ? '📅 ' + todo.dueDate + (todo.dueTime ? ' ' + todo.dueTime : '') : t('noDate')}${todo.calendarEventId ? ' • ' + t('calendarSyncOn') : ''}</div>
            ${img}<p class="tc-desc">${todo.memo || t('noNotes')}</p><div style="margin-top: 8px;">${tag}</div>
            <div class="tc-actions">
                <button class="tc-action-btn btn-toggle" data-id="${todo.id}">${todo.completed ? t('undo') : t('complete')}</button>
                <button class="tc-action-btn btn-edit-task" data-id="${todo.id}">${t('edit')}</button>
                ${todo.dueDate ? `<button class="tc-action-btn btn-apple-calendar" data-id="${todo.id}">Apple</button>` : ''}
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
    todoList.querySelectorAll('.btn-apple-calendar').forEach(b => b.onclick = () => {
        const task = allTodos.find(x => x.id === b.dataset.id);
        if (task) downloadAppleCalendarEvent(task);
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
    if (!notificationSettings.dailyTasks) return;
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

function notifyUser(title, body, tag) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const options = { body, icon: '/icon.svg', badge: '/icon.svg', tag };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => reg.showNotification(title, options));
    } else {
        new Notification(title, options);
    }
}

const firedReminderKeys = new Set();

function reminderSlotKey(id, dueDate, dueTime) {
    return `${id}|${dueDate || ''}|${dueTime || ''}`;
}

function scheduleReminderNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        reminderNotificationTimers.forEach(timer => clearTimeout(timer));
        reminderNotificationTimers.clear();
        return;
    }

    const now = Date.now();
    const desiredKeys = new Set();

    if (notificationSettings.dailyTasks) {
        const today = new Date();
        const [hour, minute] = (notificationSettings.dailyTime || '09:00').split(':').map(Number);
        const scheduled = new Date(today);
        scheduled.setHours(hour || 9, minute || 0, 0, 0);
        const todayKey = today.toISOString().slice(0, 10);
        const activeToday = allTodos.filter(task => !task.completed && !task.archived && task.dueDate === todayKey);
        const dailyKey = `daily-tasks|${todayKey}|${notificationSettings.dailyTime || '09:00'}`;
        if (activeToday.length && scheduled.getTime() > now && !firedReminderKeys.has(dailyKey)) {
            desiredKeys.add(dailyKey);
            if (!reminderNotificationTimers.has(dailyKey)) {
                const timer = setTimeout(() => {
                    firedReminderKeys.add(dailyKey);
                    reminderNotificationTimers.delete(dailyKey);
                    notifyUser('Planary', formatText('todayTaskNotificationBody', { count: activeToday.length }), 'daily-tasks');
                }, scheduled.getTime() - now);
                reminderNotificationTimers.set(dailyKey, timer);
            }
        }
    }

    if (notificationSettings.reminders !== false) {
        allTodos
            .filter(task => !task.completed && !task.archived && task.dueDate && task.dueTime)
            .forEach(task => {
                const trigger = new Date(`${task.dueDate}T${task.dueTime}:00`).getTime();
                if (!Number.isFinite(trigger) || trigger <= now) return;
                const key = reminderSlotKey(task.id, task.dueDate, task.dueTime);
                if (firedReminderKeys.has(key)) return;
                desiredKeys.add(key);
                if (reminderNotificationTimers.has(key)) return;
                const timer = setTimeout(() => {
                    firedReminderKeys.add(key);
                    reminderNotificationTimers.delete(key);
                    notifyUser(task.text || t('untitledTask'), formatText('reminderNotificationBody', { time: task.dueTime }), `task-${task.id}`);
                }, trigger - now);
                reminderNotificationTimers.set(key, timer);
            });
    }

    reminderNotificationTimers.forEach((timer, key) => {
        if (!desiredKeys.has(key)) {
            clearTimeout(timer);
            reminderNotificationTimers.delete(key);
        }
    });
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
    archiveListEl.querySelectorAll('.del-perm-btn').forEach(b => b.onclick = async () => {
        if (!confirm(t('permanentDeleteConfirm'))) return;
        const task = allTodos.find(item => item.id === b.dataset.id);
        await db.collection('todos').doc(b.dataset.id).delete();
        if (task?.imageUrl) await deleteStorageUrls(new Set([task.imageUrl]));
    });
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
        textEl.textContent = t('inspirationQuote'); dateEl.textContent = t('stayInspired');
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
    const task = allTodos.find(item => item.id === id);
    closeTaskDeleteDialog();
    await deleteTaskGoogleCalendarEvent(task);
    await db.collection('todos').doc(id).delete();
    if (task?.imageUrl) await deleteStorageUrls(new Set([task.imageUrl]));
}

function openTaskEditDialog(id) {
    const item = allTodos.find(x => x.id === id);
    if (!item) return;
    editingTaskId = id;
    if (getEl('task-edit-text')) getEl('task-edit-text').value = item.text || '';
    if (getEl('task-edit-memo')) getEl('task-edit-memo').value = item.memo || '';
    if (getEl('task-edit-due-date')) getEl('task-edit-due-date').value = item.dueDate || '';
    if (getEl('task-edit-due-time')) getEl('task-edit-due-time').value = item.dueTime || '';
    if (getEl('task-edit-calendar-reminder')) getEl('task-edit-calendar-reminder').value = String(item.calendarReminderMinutes ?? 30);
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

function syncNotificationSettingsUI() {
    const dailyToggle = getEl('notify-daily-tasks-toggle');
    const dailyTime = getEl('notify-daily-time');
    const remindersToggle = getEl('notify-reminders-toggle');
    const status = getEl('notification-status-text');
    if (dailyToggle) dailyToggle.checked = !!notificationSettings.dailyTasks;
    if (dailyTime) dailyTime.value = notificationSettings.dailyTime || '09:00';
    if (remindersToggle) remindersToggle.checked = notificationSettings.reminders !== false;
    if (status && 'Notification' in window) {
        status.textContent = Notification.permission === 'granted'
            ? t('notificationsAllowed')
            : Notification.permission === 'denied'
                ? t('notificationsDenied')
                : '';
    }
}

function bindNotificationSettings() {
    const dailyToggle = getEl('notify-daily-tasks-toggle');
    const dailyTime = getEl('notify-daily-time');
    const remindersToggle = getEl('notify-reminders-toggle');
    const permissionBtn = getEl('notification-permission-btn');
    if (dailyToggle && !dailyToggle.dataset.bound) {
        dailyToggle.dataset.bound = 'true';
        dailyToggle.onchange = () => {
            notificationSettings.dailyTasks = dailyToggle.checked;
            saveNotificationSettings();
            scheduleReminderNotifications();
        };
    }
    if (dailyTime && !dailyTime.dataset.bound) {
        dailyTime.dataset.bound = 'true';
        dailyTime.onchange = () => {
            notificationSettings.dailyTime = dailyTime.value || '09:00';
            saveNotificationSettings();
            scheduleReminderNotifications();
        };
    }
    if (remindersToggle && !remindersToggle.dataset.bound) {
        remindersToggle.dataset.bound = 'true';
        remindersToggle.onchange = () => {
            notificationSettings.reminders = remindersToggle.checked;
            saveNotificationSettings();
            scheduleReminderNotifications();
        };
    }
    if (permissionBtn && !permissionBtn.dataset.bound) {
        permissionBtn.dataset.bound = 'true';
        permissionBtn.onclick = async () => {
            if (!('Notification' in window)) return;
            await Notification.requestPermission();
            syncNotificationSettingsUI();
            scheduleReminderNotifications();
            registerFcmToken();
        };
    }
    syncNotificationSettingsUI();
}

let fcmRegistering = false;
let fcmOnMessageBound = false;

async function registerFcmToken() {
    if (fcmRegistering) return;
    if (!currentUser) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (typeof firebase === 'undefined' || !firebase.messaging) return;
    if (typeof firebase.messaging.isSupported === 'function' && !firebase.messaging.isSupported()) return;
    if (!navigator.serviceWorker) return;
    const vapidKey = window.PLANARY_FCM_VAPID_KEY;
    if (!vapidKey) return;

    fcmRegistering = true;
    try {
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = firebase.messaging();
        const token = await messaging.getToken({ vapidKey, serviceWorkerRegistration: swReg });
        if (!token) return;

        const platform = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile-web' : 'desktop-web';
        const ref = db.collection('fcm_tokens').doc(token);
        const existing = await ref.get();
        const ts = firebase.firestore.FieldValue.serverTimestamp();
        const payload = {
            uid: currentUser.uid,
            token,
            platform,
            userAgent: navigator.userAgent.slice(0, 200),
            lastSeenAt: ts
        };
        if (!existing.exists) payload.createdAt = ts;
        await ref.set(payload, { merge: true });
        localStorage.setItem('planary-fcm-token', token);

        if (!fcmOnMessageBound) {
            fcmOnMessageBound = true;
            messaging.onMessage(payload => {
                const title = (payload.notification && payload.notification.title) || 'Planary';
                const body = (payload.notification && payload.notification.body) || '';
                notifyUser(title, body, (payload.data && payload.data.todoId) || 'fcm');
            });
        }
    } catch (error) {
        console.warn('[fcm] register failed', error && error.message);
    } finally {
        fcmRegistering = false;
    }
}

async function unregisterFcmToken() {
    const token = localStorage.getItem('planary-fcm-token');
    localStorage.removeItem('planary-fcm-token');
    if (!token) return;
    try { await db.collection('fcm_tokens').doc(token).delete(); } catch (e) {}
    try {
        if (firebase.messaging && (!firebase.messaging.isSupported || firebase.messaging.isSupported())) {
            await firebase.messaging().deleteToken();
        }
    } catch (e) {}
}

async function ensureTaskCalendarAccess() {
    const user = auth?.currentUser || (typeof firebase !== 'undefined' ? firebase.auth().currentUser : null);
    if (!user) throw new Error(t('loginFirst'));
    if (taskCalendarAccessToken) return taskCalendarAccessToken;
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    const result = await user.reauthenticateWithPopup(provider);
    const credential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);
    if (!credential || !credential.accessToken) throw new Error(t('calendarTokenMissing'));
    taskCalendarAccessToken = credential.accessToken;
    const connectBtn = getEl('task-calendar-connect-btn');
    if (connectBtn) connectBtn.classList.add('active');
    const importBtn = getEl('task-calendar-import-btn');
    if (importBtn) importBtn.classList.add('active');
    return taskCalendarAccessToken;
}

function parseGoogleCalendarDate(value) {
    if (!value) return { dueDate: null, dueTime: null };
    if (value.date) return { dueDate: value.date, dueTime: null };
    if (!value.dateTime) return { dueDate: null, dueTime: null };
    const parsed = new Date(value.dateTime);
    if (Number.isNaN(parsed.getTime())) return { dueDate: null, dueTime: null };
    return {
        dueDate: parsed.toISOString().slice(0, 10),
        dueTime: parsed.toTimeString().slice(0, 5)
    };
}

function normalizeReminderMinutes(input, fallback = [30]) {
    const arr = Array.isArray(input) ? input : (input == null ? [] : [input]);
    const cleaned = arr.map(Number).filter(value => Number.isFinite(value) && value >= 0);
    const unique = [...new Set(cleaned)].sort((a, b) => b - a);
    return unique.length ? unique : fallback;
}

function resolveReminderMinutesList(task) {
    if (!task) return [30];
    return normalizeReminderMinutes(
        Array.isArray(task.calendarReminderMinutesList) && task.calendarReminderMinutesList.length
            ? task.calendarReminderMinutesList
            : task.calendarReminderMinutes
    );
}

function buildTaskCalendarEvent(task) {
    if (!task || !task.dueDate) return null;
    const start = new Date(`${task.dueDate}T${task.dueTime || '09:00'}:00`);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    const minutesList = resolveReminderMinutesList(task);
    return {
        summary: task.text || t('untitledTask'),
        description: task.memo || '',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        reminders: {
            useDefault: false,
            overrides: minutesList.map(minutes => ({ method: 'popup', minutes }))
        }
    };
}

async function syncTaskToGoogleCalendar(task) {
    if (!task || !task.dueDate || !task.syncCalendar) return null;
    const token = await ensureTaskCalendarAccess();
    const body = buildTaskCalendarEvent(task);
    if (!body) return null;
    const eventId = task.calendarEventId ? encodeURIComponent(task.calendarEventId) : '';
    const url = eventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`
        : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const response = await fetch(url, {
        method: eventId ? 'PUT' : 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Google Calendar ${response.status}`);
    return response.json();
}

async function deleteTaskGoogleCalendarEvent(task) {
    if (!task?.calendarEventId) return;
    if (task.source === 'google-calendar') return;
    try {
        const token = await ensureTaskCalendarAccess();
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(task.calendarEventId)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error(`Google Calendar ${response.status}`);
    } catch (error) {
        console.warn('Calendar event delete failed:', error);
    }
}

async function importGoogleCalendarTasks() {
    if (!currentUser || !db) throw new Error(t('loginFirst'));
    const token = await ensureTaskCalendarAccess();
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + 30);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(until.toISOString())}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Google Calendar ${response.status}`);
    const data = await response.json();
    const events = (data.items || []).filter(event => event.status !== 'cancelled' && event.id && event.summary);
    let imported = 0;
    for (const event of events) {
        const existing = await db.collection('todos')
            .where('uid', '==', currentUser.uid)
            .where('source', '==', 'google-calendar')
            .where('sourceItemId', '==', event.id)
            .limit(1)
            .get();
        if (!existing.empty) continue;
        const start = parseGoogleCalendarDate(event.start || {});
        await db.collection('todos').add({
            uid: currentUser.uid,
            text: event.summary || t('untitledEvent'),
            memo: event.description || null,
            dueDate: start.dueDate,
            dueTime: start.dueTime,
            calendarReminderMinutes: Number(event.reminders?.overrides?.[0]?.minutes ?? 30),
            calendarReminderMinutesList: normalizeReminderMinutes(
                (event.reminders?.overrides || []).map(o => o.minutes)
            ),
            syncCalendar: true,
            calendarEventId: event.id,
            priority: 'medium',
            projectId: null,
            imageUrl: null,
            completed: false,
            archived: false,
            source: 'google-calendar',
            sourceItemId: event.id,
            sourceUrl: event.htmlLink || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            orderIndex: Date.now() - imported
        });
        imported += 1;
    }
    lastCalendarImportAt = new Date();
    return imported;
}

function toIcsDate(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function downloadAppleCalendarEvent(task) {
    const event = buildTaskCalendarEvent(task);
    if (!event) {
        showToast(t('dueDateLabel') + ' / ' + t('dueTimeLabel'), 'error');
        return;
    }
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const title = (event.summary || t('untitledTask')).replace(/([,;\\])/g, '\\$1');
    const description = (event.description || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const minutesList = resolveReminderMinutesList(task);
    const alarms = minutesList.flatMap(minutes => [
        'BEGIN:VALARM',
        `TRIGGER:-PT${minutes}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${title}`,
        'END:VALARM'
    ]);
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Planary//Reminder//EN',
        'BEGIN:VEVENT',
        `UID:${task.id || Date.now()}@planary`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        ...alarms,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(task.text || 'planary-event').replace(/[\\/:*?"<>|]/g, '-')}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(t('appleCalendarDownloaded'), 'success');
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
    const existing = allTodos.find(item => item.id === editingTaskId);
    const editMinutes = Number(getEl('task-edit-calendar-reminder')?.value || 30);
    const editList = normalizeReminderMinutes(editMinutes);
    const payload = {
        text,
        memo: (getEl('task-edit-memo')?.value || '').trim() || null,
        dueDate: getEl('task-edit-due-date')?.value || null,
        dueTime: getEl('task-edit-due-time')?.value || null,
        calendarReminderMinutes: editList[0],
        calendarReminderMinutesList: editList,
        priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
        projectId: getEl('task-edit-project')?.value || null,
        syncCalendar: !!(existing?.calendarEventId || taskCalendarAccessToken)
    };
    if (payload.syncCalendar && payload.dueDate) {
        try {
            const event = await syncTaskToGoogleCalendar({ ...existing, ...payload });
            if (event?.id) payload.calendarEventId = event.id;
        } catch (error) {
            console.error('Calendar update failed:', error);
            showToast(t('calendarSyncFailed') + ': ' + (error.message || error), 'error');
        }
    }
    await db.collection('todos').doc(editingTaskId).update(payload);
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
    placeEclassPanelNearProfileTop();
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
                    loadTodos(); loadNotes(); loadProjects(); loadBookmarks(); loadWikiPagesForProjects(); loadEclassStatus();
                    startEclassForegroundSync();
                    showOnboardingIfNeeded(user);
                    registerFcmToken();
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
    document.addEventListener('click', blockOnboardingBackgroundEvent, true);
    document.addEventListener('mousedown', blockOnboardingBackgroundEvent, true);
    document.addEventListener('pointerdown', blockOnboardingBackgroundEvent, true);
    document.addEventListener('touchstart', blockOnboardingBackgroundEvent, { capture: true, passive: false });
    document.addEventListener('touchmove', blockOnboardingBackgroundScroll, { capture: true, passive: false });
    document.addEventListener('wheel', blockOnboardingBackgroundScroll, { capture: true, passive: false });
    document.addEventListener('keydown', blockOnboardingBackgroundKeys, true);
    window.addEventListener('scroll', (event) => {
        if (event.target && event.target.closest && event.target.closest('.onboarding-card')) return;
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
    if (getEl('empty-archive-btn')) getEl('empty-archive-btn').onclick = async () => {
        const archived = allTodos.filter(item => item.archived);
        if (!archived.length) { showToast(t('archiveAlreadyEmpty')); return; }
        if (!confirm(t('emptyArchiveConfirm'))) return;
        try {
            const urls = new Set();
            const batch = db.batch();
            archived.forEach(task => {
                batch.delete(db.collection('todos').doc(task.id));
                if (task.imageUrl) urls.add(task.imageUrl);
            });
            await batch.commit();
            if (urls.size) await deleteStorageUrls(urls);
            showToast(t('archiveEmptied'));
        } catch (err) {
            console.error('[Archive] empty failed:', err);
            showToast((t('archiveEmptyFailed') || 'Failed') + ': ' + (err.message || err), 'error');
        }
    };
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
    bindNotificationSettings();

    if (getEl('search-input')) getEl('search-input').oninput = () => applyFilters();

    if (getEl('task-details-toggle')) {
        getEl('task-details-toggle').onclick = () => {
            const composer = getEl('task-details-toggle').closest('.composer');
            composer?.classList.toggle('details-open');
        };
    }

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
    if (menuToggle && !menuToggle.dataset.mobileNavBound) {
        menuToggle.onclick = (e) => { e.stopPropagation(); document.body.classList.toggle('nav-open'); };
    }
    if (overlay && !overlay.dataset.mobileNavBound) overlay.onclick = () => document.body.classList.remove('nav-open');
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

    if (getEl('task-calendar-connect-btn')) {
        getEl('task-calendar-connect-btn').onclick = async () => {
            try {
                await ensureTaskCalendarAccess();
                showToast(t('calendarConnected'), 'success');
            } catch (error) {
                console.error('Calendar connect failed:', error);
                showToast(t('calendarConnectFailed') + ': ' + (error.message || error), 'error');
            }
        };
    }

    if (getEl('task-calendar-import-btn')) {
        getEl('task-calendar-import-btn').onclick = async () => {
            try {
                const count = await importGoogleCalendarTasks();
                showToast(count ? `${t('calendarImportDone')} (${count})` : t('calendarImportEmpty'), count ? 'success' : 'info');
            } catch (error) {
                console.error('Calendar import failed:', error);
                showToast(t('calendarConnectFailed') + ': ' + (error.message || error), 'error');
            }
        };
    }

    if (getEl('task-apple-calendar-btn')) {
        getEl('task-apple-calendar-btn').onclick = () => {
            const input = getEl('todo-input'), memoInput = getEl('memo-input'), dateInput = getEl('due-date'), timeInput = getEl('due-time'), reminderInput = getEl('calendar-reminder-select');
            const task = {
                text: input?.value?.trim() || t('untitledTask'),
                memo: memoInput?.value?.trim() || '',
                dueDate: dateInput?.value || null,
                dueTime: timeInput?.value || '09:00',
                calendarReminderMinutes: Number(reminderInput?.value || 30)
            };
            downloadAppleCalendarEvent(task);
        };
    }

    if (getEl('add-btn')) getEl('add-btn').onclick = async () => {
        const input = getEl('todo-input'), memoInput = getEl('memo-input'), dateInput = getEl('due-date'), timeInput = getEl('due-time'), reminderInput = getEl('calendar-reminder-select'), priorityInput = getEl('priority-select'), projectInput = getEl('todo-project-select');
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
        const addList = normalizeReminderMinutes(Number(reminderInput?.value || 30));
        const payload = {
            uid: currentUser.uid,
            text,
            memo: memoInput.value.trim() || null,
            dueDate: dateInput.value || null,
            dueTime: timeInput.value || null,
            calendarReminderMinutes: addList[0],
            calendarReminderMinutesList: addList,
            syncCalendar: !!dateInput.value && !!taskCalendarAccessToken,
            priority: selectedPriority,
            projectId: projectInput.value || null,
            imageUrl,
            completed: false,
            archived: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            orderIndex: Date.now()
        };

        try {
            let calendarEvent = null;
            if (payload.syncCalendar) {
                try {
                    calendarEvent = await syncTaskToGoogleCalendar(payload);
                    if (calendarEvent?.id) payload.calendarEventId = calendarEvent.id;
                } catch (calendarError) {
                    console.error('Calendar sync failed:', calendarError);
                    showToast(t('calendarSyncFailed') + ': ' + (calendarError.message || calendarError), 'error');
                }
            }
            await db.collection('todos').add(payload);
            markGuideStepComplete('taskCreate');
            if (payload.memo || payload.dueDate || payload.priority !== 'medium') markGuideStepComplete('taskDetails');
            input.value = '';
            memoInput.value = '';
            dateInput.value = '';
            if (timeInput) timeInput.value = '';
            if (priorityInput) priorityInput.value = 'medium';
            if (projectInput) projectInput.value = '';
            if (getEl('remove-task-img')) getEl('remove-task-img').click();
            showToast(calendarEvent?.id ? t('calendarTaskSynced') : t('added'));
        } catch (error) {
            console.error("Task creation failed:", error, payload);
            if (imageUrl) await deleteStorageUrls(new Set([imageUrl]));
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
                    content: { time: Date.now(), blocks: [], version: '2.28.2' },
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

    const logout = () => confirm(t('logoutConfirm')) && unregisterFcmToken().finally(() => auth.signOut().then(() => window.location.href = 'login.html'));
    if (getEl('logout-btn')) getEl('logout-btn').onclick = logout;
    if (getEl('profile-logout-btn')) getEl('profile-logout-btn').onclick = logout;
    if (getEl('profile-delete-account-btn')) getEl('profile-delete-account-btn').onclick = deleteAccount;
    if (getEl('profile-eclass-save-btn')) getEl('profile-eclass-save-btn').onclick = saveEclassConnection;
    if (getEl('profile-eclass-sync-btn')) getEl('profile-eclass-sync-btn').onclick = syncEclassNow;
});
