// ==========================================
// SWIPECALL - Mobil Canlı Görüntülü Sohbet
// ==========================================

// Mobil (Capacitor) veya Web ortamını algıla
const SERVER_URL = (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:' || window.location.hostname === 'localhost')
  ? 'https://metu-live.onrender.com'
  : undefined;

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10
});

// UI Elemanları
const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const placeholderOverlay = document.getElementById('placeholderOverlay');
const statusText = document.getElementById('statusText');
const statusSubtext = document.getElementById('statusSubtext');
const swipeHint = document.getElementById('swipeHint');
const mainActionBtn = document.getElementById('mainActionBtn');
const mainActionText = document.getElementById('mainActionText');
const reportBtn = document.getElementById('reportBtn');
const reportModal = document.getElementById('reportModal');
const cancelReportBtn = document.getElementById('cancelReportBtn');
const bannedModal = document.getElementById('bannedModal');
const bannedReason = document.getElementById('bannedReason');
const activeCountBadge = document.getElementById('activeCountBadge');
const pipFlipCamBtn = document.getElementById('pipFlipCamBtn');
const pipResizeBtn = document.getElementById('pipResizeBtn');
const localPipContainer = document.getElementById('localPipContainer');
const simpleChatContainer = document.getElementById('simpleChatContainer');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const adModal = document.getElementById('adModal');
const adTimer = document.getElementById('adTimer');
const callTimerPill = document.getElementById('callTimerPill');
const callTimerText = document.getElementById('callTimerText');
const eulaModal = document.getElementById('eulaModal');
const eulaCheckbox = document.getElementById('eulaCheckbox');
const eulaAcceptBtn = document.getElementById('eulaAcceptBtn');

// EULA (Kullanıcı Güvenlik Sözleşmesi) İlk Açılış Kontrolü
function checkEulaAgreement() {
  const hasAgreed = localStorage.getItem('eula_accepted_v1');
  if (!hasAgreed && eulaModal) {
    eulaModal.classList.remove('hidden');
  }
}

if (eulaCheckbox && eulaAcceptBtn) {
  eulaCheckbox.addEventListener('change', () => {
    eulaAcceptBtn.disabled = !eulaCheckbox.checked;
  });

  eulaAcceptBtn.addEventListener('click', () => {
    localStorage.setItem('eula_accepted_v1', 'true');
    eulaModal.classList.add('hidden');
  });
}

checkEulaAgreement();

// ==========================================
// ÇOKLU DİL DESTEĞİ (OTOMATİK ÜLKE/CİHAZ DİLİ)
// ==========================================
const translations = {
  tr: { start: 'BAŞLAT', stop: 'KAPAT', swipe: 'Sıradaki Kişi', searching: 'Biri aranıyor...', subWaiting: 'Dünya taranıyor, lütfen bekleyin', idle: 'Başlamak için dokunun', idleSub: 'Dünya genelinden biriyle eşleşin', partnerLeft: 'Kullanıcı ayrıldı', connecting: 'Bağlantı kuruluyor...', online: '🟢 Çevrimiçi' },
  en: { start: 'START', stop: 'STOP', swipe: 'Next Person', searching: 'Searching...', subWaiting: 'Scanning the world, please wait', idle: 'Tap to start', idleSub: 'Match with someone worldwide', partnerLeft: 'User disconnected', connecting: 'Connecting...', online: '🟢 Online' },
  es: { start: 'INICIAR', stop: 'DETENER', swipe: 'Siguiente persona', searching: 'Buscando...', subWaiting: 'Escaneando el mundo...', idle: 'Toca para iniciar', idleSub: 'Conéctate con el mundo', partnerLeft: 'Usuario desconectado', connecting: 'Conectando...', online: '🟢 En línea' },
  de: { start: 'START', stop: 'STOPPEN', swipe: 'Nächste Person', searching: 'Suche...', subWaiting: 'Scannen, bitte warten...', idle: 'Tippen zum Starten', idleSub: 'Weltweit verbinden', partnerLeft: 'Getrennt', connecting: 'Verbinden...', online: '🟢 Online' },
  fr: { start: 'DÉMARRER', stop: 'ARRÊTER', swipe: 'Personne suivante', searching: 'Recherche...', subWaiting: 'Recherche mondiale...', idle: 'Appuyez pour commencer', idleSub: 'Discutez avec le monde', partnerLeft: 'Déconnecté', connecting: 'Connexion...', online: '🟢 En ligne' },
  pt: { start: 'INICIAR', stop: 'PARAR', swipe: 'Próxima pessoa', searching: 'Procurando...', subWaiting: 'Procurando no mundo...', idle: 'Toque para iniciar', idleSub: 'Conecte-se com o mundo', partnerLeft: 'Desconectado', connecting: 'Conectando...', online: '🟢 Online' },
  ru: { start: 'СТАРТ', stop: 'СТОП', swipe: 'Следующий человек', searching: 'Поиск...', subWaiting: 'Поиск по всему миру...', idle: 'Нажмите для старта', idleSub: 'Общайтесь со всем миром', partnerLeft: 'Пользователь отключился', connecting: 'Подключение...', online: '🟢 В сети' },
  ar: { start: 'ابدأ', stop: 'إيقاف', swipe: 'الشخص التالي', searching: 'جاري البحث...', subWaiting: 'يرجى الانتظار...', idle: 'انقر للبدء', idleSub: 'تواصل مع العالم', partnerLeft: 'انقطع الاتصال', connecting: 'جاري الاتصال...', online: '🟢 متصل' },
  ja: { start: '開始', stop: '停止', swipe: '次の人', searching: '検索中...', subWaiting: '世界中を検索しています...', idle: 'タップして開始', idleSub: '世界中の人とつながる', partnerLeft: '切断されました', connecting: '接続中...', online: '🟢 オンライン' },
  it: { start: 'AVVIA', stop: 'FERMA', swipe: 'Prossima persona', searching: 'Ricerca...', subWaiting: 'Attendere prego...', idle: 'Tocca per iniziare', idleSub: 'Connettiti con il mondo', partnerLeft: 'Disconnesso', connecting: 'Connessione...', online: '🟢 Online' }
};

const userLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
const t = translations[userLang] || translations['en'];

// İlk metinleri kullanıcının diline ayarla
mainActionText.innerText = t.start;
statusText.innerText = t.idle;
statusSubtext.innerText = t.idleSub;
if (swipeHint) swipeHint.querySelector('span').innerText = t.swipe;

// Durum Değişkenleri
let localStream = null;
let peerConnection = null;
let dataChannel = null;
let isRunning = false;
let isStarting = false;          // BAŞLAT'a art arda basılmasını engeller
let partnerLeftTimer = null;     // "Kullanıcı ayrıldı" sonrası yeniden arama zamanlayıcısı
let currentFacingMode = 'user'; // 'user' (ön) veya 'environment' (arka)
let skipCount = 0;
const AD_FREQUENCY = 4; // Her 4 geçişte bir reklam göster

// Küresel STUN & TURN Sunucuları (Mobil Veri ve Güvenlik Duvarı Engeli Aşmak İçin)
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelay',
      credential: 'openrelay'
    }
  ],
  iceCandidatePoolSize: 10
};

let queuedCandidates = [];

// ----------------------------------------------------
// 1. KAMERA VE MİKROFON ERİŞİMİ
// ----------------------------------------------------
async function initLocalMedia() {
  try {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentFacingMode
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    localVideo.srcObject = localStream;
    if (currentFacingMode === 'user') {
      localVideo.classList.add('mirror-mode');
    } else {
      localVideo.classList.remove('mirror-mode');
    }
    return true;
  } catch (err) {
    console.error('Kamera veya mikrofon izni alınamadı:', err);
    alert('Kamera veya mikrofon izni verilemedi. Lütfen tarayıcı ayarlarından izin verin.');
    return false;
  }
}

