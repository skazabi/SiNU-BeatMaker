from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class InstrumentTrack(BaseModel):
    instrument: str = Field(..., description="Enstrüman adı/ID (kick, snare vb.)")
    activeSteps: List[int] = Field(default_factory=list, description="Aktif adım indeksleri (0-63)")

class BeatBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    bpm: int = Field(..., ge=40, le=220)
    data: List[InstrumentTrack]

class BeatCreate(BeatBase):
    beat_id: Optional[str] = Field(None, description="Opsiyonel Ritim ID'si. Boşsa yeni üretilir.")

class BeatResponse(BeatBase):
    beat_id: str
    username: str
    created_at: datetime
