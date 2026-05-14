document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let editor = null;
    let headingShortcutHandler = null;
    let editorKeydownHandler = null;
    let undoStack = [];
    let undoCaptureTimer = null;
    let markdownMathTimer = null;
    let isRestoringUndo = false;
    let isConvertingMarkdownMath = false;
    let headingShortcutIndex = null;
    let lastUndoSnapshot = '';
    let pageMetaUndoStack = [];
    let calendarAccessToken = null;
    let calendarEvents = [];
    let allTodos = [];
    let allPages = [];
    let uploadedWikiStorageUrls = new Set();
    let allProjects = [];
    let currentPageId = null;
    let currentPageMeta = { icon: '📄', coverUrl: '', coverPosition: 50, coverPositionX: 50, coverHeight: 180, coverZoom: 100, coverCropMode: 'cover' };
    let wikiDraggingBlockIndex = null;

    const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;
    const storage = typeof firebase !== 'undefined' ? firebase.storage() : null;

    // --- STORAGE CONFIGURATION ---
    // Using Firebase Storage to avoid Mixed Content (HTTPS -> HTTP) issues.

    const pageWiki = document.getElementById('page-wiki');
    const wikiPageList = document.getElementById('wiki-page-list');
    const wikiTitleInput = document.getElementById('wiki-title-input');
    const wikiProjectSelect = document.getElementById('wiki-project-select');
    const wikiEditorView = document.getElementById('wiki-editor-view');
    const wikiEmptyView = document.getElementById('wiki-empty-view');
    const wikiSubpagesSection = document.getElementById('wiki-subpages-section');
    const wikiSubpagesList = document.getElementById('wiki-subpages-list');
    const wikiCreateSubpageBtn = document.getElementById('wiki-create-subpage-btn');
    const newWikiBtn = document.getElementById('new-wiki-btn');
    const saveWikiBtn = document.getElementById('wiki-save-btn');
    const deleteWikiBtn = document.getElementById('wiki-delete-btn');
    const searchInput = document.getElementById('wiki-search-input');
    const backBtn = document.getElementById('wiki-back-btn');
    const parentBtn = document.getElementById('wiki-parent-btn');
    const wikiLayout = document.querySelector('#page-wiki .wiki-layout');
    const treeToggleBtn = document.getElementById('wiki-tree-toggle-btn');
    const widgetToggleBtn = document.getElementById('wiki-widget-toggle-btn');
    const widgetCloseBtn = document.getElementById('wiki-widget-close-btn');
    const pageIconBtn = document.getElementById('wiki-icon-btn');
    const coverEl = document.getElementById('wiki-cover');
    const coverBtn = document.getElementById('wiki-cover-btn');
    const coverAdjustBtn = document.getElementById('wiki-cover-adjust-btn');
    const coverPanel = document.getElementById('wiki-cover-panel');
    const coverPositionRange = document.getElementById('wiki-cover-position-range');
    const coverPositionXRange = document.getElementById('wiki-cover-position-x-range');
    const coverHeightRange = document.getElementById('wiki-cover-height-range');
    const coverZoomRange = document.getElementById('wiki-cover-zoom-range');
    const coverResetBtn = document.getElementById('wiki-cover-reset-btn');
    const saveStateEl = document.getElementById('wiki-save-state');
    const updatedAtEl = document.getElementById('wiki-updated-at');
    const widgetNewSubpageBtn = document.getElementById('wiki-widget-new-subpage-btn');
    const calendarConnectBtn = document.getElementById('wiki-calendar-connect-btn');
    const calendarCreateBtn = document.getElementById('wiki-calendar-create-btn');

    if (!pageWiki) return;

    const tr = (key) => window.PlanaryI18n?.t?.(key) || key;
    const fmt = (key, values = {}) => window.PlanaryI18n?.format?.(key, values)
        || tr(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');

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
            this.input.placeholder = tr('mathPlaceholder');
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
                    katex.render(this.input.value, this.output, { throwOnError: false, displayMode: true, strict: false });
                } else {
                    this.output.innerText = tr('katexNotLoaded');
                }
            } catch (e) {
                this.output.innerText = tr('syntaxError');
            }
        }
        save(blockContent) {
            return { text: this.input.value };
        }
    }

    class SubpageTool {
        static get toolbox() {
            return {
                title: tr('wikiToolPage'),
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="2"><path d="M12 5v14M5 12h14"/><path d="M4 4h6v6H4z" opacity="0.45"/></svg>'
            };
        }
        render() {
            const container = document.createElement('div');
            container.style.display = 'none';
            setTimeout(() => {
                if (!currentPageId) {
                    window.showToast(tr('openPageFirst'), 'error');
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

    class ToggleBlockTool {
        static get toolbox() {
            return {
                title: tr('wikiToolToggle'),
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>'
            };
        }
        constructor({ data }) {
            this.data = data || {};
            this.open = this.data.open !== false;
        }
        render() {
            this.container = document.createElement('div');
            this.container.className = 'wiki-tool-toggle';
            this.container.dataset.open = String(this.open);

            this.summary = document.createElement('div');
            this.summary.className = 'wiki-tool-toggle-summary';
            this.summary.contentEditable = 'true';
            this.summary.dataset.placeholder = tr('wikiToggleTitlePlaceholder');
            this.summary.innerHTML = this.data.title || '';

            this.chevron = document.createElement('button');
            this.chevron.className = 'wiki-tool-toggle-chevron';
            this.chevron.type = 'button';
            this.chevron.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
            this.chevron.onclick = () => {
                this.open = !this.open;
                this.container.dataset.open = String(this.open);
            };

            this.content = document.createElement('div');
            this.content.className = 'wiki-tool-toggle-content';
            this.content.contentEditable = 'true';
            this.content.dataset.placeholder = tr('wikiToggleBodyPlaceholder');
            this.content.innerHTML = this.data.text || '';

            const head = document.createElement('div');
            head.className = 'wiki-tool-toggle-head';
            head.append(this.chevron, this.summary);
            this.container.append(head, this.content);
            return this.container;
        }
        save(blockContent) {
            return {
                title: blockContent.querySelector('.wiki-tool-toggle-summary')?.innerHTML || '',
                text: blockContent.querySelector('.wiki-tool-toggle-content')?.innerHTML || '',
                open: blockContent.dataset.open !== 'false'
            };
        }
    }

    class CalloutTool {
        static get toolbox() {
            return {
                title: tr('wikiToolCallout'),
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>'
            };
        }
        constructor({ data }) {
            this.data = data || {};
        }
        render() {
            const container = document.createElement('div');
            container.className = 'wiki-tool-callout';

            const icon = document.createElement('div');
            icon.className = 'wiki-tool-callout-icon';
            icon.contentEditable = 'true';
            icon.dataset.placeholder = '💡';
            icon.textContent = this.data.icon || '💡';

            const text = document.createElement('div');
            text.className = 'wiki-tool-callout-text';
            text.contentEditable = 'true';
            text.dataset.placeholder = tr('wikiCalloutPlaceholder');
            text.innerHTML = this.data.text || '';

            container.append(icon, text);
            return container;
        }
        save(blockContent) {
            return {
                icon: blockContent.querySelector('.wiki-tool-callout-icon')?.textContent.trim().slice(0, 4) || '💡',
                text: blockContent.querySelector('.wiki-tool-callout-text')?.innerHTML || ''
            };
        }
    }

    class QuoteBlockTool {
        static get toolbox() {
            return {
                title: tr('wikiToolQuote'),
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.17 6A5.17 5.17 0 0 0 2 11.17V18h7v-7H5.1A2.07 2.07 0 0 1 7.17 8.93V6Zm10 0A5.17 5.17 0 0 0 12 11.17V18h7v-7h-3.9a2.07 2.07 0 0 1 2.07-2.07V6Z"/></svg>'
            };
        }
        constructor({ data }) {
            this.data = data || {};
        }
        render() {
            const container = document.createElement('blockquote');
            container.className = 'wiki-tool-quote';

            const text = document.createElement('div');
            text.className = 'wiki-tool-quote-text';
            text.contentEditable = 'true';
            text.dataset.placeholder = tr('wikiQuotePlaceholder');
            text.innerHTML = this.data.text || '';

            const caption = document.createElement('div');
            caption.className = 'wiki-tool-quote-caption';
            caption.contentEditable = 'true';
            caption.dataset.placeholder = tr('wikiQuoteCaptionPlaceholder');
            caption.innerHTML = this.data.caption || '';

            container.append(text, caption);
            return container;
        }
        save(blockContent) {
            return {
                text: blockContent.querySelector('.wiki-tool-quote-text')?.innerHTML || '',
                caption: blockContent.querySelector('.wiki-tool-quote-caption')?.innerHTML || ''
            };
        }
    }

    class DividerTool {
        static get toolbox() {
            return {
                title: tr('wikiToolDivider'),
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/></svg>'
            };
        }
        render() {
            const divider = document.createElement('div');
            divider.className = 'wiki-tool-divider';
            return divider;
        }
        save() {
            return {};
        }
    }

    class PageLinkTool {
        static get toolbox() {
            return {
                title: tr('wikiToolPageLink'),
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.15-1.15"/></svg>'
            };
        }
        constructor({ data }) {
            this.data = data || {};
        }
        render() {
            const container = document.createElement('div');
            container.className = 'wiki-tool-page-link';

            this.select = document.createElement('select');
            this.select.className = 'wiki-tool-page-link-select';
            this.select.innerHTML = `<option value="">${tr('wikiPageLinkSelect')}</option>`;
            allPages
                .filter(page => page.id !== currentPageId)
                .forEach(page => {
                    const option = document.createElement('option');
                    option.value = page.id;
                    option.textContent = `${page.icon || '📄'} ${page.title || tr('untitledDocument')}`;
                    if (page.id === this.data.pageId) option.selected = true;
                    this.select.appendChild(option);
                });

            this.card = document.createElement('button');
            this.card.className = 'wiki-tool-page-link-card';
            this.card.type = 'button';
            this.card.onclick = () => {
                const pageId = this.select.value;
                if (pageId) navigateToPage(pageId);
            };

            const renderCard = () => {
                const page = getPageById(this.select.value);
                this.card.innerHTML = page
                    ? `<span>${escapeHtml(page.icon || '📄')}</span><strong>${escapeHtml(page.title || tr('untitledDocument'))}</strong>`
                    : `<span>🔗</span><strong>${tr('wikiPageLinkEmpty')}</strong>`;
            };
            this.select.onchange = renderCard;
            renderCard();

            container.append(this.select, this.card);
            return container;
        }
        save(blockContent) {
            const pageId = blockContent.querySelector('.wiki-tool-page-link-select')?.value || '';
            const page = getPageById(pageId);
            return {
                pageId,
                title: page ? (page.title || tr('untitledDocument')) : '',
                icon: page ? (page.icon || '📄') : '📄'
            };
        }
    }

    const removeHeadingShortcutHandler = () => {
        const holder = document.getElementById('editorjs');
        if (holder && editorKeydownHandler) {
            holder.removeEventListener('keydown', editorKeydownHandler);
        }
        editorKeydownHandler = null;
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

    const focusEditorBlockAtEnd = (index) => {
        requestAnimationFrame(() => {
            const block = document.querySelectorAll('#editorjs .ce-block')[index];
            const editable = block?.querySelector('[contenteditable="true"]');
            if (!editable) return;
            editable.focus({ preventScroll: true });
            const range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    };

    const focusEditorBlockAtStart = (index) => {
        requestAnimationFrame(() => {
            const block = document.querySelectorAll('#editorjs .ce-block')[index];
            const editable = block?.querySelector('[contenteditable="true"]');
            if (!editable) return;
            editable.focus({ preventScroll: true });
            const range = document.createRange();
            range.selectNodeContents(editable);
            range.collapse(true);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    };

    const getFocusedEditorBlockIndex = () => {
        const block = document.activeElement?.closest?.('#editorjs .ce-block');
        if (!block) return editor?.blocks?.getCurrentBlockIndex?.() ?? -1;
        return [...document.querySelectorAll('#editorjs .ce-block')].indexOf(block);
    };

    const getEditableText = (editable) => (editable?.innerText || editable?.textContent || '')
        .replace(/\uFEFF/g, '')
        .trim();

    const isBlockVisuallyEmpty = (blockEl) => {
        if (!blockEl) return false;
        const editables = [...blockEl.querySelectorAll('[contenteditable="true"]')];
        if (!editables.length) return true;
        return editables.every(editable => getEditableText(editable) === '');
    };

    const insertParagraphAfter = async (index) => {
        if (!editor || index < 0) return;
        await captureUndoSnapshot();
        editor.blocks.insert('paragraph', { text: '' }, {}, index + 1, false);
        focusEditorBlockAtStart(index + 1);
        markDirty();
        scheduleUndoSnapshot();
    };

    const isCaretAtEnd = (editable) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editable || !editable.contains(selection.anchorNode)) return false;
        const range = selection.getRangeAt(0).cloneRange();
        const tailRange = range.cloneRange();
        tailRange.selectNodeContents(editable);
        tailRange.setStart(range.endContainer, range.endOffset);
        return tailRange.toString().replace(/\uFEFF/g, '') === '';
    };

    const deleteEditorBlockAt = async (index) => {
        if (!editor || index < 0) return;
        const count = editor.blocks.getBlocksCount ? editor.blocks.getBlocksCount() : document.querySelectorAll('#editorjs .ce-block').length;
        if (count <= 1) {
            await captureUndoSnapshot();
            editor.blocks.delete(index);
            editor.blocks.insert('paragraph', { text: '' }, {}, 0, false);
            focusEditorBlockAtEnd(0);
        } else {
            await captureUndoSnapshot();
            editor.blocks.delete(index);
            focusEditorBlockAtEnd(Math.max(0, Math.min(index, count - 2)));
        }
        markDirty();
        scheduleUndoSnapshot();
    };

    const handleEditorStructuralKeys = (event) => {
        if (!editor || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
        const blockEl = event.target.closest?.('#editorjs .ce-block');
        if (!blockEl) return false;
        const index = getFocusedEditorBlockIndex();
        if (index < 0) return false;
        const block = editor.blocks.getBlockByIndex(index);

        if (event.key === 'Enter' && block?.name === 'header') {
            const editable = event.target.closest?.('[contenteditable="true"]');
            if (!isCaretAtEnd(editable)) return false;
            event.preventDefault();
            headingShortcutIndex = null;
            insertParagraphAfter(index);
            focusEditorBlockAtStart(index + 1);
            return true;
        }

        if (!['Backspace', 'Delete'].includes(event.key)) return false;
        if (!isBlockVisuallyEmpty(blockEl)) return false;
        if (block?.name === 'paragraph') return false;

        event.preventDefault();
        deleteEditorBlockAt(index);
        return true;
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
                captureUndoSnapshot();
                editor.blocks.delete(currentIndex);
                editor.blocks.insert('header', { text: '', level }, {}, currentIndex, false);
                headingShortcutIndex = currentIndex;
                focusEditorBlockAtEnd(currentIndex);
                markDirty();
                scheduleUndoSnapshot();
            } catch (error) {
                console.error('[Wiki] Heading shortcut failed:', error);
                window.showToast(tr('headingShortcutFailed') + ': ' + (error.message || error), 'error');
            }
        };
    };

    const toStringValue = (value) => value == null ? '' : String(value);
    const toBoundedNumber = (value, fallback, min, max) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
    };

    const normalizeEditorBlock = (block) => {
        if (!block || typeof block !== 'object') return null;
        const type = typeof block.type === 'string' ? block.type : 'paragraph';
        const data = block.data && typeof block.data === 'object' ? block.data : {};

        switch (type) {
            case 'paragraph':
                return { type, data: { text: toStringValue(data.text) } };
            case 'header': {
                const level = Number(data.level);
                return {
                    type,
                    data: {
                        text: toStringValue(data.text),
                        level: Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2
                    }
                };
            }
            case 'list':
                return Array.isArray(data.items)
                    ? { type, data: { ...data, items: data.items } }
                    : { type: 'paragraph', data: { text: toStringValue(data.text) } };
            case 'checklist':
                return Array.isArray(data.items)
                    ? {
                        type,
                        data: {
                            items: data.items.map((item) => ({
                                text: toStringValue(item && item.text),
                                checked: !!(item && item.checked)
                            }))
                        }
                    }
                    : null;
            case 'image':
                return data.file && typeof data.file.url === 'string'
                    ? { type, data: { ...data, caption: toStringValue(data.caption), withBorder: !!data.withBorder, withBackground: !!data.withBackground, stretched: !!data.stretched } }
                    : null;
            case 'code':
                return { type, data: { code: toStringValue(data.code) } };
            case 'table':
                return Array.isArray(data.content) ? { type, data } : null;
            case 'attaches':
                return data.file && typeof data.file.url === 'string' ? { type, data } : null;
            case 'math':
                return { type, data: { text: toStringValue(data.text) } };
            case 'toggle':
                return { type, data: { title: toStringValue(data.title), text: toStringValue(data.text), open: data.open !== false } };
            case 'callout':
                return { type, data: { icon: toStringValue(data.icon).trim().slice(0, 4) || '💡', text: toStringValue(data.text) } };
            case 'quote':
                return { type, data: { text: toStringValue(data.text), caption: toStringValue(data.caption) } };
            case 'divider':
                return { type, data: {} };
            case 'pageLink':
                return { type, data: { pageId: toStringValue(data.pageId), title: toStringValue(data.title), icon: toStringValue(data.icon) || '📄' } };
            case 'subpage':
                return { type, data: {} };
            default:
                return data.text != null ? { type: 'paragraph', data: { text: toStringValue(data.text) } } : null;
        }
    };

    const normalizeEditorData = (data) => {
        if (!data || !Array.isArray(data.blocks)) return { blocks: [] };
        const blocks = data.blocks
            .map((block) => convertMarkdownMathBlock(normalizeEditorBlock(block)))
            .filter(Boolean);
        return {
            time: data.time || Date.now(),
            blocks,
            version: data.version || '2.31.0'
        };
    };

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const decodeBasicHtml = (value) => String(value || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/div>\s*<div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    const getFirebaseStoragePathFromUrl = (url) => {
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
    };

    const collectStorageUrlsFromValue = (value, target = new Set()) => {
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
    };

    const getWikiPageStorageUrls = (page) => {
        const urls = new Set();
        if (!page) return urls;
        collectStorageUrlsFromValue(page.coverUrl, urls);
        collectStorageUrlsFromValue(page.content, urls);
        return urls;
    };

    const getLinkedWikiStorageUrls = (replacementPage = null, excludedPageIds = new Set()) => {
        const urls = new Set();
        allPages.forEach(page => {
            if (excludedPageIds.has(page.id)) return;
            getWikiPageStorageUrls(replacementPage && page.id === replacementPage.id ? replacementPage : page)
                .forEach(url => urls.add(url));
        });
        return urls;
    };

    const deleteStorageUrls = async (urls) => {
        if (!storage || !currentUser) return;
        await Promise.allSettled([...urls].map(async (url) => {
            const path = getFirebaseStoragePathFromUrl(url);
            if (!path || !path.startsWith(`wiki/${currentUser.uid}/`)) return;
            try {
                await storage.ref().child(path).delete();
            } catch (error) {
                if (error.code !== 'storage/object-not-found') console.warn('[Wiki] Failed to delete orphaned file:', path, error);
            }
        }));
    };

    const deleteUnlinkedWikiStorageUrls = async (beforeUrls, linkedUrls) => {
        const orphaned = new Set([...beforeUrls].filter(url => !linkedUrls.has(url)));
        await deleteStorageUrls(orphaned);
    };

    const cleanupPendingWikiUploads = () => {
        if (!uploadedWikiStorageUrls.size) return;
        const linkedUrls = getLinkedWikiStorageUrls();
        const pendingOrphans = new Set([...uploadedWikiStorageUrls].filter(url => !linkedUrls.has(url)));
        uploadedWikiStorageUrls = new Set([...uploadedWikiStorageUrls].filter(url => linkedUrls.has(url)));
        deleteStorageUrls(pendingOrphans);
    };

    const parseMarkdownMath = (value) => {
        const text = decodeBasicHtml(value).trim();
        if (!text) return null;
        const patterns = [
            /^\$\$([\s\S]+?)\$\$$/,
            /^\\\[([\s\S]+?)\\\]$/,
            /^\\\(([\s\S]+?)\\\)$/,
            /^\$([^\n$]+?)\$$/
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1] && match[1].trim()) return match[1].trim();
        }
        return null;
    };

    function convertMarkdownMathBlock(block) {
        if (!block || block.type !== 'paragraph') return block;
        const mathText = parseMarkdownMath(block.data?.text);
        return mathText ? { type: 'math', data: { text: mathText } } : block;
    }

    const convertMarkdownMathData = (data) => {
        const normalized = normalizeEditorData(data);
        return {
            ...normalized,
            blocks: normalized.blocks.map(convertMarkdownMathBlock)
        };
    };

    const scheduleMarkdownMathConversion = () => {
        if (!editor || isRestoringUndo || isConvertingMarkdownMath) return;
        clearTimeout(markdownMathTimer);
        markdownMathTimer = setTimeout(async () => {
            if (!editor || isRestoringUndo || isConvertingMarkdownMath) return;
            try {
                const current = normalizeEditorData(await editor.save());
                const converted = convertMarkdownMathData(current);
                if (serializeEditorData(current) === serializeEditorData(converted)) return;
                isConvertingMarkdownMath = true;
                await editor.render(converted);
                markDirty();
                scheduleUndoSnapshot();
            } catch (error) {
                console.warn('[Wiki] Markdown math conversion skipped:', error);
            } finally {
                isConvertingMarkdownMath = false;
            }
        }, 650);
    };

    const serializeEditorData = (data) => JSON.stringify(normalizeEditorData(data));
    const formatDate = (value) => {
        if (!value) return '-';
        const date = value.toDate ? value.toDate() : new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
    };
    const markDirty = () => {
        if (saveWikiBtn) saveWikiBtn.disabled = false;
        if (saveStateEl) saveStateEl.textContent = tr('unsavedChanges');
    };
    const getCurrentPage = () => allPages.find(page => page.id === currentPageId);
    const getProjectName = (projectId) => {
        const project = allProjects.find(item => item.id === projectId);
        return project ? (project.name || tr('untitledProject')) : tr('noProject');
    };

    const resetUndoHistory = (data) => {
        const normalized = normalizeEditorData(data);
        lastUndoSnapshot = serializeEditorData(normalized);
        undoStack = [normalized];
    };

    const getMetaSnapshot = () => ({
        title: wikiTitleInput ? wikiTitleInput.value : '',
        projectId: wikiProjectSelect ? wikiProjectSelect.value : '',
        icon: currentPageMeta.icon || '📄',
        coverUrl: currentPageMeta.coverUrl || '',
        coverPosition: toBoundedNumber(currentPageMeta.coverPosition, 50, 0, 100),
        coverPositionX: toBoundedNumber(currentPageMeta.coverPositionX, 50, 0, 100),
        coverHeight: toBoundedNumber(currentPageMeta.coverHeight, 180, 120, 360),
        coverZoom: toBoundedNumber(currentPageMeta.coverZoom, 100, 100, 220),
        coverCropMode: currentPageMeta.coverCropMode || 'cover'
    });

    const pushMetaUndoSnapshot = () => {
        const snapshot = getMetaSnapshot();
        const serialized = JSON.stringify(snapshot);
        if (pageMetaUndoStack.length && JSON.stringify(pageMetaUndoStack[pageMetaUndoStack.length - 1]) === serialized) return;
        pageMetaUndoStack.push(snapshot);
        if (pageMetaUndoStack.length > 60) pageMetaUndoStack.shift();
    };

    const resetMetaUndoHistory = () => {
        pageMetaUndoStack = [];
        pushMetaUndoSnapshot();
    };

    const applyCover = (url, position = 50, height = 180, positionX = 50, zoom = 100) => {
        if (!coverEl) return;
        const safePosition = toBoundedNumber(position, 50, 0, 100);
        const safePositionX = toBoundedNumber(positionX, 50, 0, 100);
        const safeHeight = toBoundedNumber(height, 180, 120, 360);
        const safeZoom = toBoundedNumber(zoom, 100, 100, 220);
        coverEl.style.setProperty('--wiki-cover-position', `${safePosition}%`);
        coverEl.style.setProperty('--wiki-cover-position-x', `${safePositionX}%`);
        coverEl.style.setProperty('--wiki-cover-height', `${safeHeight}px`);
        coverEl.style.setProperty('--wiki-cover-zoom', `${safeZoom}%`);
        if (coverPositionRange) coverPositionRange.value = String(safePosition);
        if (coverPositionXRange) coverPositionXRange.value = String(safePositionX);
        if (coverHeightRange) coverHeightRange.value = String(safeHeight);
        if (coverZoomRange) coverZoomRange.value = String(safeZoom);
        if (url) {
            coverEl.dataset.coverUrl = url;
            coverEl.style.backgroundImage = `linear-gradient(rgba(15,23,42,0.04), rgba(15,23,42,0.14)), url("${url.replace(/"/g, '%22')}")`;
        } else {
            delete coverEl.dataset.coverUrl;
            coverEl.style.backgroundImage = '';
        }
    };

    const applyPageMeta = (meta, shouldMarkDirty = true) => {
        currentPageMeta = {
            icon: meta.icon || '📄',
            coverUrl: meta.coverUrl || '',
            coverPosition: toBoundedNumber(meta.coverPosition, 50, 0, 100),
            coverPositionX: toBoundedNumber(meta.coverPositionX, 50, 0, 100),
            coverHeight: toBoundedNumber(meta.coverHeight, 180, 120, 360),
            coverZoom: toBoundedNumber(meta.coverZoom, 100, 100, 220),
            coverCropMode: meta.coverCropMode || 'cover'
        };
        if (wikiTitleInput && meta.title != null) wikiTitleInput.value = meta.title;
        if (wikiProjectSelect && meta.projectId != null) wikiProjectSelect.value = meta.projectId;
        if (pageIconBtn) pageIconBtn.textContent = currentPageMeta.icon;
        applyCover(currentPageMeta.coverUrl, currentPageMeta.coverPosition, currentPageMeta.coverHeight, currentPageMeta.coverPositionX, currentPageMeta.coverZoom);
        if (shouldMarkDirty) markDirty();
        renderWidgets();
    };

    const undoMetaChange = () => {
        if (pageMetaUndoStack.length < 2) return false;
        pageMetaUndoStack.pop();
        const previous = pageMetaUndoStack[pageMetaUndoStack.length - 1];
        applyPageMeta(previous, true);
        return true;
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
        if (editor) {
            const current = normalizeEditorData(await editor.save());
            const serialized = serializeEditorData(current);
            if (serialized !== lastUndoSnapshot) {
                undoStack.push(current);
                if (undoStack.length > 60) undoStack.shift();
                lastUndoSnapshot = serialized;
            }
        }
        if (!editor || undoStack.length < 2) return;

        undoStack.pop();
        const previous = normalizeEditorData(undoStack[undoStack.length - 1]);
        isRestoringUndo = true;

        try {
            await editor.render(previous);
            lastUndoSnapshot = serializeEditorData(previous);
            markDirty();
            setTimeout(installWikiBlockDragHandles, 0);
        } catch (error) {
            console.error('[Wiki] Undo failed:', error);
            window.showToast(tr('undoFailed') + ': ' + (error.message || error), 'error');
        } finally {
            setTimeout(() => { isRestoringUndo = false; }, 0);
        }
    };

    const clearWikiDropMarkers = () => {
        document.querySelectorAll('#editorjs .wiki-block-drop-before, #editorjs .wiki-block-drop-after')
            .forEach(block => block.classList.remove('wiki-block-drop-before', 'wiki-block-drop-after'));
    };

    const getEditorBlocks = () => [...document.querySelectorAll('#editorjs .ce-block')];

    const moveEditorBlock = async (fromIndex, toIndex) => {
        if (!editor || fromIndex == null || toIndex == null || fromIndex === toIndex) return;
        try {
            await captureUndoSnapshot();
            const data = normalizeEditorData(await editor.save());
            const blocks = [...(data.blocks || [])];
            if (!blocks[fromIndex] || !blocks[toIndex]) return;
            const [moved] = blocks.splice(fromIndex, 1);
            blocks.splice(toIndex, 0, moved);
            const nextData = { ...data, time: Date.now(), blocks };
            isRestoringUndo = true;
            await editor.render(nextData);
            isRestoringUndo = false;
            await captureUndoSnapshot();
            markDirty();
            setTimeout(installWikiBlockDragHandles, 0);
        } catch (error) {
            isRestoringUndo = false;
            console.warn('[Wiki] Block move failed:', error);
            window.showToast(tr('blockMoveFailed') + ': ' + (error.message || error), 'error');
        }
    };

    const installWikiBlockDragHandles = () => {
        const blocks = getEditorBlocks();
        blocks.forEach((block, index) => {
            block.dataset.wikiBlockIndex = String(index);
            if (block.querySelector(':scope > .wiki-block-drag-handle')) return;
            const handle = document.createElement('button');
            handle.type = 'button';
            handle.className = 'wiki-block-drag-handle';
            handle.draggable = true;
            handle.setAttribute('aria-label', tr('dragBlock'));
            handle.innerHTML = '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><circle cx="6" cy="5" r="1.5"/><circle cx="14" cy="5" r="1.5"/><circle cx="6" cy="10" r="1.5"/><circle cx="14" cy="10" r="1.5"/><circle cx="6" cy="15" r="1.5"/><circle cx="14" cy="15" r="1.5"/></svg>';
            handle.addEventListener('dragstart', event => {
                wikiDraggingBlockIndex = Number(block.dataset.wikiBlockIndex);
                block.classList.add('wiki-block-dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(wikiDraggingBlockIndex));
            });
            handle.addEventListener('dragend', () => {
                block.classList.remove('wiki-block-dragging');
                wikiDraggingBlockIndex = null;
                clearWikiDropMarkers();
            });
            block.addEventListener('dragover', event => {
                if (wikiDraggingBlockIndex == null) return;
                event.preventDefault();
                clearWikiDropMarkers();
                const rect = block.getBoundingClientRect();
                block.classList.add(event.clientY < rect.top + rect.height / 2 ? 'wiki-block-drop-before' : 'wiki-block-drop-after');
            });
            block.addEventListener('drop', event => {
                if (wikiDraggingBlockIndex == null) return;
                event.preventDefault();
                const rect = block.getBoundingClientRect();
                const targetIndex = Number(block.dataset.wikiBlockIndex) + (event.clientY < rect.top + rect.height / 2 ? 0 : 1);
                const normalizedTarget = targetIndex > wikiDraggingBlockIndex ? targetIndex - 1 : targetIndex;
                clearWikiDropMarkers();
                moveEditorBlock(wikiDraggingBlockIndex, Math.max(0, Math.min(blocks.length - 1, normalizedTarget)));
            });
            block.prepend(handle);
        });
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

        const isHeaderFound = typeof Header !== 'undefined';
        const EditorListClass = typeof EditorjsList !== 'undefined' ? EditorjsList : (typeof List !== 'undefined' ? List : null);

        if (isHeaderFound) {
            tools.header = {
                class: Header,
                config: {
                    placeholder: tr('headingPlaceholder'),
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
        tools.toggle = { class: ToggleBlockTool };
        tools.callout = { class: CalloutTool };
        tools.quote = { class: QuoteBlockTool };
        tools.divider = { class: DividerTool };
        tools.pageLink = { class: PageLinkTool };
        tools.subpage = { class: SubpageTool };

        const createUploader = (label = "File") => {
            return {
                uploadByFile(file) {
                    if (!currentUser || !storage) return Promise.reject(tr('loginFirstOrStorage'));
                    
                    const progressContainer = document.getElementById('wiki-upload-progress');
                    const progressBar = document.getElementById('wiki-upload-bar');
                    const progressText = document.getElementById('wiki-upload-text');

                    if (progressContainer) progressContainer.style.display = 'flex';
                    if (progressText) progressText.innerText = `${label} ${tr('uploadingImage')} 0%`;

                    return new Promise((resolve, reject) => {
                        // Path: /wiki/{userId}/{timestamp}_{fileName}
                        const filePath = `wiki/${currentUser.uid}/${Date.now()}_${file.name}`;
                        const storageRef = storage.ref().child(filePath);
                        const uploadTask = storageRef.put(file);

                        uploadTask.on('state_changed', 
                            (snapshot) => {
                                const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                                if (progressBar) progressBar.style.width = percent + '%';
                                if (progressText) progressText.innerText = `${label} ${tr('uploadingImage')} ${percent}%`;
                            }, 
                            (error) => {
                                console.error("Upload error:", error);
                                if (progressContainer) progressContainer.style.display = 'none';
                                window.showToast(tr('uploadFailed') + ': ' + error.message, "error");
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
                                    uploadedWikiStorageUrls.add(downloadURL);
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
                    uploader: createUploader(tr('attachment'))
                }
            };
        }

        editor = new EditorJS({
            holder: 'editorjs',
            data: normalizeEditorData(data),
            placeholder: tr('editorPlaceholder'),
            tools: tools,
            inlineToolbar: true,
            onReady: () => {
                const holder = document.getElementById('editorjs');
                removeHeadingShortcutHandler();
                headingShortcutHandler = createHeadingShortcutHandler();
                if (holder) {
                    editorKeydownHandler = (event) => {
                        if (handleEditorStructuralKeys(event)) return;
                        headingShortcutHandler(event);
                    };
                    holder.addEventListener('keydown', editorKeydownHandler);
                }
                installWikiBlockDragHandles();
            },
            onChange: () => {
                // Proactively enable save button if disabled
                if (saveWikiBtn) saveWikiBtn.disabled = false;
                scheduleMarkdownMathConversion();
                scheduleUndoSnapshot();
                setTimeout(installWikiBlockDragHandles, 0);
            }
        });
    }

    // --- STATE & FIRESTORE BINDINGS ---
    if (!db || typeof firebase === 'undefined' || !firebase.auth) {
        return;
    }

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadPages();
            loadProjects();
            loadTodos();
        } else {
            currentUser = null;
            allPages = [];
            allProjects = [];
            allTodos = [];
            renderPageList();
            renderProjectSelect();
            renderWidgets();
        }
    });

    const pendingPageFetches = new Set();

    const upsertLoadedPage = (page) => {
        const index = allPages.findIndex(existing => existing.id === page.id);
        if (index >= 0) allPages[index] = { ...allPages[index], ...page };
        else allPages.unshift(page);
    };

    const loadPages = () => {
        if (!db || !currentUser) return;
        // Client-side sort: Firestore's orderBy('updatedAt') filters out docs
        // whose serverTimestamp hasn't been confirmed yet, so newly created
        // pages would briefly disappear from the tree.
        db.collection('wiki_pages').where('uid', '==', currentUser.uid)
            .onSnapshot(snap => {
                allPages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allPages.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
                renderPageList();
                if (currentPageId) renderSubpages(currentPageId);
                checkHash();
            }, error => {
                console.error('[Wiki] Page load failed:', error);
                window.showToast(tr('loadFailed') + ': ' + (error.message || error), 'error');
            });
    };

    const loadProjects = () => {
        if (!db || !currentUser) return;
        db.collection('projects').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProjectSelect();
            renderWidgets();
        });
    };

    const loadTodos = () => {
        if (!db || !currentUser) return;
        db.collection('todos').where('uid', '==', currentUser.uid).onSnapshot(snapshot => {
            allTodos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWidgets();
        });
    };

    const renderProjectSelect = () => {
        if (!wikiProjectSelect) return;
        const previousValue = wikiProjectSelect.value;
        wikiProjectSelect.innerHTML = `<option value="">${tr('noProject')}</option>`;
        allProjects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name || tr('untitledProject');
            wikiProjectSelect.appendChild(option);
        });

        const currentPage = allPages.find(page => page.id === currentPageId);
        wikiProjectSelect.value = currentPage ? getInheritedProjectId(currentPage) : previousValue;
    };

    const renderPageList = () => {
        if (!wikiPageList) return;
        let filteredPages = allPages;
        const term = searchInput ? searchInput.value.toLowerCase() : "";

        if (term) {
            filteredPages = allPages.filter(p => (p.title && p.title.toLowerCase().includes(term)));
        }

        wikiPageList.innerHTML = filteredPages.length ? '' : `<div class="empty-state" style="padding:20px;">${tr('noPagesFound')}</div>`;

        const childrenByParent = filteredPages.reduce((groups, page) => {
            const parentId = page.parentId || '';
            if (!groups[parentId]) groups[parentId] = [];
            groups[parentId].push(page);
            return groups;
        }, {});

        const renderedIds = new Set();
        const currentPage = allPages.find(page => page.id === currentPageId);
        const expandedRootId = currentPage && !currentPage.parentId ? currentPage.id : null;
        const renderPages = (parentId = '', depth = 0, forceExpanded = false) => {
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
                    <span>${escapeHtml(page.title || tr('untitledDocument'))}</span>
                `;
                el.onclick = () => navigateToPage(page.id);
                wikiPageList.appendChild(el);
                const shouldExpand = term || forceExpanded || page.id === expandedRootId;
                if (shouldExpand) {
                    renderPages(page.id, depth + 1, forceExpanded || page.id === expandedRootId);
                }
            });
        };

        renderPages('');

        filteredPages
            .filter(page => !renderedIds.has(page.id))
            .forEach(page => {
                renderPages(page.parentId || '', 0, true);
                if (renderedIds.has(page.id)) return;
                const el = document.createElement('div');
                el.className = `wiki-page-item wiki-page-orphan ${currentPageId === page.id ? 'active' : ''}`;
                el.style.setProperty('--wiki-depth', 0);
                el.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px; opacity:0.6;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span>${escapeHtml(page.title || tr('untitledDocument'))}</span>
                `;
                el.onclick = () => navigateToPage(page.id);
                wikiPageList.appendChild(el);
                renderedIds.add(page.id);
            });

        if (term) {
            filteredPages
                .filter(page => !renderedIds.has(page.id))
                .forEach(page => {
                    if (renderedIds.has(page.parentId)) renderPages(page.parentId, 1);
                    else renderPages(page.parentId || '', 0);
                });
        }
        renderWidgets();
    };

    if (searchInput) {
        searchInput.oninput = () => renderPageList();
    }

    window.addEventListener('planary-language-change', () => {
        renderProjectSelect();
        renderPageList();
        if (currentPageId) renderSubpages(currentPageId);
        if (wikiTitleInput) wikiTitleInput.placeholder = tr('untitledDocument');
        if (searchInput) searchInput.placeholder = tr('searchPages');
        if (wikiProjectSelect) wikiProjectSelect.setAttribute('aria-label', tr('wikiProjectSelect'));
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        setText('wiki-tree-title', tr('wikiPageTree'));
        setText('wiki-widget-title', tr('documentTools'));
        setText('wiki-info-title', tr('documentInfo'));
        setText('wiki-info-project-label', tr('projectLabel'));
        setText('wiki-info-updated-label', tr('recentlyUpdated'));
        setText('wiki-info-subpages-label', tr('subpages'));
        setText('wiki-widget-subpages-title', tr('subpages'));
        setText('wiki-widget-new-subpage-btn', tr('newSubpage'));
        setText('wiki-widget-tasks-title', tr('todayFocusTitle'));
        setText('wiki-widget-calendar-title', tr('calendar'));
        setText('wiki-calendar-connect-btn', tr('googleCalendarConnect'));
        setText('wiki-calendar-create-btn', tr('createCalendarFromPage'));
        setText('wiki-cover-btn', tr('changeCover'));
        setText('wiki-cover-adjust-btn', tr('adjustCover'));
        setText('wiki-cover-position-x-label', tr('coverPositionX'));
        setText('wiki-cover-position-y-label', tr('coverPositionY'));
        setText('wiki-cover-height-label', tr('coverHeight'));
        setText('wiki-cover-zoom-label', tr('coverZoom'));
        setText('wiki-cover-reset-btn', tr('resetCover'));
        setText('wiki-parent-btn span', tr('parentPage'));
        if (backBtn) {
            backBtn.title = tr('backToList');
            backBtn.setAttribute('aria-label', tr('backToList'));
        }
        if (saveWikiBtn && !saveWikiBtn.disabled) saveWikiBtn.textContent = tr('saveChanges');
        if (deleteWikiBtn) deleteWikiBtn.textContent = tr('deletePage');
        renderWidgets();
    });

    const navigateToPage = (pageId) => {
        window.location.hash = `wiki/${pageId}`;
    };

    const getPageById = (pageId) => allPages.find(page => page.id === pageId);

    const getRootPage = (pageId) => {
        let page = getPageById(pageId);
        const visited = new Set();
        while (page && page.parentId && !visited.has(page.id)) {
            visited.add(page.id);
            const parentPage = getPageById(page.parentId);
            if (!parentPage) break;
            page = parentPage;
        }
        return page || null;
    };

    const getInheritedProjectId = (page) => {
        if (!page) return '';
        if (page.projectId) return page.projectId;
        const rootPage = getRootPage(page.id);
        return rootPage && rootPage.projectId ? rootPage.projectId : '';
    };

    const getChildPages = (pageId) => allPages
        .filter(page => page.parentId === pageId)
        .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));

    const renderSubpages = (pageId) => {
        if (!wikiSubpagesSection || !wikiSubpagesList) return;
        if (!pageId) {
            wikiSubpagesSection.style.display = 'none';
            wikiSubpagesList.innerHTML = '';
            return;
        }

        const childPages = getChildPages(pageId);
        wikiSubpagesSection.style.display = 'flex';

        if (!childPages.length) {
            wikiSubpagesList.innerHTML = `
                <button class="wiki-subpage-card wiki-subpage-create-card" type="button" id="wiki-inline-create-subpage-btn">
                    <span class="wiki-subpage-icon">+</span>
                    <span class="wiki-subpage-text">
                        <strong>${tr('createFirstSubpage')}</strong>
                        <span>${tr('subpageEmptyHelp')}</span>
                    </span>
                </button>
            `;
            const inlineCreateBtn = document.getElementById('wiki-inline-create-subpage-btn');
            if (inlineCreateBtn) inlineCreateBtn.onclick = () => createNewPage(pageId);
            return;
        }

        wikiSubpagesList.innerHTML = '';
        childPages.forEach((page) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'wiki-subpage-card';
            item.innerHTML = `
                <span class="wiki-subpage-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                </span>
                <span class="wiki-subpage-text">
                    <strong>${escapeHtml(page.title || tr('untitledDocument'))}</strong>
                    <span>${page.updatedAt ? `${tr('updated')} ${new Date(page.updatedAt.toMillis()).toLocaleDateString()}` : tr('openSubpage')}</span>
                </span>
            `;
            item.onclick = () => navigateToPage(page.id);
            wikiSubpagesList.appendChild(item);
        });
    };

    const renderWidgets = () => {
        const currentPage = getCurrentPage();
        const childPages = currentPageId ? getChildPages(currentPageId) : [];
        const projectId = currentPage ? getInheritedProjectId(currentPage) : (wikiProjectSelect?.value || '');

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        setText('wiki-info-project', projectId ? getProjectName(projectId) : tr('noProject'));
        setText('wiki-info-updated', currentPage ? formatDate(currentPage.updatedAt) : '-');
        setText('wiki-info-subpages', String(childPages.length));
        if (updatedAtEl) updatedAtEl.textContent = currentPage ? `${tr('updated')} ${formatDate(currentPage.updatedAt)}` : tr('noRecentUpdate');

        const subpageList = document.getElementById('wiki-widget-subpages-list');
        if (subpageList) {
            subpageList.innerHTML = childPages.length ? '' : `<div class="wiki-widget-muted">${tr('noSubpagesYet')}</div>`;
            childPages.slice(0, 6).forEach(page => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'wiki-widget-item';
                button.innerHTML = `<strong>${escapeHtml(page.title || tr('untitledDocument'))}</strong><small>${formatDate(page.updatedAt)}</small>`;
                button.onclick = () => navigateToPage(page.id);
                subpageList.appendChild(button);
            });
        }

        const taskList = document.getElementById('wiki-widget-tasks-list');
        if (taskList) {
            const today = new Date().toISOString().slice(0, 10);
            const tasks = allTodos
                .filter(task => !task.completed && !task.archived && (task.dueDate === today || task.priority === 'high'))
                .slice(0, 5);
            taskList.innerHTML = tasks.length ? '' : `<div class="wiki-widget-muted">${tr('noTodayWikiTasks')}</div>`;
            tasks.forEach(task => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'wiki-widget-item';
                button.innerHTML = `<strong>${escapeHtml(task.text || tr('untitledTask'))}</strong><small>${task.dueDate || tr(task.priority || 'tasks')}</small>`;
                button.onclick = () => { window.location.hash = 'page-tasks'; };
                taskList.appendChild(button);
            });
        }

        const calendarList = document.getElementById('wiki-calendar-list');
        if (calendarList) {
            calendarList.innerHTML = calendarEvents.length ? '' : `<div class="wiki-widget-muted">${calendarAccessToken ? tr('noCalendarEvents') : tr('calendarNotConnected')}</div>`;
            calendarEvents.slice(0, 5).forEach(event => {
                const item = document.createElement('div');
                item.className = 'wiki-widget-item';
                const when = event.start?.dateTime || event.start?.date || '';
                item.innerHTML = `<strong>${escapeHtml(event.summary || tr('untitledEvent'))}</strong><small>${when ? formatDate(when) : ''}</small>`;
                calendarList.appendChild(item);
            });
        }

        const status = document.getElementById('wiki-calendar-status');
        if (status) status.textContent = calendarAccessToken ? tr('calendarConnected') : tr('calendarNotConnected');
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
            } else if (db && currentUser && id && !pendingPageFetches.has(id)) {
                pendingPageFetches.add(id);
                db.collection('wiki_pages').doc(id).get()
                    .then(doc => {
                        if (!doc.exists) return;
                        const loadedPage = { id: doc.id, ...doc.data() };
                        if (loadedPage.uid !== currentUser.uid) return;
                        upsertLoadedPage(loadedPage);
                        renderPageList();
                        openPage(loadedPage);
                    })
                    .catch(error => {
                        console.error('[Wiki] Direct page load failed:', error);
                        window.showToast(tr('loadFailed') + ': ' + (error.message || error), 'error');
                    })
                    .finally(() => pendingPageFetches.delete(id));
            }
        } else if (hash === '#page-wiki' || !hash) {
            const mostRecent = allPages[0];
            if (mostRecent && !currentPageId) {
                openPage(mostRecent);
            } else if (!mostRecent) {
                closeEditor();
            }
        }
    };

    window.addEventListener('hashchange', checkHash);

    const setWikiPanelState = (key, collapsed) => {
        if (!wikiLayout) return;
        const className = key === 'tree' ? 'wiki-tree-collapsed' : 'wiki-widgets-collapsed';
        wikiLayout.classList.toggle(className, collapsed);
        localStorage.setItem(`planary-wiki-${key}-collapsed`, collapsed ? 'true' : 'false');
        const button = key === 'tree' ? treeToggleBtn : widgetToggleBtn;
        if (button) {
            button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            button.title = collapsed ? tr(key === 'tree' ? 'expandPageTree' : 'expandWidgets') : tr(key === 'tree' ? 'collapsePageTree' : 'collapseWidgets');
        }
    };

    const restoreWikiPanelState = () => {
        setWikiPanelState('tree', localStorage.getItem('planary-wiki-tree-collapsed') === 'true');
        setWikiPanelState('widgets', localStorage.getItem('planary-wiki-widgets-collapsed') === 'true' || window.matchMedia('(max-width: 1120px)').matches);
    };

    const openPage = (page) => {
        if (currentPageId === page.id) return;
        cleanupPendingWikiUploads();
        currentPageId = page.id;

        // Notion-like: Hide list on small screens, show editor as full page
        pageWiki.classList.add('editor-active');

        wikiEmptyView.style.display = 'none';
        wikiEditorView.style.display = 'flex';
        wikiEditorView.classList.add('fade-in');

        wikiTitleInput.value = page.title || '';
        if (parentBtn) {
            const parentPage = page.parentId ? getPageById(page.parentId) : null;
            parentBtn.hidden = !parentPage;
            parentBtn.title = parentPage ? `${tr('parentPage')}: ${parentPage.title || tr('untitledDocument')}` : tr('parentPage');
            parentBtn.onclick = () => {
                if (parentPage) navigateToPage(parentPage.id);
            };
        }
        currentPageMeta = {
            icon: page.icon || '📄',
            coverUrl: page.coverUrl || '',
            coverPosition: toBoundedNumber(page.coverPosition, 50, 0, 100),
            coverPositionX: toBoundedNumber(page.coverPositionX, 50, 0, 100),
            coverHeight: toBoundedNumber(page.coverHeight, 180, 120, 360),
            coverZoom: toBoundedNumber(page.coverZoom, 100, 100, 220),
            coverCropMode: page.coverCropMode || 'cover'
        };
        if (pageIconBtn) pageIconBtn.textContent = currentPageMeta.icon;
        applyCover(currentPageMeta.coverUrl, currentPageMeta.coverPosition, currentPageMeta.coverHeight, currentPageMeta.coverPositionX, currentPageMeta.coverZoom);
        if (wikiProjectSelect) {
            wikiProjectSelect.value = getInheritedProjectId(page);
        }

        if (saveWikiBtn) saveWikiBtn.disabled = true;
        if (saveStateEl) saveStateEl.textContent = tr('saved');
        initEditor(page.content);
        resetMetaUndoHistory();
        renderSubpages(page.id);
        renderWidgets();
        setTimeout(() => { if (saveWikiBtn) saveWikiBtn.disabled = false; }, 500);

        renderPageList();
    };

    const closeEditor = () => {
        cleanupPendingWikiUploads();
        currentPageId = null;
        if (parentBtn) {
            parentBtn.hidden = true;
            parentBtn.onclick = null;
            parentBtn.title = tr('parentPage');
        }
        pageWiki.classList.remove('editor-active');
        wikiEditorView.style.display = 'none';
        wikiEmptyView.style.display = 'flex';
        if (wikiProjectSelect) wikiProjectSelect.value = '';
        currentPageMeta = { icon: '📄', coverUrl: '', coverPosition: 50, coverPositionX: 50, coverHeight: 180, coverZoom: 100, coverCropMode: 'cover' };
        if (pageIconBtn) pageIconBtn.textContent = currentPageMeta.icon;
        applyCover('', 50, 180, 50, 100);
        renderSubpages(null);
        renderWidgets();
        renderPageList();
    };

    const createNewPage = (parentId = null) => {
        if (!currentUser) return window.showToast(tr('loginFirst'), 'error');
        const parentPage = parentId ? getPageById(parentId) : null;
        const rootPage = parentId ? getRootPage(parentId) : null;
        const inheritedProjectId = parentPage
            ? (rootPage?.projectId || parentPage.projectId || null)
            : (wikiProjectSelect?.value || null);

        const newDoc = {
            uid: currentUser.uid,
            title: tr('untitledDocument'),
            parentId: parentId || null,
            projectId: inheritedProjectId,
            icon: '📄',
            coverUrl: '',
            coverPosition: 50,
            coverPositionX: 50,
            coverHeight: 180,
            coverZoom: 100,
            coverCropMode: 'cover',
            content: { time: Date.now(), blocks: [], version: '2.28.2' },
            ogTried: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('wiki_pages').add(newDoc).then(docRef => {
            window.PlanaryGuide?.markComplete?.('wiki');
            navigateToPage(docRef.id);
        }).catch(err => {
            console.error("Creation error:", err);
            window.showToast(tr('failedCreatePage') + ': ' + err.message, "error");
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

    if (wikiCreateSubpageBtn) {
        wikiCreateSubpageBtn.onclick = () => {
            if (!currentPageId) return;
            createNewPage(currentPageId);
        };
    }

    if (widgetNewSubpageBtn) {
        widgetNewSubpageBtn.onclick = () => {
            if (!currentPageId) return window.showToast(tr('openPageFirst'), 'error');
            createNewPage(currentPageId);
        };
    }

    if (treeToggleBtn) {
        treeToggleBtn.onclick = () => setWikiPanelState('tree', !wikiLayout.classList.contains('wiki-tree-collapsed'));
    }

    if (widgetToggleBtn) {
        widgetToggleBtn.onclick = () => setWikiPanelState('widgets', !wikiLayout.classList.contains('wiki-widgets-collapsed'));
    }

    if (widgetCloseBtn) {
        widgetCloseBtn.onclick = () => setWikiPanelState('widgets', true);
    }

    if (wikiTitleInput) {
        wikiTitleInput.addEventListener('focus', pushMetaUndoSnapshot);
        wikiTitleInput.addEventListener('input', () => {
            pushMetaUndoSnapshot();
            markDirty();
        });
    }

    if (pageIconBtn) {
        pageIconBtn.onclick = () => {
            if (!currentPageId) return window.showToast(tr('openPageFirst'), 'error');
            const value = prompt(tr('pageIconPrompt'), currentPageMeta.icon || '📄');
            if (value == null) return;
            pushMetaUndoSnapshot();
            applyPageMeta({ ...getMetaSnapshot(), icon: value.trim().slice(0, 4) || '📄' });
            pushMetaUndoSnapshot();
        };
    }

    const uploadCoverFile = (file) => {
        if (!file || !currentUser || !storage) return Promise.reject(new Error(tr('loginFirstOrStorage')));
        const filePath = `wiki/${currentUser.uid}/covers/${Date.now()}_${file.name}`;
        return storage.ref().child(filePath).put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(url => {
            uploadedWikiStorageUrls.add(url);
            return url;
        });
    };

    const chooseCoverImage = () => {
        if (!currentPageId) return window.showToast(tr('openPageFirst'), 'error');
        const choice = prompt(tr('coverImagePrompt'), currentPageMeta.coverUrl || '');
        if (choice == null) return;
        const trimmed = choice.trim();
        if (trimmed) {
            pushMetaUndoSnapshot();
            applyPageMeta({ ...getMetaSnapshot(), coverUrl: trimmed });
            pushMetaUndoSnapshot();
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = () => {
            const file = input.files && input.files[0];
            if (!file) return;
            uploadCoverFile(file)
                .then(url => {
                    pushMetaUndoSnapshot();
                    applyPageMeta({ ...getMetaSnapshot(), coverUrl: url });
                    pushMetaUndoSnapshot();
                })
                .catch(error => window.showToast(tr('uploadFailed') + ': ' + (error.message || error), 'error'));
        };
        input.click();
    };

    if (coverBtn) coverBtn.onclick = chooseCoverImage;

    if (coverAdjustBtn && coverPanel) {
        coverAdjustBtn.onclick = () => {
            if (!currentPageId) return window.showToast(tr('openPageFirst'), 'error');
            coverPanel.hidden = !coverPanel.hidden;
        };
    }

    const updateCoverAdjustments = () => {
        const nextMeta = {
            ...getMetaSnapshot(),
            coverPosition: toBoundedNumber(coverPositionRange?.value, 50, 0, 100),
            coverPositionX: toBoundedNumber(coverPositionXRange?.value, 50, 0, 100),
            coverHeight: toBoundedNumber(coverHeightRange?.value, 180, 120, 360),
            coverZoom: toBoundedNumber(coverZoomRange?.value, 100, 100, 220),
            coverCropMode: 'cover'
        };
        applyPageMeta(nextMeta);
    };

    [coverPositionRange, coverPositionXRange, coverHeightRange, coverZoomRange].filter(Boolean).forEach(range => {
        range.addEventListener('pointerdown', pushMetaUndoSnapshot);
        range.addEventListener('input', updateCoverAdjustments);
        range.addEventListener('change', pushMetaUndoSnapshot);
    });

    if (coverResetBtn) {
        coverResetBtn.onclick = () => {
            pushMetaUndoSnapshot();
            applyPageMeta({ ...getMetaSnapshot(), coverPosition: 50, coverPositionX: 50, coverHeight: 180, coverZoom: 100, coverCropMode: 'cover' });
            pushMetaUndoSnapshot();
        };
    }

    const requestCalendarToken = async () => {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error(tr('loginFirst'));
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/calendar.events');
        const result = await user.reauthenticateWithPopup(provider);
        const credential = firebase.auth.GoogleAuthProvider.credentialFromResult(result);
        if (!credential || !credential.accessToken) throw new Error(tr('calendarTokenMissing'));
        calendarAccessToken = credential.accessToken;
        return calendarAccessToken;
    };

    const loadCalendarEvents = async () => {
        if (!calendarAccessToken) return;
        const now = new Date();
        const week = new Date(now);
        week.setDate(now.getDate() + 7);
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(week.toISOString())}`;
        const response = await fetch(url, { headers: { Authorization: `Bearer ${calendarAccessToken}` } });
        if (!response.ok) throw new Error(`Google Calendar ${response.status}`);
        const data = await response.json();
        calendarEvents = data.items || [];
        renderWidgets();
    };

    if (calendarConnectBtn) {
        calendarConnectBtn.onclick = async () => {
            try {
                await requestCalendarToken();
                await loadCalendarEvents();
                window.showToast(tr('calendarConnected'), 'success');
            } catch (error) {
                console.error('[Wiki] Calendar connect failed:', error);
                window.showToast(tr('calendarConnectFailed') + ': ' + (error.message || error), 'error');
            }
        };
    }

    if (calendarCreateBtn) {
        calendarCreateBtn.onclick = async () => {
            try {
                if (!calendarAccessToken) await requestCalendarToken();
                const title = wikiTitleInput?.value?.trim() || tr('untitledDocument');
                const start = new Date();
                start.setHours(start.getHours() + 1, 0, 0, 0);
                const end = new Date(start);
                end.setHours(start.getHours() + 1);
                const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${calendarAccessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        summary: title,
                        description: window.location.href,
                        start: { dateTime: start.toISOString() },
                        end: { dateTime: end.toISOString() }
                    })
                });
                if (!response.ok) throw new Error(`Google Calendar ${response.status}`);
                await loadCalendarEvents();
                window.showToast(tr('calendarEventCreated'), 'success');
            } catch (error) {
                console.error('[Wiki] Calendar event creation failed:', error);
                window.showToast(tr('calendarEventCreateFailed') + ': ' + (error.message || error), 'error');
            }
        };
    }

    // --- SAVE FUNCTION ---
    const savePage = async () => {
        if (!editor || !currentPageId || !currentUser) {
            console.warn('[Wiki] Save aborted: editor or pageId missing', { editor: !!editor, currentPageId, currentUser: !!currentUser });
            window.showToast(tr('cannotSaveNotReady'), 'error');
            return;
        }
        const title = wikiTitleInput ? wikiTitleInput.value.trim() || tr('untitledDocument') : tr('untitledDocument');
        const projectId = wikiProjectSelect && wikiProjectSelect.value ? wikiProjectSelect.value : null;

        if (saveWikiBtn) { saveWikiBtn.textContent = tr('saving'); saveWikiBtn.disabled = true; }

        try {
            const previousPage = getCurrentPage();
            const previousUrls = getWikiPageStorageUrls(previousPage);
            const contentData = normalizeEditorData(await editor.save());
            const nextPage = {
                ...(previousPage || {}),
                id: currentPageId,
                coverUrl: currentPageMeta.coverUrl || '',
                content: contentData
            };
            await db.collection('wiki_pages').doc(currentPageId).update({
                title: title,
                projectId,
                icon: currentPageMeta.icon || '📄',
                coverUrl: currentPageMeta.coverUrl || '',
                coverPosition: toBoundedNumber(currentPageMeta.coverPosition, 50, 0, 100),
                coverPositionX: toBoundedNumber(currentPageMeta.coverPositionX, 50, 0, 100),
                coverHeight: toBoundedNumber(currentPageMeta.coverHeight, 180, 120, 360),
                coverZoom: toBoundedNumber(currentPageMeta.coverZoom, 100, 100, 220),
                coverCropMode: currentPageMeta.coverCropMode || 'cover',
                content: contentData,
                ogTried: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            const linkedUrls = getLinkedWikiStorageUrls(nextPage);
            await deleteUnlinkedWikiStorageUrls(new Set([...previousUrls, ...uploadedWikiStorageUrls]), linkedUrls);
            uploadedWikiStorageUrls = new Set([...uploadedWikiStorageUrls].filter(url => linkedUrls.has(url)));
            resetUndoHistory(contentData);
            resetMetaUndoHistory();
            if (saveStateEl) saveStateEl.textContent = tr('saved');
            window.showToast(tr('pageSaved'), 'success');
        } catch (err) {
            console.error('[Wiki] Save error:', err);
            // Show actual error message for diagnosis
            window.showToast(tr('saveFailed') + ': ' + (err.message || err), 'error');
        } finally {
            if (saveWikiBtn) { saveWikiBtn.textContent = tr('saveChanges'); saveWikiBtn.disabled = false; }
        }
    };

    if (saveWikiBtn) saveWikiBtn.onclick = savePage;

    if (wikiProjectSelect) {
        wikiProjectSelect.addEventListener('focus', pushMetaUndoSnapshot);
        wikiProjectSelect.onchange = () => {
            pushMetaUndoSnapshot();
            markDirty();
            renderWidgets();
        };
    }

    // Ctrl+S keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentPageId) savePage();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
            const holder = document.getElementById('editorjs');
            if (wikiTitleInput && wikiTitleInput === document.activeElement) {
                e.preventDefault();
                undoMetaChange();
            } else if (wikiProjectSelect && wikiProjectSelect === document.activeElement) {
                e.preventDefault();
                undoMetaChange();
            } else if (holder && holder.contains(document.activeElement)) {
                e.preventDefault();
                undoEditorChange();
            } else if (currentPageId && undoMetaChange()) {
                e.preventDefault();
            }
        }
    });

    if (deleteWikiBtn) {
        deleteWikiBtn.onclick = async () => {
            if (!currentPageId) return;
            const descendantIds = getDescendantPageIds(currentPageId);
            const confirmMessage = descendantIds.length
                ? fmt('deletePageWithSubpagesConfirm', { count: descendantIds.length })
                : tr('deletePageConfirm');
            if (!confirm(confirmMessage)) return;

            const batch = db.batch();
            const deletingIds = [currentPageId, ...descendantIds];
            const deletingIdSet = new Set(deletingIds);
            const deletingUrls = new Set();
            deletingIds.forEach(pageId => {
                getWikiPageStorageUrls(getPageById(pageId)).forEach(url => deletingUrls.add(url));
                batch.delete(db.collection('wiki_pages').doc(pageId));
            });

            batch.commit().then(async () => {
                await deleteUnlinkedWikiStorageUrls(deletingUrls, getLinkedWikiStorageUrls(null, deletingIdSet));
                goBackToList();
                window.showToast(tr('pageDeleted'));
            }).catch(err => {
                console.error("Delete error:", err);
                window.showToast(tr('failedDeletePage') + ': ' + err.message, "error");
            });
        };
    }

    restoreWikiPanelState();
    renderWidgets();
});
