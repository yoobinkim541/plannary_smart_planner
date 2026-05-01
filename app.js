// Global Error Handling
window.addEventListener('error', (event) => {
    console.error("Global error caught:", event.error);
    if (window.showToast) window.showToast("런타임 에러: " + event.message, "error");
});

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Firebase Initialization
let db = null;
let auth = null;

try {
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        db = firebase.firestore();
        auth = firebase.auth();
        
        // Enable Offline Persistence
        db.enablePersistence()
            .catch((err) => {
                if (err.code == 'failed-precondition') {
                    console.warn('Persistence failed: Multiple tabs open.');
                } else if (err.code == 'unimplemented') {
                    console.warn('Persistence not supported by this browser.');
                }
            });
    }
} catch (e) {
    console.error("Firebase services initialization failed:", e);
}

document.addEventListener('DOMContentLoaded', () => {
    const getEl = (id) => document.getElementById(id);
    const todoList = getEl('todo-list');
    const searchInput = getEl('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    
    // Theme Management
    const themeToggleBtn = getEl('theme-toggle-btn');
    const initTheme = () => {
        const savedTheme = localStorage.getItem('app-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (themeToggleBtn) {
            themeToggleBtn.innerHTML = savedTheme === 'dark' 
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>' // Sun
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'; // Moon
        }
    };
    initTheme();

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            localStorage.setItem('app-theme', newTheme);
            initTheme();
        });
    }

    let currentUser = null;
    let allTodos = [];
    let allNotes = [];
    let allProjects = [];
    let allBookmarks = [];
    let currentFilter = 'all';
    let currentProjectId = null;
    let selectedNoteColor = 'yellow';

    // Search functionality
    if (searchInput) {
        searchInput.oninput = () => applyFilters();
    }

    // Filter Chips (Top of Tasks page)
    if (filterChips.length > 0) {
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const filter = chip.getAttribute('data-filter');
                if (filter) {
                    currentFilter = filter;
                    currentProjectId = null;
                    // Sync active state UI
                    filterChips.forEach(c => c.classList.toggle('active', c.dataset.filter === currentFilter));
                    // Re-apply navigation logic (sync sidebar)
                    switchPage('page-tasks');
                    applyFilters();
                }
            });
        });
    }

    // Color Selector logic
    const colorPicker = getEl('note-color-picker');
    if (colorPicker) {
        colorPicker.querySelectorAll('.color-option').forEach(opt => {
            opt.onclick = () => {
                colorPicker.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedNoteColor = opt.dataset.color;
            };
        });
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
                else { 
                    loadTodos(); 
                    loadNotes(); 
                    loadProjects(); 
                    loadBookmarks(); 
                }
            }
        });
    }

    function updateProfileUI(user) {
        if (!user) return;
        const name = user.displayName || user.email.split('@')[0];
        if (getEl('user-name-sidebar')) getEl('user-name-sidebar').textContent = name;
        if (getEl('user-email-sidebar')) getEl('user-email-sidebar').textContent = user.email;
        if (getEl('user-photo')) {
            if (user.photoURL) getEl('user-photo').src = user.photoURL;
            
            // Sync to mobile header avatar if it exists
            const mobileAvatar = getEl('mobile-user-avatar');
            if (mobileAvatar) {
                mobileAvatar.innerHTML = `<img src="${user.photoURL || getEl('user-photo').src}" alt="avatar">`;
            }
        }
        if (getEl('profile-view-name')) getEl('profile-view-name').textContent = name;
        if (getEl('profile-view-email')) getEl('profile-view-email').textContent = user.email;
    }

    // Mobile Navigation Toggle Logic
    function initMobileNav() {
        const menuToggle = getEl('menu-toggle');
        const overlay = getEl('sidebar-overlay');
        const fabTrigger = getEl('fab-trigger');
        const fabContainer = getEl('mobile-nav-container');
        

        if (fabTrigger && fabContainer) {
            fabTrigger.onclick = (e) => {
                e.stopPropagation();
                fabContainer.classList.toggle('active');
            };

            // Close FAB on click outside
            document.addEventListener('click', (e) => {
                if (!fabContainer.contains(e.target)) {
                    fabContainer.classList.remove('active');
                }
            });
        }
        const railIcons = document.querySelectorAll('.rail-icon');

        const toggleNav = () => {
            document.body.classList.toggle('nav-open');
        };

        if (railIcons.length > 0) {
            // First rail icon (Top) toggles on Tablet
            railIcons[0].addEventListener('click', (e) => {
                if (window.innerWidth >= 768 && window.innerWidth <= 1024) {
                    e.stopPropagation();
                    toggleNav();
                }
            });
        }

        if (menuToggle) {
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleNav();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                document.body.classList.remove('nav-open');
            });
        }

        // Close sidebar on navigation (Mobile & Tablet)
        const navLinks = document.querySelectorAll('.nav-link, .rail-icon:not(:first-of-type)');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    document.body.classList.remove('nav-open');
                }
            });
        });
    }
    initMobileNav();

    // SPA Router
    function switchPage(targetId) {
        // 1. Switch Page Content
        document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
        const targetPage = getEl(targetId);
        if (targetPage) targetPage.classList.add('active');

        // 2. Sync Navigation Active States (Rail & Sidebar)
        // First, clear ALL active classes from any navigation elements
        document.querySelectorAll('[data-target]').forEach(el => el.classList.remove('active'));
        
        // Then, add active only to the elements that match the current view EXACTLY
        document.querySelectorAll('[data-target]').forEach(el => {
            const elTarget = el.getAttribute('data-target');
            const elFilter = el.getAttribute('data-filter');

            if (elTarget === targetId) {
                if (targetId === 'page-tasks') {
                    // Only activate task links that match OR have NO filter (like the rail icon)
                    if (!elFilter || elFilter === currentFilter) {
                        el.classList.add('active');
                    }
                } else {
                    // For other pages, just match the targetId
                    el.classList.add('active');
                }
            }
        });

        // 3. Update Sidebar Header (Icon + Text)
        updateSidebarHeader(targetId);

        // 4. Auto-close mobile nav & FAB if open
        document.body.classList.remove('nav-open');
        const fabContainer = getEl('mobile-nav-container');
        if (fabContainer) fabContainer.classList.remove('active');

        if (targetId === 'page-tasks') applyFilters();
        if (targetId === 'page-archive') renderArchive();
    }

    function updateSidebarHeader(pageId) {
        const iconBox = getEl('sidebar-header-icon');
        const titleEl = getEl('sidebar-header-title');
        const subtitleEl = getEl('sidebar-header-subtitle');
        if (!iconBox || !titleEl) return;

        const mapper = {
            'page-home': {
                title: 'Overview',
                subtitle: 'Dashboard Summary',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
            },
            'page-tasks': {
                title: 'My Tasks',
                subtitle: 'Todo Manager ↗',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
            },
            'page-projects': {
                title: 'Project Groups',
                subtitle: 'Category Manager',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
            },
            'page-notes': {
                title: 'Sticky Board',
                subtitle: 'Idea Notes',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
            },
            'page-bookmarks': {
                title: 'Web Saved',
                subtitle: 'Reference Links',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
            },
            'page-archive': {
                title: 'Vault',
                subtitle: 'Historical Records',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`
            },
            'page-profile': {
                title: 'Profile Settings',
                subtitle: 'User Account',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
            },
            'page-wiki': {
                title: 'Wiki & Docs',
                subtitle: 'Knowledge Base',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`
            }
        };

        const config = mapper[pageId] || mapper['page-tasks'];
        iconBox.innerHTML = config.icon;
        titleEl.textContent = config.title;
        subtitleEl.textContent = config.subtitle;
    }

    document.querySelectorAll('[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            if (targetId === 'page-tasks' && link.hasAttribute('data-filter')) {
                currentFilter = link.getAttribute('data-filter');
                currentProjectId = null;
                filterChips.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
            }

            window.location.hash = targetId;
        });
    });

    // Hash-based Router
    function handleHash() {
        const hash = window.location.hash || '#page-home';
        let pageId = hash.replace('#', '');
        
        // Wiki sub-routing support
        if (pageId.startsWith('wiki/')) {
            pageId = 'page-wiki';
        }

        if (getEl(pageId)) {
            switchPage(pageId);
        }
    }

    window.addEventListener('hashchange', handleHash);
    handleHash(); // Initial route check

    // CRUD - Todos
    function loadTodos() {
        if (!currentUser || !db) return;
        db.collection('todos').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allTodos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            applyFilters();
            updateDashboardUI();
        });
    }

    function applyFilters() {
        const term = searchInput ? searchInput.value.toLowerCase() : "";
        let filtered = allTodos.filter(t => (t.text && t.text.toLowerCase().includes(term)) || (t.memo && t.memo.toLowerCase().includes(term)));
        
        if (currentProjectId) {
            filtered = filtered.filter(t => t.projectId === currentProjectId);
        }

        if (currentFilter === 'active') filtered = filtered.filter(t => !t.completed && !t.archived);
        else if (currentFilter === 'completed') filtered = filtered.filter(t => t.completed && !t.archived);
        else if (currentFilter === 'important') filtered = filtered.filter(t => t.priority === 'high' && !t.archived);
        else if (currentFilter === 'archive') filtered = filtered.filter(t => t.archived);
        else filtered = filtered.filter(t => !t.archived);
        
        // Client-side sort by custom orderIndex (Ascending)
        filtered.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        renderTodos(filtered);
    }

    let draggedItem = null;
    
    // Helper function for determining drag insertion point
    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    function renderTodos(todos) {
        if (!todoList) return;
        todoList.innerHTML = todos.length ? '' : '<div class="empty-state">No tasks found.</div>';
        todos.forEach(todo => {
            const card = document.createElement('div');
            card.className = `task-card${todo.completed ? ' completed' : ''}`;
            
            // D&D Setup
            card.draggable = true;
            card.dataset.id = todo.id;
            
            card.ondragstart = (e) => {
                draggedItem = card;
                card.classList.add('dragging');
                setTimeout(() => card.style.opacity = '0.5', 0);
            };
            card.ondragend = () => {
                card.classList.remove('dragging');
                card.style.opacity = '1';
                draggedItem = null;
            };
            card.ondragover = (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(todoList, e.clientY);
                if (afterElement == null) {
                    todoList.appendChild(draggedItem);
                } else {
                    todoList.insertBefore(draggedItem, afterElement);
                }
            };
            card.ondrop = (e) => {
                e.preventDefault();
                // Update new order sequentially based on current DOM position
                const cards = [...todoList.querySelectorAll('.task-card')];
                cards.forEach((c, index) => {
                    const tId = c.dataset.id;
                    const existingTodo = allTodos.find(x => x.id === tId);
                    if (existingTodo && existingTodo.orderIndex !== index) {
                        db.collection('todos').doc(tId).update({ orderIndex: index });
                    }
                });
            };

            const p = todo.priority || 'medium';
            const project = allProjects.find(px => px.id === todo.projectId);
            const projectTag = project ? `<span class="project-tag" style="background:${project.color}33; color:${project.color}; border: 1px solid ${project.color}66;">${project.name}</span>` : '';
            const taskImg = todo.imageUrl ? `<img src="${todo.imageUrl}" class="tc-img" alt="task image" onclick="window.open('${todo.imageUrl}', '_blank')">` : '';

            card.innerHTML = `
                <button class="tc-delete" data-id="${todo.id}">×</button>
                <div class="tc-top">
                    <h3 class="tc-title">${todo.text}</h3>
                    <span class="tc-status ${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}"></span>
                </div>
                <div class="tc-subtitle">${p.toUpperCase()} PRIORITY ${todo.dueDate ? '• 📅 ' + todo.dueDate : ''}</div>
                ${taskImg}
                <p class="tc-desc">${todo.memo || 'No notes.'}</p>
                <div style="margin-top: 8px;">${projectTag}</div>
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
    }

    // --- Task Image Logic (Local Server Integration) ---
    const uploadTaskImage = async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const response = await fetch('http://117.17.198.45:3000/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            return data.url;
        } catch (err) {
            console.error("Local server upload error:", err);
            return null;
        }
    };

    const taskImgBtn = getEl('task-img-upload-btn');
    const taskImgInput = getEl('task-img-input');
    const taskImgPreviewContainer = getEl('task-img-preview-container');
    const taskImgPreview = getEl('task-img-preview');
    const removeTaskImgBtn = getEl('remove-task-img');
    let selectedTaskFile = null;

    if (taskImgBtn && taskImgInput) {
        taskImgBtn.onclick = () => taskImgInput.click();
        taskImgInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedTaskFile = file;
                const reader = new FileReader();
                reader.onload = (re) => {
                    if (taskImgPreview) taskImgPreview.src = re.target.result;
                    if (taskImgPreviewContainer) taskImgPreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (removeTaskImgBtn) {
        removeTaskImgBtn.onclick = () => {
            selectedTaskFile = null;
            if (taskImgInput) taskImgInput.value = '';
            if (taskImgPreviewContainer) taskImgPreviewContainer.style.display = 'none';
        };
    }


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

            const saveTodo = (imageUrl = null) => {
                db.collection('todos').add({
                    uid: currentUser.uid,
                    text: text,
                    memo: getEl('memo-input') ? getEl('memo-input').value.trim() : "",
                    dueDate: getEl('due-date') ? getEl('due-date').value : "",
                    priority: getEl('priority-select') ? getEl('priority-select').value : "medium",
                    projectId: getEl('todo-project-select') ? getEl('todo-project-select').value : "",
                    imageUrl: imageUrl,
                    completed: false,
                    archived: false,
                    orderIndex: Date.now(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    if (inputEl) inputEl.value = '';
                    if (getEl('memo-input')) getEl('memo-input').value = '';
                    if (getEl('todo-project-select')) getEl('todo-project-select').value = '';
                    
                    // Reset Image Selection
                    selectedTaskFile = null;
                    if (taskImgInput) taskImgInput.value = '';
                    if (taskImgPreviewContainer) taskImgPreviewContainer.style.display = 'none';
                    
                    showToast("Task added!", "success");
                }).catch(err => {
                    console.error("Add error:", err);
                    showToast("추가 실패: " + err.message, "error");
                });
            };

            if (selectedTaskFile) {
                showToast("Uploading image...", "info");
                uploadTaskImage(selectedTaskFile).then(url => {
                    if (url) saveTodo(url);
                    else {
                        if (confirm("Image upload failed. Save without image?")) saveTodo();
                    }
                });
            } else {
                saveTodo();
            }
        };

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.activeElement && (document.activeElement.id === 'todo-input' || document.activeElement.id === 'memo-input')) {
                addBtn.click();
            }
        });
    }

    // CRUD - Projects
    const loadProjects = () => {
        if (!currentUser || !db) return;
        db.collection('projects').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProjects(allProjects);
        });
    };

    const renderProjects = (projects) => {
        const list = getEl('projects-list');
        const select = getEl('todo-project-select');
        
        if (list) {
            list.innerHTML = projects.length ? '' : '<div class="empty-state">No projects yet. Create one!</div>';
            projects.forEach(project => {
                const count = allTodos.filter(t => t.projectId === project.id && !t.archived).length;
                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <button class="delete-project" data-id="${project.id}">×</button>
                    <div class="project-badge" style="background:${project.color || 'var(--blue)'}"></div>
                    <h3>${project.name}</h3>
                    <span class="task-count">${count} tasks</span>
                `;
                card.onclick = (e) => {
                    if (e.target.classList.contains('delete-project')) return;
                    currentProjectId = project.id;
                    currentFilter = 'all'; // Reset state filter
                    switchPage('page-tasks');
                    applyFilters();
                    showToast(`Viewing project: ${project.name}`);
                };
                list.appendChild(card);
            });

            list.querySelectorAll('.delete-project').forEach(b => b.onclick = (e) => {
                e.stopPropagation();
                if (confirm('Delete project? Tasks will remain but unorganized.')) {
                    db.collection('projects').doc(b.dataset.id).delete();
                }
            });
        }

        // Update Project Select Dropdown in Tasks Page
        if (select) {
            const currentVal = select.value;
            select.innerHTML = '<option value="">No Project</option>';
            projects.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                select.appendChild(opt);
            });
            select.value = currentVal;
        }
    };

    if (getEl('add-project-btn')) {
        const colors = ['#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4'];
        getEl('add-project-btn').onclick = () => {
            const input = getEl('project-input');
            const name = input.value.trim();
            if (!name || !currentUser) return;
            db.collection('projects').add({
                uid: currentUser.uid,
                name: name,
                color: colors[Math.floor(Math.random() * colors.length)],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => input.value = '');
        };
    }

    // CRUD - Bookmarks
    const loadBookmarks = () => {
        if (!currentUser || !db) return;
        db.collection('bookmarks').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allBookmarks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderBookmarks(allBookmarks);
        });
    };

    const renderBookmarks = (bookmarks) => {
        const list = getEl('bookmarks-list');
        if (!list) return;
        list.innerHTML = bookmarks.length ? '' : '<div class="empty-state">No bookmarks saved.</div>';

        bookmarks.forEach(bm => {
            const card = document.createElement('div');
            card.className = 'bookmark-card';
            const domain = bm.url.split('/')[2];
            const tags = bm.tags ? bm.tags.map(t => `<span class="tag-chip">${t.trim()}</span>`).join('') : '';

            card.innerHTML = `
                <div class="bm-header">
                    <img src="https://www.google.com/s2/favicons?sz=64&domain=${domain}" class="bm-favicon" alt="favicon">
                    <div style="flex:1; overflow:hidden;">
                        <div class="bm-title">${bm.title || domain}</div>
                        <span class="bm-url">${bm.url}</span>
                    </div>
                </div>
                <div class="bm-tags">${tags}</div>
                <div class="bm-actions">
                    <a href="${bm.url}" target="_blank" class="bm-link">Open Link ↗</a>
                    <button class="bm-delete" data-id="${bm.id}">Delete</button>
                </div>
            `;
            list.appendChild(card);
        });

        list.querySelectorAll('.bm-delete').forEach(b => b.onclick = () => confirm('Delete bookmark?') && db.collection('bookmarks').doc(b.dataset.id).delete());
    };

    if (getEl('add-bm-btn')) {
        getEl('add-bm-btn').onclick = () => {
            const urlInput = getEl('bm-url-input');
            const titleInput = getEl('bm-title-input');
            const tagsInput = getEl('bm-tags-input');
            
            let url = urlInput.value.trim();
            if (!url || !currentUser) return;
            if (!url.startsWith('http')) url = 'https://' + url;

            const tags = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t !== "") : [];

            db.collection('bookmarks').add({
                uid: currentUser.uid,
                url: url,
                title: titleInput.value.trim(),
                tags: tags,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                urlInput.value = '';
                titleInput.value = '';
                tagsInput.value = '';
                showToast("Bookmark saved!");
            });
        };
    }

    // CRUD - Notes
    function loadNotes() {
        if (!currentUser || !db) return;
        db.collection('notes').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNotes(allNotes);
            updateDashboardUI();
        });
    }

    function renderNotes(notes) {
        const list = getEl('notes-list');
        if (!list) return;
        list.innerHTML = notes.length ? '' : '<div class="empty-state">No notes. Click and drag to move them!</div>';
        notes.forEach(note => {
            const card = document.createElement('div');
            const colorClass = `color-${note.color || 'yellow'}`;
            card.className = `note-card ${colorClass}`;
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
    }

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
            const nList = getEl('notes-list');
            db.collection('notes').add({
                uid: currentUser.uid, text, 
                color: selectedNoteColor,
                x: Math.random() * ((nList ? nList.offsetWidth : 500) - 250) + 20, 
                y: Math.random() * 200 + 20,
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

    // === DASHBOARD LOGIC ===
    function updateDashboardUI() {
        if (!getEl('page-home')) return;

        // 1. Stats Calculation
        const total = allTodos.filter(t => !t.archived).length;
        const completed = allTodos.filter(t => t.completed && !t.archived).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (getEl('stat-total-tasks')) getEl('stat-total-tasks').textContent = total;
        if (getEl('stat-completed-tasks')) getEl('stat-completed-tasks').textContent = completed;
        if (getEl('stat-progress-percent')) getEl('stat-progress-percent').textContent = `${percent}%`;
        if (getEl('stat-progress-bar')) getEl('stat-progress-bar').style.width = `${percent}%`;

        // 2. Recent Notes (Top 3)
        const recentNotesList = getEl('dash-recent-notes');
        if (recentNotesList) {
            recentNotesList.innerHTML = '';
            const recentNotes = [...allNotes].reverse().slice(0, 3);
            if (recentNotes.length === 0) {
                recentNotesList.innerHTML = '<p style="font-size:0.85rem; color:var(--text-3);">No recent notes.</p>';
            }
            recentNotes.forEach(note => {
                const div = document.createElement('div');
                div.className = `dash-recent-note-card ${note.color || 'yellow'}`;
                div.textContent = note.text.length > 50 ? note.text.substring(0, 50) + '...' : note.text;
                div.onclick = () => switchPage('page-notes');
                recentNotesList.appendChild(div);
            });
        }

        // 3. Urgent Tasks (High Priority or Today)
        const urgentTasksList = getEl('dash-urgent-tasks');
        if (urgentTasksList) {
            urgentTasksList.innerHTML = '';
            const urgent = allTodos.filter(t => !t.completed && !t.archived && t.priority === 'high').slice(0, 3);
            if (urgent.length === 0) {
                urgentTasksList.innerHTML = '<p style="font-size:0.85rem; color:var(--text-3);">All clear! No urgent tasks.</p>';
            }
            urgent.forEach(task => {
                const item = document.createElement('div');
                item.className = 'dash-item';
                item.innerHTML = `
                    <div class="dash-item-info">
                        <h4>${task.text}</h4>
                        <p>${task.dueDate || 'No due date'}</p>
                    </div>
                    <span class="tc-status red" style="position:static; width:10px; height:10px;"></span>
                `;
                urgentTasksList.appendChild(item);
            });
        }
        
        // Archive Logic
        function renderArchive() {
            const completedCountEl = getEl('archive-total-completed');
            const archivedCountEl = getEl('archive-total-items');
            const archiveListEl = getEl('archive-tasks-list');
            
            if (!completedCountEl || !archivedCountEl || !archiveListEl) return;

            // 1. Update Stats
            const totalCompleted = allTodos.filter(t => t.completed).length;
            const totalArchived = allTodos.filter(t => t.archived).length;
            completedCountEl.textContent = totalCompleted;
            archivedCountEl.textContent = totalArchived;

            // 2. Render Random Inspiration (Note)
            refreshInspiration();

            // 3. Render Archived Tasks List
            const archivedTasks = allTodos.filter(t => t.archived);
            archiveListEl.innerHTML = archivedTasks.length ? '' : '<div class="empty-state">No archived items.</div>';
            
            archivedTasks.forEach(task => {
                const item = document.createElement('div');
                item.className = 'archive-item';
                item.innerHTML = `
                    <div class="archive-item-info">
                        <h4>${task.text}</h4>
                        <p>Archived on: ${task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div class="archive-item-actions">
                        <button class="archive-btn restore-btn" data-id="${task.id}">Restore</button>
                        <button class="archive-btn del-perm-btn" data-id="${task.id}">Delete</button>
                    </div>
                `;
                archiveListEl.appendChild(item);
            });

            archiveListEl.querySelectorAll('.restore-btn').forEach(b => b.onclick = () => {
                db.collection('todos').doc(b.dataset.id).update({ archived: false });
            });
            archiveListEl.querySelectorAll('.del-perm-btn').forEach(b => b.onclick = () => {
                if (confirm('Permanently delete this item?')) {
                    db.collection('todos').doc(b.dataset.id).delete();
                }
            });
        }

        window.refreshInspiration = () => {
            const textEl = getEl('inspiration-text');
            const dateEl = getEl('inspiration-date');
            
            // Get archived notes or just any notes if no archived ones
            let source = allNotes.filter(n => n.archived);
            if (source.length === 0) source = allNotes;
            if (source.length === 0) source = allTodos.filter(t => t.memo);

            if (source.length > 0) {
                const random = source[Math.floor(Math.random() * source.length)];
                textEl.textContent = `"${random.text || random.memo}"`;
                dateEl.textContent = random.createdAt ? new Date(random.createdAt).toLocaleDateString() : 'Unknown date';
            } else {
                textEl.textContent = '"기록은 기억을 지배합니다."';
                dateEl.textContent = 'Stay inspired.';
            }
        };

        const emptyArchiveBtn = getEl('empty-archive-btn');
        if (emptyArchiveBtn) {
            emptyArchiveBtn.onclick = () => {
                const archived = allTodos.filter(t => t.archived);
                if (archived.length === 0) return;
                if (confirm(`Permanently delete all ${archived.length} items in archive?`)) {
                    archived.forEach(t => db.collection('todos').doc(t.id).delete());
                }
            };
        }

        // 4. Check for Notifications
        checkDueNotifications();
    }
    
    // Notification Logic (Phase 3)
    const checkDueNotifications = () => {
        if (!('Notification' in window)) return;
        
        const todayStr = new Date().toISOString().split('T')[0];
        const dueToday = allTodos.filter(t => !t.completed && !t.archived && t.dueDate === todayStr);

        if (dueToday.length > 0) {
            const lastNotified = localStorage.getItem('last-notified-date');
            if (lastNotified !== todayStr) {
                if (Notification.permission === 'granted') {
                    showDueNotification(dueToday.length);
                } else if (Notification.permission !== 'denied') {
                    Notification.requestPermission().then(perm => {
                        if (perm === 'granted') showDueNotification(dueToday.length);
                    });
                }
            }
        }
    };

    const showDueNotification = (count) => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            // Use SW if active to show native PWA notification
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification("Todo Planner", {
                    body: `You have ${count} task(s) due today! Stay productive.`,
                    icon: '/icon.svg',
                    vibrate: [200, 100, 200]
                });
            });
        } else {
             new Notification("Todo Planner", {
                body: `You have ${count} task(s) due today! Stay productive.`,
                icon: '/icon.svg'
            });
        }
        localStorage.setItem('last-notified-date', todayStr);
    };
});

window.showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container') || document.body.appendChild(Object.assign(document.createElement('div'), {id: 'toast-container'}));
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
};
