from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.sound import CustomSoundCreate, CustomSoundResponse
from app.database import sounds_collection
from app.middleware.auth_middleware import get_current_user, get_admin_user

router = APIRouter(prefix="/sounds", tags=["Sounds"])

@router.get("", response_model=List[CustomSoundResponse])
async def get_all_sounds(current_user: dict = Depends(get_current_user)):
    """
    Sistemde yüklü olan tüm özel ses (custom sound) kayıtlarını listeler.
    Giriş yapmış tüm kullanıcılar bu sesleri okuyabilir.
    """
    sounds = []
    async for sound in sounds_collection.find():
        sounds.append(sound)
    return sounds

@router.post("", response_model=CustomSoundResponse, status_code=status.HTTP_201_CREATED)
async def save_sound(sound_data: CustomSoundCreate, current_user: dict = Depends(get_admin_user)):
    """
    Sisteme yeni bir özel ses kaydeder veya mevcut olanı günceller (upsert). (Sadece Yöneticiler)
    """
    sound_id = sound_data.sound_id
    if not sound_id:
        sound_id = f"sound_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        
    existing_sound = await sounds_collection.find_one({"sound_id": sound_id})
    
    new_sound = {
        "sound_id": sound_id,
        "name": sound_data.name,
        "type": sound_data.type,
        "data_url": sound_data.data_url,
        "added_by": existing_sound["added_by"] if existing_sound else current_user["username"],
        "created_at": existing_sound["created_at"] if existing_sound else datetime.now(timezone.utc)
    }
    
    await sounds_collection.update_one(
        {"sound_id": sound_id},
        {"$set": new_sound},
        upsert=True
    )
    return new_sound

@router.delete("/{sound_id}")
async def delete_sound(sound_id: str, current_user: dict = Depends(get_admin_user)):
    """
    Özel ses kaydını sistemden siler. (Sadece Yöneticiler)
    """
    sound = await sounds_collection.find_one({"sound_id": sound_id})
    if not sound:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Özel ses kaydı bulunamadı."
        )
        
    await sounds_collection.delete_one({"sound_id": sound_id})
    return {"message": f"Özel ses '{sound_id}' başarıyla silindi."}
