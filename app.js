// Global Error Handling
window.addEventListener('error', (event) => {
    console.error("Global error caught:", event.error);
    if (window.showToast) window.showToast("런타임 에러: " + event.message, "error");
});

// Firebase Initialization
let db = null;
let auth = null;

try {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.firestore();
        auth = firebase.auth();
    }
} catch (e) {
    console.error("Firebase services initialization failed:", e);
}

document.addEventListener('DOMContentLoaded', () => {
    const getEl = (id) => document.getElementById(id);
    const todoList = getEl('todo-list');
    const searchInput = getEl('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    let currentUser = null;
    let allTodos = [];
    let allNotes = [];
    let currentFilter = 'all';

    // Search functionality - Real-time binding
    if (searchInput) {
        searchInput.oninput = () => {
            applyFilters();
        };
    }

    // Font selection logic
    const fontSelect = getEl('app-font-select');
    if (fontSelect) {
        const savedFont = localStorage.getItem('app-font');
        if (savedFont) {
            document.body.style.fontFamily = savedFont;
            fontSelect.value = savedFont;
        }
        fontSelect.onchange = (e) => {
            const font = e.target.value;
            document.body.style.fontFamily = font;
            localStorage.setItem('app-font', font);
        };
    }

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
                if (isAuthPage) window.location.href = 'index.html';
                else { loadTodos(); loadNotes(); }
            }
        });
    }

    const updateProfileUI = (user) => {
        if (!user) return;
        const name = user.displayName || user.email.split('@')[0];
        if (getEl('user-name-sidebar')) getEl('user-name-sidebar').textContent = name;
        if (getEl('user-email-sidebar')) getEl('user-email-sidebar').textContent = user.email;
        if (getEl('user-photo') && user.photoURL) getEl('user-photo').src = user.photoURL;
        if (getEl('profile-view-name')) getEl('profile-view-name').textContent = name;
        if (getEl('profile-view-email')) getEl('profile-view-email').textContent = user.email;
    };

    // SPA Router
    const switchPage = (targetId) => {
        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        const targetPage = getEl(targetId);
        if (targetPage) targetPage.classList.add('active');
        if (targetId === 'page-tasks') applyFilters();
    };

    document.querySelectorAll('[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            switchPage(targetId);
            if (targetId === 'page-tasks' && link.hasAttribute('data-filter')) {
                currentFilter = link.getAttribute('data-filter');
                filterChips.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
                applyFilters();
            }
        });
    });

    // CRUD - Todos
    const loadTodos = () => {
        if (!currentUser || !db) return;
        db.collection('todos').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allTodos = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                createdAt: doc.data().createdAt || { toMillis: () => Date.now() }
            }));
            allTodos.sort((a, b) => (b.createdAt.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt.toMillis ? a.createdAt.toMillis() : 0));
            applyFilters();
        });
    };

    const applyFilters = () => {
        const term = searchInput ? searchInput.value.toLowerCase() : "";
        let filtered = allTodos.filter(t => (t.text && t.text.toLowerCase().includes(term)) || (t.memo && t.memo.toLowerCase().includes(term)));
        if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed && !t.archived);
        else if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed && !t.archived);
        else if (currentFilter === 'important') filtered = filtered.filter(t => t.priority === 'high' && !t.archived);
        else if (currentFilter === 'archive') filtered = filtered.filter(t => t.archived);
        else filtered = filtered.filter(t => !t.archived);
        renderTodos(filtered);
    };

    const renderTodos = (todos) => {
        if (!todoList) return;
        todoList.innerHTML = todos.length ? '' : '<div class="empty-state">No tasks found.</div>';
        todos.forEach(todo => {
            const card = document.createElement('div');
            card.className = `task-card${todo.completed ? ' completed' : ''}`;
            const p = todo.priority || 'medium';
            card.innerHTML = `
                <button class="tc-delete" data-id="${todo.id}">×</button>
                <div class="tc-top">
                    <h3 class="tc-title">${todo.text}</h3>
                    <span class="tc-status ${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}"></span>
                </div>
                <div class="tc-subtitle">${p.toUpperCase()} PRIORITY ${todo.dueDate ? '• 📅 ' + todo.dueDate : ''}</div>
                <p class="tc-desc">${todo.memo || 'No notes.'}</p>
                <div class="tc-actions">
                    <button class="tc-action-btn btn-toggle" data-id="${todo.id}">${todo.completed ? 'Undo' : 'Complete'}</button>
                    <button class="tc-action-btn btn-edit-task" data-id="${todo.id}">Edit</button>
                    <button class="tc-action-btn btn-archive" data-id="${todo.id}">${todo.archived ? 'Restore' : 'Archive'}</button>
                </div>
            `;
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
    };

    // Task Add (Restored Robust Logic)
    const addBtn = getEl('add-btn');
    if (addBtn) {
        addBtn.onclick = (e) => {
            if (e) e.preventDefault();
            if (!db) return showToast("Firebase 연결 대기 중...", "error");

            let inputEl = document.querySelector('#page-tasks #todo-input') || getEl('todo-input');
            let text = inputEl ? inputEl.value.trim() : "";

            if (!text && document.activeElement && document.activeElement.tagName === 'INPUT') {
                text = document.activeElement.value.trim();
                inputEl = document.activeElement;
            }

            if (!text) {
                const allInputs = document.querySelectorAll('input[type="text"]');
                for (const input of allInputs) {
                    if (input.value.trim() !== "" && !input.id.includes('search')) {
                        text = input.value.trim();
                        inputEl = input;
                        break;
                    }
                }
            }

            if (!text) return showToast("할 일을 입력해주세요.", "info");
            if (!currentUser) return showToast("로그인이 필요합니다.", "error");

            db.collection('todos').add({
                uid: currentUser.uid,
                text: text,
                memo: getEl('memo-input') ? getEl('memo-input').value.trim() : "",
                dueDate: getEl('due-date') ? getEl('due-date').value : "",
                priority: getEl('priority-select') ? getEl('priority-select').value : "medium",
                completed: false,
                archived: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                if (inputEl) inputEl.value = '';
                if (getEl('memo-input')) getEl('memo-input').value = '';
                showToast("Task added!", "success");
            }).catch(err => {
                console.error("Add error:", err);
                showToast("추가 실패: " + err.message, "error");
            });
        };

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.activeElement && (document.activeElement.id === 'todo-input' || document.activeElement.id === 'memo-input')) {
                addBtn.click();
            }
        });
    }

    // CRUD - Notes
    const loadNotes = () => {
        if (!currentUser || !db) return;
        db.collection('notes').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNotes(allNotes);
        });
    };

    const renderNotes = (notes) => {
        const list = getEl('notes-list');
        if (!list) return;
        list.innerHTML = notes.length ? '' : '<div class="empty-state">No notes. Drag to move!</div>';
        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.dataset.id = note.id;
            card.style.left = (note.x || 20) + 'px';
            card.style.top = (note.y || 20) + 'px';
            card.innerHTML = `
                <div class="note-content">${note.text}</div>
                <div class="note-footer">
                    <button class="note-edit-btn" data-id="${note.id}">Edit</button>
                    <button class="note-delete-btn" data-id="${note.id}">Delete</button>
                </div>
            `;
            list.appendChild(card);
            setupDragging(card);
        });
        list.querySelectorAll('.note-delete-btn').forEach(b => b.onclick = () => db.collection('notes').doc(b.dataset.id).delete());
        list.querySelectorAll('.note-edit-btn').forEach(b => b.onclick = () => openEditModal('note', b.dataset.id));
    };

    const setupDragging = (el) => {
        let isDragging = false, startX, startY, initL, initT;
        const down = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true; el.style.zIndex = 1000;
            const t = e.type === 'touchstart' ? e.touches[0] : e;
            startX = t.clientX; startY = t.clientY;
            initL = el.offsetLeft; initT = el.offsetTop;
            document.addEventListener(e.type === 'touchstart' ? 'touchmove' : 'mousemove', move);
            document.addEventListener(e.type === 'touchstart' ? 'touchend' : 'mouseup', up);
        };
        const move = (e) => {
            if (!isDragging) return;
            const t = e.type === 'touchmove' ? e.touches[0] : e;
            el.style.left = (initL + t.clientX - startX) + 'px';
            el.style.top = (initT + t.clientY - startY) + 'px';
        };
        const up = () => {
            if (!isDragging) return;
            isDragging = false; el.style.zIndex = 1;
            document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up);
            document.removeEventListener('touchmove', move); document.removeEventListener('touchend', up);
            db.collection('notes').doc(el.dataset.id).update({ x: parseInt(el.style.left), y: parseInt(el.style.top) });
        };
        el.addEventListener('mousedown', down);
        el.addEventListener('touchstart', down, { passive: true });
    };

    if (getEl('add-note-btn')) {
        getEl('add-note-btn').onclick = () => {
            const input = getEl('note-input');
            const text = input.value.trim();
            if (!text || !currentUser) return;
            db.collection('notes').add({
                uid: currentUser.uid, text, 
                x: Math.random() * 200 + 20, y: Math.random() * 200 + 20,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => input.value = '');
        };
    }

    // Modal Edit Logic
    const openEditModal = (type, id) => {
        const item = type === 'todo' ? allTodos.find(x => x.id === id) : allNotes.find(x => x.id === id);
        if (!item) return;

        const newText = prompt("수정할 내용을 입력하세요:", item.text);
        if (newText !== null && newText.trim() !== "") {
            db.collection(type === 'todo' ? 'todos' : 'notes').doc(id).update({ text: newText.trim() })
                .then(() => showToast("수정되었습니다.", "success"));
        }
    };

    const triggerLogout = () => confirm('Logout?') && auth.signOut().then(() => window.location.href = 'login.html');
    if (getEl('logout-btn')) getEl('logout-btn').onclick = triggerLogout;
    if (getEl('profile-logout-btn')) getEl('profile-logout-btn').onclick = triggerLogout;
});

window.showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container') || document.body.appendChild(Object.assign(document.createElement('div'), {id: 'toast-container'}));
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
};