// ----------------------------------------------------
// 2. WEBRTC BAĞLANTI YÖNETİMİ
// ----------------------------------------------------
function createPeerConnection() {
  closePeerConnection();

  peerConnection = new RTCPeerConnection(rtcConfig);

  // Kendi medya akışımızı karşı tarafa ekle
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }

  // Karşı tarafın video/ses akışı geldiğinde
  peerConnection.ontrack = (event) => {
    console.log('[🎬] Karşı tarafın akışı alındı:', event.streams);
    const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
    remoteVideo.srcObject = stream;
    remoteVideo.muted = false; // Karşı tarafın sesi kesinlikle açık!
    remoteVideo.volume = 1.0;

    // Mobil tarayıcılarda sesin takılmadan veya kesilmeden kesintisiz çalması için:
    const playPromise = remoteVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        console.log('Video/ses otomatik başlatma uyarısı:', e);
        // Kullanıcı ekrana dokunduğu an sesi çözer
        window.addEventListener('touchstart', () => { remoteVideo.play(); }, { once: true });
      });
    }

    placeholderOverlay.classList.add('hidden');
    swipeHint.classList.remove('hidden');
    if (reportBtn) reportBtn.classList.remove('hidden');
    startCallTimer(); // Karşı tarafın görüntüsü/sesi bağlandığı an sayacı başlat
  };

  // Doğrudan P2P DataChannel dinleyicisi (Gelen mesajlar)
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannelEvents();
  };

  // ICE Adaylarını sunucuya gönder
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('signal_candidate', event.candidate);
    }
  };

  // Sadece BU bağlantıya ait olayları işle (eski bağlantının geç gelen olayları yeni eşleşmeyi bozmasın)
  const pc = peerConnection;
  let disconnectGraceTimer = null;
  pc.onconnectionstatechange = () => {
    if (pc !== peerConnection) return;
    console.log('[📡] WebRTC Durumu:', pc.connectionState);
    if (pc.connectionState === 'failed') {
      handlePartnerLeft();
    } else if (pc.connectionState === 'disconnected') {
      // Mobilde ağ geçişlerinde 'disconnected' çoğu zaman geçicidir; 5 sn bekle
      clearTimeout(disconnectGraceTimer);
      disconnectGraceTimer = setTimeout(() => {
        if (pc === peerConnection && pc.connectionState !== 'connected') handlePartnerLeft();
      }, 5000);
    } else if (pc.connectionState === 'connected') {
      clearTimeout(disconnectGraceTimer);
    }
  };
}

function setupDataChannelEvents() {
  if (!dataChannel) return;
  dataChannel.onmessage = (event) => {
    if (typeof event.data !== 'string') return;
    appendChatMessage(event.data.slice(0, 150), false);
  };
  dataChannel.onopen = () => console.log('[✅ P2P DataChannel Açıldı!]');
}

// ----------------------------------------------------
// CANLI KONUŞMA SÜRESİ SAYACI & REKLAM AYARLARI
// ----------------------------------------------------
let callTimerInterval = null;
let callStartTime = null;
let currentCallDurationSeconds = 0;

// Google Reklam Entegrasyonu Ayarları (METU_Gecis)
const GOOGLE_AD_SETTINGS = {
  adClient: 'ca-pub-3958229960094119',
  adUnitId: 'ca-app-pub-3958229960094119/4359195131', // METU_Gecis Reklam Birimi
  minCallSecondsForAd: 900                            // 15 Dakika (15 * 60 = 900 saniye)
};

function startCallTimer() {
  stopCallTimer();
  callStartTime = Date.now();
  currentCallDurationSeconds = 0;
  if (callTimerPill) callTimerPill.classList.remove('hidden');
  if (callTimerText) callTimerText.innerText = '00:00';

  callTimerInterval = setInterval(() => {
    if (!callStartTime) return;
    currentCallDurationSeconds = Math.floor((Date.now() - callStartTime) / 1000);
    const m = Math.floor(currentCallDurationSeconds / 60).toString().padStart(2, '0');
    const s = (currentCallDurationSeconds % 60).toString().padStart(2, '0');
    if (callTimerText) callTimerText.innerText = `${m}:${s}`;
  }, 1000);
}

function stopCallTimer() {
  if (callTimerInterval) {
    clearInterval(callTimerInterval);
    callTimerInterval = null;
  }
  const duration = currentCallDurationSeconds;
  callStartTime = null;
  currentCallDurationSeconds = 0;
  if (callTimerPill) callTimerPill.classList.add('hidden');
  return duration;
}

function closePeerConnection() {
  stopCallTimer();
  if (dataChannel) {
    try { dataChannel.close(); } catch(e){}
    dataChannel = null;
  }
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  queuedCandidates = []; // Önceki partnerden kalan ICE adayları yeni bağlantıya karışmasın
  remoteVideo.srcObject = null;
}

function clearPartnerLeftTimer() {
  if (partnerLeftTimer) {
    clearTimeout(partnerLeftTimer);
    partnerLeftTimer = null;
  }
}

function showSearchingUI(title, subtitle) {
  closePeerConnection();
  if (chatMessages) chatMessages.innerHTML = '';
  placeholderOverlay.classList.remove('hidden');
  statusText.innerText = title;
  statusSubtext.innerText = subtitle;
  swipeHint.classList.add('hidden');
}

