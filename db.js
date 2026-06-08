/**
 * SiNU-BeatMaker - Veritabanı API Katmanı (FastAPI + MongoDB Atlas)
 * 
 * Tüm veri işlemleri bu dosyadaki REST API çağrıları üzerinden yapılır.
 * Firebase Firestore bağımlılığı kaldırılmıştır.
 */

const API_URL = 'http://localhost:8000/api';

// ==========================================
// HTTP İSTEK YARDIMCILARI (JWT Bearer Token)
// ==========================================

function getHeaders(contentType = 'application/json') {
    const headers = {};
    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    const token = localStorage.getItem('jwt_token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// ==========================================
// KULLANICI İŞLEMLERİ
// ==========================================

async function getUser(username) {
    try {
        const response = await fetch(`${API_URL}/users/${username}`, {
            headers: getHeaders()
        });
        if (!response.ok) return null;
        const data = await response.json();
        // Frontend'in uyumluluğu için veri alanlarını eşle
        return {
            username: data.username,
            nickname: data.nickname,
            email: data.email,
            role: data.role,
            avatarURL: data.avatar_url,
            created_at: data.created_at
        };
    } catch (err) {
        console.error('getUser hatası:', err);
        return null;
    }
}

async function getUserByEmail(email) {
    try {
        const response = await fetch(`${API_URL}/auth/check-email?email=${encodeURIComponent(email)}`, {
            headers: getHeaders()
        });
        if (!response.ok) return null;
        const data = await response.json();
        // Eğer e-posta müsait DEĞİLSE (available: false), sistemde var demektir
        if (!data.available) {
            return {
                username: data.username,
                email: email
            };
        }
        return null;
    } catch (err) {
        console.error('getUserByEmail hatası:', err);
        return null;
    }
}

async function getAllUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            headers: getHeaders()
        });
        if (!response.ok) return [];
        const users = await response.json();
        return users.map(user => ({
            username: user.username,
            nickname: user.nickname,
            email: user.email,
            role: user.role,
            avatarURL: user.avatar_url
        }));
    } catch (err) {
        console.error('getAllUsers hatası:', err);
        return [];
    }
}

async function saveUser(user) {
    try {
        const headers = getHeaders();
        
        // Eğer password alanı varsa bu yeni bir KAYIT (register) işlemidir
        if (user.password) {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    nickname: user.nickname || user.username,
                    email: user.email,
                    password: user.password
                })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Kayıt işlemi başarısız.');
            }
            return await response.json();
        } else {
            // Profil güncelleme (PUT /api/users/{username})
            const response = await fetch(`${API_URL}/users/${user.username}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify({
                    nickname: user.nickname,
                    avatar_url: user.avatarURL || user.avatar_url || null
                })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Profil güncelleme başarısız.');
            }
            return await response.json();
        }
    } catch (err) {
        console.error('saveUser hatası:', err);
        throw err;
    }
}

async function deleteUserFromDB(username) {
    try {
        const response = await fetch(`${API_URL}/users/${username}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Kullanıcı silinemedi.');
        }
        return true;
    } catch (err) {
        console.error('deleteUserFromDB hatası:', err);
        throw err;
    }
}

// REST Giriş (API Login) Metodu (Yeni Eklendi)
async function loginUserAPI(username, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Giriş başarısız.');
    }
    const data = await response.json();
    // JWT Token'ı kaydet
    localStorage.setItem('jwt_token', data.access_token);
    return data;
}

// REST Şifre Sıfırlama Metodu (Yeni Eklendi)
async function resetPasswordAPI(email, newPassword) {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPassword })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Şifre sıfırlama başarısız.');
    }
    return await response.json();
}

