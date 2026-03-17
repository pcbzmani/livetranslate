'use strict';

// ── Languages ────────────────────────────────────────────
const LANGS = [
  { code: 'en',  speech: 'en-US',  name: 'English'    },
  { code: 'hi',  speech: 'hi-IN',  name: 'Hindi'       },
  { code: 'es',  speech: 'es-ES',  name: 'Spanish'     },
  { code: 'fr',  speech: 'fr-FR',  name: 'French'      },
  { code: 'de',  speech: 'de-DE',  name: 'German'      },
  { code: 'ar',  speech: 'ar-SA',  name: 'Arabic'      },
  { code: 'zh',  speech: 'zh-CN',  name: 'Chinese'     },
  { code: 'ja',  speech: 'ja-JP',  name: 'Japanese'    },
  { code: 'ko',  speech: 'ko-KR',  name: 'Korean'      },
  { code: 'pt',  speech: 'pt-BR',  name: 'Portuguese'  },
  { code: 'ru',  speech: 'ru-RU',  name: 'Russian'     },
  { code: 'it',  speech: 'it-IT',  name: 'Italian'     },
  { code: 'bn',  speech: 'bn-BD',  name: 'Bengali'     },
  { code: 'ta',  speech: 'ta-IN',  name: 'Tamil'       },
  { code: 'te',  speech: 'te-IN',  name: 'Telugu'      },
  { code: 'mr',  speech: 'mr-IN',  name: 'Marathi'     },
  { code: 'gu',  speech: 'gu-IN',  name: 'Gujarati'    },
  { code: 'pa',  speech: 'pa-IN',  name: 'Punjabi'     },
  { code: 'ur',  speech: 'ur-PK',  name: 'Urdu'        },
  { code: 'ml',  speech: 'ml-IN',  name: 'Malayalam'   },
  { code: 'kn',  speech: 'kn-IN',  name: 'Kannada'     },
  { code: 'tr',  speech: 'tr-TR',  name: 'Turkish'     },
  { code: 'nl',  speech: 'nl-NL',  name: 'Dutch'       },
  { code: 'vi',  speech: 'vi-VN',  name: 'Vietnamese'  },
  { code: 'th',  speech: 'th-TH',  name: 'Thai'        },
  { code: 'id',  speech: 'id-ID',  name: 'Indonesian'  },
  { code: 'fa',  speech: 'fa-IR',  name: 'Persian'     },
  { code: 'he',  speech: 'he-IL',  name: 'Hebrew'      },
  { code: 'pl',  speech: 'pl-PL',  name: 'Polish'      },
  { code: 'uk',  speech: 'uk-UA',  name: 'Ukrainian'   },
  { code: 'sv',  speech: 'sv-SE',  name: 'Swedish'     },
  { code: 'el',  speech: 'el-GR',  name: 'Greek'       },
];

// ── DOM ───────────────────────────────────────────────────
const elFrom       = document.getElementById('langFrom');
const elTo         = document.getElementById('langTo');
const elMic        = document.getElementById('micBtn');
const elStatus     = document.getElementById('statusText');
const elInterim    = document.getElementById('interimText');
const elCard       = document.getElementById('resultCard');
const elOriginal   = document.getElementById('resultOriginal');
const elTranslated = document.getElementById('resultTranslated');
const elBadge      = document.getElementById('resultLangBadge');
const elReplay     = document.getElementById('replayBtn');
const elSwap       = document.getElementById('swapBtn');
const elClear      = document.getElementById('clearBtn');
const elHistory    = document.getElementById('historyList');
const elToast      = document.getElementById('toast');

// ── Build language dropdowns ──────────────────────────────
const opts = LANGS.map(l => `<option value="${l.code}">${l.name}</option>`).join('');
elFrom.innerHTML = elTo.innerHTML = opts;
try {
  const s  = JSON.parse(localStorage.getItem('lt') || '{}');
  elFrom.value = s.from || 'en';
  elTo.value   = s.to   || 'hi';
} catch (_) { elFrom.value = 'en'; elTo.value = 'hi'; }

function saveLangs() {
  try { localStorage.setItem('lt', JSON.stringify({ from: elFrom.value, to: elTo.value })); } catch (_) {}
}
elFrom.addEventListener('change', saveLangs);
elTo.addEventListener('change',   saveLangs);

// ── Speech Recognition ────────────────────────────────────
// KEY: One instance, continuous:true — avoids Chrome "network" error on restart
const API = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec          = null;
let listening    = false;
let lastOut      = '';
let lastLang     = '';
let restartCount = 0;   // prevents infinite restart loop

if (API) {
  rec                = new API();
  rec.continuous     = true;   // keeps Google connection alive — no reconnect errors
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    restartCount = 0; // got audio — reset counter
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        const text = e.results[i][0].transcript.trim();
        if (text) { elInterim.textContent = ''; doTranslate(text); }
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    if (interim) elInterim.textContent = interim;
  };

  rec.onerror = (e) => {
    if (e.error === 'not-allowed') {
      showToast('Microphone blocked — allow mic access in browser settings', 'error');
      stopListening();
      return;
    }
    // In continuous mode, Chrome auto-recovers from no-speech and network blips
    // Don't show these to the user — they're internal Chrome service errors
    if (e.error === 'no-speech' || e.error === 'network') return;

    showToast('Mic error: ' + e.error, 'error');
    stopListening();
  };

  rec.onend = () => {
    if (!listening) return;
    restartCount++;
    if (restartCount > 4) {
      // Too many restarts without audio — give up and show error
      listening = false;
      restartCount = 0;
      elMic.classList.remove('recording');
      elInterim.textContent = '';
      setStatus('Tap mic to speak');
      showToast('Speech recognition unavailable. Check internet & mic permissions.', 'error');
      return;
    }
    setTimeout(() => {
      if (!listening) return;
      try { rec.start(); } catch (_) {}
    }, 400);
  };
} else {
  // No Speech API — show banner
  const b = document.createElement('div');
  b.className = 'support-banner';
  b.textContent = '⚠️ Speech recognition requires Google Chrome or Microsoft Edge.';
  document.querySelector('.lang-bar').after(b);
}

