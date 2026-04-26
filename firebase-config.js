/**
 * SiNU-BeatMaker - Firebase Yapılandırma Dosyası
 * Firebase Compat SDK (CDN) ile çalışır.
 * HTML dosyalarında firebase-app-compat.js ve firebase-firestore-compat.js
 * bu dosyadan ÖNCE yüklenmelidir.
 */

const firebaseConfig = {
    apiKey: "AIzaSyDkamqNmWHhUwuXTWLpzWRhWOeBOuJrCtI",
    authDomain: "sinu-beatmaker-979cc.firebaseapp.com",
    projectId: "sinu-beatmaker-979cc",
    storageBucket: "sinu-beatmaker-979cc.firebasestorage.app",
    messagingSenderId: "262091721394",
    appId: "1:262091721394:web:476a1078df73e057b357ab",
    measurementId: "G-R8PZNW7DJR"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firestore veritabanı referansı (tüm dosyalar tarafından kullanılır)
const firestore = firebase.firestore();

console.log('🔥 Firebase bağlantısı kuruldu.');
