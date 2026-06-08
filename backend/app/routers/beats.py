from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.beat import BeatCreate, BeatResponse
from app.database import beats_collection
from app.middleware.auth_middleware import get_current_user, get_admin_user

router = APIRouter(prefix="/beats", tags=["Beats"])

@router.get("", response_model=List[BeatResponse])
async def get_all_beats(current_user: dict = Depends(get_admin_user)):
    """
    Sistemdeki tüm ritim (beat) kayıtlarını listeler. (Sadece Yöneticiler)
    """
    beats = []
    async for beat in beats_collection.find():
        beats.append(beat)
    return beats

@router.post("", response_model=BeatResponse)
async def save_beat(beat_data: BeatCreate, current_user: dict = Depends(get_current_user)):
    """
    Yeni bir ritim (beat) kaydeder veya mevcut ritmi günceller (upsert).
    """
    beat_id = beat_data.beat_id
    
    # ID yoksa yeni oluştur
    if not beat_id:
        beat_id = f"beat_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        
    existing_beat = await beats_collection.find_one({"beat_id": beat_id})
    
    # Güncelleme yetki kontrolü
    if existing_beat:
        if existing_beat["username"] != current_user["username"] and current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu ritim kaydını güncelleme yetkiniz bulunmamaktadır."
            )
            
    new_beat = {
        "beat_id": beat_id,
        "username": existing_beat["username"] if existing_beat else current_user["username"],
        "name": beat_data.name,
        "bpm": beat_data.bpm,
        "data": [track.model_dump() for track in beat_data.data],
        "created_at": existing_beat["created_at"] if existing_beat else datetime.now(timezone.utc)
    }
    
    # MongoDB upsert işlemi
    await beats_collection.update_one(
        {"beat_id": beat_id},
        {"$set": new_beat},
        upsert=True
    )
    return new_beat

@router.get("/{beat_id}", response_model=BeatResponse)
async def get_beat(beat_id: str, current_user: dict = Depends(get_current_user)):
    """
    ID'si belirtilen ritim (beat) kaydını döner.
    """
    beat = await beats_collection.find_one({"beat_id": beat_id})
    if not beat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Ritim kaydı bulunamadı."
        )
    return beat

@router.delete("/{beat_id}")
async def delete_beat(beat_id: str, current_user: dict = Depends(get_current_user)):
    """
    Ritim kaydını veritabanından siler. Sadece ritim sahibi veya admin silebilir.
    """
    beat = await beats_collection.find_one({"beat_id": beat_id})
    if not beat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Ritim kaydı bulunamadı."
        )
        
    # Silme yetki kontrolü
    if beat["username"] != current_user["username"] and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu ritim kaydını silme yetkiniz bulunmamaktadır."
        )
        
    await beats_collection.delete_one({"beat_id": beat_id})
    return {"message": f"Ritim kaydı '{beat_id}' başarıyla silindi."}

@router.get("/user/{username}", response_model=List[BeatResponse])
async def get_user_beats(username: str, current_user: dict = Depends(get_current_user)):
    """
    Belirli bir kullanıcının ürettiği tüm ritim kayıtlarını listeler.
    """
    beats = []
    async for beat in beats_collection.find({"username": username}):
        beats.append(beat)
    return beats
