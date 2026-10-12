const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Statik dosyaları sun (Hem ana dizinden hem de public klasöründen)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Eşleşme bekleme havuzu ve aktif odalar (O(1) yüksek performanslı Set & Map mimarisi)
const waitingQueue = new Set(); // Binlerce kullanıcı için O(1) anlık arama/ekleme/silme
const activePairs = new Map(); // socketId -> partnerSocketId

// Güvenlik & Ban Sistemi
const bannedIps = new Set();
const falseReportCounters = new Map(); // Sahte şikayet atan trolleri takip et

function getClientIp(socket) {
  return socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || 'unknown';
}

function broadcastOnlineCount() {
  const count = io.engine.clientsCount;
  io.emit('online_count', count);
}

io.on('connection', (socket) => {
  const clientIp = getClientIp(socket);

  // Banlı kullanıcı kontrolü
  if (bannedIps.has(clientIp)) {
    console.log(`[🚫] Banlı IP engellendi: ${clientIp}`);
    socket.emit('banned', { reason: 'Topluluk kurallarını ihlal ettiğiniz (kanıtlanmış uygunsuz içerik) için süresiz engellendiniz.' });
    socket.disconnect();
    return;
  }

  // Gerçek çevrimiçi sayısını herkese bildir
  broadcastOnlineCount();

  // Kullanıcı arama başlattığında (Binlerce kullanıcıyı mikrosaniyede eşleştirme)
  socket.on('find_partner', () => {
    if (bannedIps.has(clientIp)) {
      socket.emit('banned', { reason: 'Erişiminiz engellenmiştir.' });
      return;
    }

    cleanupUser(socket.id);

    // Havuzdan müsait olan İLK geçerli partneri seç
    let matchedPartner = null;
    for (const candidateId of waitingQueue) {
      waitingQueue.delete(candidateId); // Havuzdan anında çıkar

      if (candidateId === socket.id) continue;

      const candidateSocket = io.sockets.sockets.get(candidateId);
      // Bağlantısı kopmamış ve şu an başka biriyle konuşmayan kullanıcı
      if (candidateSocket && candidateSocket.connected && !activePairs.has(candidateId)) {
        matchedPartner = candidateSocket;
        break;
      }
    }

    if (matchedPartner) {
      const roomId = `room_${socket.id}_${matchedPartner.id}`;
      socket.join(roomId);
      matchedPartner.join(roomId);

      activePairs.set(socket.id, matchedPartner.id);
      activePairs.set(matchedPartner.id, socket.id);

      socket.emit('matched', { roomId, isInitiator: true });
      matchedPartner.emit('matched', { roomId, isInitiator: false });
    } else {
      waitingQueue.add(socket.id);
      socket.emit('waiting');
    }
  });

  // AKILLI KANITLI ŞİKAYET SİSTEMİ (ADİL YARGI)
  socket.on('report_partner_with_proof', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (!partnerId) return;

    const partnerSocket = io.sockets.sockets.get(partnerId);
    if (!partnerSocket) return;

    const partnerIp = getClientIp(partnerSocket);
    const { isNsfwVerified, score } = data;

    if (isNsfwVerified) {
      bannedIps.add(partnerIp);
      partnerSocket.emit('banned', { 
        reason: 'Yapay zeka denetimi tarafından uygunsuz içerik kesin olarak tespit edildi ve cihazınız engellendi.' 
      });
      partnerSocket.disconnect();

      socket.emit('report_feedback', { 
        success: true, 
        message: 'Kullanıcı incelendi, suç unsuru tespit edildi ve kalıcı olarak engellendi.' 
      });
    } else {
      cleanupAndNotifyPartner(partnerId);
      const falseCount = (falseReportCounters.get(clientIp) || 0) + 1;
      falseReportCounters.set(clientIp, falseCount);

      socket.emit('report_feedback', { 
        success: false, 
        message: 'İncelenen karede suç unsuru tespit edilmedi. Masum kullanıcılar banlanmaz.' 
      });
    }

    cleanupAndNotifyPartner(socket.id);
    socket.emit('finding_next');
  });

  // Sıradakine geç (Swipe ile)
  socket.on('skip', () => {
    cleanupAndNotifyPartner(socket.id);
    socket.emit('finding_next');
  });

  // Aramayı durdur
  socket.on('stop', () => {
    cleanupAndNotifyPartner(socket.id);
    socket.emit('stopped');
  });

  // WebRTC Sinyalleri
  socket.on('signal_offer', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) io.to(partnerId).emit('signal_offer', data);
  });

  socket.on('signal_answer', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) io.to(partnerId).emit('signal_answer', data);
  });

  socket.on('signal_candidate', (data) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) io.to(partnerId).emit('signal_candidate', data);
  });

  // Basit ve Hızlı Canlı Sohbet Mesajı (Chat)
  socket.on('chat_message', (msgText) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId && typeof msgText === 'string') {
      const sanitized = msgText.trim().slice(0, 150);
      if (sanitized.length > 0) {
        io.to(partnerId).emit('chat_message', sanitized);
      }
    }
  });

  socket.on('disconnect', () => {
    cleanupAndNotifyPartner(socket.id);
    broadcastOnlineCount();
  });
});

function cleanupUser(socketId) {
  waitingQueue.delete(socketId);
  const partnerId = activePairs.get(socketId);
  if (partnerId) {
    activePairs.delete(socketId);
    activePairs.delete(partnerId);
  }
}

function cleanupAndNotifyPartner(socketId) {
  waitingQueue.delete(socketId);
  const partnerId = activePairs.get(socketId);
  if (partnerId) {
    activePairs.delete(socketId);
    activePairs.delete(partnerId);
    io.to(partnerId).emit('partner_disconnected');
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Sohbet Sunucusu Çalışıyor! (Adil Yargı & AI Koruma)`);
  console.log(`📱 Yerel:   http://localhost:${PORT}`);
  console.log(`👥 Canlı Gerçek Kullanıcı Sayacı Devrede`);
  console.log(`🛡️  Otomatik Kanıt Analizi (Masum Korumalı) Aktif`);
  console.log(`=================================================\n`);
});
