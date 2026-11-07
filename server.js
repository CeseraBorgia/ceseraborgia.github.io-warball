/**
 * BallWar - TikTok Live Connector WebSocket Bridge
 * Connects to live TikTok broadcast and relays events to the game canvas via WebSocket (ws://localhost:8081).
 *
 * Usage:
 *   node server.js <TIKTOK_USERNAME>
 * Example:
 *   node server.js tiktok_live_user
 */

import { WebcastPushConnection } from 'tiktok-live-connector';
import { WebSocketServer, WebSocket } from 'ws';

const TIKTOK_USERNAME = process.argv[2] || process.env.TIKTOK_USER;
const WS_PORT = process.env.PORT || 8081;

// 1. Start WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`====================================================`);
console.log(`⚡ BallWar TikTok WebSocket Bridge`);
console.log(`📡 WebSocket sunucusu dinleniyor: ws://localhost:${WS_PORT}`);
console.log(`====================================================`);

function broadcast(eventType, payload) {
  const message = JSON.stringify({ type: eventType, payload });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  console.log(`[WebSocket] Yeni istemci bağlandı (Toplam: ${wss.clients.size})`);

  ws.on('close', () => {
    console.log(`[WebSocket] İstemci ayrıldı (Kalan: ${wss.clients.size})`);
  });
});

// 2. Connect to TikTok Live if username provided
if (!TIKTOK_USERNAME) {
  console.log(`\n⚠️  TikTok kullanıcı adı belirtilmedi!`);
  console.log(`   Kullanım: node server.js <TIKTOK_KULLANICI_ADI>`);
  console.log(`   Oyun simülasyon araçları ve tuş takımı (R, B, G, S, D) ile test edilebilir.\n`);
} else {
  console.log(`[TikTok] @${TIKTOK_USERNAME} yayınına bağlanılıyor...`);

  const tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    clientParams: {
      app_language: 'tr-TR',
      webcast_language: 'tr-TR'
    }
  });

  tiktokConnection.connect().then(state => {
    console.log(`✅ [TikTok] @${TIKTOK_USERNAME} yayınına başarıyla bağlandı! RoomId: ${state.roomId}`);
  }).catch(err => {
    console.error(`❌ [TikTok] Yayına bağlanılamadı:`, err.toString());
  });

  // Chat comments
  tiktokConnection.on('chat', data => {
    const isFollower = data.isFollower ?? (data.followRole > 0);
    console.log(`[Yorum] @${data.uniqueId}: "${data.comment}" (Takipçi: ${isFollower})`);
    broadcast('comment', {
      uniqueId: data.uniqueId,
      nickname: data.nickname || data.uniqueId,
      profilePictureUrl: data.profilePictureUrl,
      comment: data.comment,
      isFollower: Boolean(isFollower)
    });
  });

  // Likes
  tiktokConnection.on('like', data => {
    const isFollower = data.isFollower ?? (data.followRole > 0);
    console.log(`[Beğeni] @${data.uniqueId} ${data.likeCount} beğeni gönderdi`);
    broadcast('like', {
      uniqueId: data.uniqueId,
      nickname: data.nickname || data.uniqueId,
      likeCount: data.likeCount || 1,
      isFollower: Boolean(isFollower)
    });
  });

  // Gifts
  tiktokConnection.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) {
      // Streamed gift streak in progress, avoid spamming if desired
    }
    const isFollower = data.isFollower ?? (data.followRole > 0);
    console.log(`[Hediye] 🎁 @${data.uniqueId} -> ${data.giftName} (${data.diamondCount} elmas)`);
    broadcast('gift', {
      uniqueId: data.uniqueId,
      nickname: data.nickname || data.uniqueId,
      giftName: data.giftName,
      diamondCount: data.diamondCount || 1,
      isFollower: Boolean(isFollower)
    });
  });

  tiktokConnection.on('disconnected', () => {
    console.log('[TikTok] Yayın bağlantısı koptu!');
  });

  tiktokConnection.on('streamEnd', () => {
    console.log('[TikTok] Yayın sonlandı!');
  });
}
