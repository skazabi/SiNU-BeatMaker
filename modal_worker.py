import os
import sys
import uuid
import base64
import random
import shutil
import subprocess
import tempfile
import numpy as np
import soundfile as sf
import torch
import modal
from pydantic import BaseModel
from typing import Optional, List
from urllib.parse import urljoin

# ---------------------------------------------------------
# Modal Uygulaması Tanımı
# ---------------------------------------------------------
app = modal.App("acestep-music-worker")

# Model ağırlıklarının saklanacağı Volume
models_volume = modal.Volume.from_name("acestep-models-volume-v4", create_if_missing=True)

# Gerekli bağımlılıkların yüklendiği ve ACE-Step reposunun klonlandığı imaj
acestep_image = (
    modal.Image.from_registry("nvidia/cuda:13.0.0-cudnn-devel-ubuntu24.04", add_python="3.12")
    .apt_install("git", "ffmpeg", "libavcodec-extra", "libsndfile1", "build-essential")
    .run_commands(
        "echo 'Force rebuild v5 - fix init'",
        "git clone --depth 1 https://github.com/ace-step/ACE-Step-1.5.git /app/ACE-Step-1.5",
    )
    .uv_pip_install(
        "/app/ACE-Step-1.5",
        "fastapi",
        "hf_transfer==0.1.9",
        "httpx",
        "soundfile",
        "torchcodec==0.10.0",
        "torch~=2.10.0",
        "uvicorn",
    )
    .env({
        "ACESTEP_PROJECT_ROOT": "/app/ACE-Step-1.5",
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "TOKENIZERS_PARALLELISM": "false",
    })
)

# ---------------------------------------------------------
# Pydantic Şemaları (Request/Response)
# ---------------------------------------------------------
class MusicGenerateRequest(BaseModel):
    task_type: str = "text2music"  # text2music, cover, repaint
    caption: str = ""
    lyrics: str = ""
    instrumental: bool = False
    
    # Metadata
    vocal_language: str = "unknown"
    bpm: Optional[int] = None
    keyscale: str = ""
    timesignature: str = ""
    duration: float = 30.0
    
    # Hyperparameters
    inference_steps: int = 8
    seed: int = -1
    guidance_scale: float = 7.0
    shift: float = 1.0
    infer_method: str = "ode"
    audio_cover_strength: float = 1.0
    
    # LM (Planner) Settings
    thinking: bool = True
    lm_model_path: str = "acestep-5Hz-lm-1.7B"  # acestep-5Hz-lm-0.6B, acestep-5Hz-lm-1.7B, acestep-5Hz-lm-4B
    lm_temperature: float = 0.85
    lm_cfg_scale: float = 2.0
    lm_top_k: int = 0
    lm_top_p: float = 0.9
    lm_negative_prompt: str = "NO USER INPUT"
    
    # Repaint Settings
    repainting_start: float = 0.0
    repainting_end: float = -1.0
    
    # Inputs (base64 format)
    src_audio_b64: Optional[str] = None
    reference_audio_b64: Optional[str] = None
    
    # Multi-track
    num_tracks: int = 1


def _result_success(result) -> bool:
    if result is None:
        return False
    if isinstance(result, dict):
        return bool(result.get("success", True))
    return bool(getattr(result, "success", True))


def _result_status(result) -> str:
    if result is None:
        return "Unknown generation error."
    if isinstance(result, dict):
        return str(result.get("status_message") or result.get("status") or result.get("error") or "Unknown generation error.")
    return str(getattr(result, "status_message", None) or getattr(result, "status", None) or getattr(result, "error", None) or "Unknown generation error.")


def _collect_audio_paths(value) -> List[str]:
    paths = []
    if value is None:
        return paths
    if isinstance(value, str):
        if value.lower().endswith((".wav", ".mp3", ".flac", ".ogg", ".m4a")):
            paths.append(value)
        return paths
    if isinstance(value, dict):
        for key in ("path", "audio_path", "filename", "file", "output"):
            paths.extend(_collect_audio_paths(value.get(key)))
        for key in ("audios", "audio", "outputs", "files"):
            paths.extend(_collect_audio_paths(value.get(key)))
        return paths
    if isinstance(value, (list, tuple)):
        for item in value:
            paths.extend(_collect_audio_paths(item))
        return paths

    for attr in ("audios", "audio", "outputs", "files", "path", "audio_path"):
        if hasattr(value, attr):
            paths.extend(_collect_audio_paths(getattr(value, attr)))

    return paths


