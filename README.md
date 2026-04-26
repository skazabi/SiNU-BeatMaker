# SiNU BeatMaker (BEATFORGE) 🎵

SiNU BeatMaker, kullanıcıların kendi ritimlerini yaratmalarına, buluta kaydetmelerine ve MP3 olarak dışa aktarmalarına olanak tanıyan web tabanlı bir "Drum Machine" ve müzik üretim (DAW) aracıdır. 

## 🚀 Özellikler

- **Gelişmiş Kayıt & Giriş Sistemi:** EmailJS destekli 2 Aşamalı Doğrulama (2FA) ile güvenli kayıt işlemi.
- **Kullanıcı Yönetimi:** Firebase Firestore üzerinde `SHA-256` ile şifrelenmiş parola saklama ve "Şifremi Unuttum / Sıfırla" e-posta akışı.
- **Ritim Oluşturma (Sequencer):** Birden fazla enstrüman kanalı (Kick, Snare, Hi-hat, vb.) ile grid üzerinden interaktif ritim yazma.
- **BPM Kontrolü:** Parçanın hızını (tempo) anlık olarak değiştirme yeteneği.
- **Bulut Senkronizasyonu:** Yaptığınız ritimleri Firebase Firestore veritabanına kaydedip, giriş yaptığınız herhangi bir cihazdan geri yükleyebilme.
- **MP3 Dışa Aktarma:** Ürettiğiniz ritimleri `lamejs` kütüphanesi sayesinde doğrudan tarayıcı üzerinden MP3 formatında bilgisayarınıza indirebilme.
- **Kendi Sesini Yükle:** Kullanıcıların kendi `.wav` veya `.mp3` sample (örnek) ses dosyalarını sisteme yükleyip özel kanallarda kullanabilmesi.

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend / Veritabanı:** Firebase Cloud Firestore (Kullanıcı hesapları, kayıtlı ritimler ve özel ses yolları)
- **Hosting:** Firebase Hosting
- **E-posta Servisi:** EmailJS (Kayıt doğrulama ve şifre sıfırlama mailleri için)
- **Ses İşleme:** LameJS (MP3 Encoder), Web Audio API
- **Güvenlik:** Web Crypto API (SHA-256 Password Hashing)

## 📦 Kurulum ve Geliştirme

Projeyi kendi bilgisayarınızda çalıştırmak veya geliştirmek için:

1. Repoyu bilgisayarınıza klonlayın:
   ```bash
   git clone https://github.com/skazabi/SiNU-BeatMaker.git
   ```
2. Proje dizinine girin:
   ```bash
   cd SiNU-BeatMaker
   ```
3. Yerel bir sunucu (VS Code Live Server vb.) yardımıyla `index.html` dosyasını tarayıcınızda açarak uygulamayı çalıştırın.

*(Not: Veritabanı bağlantısı `firebase-config.js` dosyasından sağlanmaktadır. Kendi Firebase projenizi kullanmak isterseniz bu dosyadaki `firebaseConfig` ayarlarını kendi projenize göre güncellemeniz gerekir.)*

## 🌐 Canlı Önizleme

Uygulamanın çalışan en güncel sürümüne şu adresten ulaşabilirsiniz:
👉 [**BEATFORGE (SiNU BeatMaker) Web App**](https://sinu-beatmaker-979cc.web.app)

*Son Güncellemeler (v1.1):*
- Yeni Firebase ve EmailJS entegrasyonu sağlandı (E-postalar `snubeatmaker.noreply@gmail.com` adresinden html template ile iletilir).
- Firestore veritabanı güvenlik kuralları (`firestore.rules`) ayarlandı.
- Audio elementinin kendi indirme butonu `controlsList="nodownload"` ile kapatılıp, arayüzdeki MP3 kaydet butonlarının kullanılması mecbur kılındı.
