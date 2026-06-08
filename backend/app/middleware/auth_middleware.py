from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth_service import decode_token
from app.database import users_collection

# HTTP Bearer şeması (Authorization: Bearer <token>)
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    HTTP isteğindeki JWT token'ı doğrular ve MongoDB'den ilgili kullanıcıyı döner.
    Geçersiz token durumunda 401 Unauthorized fırlatır.
    """
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz veya süresi dolmuş oturum token'ı.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token kullanıcı bilgisi içermiyor.",
        )
        
    # Kullanıcıyı veritabanında ara
    user = await users_collection.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı hesabı bulunamadı.",
        )
        
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Aktif kullanıcının 'admin' rolüne sahip olup olmadığını doğrular.
    Yetkisiz ise 403 Forbidden fırlatır.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlemi gerçekleştirmek için admin (yönetici) yetkisi gerekmektedir.",
        )
    return current_user
