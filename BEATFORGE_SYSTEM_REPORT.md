# 🎵 BEATFORGE
## Online Müzik Prodüksiyonu Platformu

---

### Hazırlayanlar:
- Yusuf Bozkurt
- Furkan Gültekin
- Semih Bahadır Doğan

### Ders: İnternet Tabanlı Programlama
### Proje Türü: Grup Projesi (Web + Mobil)

---

## 1. Sistem Nedir?

**BEATFORGE**, kullanıcıların web tarayıcısında müzik prodüksiyonu yapabileceği bir platformdur.

Kullanıcılar:
- 🎹 Ritim oluşturabilir
- 🎤 Ses kaydedebilir
- 💾 Buluta kaydedebilir
- 🔗 Diğer kullanıcılarla paylaşabilir

---

## 2. Sistem Nasıl Çalışıyor?

```
┌─────────────────────────────────────────────────────────┐
│                    KULLANICI (Web Tarayıcı)            │
│            Ritim Oluşturma - Kayıt - Paylaşma          │
└────────────────────────┬────────────────────────────────┘
                         │
                    HTTP İSTEKLERİ
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼──────────┐          ┌──────────▼──────────┐
│   Frontend       │          │   Backend (Gelecek) │
│  HTML/CSS/JS     │          │   Node.js/Express   │
│                  │          │                     │
│ • Ritim Grid     │          │ • Güvenlik          │
│ • Oynatıcı       │          │ • Veri Doğrulama    │
│ • Profil Sayfası │          │ • Veritabanı Yönet. │
└──────────────────┘          └─────────┬───────────┘
                                        │
                              ┌─────────▼──────────┐
                              │  Firebase Firestore │
                              │                    │
                              │ • Kullanıcı Verisi │
                              │ • Beatler          │
                              │ • Paylaşımlar      │
                              │ • Yorumlar         │
                              └────────────────────┘
```

---

## 3. Şu Anki Durumu (Ne Yaptık?)

### ✅ Tamamlanan Özellikler

#### 🔐 Kimlik Doğrulama
- Kullanıcı kaydı ve girişi
- 2 Aşamalı doğrulama (E-mail ile)
- Şifre sıfırlama

#### 🎹 Ritim Oluşturma
- 8 Enstrümanlı grid (Kick, Snare, Hi-Hat, vb.)
- 16, 32, 48, 64 adım seçenekleri
- Tempo (BPM) kontrolü
- Gerçek zamanlı oynatma

#### 💾 Kayıt ve İndirme
- Ritimi buluta kaydetme
- MP3 olarak indirme
- Mikrofon ile ses kaydı

#### 👤 Profil Yönetimi
- Profil sayfası
- Avatar yükleme
- İstatistikler

#### 👨‍💼 Admin Paneli
- Kullanıcı yönetimi
- Özel ses ekleme

---

## 4. Eksik Özellikler (Ne Yapılacak?)

### 🔴 ÖNCELIKLI

#### Paylaşım Sistemi
```
Şu Anda:              Yapılması Gereken:
┌─────────────┐       ┌────────────────────┐
│ Kullanıcı   │       │ Tüm Kullanıcılar   │
│ Kendi Beatini│  ──→  │ Beatları Görebilir │
│ Görebilir   │       │ İndirebilir        │
│             │       │ Yorum Yapabilir    │
└─────────────┘       │ Like Verebilir     │
                      └────────────────────┘
```

**Yapılması Gerekenler:**
- Paylaşım sayfası oluştur
- Tüm beatler listesi
- Filtreleme (En popüler, En yeni)
- Arama fonksiyonu

#### Etkileşim Sistemi
```
Beat Paylaşımı
    ↓
❤️ Like Sistemi
💬 Yorum Yapma
😊 Emoji Reaksiyonu
↑↑ Saymak
```

#### Admin Moderasyonu
```
Admin Paneli
    ├─ Uygunsuz Yorumları Silme
    ├─ Uygunsuz Beatları Gizleme
    └─ Kötü Davranış Yapan Kullanıcıları Ban Etme
```

---

## 5. Veritabanı Yapısı

