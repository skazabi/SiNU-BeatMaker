<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0-blueviolet?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.110+-teal?style=for-the-badge&logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/MongoDB-Atlas-darkgreen?style=for-the-badge&logo=mongodb" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Modal-Serverless_GPU-purple?style=for-the-badge" alt="Modal"/>
</p>

# 🎵 BEATFORGE — SiNU BeatMaker

**BEATFORGE**, Sinop Üniversitesi *İnternet Tabanlı Programlama* dersi kapsamında geliştirilen, web tabanlı bir **müzik prodüksiyonu (DAW)** ve **yapay zeka destekli müzik üretim** platformudur. Kullanıcılar kendi ritimlerini oluşturabilir, buluta kaydedebilir, MP3 olarak dışa aktarabilir ve **ACE-Step 1.5** modeli ile tamamen orijinal müzikler üretebilir.

> 🚀 **Canlı Demo:** [sinu-beatmaker-979cc.web.app](https://sinu-beatmaker-979cc.web.app)  
> 📦 **GitHub:** [github.com/skazabi/SiNU-BeatMaker](https://github.com/skazabi/SiNU-BeatMaker)

---

## 📸 Ekran Görüntüleri

| Giriş Sayfası | Beatmaker Sequencer | AI Music Studio |
|:---:|:---:|:---:|
| Glitch animasyonlu login | 8 kanallı grid sequencer | ACE-Step 1.5 arayüzü |

---

## ✨ Özellikler

### 🥁 Beatmaker Sequencer (DAW)
- **8 Enstrüman Kanalı** — Kick, Snare, Hi-Hat, Tom, Clap, Open Hat, Perc, Bass
- **Esnek Grid** — 16 / 32 / 48 / 64 adım seçeneği
- **BPM Kontrolü** — 40–220 BPM arası anlık tempo ayarı
- **Web Audio API** ile gerçek zamanlı ses sentezi ve ADSR Envelope kontrolü
- **Kendi Sesini Yükle** — `.wav` / `.mp3` sample dosyalarını özel kanallara ekleyebilme
- **MP3 Dışa Aktarma** — LameJS ile tarayıcı üzerinden doğrudan MP3'e çevirme
- **Sistem Sesi Kaydetme** — WebM → MP3 dönüşümü ile anlık kayıt
- **Mikrofon ile Canlı Kayıt** — Vokal veya enstrüman kaydı

### 🤖 AI Music Studio (Yapay Zeka Müzik Üretimi)
- **ACE-Step 1.5 XL Turbo** — Diffusion Transformer tabanlı müzik üretim modeli
- **3 Üretim Modu:**
  - 🎵 **Text-to-Music** — Metin promptundan müzik üretme
  - 🎤 **Cover Mode** — Var olan bir sesi farklı stilde yeniden yorumlama
  - 🎨 **Repaint Mode** — Belirli bir zaman aralığını yeniden oluşturma
- **LLM Planner (Düşünme Modu)** — 0.6B / 1.7B / 4B dil modeli ile akıllı prompt optimizasyonu
- **Gelişmiş Parametreler** — Inference steps, seed, shift, ODE/SDE metodu, cover strength
- **Çoklu Track** — Aynı anda 1–4 alternatif üretebilme
- **Müzik Metadata** — BPM, key, time signature, dil seçimi

### 🔐 Kimlik Doğrulama & Güvenlik
- **2 Aşamalı E-posta Doğrulama (2FA)** — EmailJS ile kayıt onayı
- **JWT Token Tabanlı Oturum** — Güvenli session yönetimi
- **Bcrypt Şifre Hashleme** — Server-side güvenli parola saklama
- **Şifremi Unuttum / Sıfırla** — E-posta tabanlı şifre sıfırlama akışı

### 👤 Profil & Yönetim
- Profil sayfası — Görünen ad (nickname) değiştirme
- Kaydedilen beatler ve ses dosyaları listesi
- Admin paneli — Kullanıcı ve özel ses yönetimi

---

## 🏗️ Mimari

```
┌─────────────────┐     REST API      ┌─────────────────────┐
│    Frontend      │ ◄──────────────► │   Backend (FastAPI)  │
│  HTML/CSS/JS     │    /api/*         │   Python + MongoDB   │
│  (Nginx/Docker)  │                   │   (Docker: 8000)     │
└─────────────────┘                   └──────────┬──────────┘
        │                                         │
        │                                         │ HTTP (Modal API)
        │                                         ▼
        │                            ┌─────────────────────┐
        │                            │  Modal GPU Worker    │
        │                            │  ACE-Step 1.5 Model  │
        │                            │  (L4 GPU, Serverless)│
        └────────────────────────────┤  FastAPI + Volume    │
           Audio URL (MP3)           └─────────────────────┘
```

### Katman Açıklamaları

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Frontend** | HTML5, CSS3, Vanilla JS | Statik dosyalar, Nginx üzerinden sunulur |
| **Backend** | FastAPI, MongoDB Atlas, JWT | REST API, kullanıcı yönetimi, beat CRUD |
| **AI Worker** | Modal.com, ACE-Step 1.5, PyTorch | Serverless GPU üzerinde müzik üretimi |
| **DevOps** | Docker Compose, Nginx | Frontend + Backend container orkestrasyonu |

---

## 🛠️ Kullanılan Teknolojiler

### Frontend
| Teknoloji | Kullanım |
|-----------|----------|
| HTML5 / CSS3 | Sayfa yapısı, glassmorphism UI, animasyonlar |
| Vanilla JavaScript | DOM manipülasyonu, API iletişimi, ses kontrolü |
| Web Audio API | Gerçek zamanlı ses sentezi ve ADSR kontrolü |
| LameJS | Tarayıcı içi MP3 encoding |
| EmailJS | 2FA doğrulama ve şifre sıfırlama mailleri |
| Google Fonts (Outfit, Space Grotesk) | Modern tipografi |

### Backend
| Teknoloji | Kullanım |
|-----------|----------|
| FastAPI | Asenkron REST API framework |
| Uvicorn | ASGI web sunucusu |
| MongoDB Atlas + Motor | Asenkron NoSQL veritabanı |
| Bcrypt + Passlib | Server-side şifre hashleme |
| python-jose (JWT) | Token tabanlı kimlik doğrulama |
| Pydantic v2 | Veri doğrulama ve serileştirme |
| HTTPX | Asenkron HTTP istemcisi |

### AI / ML (Modal GPU Worker)
| Teknoloji | Kullanım |
|-----------|----------|
| Modal.com | Serverless GPU altyapısı (L4) |
| ACE-Step 1.5 XL Turbo | Diffusion Transformer müzik üretimi |
| PyTorch 2.10 | Derin öğrenme framework'ü |
| LLM Planner (1.7B) | Prompt optimizasyonu ve CoT akıl yürütme |
| FFMPEG | Ses format dönüşümü (WAV → MP3) |
| Modal Volume | Kalıcı model ağırlık depolama |

### DevOps
| Teknoloji | Kullanım |
|-----------|----------|
| Docker | Container yönetimi |
| Docker Compose | Multi-container orkestrasyon |
| Nginx (Alpine) | Statik dosya sunucusu |

---

## 📦 Kurulum

### Ön Gereksinimler
- [Docker](https://www.docker.com/get-started) ve Docker Compose
- [Python 3.12+](https://www.python.org/) (lokal geliştirme için)
- [Modal](https://modal.com/) hesabı (AI Studio için)
- MongoDB Atlas hesabı

### 1. Repoyu Klonlayın
```bash
git clone https://github.com/skazabi/SiNU-BeatMaker.git
cd SiNU-BeatMaker
```

### 2. Ortam Değişkenlerini Ayarlayın
`backend/.env` dosyasını oluşturun:
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=<guclu-bir-secret-key>
MODAL_API_URL=https://<your-modal-app>.modal.run
```

### 3. Docker ile Çalıştırın
```bash
docker compose up --build
```
- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs

### 4. AI Studio (Modal Worker) Dağıtımı
```bash
cd backend
pip install -r requirements.txt
modal deploy ../modal_worker.py
```

### 5. Lokal Geliştirme (Docker'sız)
```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
# VS Code Live Server veya herhangi bir statik sunucu ile index.html'i açın
```

---

## 📁 Proje Yapısı

```
SiNU-BeatMaker/
├── index.html              # Giriş / Kayıt sayfası
├── beatmaker.html          # Ana sequencer (DAW) sayfası
├── ai-studio.html          # AI Music Studio sayfası
├── profile.html            # Kullanıcı profil sayfası
├── admin.html              # Admin paneli
├── style.css               # Tüm sayfaların ortak stili
├── script.js               # Sequencer ana mantığı
├── ai-studio.js            # AI Studio frontend mantığı
├── auth.js                 # Kimlik doğrulama işlemleri
├── db.js                   # REST API veritabanı katmanı (fetch)
├── modal_worker.py         # Modal GPU worker (ACE-Step 1.5)
├── Dockerfile              # Frontend Nginx container
├── docker-compose.yml      # Multi-container orkestrasyon
│
├── backend/                # Python Backend
│   ├── Dockerfile          # Backend container
│   ├── requirements.txt    # Python bağımlılıkları
│   ├── .env                # Ortam değişkenleri (git'te yok)
│   └── app/
│       ├── main.py         # FastAPI uygulama tanımı
│       ├── config.py       # Ortam ayarları (pydantic-settings)
│       ├── database.py     # MongoDB Atlas bağlantısı
│       ├── routers/        # API endpoint'leri
│       │   ├── auth.py     # Kayıt, giriş, 2FA, şifre sıfırlama
│       │   ├── users.py    # Kullanıcı profil CRUD
│       │   ├── beats.py    # Beat kaydetme / yükleme / silme
│       │   ├── sounds.py   # Özel ses dosyası yönetimi
│       │   ├── tasks.py    # Arka plan görev takibi
│       │   └── music.py    # AI müzik üretim proxy (Modal)
│       ├── models/         # Pydantic veri modelleri
│       │   ├── user.py
│       │   ├── beat.py
│       │   └── sound.py
│       ├── services/       # İş mantığı katmanı
│       │   └── auth_service.py
│       └── middleware/      # Ara katman yazılımları
│
├── PROJE_RAPORU.md         # Akademik proje raporu
├── Tutorial.md             # Kapsamlı geliştirme eğitimi
├── dokuman.md              # Mimari ve teknoloji analizi
└── notebookkodları.txt     # Kaggle notebook referansı
```

---

## 🔌 API Endpoint'leri

### Kimlik Doğrulama (`/api`)
| Metod | Endpoint | Açıklama |
|-------|----------|----------|
| `POST` | `/api/register` | Yeni kullanıcı kaydı + 2FA e-posta |
| `POST` | `/api/verify-email` | E-posta doğrulama kodu onayı |
| `POST` | `/api/login` | Kullanıcı girişi (JWT token döner) |
| `POST` | `/api/forgot-password` | Şifre sıfırlama e-postası |
| `POST` | `/api/reset-password` | Yeni şifre belirleme |

### Beat Yönetimi (`/api`)
| Metod | Endpoint | Açıklama |
|-------|----------|----------|
| `GET` | `/api/beats` | Kullanıcının kayıtlı beatlerini listele |
| `POST` | `/api/beats` | Yeni beat kaydet |
| `DELETE` | `/api/beats/{id}` | Beat sil |

### AI Müzik Üretimi (`/api`)
| Metod | Endpoint | Açıklama |
|-------|----------|----------|
| `POST` | `/api/music/generate` | AI ile müzik üret (Modal GPU) |
| `GET` | `/api/tasks/{id}` | Üretim görev durumunu sorgula |

---

## 🧠 AI Music Studio — Nasıl Çalışır?

```
Kullanıcı Promptu → Backend API → Modal GPU Worker → ACE-Step 1.5 Model
                                                         │
                                          ┌──────────────┤
                                          ▼              ▼
                                    LLM Planner     DiT Model
                                    (1.7B CoT)    (XL Turbo)
                                          │              │
                                          ▼              ▼
                                    Optimize      Ses Üretimi
                                    Prompt          (WAV)
                                                     │
                                                     ▼
                                              FFMPEG → MP3
                                                     │
                                                     ▼
                                            Modal Volume'e Kaydet
                                                     │
                                                     ▼
                                           URL → Frontend Player
```

### Modal Serverless GPU Avantajları
- ⚡ **Scale-to-Zero** — İstek yokken sıfır maliyet
- 🔄 **Auto-Scaling** — Yoğun trafikte otomatik çoklu GPU
- 💰 **Saniye Bazlı Faturalandırma** — Sabit sunucu maliyeti yok
- 🧊 **Cold Start ~30sn** — İlk istek sonrası 5 dakika sıcak bekler

---

## 👥 Geliştiriciler

| Geliştirici | Rol |
|-------------|-----|
| **Yağız Van** | Full-Stack Geliştirici |
| **Fatih Canberk Gür** | Full-Stack Geliştirici |
| **Hüseyin Alp Yüksel** | Full-Stack Geliştirici |

**Kurum:** Sinop Üniversitesi — Bilgisayar Mühendisliği  
**Ders:** İnternet Tabanlı Programlama  
**Tarih:** Haziran 2026  
**Versiyon:** 2.0

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
