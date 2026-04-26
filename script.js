/**
 * SiNUbeatmaker - Script.js (Studio Logic - Firebase Firestore)
 */

const user = getCurrentUser();
if (user) {
    document.getElementById('welcomeUser').textContent = `Hoş geldin, ${user.nickname || user.username}`;
}

// --- Custom Dialog Functions (replace native prompt/alert/confirm) ---
function showInputDialog(title, placeholder) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customInputModal');
        const input = document.getElementById('customInputField');
        const okBtn = document.getElementById('customInputOk');
        const cancelBtn = document.getElementById('customInputCancel');
        
        document.getElementById('customInputTitle').textContent = title;
        input.value = '';
        input.placeholder = placeholder || '';
        modal.style.display = 'flex';
        setTimeout(() => input.focus(), 100);
        
        function cleanup() {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            input.removeEventListener('keydown', onKey);
        }
        function onOk() { const val = input.value.trim(); cleanup(); resolve(val || null); }
        function onCancel() { cleanup(); resolve(null); }
        function onKey(e) { if (e.key === 'Enter') onOk(); if (e.key === 'Escape') onCancel(); }
        
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        input.addEventListener('keydown', onKey);
    });
}

function showAlertDialog(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlertModal');
        const okBtn = document.getElementById('customAlertOk');
        
        document.getElementById('customAlertMessage').textContent = message;
        modal.style.display = 'flex';
        
        function onOk() {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            resolve();
        }
        okBtn.addEventListener('click', onOk);
    });
}

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const okBtn = document.getElementById('customConfirmOk');
        const cancelBtn = document.getElementById('customConfirmCancel');
        
        document.getElementById('customConfirmMessage').textContent = message;
        modal.style.display = 'flex';
        
        function cleanup() {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
        }
        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }
        
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const dest = audioCtx.createMediaStreamDestination(); // For recording the mix

// Re-route SoundEngine to connect to both destination (speakers) and dest (recorder)
const connectToMix = (source) => {
    source.connect(audioCtx.destination);
    source.connect(dest);
}

const SoundEngine = {
    playKick: (time) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        connectToMix(gain);
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time); osc.stop(time + 0.5);
    },
    playSnare: (time) => {
        const noiseOsc = audioCtx.createBufferSource();
        const bufferSize = audioCtx.sampleRate * 0.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        noiseOsc.buffer = buffer;
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1000;
        noiseOsc.connect(noiseFilter);
        const noiseEnvelope = audioCtx.createGain();
        noiseFilter.connect(noiseEnvelope);
        connectToMix(noiseEnvelope);
        noiseEnvelope.gain.setValueAtTime(1, time); noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noiseOsc.start(time);
        
        const osc = audioCtx.createOscillator(); const oscEnvelope = audioCtx.createGain();
        osc.type = 'triangle'; osc.connect(oscEnvelope); connectToMix(oscEnvelope);
        osc.frequency.setValueAtTime(250, time); oscEnvelope.gain.setValueAtTime(0.7, time);
        oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.start(time); osc.stop(time + 0.2);
    },
    playHihat: (time) => {
        const fundamental = 40; const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
        const bandpass = audioCtx.createBiquadFilter(); bandpass.type = "bandpass"; bandpass.frequency.value = 10000;
        const highpass = audioCtx.createBiquadFilter(); highpass.type = "highpass"; highpass.frequency.value = 7000;
        const gainNode = audioCtx.createGain();
        ratios.forEach((ratio) => {
            const osc = audioCtx.createOscillator(); osc.type = "square"; osc.frequency.value = fundamental * ratio;
            osc.connect(bandpass); bandpass.connect(highpass); highpass.connect(gainNode);
            osc.start(time); osc.stop(time + 0.05);
        });
        connectToMix(gainNode);
        gainNode.gain.setValueAtTime(0.3, time); gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    },
    playTom: (time) => {
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); connectToMix(gain);
        osc.type = 'sine'; osc.frequency.setValueAtTime(150, time); osc.frequency.exponentialRampToValueAtTime(50, time + 0.3);
        gain.gain.setValueAtTime(0.8, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time); osc.stop(time + 0.3);
    },
    playClap: (time) => {
        const bufferSize = audioCtx.sampleRate * 0.15;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource(); noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1200;
        const gain = audioCtx.createGain(); gain.gain.setValueAtTime(0, time);
        gain.gain.setValueAtTime(1, time); gain.gain.setTargetAtTime(0, time + 0.01, 0.01);
        gain.gain.setValueAtTime(1, time + 0.02); gain.gain.setTargetAtTime(0, time + 0.03, 0.01);
        gain.gain.setValueAtTime(1, time + 0.04); gain.gain.setTargetAtTime(0, time + 0.15, 0.03);
        noise.connect(filter); filter.connect(gain); connectToMix(gain);
        noise.start(time);
    },
    playOpenhat: (time) => {
        const fundamental = 40; const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
        const bandpass = audioCtx.createBiquadFilter(); bandpass.type = "bandpass"; bandpass.frequency.value = 8000;
        const highpass = audioCtx.createBiquadFilter(); highpass.type = "highpass"; highpass.frequency.value = 5000;
        const gainNode = audioCtx.createGain();
        ratios.forEach((ratio) => {
            const osc = audioCtx.createOscillator(); osc.type = "square"; osc.frequency.value = fundamental * ratio;
            osc.connect(bandpass); bandpass.connect(highpass); highpass.connect(gainNode);
            osc.start(time); osc.stop(time + 0.3);
        });
        connectToMix(gainNode);
        gainNode.gain.setValueAtTime(0.3, time); gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    },
    playPerc: (time) => {
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); connectToMix(gain);
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, time); osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        gain.gain.setValueAtTime(0.5, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.start(time); osc.stop(time + 0.1);
    },
    playBass: (time) => {
        const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc.connect(gain); connectToMix(gain);
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(55, time);
        
        const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
        osc.disconnect(); osc.connect(filter); filter.connect(gain);
        
        gain.gain.setValueAtTime(0.8, time); gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time); osc.stop(time + 0.3);
    }
};

