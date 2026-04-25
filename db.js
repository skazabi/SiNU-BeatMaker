/**
 * SiNU-BeatMaker - Veritabanı Katmanı (Firebase Firestore)
 * 
 * Tüm veri işlemleri bu dosyadaki async fonksiyonlar üzerinden yapılır.
 * Oturum (session) ve tema bilgileri hâlâ tarayıcıda tutulur.
 */

// ==========================================
// KULLANICI İŞLEMLERİ (Firestore: users)
// ==========================================

async function getUser(username) {
    const doc = await firestore.collection('users').doc(username).get();
    return doc.exists ? doc.data() : null;
}

async function getUserByEmail(email) {
    const snapshot = await firestore.collection('users').where('email', '==', email).get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
}

async function getAllUsers() {
    const snapshot = await firestore.collection('users').get();
    return snapshot.docs.map(doc => doc.data());
}

async function saveUser(user) {
    await firestore.collection('users').doc(user.username).set(user);
}

async function deleteUserFromDB(username) {
    // Kullanıcıyı sil
    await firestore.collection('users').doc(username).delete();
    // Kullanıcının beat'lerini de sil
    const beatsSnapshot = await firestore.collection('beats').where('username', '==', username).get();
    const batch = firestore.batch();
    beatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}

// ==========================================
// BEAT İŞLEMLERİ (Firestore: beats)
// ==========================================

async function saveBeat(beat) {
    await firestore.collection('beats').doc(beat.id).set(beat);
}

async function getBeat(beatId) {
    const doc = await firestore.collection('beats').doc(beatId).get();
    return doc.exists ? doc.data() : null;
}

async function getUserBeats(username) {
    const snapshot = await firestore.collection('beats').where('username', '==', username).get();
    return snapshot.docs.map(doc => doc.data());
}

async function getAllBeats() {
    const snapshot = await firestore.collection('beats').get();
    return snapshot.docs.map(doc => doc.data());
}

async function deleteBeatFromDB(beatId) {
    await firestore.collection('beats').doc(beatId).delete();
}

// ==========================================
// ÖZEL SES İŞLEMLERİ (Firestore: customSounds)
// ==========================================

async function getCustomSounds() {
    const snapshot = await firestore.collection('customSounds').get();
    return snapshot.docs.map(doc => doc.data());
}

async function saveCustomSound(sound) {
    await firestore.collection('customSounds').doc(sound.id).set(sound);
}

async function deleteCustomSoundFromDB(soundId) {
    await firestore.collection('customSounds').doc(soundId).delete();
}

// ==========================================
// OTURUM YÖNETİMİ (SessionStorage - cihaza özgü)
// ==========================================

function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

function logoutUser() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Koruma: Giriş yapmamış kullanıcıları yönlendir
function checkAuth(requireAdmin = false) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    if (requireAdmin && user.role !== 'admin') {
        window.location.href = 'beatmaker.html';
    }
}

// ==========================================
// TEMA YÖNETİMİ (LocalStorage - cihaza özgü)
// ==========================================

function applySavedTheme() {
    const savedTheme = localStorage.getItem('site_theme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('site_theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('site_theme', 'light');
    }
}

// Tema'yı sayfa yüklendiğinde uygula
applySavedTheme();

// ==========================================
// ADMIN HESABI BAŞLATMA
// ==========================================

// Admin yoksa oluştur (SHA-256 of "admin")
async function initializeAdmin() {
    try {
        const admin = await getUser('admin');
        if (!admin) {
            await saveUser({
                username: 'admin',
                nickname: 'Sistem Yöneticisi',
                passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
                role: 'admin'
            });
            console.log('✅ Admin hesabı oluşturuldu.');
        }
    } catch (err) {
        console.error('Admin başlatma hatası:', err);
    }
}

// Sayfa yüklendiğinde admin kontrolü yap
initializeAdmin();

// ==========================================
// ŞİFRE DOĞRULAMA
// ==========================================

function validatePassword(password) {
    if (password.length < 8) {
        return 'Şifre en az 8 karakter olmalıdır!';
    }
    if (!/[A-Z]/.test(password)) {
        return 'Şifre en az bir büyük harf içermelidir! (A-Z)';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
        return 'Şifre en az bir özel karakter içermelidir! (!@#$%^&* vb.)';
    }
    return null; // Geçerli şifre
}
