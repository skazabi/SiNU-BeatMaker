// BEATFORGE - AI Music Studio JS Logic

// Kullanıcı bilgilerini göster
const currentUser = getCurrentUser();
if (currentUser) {
    document.getElementById('welcomeUser').textContent = `Hoş geldin, ${currentUser.nickname || currentUser.username}`;
}

// ---------------------------------------------------------
// Akordeon & Arayüz Değişiklikleri
// ---------------------------------------------------------
function toggleAccordion() {
    const content = document.getElementById('accordionContent');
    const icon = document.getElementById('accordionIcon');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.innerText = '▼';
    } else {
        content.style.display = 'none';
        icon.innerText = '▶';
    }
}

function toggleThinkingFields() {
    const isThinking = document.getElementById('aiThinking').checked;
    const lmModelGroup = document.getElementById('lmModelGroup');
    if (isThinking) {
        lmModelGroup.style.opacity = '1';
        lmModelGroup.style.pointerEvents = 'auto';
    } else {
        lmModelGroup.style.opacity = '0.5';
        lmModelGroup.style.pointerEvents = 'none';
    }
}

function toggleTaskFields(taskType) {
    // Radio butonların sınıflarını güncelle
    document.getElementById('lblText2Music').classList.remove('active');
    document.getElementById('lblCover').classList.remove('active');
    document.getElementById('lblRepaint').classList.remove('active');

    const uploadSection = document.getElementById('audioUploadSection');
    const repaintSection = document.getElementById('repaintSettingsSection');

    if (taskType === 'text2music') {
        document.getElementById('lblText2Music').classList.add('active');
        uploadSection.style.display = 'none';
        repaintSection.style.display = 'none';
    } else if (taskType === 'cover') {
        document.getElementById('lblCover').classList.add('active');
        uploadSection.style.display = 'block';
        repaintSection.style.display = 'none';
    } else if (taskType === 'repaint') {
        document.getElementById('lblRepaint').classList.add('active');
        uploadSection.style.display = 'block';
        repaintSection.style.display = 'block';
    }
}

function setInstrumental() {
    const lyricsField = document.getElementById('aiLyrics');
    lyricsField.value = '[Instrumental]';
    showToast("Müzik enstrümantal (sözsüz) olarak ayarlandı.");
}

// ---------------------------------------------------------
// Rastgele Prompt Üretici (Dice)
// ---------------------------------------------------------
const sampleCaptions = [
    "Upbeat 80s synth-pop, bright analog synthesizers, retro drum machine, driving bassline, euphoric mood.",
    "Melancholic acoustic guitar ballad, warm female vocals, soft piano accompaniment, intimate studio recording, emotional.",
    "Lofi hip hop loop, jazzy rhodes piano, crisp vinyl crackle, laid-back boom bap drums, relaxed vibe.",
    "Energetic techno beat, pulsating acid bassline, heavy industrial kick, dynamic percussion, dark atmosphere.",
    "Epic cinematic orchestral track, swelling strings, dramatic brass, powerful taiko drums, building tension.",
    "Dreamy bedroom pop, chorus-soaked electric guitar, warm synth pads, airy vocals, nostalgia."
];

function getRandomCaption() {
    const currentCaption = document.getElementById('aiCaption').value;
    let newCaption = sampleCaptions[Math.floor(Math.random() * sampleCaptions.length)];
    // Aynı caption'ın tekrar gelmesini engelle
    while (newCaption === currentCaption) {
        newCaption = sampleCaptions[Math.floor(Math.random() * sampleCaptions.length)];
    }
    document.getElementById('aiCaption').value = newCaption;
    showToast("Yeni tarz taslağı eklendi! 🎲");
}

// Toast Bildirimi
function showToast(message) {
    const toast = document.getElementById('toastNotification');
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, 3000);
}

// ---------------------------------------------------------
// Dosyayı Base64'e Dönüştürme Yardımcısı
// ---------------------------------------------------------
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // "data:audio/wav;base64," kısmını ayıkla
            const base64Str = reader.result.split(',')[1];
            resolve(base64Str);
        };
        reader.onerror = error => reject(error);
    });
}

// ---------------------------------------------------------
// API İstekleri & Polling
// ---------------------------------------------------------
const aiForm = document.getElementById('aiGenerationForm');
let pollInterval = null;

aiForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const taskType = document.querySelector('input[name="task_type"]:checked').value;
    const caption = document.getElementById('aiCaption').value.trim();
    const lyrics = document.getElementById('aiLyrics').value.trim();
    const bpmInput = document.getElementById('aiBpm').value;
    const keyscale = document.getElementById('aiKey').value;
    const timesignature = document.getElementById('aiTimeSignature').value;
    const language = document.getElementById('aiLanguage').value;
    const duration = parseFloat(document.getElementById('aiDuration').value);
    
    // Gelişmiş Ayarlar
    const thinking = document.getElementById('aiThinking').checked;
    const lmModelPath = document.getElementById('aiLmModel').value;
    const steps = parseInt(document.getElementById('aiSteps').value);
    const seed = parseInt(document.getElementById('aiSeed').value);
    const shift = parseFloat(document.getElementById('aiShift').value);
    const coverStrength = parseFloat(document.getElementById('aiCoverStrength').value);
    const inferMethod = document.querySelector('input[name="infer_method"]:checked').value;
    
    // Repaint Ayarları
    const repaintStart = parseFloat(document.getElementById('aiRepaintStart').value);
    const repaintEnd = parseFloat(document.getElementById('aiRepaintEnd').value);
    
    // Multi-track
    const numTracks = parseInt(document.getElementById('aiTracks').value);

    // Enstrümantal kontrolü
    const isInstrumental = lyrics.toLowerCase().includes('[instrumental]');

    // Dosya okumaları
    let srcAudioB64 = null;
    let refAudioB64 = null;

    // Cover veya Repaint ise dosya zorunluluğunu doğrula
    if (taskType !== 'text2music') {
        const srcFile = document.getElementById('srcAudioFile').files[0];
        if (!srcFile) {
            alert("Lütfen bir Kaynak Ses Dosyası (Source Audio) yükleyin.");
            return;
        }
        srcAudioB64 = await fileToBase64(srcFile);
        
        const refFile = document.getElementById('refAudioFile').files[0];
        if (refFile) {
            refAudioB64 = await fileToBase64(refFile);
        }
    }

    // İstek gövdesi hazırlığı
    const payload = {
        task_type: taskType,
        caption: caption,
        lyrics: lyrics,
        instrumental: isInstrumental,
        vocal_language: language || "unknown",
        bpm: bpmInput ? parseInt(bpmInput) : null,
        keyscale: keyscale,
        timesignature: timesignature,
        duration: duration,
        inference_steps: steps,
        seed: seed,
        guidance_scale: 7.0, // Turbo için CFG sabit/devre dışı
        shift: shift,
        infer_method: inferMethod,
        audio_cover_strength: coverStrength,
        thinking: thinking,
        lm_model_path: lmModelPath,
        lm_temperature: 0.85,
        lm_cfg_scale: 2.0,
        lm_top_k: 0,
        lm_top_p: 0.9,
        lm_negative_prompt: "NO USER INPUT",
        repainting_start: repaintStart,
        repainting_end: repaintEnd,
        src_audio_b64: srcAudioB64,
        reference_audio_b64: refAudioB64,
        num_tracks: numTracks
    };

    // Arayüzü yükleme durumuna geçir
    setLoadingState(true);

    try {
        const response = await fetch(`${API_URL}/music/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Müzik üretim isteği sunucu tarafından reddedildi.");
        }

        const data = await response.json();
        const taskId = data.task_id;
        
        showToast("Müzik üretimi sıraya alındı! 🚀");
        startPolling(taskId);

    } catch (err) {
        console.error("Hata:", err);
        alert("Müzik üretim talebi gönderilirken hata oluştu: " + err.message);
        setLoadingState(false);
    }
});

function setLoadingState(isLoading) {
    const btn = document.getElementById('btnGenerate');
    const statusContainer = document.getElementById('statusContainer');
    
    if (isLoading) {
        btn.disabled = true;
        btn.classList.add('btn-disabled');
        document.getElementById('btnText').innerText = "⌛ Üretim Sürüyor...";
        statusContainer.style.display = 'block';
        updateProgressBar(5); // Başlangıç barı
    } else {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
        document.getElementById('btnText').innerText = "🎵 Müzik Üret (Generate)";
        statusContainer.style.display = 'none';
        updateProgressBar(0);
    }
}

function updateProgressBar(percent) {
    document.getElementById('progressBarAi').style.width = `${percent}%`;
}

// ---------------------------------------------------------
// Polling Mekanizması
// ---------------------------------------------------------
function startPolling(taskId) {
    if (pollInterval) clearInterval(pollInterval);
    
    let progressPercent = 5;
    let isPolling = false;
    
    pollInterval = setInterval(async () => {
        if (isPolling) return;
        isPolling = true;
        
        try {
            // Görev durumunu al
            const statusData = await getTaskStatusAPI(taskId);
            if (!statusData) return;

            console.log("Task Status:", statusData.status);
            
            // Progress Bar'ı simüle et/güncelle
            if (statusData.status === 'pending') {
                if (progressPercent < 85) progressPercent += 3;
                updateProgressBar(progressPercent);
                document.getElementById('statusTitle').innerText = "Kuyrukta Bekliyor...";
                document.getElementById('statusMsg').innerText = "Yapay zeka modeli hazırlanıyor. Bu aşamada sunucunun uyanması (cold start) bekleniyor olabilir.";
            } else if (statusData.status === 'processing') {
                if (progressPercent < 95) progressPercent += 1;
                updateProgressBar(progressPercent);
                document.getElementById('statusTitle').innerText = "Müzik Sentezleniyor...";
                document.getElementById('statusMsg').innerText = "Model tınıyı oluşturuyor ve ses dalgalarına döküyor.";
            } else if (statusData.status === 'completed') {
                clearInterval(pollInterval);
                updateProgressBar(100);
                document.getElementById('statusTitle').innerText = "Üretim Tamamlandı!";
                
                // Sonucu al ve ekrana çiz
                const result = await getTaskResultAPI(taskId);
                renderResults(result);
                setLoadingState(false);
                showToast("Şarkınız hazır! 🎧");
                
            } else if (statusData.status === 'failed') {
                clearInterval(pollInterval);
                updateProgressBar(100);
                document.getElementById('progressBarAi').style.background = '#ff4444';
                document.getElementById('statusTitle').innerText = "❌ Üretim Başarısız Oldu";
                const errorMsg = statusData.error || "Bilinmeyen sunucu hatası.";
                document.getElementById('statusMsg').innerText = errorMsg;
                
                // Hata kartını sonuç listesine de ekle
                const resultsList = document.getElementById('resultsList');
                const emptyResults = document.getElementById('emptyResults');
                if (emptyResults) emptyResults.remove();
                
                const errorCard = document.createElement('div');
                errorCard.className = 'ai-track-card';
                errorCard.innerHTML = `
                    <div class="card-header-ai" style="border-left: 3px solid #ff4444;">
                        <span class="track-tag-ai" style="background: #ff4444;">❌ Hata</span>
                    </div>
                    <div class="card-body-ai">
                        <p style="color: #ff8888; font-size: 0.9rem; word-break: break-word;">${errorMsg}</p>
                        <p style="color: #888; font-size: 0.8rem; margin-top: 8px;">Tekrar denemenizi öneriyoruz. Sorun devam ederse Modal dashboard loglarını kontrol edin.</p>
                    </div>
                `;
                resultsList.insertBefore(errorCard, resultsList.firstChild);
                
                // 5 saniye sonra loading state'i kaldır
                setTimeout(() => setLoadingState(false), 5000);
                showToast("Müzik üretimi başarısız oldu! ❌");
            }
            
        } catch (err) {
            console.error("Polling Hatası:", err);
        } finally {
            isPolling = false;
        }
    }, 3000);
}

// ---------------------------------------------------------
// Üretilen Kartları Ekrana Çizme
// ---------------------------------------------------------
function renderResults(result, isHistory = false) {
    const resultsList = document.getElementById('resultsList');
    const emptyResults = document.getElementById('emptyResults');
    
    if (emptyResults) emptyResults.remove();

    if (!result || !result.tracks || result.tracks.length === 0) {
        if (!isHistory) {
            resultsList.innerHTML = `<div class="empty-results-ai"><h3>Üretim başarısız</h3><p>Ses verisi alınamadı.</p></div>`;
        }
        return;
    }

    // Yeni üretilmişse localStorage'a kaydet
    if (!isHistory) {
        let history = JSON.parse(localStorage.getItem('ai_music_history') || '[]');
        history = [...result.tracks, ...history];
        localStorage.setItem('ai_music_history', JSON.stringify(history));
    }

    // Her yeni üretimi ekle
    result.tracks.forEach((track, index) => {
        const card = document.createElement('div');
        card.className = 'ai-track-card';
        
        let displayIndex = isHistory ? 'Geçmiş' : `#${index + 1}`;
        
        card.innerHTML = `
            <div class="card-glow-bg"></div>
            <div class="card-header-ai">
                <span class="track-tag-ai">AI Track ${displayIndex}</span>
                <span class="seed-tag-ai">Seed: ${track.seed}</span>
            </div>
            <div class="card-body-ai">
                <audio controls class="ai-audio-player">
                    <source src="${track.url}" type="audio/mpeg">
                    Tarayıcınız ses elemanını desteklemiyor.
                </audio>
            </div>
            <div class="card-footer-ai">
                <a href="${track.url}" target="_blank" download="${track.filename}" class="card-btn-ai download-btn-ai">💾 İndir (MP3)</a>
                <button onclick="importToSequencer('${track.url}')" class="card-btn-ai import-btn-ai">🎹 Sequencer'a Aktar</button>
            </div>
        `;
        
        // Geçmişten geliyorsa sırayı koruyarak alta ekle, yeni üretildiyse en üste koy
        if (isHistory) {
            resultsList.appendChild(card);
        } else {
            resultsList.insertBefore(card, resultsList.firstChild);
        }
    });
}

// Beatmaker'a aktarma köprüsü
function importToSequencer(audioUrl) {
    localStorage.setItem('import_ai_audio_url', audioUrl);
    showToast("Ses panoya kopyalandı, Sequencer'a yönlendiriliyorsunuz...");
    setTimeout(() => {
        window.location.href = 'beatmaker.html';
    }, 1500);
}

// ---------------------------------------------------------
// Sayfa Yüklendiğinde Geçmişi Getir
// ---------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    let history = JSON.parse(localStorage.getItem('ai_music_history') || '[]');
    if (history.length > 0) {
        renderResults({ tracks: history }, true);
    }
});
