/**
 * SiNU-BeatMaker - Firebase Yapılandırma Dosyası
 * Firebase Compat SDK (CDN) ile çalışır.
 * HTML dosyalarında firebase-app-compat.js ve firebase-firestore-compat.js
 * bu dosyadan ÖNCE yüklenmelidir.
 */

const firebaseConfig = {
    apiKey: "AIzaSyCakDDuBRJX0W9b7quT4trkgwX1-GZ-Jkg",
    authDomain: "sinu-beatmaker.firebaseapp.com",
    projectId: "sinu-beatmaker",
    storageBucket: "sinu-beatmaker.firebasestorage.app",
    messagingSenderId: "815607697602",
    appId: "1:815607697602:web:a5fac2bd5fd5e0a1baeb5b",
    measurementId: "G-351DCM3WWZ"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firestore veritabanı referansı (tüm dosyalar tarafından kullanılır)
const firestore = firebase.firestore();

console.log('🔥 Firebase bağlantısı kuruldu.');
