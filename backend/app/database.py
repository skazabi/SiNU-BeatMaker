from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

# MongoDB Atlas async client
client = AsyncIOMotorClient(settings.MONGODB_URI)

# Veritabanını al (URI içinde belirtilen veya varsayılan olarak 'sinu_beatmaker')
try:
    db = client.get_default_database()
except Exception:
    db = client.get_database("sinu_beatmaker")

# Koleksiyon referansları
users_collection = db.users
beats_collection = db.beats
sounds_collection = db.custom_sounds
tasks_collection = db.tasks

async def init_db():
    """
    MongoDB Atlas indekslerini oluşturur ve bağlantıyı doğrular.
    """
    try:
        # Bağlantıyı doğrulamak için ping gönder
        await client.admin.command('ping')
        
        # Benzersiz indeksler oluştur (Veri bütünlüğü için kritik)
        await users_collection.create_index("username", unique=True)
        await users_collection.create_index("email", unique=True)
        
        await beats_collection.create_index("beat_id", unique=True)
        await beats_collection.create_index("username")
        
        await sounds_collection.create_index("sound_id", unique=True)
        await tasks_collection.create_index("task_id", unique=True)
        
        print("[DB] MongoDB Atlas baglantisi kuruldu ve veritabanı indeksleri olusturuldu.")
        
        # Varsayılan admin hesabı kontrolü
        admin_exists = await users_collection.find_one({"username": "admin"})
        if not admin_exists:
            from app.services.auth_service import get_password_hash
            await users_collection.insert_one({
                "username": "admin",
                "nickname": "Sistem Yöneticisi",
                "email": "admin@sinubeatmaker.com",
                "password_hash": get_password_hash("admin"),  # Varsayılan şifre: admin
                "role": "admin",
                "avatar_url": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            print("[ADMIN] Varsayilan admin hesabi olusturuldu (kullanici: admin, sifre: admin).")
            
    except Exception as e:
        print(f"[DB ERROR] MongoDB Atlas baglanti hatasi: {e}")
        raise e