const instrumentsMap = {
    'kick': SoundEngine.playKick,
    'snare': SoundEngine.playSnare,
    'hihat': SoundEngine.playHihat,
    'tom': SoundEngine.playTom,
    'clap': SoundEngine.playClap,
    'openhat': SoundEngine.playOpenhat,
    'perc': SoundEngine.playPerc,
    'bass': SoundEngine.playBass
};

// Custom Sounds from Firestore
async function loadCustomSoundsToGrid() {
    try {
        const customSounds = await getCustomSounds();
        const sequencer = document.getElementById('sequencer');
        
        for (const sound of customSounds) {
            if(document.querySelector(`.track[data-instrument="${sound.id}"]`)) continue;
            
            let audioBuffer = null;
            if (sound.type === 'file' && sound.dataURL) {
                try {
                    const response = await fetch(sound.dataURL);
                    const arrayBuffer = await response.arrayBuffer();
                    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                } catch (e) {
                    console.error("Ses dosyası çözümlenemedi: ", sound.name, e);
                }
            }
            
            instrumentsMap[sound.id] = (time) => {
                if (audioBuffer) {
                    const source = audioCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    const gain = audioCtx.createGain();
                    source.connect(gain);
                    connectToMix(gain);
                    gain.gain.setValueAtTime(0.8, time);
                    source.start(time);
                } else {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.type = 'sawtooth';
                    osc.connect(gain);
                    connectToMix(gain);
                    osc.frequency.setValueAtTime(400, time);
                    osc.frequency.exponentialRampToValueAtTime(100, time + 0.2);
                    gain.gain.setValueAtTime(0.5, time);
                    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
                    osc.start(time); osc.stop(time + 0.2);
                }
            };
            
            const track = document.createElement('div');
            track.className = 'track custom-track';
            track.dataset.instrument = sound.id;
            track.innerHTML = `<div class="track-label">${sound.name}</div><div class="pads-container"></div>`;
            sequencer.appendChild(track);
            
            const container = track.querySelector('.pads-container');
            for (let i = 0; i < STEPS; i++) {
                const pad = document.createElement('div');
                pad.className = 'pad';
                pad.dataset.step = i;
                pad.addEventListener('click', () => {
                    pad.classList.toggle('active');
                    if(pad.classList.contains('active')) {
                         if (audioCtx.state === 'suspended') audioCtx.resume();
                         instrumentsMap[sound.id](audioCtx.currentTime);
                         pad.classList.add('playing');
                         setTimeout(() => pad.classList.remove('playing'), 100);
                    }
                });
                container.appendChild(pad);
            }
        }
    } catch (err) {
        console.error('Özel sesler yüklenirken hata:', err);
    }
}

// Sequencer
let STEPS = 16;
let isPlaying = false; let currentStep = 0; let bpm = 120; let nextNoteTime = 0.0; let timerID;

function renderGrid() {
    const stepIndicator = document.getElementById('stepIndicator');
    stepIndicator.innerHTML = '';
    for (let i = 0; i < STEPS; i++) {
        const dot = document.createElement('div'); dot.className = 'step-dot'; stepIndicator.appendChild(dot);
    }
    
    const stepNumbersContainer = document.getElementById('stepNumbersContainer');
    if (stepNumbersContainer) stepNumbersContainer.innerHTML = '';

    const tracks = document.querySelectorAll('.track');
    tracks.forEach(track => {
        // Skip the step indicator track
        if (track.classList.contains('step-indicator-track')) return;
        
        if (track.classList.contains('step-numbers-track')) {
            for (let i = 0; i < STEPS; i++) {
                const numPad = document.createElement('div');
                numPad.className = 'pad';
                numPad.style.background = 'transparent';
                numPad.style.border = 'none';
                numPad.style.color = 'var(--text-secondary)';
                numPad.style.fontSize = '0.8rem';
                numPad.style.display = 'flex';
                numPad.style.alignItems = 'center';
                numPad.style.justifyContent = 'center';
                numPad.style.cursor = 'default';
                numPad.innerText = (i + 1).toString();
                if (stepNumbersContainer) stepNumbersContainer.appendChild(numPad);
            }
            return;
        }
        
        const container = track.querySelector('.pads-container');
        if (!container) return;
        container.innerHTML = '';
        const instrument = track.dataset.instrument;
        for (let i = 0; i < STEPS; i++) {
            const pad = document.createElement('div');
            pad.className = 'pad'; pad.dataset.step = i;
            if (instrument === 'kick' && (i % 16 === 0 || i % 16 === 4 || i % 16 === 8 || i % 16 === 12)) pad.classList.add('active');
            if (instrument === 'hihat' && (i % 2 === 0)) pad.classList.add('active');
            if (instrument === 'snare' && (i % 16 === 4 || i % 16 === 12)) pad.classList.add('active');
            
            pad.addEventListener('click', () => {
                pad.classList.toggle('active');
                if(pad.classList.contains('active')) {
                     if (audioCtx.state === 'suspended') audioCtx.resume();
                     if (instrumentsMap[instrument]) instrumentsMap[instrument](audioCtx.currentTime);
                     pad.classList.add('playing');
                     setTimeout(() => pad.classList.remove('playing'), 100);
                }
            });
            container.appendChild(pad);
        }
    });
}
renderGrid();
loadCustomSoundsToGrid();