// ----------------------------------------------------
// 3. EŞLEŞME AKIŞI (BAŞLA / DURDUR / GEÇ)
// ----------------------------------------------------
async function startMatching() {
  if (isRunning || isStarting) return; // Art arda basmaya karşı koruma
  isStarting = true;
  const hasMedia = await initLocalMedia();
  isStarting = false;
  if (!hasMedia) return;

  isRunning = true;
  mainActionBtn.className = 'main-action-btn stop-state';
  mainActionText.innerText = t.stop;
  const heartIcon = document.getElementById('heartIcon');
  if (heartIcon) heartIcon.innerText = '💔';

  showSearchingUI(t.searching, t.subWaiting);
  socket.emit('find_partner');
}

function stopMatching() {
  isRunning = false;
  clearPartnerLeftTimer();
  mainActionBtn.className = 'main-action-btn start-state';
  mainActionText.innerText = t.start;
  const heartIcon = document.getElementById('heartIcon');
  if (heartIcon) heartIcon.innerText = '❤️';

  socket.emit('stop');
  showSearchingUI(t.idle, t.idleSub);
}

function skipToNext() {
  if (!isRunning || isAdShowing) return;
  clearPartnerLeftTimer();

  // Konuşma süresini al ve sayacı durdur
  const callDuration = stopCallTimer();

  skipCount++;
  showSearchingUI('Sıradakine geçiliyor...', 'Yeni biri aranıyor');

  // 15 DAKİKA KURALI (Sohbet Esnasında ASLA Reklam Çıkmaz!):
  // Kullanıcı 15 dakika (900 sn) veya üzeri konuştuysa, kaydırdığı an reklam göster!
  const isFifteenMinCall = (callDuration >= GOOGLE_AD_SETTINGS.minCallSecondsForAd);

  if (isFifteenMinCall || (skipCount % AD_FREQUENCY === 0)) {
    showAdAndContinue();
  } else {
    socket.emit('skip'); // Sunucu partneri serbest bırakıp 'finding_next' gönderir → find_partner
  }
}

function handlePartnerLeft() {
  if (!isRunning) return;
  const callDuration = stopCallTimer();
  showSearchingUI(t.partnerLeft, 'Sıradaki kişi aranıyor...');

  // 15 dakikalık uzun sohbet sonrası partner ayrıldıysa da araya reklam koy
  if (callDuration >= GOOGLE_AD_SETTINGS.minCallSecondsForAd) {
    showAdAndContinue();
    return;
  }

  // Aynı ayrılma için birden fazla olay gelse bile (socket + WebRTC) TEK arama yapılır
  clearPartnerLeftTimer();
  partnerLeftTimer = setTimeout(() => {
    partnerLeftTimer = null;
    if (isRunning && !isAdShowing) socket.emit('find_partner');
  }, 800);
}

// ----------------------------------------------------
// 4. REKLAM SİMÜLATÖRÜ (AdMob Entegrasyonu)
// ----------------------------------------------------
// Gerçek AdMob (Capacitor eklentisi) bağlanana kadar KAPALI.
// Sahte "REKLAM" kutusu Google Play politikalarına aykırı olabilir.
const ADS_ENABLED = false;
let isAdShowing = false;
function showAdAndContinue() {
  if (!ADS_ENABLED) {
    // Reklam kapalı: doğrudan sıradaki kişiye geç
    socket.emit('skip');
    return;
  }
  isAdShowing = true;
  // Eski partneri reklam bitmesini beklemeden hemen serbest bırak
  socket.emit('leave');

  adModal.classList.remove('hidden');
  let timeLeft = 3;
  adTimer.innerText = timeLeft;

  const interval = setInterval(() => {
    timeLeft--;
    adTimer.innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(interval);
      adModal.classList.add('hidden');
      isAdShowing = false;
      // Reklam bitti, kullanıcı hâlâ aktifse yeni eşleşmeyi başlat
      if (isRunning) socket.emit('find_partner');
    }
  }, 1000);
}

// ----------------------------------------------------
// 5. DOKUNMATİK KAYDIRMA (TIKTOK/REELS AKICILIĞINDA - İDEAL HASSASİYET)
// ----------------------------------------------------
let touchStartX = 0;
let touchStartY = 0;
let touchStartedOnPip = false;
let touchStartedOnChat = false;

