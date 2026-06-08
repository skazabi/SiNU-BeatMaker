/**
 * SiNU-BeatMaker - Kimlik Doğrulama Katmanı (FastAPI)
 * Giriş, Kayıt, Şifre Sıfırlama işlemleri
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    
    // ==========================================
    // GİRİŞ YAP
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const pass = document.getElementById('loginPassword').value;
            
            try {
                // Sunucu tarafında doğrulamalı modern JWT Giriş
                const data = await loginUserAPI(username, pass);
                
                // Session bilgisini yerel depolama ile güncelle
                setCurrentUser({ 
                    username: data.username, 
                    nickname: data.username, 
                    role: data.role 
                });
                
                if (data.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'beatmaker.html';
                }
            } catch (err) {
                console.error('Giriş hatası:', err);
                document.getElementById('loginError').textContent = err.message || 'Hatalı kullanıcı adı veya şifre!';
                document.getElementById('loginError').style.display = 'block';
            }
        });
    }

    // ==========================================
    // KAYIT OL (Doğrudan)
    // ==========================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value.trim();
            const username = document.getElementById('regUsername').value.trim();
            const pass = document.getElementById('regPassword').value;
            const passConfirm = document.getElementById('regPasswordConfirm').value;
            
            // Şifre eşleşme kontrolü
            if (pass !== passConfirm) {
                document.getElementById('regError').textContent = 'Şifreler eşleşmiyor!';
                document.getElementById('regError').style.display = 'block';
                return;
            }
            
            // Şifre güvenlik kuralları kontrolü
            const passwordError = validatePassword(pass);
            if (passwordError) {
                document.getElementById('regError').textContent = passwordError;
                document.getElementById('regError').style.display = 'block';
                return;
            }
            
            try {
                // Kullanıcı adı benzersizlik kontrolü (FastAPI API üzerinden)
                const usernameRes = await fetch(`${API_URL}/auth/check-username?username=${encodeURIComponent(username)}`);
                const usernameData = await usernameRes.json();
                if (!usernameData.available) {
                    document.getElementById('regError').textContent = 'Bu kullanıcı adı zaten alınmış!';
                    document.getElementById('regError').style.display = 'block';
                    return;
                }
                
                // E-posta benzersizlik kontrolü (FastAPI API üzerinden)
                const emailRes = await fetch(`${API_URL}/auth/check-email?email=${encodeURIComponent(email)}`);
                const emailData = await emailRes.json();
                if (!emailData.available) {
                    document.getElementById('regError').textContent = 'Bu e-posta adresi zaten kullanımda!';
                    document.getElementById('regError').style.display = 'block';
                    return;
                }
                
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Kayıt yapılıyor...';
                submitBtn.disabled = true;
                
                // Doğrudan backend'e kaydet (Şifre sunucuda bcrypt'lenecek)
                await saveUser({
                    username: username,
                    nickname: username,
                    email: email,
                    password: pass,
                    role: 'user'
                });
                
                alert('Kayıt başarılı! Lütfen giriş yapın.');
                
                // Giriş kutusuna yönlendir
                document.getElementById('registerBox').style.display = 'none';
                document.getElementById('loginBox').style.display = 'block';
                
                // Formları sıfırla
                registerForm.reset();
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                
            } catch (err) {
                console.error('Kayıt hatası:', err);
                document.getElementById('regError').textContent = err.message || 'Kayıt sırasında bir hata oluştu! Tekrar deneyin.';
                document.getElementById('regError').style.display = 'block';
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Kayıt Ol';
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // ==========================================
    // ŞİFREMİ SIFIRLA (Doğrudan)
    // ==========================================
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgotEmail').value.trim();
            const newPass = document.getElementById('forgotNewPassword').value;
            const newPassConfirm = document.getElementById('forgotNewPasswordConfirm').value;
            
            if (newPass !== newPassConfirm) {
                document.getElementById('forgotError').textContent = 'Şifreler eşleşmiyor!';
                document.getElementById('forgotError').style.display = 'block';
                return;
            }
            
            // Şifre güvenlik kuralları kontrolü
            const passwordError = validatePassword(newPass);
            if (passwordError) {
                document.getElementById('forgotError').textContent = passwordError;
                document.getElementById('forgotError').style.display = 'block';
                return;
            }
            
            try {
                // E-posta ile kayıtlı kullanıcı sorgula (FastAPI API)
                const user = await getUserByEmail(email);
                
                if (!user) {
                    document.getElementById('forgotError').textContent = 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı!';
                    document.getElementById('forgotError').style.display = 'block';
                    return;
                }
                
                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Güncelleniyor...';
                submitBtn.disabled = true;
                
                // Şifreyi FastAPI backend üzerinde doğrudan sıfırla (onay kodsuz)
                await resetPasswordAPI(email, newPass);
                
                alert('Şifreniz başarıyla güncellendi! Lütfen yeni şifrenizle giriş yapın.');
                
                document.getElementById('forgotBox').style.display = 'none';
                document.getElementById('loginBox').style.display = 'block';
                forgotForm.reset();
                
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            } catch (err) {
                console.error('Şifre güncelleme hatası:', err);
                document.getElementById('forgotError').textContent = err.message || 'Şifre güncellenirken bir hata oluştu!';
                document.getElementById('forgotError').style.display = 'block';
                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Şifreyi Güncelle';
                    submitBtn.disabled = false;
                }
            }
        });
    }
});

// ==========================================
// FORM GEÇİŞ FONKSİYONLARI
// ==========================================

function toggleForms() {
    const loginBox = document.getElementById('loginBox');
    const registerBox = document.getElementById('registerBox');
    const forgotBox = document.getElementById('forgotBox');
    
    if (loginBox.style.display === 'none') {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
        if (forgotBox) forgotBox.style.display = 'none';
    } else {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
        if (forgotBox) forgotBox.style.display = 'none';
    }
}

function showForgotPassword() {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('registerBox').style.display = 'none';
    document.getElementById('forgotBox').style.display = 'block';
    document.getElementById('forgotError').style.display = 'none';
}

function cancelForgot() {
    document.getElementById('forgotBox').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
    const forgotForm = document.getElementById('forgotForm');
    if (forgotForm) forgotForm.reset();
}