// ── Mic button ────────────────────────────────────────────
elMic.addEventListener('click', () => {
  window.speechSynthesis.cancel();

  if (!rec) { showToast('Use Google Chrome or Edge browser', 'error'); return; }

  if (listening) {
    stopListening();
  } else {
    startListening();
  }
});

function startListening() {
  const fromLang = LANGS.find(l => l.code === elFrom.value);
  rec.lang = fromLang.speech;
  listening = true;
  elMic.classList.add('recording');
  elInterim.textContent = '';
  setStatus('Speak in ' + fromLang.name + '…');
  try { rec.start(); } catch (_) {
    // "already started" is fine in continuous mode — it's still running
  }
}

function stopListening() {
  listening = false;
  elMic.classList.remove('recording');
  elInterim.textContent = '';
  setStatus('Tap mic to speak');
  try { rec.stop(); } catch (_) {}
}

// ── Translate ─────────────────────────────────────────────
async function doTranslate(original) {
  const fromCode = elFrom.value;
  const toCode   = elTo.value;
  const toLang   = LANGS.find(l => l.code === toCode);

  setStatus('Translating…');

  try {
    let translated = original;
    if (fromCode !== toCode) {
      const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(original)}&langpair=${fromCode}|${toCode}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (String(data.responseStatus) !== '200') throw new Error(data.responseDetails || 'API error');
      translated = data.responseData.translatedText;
    }

    elOriginal.textContent   = original;
    elTranslated.textContent = translated;
    elBadge.textContent      = '→ ' + toLang.name;
    elCard.classList.remove('hidden');
    setStatus('Speak in ' + LANGS.find(l => l.code === elFrom.value).name + '…');

    lastOut  = translated;
    lastLang = toLang.speech;

    doSpeak(translated, toLang.speech);

    addHistory({
      from: LANGS.find(l => l.code === fromCode).name,
      to:   toLang.name,
      original,
      translated,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

  } catch (err) {
    console.error(err);
    setStatus('Listening…');
    showToast('Translation failed — check internet connection', 'error');
  }
}

// ── TTS ───────────────────────────────────────────────────
function doSpeak(text, speechCode) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();

  // Voices load async — wait until ready then speak
  function speak() {
    const voices = window.speechSynthesis.getVoices();
    const base   = speechCode.split('-')[0].toLowerCase();

    const voice = voices.find(v => v.lang === speechCode)
               || voices.find(v => v.lang.toLowerCase() === speechCode.toLowerCase())
               || voices.find(v => v.lang.toLowerCase().startsWith(base))
               || null;

    if (!voice) {
      // No matching voice on this device — tell user how to fix
      showToast(
        `No "${speechCode}" voice found. On Windows: Settings → Time & Language → Speech → Add voices`,
        'info'
      );
      return;
    }

    setTimeout(() => {
      const u  = new SpeechSynthesisUtterance(text);
      u.lang   = speechCode;
      u.voice  = voice;
      u.rate   = 0.92;
      u.volume = 1;
      window.speechSynthesis.speak(u);
    }, 300);
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    speak();
  } else {
    // Voices not loaded yet — wait for them
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      speak();
    };
  }
}

elReplay.addEventListener('click', () => { if (lastOut) doSpeak(lastOut, lastLang); });

// ── Swap ──────────────────────────────────────────────────
elSwap.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  const wasListening = listening;
  if (listening) stopListening();
  [elFrom.value, elTo.value] = [elTo.value, elFrom.value];
  saveLangs();
  elCard.classList.add('hidden');
  if (wasListening) startListening();  // restart with swapped language
});

// ── Clear ─────────────────────────────────────────────────
elClear.addEventListener('click', () => {
  elHistory.innerHTML = '<div class="empty-history">No translations yet</div>';
  elCard.classList.add('hidden');
  lastOut = '';
});

// ── History ───────────────────────────────────────────────
function addHistory(e) {
  const empty = elHistory.querySelector('.empty-history');
  if (empty) empty.remove();
  const el = document.createElement('div');
  el.className = 'history-item';
  el.innerHTML = `
    <div class="history-meta">${esc(e.from)} → ${esc(e.to)} · ${e.time}</div>
    <div class="history-original">${esc(e.original)}</div>
    <div class="history-translated">${esc(e.translated)}</div>`;
  elHistory.insertBefore(el, elHistory.firstChild);
}

// ── Helpers ───────────────────────────────────────────────
function setStatus(t) { elStatus.textContent = t; }

let toastTimer;
function showToast(msg, type = 'info') {
  elToast.textContent = msg;
  elToast.className   = `toast toast-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove('show'), 4000);
}

function esc(t = '') {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Boot ──────────────────────────────────────────────────
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
