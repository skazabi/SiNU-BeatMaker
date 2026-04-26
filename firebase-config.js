/**
 * SiNU-BeatMaker - Firebase Yapılandırma Dosyası
 * Firebase Compat SDK (CDN) ile çalışır.
 * HTML dosyalarında firebase-app-compat.js ve firebase-firestore-compat.js
 * bu dosyadan ÖNCE yüklenmelidir.
 */

const firebaseConfig = {
    apiKey: "AIzaSyDE7KCkghcZklAT82jF8M3oqZO7PFuRyNs",
    authDomain: "sinu-beatmaker-baaed.firebaseapp.com",
    projectId: "sinu-beatmaker-baaed",
    storageBucket: "sinu-beatmaker-baaed.firebasestorage.app",
    messagingSenderId: "617702393922",
    appId: "1:617702393922:web:2d0b8ae503598cc3e6c5db",
    measurementId: "G-QY0PXQLVK4"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firestore veritabanı referansı (tüm dosyalar tarafından kullanılır)
const firestore = firebase.firestore();

console.log('🔥 Firebase bağlantısı kuruldu.');