const stepSelect = document.getElementById('stepSelect');
if (stepSelect) {
    stepSelect.addEventListener('change', (e) => {
        STEPS = parseInt(e.target.value);
        currentStep = 0;
        renderGrid();
        loadCustomSoundsToGrid();
    });
}

function nextNote() {
    const secondsPerBeat = 60.0 / bpm; nextNoteTime += 0.25 * secondsPerBeat;
    currentStep++; if (currentStep >= STEPS) currentStep = 0;
}

function scheduleNote(stepNumber, time) {
    requestAnimationFrame(() => {
        document.querySelectorAll('.step-dot').forEach((dot, idx) => {
            if (idx === stepNumber) dot.classList.add('active'); else dot.classList.remove('active');
        });
    });

    document.querySelectorAll('.track').forEach(track => {
        if (track.classList.contains('step-numbers-track')) return;
        const instrument = track.dataset.instrument;
        if (!instrument) return;
        const pads = track.querySelectorAll('.pad');
        const pad = pads[stepNumber];
        if (pad && pad.classList.contains('active')) {
            if (instrumentsMap[instrument]) instrumentsMap[instrument](time);
            requestAnimationFrame(() => {
                pad.classList.add('playing');
                setTimeout(() => pad.classList.remove('playing'), 100);
            });
        }
    });
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        scheduleNote(currentStep, nextNoteTime); nextNote();
    }
    timerID = window.setTimeout(scheduler, 25.0);
}

// UI
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const bpmSlider = document.getElementById('bpmSlider');
const bpmValue = document.getElementById('bpmValue');

playBtn.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (isPlaying) {
        // Pause
        isPlaying = false;
        window.clearTimeout(timerID);
        playBtn.innerText = '▶';
        const vocalAudio = document.getElementById('vocalAudio');
        if (vocalAudio && vocalAudio.src && vocalAudio.src !== window.location.href) vocalAudio.pause();
        return;
    }
    
    isPlaying = true; currentStep = 0; nextNoteTime = audioCtx.currentTime + 0.05;
    scheduler();
    playBtn.innerText = '⏸';
    const vocalAudio = document.getElementById('vocalAudio');
    if (vocalAudio && vocalAudio.src && vocalAudio.src !== window.location.href) {
        vocalAudio.currentTime = 0;
        vocalAudio.play();
    }
});

stopBtn.addEventListener('click', () => {
    isPlaying = false; window.clearTimeout(timerID); currentStep = 0;
    document.querySelectorAll('.step-dot').forEach(dot => dot.classList.remove('active'));
    playBtn.innerText = '▶';
    const vocalAudio = document.getElementById('vocalAudio');
    if (vocalAudio && vocalAudio.src && vocalAudio.src !== window.location.href) {
        vocalAudio.pause();
        vocalAudio.currentTime = 0;
    }
});

clearBtn.addEventListener('click', () => {
    document.querySelectorAll('.pad').forEach(pad => pad.classList.remove('active'));
});

bpmSlider.addEventListener('input', (e) => { bpm = parseInt(e.target.value); bpmValue.textContent = bpm; });

// --- Save & Load Beats (Firebase Firestore) ---
document.getElementById('saveBeatBtn').addEventListener('click', async () => {
    const name = await showInputDialog('Ritim Kaydet', 'Ritmin için bir isim belirle...');
    if (!name) return;
    
    const beatData = [];
    document.querySelectorAll('.track').forEach(track => {
        if (track.classList.contains('step-indicator-track') || track.classList.contains('step-numbers-track')) return;
        const instrument = track.dataset.instrument;
        if (!instrument) return;
        const activeSteps = [];
        track.querySelectorAll('.pad').forEach((pad, idx) => {
            if (pad.classList.contains('active')) activeSteps.push(idx);
        });
        beatData.push({ instrument, activeSteps });
    });
    
    const beat = {
        id: 'beat_' + Date.now(),
        username: user.username,
        name: name,
        data: beatData,
        bpm: bpm,
        date: new Date().toISOString()
    };
    
    try {
        await saveBeat(beat);
        await showAlertDialog('Ritim başarıyla kaydedildi!');
    } catch (err) {
        console.error('Beat kaydetme hatası:', err);
        await showAlertDialog('Ritim kaydedilirken bir hata oluştu!');
    }
});