window.addEventListener('touchstart', (e) => {
  const target = e.target;
  // Sadece kendi kamera kutun veya chat kutusuna basarken swipe'ı engelle
  touchStartedOnPip = Boolean(localPipContainer && localPipContainer.contains(target));
  touchStartedOnChat = Boolean(simpleChatContainer && simpleChatContainer.contains(target));
  const isControlBtn = Boolean(target.closest('.bottom-controls') || target.closest('.top-bar'));

  if (touchStartedOnPip || touchStartedOnChat || isControlBtn) {
    touchStartY = 0;
    return;
  }

  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (touchStartY === 0 || isDraggingPip) return;

  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const diffY = touchStartY - touchEndY; // Yukarı doğru mesafe
  const diffX = Math.abs(touchEndX - touchStartX); // Sağa sola hafif kavis payı

  // İDEAL DOĞAL KAYDIRMA:
  // 1. diffY > 80: Çok yormayan, doğal bir parmak hareketi (80px)
  // 2. diffY > diffX: Yukarı hareketin sağa/sola hareketten daha baskın olması yeterli
  if (diffY > 80 && diffY > diffX * 0.7) {
    console.log('[👆] Akıcı yukarı kaydırma -> Sıradaki!');
    if (isRunning) {
      skipToNext();
    }
  }

  touchStartY = 0;
}, { passive: true });

// Bilgisayardan fare testi için de aynı akıcılık:
let mouseStartY = 0;
let mouseStartX = 0;
window.addEventListener('mousedown', (e) => {
  if (localPipContainer && localPipContainer.contains(e.target)) return;
  if (simpleChatContainer && simpleChatContainer.contains(e.target)) return;
  if (e.target.closest('.bottom-controls') || e.target.closest('.top-bar')) return;

  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
});
window.addEventListener('mouseup', (e) => {
  if (mouseStartY === 0 || isDraggingPip) return;
  const diffY = mouseStartY - e.clientY;
  const diffX = Math.abs(e.clientX - mouseStartX);

  if (diffY > 80 && diffY > diffX * 0.7) {
    if (isRunning) skipToNext();
  }
  mouseStartY = 0;
});

