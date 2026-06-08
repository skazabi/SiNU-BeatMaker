import uuid
import httpx
from datetime import datetime, timezone
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List
from app.database import tasks_collection
from app.middleware.auth_middleware import get_current_user
from app.config import settings

router = APIRouter(prefix="/music", tags=["Music Generation"])

class MusicGenerateRequest(BaseModel):
    task_type: str = Field("text2music", description="GÃ¶rev tipi (text2music, cover, repaint)")
    caption: str = Field("", description="MÃ¼zik tarzÄ±, enstrÃ¼manlar vb. aÃ§Ä±klamasÄ±")
    lyrics: str = Field("", description="ÅarkÄ± sÃ¶zleri")
    instrumental: bool = Field(False, description="EnstrÃ¼mantal mi?")
    
    # Metadata
    vocal_language: str = Field("unknown", description="Vokal dili")
    bpm: Optional[int] = Field(None, ge=30, le=300, description="BPM hÄ±zÄ±")
    keyscale: str = Field("", description="Ton (key)")
    timesignature: str = Field("", description="Ritim kalÄ±bÄ± (4/4, 3/4, 6/8 vb.)")
    duration: float = Field(30.0, ge=5.0, le=360.0, description="Ãœretim sÃ¼resi (saniye)")
    
    # Hyperparameters
    inference_steps: int = Field(8, ge=1, le=100, description="Ä°nferans adÄ±m sayÄ±sÄ±")
    seed: int = Field(-1, description="Rastgelelik tohumu (-1: rastgele)")
    guidance_scale: float = Field(7.0, ge=0.0, le=15.0, description="Guidance Scale")
    shift: float = Field(1.0, ge=0.0, le=10.0, description="Shift parametresi")
    infer_method: str = Field("ode", description="Ä°nferans metodu (ode, sde)")
    audio_cover_strength: float = Field(1.0, ge=0.0, le=1.0, description="Kapak referans gÃ¼cÃ¼")
    
    # LM (Planner) Settings
    thinking: bool = Field(True, description="DÃ¼ÅŸÃ¼nme modu (LM Planner)")
    lm_model_path: str = Field("acestep-5Hz-lm-1.7B", description="LM model boyutu")
    lm_temperature: float = Field(0.85, ge=0.0, le=2.0, description="LM sÄ±caklÄ±k deÄŸeri")
    lm_cfg_scale: float = Field(2.0, ge=0.0, le=10.0, description="LM CFG scale")
    lm_top_k: int = Field(0, description="LM Top K")
    lm_top_p: float = Field(0.9, description="LM Top P")
    lm_negative_prompt: str = Field("NO USER INPUT", description="Negatif prompt")
    
    # Repaint Settings
    repainting_start: float = Field(0.0, description="Yeniden boyama baÅŸlangÄ±Ã§ saniyesi")
    repainting_end: float = Field(-1.0, description="Yeniden boyama bitiÅŸ saniyesi")
    
    # Inputs (base64 format)
    src_audio_b64: Optional[str] = None
    reference_audio_b64: Optional[str] = None
    
    # Multi-track
    num_tracks: int = Field(1, ge=1, le=4, description="Ãœretilecek alternatif kanal sayÄ±sÄ±")