async function showMyBeats() {
    try {
        const myBeats = await getUserBeats(user.username);
        const list = document.getElementById('beatsList');
        list.innerHTML = '';
        
        if(myBeats.length === 0) {
            list.innerHTML = '<li>Henüz kaydedilmiş bir ritmin yok.</li>';
        } else {
            myBeats.forEach(beat => {
                const li = document.createElement('li');
                li.style.flexDirection = 'column';
                li.style.alignItems = 'flex-start';
                li.innerHTML = `
                    <div style="width: 100%; display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <strong>${beat.name} (${beat.bpm} BPM)</strong>
                        <span style="font-size:0.8rem; color:#aaa;">${new Date(beat.date).toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%;">
                        <button class="btn-primary btn-sm" onclick="loadBeat('${beat.id}')">Stüdyoya Yükle</button>
                        <button class="btn-danger btn-sm" onclick="deleteBeat('${beat.id}')" style="margin-left:auto;">Sil</button>
                    </div>
                `;
                list.appendChild(li);
            });
        }
        document.getElementById('myBeatsModal').style.display = 'flex';
    } catch (err) {
        console.error('Beatler yüklenirken hata:', err);
        showAlertDialog('Ritimler yüklenirken bir hata oluştu!');
    }
}

// --- Offline Audio Rendering & WAV Download ---

function playInstrumentOffline(ctx, instrument, time) {
    switch(instrument) {
        case 'kick':
            { const osc = ctx.createOscillator(); const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.frequency.setValueAtTime(150, time);
              osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
              gain.gain.setValueAtTime(1, time);
              gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
              osc.start(time); osc.stop(time + 0.5); }
            break;
        case 'snare':
            { const bufferSize = ctx.sampleRate * 0.2;
              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
              const noiseOsc = ctx.createBufferSource(); noiseOsc.buffer = buffer;
              const noiseFilter = ctx.createBiquadFilter();
              noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 1000;
              noiseOsc.connect(noiseFilter);
              const noiseEnvelope = ctx.createGain();
              noiseFilter.connect(noiseEnvelope); noiseEnvelope.connect(ctx.destination);
              noiseEnvelope.gain.setValueAtTime(1, time);
              noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
              noiseOsc.start(time);
              const osc = ctx.createOscillator(); const oscEnvelope = ctx.createGain();
              osc.type = 'triangle'; osc.connect(oscEnvelope); oscEnvelope.connect(ctx.destination);
              osc.frequency.setValueAtTime(250, time); oscEnvelope.gain.setValueAtTime(0.7, time);
              oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
              osc.start(time); osc.stop(time + 0.2); }
            break;
        case 'hihat':
            { const fundamental = 40; const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
              const bandpass = ctx.createBiquadFilter(); bandpass.type = 'bandpass'; bandpass.frequency.value = 10000;
              const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 7000;
              const gainNode = ctx.createGain();
              ratios.forEach(ratio => {
                  const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = fundamental * ratio;
                  osc.connect(bandpass); bandpass.connect(highpass); highpass.connect(gainNode);
                  osc.start(time); osc.stop(time + 0.05);
              });
              gainNode.connect(ctx.destination);
              gainNode.gain.setValueAtTime(0.3, time);
              gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05); }
            break;
        case 'openhat':
            { const fundamental = 40; const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];
              const bandpass = ctx.createBiquadFilter(); bandpass.type = 'bandpass'; bandpass.frequency.value = 8000;
              const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 5000;
              const gainNode = ctx.createGain();
              ratios.forEach(ratio => {
                  const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = fundamental * ratio;
                  osc.connect(bandpass); bandpass.connect(highpass); highpass.connect(gainNode);
                  osc.start(time); osc.stop(time + 0.3);
              });
              gainNode.connect(ctx.destination);
              gainNode.gain.setValueAtTime(0.3, time);
              gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3); }
            break;
        case 'tom':
            { const osc = ctx.createOscillator(); const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = 'sine'; osc.frequency.setValueAtTime(150, time);
              osc.frequency.exponentialRampToValueAtTime(50, time + 0.3);
              gain.gain.setValueAtTime(0.8, time);
              gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
              osc.start(time); osc.stop(time + 0.3); }
            break;
        case 'clap':
            { const bufferSize = ctx.sampleRate * 0.15;
              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
              const data = buffer.getChannelData(0);
              for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
              const noise = ctx.createBufferSource(); noise.buffer = buffer;
              const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1200;
              const gain = ctx.createGain(); gain.gain.setValueAtTime(0, time);
              gain.gain.setValueAtTime(1, time); gain.gain.setTargetAtTime(0, time + 0.01, 0.01);
              gain.gain.setValueAtTime(1, time + 0.02); gain.gain.setTargetAtTime(0, time + 0.03, 0.01);
              gain.gain.setValueAtTime(1, time + 0.04); gain.gain.setTargetAtTime(0, time + 0.15, 0.03);
              noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
              noise.start(time); }
            break;
        case 'perc':
            { const osc = ctx.createOscillator(); const gain = ctx.createGain();
              osc.connect(gain); gain.connect(ctx.destination);
              osc.type = 'triangle'; osc.frequency.setValueAtTime(400, time);
              osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
              gain.gain.setValueAtTime(0.5, time);
              gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
              osc.start(time); osc.stop(time + 0.1); }
            break;
        case 'bass':
            { const osc = ctx.createOscillator(); const gain = ctx.createGain();
              const filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
              filter.frequency.setValueAtTime(800, time);
              filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
              osc.type = 'sawtooth'; osc.frequency.setValueAtTime(55, time);
              osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
              gain.gain.setValueAtTime(0.8, time);
              gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
              osc.start(time); osc.stop(time + 0.3); }
            break;
    }
}

function audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    
    let interleaved;
    if (numChannels === 2) {
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);
        interleaved = new Float32Array(left.length * 2);
        for (let i = 0; i < left.length; i++) {
            interleaved[i * 2] = left[i];
            interleaved[i * 2 + 1] = right[i];
        }
    } else {
        interleaved = buffer.getChannelData(0);
    }
    
    const dataLength = interleaved.length * (bitDepth / 8);
    const totalLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);
    
    const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
    
    writeStr(0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);
    
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
        const sample = Math.max(-1, Math.min(1, interleaved[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

function audioBufferToMp3(buffer) {
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const kbps = 128;
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];
    
    const left = buffer.getChannelData(0);
    const right = channels > 1 ? buffer.getChannelData(1) : left;
    const sampleBlockSize = 1152;
    const length = left.length;
    
    // Convert Float32 to Int16
    const leftInt = new Int16Array(length);
    const rightInt = new Int16Array(length);
    for (let i = 0; i < length; i++) {
        leftInt[i] = Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767)));
        rightInt[i] = Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767)));
    }
    
    for (let i = 0; i < length; i += sampleBlockSize) {
        const leftChunk = leftInt.subarray(i, Math.min(i + sampleBlockSize, length));
        const rightChunk = rightInt.subarray(i, Math.min(i + sampleBlockSize, length));
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
    }
    
    const end = mp3encoder.flush();
    if (end.length > 0) mp3Data.push(end);
    
    return new Blob(mp3Data, { type: 'audio/mp3' });
}

async function downloadBeatAsAudio(beatId) {
    try {
        const beat = await getBeat(beatId);
        if (!beat) { await showAlertDialog('Ritim bulunamadı!'); return; }
        
        const beatBpm = beat.bpm || 120;
        const secondsPerBeat = 60.0 / beatBpm;
        const stepDuration = 0.25 * secondsPerBeat;
        
        // Determine step count from saved data
        let steps = 16;
        beat.data.forEach(t => {
            t.activeSteps.forEach(s => {
                if (s + 1 > steps) steps = Math.ceil((s + 1) / 16) * 16;
            });
        });
        
        const loops = 2;
        const totalDuration = steps * stepDuration * loops + 0.5;
        const sampleRate = 44100;
        
        const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
        
        // Schedule all notes for all loops
        for (let loop = 0; loop < loops; loop++) {
            for (let step = 0; step < steps; step++) {
                const time = (loop * steps + step) * stepDuration;
                beat.data.forEach(trackData => {
                    if (trackData.instrument && trackData.activeSteps.includes(step)) {
                        playInstrumentOffline(offlineCtx, trackData.instrument, time);
                    }
                });
            }
        }
        
        const renderedBuffer = await offlineCtx.startRendering();
        const mp3Blob = audioBufferToMp3(renderedBuffer);
        const url = URL.createObjectURL(mp3Blob);
        const fileName = `${beat.name.replace(/\s+/g, '_')}_${beatBpm}BPM.mp3`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        
    } catch (err) {
        console.error('Ses dosyası oluşturulurken hata:', err);
        await showAlertDialog('Ses dosyası oluşturulurken bir hata oluştu!');
    }
}

function closeModal() { document.getElementById('myBeatsModal').style.display = 'none'; }

async function loadBeat(id) {
    try {
        const beat = await getBeat(id);
        if (!beat) return;
        
        // Clear current
        document.querySelectorAll('.pad').forEach(pad => pad.classList.remove('active'));
        
        // Set BPM
        bpm = beat.bpm || 120;
        bpmSlider.value = bpm;
        bpmValue.textContent = bpm;
        
        // Load pads
        beat.data.forEach(trackData => {
            const track = document.querySelector(`.track[data-instrument="${trackData.instrument}"]`);
            if (track) {
                const pads = track.querySelectorAll('.pad');
                trackData.activeSteps.forEach(step => {
                    if(pads[step]) pads[step].classList.add('active');
                });
            }
        });
        
        closeModal();
    } catch (err) {
        console.error('Beat yükleme hatası:', err);
    }
}

async function deleteBeat(id) {
    const confirmed = await showConfirmDialog('Ritmi silmek istediğine emin misin?');
    if (confirmed) {
        try {
            await deleteBeatFromDB(id);
            showMyBeats();
        } catch (err) {
            console.error('Beat silme hatası:', err);
            await showAlertDialog('Ritim silinirken bir hata oluştu!');
        }
    }
}

