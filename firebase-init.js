(function () {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK is not loaded.');
        return;
    }

    if (firebase.apps && firebase.apps.length > 0) return;

    const defaultAuthDomain = 'planary-a2f6b.firebaseapp.com';

    firebase.initializeApp({
        apiKey: 'AIzaSyB1cHLdbvkLUDUKJSipDg3NQOsL38CUlBA',
        appId: '1:909174132550:web:03fd3a4ec514d6ad8a5f47',
        authDomain: defaultAuthDomain,
        databaseURL: '',
        measurementId: 'G-TEPGF6Z7C9',
        messagingSenderId: '909174132550',
        projectId: 'planary-a2f6b',
        storageBucket: 'planary-a2f6b.firebasestorage.app'
    });
})();