### Mevcut Veri (Firestore'da Tutuluyor)

```
🏢 Firestore Veritabanı
│
├─ users
│  ├─ username
│  ├─ email
│  ├─ şifre (hash)
│  └─ profil bilgileri
│
├─ beats
│  ├─ beat ID
│  ├─ ritim verisi
│  ├─ BPM
│  └─ sahibi
│
└─ customSounds
   ├─ ses ID
   └─ ses dosyası
```

### Eklenecek Veri

```
🏢 Firestore Veritabanı (Güncellenmiş)
│
├─ shares          ← YENİ
│  ├─ beatID
│  ├─ başlık
│  ├─ açıklama
│  ├─ like sayısı
│  └─ yorum sayısı
│
├─ comments        ← YENİ
│  ├─ share ID
│  ├─ yazar
│  ├─ metin
│  └─ moderasyon durumu
│
├─ reactions       ← YENİ
│  ├─ share ID
│  ├─ emoji
│  └─ kullanan kişi
│
└─ bans            ← YENİ
   ├─ kullanıcı ID
   ├─ neden
   └─ admin tarafı
```

---

## 6. Kullanıcı Akışı

### Mevcut Akış
```
Giriş Yap
   ↓
Ritim Oluştur
   ↓
MP3 İndir / Buluta Kaydet
   ↓
Profil Sayfasında Görüntüle
```

### Hedeflenen Akış
```
Giriş Yap
   ↓
Ritim Oluştur
   ↓
Paylaş Sayfasında Yayınla
   ↓
Diğer Kullanıcılar Görsün ← YENİ
   ↓                        ← YENİ
Like/Yorum/Emoji Yap ← YENİ
   ↓
Admin Uygunsuzları Yönet ← YENİ
```

---

## 7. Teknoloji Seçimleri

### Frontend (Şu Anda)
```
HTML5 + CSS3 + JavaScript
     ↓
Web Tarayıcıda Çalışır
     ↓
Responsive (Mobil Uyumlu)
```

**Neden?** Hızlı, basit ve her cihazda çalışır.

### Veritabanı (Şu Anda)
```
Firebase Firestore
     ↓
Bulut Tabanlı
     ↓
Otomatik Yedekleme
     ↓
Kolayca Ölçeklenebilir
```

**Neden?** Kurulumun kolay, güvenli ve ücretsiz.

### Backend (Gerekli)
```
Node.js + Express
     ↓
Hızlı API Sunucusu
     ↓
Veritabanı Doğrulaması
     ↓
Güvenlik Kontrolü
```

**Neden?** Kolay öğrenilebilir, JavaScript ile yazılır.

---

## 8. Proje Takvimi

### ✅ Hafta 1-2 (Tamamlandı)
- Temel sistem kuruldu
- Ritim oluşturma yapıldı
- Bulut kaydı yapıldı

### 🔄 Hafta 3-4 (Şimdi Yapılacak)
- Backend kurulumu
- Paylaşım sistemi
- Yorum sistemi

### ⏳ Hafta 5-6 (Sonra Yapılacak)
- Admin moderasyonu
- Hata düzeltmeleri
- Canlı ortama yükleme

---

## 9. Gelecek Plan

### 3 Aylık Hedefler
1. ✅ Temel sistem (Tamamlandı)
2. 🔄 Sosyal özellikler (Şimdi)
3. ⏳ Moderasyon (Sonra)
4. ⏳ Mobil uygulama (Opsiyonel)

### Uzun Vadeli Hedefler
- Premium özellikler
- Ai-destekli ritmler
- Collaborative editing
- Müzik kütüphanesi

---

## 10. Sonuç

**BEATFORGE** temel müzik prodüksiyonu özellikleri ile başarıyla kurulmuştur.

Sonraki aşama: Sosyal medya özelliklerini eklemek ve sistemi tamamlamak.

Sınıf arkadaşları bu raporu takip ederek projeyi devam ettirebilir! 🚀

---

**Başlangıç Tarihi:** 2026-04-26  
**Versiyon:** 1.0 - Sistem Özeti