// --- Audio Recording & External Vocal ---
const vocalUpload = document.getElementById('vocalUpload');
const vocalAudio = document.getElementById('vocalAudio');
let vocalSourceNode = null;

vocalUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        vocalAudio.src = url;
        vocalAudio.style.display = 'block';
        
        if (!vocalSourceNode) {
            vocalSourceNode = audioCtx.createMediaElementSource(vocalAudio);
            vocalSourceNode.connect(audioCtx.destination);
            vocalSourceNode.connect(dest);
        }
    }
});

let mediaRecorder;
let recordedChunks = [];
let currentWebmBlob = null;
const recordBtn = document.getElementById('recordBtn');
const recordBeatOnlyBtn = document.getElementById('recordBeatOnlyBtn');
const audioPlayback = document.getElementById('audioPlayback');
const playbackContainer = document.getElementById('playbackContainer');

// --- Recordings Storage ---
let myRecordings = [];

let recordingTimerInterval;
let recordingSeconds = 0;

function formatTimer(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function startRecordingTimer() {
    recordingSeconds = 0;
    const timerDisplay = document.getElementById('recordTimer');
    if (timerDisplay) {
        timerDisplay.style.display = 'block';
        timerDisplay.innerText = `Kayıt: ${formatTimer(recordingSeconds)}`;
        recordingTimerInterval = setInterval(() => {
            recordingSeconds++;
            timerDisplay.innerText = `Kayıt: ${formatTimer(recordingSeconds)}`;
        }, 1000);
    }
}

function stopRecordingTimer() {
    clearInterval(recordingTimerInterval);
    const timerDisplay = document.getElementById('recordTimer');
    if (timerDisplay) timerDisplay.style.display = 'none';
}

function setupMediaRecorder(micStream) {
    mediaRecorder = new MediaRecorder(dest.stream);
    recordedChunks = [];
    
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        currentWebmBlob = blob;
        const url = URL.createObjectURL(blob);
        audioPlayback.src = url;
        playbackContainer.style.display = 'block';
        
        if (micStream) micStream.getTracks().forEach(track => track.stop());
        stopRecordingTimer();
    };
    
    mediaRecorder.start();
    startRecordingTimer();
}

// Save Recording as MP3 button
document.getElementById('saveRecordingBtn').addEventListener('click', async () => {
    if (!currentWebmBlob) {
        await showAlertDialog('Henüz bir kayıt yok!');
        return;
    }
    
    const name = await showInputDialog('Kaydı İsimlendir', 'Kayıt adını gir...');
    if (!name) return;
    
    try {
        // Decode webm to AudioBuffer
        const arrayBuffer = await currentWebmBlob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // Encode to MP3
        const mp3Blob = audioBufferToMp3(audioBuffer);
        const mp3Url = URL.createObjectURL(mp3Blob);
        
        // Store recording
        const recording = {
            id: 'rec_' + Date.now(),
            name: name,
            blob: mp3Blob,
            url: mp3Url,
            date: new Date().toISOString(),
            size: (mp3Blob.size / 1024).toFixed(1)
        };
        myRecordings.push(recording);
        
        await showAlertDialog(`"${name}" MP3 olarak kaydedildi! Kayıtlarım bölümünden indirebilirsin.`);
    } catch (err) {
        console.error('MP3 dönüştürme hatası:', err);
        await showAlertDialog('MP3 dosyası oluşturulurken bir hata oluştu!');
    }
});

// --- Kayıtlarım Modal ---
function showMyRecordings() {
    const list = document.getElementById('recordingsList');
    list.innerHTML = '';
    
    if (myRecordings.length === 0) {
        list.innerHTML = '<li style="text-align:center; color: var(--text-secondary);">Henüz kaydedilmiş bir ses dosyan yok.<br><br><small>Studiodan "Sistem Sesini Kaydet" veya "Mikrofonla Kaydet" ile kayıt yap, ardından "💾 MP3 Kaydet" butonuna bas.</small></li>';
    } else {
        myRecordings.forEach((rec, index) => {
            const li = document.createElement('li');
            li.style.flexDirection = 'column';
            li.style.alignItems = 'flex-start';
            li.innerHTML = `
                <div style="width: 100%; display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong>🎧 ${rec.name}</strong>
                    <span style="font-size:0.8rem; color:#aaa;">${rec.size} KB • ${new Date(rec.date).toLocaleTimeString()}</span>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%;">
                    <button class="btn-primary btn-sm" onclick="downloadRecording(${index})">⬇️ İndir (MP3)</button>
                    <button class="btn-danger btn-sm" onclick="deleteRecording(${index})" style="margin-left:auto;">Sil</button>
                </div>
            `;
            list.appendChild(li);
        });
    }
    document.getElementById('myRecordingsModal').style.display = 'flex';
}

function closeRecordingsModal() {
    document.getElementById('myRecordingsModal').style.display = 'none';
}

