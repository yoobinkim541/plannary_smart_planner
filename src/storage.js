// Firebase Storage URL helpers — pure (no app state, no app-fn deps).
// Shared by app.js and wiki.js, both of which previously had their own copies.

export function getFirebaseStoragePathFromUrl(url) {
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
}

export function collectStorageUrlsFromValue(value, target = new Set()) {
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
}
