/**
 * BallWar - TikTok Live Event Dispatcher & Integration Layer
 * Unified bridge for tiktok-live-connector, WebSocket server, keyboard shortcuts & on-screen Dev Tools.
 */

import { sounds } from './soundManager.js';

export class TikTokBridge {
  constructor(gameManager) {
    this.gm = gameManager;

    this.simulatedUsers = [
      { uniqueId: 'cyber_neo_99', nickname: 'NEO_CYBER', isFollower: true },
      { uniqueId: 'lunar_raven', nickname: 'LUNAR_RAVEN', isFollower: true },
      { uniqueId: 'tokyo_drift_x', nickname: 'TOKYO_DRIFT', isFollower: true },
      { uniqueId: 'synth_blade', nickname: 'SYNTH_BLADE', isFollower: true },
      { uniqueId: 'acid_queen', nickname: 'ACID_QUEEN', isFollower: true },
      { uniqueId: 'hyper_glitch', nickname: 'HYPER_GLITCH', isFollower: true },
      { uniqueId: 'neon_vamp', nickname: 'NEON_VAMP', isFollower: true },
      { uniqueId: 'retro_god', nickname: 'RETRO_GOD', isFollower: true },
      { uniqueId: 'zero_gravity_boy', nickname: '0G_WARRIOR', isFollower: true },
      { uniqueId: 'pixel_samurai', nickname: 'PIXEL_SAMURAI', isFollower: true },
    ];
    this.userIndex = 0;

    this.exposeGlobalAPIs();
    this.bindKeyboardShortcuts();
    this.setupWebSocketClient();
    this.createDevOverlay();
  }

  // 1. Unified Global Event Receiver APIs
  exposeGlobalAPIs() {
    window.onTikTokComment = (event) => {
      // event: { uniqueId, nickname, profilePictureUrl, comment, isFollower }
      this.gm.handleComment(event, event.comment);
    };

    window.onTikTokLike = (event) => {
      // event: { uniqueId, nickname, likeCount, isFollower }
      this.gm.handleLike(event, event.likeCount || 1);
    };

    window.onTikTokGift = (event) => {
      // event: { uniqueId, nickname, giftName, diamondCount, isFollower }
      this.gm.handleGift(event, event.giftName, event.diamondCount || 1);
    };
  }

  // Helper to pick or generate simulated user
  getSimulatedUser(isFollower = true) {
    const base = this.simulatedUsers[this.userIndex % this.simulatedUsers.length];
    this.userIndex++;
    return {
      uniqueId: `${base.uniqueId}_${Math.floor(Math.random() * 900 + 100)}`,
      nickname: `${base.nickname}_${Math.floor(Math.random() * 90 + 10)}`,
      profilePictureUrl: '',
      isFollower: isFollower
    };
  }

  // 2. Keyboard Debug Tools: R, B, G, S, D
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore key events when typing into an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toUpperCase();