function downloadRecording(index) {
    const rec = myRecordings[index];
    if (!rec) return;
    const a = document.createElement('a');
    a.href = rec.url;
    a.download = `${rec.name.replace(/\s+/g, '_')}.mp3`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function deleteRecording(index) {
    const confirmed = await showConfirmDialog('Bu kaydı silmek istediğine emin misin?');
    if (confirmed) {
        URL.revokeObjectURL(myRecordings[index].url);
        myRecordings.splice(index, 1);
        showMyRecordings();
    }
}

function startRecording(withMic, btn) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playbackContainer.style.display = 'none';
    currentWebmBlob = null;
    
    if (withMic) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(micStream => {
            const micSource = audioCtx.createMediaStreamSource(micStream);
            micSource.connect(audioCtx.destination);
            micSource.connect(dest);
            setupMediaRecorder(micStream);
            btn.innerHTML = 'Kaydı Durdur';
            btn.style.color = '#10b981';
        }).catch(err => showAlertDialog('Mikrofon erişimi reddedildi.'));
    } else {
        setupMediaRecorder(null);
        btn.innerHTML = 'Kaydı Durdur';
        btn.style.color = '#10b981';
    }
}

recordBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.innerHTML = '<span class="record-dot"></span> Canlı Kayıt (Mikrofon ile Oku)';
        recordBtn.style.color = '#ef4444';
    } else {
        startRecording(true, recordBtn);
    }
});

recordBeatOnlyBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBeatOnlyBtn.innerHTML = '<span class="record-dot" style="background:#3b82f6; box-shadow: 0 0 8px #3b82f6;"></span> Sadece Sistem Sesini Kaydet';
        recordBeatOnlyBtn.style.color = '#3b82f6';
    } else {
        startRecording(false, recordBeatOnlyBtn);
    }
});

// --- Settings & Nickname (Firebase) ---
function showSettings() {
    document.getElementById('nicknameInput').value = user.nickname || user.username;
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
    // Reset password change form
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newPasswordConfirm').value = '';
    document.getElementById('passwordChangeError').style.display = 'none';
    document.getElementById('passwordChangeForm').style.display = 'block';
    document.getElementById('passwordVerifySection').style.display = 'none';
    tempPasswordChangeData = null;
}

async function saveNickname() {
    const newNickname = document.getElementById('nicknameInput').value.trim();
    if (!newNickname) return;
    
    try {
        // Firestore'da güncelle
        const dbUser = await getUser(user.username);
        if (dbUser) {
            dbUser.nickname = newNickname;
            await saveUser(dbUser);
            
            // Oturumu güncelle
            user.nickname = newNickname;
            setCurrentUser(user);
            
            // UI güncelle
            document.getElementById('welcomeUser').textContent = `Hoş geldin, ${user.nickname}`;
            closeSettingsModal();
            await showAlertDialog('Görünen adın güncellendi!');
        }
    } catch (err) {
        console.error('Nickname güncelleme hatası:', err);
        await showAlertDialog('Görünen ad güncellenirken bir hata oluştu!');
    }
}

async function deleteCurrentRecording() {
    const confirmed = await showConfirmDialog('Bu kaydı silmek istediğine emin misin?');
    if (confirmed) {
        document.getElementById('playbackContainer').style.display = 'none';
        document.getElementById('audioPlayback').src = '';
        currentWebmBlob = null;
        recordedChunks = [];
    }
}

// --- Şifre Değiştirme (Password Change) ---

// SHA-256 Hash (same as auth.js)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate unique 6-digit code
function generateVerifyCode() {
    let digits = '0123456789'.split('');
    let code = '';
    for (let i = 0; i < 6; i++) {
        let randIndex = Math.floor(Math.random() * digits.length);
        code += digits[randIndex];
        digits.splice(randIndex, 1);
    }
    return code;
}

// EmailJS config (same as auth.js)
const PW_EMAILJS_SERVICE_ID = 'service_d2efpvb';
const PW_EMAILJS_RESET_TEMPLATE_ID = 'template_qm7kyt8';
const PW_EMAILJS_PUBLIC_KEY = 'lByNoDcgGqq-2kbhn';

// Initialize EmailJS if not already done
try {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(PW_EMAILJS_PUBLIC_KEY);
        console.log('EmailJS initialized for password change');
    }
} catch(e) {
    console.warn('EmailJS init warning:', e);
}

let tempPasswordChangeData = null;