// ----------------------------------------------------
// CANLI SOHBET (CHAT) MANTIĞI
// ----------------------------------------------------
function appendChatMessage(text, isMine = false) {
  if (!chatMessages) return;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isMine ? 'mine' : ''}`;
  
  const tag = document.createElement('span');
  tag.className = 'sender-tag';
  tag.innerText = isMine ? 'Sen:' : 'Partner:';
  
  const content = document.createElement('span');
  content.innerText = text;
  
  bubble.appendChild(tag);
  bubble.appendChild(content);
  chatMessages.appendChild(bubble);
  
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // 12 saniye sonra mesajı ekrandan nazikçe kaldır (temiz ve sade arayüz için)
  setTimeout(() => {
    bubble.style.transition = 'opacity 0.5s ease';
    bubble.style.opacity = '0';
    setTimeout(() => bubble.remove(), 500);
  }, 12000);
}

if (chatForm) {
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim().slice(0, 150);
    if (!text) return;

    // Kimseyle bağlı değilken mesaj boşa gitmesin
    if (!peerConnection || !remoteVideo.srcObject) {
      chatInput.value = '';
      chatInput.blur();
      return;
    }

    appendChatMessage(text, true);

    // Tek hat kullan (iki hattan birden gönderilince karşı tarafta mesaj ÇİFT görünüyordu):
    // P2P kanal açıksa doğrudan cihazdan cihaza, değilse sunucu üzerinden.
    let sentP2P = false;
    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(text);
        sentP2P = true;
      } catch (err) {
        console.warn('DataChannel gönderme hatası, sunucu hattı kullanılıyor:', err);
      }
    }
    if (!sentP2P) socket.emit('chat_message', text);

    chatInput.value = '';
    chatInput.blur(); // Mobilde klavyeyi kapatmak için
  });
}

// Karşı taraftan sunucu üzerinden gelen mesaj
socket.on('chat_message', (msgText) => {
  if (typeof msgText !== 'string') return;
  appendChatMessage(msgText.slice(0, 150), false);
});

// ----------------------------------------------------
// 6. KONTROL BUTONLARI ETKİLEŞİMLERİ
// ----------------------------------------------------
function handleMainAction(e) {
  if (e && e.type === 'touchend') e.preventDefault();
  if (isRunning) {
    stopMatching();
  } else {
    startMatching();
  }
}

if (mainActionBtn) {
  mainActionBtn.addEventListener('click', handleMainAction);
  mainActionBtn.addEventListener('touchend', handleMainAction, { passive: false });
}

// Kamera Çevirme Mantığı (Ön / Arka) - Sesi Asla Kesmeden Sadece Kamerayı Değiştir
let isFlipping = false;
async function flipCamera() {
  if (isFlipping) return;
  const previousMode = currentFacingMode;
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

  // Henüz kamera açılmadıysa sadece tercihi değiştir, BAŞLAT'a basınca bu kamera açılır
  if (!localStream) return;

  isFlipping = true;
  try {
    // ÖNEMLİ: Birçok Android telefon iki kamerayı aynı anda açamaz.
    // Bu yüzden önce eski kamerayı kapatıp sonra yenisini istiyoruz. (Mikrofona dokunulmuyor.)
    const oldVideoTrack = localStream.getVideoTracks()[0];
    if (oldVideoTrack) {
      oldVideoTrack.stop();
      localStream.removeTrack(oldVideoTrack);
    }

    let newVideoStream;
    try {
      newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode } });
    } catch (err) {
      // İstenen kamera yoksa/açılamazsa eski kameraya geri dön
      console.warn('Kamera açılamadı, öncekine dönülüyor:', err);
      currentFacingMode = previousMode;
      newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode } });
    }

    const newVideoTrack = newVideoStream.getVideoTracks()[0];
    localStream.addTrack(newVideoTrack);

    // Kendi PiP video penceremizi güncelle
    localVideo.srcObject = localStream;
    if (currentFacingMode === 'user') {
      localVideo.classList.add('mirror-mode');
    } else {
      localVideo.classList.remove('mirror-mode');
    }

    // WebRTC üzerinden karşı tarafa giden görüntüyü anında yenisiyle değiştir
    if (peerConnection) {
      const videoSender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
        console.log('[🔄] Görüntü başarıyla çevrildi, ses kesintisiz devam ediyor!');
      }
    }
  } catch (err) {
    console.error('Kamera çevirme hatası:', err);
  } finally {
    isFlipping = false;
  }
}

if (pipFlipCamBtn) {
  pipFlipCamBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    flipCamera();
  });
}

// Kendi Görüntümüzü Büyüt / Küçült Butonu (3 Kademeli: Normal -> Büyük -> Dev)
let pipSizeMode = 0; // 0: Normal, 1: Büyük, 2: Dev
if (pipResizeBtn) {
  pipResizeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pipSizeMode = (pipSizeMode + 1) % 3;

    localPipContainer.classList.remove('size-large', 'size-xlarge');
    if (pipSizeMode === 1) {
      localPipContainer.classList.add('size-large');
      pipResizeBtn.innerText = '⛶'; // Daha da büyüt simgesi
    } else if (pipSizeMode === 2) {
      localPipContainer.classList.add('size-xlarge');
      pipResizeBtn.innerText = '🗗'; // Küçült simgesi
    } else {
      pipResizeBtn.innerText = '⛶'; // Normal mod
    }

    // Boyut değişince ekrandan taşmaması için en yakın köşeye yeniden oturt
    requestAnimationFrame(snapPipToCorner);
  });
}

// Kendi kamerasına çift tıklayınca da çevir (butonlara çift basma hariç)
if (localPipContainer) {
  localPipContainer.addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    flipCamera();
  });
}

// ==========================================
// KENDİ KAMERAMIZI SÜRÜKLEYİP YER DEĞİŞTİRME (DRAGGABLE PiP)
// ==========================================
let isDraggingPip = false;
let pipStartX = 0;
let pipStartY = 0;
let pipInitialLeft = 0;
let pipInitialTop = 0;

// PiP, uygulama kutusunun (.app-container) içinde konumlanır.
// Bilgisayarda kutu ekranın ortasında olduğu için koordinatları ona göre hesaplıyoruz.
function getPipParentRect() {
  const parent = localPipContainer.offsetParent || document.body;
  return parent.getBoundingClientRect();
}

function startPipDrag(clientX, clientY) {
  isDraggingPip = true;
  localPipContainer.classList.add('dragging');
  pipStartX = clientX;
  pipStartY = clientY;
  const rect = localPipContainer.getBoundingClientRect();
  const parentRect = getPipParentRect();
  pipInitialLeft = rect.left - parentRect.left;
  pipInitialTop = rect.top - parentRect.top;

  localPipContainer.style.bottom = 'auto';
  localPipContainer.style.right = 'auto';
  localPipContainer.style.left = pipInitialLeft + 'px';
  localPipContainer.style.top = pipInitialTop + 'px';
}

function movePipDrag(clientX, clientY) {
  if (!isDraggingPip) return;
  localPipContainer.style.left = (pipInitialLeft + clientX - pipStartX) + 'px';
  localPipContainer.style.top = (pipInitialTop + clientY - pipStartY) + 'px';
}

// En yakın 4 köşeden birine mıknatıs gibi oturt
function snapPipToCorner() {
  const parentRect = getPipParentRect();
  const pipWidth = localPipContainer.offsetWidth;
  const pipHeight = localPipContainer.offsetHeight;
  const rect = localPipContainer.getBoundingClientRect();
  const centerX = rect.left - parentRect.left + pipWidth / 2;
  const centerY = rect.top - parentRect.top + pipHeight / 2;

  // Yatay: sol mu sağ mı? / Dikey: üst mü alt mı? (Üstte bar: 75px, altta buton: 110px boşluk)
  const snapLeft = (centerX < parentRect.width / 2) ? 16 : (parentRect.width - pipWidth - 16);
  const snapTop = (centerY < parentRect.height / 2) ? 75 : Math.max(75, parentRect.height - pipHeight - 110);

  localPipContainer.style.bottom = 'auto';
  localPipContainer.style.right = 'auto';
  localPipContainer.style.left = snapLeft + 'px';
  localPipContainer.style.top = snapTop + 'px';
}

// Parmağı/Fareyi bıraktığında (sadece gerçekten sürükleniyorsa) köşeye çek
function stopPipDrag() {
  if (!isDraggingPip) return;
  isDraggingPip = false;
  localPipContainer.classList.remove('dragging');
  snapPipToCorner();
}

if (localPipContainer) {
  // Mobilde Dokunmatik Sürükleme
  localPipContainer.addEventListener('touchstart', (e) => {
    if (e.target.closest('button')) return; // Butonlara basarken sürükleme
    const touch = e.touches[0];
    startPipDrag(touch.clientX, touch.clientY);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDraggingPip) return;
    e.preventDefault(); // Sürüklerken sayfa kaymasın / zıplamasın
    const touch = e.touches[0];
    movePipDrag(touch.clientX, touch.clientY);
  }, { passive: false });

  window.addEventListener('touchend', stopPipDrag);
  window.addEventListener('touchcancel', stopPipDrag);

  // Bilgisayarda Fareyle Sürükleme
  localPipContainer.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    startPipDrag(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingPip) movePipDrag(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', stopPipDrag);
}

// ----------------------------------------------------
// 7. SOCKET.IO ETKİNLİKLERİ
// ----------------------------------------------------
socket.on('waiting', () => {
  statusText.innerText = 'Sıradaki kişi aranıyor...';
  statusSubtext.innerText = 'Dünya genelinden kullanıcı bekleniyor';
});

socket.on('matched', async ({ roomId, isInitiator }) => {
  console.log(`[🎯] Eşleşildi! Oda: ${roomId}, Başlatıcı: ${isInitiator}`);
  statusText.innerText = 'Bağlantı kuruluyor...';
  statusSubtext.innerText = 'Video akışı başlatılıyor';

  createPeerConnection();

  if (isInitiator) {
    // Doğrudan P2P DataChannel Oluştur
    try {
      dataChannel = peerConnection.createDataChannel('chat');
      setupDataChannelEvents();
    } catch(e) {
      console.warn('DataChannel oluşturulamadı:', e);
    }

    // Arayan taraf: SDP Offer oluştur ve gönder
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('signal_offer', offer);
    } catch (err) {
      console.error('Offer oluşturma hatası:', err);
    }
  }
});

socket.on('signal_offer', async (offer) => {
  if (!peerConnection) createPeerConnection();
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    // Bekleyen adayları ekle
    while (queuedCandidates.length > 0) {
      await peerConnection.addIceCandidate(queuedCandidates.shift());
    }
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('signal_answer', answer);
  } catch (err) {
    console.error('Offer karşılama hatası:', err);
  }
});

socket.on('signal_answer', async (answer) => {
  try {
    if (peerConnection && peerConnection.signalingState !== 'stable') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      while (queuedCandidates.length > 0) {
        await peerConnection.addIceCandidate(queuedCandidates.shift());
      }
    }
  } catch (err) {
    console.error('Answer işleme hatası:', err);
  }
});

socket.on('signal_candidate', async (candidate) => {
  try {
    const iceCandidate = new RTCIceCandidate(candidate);
    if (peerConnection && peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
      await peerConnection.addIceCandidate(iceCandidate);
    } else {
      queuedCandidates.push(iceCandidate);
    }
  } catch (err) {
    console.error('ICE adayı ekleme hatası:', err);
  }
});

socket.on('partner_disconnected', () => {
  handlePartnerLeft();
});

socket.on('finding_next', () => {
  socket.emit('find_partner');
});

// Gerçek Anlık Kullanıcı Sayacı
socket.on('online_count', (count) => {
  if (activeCountBadge) {
    activeCountBadge.innerText = `🟢 ${count} Çevrimiçi`;
  }
});

// ----------------------------------------------------
// 8. KANITLI ŞİKAYET ET & ADİL BAN KONTROLLERİ
// ----------------------------------------------------
if (reportBtn) {
  const openReport = (e) => {
    e.stopPropagation();
    reportModal.classList.remove('hidden');
  };
  reportBtn.addEventListener('click', openReport);
  reportBtn.addEventListener('touchend', openReport);
}

if (cancelReportBtn) {
  const closeReport = (e) => {
    e.stopPropagation();
    reportModal.classList.add('hidden');
  };
  cancelReportBtn.addEventListener('click', closeReport);
  cancelReportBtn.addEventListener('touchend', closeReport);
}

// Şikayet modalının karartısına basınca da kapat
if (reportModal) {
  reportModal.addEventListener('click', (e) => {
    if (e.target === reportModal) {
      reportModal.classList.add('hidden');
    }
  });
}

// 1 Kare Gizli Kanıt Al ve Çıplaklık/Ten Rengi Oranını Analiz Et
function analyzeEvidenceSnapshot() {
  try {
    if (!remoteVideo || remoteVideo.videoWidth === 0) {
      return { isNsfwVerified: false, score: 0 };
    }

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(remoteVideo, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    let skinPixelCount = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Bilgisayarlı Görü (Computer Vision) Ten Rengi / Çıplaklık Tespiti Kriteri
      const isSkin = (r > 95 && g > 40 && b > 20 &&
                      (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
                      Math.abs(r - g) > 15 && r > g && r > b);

      if (isSkin) skinPixelCount++;
    }

    const skinRatio = skinPixelCount / totalPixels;
    const score = Math.round(skinRatio * 100);

    // Eğer karedeki ten rengi / çıplaklık oranı %45'in üzerindeyse: Kanıt Doğrulandı!
    return {
      isNsfwVerified: skinRatio >= 0.45,
      score: score
    };
  } catch (err) {
    console.error('Kanıt analizi hatası:', err);
    return { isNsfwVerified: false, score: 0 };
  }
}

window.submitReport = function(reason) {
  reportModal.classList.add('hidden');
  
  // Şikayet anında karşı taraftan 1 kare kanıt analiz et
  const { isNsfwVerified, score } = analyzeEvidenceSnapshot();
  
  closePeerConnection();
  
  placeholderOverlay.classList.remove('hidden');
  statusText.innerText = 'İnceleniyor & İşleniyor...';
  statusSubtext.innerText = 'Sıradaki kişi aranıyor...';
  
  // Kanıt verisiyle birlikte sunucuya bildir
  socket.emit('report_partner_with_proof', {
    reason,
    isNsfwVerified,
    score
  });
};

socket.on('report_feedback', (data) => {
  if (data.success) {
    alert('🛡️ Şikayetiniz incelendi: Uygunsuz içerik tespit edildi ve kullanıcı sistemden yasaklandı.');
  } else {
    alert('🕊️ Şikayetiniz alındı: Karşı taraftan ayrıldınız, sıradaki kişi aranıyor.');
  }
});

socket.on('banned', (data) => {
  closePeerConnection();
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
  }
  bannedModal.classList.remove('hidden');
  if (data?.reason) {
    bannedReason.innerText = data.reason;
  }
});