def _validate_dit_handler(dit_handler) -> bool:
    """DiT handler'ın tüm bileşenlerinin tam olarak yüklendiğini doğrula."""
    checks = []
    
    # 1. Model nesnesi var mı?
    model = getattr(dit_handler, "model", None)
    checks.append(("model", model is not None))
    
    if model is None:
        print("[VALIDATE] FAIL: dit_handler.model is None")
        return False
    
    # 2. ace_step_transformer var mı?
    transformer = getattr(model, "ace_step_transformer", None)
    checks.append(("ace_step_transformer", transformer is not None))
    
    # 3. tokenizer var mı?
    tokenizer = getattr(transformer, "tokenizer", None) if transformer else None
    checks.append(("tokenizer", tokenizer is not None))
    
    # 4. quantizer var mı?
    quantizer = getattr(tokenizer, "quantizer", None) if tokenizer else None
    checks.append(("quantizer", quantizer is not None))
    
    # 5. VAE decoder var mı?
    vae = getattr(model, "vae", None) or getattr(model, "vae_decoder", None)
    checks.append(("vae", vae is not None))
    
    # 6. enable_generate flag'i doğrudan kontrol et
    enable_gen = getattr(dit_handler, "enable_generate", None)
    checks.append(("enable_generate", enable_gen is True or enable_gen is None))
    
    # 7. is_initialized flag kontrolü
    is_init = getattr(dit_handler, "is_initialized", None)
    checks.append(("is_initialized", is_init is True or is_init is None))
    
    # 8. service_initialized flag kontrolü
    svc_init = getattr(dit_handler, "service_initialized", None)
    checks.append(("service_initialized", svc_init is True or svc_init is None))
    
    all_passed = True
    for name, passed in checks:
        status = "OK" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False
    
    return all_passed