      if (key === 'R') {
        // Simulate Red interaction
        this.simulateRedAction();
      } else if (key === 'B') {
        // Simulate Blue interaction
        this.simulateBlueAction();
      } else if (key === 'G') {
        // Simulate high-value gift
        this.simulateHighValueGift();
      } else if (key === 'S') {
        // Fast-forward game state
        this.gm.skipToNextState();
      } else if (key === 'D') {
        // Toggle Dev Panel
        this.toggleDevPanel();
      }
    });
  }

  simulateRedAction() {
    // If red team is empty, join a simulated red player
    if (this.gm.redTeam.size === 0 || Math.random() < 0.25) {
      const user = this.getSimulatedUser(true);
      window.onTikTokComment({
        ...user,
        comment: 'kırmızı'
      });
      return;
    }

    // Pick existing red player or simulate like/comment
    const redAvatars = Array.from(this.gm.redTeam.values());
    const randomAvatar = redAvatars[Math.floor(Math.random() * redAvatars.length)];

    if (Math.random() < 0.5) {
      window.onTikTokLike({
        ...randomAvatar.userData,
        likeCount: Math.floor(Math.random() * 5 + 1)
      });
    } else {
      window.onTikTokComment({
        ...randomAvatar.userData,
        comment: 'Kırmızı Güç! Hadi bastırın!'
      });
    }
  }

  simulateBlueAction() {
    if (this.gm.blueTeam.size === 0 || Math.random() < 0.25) {
      const user = this.getSimulatedUser(true);
      window.onTikTokComment({
        ...user,
        comment: 'mavi'
      });
      return;
    }

    const blueAvatars = Array.from(this.gm.blueTeam.values());
    const randomAvatar = blueAvatars[Math.floor(Math.random() * blueAvatars.length)];

    if (Math.random() < 0.5) {
      window.onTikTokLike({
        ...randomAvatar.userData,
        likeCount: Math.floor(Math.random() * 5 + 1)
      });
    } else {
      window.onTikTokComment({
        ...randomAvatar.userData,
        comment: 'Mavi Güç! Alıyoruz maçı!'
      });
    }
  }

  simulateHighValueGift() {
    const isRed = (Math.random() < 0.5);
    const targetMap = isRed ? this.gm.redTeam : this.gm.blueTeam;

    let user;
    if (targetMap.size > 0) {
      const avs = Array.from(targetMap.values());
      user = avs[Math.floor(Math.random() * avs.length)].userData;
    } else {
      user = this.getSimulatedUser(true);
    }

    const gifts = [
      { name: 'Kırmızı Gül', diamonds: 1 },
      { name: 'TikTok Yıldızı', diamonds: 10 },
      { name: 'Süper Araba', diamonds: 999 },
      { name: 'Galaksi Evreni', diamonds: 19999 }
    ];
    const chosen = gifts[Math.floor(Math.random() * gifts.length)];

    window.onTikTokGift({
      ...user,
      giftName: chosen.name,
      diamondCount: chosen.diamonds
    });
  }

  // 3. Optional WebSocket Client for live connector (server.js)
  setupWebSocketClient() {
    this.wsConnected = false;
    const connectWS = () => {
      try {
        const ws = new WebSocket('ws://localhost:8081');

        ws.onopen = () => {
          this.wsConnected = true;
          this.updateWSStatus(true);
          console.log('[TikTokBridge] WebSocket bağlantısı kuruldu (ws://localhost:8081)');
        };

        ws.onmessage = (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data.type === 'comment' && window.onTikTokComment) {
              window.onTikTokComment(data.payload);
            } else if (data.type === 'like' && window.onTikTokLike) {
              window.onTikTokLike(data.payload);
            } else if (data.type === 'gift' && window.onTikTokGift) {
              window.onTikTokGift(data.payload);
            }
          } catch (e) {
            console.error('[TikTokBridge] WebSocket mesajı parse edilemedi:', e);
          }
        };

        ws.onclose = () => {
          this.wsConnected = false;
          this.updateWSStatus(false);
          setTimeout(connectWS, 4000); // Reconnect loop
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        // Silently retry
        setTimeout(connectWS, 4000);
      }
    };

    connectWS();
  }

  updateWSStatus(connected) {
    const el = document.getElementById('ws-status-indicator');
    if (el) {
      el.textContent = connected ? '● Canlı TikTok: Bağlı' : '○ Canlı TikTok: Bekliyor (server.js)';
      el.style.color = connected ? '#39FF14' : '#94A3B8';
    }
  }

  // 4. On-Screen HTML Dev Controller Panel
  createDevOverlay() {
    const panel = document.createElement('div');
    panel.id = 'dev-control-panel';
    panel.innerHTML = `
      <div class="dev-header">
        <span class="dev-title">⚡ BALLWAR DEV TOOLS</span>
        <button id="dev-toggle-btn" title="Paneli Küçült/Büyüt (Kısayol: D)">_</button>
      </div>
      <div id="dev-body" class="dev-body">
        <div class="dev-row">
          <span id="ws-status-indicator" class="ws-status">○ Canlı TikTok: Bekliyor (server.js)</span>
        </div>
        <div class="dev-section-title">SIMULATE PLAYERS</div>
        <div class="dev-grid">
          <button id="btn-join-red" class="btn btn-red">+ Kırmızı Katıl</button>
          <button id="btn-join-blue" class="btn btn-blue">+ Mavi Katıl</button>
          <button id="btn-join-nonfollower" class="btn btn-gray">+ Takipçi Olmayan</button>
          <button id="btn-fill-teams" class="btn btn-purple">+ 10 Oyuncu Doldur</button>
        </div>
        <div class="dev-section-title">INTERACTIONS</div>
        <div class="dev-grid">
          <button id="btn-like-red" class="btn btn-red">❤️ Kırmızı Like (R)</button>
          <button id="btn-like-blue" class="btn btn-blue">❤️ Mavi Like (B)</button>
          <button id="btn-comment-red" class="btn btn-red">💬 Kırmızı Yorum</button>
          <button id="btn-comment-blue" class="btn btn-blue">💬 Mavi Yorum</button>
        </div>
        <div class="dev-section-title">GIFTS (ELMAS)</div>
        <div class="dev-grid">
          <button id="btn-gift-rose" class="btn btn-gold">🌹 Gül (1💎)</button>
          <button id="btn-gift-heart" class="btn btn-gold">💖 Kalp (10💎)</button>
          <button id="btn-gift-car" class="btn btn-gold">🏎️ Araba (999💎)</button>
          <button id="btn-gift-galaxy" class="btn btn-gold">🌌 Galaksi (G)</button>
        </div>
        <div class="dev-section-title">CONTROL</div>
        <div class="dev-grid">
          <button id="btn-next-state" class="btn btn-cyan">⏩ Sonraki Faz (S)</button>
          <button id="btn-toggle-sound" class="btn btn-gray">🔊 Ses: Açık</button>
        </div>
        <div class="dev-footer">
          Kısayollar: <b>R</b> (Kırmızı) | <b>B</b> (Mavi) | <b>G</b> (Hediye) | <b>S</b> (İlerle) | <b>D</b> (Gizle)
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Event bindings for UI buttons
    document.getElementById('dev-toggle-btn').addEventListener('click', () => this.toggleDevPanel());

    document.getElementById('btn-join-red').addEventListener('click', () => {
      const u = this.getSimulatedUser(true);
      window.onTikTokComment({ ...u, comment: 'kırmızı' });
    });

    document.getElementById('btn-join-blue').addEventListener('click', () => {
      const u = this.getSimulatedUser(true);
      window.onTikTokComment({ ...u, comment: 'mavi' });
    });

    document.getElementById('btn-join-nonfollower').addEventListener('click', () => {
      const u = this.getSimulatedUser(false);
      window.onTikTokComment({ ...u, comment: 'kırmızı' });
    });

    document.getElementById('btn-fill-teams').addEventListener('click', () => {
      for (let i = 0; i < 5; i++) {
        const u1 = this.getSimulatedUser(true);
        window.onTikTokComment({ ...u1, comment: 'kırmızı' });
        const u2 = this.getSimulatedUser(true);
        window.onTikTokComment({ ...u2, comment: 'mavi' });
      }
    });

    document.getElementById('btn-like-red').addEventListener('click', () => this.simulateRedAction());
    document.getElementById('btn-like-blue').addEventListener('click', () => this.simulateBlueAction());

    document.getElementById('btn-comment-red').addEventListener('click', () => {
      this.simulateRedAction();
    });
    document.getElementById('btn-comment-blue').addEventListener('click', () => {
      this.simulateBlueAction();
    });

    document.getElementById('btn-gift-rose').addEventListener('click', () => {
      const u = this.getSimulatedUser(true);
      window.onTikTokGift({ ...u, giftName: 'Gül', diamondCount: 1 });
    });
    document.getElementById('btn-gift-heart').addEventListener('click', () => {
      const u = this.getSimulatedUser(true);
      window.onTikTokGift({ ...u, giftName: 'Kalp', diamondCount: 10 });
    });
    document.getElementById('btn-gift-car').addEventListener('click', () => {
      const u = this.getSimulatedUser(true);
      window.onTikTokGift({ ...u, giftName: 'Spor Araba', diamondCount: 999 });
    });
    document.getElementById('btn-gift-galaxy').addEventListener('click', () => this.simulateHighValueGift());

    document.getElementById('btn-next-state').addEventListener('click', () => this.gm.skipToNextState());

    const soundBtn = document.getElementById('btn-toggle-sound');
    soundBtn.addEventListener('click', () => {
      const isMuted = sounds.toggleMute();
      soundBtn.textContent = isMuted ? '🔇 Ses: Kapalı' : '🔊 Ses: Açık';
    });
  }

  toggleDevPanel() {
    const body = document.getElementById('dev-body');
    const btn = document.getElementById('dev-toggle-btn');
    if (!body || !btn) return;
    if (body.style.display === 'none') {
      body.style.display = 'block';
      btn.textContent = '_';
    } else {
      body.style.display = 'none';
      btn.textContent = '+';
    }
  }
}
