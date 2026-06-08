from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.user import UserResponse, UserUpdate, PasswordChange
from app.database import users_collection, beats_collection
from app.middleware.auth_middleware import get_current_user, get_admin_user
from app.services.auth_service import get_password_hash, verify_password

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(get_admin_user)):
    """
    Sistemdeki tüm kayıtlı kullanıcıları listeler. (Sadece Yöneticiler)
    """
    users = []
    async for user in users_collection.find():
        users.append(user)
    return users

@router.get("/{username}", response_model=UserResponse)
async def get_user(username: str, current_user: dict = Depends(get_current_user)):
    """
    Belirli bir kullanıcının profil bilgilerini döner.
    """
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Kullanıcı bulunamadı."
        )
    return user

@router.put("/{username}", response_model=UserResponse)
async def update_user(
    username: str, 
    update_data: UserUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """
    Kullanıcının profil bilgilerini (takma ad, avatar resmi) günceller.
    Kullanıcılar sadece kendi profillerini güncelleyebilir (Adminler hariç).
    """
    if current_user["username"] != username and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu profili güncelleme yetkiniz bulunmamaktadır."
        )
        
    update_dict = {}
    if update_data.nickname is not None:
        update_dict["nickname"] = update_data.nickname
    if update_data.avatar_url is not None:
        # Base64 veri veya silme işlemi için null
        update_dict["avatar_url"] = update_data.avatar_url
        
    if not update_dict:
        return current_user
        
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    await users_collection.update_one({"username": username}, {"$set": update_dict})
    
    updated_user = await users_collection.find_one({"username": username})
    return updated_user

@router.delete("/{username}")
async def delete_user(username: str, current_user: dict = Depends(get_admin_user)):
    """
    Belirtilen kullanıcıyı ve kullanıcıya ait tüm beat (ritim) kayıtlarını siler. (Sadece Yöneticiler)
    """
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Silinecek kullanıcı bulunamadı."
        )
        
    # Kullanıcıyı sil
    await users_collection.delete_one({"username": username})
    
    # Kullanıcının ürettiği ritimleri (beat) sil
    await beats_collection.delete_many({"username": username})
    
    return {"message": f"Kullanıcı '{username}' ve tüm ritim kayıtları başarıyla silindi."}

@router.post("/{username}/change-password")
async def change_password(
    username: str, 
    pwd_data: PasswordChange, 
    current_user: dict = Depends(get_current_user)
):
    """
    Kullanıcının şifresini güvenli bir şekilde günceller. 
    Mevcut şifrenin sunucuda doğrulanması zorunludur.
    """
    if current_user["username"] != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Diğer kullanıcıların şifresini değiştiremezsiniz."
        )
        
    # Mevcut şifre doğrulaması
    if not verify_password(pwd_data.current_password, current_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mevcut şifreniz hatalı."
        )
        
    new_hash = get_password_hash(pwd_data.new_password)
    await users_collection.update_one(
        {"username": username},
        {
            "$set": {
                "password_hash": new_hash,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    return {"message": "Şifreniz başarıyla değiştirilmiştir."}
