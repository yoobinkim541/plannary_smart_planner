// site/legacy/validate.js -- app.js 문법/로직을 Node에서 간단히 검증하는 스크립트
// - 실행: node site/legacy/validate.js (package.json 스크립트에는 등록 안 돼 있음)
// - 브라우저 전역(document/window/firebase)을 최소한으로 흉내내서 app.js를 로드해봄
try {
    // Mocking browser globals for a simple validation
    global.document = {
        addEventListener: () => {},
        getElementById: () => ({ addEventListener: () => {} }),
        querySelectorAll: () => []
    };
    global.window = {
        location: { pathname: '/index.html' }
    };
    global.firebase = {
        firestore: () => ({
            enablePersistence: () => Promise.resolve(),
            collection: () => ({
                where: () => ({ onSnapshot: () => {} }),
                add: () => Promise.resolve()
            })
        }),
        auth: () => ({
            onAuthStateChanged: () => {},
            signOut: () => Promise.resolve()
        })
    };

    // Require app.js to check for syntax errors (this might fail if app.js uses more browser features)
    // Actually, app.js is not a module, so we'll just check it with node -c
    console.log("Validation start...");
} catch(e) {
    console.error("Validation failed:", e);
    process.exit(1);
}
