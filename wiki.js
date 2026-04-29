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
            this.input.style.border = 'none';
            this.input.style.fontFamily = 'monospace';
            this.input.style.minHeight = '60px';
            this.input.style.background = 'transparent';
            this.input.placeholder = 'Enter KaTeX formula here (e.g. E = mc^2)...';
            this.input.value = this.data.text || '';
            
            this.output = document.createElement('div');
            this.output.style.textAlign = 'center';
            this.output.style.marginTop = '10px';
            this.output.style.fontSize = '1.2em';
            
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
        
        if (typeof Header !== 'undefined') tools.header = Header;
        if (typeof List !== 'undefined') tools.list = List;
        if (typeof InlineCode !== 'undefined') tools.inlineCode = InlineCode;
        if (typeof CodeTool !== 'undefined') tools.code = CodeTool;
        tools.math = MathBlock;

        if (typeof ImageTool !== 'undefined') {
            tools.image = {
                class: ImageTool,
                config: {
                    uploader: {
                        uploadByFile(file) {
                            if (!storage || !currentUser) {
                                return Promise.reject("Storage or Auth not initialized");
                            }
                            return new Promise((resolve, reject) => {
                                const ref = storage.ref(`wiki_images/${currentUser.uid}/${Date.now()}_${file.name}`);
                                ref.put(file).then(snapshot => {
                                    return snapshot.ref.getDownloadURL();
                                }).then(url => {
                                    resolve({ success: 1, file: { url } });
                                }).catch(err => {
                                    reject(err);
                                });
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
            tools: tools
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
          }, error => {
             // Fallback to client sorting if index is missing
             console.log("Index issue, falling back to client sort", error);
             db.collection('wiki_pages').where('uid', '==', currentUser.uid)
               .onSnapshot(snap => {
                   allPages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                   allPages.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
                   renderPageList();
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
            el.textContent = page.title || 'Untitled Document';
            el.onclick = () => openPage(page);
            wikiPageList.appendChild(el);
        });
    };

    if (searchInput) {
        searchInput.oninput = () => renderPageList();
    }

    const openPage = (page) => {
        currentPageId = page.id;
        wikiEmptyView.style.display = 'none';
        wikiEditorView.style.display = 'flex';
        wikiTitleInput.value = page.title || '';
        
        // Disable save button temporarily to prevent accidental save of old data
        if(saveWikiBtn) saveWikiBtn.disabled = true;
        
        initEditor(page.content);
        
        // Re-enable save button after a slight delay
        setTimeout(() => { if(saveWikiBtn) saveWikiBtn.disabled = false; }, 500);
        renderPageList(); // update active class
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
                const createdDoc = { id: docRef.id, ...newDoc };
                openPage(createdDoc);
            });
        };
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
                currentPageId = null;
                wikiEditorView.style.display = 'none';
                wikiEmptyView.style.display = 'flex';
                window.showToast("Page deleted");
            });
        };
    }
});