// REST Şifre Değiştirme Metodu (Yeni Eklendi)
async function changePasswordAPI(username, currentPassword, newPassword) {
    const response = await fetch(`${API_URL}/users/${username}/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
        })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Şifre değiştirme başarısız.');
    }
    return await response.json();
}

// ==========================================
// BEAT İŞLEMLERİ
// ==========================================

async function saveBeat(beat) {
    try {
        const response = await fetch(`${API_URL}/beats`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                beat_id: beat.id || beat.beat_id || null,
                name: beat.name,
                bpm: parseInt(beat.bpm),
                data: beat.data.map(track => ({
                    instrument: track.instrument,
                    activeSteps: track.activeSteps
                }))
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Beat kaydedilemedi.');
        }
        const savedBeat = await response.json();
        return {
            id: savedBeat.beat_id,
            beat_id: savedBeat.beat_id,
            username: savedBeat.username,
            name: savedBeat.name,
            bpm: savedBeat.bpm,
            data: savedBeat.data,
            created_at: savedBeat.created_at
        };
    } catch (err) {
        console.error('saveBeat hatası:', err);
        throw err;
    }
}

async function getBeat(beatId) {
    try {
        const response = await fetch(`${API_URL}/beats/${beatId}`, {
            headers: getHeaders()
        });
        if (!response.ok) return null;
        const beat = await response.json();
        return {
            id: beat.beat_id,
            username: beat.username,
            name: beat.name,
            bpm: beat.bpm,
            data: beat.data
        };
    } catch (err) {
        console.error('getBeat hatası:', err);
        return null;
    }
}

async function getUserBeats(username) {
    try {
        const response = await fetch(`${API_URL}/beats/user/${username}`, {
            headers: getHeaders()
        });
        if (!response.ok) return [];
        const beats = await response.json();
        return beats.map(beat => ({
            id: beat.beat_id,
            username: beat.username,
            name: beat.name,
            bpm: beat.bpm,
            data: beat.data
        }));
    } catch (err) {
        console.error('getUserBeats hatası:', err);
        return [];
    }
}

async function getAllBeats() {
    try {
        const response = await fetch(`${API_URL}/beats`, {
            headers: getHeaders()
        });
        if (!response.ok) return [];
        const beats = await response.json();
        return beats.map(beat => ({
            id: beat.beat_id,
            username: beat.username,
            name: beat.name,
            bpm: beat.bpm,
            data: beat.data
        }));
    } catch (err) {
        console.error('getAllBeats hatası:', err);
        return [];
    }
}

async function deleteBeatFromDB(beatId) {
    try {
        const response = await fetch(`${API_URL}/beats/${beatId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Beat silinemedi.');
        }
        return true;
    } catch (err) {
        console.error('deleteBeatFromDB hatası:', err);
        throw err;
    }
}

// ==========================================
// ÖZEL SES İŞLEMLERİ (Admin)
// ==========================================

async function getCustomSounds() {
    try {
        const response = await fetch(`${API_URL}/sounds`, {
            headers: getHeaders()
        });
        if (!response.ok) return [];
        const sounds = await response.json();
        return sounds.map(sound => ({
            id: sound.sound_id,
            sound_id: sound.sound_id,
            name: sound.name,
            type: sound.type,
            dataURL: sound.data_url,
            added_by: sound.added_by
        }));
    } catch (err) {
        console.error('getCustomSounds hatası:', err);
        return [];
    }
}

async function saveCustomSound(sound) {
    try {
        const response = await fetch(`${API_URL}/sounds`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                sound_id: sound.id || sound.sound_id || null,
                name: sound.name,
                type: sound.type || 'file',
                data_url: sound.dataURL || sound.data_url
            })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Özel ses kaydedilemedi.');
        }
        const savedSound = await response.json();
        return {
            id: savedSound.sound_id,
            name: savedSound.name,
            type: savedSound.type,
            dataURL: savedSound.data_url
        };
    } catch (err) {
        console.error('saveCustomSound hatası:', err);
        throw err;
    }
}

async function deleteCustomSoundFromDB(soundId) {
    try {
        const response = await fetch(`${API_URL}/sounds/${soundId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Özel ses silinemedi.');
        }
        return true;
    } catch (err) {
        console.error('deleteCustomSoundFromDB hatası:', err);
        throw err;
    }
}

// ==========================================
// ASENKRON MÜZİK ÜRETİMİ (RabbitMQ - MusicGen)
// ==========================================

async function generateMusicAPI(prompt, duration = 10) {
    const response = await fetch(`${API_URL}/music/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ prompt, duration })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Müzik üretimi başlatılamadı.');
    }
    return await response.json(); // { message, task_id }
}

async function getTaskStatusAPI(taskId) {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        headers: getHeaders()
    });
    if (!response.ok) return null;
    return await response.json(); // { task_id, type, status, error }
}

async function getTaskResultAPI(taskId) {
    const response = await fetch(`${API_URL}/tasks/${taskId}/result`, {
        headers: getHeaders()
    });
    if (!response.ok) return null;
    return await response.json(); // complete olunca sonuc
}

// ==========================================
// OTURUM YÖNETİMİ (SessionStorage + Local Token)
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
    localStorage.removeItem('jwt_token');
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
// HATA DENETİMİ / ALTYAPI KONTROL
// ==========================================

// Firebase admin başlatma tamamen kaldırıldı, backend lifespande ilk admin oluşturulmaktadır.
async function initializeAdmin() {
    console.log('🔌 FastAPI backend veritabanı aktif edildi.');
}
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
