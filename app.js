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
let currentFilter = 'all';
let currentProjectId = null;
let selectedNoteColor = 'yellow';

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

// --- CORE BUSINESS LOGIC (HOISTED) ---
function loadTodos() {
    if (!currentUser || !db) return;
    db.collection('todos').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
        allTodos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        applyFilters();
        updateDashboardUI();
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
            if (targetId !== 'page-tasks' || !f || f === currentFilter) el.classList.add('active');
        }
    });
    
    updateSidebarHeader(targetId);
    document.body.classList.remove('nav-open');
    const fab = getEl('mobile-nav-container');
    if (fab) fab.classList.remove('active');
    
    if (targetId === 'page-tasks') applyFilters();
    if (targetId === 'page-archive') renderArchive();
}

function updateSidebarHeader(pageId) {
    const iconBox = getEl('sidebar-header-icon'), titleEl = getEl('sidebar-header-title'), subtitleEl = getEl('sidebar-header-subtitle');
    if (!iconBox || !titleEl) return;
    const mapper = {
        'page-home': { title: 'Overview', subtitle: 'Dashboard Summary', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
        'page-tasks': { title: 'My Tasks', subtitle: 'Todo Manager ↗', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
        'page-projects': { title: 'Project Groups', subtitle: 'Category Manager', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>' },
        'page-notes': { title: 'Sticky Board', subtitle: 'Idea Notes', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
        'page-bookmarks': { title: 'Web Saved', subtitle: 'Reference Links', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' },
        'page-archive': { title: 'Vault', subtitle: 'Historical Records', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>' },
        'page-profile': { title: 'Profile Settings', subtitle: 'User Account', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
        'page-wiki': { title: 'Wiki & Docs', subtitle: 'Knowledge Base', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>' }
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
            reg.showNotification("Todo Planner Reminder", options);
        });
    } else {
        new Notification("Todo Planner Reminder", options);
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
    select.innerHTML = '<option value="">No Project</option>';
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
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
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
        div.innerHTML = `
            <div class="stat-icon" style="background:${p.color}33; color:${p.color}; width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3 style="margin-bottom:4px;">${p.name}</h3>
            <p style="font-size:0.8rem; color:var(--text-2); margin-bottom:16px;">${allTodos.filter(t => t.projectId === p.id).length} tasks</p>
            <button class="text-link-btn" onclick="deleteProject('${p.id}')">Delete</button>
        `;
        list.appendChild(div);
    });
}
window.deleteProject = (id) => confirm('Delete project?') && db.collection('projects').doc(id).delete();

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
        
        // Multi-tab sync & Cache settings
        db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
        db.enablePersistence({synchronizeTabs: true}).catch(err => console.warn("Persistence error", err.code));
    }
} catch (e) { console.error("Firebase Init Error", e); }

document.addEventListener('DOMContentLoaded', () => {
    // Auth State Listener
    if (auth) {
        auth.onAuthStateChanged(user => {
            const path = window.location.pathname.toLowerCase();
            const isAuthPage = path.includes('login') || path.includes('signup');
            if (!user) {
                if (!isAuthPage) window.location.href = 'login.html';
            } else {
                currentUser = user;
                updateProfileUI(user);
                if (isAuthPage) window.location.replace('/');
                else { 
                    loadTodos(); loadNotes(); loadProjects(); loadBookmarks(); 
                }
            }
        });
    }

    // Theme & Navigation Init
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
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

    if (getEl('search-input')) getEl('search-input').oninput = () => applyFilters();

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.onclick = () => {
            currentFilter = chip.dataset.filter; currentProjectId = null;
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === currentFilter));
            switchPage('page-tasks');
        };
    });

    document.querySelectorAll('[data-target]').forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            const tid = link.dataset.target;
            if (tid === 'page-tasks' && link.dataset.filter) {
                currentFilter = link.dataset.filter; currentProjectId = null;
            }
            window.location.hash = tid;
        };
    });

    // Mobile Nav
    const menuToggle = getEl('menu-toggle'), overlay = getEl('sidebar-overlay'), fabTrigger = getEl('fab-trigger'), fabContainer = getEl('mobile-nav-container');
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
        const text = input.value.trim(); if (!text || !currentUser) return;

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

        db.collection('todos').add({
            uid: currentUser.uid, text, memo: memoInput.value.trim(), dueDate: dateInput.value, priority: priorityInput.value, projectId: projectInput.value || null,
            imageUrl: imageUrl,
            completed: false, archived: false, createdAt: firebase.firestore.FieldValue.serverTimestamp(), orderIndex: Date.now()
        }).then(() => { 
            input.value = ''; memoInput.value = ''; dateInput.value = ''; 
            if (getEl('remove-task-img')) getEl('remove-task-img').click();
            showToast("Added!"); 
        });
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

    const logout = () => confirm('Logout?') && auth.signOut().then(() => window.location.href = 'login.html');
    if (getEl('logout-btn')) getEl('logout-btn').onclick = logout;
    if (getEl('profile-logout-btn')) getEl('profile-logout-btn').onclick = logout;
});
