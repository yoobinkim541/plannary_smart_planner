document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let editor = null;
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

    // --- EDITOR INITIALIZATION ---
    const initEditor = (data) => {
        if (editor) {
            editor.destroy();
        }

        const tools = {};

        if (typeof Header !== 'undefined') {
            tools.header = {
                class: Header,
                config: {
                    placeholder: 'Enter a heading',
                    levels: [1, 2, 3, 4, 5, 6],
                    defaultLevel: 2
                }
            };
        }
        if (typeof List !== 'undefined') tools.list = List;
        
        // Add Markdown Shortcuts Support
        if (typeof MarkdownShortcuts !== 'undefined') {
            tools.markdownShortcuts = MarkdownShortcuts;
        }

        if (typeof InlineCode !== 'undefined') tools.inlineCode = InlineCode;
        if (typeof CodeWithLanguageList !== 'undefined') {
            tools.code = {
                class: CodeWithLanguageList,
                config: {
                    preserveBlank: true
                }
            };
        } else if (typeof CodeTool !== 'undefined') {
            tools.code = CodeTool;
        }
        if (typeof Table !== 'undefined') tools.table = Table;
        if (typeof Checklist !== 'undefined') tools.checklist = { class: Checklist, inlineToolbar: true };
        if (typeof Underline !== 'undefined') tools.underline = Underline;
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
        tools.math = MathBlock;

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
            data: data || {},
            placeholder: 'Type "/" for commands...',
            tools: tools,
            inlineToolbar: true,
            onChange: () => {
                // Proactively enable save button if disabled
                if (saveWikiBtn) saveWikiBtn.disabled = false;
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

        filteredPages.forEach(page => {
            const el = document.createElement('div');
            el.className = `wiki-page-item ${currentPageId === page.id ? 'active' : ''}`;
            el.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px; opacity:0.6;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span>${page.title || 'Untitled Document'}</span>
            `;
            el.onclick = () => navigateToPage(page.id);
            wikiPageList.appendChild(el);
        });
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

    const createNewPage = () => {
        if (!currentUser) return window.showToast('Please login first', 'error');

        const newDoc = {
            uid: currentUser.uid,
            title: 'Untitled Document',
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

    if (newWikiBtn) {
        newWikiBtn.onclick = createNewPage;
    }

    const emptyCreateBtn = document.getElementById('wiki-empty-create-btn');
    if (emptyCreateBtn) {
        emptyCreateBtn.onclick = createNewPage;
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
    });

    if (deleteWikiBtn) {
        deleteWikiBtn.onclick = () => {
            if (!currentPageId || !confirm("Delete this page?")) return;
            db.collection('wiki_pages').doc(currentPageId).delete().then(() => {
                goBackToList();
                window.showToast("Page deleted");
            });
        };
    }
});
