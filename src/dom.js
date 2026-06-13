// Pure DOM / formatting helpers extracted from app.js.
// These touch only the document and built-ins — no app state, no other app
// functions — so they're safe to import from anywhere (app.js, wiki.js).

export const getEl = (id) => document.getElementById(id);

export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = Object.assign(document.createElement('div'), { id: 'toast-container' });
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('role', 'status');
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 300); }, 3000);
}
// The global error/SW handlers and legacy callers reach this via window.
window.showToast = showToast;

export const escapeHtml = (value) => String(value || '')
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

export function appIconSvg(name, size = 20, extraAttrs = '') {
    const paths = APP_ICON_PATHS[name] || APP_ICON_PATHS.tasks;
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extraAttrs}>${paths}</svg>`;
}

export function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

export function setHtml(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = value;
}

export function setAllText(selector, value) {
    document.querySelectorAll(selector).forEach(el => { el.textContent = value; });
}

export function setAllTitle(selector, value, includeAria = true) {
    document.querySelectorAll(selector).forEach(el => {
        el.title = value;
        if (includeAria) el.setAttribute('aria-label', value);
    });
}

export function setPlaceholder(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.placeholder = value;
}

export function setTitle(selector, value) {
    const el = document.querySelector(selector);
    if (el) {
        el.title = value;
        el.setAttribute('aria-label', value);
    }
}

export function setOptionText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
}

export function setButtonTextPreserveIcon(selector, value) {
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

export function setAllButtonTextPreserveIcon(selector, value) {
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