async function initiatePasswordChange() {
    console.log("initiatePasswordChange started");
    const currentPass = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const newPassConfirm = document.getElementById('newPasswordConfirm').value;
    const errorEl = document.getElementById('passwordChangeError');
    const btn = document.querySelector('#passwordChangeForm .daw-btn.primary');
    const originalBtnText = btn ? btn.textContent : 'Şifre Değiştirme Kodu Gönder';
    
    errorEl.style.display = 'none';
    
    console.log("Inputs retrieved:", { currentPass: !!currentPass, newPass: !!newPass, confirm: !!newPassConfirm });
    
    // Validations
    if (!currentPass || !newPass || !newPassConfirm) {
        errorEl.textContent = 'Tüm alanları doldurun!';
        errorEl.style.display = 'block';
        return;
    }
    
    if (newPass !== newPassConfirm) {
        errorEl.textContent = 'Yeni şifreler eşleşmiyor!';
        errorEl.style.display = 'block';
        return;
    }
    
    // Password strength validation
    const passwordError = validatePassword(newPass);
    if (passwordError) {
        errorEl.textContent = passwordError;
        errorEl.style.display = 'block';
        return;
    }
    
    // Show loading state
    if (btn) { btn.textContent = 'Kontrol ediliyor...'; btn.disabled = true; }
    
    try {
        console.log("Fetching user from DB:", user.username);
        // Verify current password
        const dbUser = await getUser(user.username);
        console.log("DB User retrieved:", dbUser ? "Success" : "Failed");
        
        if (!dbUser) {
            errorEl.textContent = 'Kullanıcı bulunamadı!';
            errorEl.style.display = 'block';
            if (btn) { btn.textContent = originalBtnText; btn.disabled = false; }
            return;
        }
        
        console.log("Hashing current password...");
        const currentHash = await sha256(currentPass);
        if (currentHash !== dbUser.passwordHash) {
            console.log("Hash mismatch");
            errorEl.textContent = 'Mevcut şifre yanlış!';
            errorEl.style.display = 'block';
            if (btn) { btn.textContent = originalBtnText; btn.disabled = false; }
            return;
        }
        
        console.log("Hashing new password...");
        // Check new password is different from current
        const newHash = await sha256(newPass);
        if (newHash === dbUser.passwordHash) {
            errorEl.textContent = 'Yeni şifre mevcut şifreyle aynı olamaz!';
            errorEl.style.display = 'block';
            if (btn) { btn.textContent = originalBtnText; btn.disabled = false; }
            return;
        }
        
        // Generate verification code
        const code = generateVerifyCode();
        tempPasswordChangeData = {
            username: user.username,
            email: dbUser.email,
            newPasswordHash: newHash,
            code: code
        };
        
        if (btn) { btn.textContent = 'Kod gönderiliyor...'; }
        console.log("Sending email...");
        
        // Send verification email
        let emailSent = false;
        try {
            if (typeof emailjs !== 'undefined') {
                console.log("Calling emailjs.send");
                await emailjs.send(PW_EMAILJS_SERVICE_ID, PW_EMAILJS_RESET_TEMPLATE_ID, {
                    email: dbUser.email,
                    code: code
                });
                emailSent = true;
                console.log('✅ Doğrulama kodu gönderildi:', dbUser.email);
            } else {
                console.log("EmailJS is not defined");
            }
        } catch (emailErr) {
            console.error('EmailJS hatası:', emailErr);
        }
        
        if (!emailSent) {
            console.log("Email send failed, showing alert");
            await showAlertDialog(`E-posta gönderilemedi.\nDoğrulama kodunuz: ${code}`);
        }
        
        console.log("Showing verification step...");
        // Show verification step
        document.getElementById('passwordChangeForm').style.display = 'none';
        document.getElementById('passwordVerifySection').style.display = 'block';
        document.getElementById('passwordVerifyError').style.display = 'none';
        document.getElementById('passwordVerifyCode').value = '';
        setTimeout(() => document.getElementById('passwordVerifyCode').focus(), 100);
        
    } catch (err) {
        console.error('Şifre değiştirme hatası (catch block):', err);
        errorEl.textContent = 'Bir hata oluştu: ' + (err.message || 'Tekrar deneyin.');
        errorEl.style.display = 'block';
    } finally {
        if (btn) { btn.textContent = originalBtnText; btn.disabled = false; }
    }
}

async function confirmPasswordChange() {
    const codeInput = document.getElementById('passwordVerifyCode').value.trim();
    const errorEl = document.getElementById('passwordVerifyError');
    
    errorEl.style.display = 'none';
    
    if (!tempPasswordChangeData) {
        errorEl.textContent = 'Doğrulama verisi bulunamadı. Lütfen baştan başlayın.';
        errorEl.style.display = 'block';
        cancelPasswordChange();
        return;
    }
    
    if (codeInput !== tempPasswordChangeData.code) {
        errorEl.textContent = 'Doğrulama kodu hatalı!';
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        // Update password in Firestore
        const dbUser = await getUser(tempPasswordChangeData.username);
        if (dbUser) {
            dbUser.passwordHash = tempPasswordChangeData.newPasswordHash;
            await saveUser(dbUser);
        }
        
        tempPasswordChangeData = null;
        cancelPasswordChange(); // Reset UI
        
        // Clear password fields
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('newPasswordConfirm').value = '';
        
        await showAlertDialog('Şifren başarıyla değiştirildi! Bir sonraki girişinde yeni şifreni kullan.');
        
    } catch (err) {
        console.error('Şifre güncelleme hatası:', err);
        errorEl.textContent = 'Şifre güncellenirken bir hata oluştu!';
        errorEl.style.display = 'block';
    }
}

function cancelPasswordChange() {
    tempPasswordChangeData = null;
    document.getElementById('passwordChangeForm').style.display = 'block';
    document.getElementById('passwordVerifySection').style.display = 'none';
    document.getElementById('passwordVerifyError').style.display = 'none';
    document.getElementById('passwordChangeError').style.display = 'none';
    document.getElementById('passwordVerifyCode').value = '';
}