def build_modal_generate_url(webhook_url: str) -> str:
    base_url = webhook_url.strip().rstrip("/")
    if not base_url:
        return ""

    parsed = urlparse(base_url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError("MODAL_WEBHOOK_URL gecerli bir URL degil.")

    if parsed.path.rstrip("/").endswith("/generate"):
        return base_url
    return f"{base_url}/generate"


def extract_modal_error(response: httpx.Response) -> str:
    try:
        data = response.json()
        if isinstance(data, dict):
            detail = data.get("detail") or data.get("error") or data.get("status")
            if detail:
                return str(detail)
    except ValueError:
        pass

    return response.text[:1000]


async def call_modal_api(task_id: str, payload: dict):
    """
    Arka planda Modal.com API'sini çağırır ve sonucu MongoDB'ye kaydeder.
    """
    if not settings.MODAL_WEBHOOK_URL:
        error_msg = "Modal API URL yapılandırılmamış. Lütfen .env dosyasında MODAL_WEBHOOK_URL tanımlayın."
        print(f"Error: {error_msg}")
        await tasks_collection.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "status": "failed",
                    "error": error_msg,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        return

    url = build_modal_generate_url(settings.MODAL_WEBHOOK_URL)
    try:
        await tasks_collection.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "status": "processing",
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

        # Payload boyutunu logla (base64 hariç)
        payload_size_info = {k: (f"{len(v)} chars" if isinstance(v, str) and len(v) > 200 else v) 
                            for k, v in payload.items()}
        print(f"[Modal API] Task {task_id}: POST {url}")
        print(f"[Modal API] Payload özeti: {payload_size_info}")

        # Modal'ın cold start ve inference süresi uzun sürebilir, timeout'u 10 dakika (600s) yapıyoruz.
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.post(url, json=payload)
            
            print(f"[Modal API] Task {task_id}: HTTP {response.status_code}")
            
            if response.status_code != 200:
                error_detail = extract_modal_error(response)
                print(f"[Modal API] Hata detayı: {error_detail}")
                raise Exception(f"Modal API HTTP {response.status_code}: {error_detail}")
                
            result_data = response.json()
            print(f"[Modal API] Task {task_id}: Yanıt başarılı, success={result_data.get('success')}")
            
            if isinstance(result_data, dict) and result_data.get("success"):
                await tasks_collection.update_one(
                    {"task_id": task_id},
                    {
                        "$set": {
                            "status": "completed",
                            "result": result_data,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                print(f"[Modal API] Task {task_id} tamamlandı. Track sayısı: {len(result_data.get('tracks', []))}")
            else:
                if isinstance(result_data, dict):
                    error_msg = result_data.get("error") or result_data.get("status") or result_data.get("detail")
                else:
                    error_msg = None
                print(f"[Modal API] Task {task_id}: Başarısız sonuç: {result_data}")
                raise Exception(error_msg or "Modal API beklenen formatta başarılı sonuç dönmedi.")
                
    except httpx.TimeoutException as e:
        error_msg = f"Modal API zaman aşımına uğradı (600s). Sunucu cold start veya GPU yükleme süreci uzun sürmüş olabilir. Tekrar deneyin."
        print(f"[Modal API] TIMEOUT Task {task_id}: {e}")
        await tasks_collection.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "status": "failed",
                    "error": error_msg,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
    except Exception as e:
        print(f"[Modal API] HATA Task {task_id}: {e}")
        await tasks_collection.update_one(
            {"task_id": task_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(e),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )


@router.post("/generate")
async def generate_music(
    req: MusicGenerateRequest, 
    background_tasks: BackgroundTasks, 
    current_user: dict = Depends(get_current_user)
):
    """
    MÃ¼zik Ã¼retimi isteÄŸini alÄ±r, hemen bir task ID dÃ¶nÃ¼p asenkron olarak Modal.com GPU servisine istek gÃ¶nderir.
    """
    task_id = str(uuid.uuid4())
    
    # GÃ¶revi MongoDB'ye baÅŸlangÄ±Ã§ durumunda kaydet (base64'sÃ¼z payload saklanÄ±r)
    task_doc = {
        "task_id": task_id,
        "type": "music_generation",
        "status": "pending",
        "payload": req.model_dump(exclude={"src_audio_b64", "reference_audio_b64"}),
        "username": current_user["username"],
        "result": None,
        "error": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await tasks_collection.insert_one(task_doc)
    
    # Arka planda Modal.com Ã§aÄŸrÄ±sÄ±nÄ± baÅŸlat
    payload = req.model_dump()
    background_tasks.add_task(call_modal_api, task_id, payload)
    
    return {
        "message": "MÃ¼zik Ã¼retim talebiniz sÄ±raya alÄ±ndÄ±.",
        "task_id": task_id
    }
