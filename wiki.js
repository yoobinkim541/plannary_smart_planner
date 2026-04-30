document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let editor = null;
    let allPages = [];
    let currentPageId = null;

    const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
    const storage = typeof firebase !== 'undefined' ? firebase.storage() : null;

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
            
            if(this.data.text) this._renderMath();
            return this.container;
        }
        _renderMath() {
            try {
                if (typeof katex !== 'undefined') {
                    katex.render(this.input.value, this.output, { throwOnError: false, displayMode: true });
                } else {
                    this.output.innerText = "KaTeX not loaded.";
                }
            } catch(e) {
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
                    levels: [1, 2, 3, 4],
                    defaultLevel: 2
                }
            };
        }
        if (typeof List !== 'undefined') tools.list = List;
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

        if (typeof ImageTool !== 'undefined') {
            tools.image = {
                class: ImageTool,
                config: {
                    uploader: {
                        uploadByFile(file) {
                            if (!currentUser) {
                                return Promise.reject("Please login first");
                            }
                            const progressContainer = document.getElementById('wiki-upload-progress');
                            const progressBar = document.getElementById('wiki-upload-bar');
                            const progressText = document.getElementById('wiki-upload-text');

                            if (progressContainer) progressContainer.style.display = 'flex';

                            return new Promise((resolve, reject) => {
                                const xhr = new XMLHttpRequest();
                                const formData = new FormData();
                                formData.append('image', file);

                                // Progress tracking
                                xhr.upload.onprogress = (e) => {
                                    if (e.lengthComputable) {
                                        const progress = (e.loaded / e.total) * 100;
                                        if (progressBar) progressBar.style.width = progress + '%';
                                        if (progressText) progressText.innerText = `Local Uploading... ${Math.round(progress)}%`;
                                    }
                                };

                                xhr.onload = () => {
                                    if (xhr.status >= 200 && xhr.status < 300) {
                                        try {
                                            const response = JSON.parse(xhr.responseText);
                                            if (progressBar) progressBar.style.width = '100%';
                                            if (progressText) progressText.innerText = `Upload Complete!`;
                                            
                                            setTimeout(() => {
                                                if (progressContainer) progressContainer.style.display = 'none';
                                                if (progressBar) progressBar.style.width = '0%';
                                            }, 1000);

                                            resolve({ success: 1, file: { url: response.url } });
                                        } catch (e) {
                                            reject(new Error("Invalid server response"));
                                        }
                                    } else {
                                        if (progressContainer) progressContainer.style.display = 'none';
                                        reject(new Error('Upload failed with status ' + xhr.status));
                                    }
                                };

                                xhr.onerror = () => {
                                    if (progressContainer) progressContainer.style.display = 'none';
                                    const errorMsg = "Upload failed. If you are on HTTPS (Firebase), browsers block HTTP (Local Server) uploads. Check console for 'Mixed Content'.";
                                    window.showToast(errorMsg, "error");
                                    console.error("XHR Error:", errorMsg);
                                    reject(new Error('Network error'));
                                };

                                xhr.open('POST', 'http://117.17.198.45:3000/upload');
                                xhr.send(formData);
                            });
                        }
                    }
                }
            };
        }

        editor = new EditorJS({
            holder: 'editorjs',
            data: data || {},
            placeholder: 'Type "/" for commands...',
            tools: tools,
            inlineToolbar: true
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
                   allPages.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
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
        
        if(saveWikiBtn) saveWikiBtn.disabled = true;
        initEditor(page.content);
        setTimeout(() => { if(saveWikiBtn) saveWikiBtn.disabled = false; }, 500);
        
        renderPageList(); 
    };

    const closeEditor = () => {
        currentPageId = null;
        pageWiki.classList.remove('editor-active');
        wikiEditorView.style.display = 'none';
        wikiEmptyView.style.display = 'flex';
        renderPageList();
    };

    if (newWikiBtn) {
        newWikiBtn.onclick = () => {
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
    }

    if (backBtn) {
        backBtn.onclick = goBackToList;
    }

    if (saveWikiBtn) {
        saveWikiBtn.onclick = async () => {
            if (!editor || !currentPageId) return;
            const title = wikiTitleInput.value.trim() || 'Untitled Document';
            
            saveWikiBtn.textContent = 'Saving...';
            saveWikiBtn.disabled = true;
            
            try {
                const contentData = await editor.save();
                await db.collection('wiki_pages').doc(currentPageId).update({
                    title: title,
                    content: contentData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                window.showToast("Page saved!", "success");
            } catch (err) {
                console.error("Save error: ", err);
                window.showToast("Failed to save", "error");
            } finally {
                saveWikiBtn.textContent = 'Save Changes';
                saveWikiBtn.disabled = false;
            }
        };
    }

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