# ---------------------------------------------------------
# Model Sınıfı (GPU Sınıfı)
# ---------------------------------------------------------
@app.cls(
    gpu="L4",
    image=acestep_image,
    volumes={"/models": models_volume},
    scaledown_window=300,
    timeout=600,
)
class AceStepModel:
    @modal.enter()
    def load_model(self):
        # ACE-Step modüllerini Python path'e ekle
        sys.path.insert(0, "/app/ACE-Step-1.5")
        
        # Checkpoints dizinini oluştur ve repo içine symlink bağla
        os.makedirs("/models/checkpoints", exist_ok=True)
        os.makedirs("/models/outputs", exist_ok=True)
        
        repo_checkpoints_dir = "/app/ACE-Step-1.5/checkpoints"
        if os.path.exists(repo_checkpoints_dir):
            if os.path.islink(repo_checkpoints_dir):
                os.unlink(repo_checkpoints_dir)
            else:
                shutil.rmtree(repo_checkpoints_dir)
        os.symlink("/models/checkpoints", repo_checkpoints_dir)
        
        print("[OK] Symlink to Volume checkpoints directory established.")
        
        # Gerekli kütüphaneleri import et
        from acestep.handler import AceStepHandler
        from acestep.llm_inference import LLMHandler
        from acestep.model_downloader import ensure_lm_model, ensure_main_model
        
        # L4 GPU için SDP Attention ayarlarını yapalım
        torch.backends.cuda.enable_flash_sdp(False)
        torch.backends.cuda.enable_mem_efficient_sdp(True)
        torch.backends.cuda.enable_math_sdp(True)
        
        checkpoints_dir = "/models/checkpoints"
        lm_model_name = "acestep-5Hz-lm-1.7B"
        
        # -------------------------------------------------------
        # FORCE_REDOWNLOAD: Eski/bozuk Volume cache'i temizle
        # Bu satırı "False" yaparak sonraki deploy'larda atlanabilir
        # -------------------------------------------------------
        FORCE_REDOWNLOAD = False
        if FORCE_REDOWNLOAD:
            print("[CLEANUP] Eski model cache temizleniyor (FORCE_REDOWNLOAD=True)...")
            for item in os.listdir(checkpoints_dir):
                item_path = os.path.join(checkpoints_dir, item)
                try:
                    if os.path.isdir(item_path):
                        shutil.rmtree(item_path)
                    else:
                        os.remove(item_path)
                    print(f"  Silindi: {item}")
                except Exception as e:
                    print(f"  Silinemedi: {item} -> {e}")
            models_volume.commit()
            print("[CLEANUP] Volume cache temizlendi.")
        
        ensure_main_model(checkpoints_dir=checkpoints_dir)
        ensure_lm_model(model_name=lm_model_name, checkpoints_dir=checkpoints_dir)
        models_volume.commit()

        # DiT handler'ı initialize et
        self.dit_handler = AceStepHandler()
        print("Initializing DiT handler...")
        status, success = self.dit_handler.initialize_service(
            project_root="/app/ACE-Step-1.5",
            config_path="acestep-v15-turbo",
            device="cuda"
        )
        print(f"[INIT] DiT handler result - Status: {status}, Success: {success}")
        if not success:
            raise RuntimeError(f"DiT model initialization failed: {status}")

        # LLM handler'ı initialize et
        self.llm_handler = LLMHandler()
        print("Initializing LLM handler...")
        lm_status, lm_success = self.llm_handler.initialize(
            checkpoint_dir=checkpoints_dir,
            lm_model_path=lm_model_name,
            backend="pt",
            device="cuda"
        )
        print(f"[INIT] LLM handler result - Status: {lm_status}, Success: {lm_success}")
        if not lm_success:
            raise RuntimeError(f"LM initialization failed: {lm_status}")

        # Quantizer float32 düzeltmesi (Notebook Bug Fix #9)
        try:
            quantizer = self.dit_handler.model.ace_step_transformer.tokenizer.quantizer
            quantizer.float()
            print("[OK] Quantizer promoted to float32 successfully.")
        except Exception as e:
            print(f"[WARN] Could not promote quantizer to float32: {e}")


        # GPU bellek durumu
        if torch.cuda.is_available():
            allocated = torch.cuda.memory_allocated() / 1024**3
            reserved = torch.cuda.memory_reserved() / 1024**3
            total = torch.cuda.get_device_properties(0).total_memory / 1024**3
            print(f"[GPU] Memory: {allocated:.1f}GB allocated / {reserved:.1f}GB reserved / {total:.1f}GB total")
        
        print("[OK] Tüm modeller başarıyla yüklendi. Container hazır.")

    @modal.method()
    def generate(self, params_dict: dict, base_url: str) -> dict:
        import sys
        sys.path.insert(0, "/app/ACE-Step-1.5")
        
        from acestep.inference import GenerationParams, GenerationConfig, generate_music
        
        # İstek parametrelerini oku
        req = MusicGenerateRequest(**params_dict)
        
        print(f"[GENERATE] Yeni istek: task={req.task_type}, caption='{req.caption[:60]}...', "
              f"duration={req.duration}s, thinking={req.thinking}, steps={req.inference_steps}")
        
        # Geçici giriş dosyalarını oluştur (varsa)
        src_audio_path = None
        if req.src_audio_b64:
            src_audio_path = os.path.join(tempfile.gettempdir(), f"src_{uuid.uuid4().hex}.wav")
            with open(src_audio_path, "wb") as f:
                f.write(base64.b64decode(req.src_audio_b64))
                
        ref_audio_path = None
        if req.reference_audio_b64:
            ref_audio_path = os.path.join(tempfile.gettempdir(), f"ref_{uuid.uuid4().hex}.wav")
            with open(ref_audio_path, "wb") as f:
                f.write(base64.b64decode(req.reference_audio_b64))
        
        # Tohum (seed) belirleme
        base_seed = req.seed
        if base_seed < 0:
            base_seed = random.randint(0, 2**32 - 1)
            
        tracks = []
        statuses = []
        
        for i in range(req.num_tracks):
            track_seed = base_seed + i
            print(f"[GENERATE] Track {i+1}/{req.num_tracks} - seed={track_seed}")
            
            # GenerationParams nesnesi oluştur
            g_params = GenerationParams(
                task_type=req.task_type,
                caption=req.caption,
                lyrics=req.lyrics,
                instrumental=req.instrumental,
                vocal_language=req.vocal_language,
                bpm=req.bpm,
                keyscale=req.keyscale,
                timesignature=req.timesignature,
                duration=req.duration,
                inference_steps=req.inference_steps,
                seed=track_seed,
                guidance_scale=req.guidance_scale,
                shift=req.shift,
                infer_method=req.infer_method,
                audio_cover_strength=req.audio_cover_strength,
                repainting_start=req.repainting_start,
                repainting_end=req.repainting_end,
                src_audio=src_audio_path,
                reference_audio=ref_audio_path,
                thinking=req.thinking,
                lm_temperature=req.lm_temperature,
                lm_cfg_scale=req.lm_cfg_scale,
                lm_top_k=req.lm_top_k,
                lm_top_p=req.lm_top_p,
                lm_negative_prompt=req.lm_negative_prompt,
                use_cot_metas=True,
                use_cot_caption=True,
                use_cot_language=True
            )
            
            g_config = GenerationConfig(
                batch_size=1,
                use_random_seed=False,
                seeds=[track_seed]
            )
            
            # Müzik üretimi (SDK generate_music)
            output_dir = tempfile.mkdtemp()
            try:
                # generate_music çağrısı
                print(f"[GENERATE] generate_music çağrılıyor... (save_dir={output_dir})")
                result = generate_music(
                    dit_handler=self.dit_handler,
                    llm_handler=self.llm_handler if req.thinking else None,
                    params=g_params,
                    config=g_config,
                    save_dir=output_dir
                )
                
                # Sonuç detaylarını logla
                print(f"[GENERATE] Sonuç tipi: {type(result)}")
                if hasattr(result, '__dict__'):
                    print(f"[GENERATE] Sonuç attrs: {list(result.__dict__.keys())}")
                    if hasattr(result, 'success'):
                        print(f"[GENERATE] success={result.success}")
                    if hasattr(result, 'status_message'):
                        print(f"[GENERATE] status_message={result.status_message}")
                    if hasattr(result, 'error'):
                        print(f"[GENERATE] error={result.error}")
                    if hasattr(result, 'audios'):
                        print(f"[GENERATE] audios count={len(result.audios) if result.audios else 0}")
                elif isinstance(result, dict):
                    print(f"[GENERATE] Sonuç dict keys: {list(result.keys())}")
                
                # Çıktı sonucunu kontrol et
                if not _result_success(result):
                    error_msg = _result_status(result)
                    print(f"[GENERATE] BAŞARISIZ: {error_msg}")
                    raise RuntimeError(f"Müzik üretimi başarısız oldu: {error_msg}")

                audio_paths = _collect_audio_paths(result)
                if not audio_paths:
                    for root, _, files in os.walk(output_dir):
                        for file_name in files:
                            if file_name.lower().endswith((".wav", ".mp3", ".flac", ".ogg", ".m4a")):
                                audio_paths.append(os.path.join(root, file_name))

                print(f"[GENERATE] Bulunan ses dosyaları: {audio_paths}")

                if not audio_paths:
                    raise FileNotFoundError("Müzik üretildi ancak çıktı ses dosyası bulunamadı.")

                # İlk üretilen ses dosyasını al
                temp_audio_path = audio_paths[0]
                if not os.path.exists(temp_audio_path):
                    raise FileNotFoundError(f"Üretilen ses dosyası diskte bulunamadı: {temp_audio_path}")
                
                # FFMPEG ile MP3'e dönüştür
                output_filename = f"gen_{uuid.uuid4().hex}.mp3"
                final_output_path = f"/models/outputs/{output_filename}"
                
                subprocess.run([
                    "ffmpeg", "-y", "-i", temp_audio_path,
                    "-codec:a", "libmp3lame", "-b:a", "192k", final_output_path
                ], check=True, capture_output=True)
                
                # Volume'e commit et
                models_volume.commit()
                
                # URL birleştirme (trailing slash güvenliği)
                clean_base = base_url.rstrip("/") + "/"
                public_url = clean_base + f"audio/{output_filename}"
                tracks.append({
                    "url": public_url,
                    "seed": track_seed,
                    "filename": output_filename
                })
                statuses.append(f"OK Track {i+1}: Success (Seed: {track_seed})")
                print(f"[GENERATE] Track {i+1} başarılı: {public_url}")
                
            except Exception as e:
                import traceback
                traceback.print_exc()
                statuses.append(f"FAIL Track {i+1}: Failed ({str(e)})")
                print(f"[GENERATE] Track {i+1} BAŞARISIZ: {e}")
            finally:
                # Geçici klasörü temizle
                shutil.rmtree(output_dir, ignore_errors=True)
                
        # Giriş dosyalarını temizle
        if src_audio_path and os.path.exists(src_audio_path):
            os.remove(src_audio_path)
        if ref_audio_path and os.path.exists(ref_audio_path):
            os.remove(ref_audio_path)
            
        return {
            "success": len(tracks) > 0,
            "tracks": tracks,
            "status": "\n".join(statuses),
            "base_seed": base_seed
        }

