from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import auth, users, beats, sounds, tasks, music

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI uygulamasının yaşam döngüsü event'leri.
    Uygulama başlarken veritabanı bağlantısını kurar.
    """
    # 1. MongoDB Atlas bağlantısını kur ve indeksleri tanımla
    await init_db()
    
    yield

app = FastAPI(
    title="SiNU-BeatMaker REST API",
    description="SiNU-BeatMaker için FastAPI, MongoDB Atlas ve RabbitMQ tabanlı yeni backend altyapısı.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS yapılandırması (Lokal HTML dosyalarının 'file://' veya localhost üzerinden sorunsuz bağlanması için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme ortamında tüm kaynaklara izin verilir
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tüm alt router'ları '/api' prefix'i altında ana uygulamaya dahil et
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(beats.router, prefix="/api")
app.include_router(sounds.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(music.router, prefix="/api")

@app.get("/api/status")
async def get_status():
    """
    API servisinin çalışma durumunu ve sağlığını sorgular.
    """
    return {
        "status": "healthy",
        "version": "2.0.0",
        "message": "SiNU-BeatMaker API aktif ve sorunsuz çalışıyor."
    }
