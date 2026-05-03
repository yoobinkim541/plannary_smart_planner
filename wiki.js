document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let editor = null;
    let headingShortcutHandler = null;
    let undoStack = [];
    let undoCaptureTimer = null;
    let isRestoringUndo = false;
    let lastUndoSnapshot = '';
    let allPages = [];
    let currentPageId = null;

    const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
    const storage = typeof firebase !== 'undefined' ? firebase.storage() : null;

    // --- STORAGE CONFIGURATION ---
    // Using Firebase Storage to avoid Mixed Content (HTTPS -> HTTP) issues.

    const pageWiki = document.getElementById('page-wiki');
    const wikiPageList = document.getElementById('wiki-page-list');
    const wikiTitleInput = document.getElementById('wiki-title-input');
    const wikiEditorView = document.getElementById('wiki-editor-view');
    const wikiEmptyView = document.getElementById('wiki-empty-view');
    const newWikiBtn = document.getElementById('new-wiki-btn');
    const saveWikiBtn = document.getElementById('wiki-save-btn');
    const deleteWikiBtn = document.getElementById('wiki-delete-btn');
    const searchInput = document.getElementById('wiki-search-input');
    const backBtn = document.getElementById('wiki-back-btn');

    if (!pageWiki) return;

    // --- CUSTOM MATH BLOCK TOOL FOR EDITOR.JS ---
    class MathBlock {
        static get toolbox() {
            return {
                title: 'Math',
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M4 14l6-8 4 10 4-4"/></svg>'
            };
        }
        constructor({ data }) {
            this.data = data || { text: '' };
        }
        render() {
            this.container = document.createElement('div');
            this.container.className = 'math-block-wrapper';
            this.container.style.padding = '10px';
            this.container.style.border = '1px dashed var(--border)';
            this.container.style.borderRadius = 'var(--radius-sm)';
            this.container.style.margin = '10px 0';

            this.input = document.createElement('textarea');
            this.input.className = 'cdx-input';
            this.input.style.width = '100%';
            this.input.style.border = '1px solid var(--border)';
            this.input.style.borderRadius = '8px';
            this.input.style.padding = '12px';
            this.input.style.fontFamily = 'monospace';
            this.input.style.minHeight = '80px';
            this.input.style.background = 'var(--bg)';
            this.input.style.color = 'var(--text-1)';
            this.input.placeholder = 'Enter KaTeX formula (e.g. \\sum_{i=1}^n i = \\frac{n(n+1)}{2})';
            this.input.value = this.data.text || '';

            this.output = document.createElement('div');
            this.output.className = 'math-output';
            this.output.style.textAlign = 'center';
            this.output.style.marginTop = '15px';
            this.output.style.padding = '15px';
            this.output.style.fontSize = '1.4em';
            this.output.style.color = 'var(--text-1)';

            this.input.addEventListener('input', () => this._renderMath());

            this.container.appendChild(this.input);
            this.container.appendChild(this.output);

            if (this.data.text) this._renderMath();
            return this.container;
        }
        _renderMath() {
            try {
                if (typeof katex !== 'undefined') {
                    katex.render(this.input.value, this.output, { throwOnError: false, displayMode: true });
                } else {
                    this.output.innerText = "KaTeX not loaded.";
                }
            } catch (e) {
                this.output.innerText = "Syntax Error";
            }
        }
        save(blockContent) {
            return { text: this.input.value };
        }
    }

    class SubpageTool {
        static get toolbox() {
            return {
                title: 'Subpage',
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 5v14M5 12h14"/><path d="M4 4h6v6H4z" opacity="0.45"/></svg>'
            };
        }
        render() {
            const container = document.createElement('div');
            container.style.display = 'none';
            setTimeout(() => {
                if (!currentPageId) {
                    window.showToast('Open a page first', 'error');
                    return;
                }
                createNewPage(currentPageId);
            }, 0);
            return container;
        }
        save() {
            return {};
        }
    }

    const removeHeadingShortcutHandler = () => {
        const holder = document.getElementById('editorjs');
        if (holder && headingShortcutHandler) {
            holder.removeEventListener('keydown', headingShortcutHandler);
        }
        headingShortcutHandler = null;
    };

    const getHeadingLevelFromSelection = (event) => {
        const editable = event.target.closest ? event.target.closest('[contenteditable="true"]') : null;
        if (!editable || !editable.closest('.ce-block')) return null;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        if (!range.collapsed || !editable.contains(range.startContainer)) return null;

        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editable);
        preCaretRange.setEnd(range.startContainer, range.startOffset);

        const textBeforeCaret = preCaretRange.toString().replace(/\uFEFF/g, '');
        const match = textBeforeCaret.match(/^(#{1,6})$/);
        return match ? match[1].length : null;
    };

    const createHeadingShortcutHandler = () => {
        return (event) => {
            if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
            if (!editor || typeof Header === 'undefined') return;

            const level = getHeadingLevelFromSelection(event);
            if (!level) return;

            const currentIndex = editor.blocks.getCurrentBlockIndex();
            const currentBlock = editor.blocks.getBlockByIndex(currentIndex);
            if (currentBlock && currentBlock.name && currentBlock.name !== 'paragraph') return;

            event.preventDefault();

            try {
                editor.blocks.delete(currentIndex);
                editor.blocks.insert('header', { text: '', level }, {}, currentIndex, true);
                if (saveWikiBtn) saveWikiBtn.disabled = false;
            } catch (error) {
                console.error('[Wiki] Heading shortcut failed:', error);
                window.showToast('Heading shortcut failed: ' + (error.message || error), 'error');
            }
        };
    };

    const normalizeEditorData = (data) => {
        if (!data || !Array.isArray(data.blocks)) return { blocks: [] };
        return JSON.parse(JSON.stringify(data));
    };

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const serializeEditorData = (data) => JSON.stringify(normalizeEditorData(data));

    const resetUndoHistory = (data) => {
        const normalized = normalizeEditorData(data);
        lastUndoSnapshot = serializeEditorData(normalized);
        undoStack = [normalized];
    };

    const captureUndoSnapshot = async () => {
        if (!editor || isRestoringUndo) return;
        try {
            const data = normalizeEditorData(await editor.save());
            const serialized = serializeEditorData(data);
            if (serialized === lastUndoSnapshot) return;

            undoStack.push(data);
            if (undoStack.length > 60) undoStack.shift();
            lastUndoSnapshot = serialized;
        } catch (error) {
            console.warn('[Wiki] Undo snapshot skipped:', error);
        }
    };

    const scheduleUndoSnapshot = () => {
        if (isRestoringUndo) return;
        clearTimeout(undoCaptureTimer);
        undoCaptureTimer = setTimeout(captureUndoSnapshot, 250);
    };

    const undoEditorChange = async () => {
        clearTimeout(undoCaptureTimer);
        await captureUndoSnapshot();
        if (!editor || undoStack.length < 2) return;

        undoStack.pop();
        const previous = normalizeEditorData(undoStack[undoStack.length - 1]);
        isRestoringUndo = true;

        try {
            await editor.render(previous);
            lastUndoSnapshot = serializeEditorData(previous);
            if (saveWikiBtn) saveWikiBtn.disabled = false;
        } catch (error) {
            console.error('[Wiki] Undo failed:', error);
            window.showToast('Undo failed: ' + (error.message || error), 'error');
        } finally {
            setTimeout(() => { isRestoringUndo = false; }, 0);
        }
    };

    // --- EDITOR INITIALIZATION ---
    const initEditor = (data) => {
        if (editor) {
            removeHeadingShortcutHandler();
            editor.destroy();
        }

        clearTimeout(undoCaptureTimer);
        resetUndoHistory(data);

        const tools = {};

        // Debug: Log available plugin variables
        const isHeaderFound = typeof Header !== 'undefined';
        const EditorListClass = typeof EditorjsList !== 'undefined' ? EditorjsList : (typeof List !== 'undefined' ? List : null);
        const markdownClassName = (typeof MarkdownShortcuts !== 'undefined') ? 'MarkdownShortcuts' : 
                                   (typeof MarkdownShortcut !== 'undefined' ? 'MarkdownShortcut' : null);

        if (isHeaderFound) {
            tools.header = {
                class: Header,
                config: {
                    placeholder: 'Enter a heading',
                    levels: [1, 2, 3, 4, 5, 6],
                    defaultLevel: 2
                }
            };
        }
        if (EditorListClass) {
            tools.list = {
                class: EditorListClass,
                inlineToolbar: true,
                config: {
                    defaultStyle: 'unordered'
                }
            };
        }
        
        // Register Markdown Shortcuts
        if (markdownClassName) {
            const MarkdownClass = (markdownClassName === 'MarkdownShortcuts') ? MarkdownShortcuts : MarkdownShortcut;
            tools.markdownShortcut = {
                class: MarkdownClass
            };
        }

        if (typeof InlineCode !== 'undefined') tools.inlineCode = { class: InlineCode };
        if (typeof CodeWithLanguageList !== 'undefined') {
            tools.code = {
                class: CodeWithLanguageList,
                config: {
                    preserveBlank: true
                }
            };
        } else if (typeof CodeTool !== 'undefined') {
            tools.code = { class: CodeTool };
        }
        
        if (typeof Table !== 'undefined') tools.table = { class: Table };
        if (typeof Checklist !== 'undefined') tools.checklist = { class: Checklist, inlineToolbar: true };
        if (typeof Underline !== 'undefined') tools.underline = { class: Underline };
        if (typeof ToggleBlock !== 'undefined') tools.toggle = { class: ToggleBlock, inlineToolbar: true };
        
        if (typeof ColorPlugin !== 'undefined') {
            tools.Color = {
                class: ColorPlugin,
                config: {
                    colorCollections: ['#FF1300', '#EC7800', '#40A615', '#0663C7', '#297312', '#722ED1', '#2F54EB'],
                    defaultColor: '#FF1300',
                    type: 'text',
                    customPicker: true
                }
            };
            tools.Marker = {
                class: ColorPlugin,
                config: {
                    defaultColor: '#FFBF00',
                    type: 'background',
                    customPicker: true
                }
            };
        }
        tools.math = { class: MathBlock };
        tools.subpage = { class: SubpageTool };

        const createUploader = (label = "File") => {
            return {
                uploadByFile(file) {
                    if (!currentUser || !storage) return Promise.reject("Please login first or Firebase not initialized");
                    
                    const progressContainer = document.getElementById('wiki-upload-progress');
                    const progressBar = document.getElementById('wiki-upload-bar');
                    const progressText = document.getElementById('wiki-upload-text');

                    if (progressContainer) progressContainer.style.display = 'flex';
                    if (progressText) progressText.innerText = `${label} Uploading... 0%`;

                    return new Promise((resolve, reject) => {
                        // Path: /wiki/{userId}/{timestamp}_{fileName}
                        const filePath = `wiki/${currentUser.uid}/${Date.now()}_${file.name}`;
                        const storageRef = storage.ref().child(filePath);
                        const uploadTask = storageRef.put(file);

                        uploadTask.on('state_changed', 
                            (snapshot) => {
                                const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                                if (progressBar) progressBar.style.width = percent + '%';
                                if (progressText) progressText.innerText = `${label} Uploading... ${percent}%`;
                            }, 
                            (error) => {
                                console.error("Upload error:", error);
                                if (progressContainer) progressContainer.style.display = 'none';
                                window.showToast("Upload failed: " + error.message, "error");
                                reject(error);
                            }, 
                            () => {
                                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                                    if (progressBar) progressBar.style.width = '100%';
                                    if (progressText) progressText.innerText = `${label} Upload Complete!`;

                                    setTimeout(() => {
                                        if (progressContainer) progressContainer.style.display = 'none';
                                        if (progressBar) progressBar.style.width = '0%';
                                    }, 1000);

                                    // EditorJS Image Tool expects a specific response structure
                                    resolve({
                                        success: 1,
                                        file: {
                                            url: downloadURL
                                        }
                                    });
                                });
                            }
                        );
                    });
                }
            };
        };

        if (typeof ImageTool !== 'undefined') {
            tools.image = {
                class: ImageTool,
                config: {
                    uploader: createUploader("Image")
                }
            };
        }

        if (typeof AttachesTool !== 'undefined') {
            tools.attaches = {
                class: AttachesTool,
                config: {
                    uploader: createUploader("Attachment")
                }
            };
        }

        editor = new EditorJS({
            holder: 'editorjs',
            data: normalizeEditorData(data),
            placeholder: 'Type "/" for commands...',
            tools: tools,
            inlineToolbar: true,
            onReady: () => {
                const holder = document.getElementById('editorjs');
                removeHeadingShortcutHandler();
                headingShortcutHandler = createHeadingShortcutHandler();
                if (holder) holder.addEventListener('keydown', headingShortcutHandler);
            },
            onChange: () => {
                // Proactively enable save button if disabled
                if (saveWikiBtn) saveWikiBtn.disabled = false;
                scheduleUndoSnapshot();
            }
        });
    }

    // --- STATE & FIRESTORE BINDINGS ---
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadPages();
        } else {
            currentUser = null;
            allPages = [];
            renderPageList();
        }
    });

    const loadPages = () => {
        if (!db || !currentUser) return;
        db.collection('wiki_pages').where('uid', '==', currentUser.uid)
            .orderBy('updatedAt', 'desc')
            .onSnapshot(snap => {
                allPages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderPageList();
                checkHash(); // Check if we should open a page based on URL
            }, error => {
                console.log("Index issue, falling back to client sort", error);
                db.collection('wiki_pages').where('uid', '==', currentUser.uid)
                    .onSnapshot(snap => {
                        allPages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        allPages.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
                        renderPageList();
                        checkHash();
                    });
            });
    };

    const renderPageList = () => {
        if (!wikiPageList) return;
        let filteredPages = allPages;
        const term = searchInput ? searchInput.value.toLowerCase() : "";

        if (term) {
            filteredPages = allPages.filter(p => (p.title && p.title.toLowerCase().includes(term)));
        }

        wikiPageList.innerHTML = filteredPages.length ? '' : '<div class="empty-state" style="padding:20px;">No pages found</div>';

        const childrenByParent = filteredPages.reduce((groups, page) => {
            const parentId = page.parentId || '';
            if (!groups[parentId]) groups[parentId] = [];
            groups[parentId].push(page);
            return groups;
        }, {});

        const renderedIds = new Set();
        const renderPages = (parentId = '', depth = 0) => {
            (childrenByParent[parentId] || []).forEach(page => {
                if (renderedIds.has(page.id)) return;
                renderedIds.add(page.id);

                const el = document.createElement('div');
                el.className = `wiki-page-item ${currentPageId === page.id ? 'active' : ''}`;
                el.style.setProperty('--wiki-depth', depth);
                el.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px; opacity:0.6;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span>${escapeHtml(page.title || 'Untitled Document')}</span>
                `;
                el.onclick = () => navigateToPage(page.id);
                wikiPageList.appendChild(el);
                renderPages(page.id, depth + 1);
            });
        };

        renderPages('');

        if (term) {
            filteredPages
                .filter(page => !renderedIds.has(page.id))
                .forEach(page => {
                    if (renderedIds.has(page.parentId)) renderPages(page.parentId, 1);
                    else renderPages(page.parentId || '', 0);
                });
        }
    };

    if (searchInput) {
        searchInput.oninput = () => renderPageList();
    }

    const navigateToPage = (pageId) => {
        window.location.hash = `wiki/${pageId}`;
    };

    const goBackToList = () => {
        window.location.hash = `page-wiki`;
    };

    const checkHash = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#wiki/')) {
            const id = hash.split('/')[1];
            const page = allPages.find(p => p.id === id);
            if (page) {
                openPage(page);
            }
        } else if (hash === '#page-wiki' || !hash) {
            closeEditor();
        }
    };

    window.addEventListener('hashchange', checkHash);

    const openPage = (page) => {
        if (currentPageId === page.id) return;
        currentPageId = page.id;

        // Notion-like: Hide list on small screens, show editor as full page
        pageWiki.classList.add('editor-active');

        wikiEmptyView.style.display = 'none';
        wikiEditorView.style.display = 'flex';
        wikiEditorView.classList.add('fade-in');

        wikiTitleInput.value = page.title || '';

        if (saveWikiBtn) saveWikiBtn.disabled = true;
        initEditor(page.content);
        setTimeout(() => { if (saveWikiBtn) saveWikiBtn.disabled = false; }, 500);

        renderPageList();
    };

    const closeEditor = () => {
        currentPageId = null;
        pageWiki.classList.remove('editor-active');
        wikiEditorView.style.display = 'none';
        wikiEmptyView.style.display = 'flex';
        renderPageList();
    };

    const createNewPage = (parentId = null) => {
        if (!currentUser) return window.showToast('Please login first', 'error');

        const newDoc = {
            uid: currentUser.uid,
            title: 'Untitled Document',
            parentId: parentId || null,
            content: {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('wiki_pages').add(newDoc).then(docRef => {
            navigateToPage(docRef.id);
        }).catch(err => {
            console.error("Creation error:", err);
            window.showToast("Failed to create page: " + err.message, "error");
        });
    };

    const getDescendantPageIds = (pageId) => {
        const childIds = allPages
            .filter(page => page.parentId === pageId)
            .map(page => page.id);

        return childIds.reduce((ids, childId) => {
            ids.push(childId, ...getDescendantPageIds(childId));
            return ids;
        }, []);
    };

    if (newWikiBtn) {
        newWikiBtn.onclick = () => createNewPage();
    }

    const emptyCreateBtn = document.getElementById('wiki-empty-create-btn');
    if (emptyCreateBtn) {
        emptyCreateBtn.onclick = () => createNewPage();
    }

    if (backBtn) {
        backBtn.onclick = goBackToList;
    }

    // --- SAVE FUNCTION ---
    const savePage = async () => {
        if (!editor || !currentPageId || !currentUser) {
            console.warn('[Wiki] Save aborted: editor or pageId missing', { editor: !!editor, currentPageId, currentUser: !!currentUser });
            window.showToast('Cannot save: not ready', 'error');
            return;
        }
        const title = wikiTitleInput ? wikiTitleInput.value.trim() || 'Untitled Document' : 'Untitled Document';

        if (saveWikiBtn) { saveWikiBtn.textContent = 'Saving...'; saveWikiBtn.disabled = true; }

        try {
            const contentData = await editor.save();
            console.log('[Wiki] Editor data:', contentData);
            await db.collection('wiki_pages').doc(currentPageId).update({
                title: title,
                content: contentData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            window.showToast('✅ Page saved!', 'success');
        } catch (err) {
            console.error('[Wiki] Save error:', err);
            // Show actual error message for diagnosis
            window.showToast('Save failed: ' + (err.message || err), 'error');
        } finally {
            if (saveWikiBtn) { saveWikiBtn.textContent = 'Save Changes'; saveWikiBtn.disabled = false; }
        }
    };

    if (saveWikiBtn) saveWikiBtn.onclick = savePage;

    // Ctrl+S keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentPageId) savePage();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            const holder = document.getElementById('editorjs');
            if (holder && holder.contains(document.activeElement)) {
                e.preventDefault();
                undoEditorChange();
            }
        }
    });

    if (deleteWikiBtn) {
        deleteWikiBtn.onclick = () => {
            if (!currentPageId) return;
            const descendantIds = getDescendantPageIds(currentPageId);
            const confirmMessage = descendantIds.length
                ? `Delete this page and ${descendantIds.length} subpage(s)?`
                : 'Delete this page?';
            if (!confirm(confirmMessage)) return;

            const batch = db.batch();
            [currentPageId, ...descendantIds].forEach(pageId => {
                batch.delete(db.collection('wiki_pages').doc(pageId));
            });

            batch.commit().then(() => {
                goBackToList();
                window.showToast("Page deleted");
            }).catch(err => {
                console.error("Delete error:", err);
                window.showToast("Failed to delete page: " + err.message, "error");
            });
        };
    }
});
