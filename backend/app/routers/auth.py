from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from app.models.user import UserRegister, UserLogin, UserResponse, Token, PasswordReset
from app.database import users_collection
from app.services.auth_service import get_password_hash, verify_password, create_access_token
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """
    Yeni kullanıcı hesabı kaydeder. Sunucu tarafında bcrypt şifreleme uygular.
    """
    # Kullanıcı adı kontrolü
    existing_username = await users_collection.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kullanıcı adı zaten alınmış."
        )
        
    # E-posta kontrolü
    existing_email = await users_collection.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi zaten kullanımda."
        )
        
    # Şifreyi sunucuda bcrypt ile hashle (Firebase'deki client-side sha256 yerine)
    password_hash = get_password_hash(user_data.password)
    
    # Yeni kullanıcı nesnesi
    new_user = {
        "username": user_data.username,
        "nickname": user_data.nickname,
        "email": user_data.email,
        "password_hash": password_hash,
        "role": "user",
        "avatar_url": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await users_collection.insert_one(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Kullanıcı kimlik bilgilerini doğrular ve JWT oturum token'ı döner.
    """
    user = await users_collection.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı."
        )
        
    # JWT token oluştur
    access_token = create_access_token(user["username"], user["role"])
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"],
        "role": user["role"]
    }

@router.get("/check-username")
async def check_username(username: str):
    """
    Kullanıcı adının kullanılabilirliğini (benzersizliğini) kontrol eder.
    """
    user = await users_collection.find_one({"username": username})
    return {"available": user is None}

@router.get("/check-email")
async def check_email(email: str):
    """
    E-posta adresinin kullanılabilirliğini kontrol eder. 
    Eğer e-posta zaten kayıtlıysa, şifre sıfırlama akışında kullanılmak üzere kullanıcı adını da döner.
    """
    user = await users_collection.find_one({"email": email})
    if user:
        return {"available": False, "username": user["username"]}
    return {"available": True}

@router.post("/reset-password")
async def reset_password(reset_data: PasswordReset):
    """
    E-posta adresiyle eşleşen kullanıcının şifresini yeni şifreyle sıfırlar.
    (EmailJS doğrulaması client tarafında yapıldıktan sonra çağrılır.)
    """
    user = await users_collection.find_one({"email": reset_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bu e-posta adresine ait bir kullanıcı bulunamadı."
        )
        
    new_hash = get_password_hash(reset_data.new_password)
    await users_collection.update_one(
        {"email": reset_data.email},
        {
            "$set": {
                "password_hash": new_hash,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    return {"message": "Şifreniz başarıyla sıfırlandı."}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Aktif token sahibi olan geçerli kullanıcının profil bilgilerini döner.
    """
    return current_user
