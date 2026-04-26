/**
 * SiNU-BeatMaker - Kimlik Doğrulama (Firebase Firestore + EmailJS)
 * Giriş, Kayıt, 2FA, Şifre Sıfırlama işlemleri
 */

// EmailJS Yapılandırma
const EMAILJS_SERVICE_ID = 'service_d2efpvb';
const EMAILJS_TEMPLATE_ID = 'template_m2bp3ut'; // Kayıt Doğrulama İçin
const EMAILJS_RESET_TEMPLATE_ID = 'template_qm7kyt8'; // Şifre Sıfırlama İçin
const EMAILJS_PUBLIC_KEY = 'lByNoDcgGqq-2kbhn';

// EmailJS'i başlat
if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log('📧 EmailJS bağlantısı kuruldu.');
}

// SHA-256 Hash Function using Web Crypto API
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generates a 6-digit string with all distinct digits
function generateUniqueCode() {
    let digits = '0123456789'.split('');
    let code = '';
    for(let i = 0; i < 6; i++) {
        let randIndex = Math.floor(Math.random() * digits.length);
        code += digits[randIndex];
        digits.splice(randIndex, 1);
    }
    return code;
}

// Temporary storage for registration data during 2FA
let tempRegistrationData = null;
// Temporary storage for password reset data
let tempResetData = null;

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const twoFaForm = document.getElementById('twoFaForm');
    const forgotForm = document.getElementById('forgotForm');
    const resetForm2 = document.getElementById('resetForm');
    
    // ==========================================
    // GİRİŞ YAP
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const pass = document.getElementById('loginPassword').value;
            const hash = await sha256(pass);
            
            try {
                const user = await getUser(username);
                
                if (user && user.passwordHash === hash) {
                    setCurrentUser({ username: user.username, nickname: user.nickname || user.username, role: user.role });
                    if (user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'beatmaker.html';
                    }
                } else {
                    document.getElementById('loginError').textContent = 'Hatalı kullanıcı adı veya şifre!';
                    document.getElementById('loginError').style.display = 'block';
                }
            } catch (err) {
                console.error('Giriş hatası:', err);
                document.getElementById('loginError').textContent = 'Sunucu bağlantısı hatası! Lütfen tekrar deneyin.';
                document.getElementById('loginError').style.display = 'block';
            }
        });
    }

    // ==========================================
    // KAYIT OL
    // ==========================================
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value.trim() + '@gmail.com';
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
                // Kullanıcı adı kontrolü
                const existingUser = await getUser(username);
                if (existingUser) {
                    document.getElementById('regError').textContent = 'Bu kullanıcı adı zaten alınmış!';
                    document.getElementById('regError').style.display = 'block';
                    return;
                }
                
                // E-posta kontrolü
                const existingEmail = await getUserByEmail(email);
                if (existingEmail) {
                    document.getElementById('regError').textContent = 'Bu e-posta adresi zaten kullanımda!';
                    document.getElementById('regError').style.display = 'block';
                    return;
                }
                
                const hash = await sha256(pass);
                const code = generateUniqueCode();
                
                tempRegistrationData = {
                    email: email,
                    username: username,
                    passwordHash: hash,
                    code: code
                };
                
                // EmailJS ile doğrulama e-postası gönder
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Doğrulama kodu gönderiliyor...';
                submitBtn.disabled = true;
                
                let emailSent = false;
                try {
                    if (typeof emailjs !== 'undefined') {
                        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                            email: email,
                            code: code
                        });
                        emailSent = true;
                        console.log('✅ Doğrulama e-postası gönderildi:', email);
                    } else {
                        console.warn('EmailJS tanımlı değil!');
                    }
                } catch (err) {
                    console.error('EmailJS hatası:', err);
                }
                
                if (!emailSent) {
                    alert(`E-posta gönderilemedi.\nDoğrulama kodunuz: ${code}`);
                }
                
                // Mask email for UI
                const emailParts = email.split('@');
                let maskedEmail = email;
                if (emailParts.length === 2) {
                    maskedEmail = emailParts[0].charAt(0) + '***@' + emailParts[1];
                }
                const twoFaDesc = document.querySelector('#twoFaBox p');
                if (twoFaDesc) {
                    twoFaDesc.innerHTML = `<b>${maskedEmail}</b> adresinize gönderilen 6 haneli doğrulama kodunu giriniz.`;
                }

                document.getElementById('registerBox').style.display = 'none';
                document.getElementById('twoFaBox').style.display = 'block';
                document.getElementById('twoFaError').style.display = 'none';
                
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                
            } catch (err) {
                console.error('Kayıt hatası:', err);
                document.getElementById('regError').textContent = 'Sunucu bağlantısı hatası! Lütfen tekrar deneyin.';
                document.getElementById('regError').style.display = 'block';
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.textContent = 'Kayıt Ol (Doğrulama Kodu Gönder)';
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // ==========================================
    // 2FA DOĞRULAMA (Kayıt tamamlama)
    // ==========================================
    if (twoFaForm) {
        twoFaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codeInput = document.getElementById('twoFaCode').value.trim();
            
            if (!tempRegistrationData) {
                alert('Kayıt verisi bulunamadı. Lütfen baştan başlayın.');
                cancel2FA();
                return;
            }
            
            if (codeInput === tempRegistrationData.code) {
                // Code matches, finalize registration in Firestore
                try {
                    await saveUser({
                        username: tempRegistrationData.username,
                        nickname: tempRegistrationData.username, // Default nickname
                        email: tempRegistrationData.email,
                        passwordHash: tempRegistrationData.passwordHash,
                        role: 'user'
                    });
                    
                    tempRegistrationData = null;
                    alert('Kayıt ve e-posta doğrulama başarılı! Lütfen giriş yapın.');
                    
                    document.getElementById('twoFaBox').style.display = 'none';
                    document.getElementById('loginBox').style.display = 'block';
                    
                    // Reset forms
                    document.getElementById('registerForm').reset();
                    document.getElementById('twoFaForm').reset();
                } catch (err) {
                    console.error('Kayıt kaydetme hatası:', err);
                    document.getElementById('twoFaError').textContent = 'Kayıt sırasında bir hata oluştu! Tekrar deneyin.';
                    document.getElementById('twoFaError').style.display = 'block';
                }
            } else {
                document.getElementById('twoFaError').textContent = 'Doğrulama kodu hatalı!';
                document.getElementById('twoFaError').style.display = 'block';
            }
        });
    }

    // ==========================================
    // ŞİFREMİ UNUTTUM: Sıfırlama kodu gönder
    // ==========================================
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('forgotEmail').value.trim();
            const email = emailInput + '@gmail.com';
            
            try {
                const user = await getUserByEmail(email);
                
                if (!user) {
                    document.getElementById('forgotError').textContent = 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı!';
                    document.getElementById('forgotError').style.display = 'block';
                    return;
                }
                
                const code = generateUniqueCode();
                tempResetData = { email: email, username: user.username, code: code };
                
                const submitBtn = forgotForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Kod gönderiliyor...';
                submitBtn.disabled = true;
                
                try {
                    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_RESET_TEMPLATE_ID, {
                        email: email,
                        code: code
                    });
                    console.log('✅ Sıfırlama kodu gönderildi:', email);
                } catch (err) {
                    console.error('EmailJS hatası:', err);
                    alert(`E-posta servisi şu an çalışmıyor.\nSıfırlama kodunuz: ${code}`);
                } finally {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
                
                document.getElementById('forgotBox').style.display = 'none';
                document.getElementById('resetBox').style.display = 'block';
                document.getElementById('resetError').style.display = 'none';
                document.getElementById('forgotError').style.display = 'none';
            } catch (err) {
                console.error('Şifre sıfırlama hatası:', err);
                document.getElementById('forgotError').textContent = 'Sunucu bağlantısı hatası! Tekrar deneyin.';
                document.getElementById('forgotError').style.display = 'block';
            }
        });
    }

    // ==========================================
    // ŞİFRE SIFIRLAMA: Kod doğrula ve yeni şifre
    // ==========================================
    if (resetForm2) {
        resetForm2.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codeInput = document.getElementById('resetCode').value.trim();
            const newPass = document.getElementById('resetNewPassword').value;
            const newPassConfirm = document.getElementById('resetNewPasswordConfirm').value;
            
            if (!tempResetData) {
                alert('Sıfırlama verisi bulunamadı. Lütfen baştan başlayın.');
                cancelForgot();
                return;
            }
            
            if (newPass !== newPassConfirm) {
                document.getElementById('resetError').textContent = 'Şifreler eşleşmiyor!';
                document.getElementById('resetError').style.display = 'block';
                return;
            }
            
            // Şifre güvenlik kuralları kontrolü
            const passwordError = validatePassword(newPass);
            if (passwordError) {
                document.getElementById('resetError').textContent = passwordError;
                document.getElementById('resetError').style.display = 'block';
                return;
            }
            
            if (codeInput !== tempResetData.code) {
                document.getElementById('resetError').textContent = 'Doğrulama kodu hatalı!';
                document.getElementById('resetError').style.display = 'block';
                return;
            }
            
            try {
                // Firestore'da şifreyi güncelle
                const user = await getUserByEmail(tempResetData.email);
                if (user) {
                    user.passwordHash = await sha256(newPass);
                    await saveUser(user);
                }
                
                tempResetData = null;
                alert('Şifreniz başarıyla güncellendi! Lütfen yeni şifrenizle giriş yapın.');
                
                document.getElementById('resetBox').style.display = 'none';
                document.getElementById('loginBox').style.display = 'block';
                resetForm2.reset();
            } catch (err) {
                console.error('Şifre güncelleme hatası:', err);
                document.getElementById('resetError').textContent = 'Şifre güncellenirken bir hata oluştu!';
                document.getElementById('resetError').style.display = 'block';
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
    const twoFaBox = document.getElementById('twoFaBox');
    const forgotBox = document.getElementById('forgotBox');
    const resetBox = document.getElementById('resetBox');
    
    if (loginBox.style.display === 'none') {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
        twoFaBox.style.display = 'none';
        if (forgotBox) forgotBox.style.display = 'none';
        if (resetBox) resetBox.style.display = 'none';
    } else {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
        twoFaBox.style.display = 'none';
        if (forgotBox) forgotBox.style.display = 'none';
        if (resetBox) resetBox.style.display = 'none';
    }
}

function cancel2FA() {
    tempRegistrationData = null;
    document.getElementById('twoFaForm').reset();
    document.getElementById('twoFaBox').style.display = 'none';
    document.getElementById('registerBox').style.display = 'block';
}

function showForgotPassword() {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('registerBox').style.display = 'none';
    document.getElementById('twoFaBox').style.display = 'none';
    document.getElementById('forgotBox').style.display = 'block';
    document.getElementById('resetBox').style.display = 'none';
    document.getElementById('forgotError').style.display = 'none';
}

function cancelForgot() {
    tempResetData = null;
    document.getElementById('forgotBox').style.display = 'none';
    document.getElementById('resetBox').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
    const forgotForm = document.getElementById('forgotForm');
    const resetForm = document.getElementById('resetForm');
    if (forgotForm) forgotForm.reset();
    if (resetForm) resetForm.reset();
}