# ---------------------------------------------------------
# FastAPI ASGI Web Server (Model Entegrasyonu)
# ---------------------------------------------------------
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

web_app = FastAPI(title="SiNU-BeatMaker AI Studio Modal API")

web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@web_app.post("/generate")
def generate_music_api(req: MusicGenerateRequest, request: Request):
    """
    Müzik üretme isteklerini alır ve AceStepModel GPU worker'ına iletir.
    """
    model = AceStepModel()
    base_url = str(request.base_url)
    
    # GPU model metodunu çağırıyoruz (Pydantic v2: model_dump())
    result = model.generate.remote(req.model_dump(), base_url)
    return result

@web_app.get("/audio/{filename}")
def get_audio_file(filename: str):
    """
    Üretilen ses dosyalarını Volume'den okuyup sunar.
    """
    file_path = f"/models/outputs/{filename}"
    if not os.path.exists(file_path):
        # Dosyayı bulmak için volume'u refresh edelim (belki diğer container'da üretildi)
        models_volume.reload()
        
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    
    raise HTTPException(status_code=404, detail="Audio file not found")

@web_app.get("/status")
def status_api():
    return {"status": "online", "model": "acestep-v15-xl-turbo"}

@app.function(image=acestep_image, volumes={"/models": models_volume})
@modal.asgi_app()
def asgi_app():
    return web_app
