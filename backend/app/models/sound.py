from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class CustomSoundBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    type: str = Field("file", description="Dosya tipi (varsayılan: 'file')")
    data_url: str = Field(..., description="Base64 data URL (ses dosyası)")

class CustomSoundCreate(CustomSoundBase):
    sound_id: Optional[str] = Field(None, description="Opsiyonel Ses ID'si. Boşsa yeni üretilir.")

class CustomSoundResponse(CustomSoundBase):
    sound_id: str
    added_by: str
    created_at: datetime
