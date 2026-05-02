(function () {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK is not loaded.');
        return;
    }

    if (firebase.apps && firebase.apps.length > 0) return;

    const defaultAuthDomain = 'practice-todo-list-32af6.firebaseapp.com';

    firebase.initializeApp({
        apiKey: 'AIzaSyD7rnA85vWTcyL-XF0OxacY83u9iQL7PTE',
        appId: '1:297469029810:web:1d8d1fbd5d20b2346248ab',
        authDomain: defaultAuthDomain,
        databaseURL: '',
        measurementId: 'G-8WP9B9H3FX',
        messagingSenderId: '297469029810',
        projectId: 'practice-todo-list-32af6',
        storageBucket: 'practice-todo-list-32af6.firebasestorage.app'
    });
})();
