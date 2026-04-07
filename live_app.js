if (typeof firebase === 'undefined') {
    alert("🚨 Firebase가 정상적으로 로드되지 않았습니다! 바탕화면에서 파일을 직접 클릭(file://)해서 연 경우 작동하지 않습니다. 배포된 라이브 링크(https://practice-todo-list...)로 접속하시거나 로컬 서버를 켜서 테스트해주세요!");
}

// Firebase initialized via /__/firebase/init.js
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
const auth = typeof firebase !== 'undefined' ? firebase.auth() : null;

// Offline Persistence
db.enablePersistence().catch(err => console.warn("Persistence failed:", err.code));

document.addEventListener('DOMContentLoaded', () => {
    const getEl = (id) => document.getElementById(id);
    const todoList = getEl('todo-list');
    const searchInput = getEl('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    let currentUser = null;
    let allTodos = [];
    let allNotes = [];
    let currentFilter = 'all';

    // Auth State Listener
    auth.onAuthStateChanged(user => {
        const path = window.location.pathname.toLowerCase();
        const isAuthPage = path.includes('login') || path.includes('signup');
        
        if (!user) {
            if (!isAuthPage) {
                console.log("No user, redirecting to login...");
                window.location.href = 'login.html';
            }
        } else {
            currentUser = user;
            updateProfileUI(user);
            if (isAuthPage) {
                window.location.href = 'index.html';
            } else {
                loadTodos();
                loadNotes();
            }
        }
    });

    const updateProfileUI = (user) => {
        const name = user.displayName || user.email.split('@')[0];
        
        // Update Sidebar
        const nameSidebar = getEl('user-name-sidebar');
        const emailSidebar = getEl('user-email-sidebar');
        const photoDisplay = getEl('user-photo');
        const welcomeMsg = getEl('welcome-message');

        if (nameSidebar) nameSidebar.textContent = name;
        if (emailSidebar) emailSidebar.textContent = user.email;
        if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${name}!`;
        if (photoDisplay && user.photoURL) photoDisplay.src = user.photoURL;

        // Update Profile Page view
        if (getEl('profile-view-name')) getEl('profile-view-name').textContent = name;
        if (getEl('profile-view-email')) getEl('profile-view-email').textContent = user.email;
    };

    // ==========================================
    // SPA ROUTER LOGIC (One-Page Site)
    // ==========================================
    const switchPage = (targetId) => {
        // Hide all page contents
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show target page
        const targetPage = getEl(targetId);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Ensure filter buttons in tasks view are synced
        if (targetId === 'page-tasks') {
            filterChips.forEach(b => {
                b.style.display = 'inline-block'; // show all by default
            });
            applyFilters(); 
        }
    };

    document.querySelectorAll('[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Sync active state on navigation elements
            if (link.classList.contains('nav-link')) {
                document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
                link.classList.add('active');
            }
            if (link.classList.contains('rail-icon')) {
                document.querySelectorAll('.rail-icon').forEach(icon => icon.classList.remove('active'));
                link.classList.add('active');
            }

            const targetId = link.getAttribute('data-target');
            switchPage(targetId);

            // Handle specific filters if it's pointing to page-tasks
            if (targetId === 'page-tasks' && link.hasAttribute('data-filter')) {
                currentFilter = link.getAttribute('data-filter');
                filterChips.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
                });
                applyFilters();
            }
        });
    });

    // ==========================================
    // TASKS CRUD & DOM LOGIC
    // ==========================================
    const loadTodos = () => {
        if (!currentUser || !todoList) return;

        // No orderBy here to prevent index errors
        db.collection('todos')
            .where('uid', '==', currentUser.uid)
            .onSnapshot(snapshot => {
                allTodos = snapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    // Local fallback for null timestamp during optimistic sync
                    createdAt: doc.data().createdAt || { toMillis: () => Date.now() }
                }));
                // Sort client-side by descending creation time
                allTodos.sort((a, b) => {
                    const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                    const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                    return timeB - timeA; 
                });
                applyFilters();
            }, err => {
                console.error("Firestore error:", err);
                showToast("데이터를 불러오는 중 오류가 발생했습니다: " + err.message, "error");
            });
    };

    const applyFilters = () => {
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
        
        let filtered = allTodos.filter(todo => 
            (todo.text && todo.text.toLowerCase().includes(searchTerm)) || 
            (todo.memo && todo.memo.toLowerCase().includes(searchTerm))
        );

        if (currentFilter === 'active') {
            filtered = filtered.filter(t => !t.completed && !t.archived);
        } else if (currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed && !t.archived);
        } else if (currentFilter === 'important') {
            filtered = filtered.filter(t => t.priority === 'high' && !t.archived);
        } else if (currentFilter === 'reminders') {
            filtered = filtered.filter(t => t.dueDate && !t.archived);
        } else if (currentFilter === 'archive') {
            filtered = filtered.filter(t => t.archived);
        } else {
            // "all" filter usually hides archived unless you view archive directly
            filtered = filtered.filter(t => !t.archived);
        }

        renderTodos(filtered);
    };

    const priorityColor = { high: 'red', medium: 'blue', low: 'green' };

    const renderTodos = (todos) => {
        if (!todoList) return;
        todoList.innerHTML = '';

        if (todos.length === 0) {
            todoList.innerHTML = '<div class="empty-state">No tasks found. Try changing your filters or adding a task!</div>';
            return;
        }

        todos.forEach((todo, index) => {
            const card = document.createElement('div');
            const p = todo.priority || 'medium';
            card.className = `task-card${todo.completed ? ' completed' : ''}`;

            const today = new Date().toISOString().split('T')[0];
            const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < today;

            card.innerHTML = `
                <button class="tc-delete" data-id="${todo.id}" title="Delete">×</button>
                <div class="tc-top">
                    <h3 class="tc-title">${todo.text}</h3>
                    <span class="tc-status ${priorityColor[p]}" title="${p} priority"></span>
                </div>
                <div class="tc-subtitle">
                    <span>${(todo.priority || 'Medium').toUpperCase()} PRIORITY</span>
                    ${todo.dueDate ? `<span class="${isOverdue ? 'overdue' : ''}">${isOverdue ? '⚠️' : '📅'} ${todo.dueDate}</span>` : ''}
                </div>
                <p class="tc-desc">${todo.memo || 'No additional notes.'}</p>
                
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="tc-action-btn" data-id="${todo.id}" data-action="toggle" style="flex:1;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <span>${todo.completed ? 'Completed' : 'Mark as Completed'}</span>
                    </button>
                    <button class="tc-action-btn btn-archive" data-id="${todo.id}" data-action="archive" style="background:#f5f5f7; color:#555;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                        <span>${todo.archived ? 'Restore' : 'Archive'}</span>
                    </button>
                </div>
            `;
            todoList.appendChild(card);
        });

        todoList.querySelectorAll('.tc-action-btn[data-action="toggle"]').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const task = allTodos.find(t => t.id === id);
                if(task) db.collection('todos').doc(id).update({ completed: !task.completed });
            };
        });

        todoList.querySelectorAll('.tc-action-btn[data-action="archive"]').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const task = allTodos.find(t => t.id === id);
                if(task) {
                    db.collection('todos').doc(id).update({ archived: !task.archived });
                    showToast(task.archived ? "Restored from Archive" : "Moved to Archive");
                }
            };
        });

        todoList.querySelectorAll('.tc-delete').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Delete this task?')) {
                    db.collection('todos').doc(btn.dataset.id).delete();
                }
            };
        });
    };

    // Task Events
    const todoInput = getEl('todo-input');
    const addBtn = getEl('add-btn');
    if (addBtn && todoInput) {
        addBtn.onclick = () => {
            const text = todoInput.value.trim();
            if (!text || !currentUser) return;
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
                todoInput.value = '';
                if (getEl('memo-input')) getEl('memo-input').value = '';
                if (getEl('due-date')) getEl('due-date').value = '';
                showToast("Task added!", "success");
            }).catch(err => {
                console.error("Task add error:", err);
                showToast("추가 실패: " + err.message, "error");
            });
        };
        todoInput.onkeypress = (e) => e.key === 'Enter' && addBtn.onclick();
    }

    if (searchInput) searchInput.oninput = applyFilters;
    
    // Top chip filters
    filterChips.forEach(chip => {
        chip.onclick = () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            applyFilters();
        };
    });


    // ==========================================
    // NOTES CRUD & DOM LOGIC
    // ==========================================
    const notesList = getEl('notes-list');
    const noteInput = getEl('note-input');
    const addNoteBtn = getEl('add-note-btn');

    const loadNotes = () => {
        if (!currentUser || !notesList) return;
        
        db.collection('notes')
            .where('uid', '==', currentUser.uid)
            .onSnapshot(snapshot => {
                allNotes = snapshot.docs.map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    createdAt: doc.data().createdAt || { toMillis: () => Date.now() }
                }));
                // Sort descending
                allNotes.sort((a, b) => {
                    const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                    const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                    return timeB - timeA; 
                });
                renderNotes(allNotes);
            });
    };

    const renderNotes = (notes) => {
        if (!notesList) return;
        notesList.innerHTML = '';
        
        if (notes.length === 0) {
            notesList.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;">새로운 메모를 작성해보세요. (Add a note!)</div>';
            return;
        }

        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            
            const dateStr = note.createdAt ? new Date(note.createdAt.toMillis()).toLocaleString() : '방금 전';

            card.innerHTML = `
                <div class="note-content">${note.text}</div>
                <div class="note-footer">
                    <span>${dateStr}</span>
                    <button class="note-delete-btn" data-id="${note.id}" title="Delete Note">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            notesList.appendChild(card);
        });

        notesList.querySelectorAll('.note-delete-btn').forEach(btn => {
            btn.onclick = () => {
                if(confirm('이 메모를 삭제하시겠습니까?')) {
                    db.collection('notes').doc(btn.dataset.id).delete();
                }
            };
        });
    };

    if (addNoteBtn && noteInput) {
        addNoteBtn.onclick = () => {
            const text = noteInput.value.trim();
            if(!text || !currentUser) return;
            
            db.collection('notes').add({
                uid: currentUser.uid,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                noteInput.value = '';
            }).catch(err => {
                console.error("Note add error:", err);
                showToast("추가 실패: " + err.message, "error");
            });
        };
        noteInput.onkeypress = (e) => e.key === 'Enter' && addNoteBtn.onclick();
    }

    // ==========================================
    // LOGOUT LOGIC
    // ==========================================
    const profileLogoutBtn = getEl('profile-logout-btn');
    const oldLogoutBtn = getEl('logout-btn');
    
    const triggerLogout = () => {
        if (confirm('Logout?')) {
            auth.signOut().then(() => window.location.href = 'login.html');
        }
    };
    
    if (oldLogoutBtn) oldLogoutBtn.onclick = triggerLogout;
    if (profileLogoutBtn) profileLogoutBtn.onclick = triggerLogout;

});

/* Global Toast */
window.showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container') || document.body.appendChild(Object.assign(document.createElement('div'), {id: 'toast-container'}));
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
};
