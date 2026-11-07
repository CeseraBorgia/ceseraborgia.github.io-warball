/**
 * BallWar - Game Loop & State Machine Manager
 * Coordinates Lobby, Roster Showcase, Tug-of-War Match, Victory Podium, and Leaderboard.
 */

import { CONFIG } from '../config.js';
import { Avatar } from './avatarGenerator.js';
import { sounds } from './soundManager.js';

const PIXI = window.PIXI;
const gsap = window.gsap;

export class GameManager {
  constructor(app, arena, physics, particlePool) {
    this.app = app;
    this.arena = arena;
    this.physics = physics;
    this.particles = particlePool;

    // Team Collections
    this.redTeam = new Map(); // uniqueId -> Avatar
    this.blueTeam = new Map(); // uniqueId -> Avatar
    this.allPlayers = new Map(); // uniqueId -> Avatar

    // Layer containers
    this.charactersLayer = new PIXI.Container();
    this.hudLayer = new PIXI.Container();
    this.app.stage.addChild(this.charactersLayer);
    this.app.stage.addChild(this.hudLayer);

    // State Variables
    this.currentState = CONFIG.STATES.LOBBY;
    this.stateTimer = CONFIG.DURATIONS.LOBBY;
    this.winnerTeam = null;

    // Scores
    this.redScore = 0;
    this.blueScore = 0;

    // Combat floating text layer
    this.combatTextContainer = new PIXI.Container();
    this.hudLayer.addChild(this.combatTextContainer);

    // Build HUD & Overlays
    this.buildHUD();

    // Start with Lobby
    this.enterState(CONFIG.STATES.LOBBY);
  }

  buildHUD() {
    // 1. Center Banner / Countdown Display - Pinned at Y=445 (Just below Red boundary, zero overlap with ball)
    this.centerBanner = new PIXI.Container();
    this.centerBanner.x = CONFIG.STAGE_WIDTH / 2;
    this.centerBanner.y = 445;

    const bannerBg = new PIXI.Graphics();
    bannerBg.beginFill(0x0A0814, 0.92);
    bannerBg.lineStyle(2, 0xBD00FF, 1);
    bannerBg.drawRoundedRect(-240, -36, 480, 72, 16);
    bannerBg.endFill();

    this.bannerTitle = new PIXI.Text('LOBİ & KATILIM ZAMANI', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 20,
      fontWeight: '900',
      fill: '#00E5FF',
      dropShadow: true,
      dropShadowColor: '#00E5FF',
      dropShadowBlur: 6,
    });
    this.bannerTitle.anchor.set(0.5, 0.7);

    this.bannerSubText = new PIXI.Text('30s', {
      fontFamily: 'Montserrat, Rajdhani, sans-serif',
      fontSize: 28,
      fontWeight: '900',
      fill: '#FFD700',
    });
    this.bannerSubText.anchor.set(0.5, -0.4);

    this.centerBanner.addChild(bannerBg);
    this.centerBanner.addChild(this.bannerTitle);
    this.centerBanner.addChild(this.bannerSubText);
    this.hudLayer.addChild(this.centerBanner);

    // 2. Joining Prompt Marquee - Placed at Y=1480 (Just above Blue boundary, corridor stays clear)
    this.promptText = new PIXI.Text("Katılmak için 'kırmızı' veya 'mavi' yazın! (Sadece Takipçiler)", {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: 18,
      fontWeight: '700',
      fill: '#FFFFFF',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 5,
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = CONFIG.STAGE_WIDTH / 2;
    this.promptText.y = 1480;
    this.hudLayer.addChild(this.promptText);

    // 3. Notification Toast Banner - Floats at Y=530 below banner
    this.toastContainer = new PIXI.Container();
    this.toastContainer.x = CONFIG.STAGE_WIDTH / 2;
    this.toastContainer.y = 530;
    this.toastContainer.alpha = 0;

    const toastBg = new PIXI.Graphics();
    toastBg.beginFill(0x1B0B2E, 0.95);
    toastBg.lineStyle(2, 0xFF0055, 1);
    toastBg.drawRoundedRect(-300, -24, 600, 48, 14);
    toastBg.endFill();

    this.toastText = new PIXI.Text('Bildirim', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 15,
      fontWeight: '800',
      fill: '#FFFFFF',
    });
    this.toastText.anchor.set(0.5);

    this.toastContainer.addChild(toastBg);
    this.toastContainer.addChild(this.toastText);
    this.hudLayer.addChild(this.toastContainer);

    // 4. Full-screen Leaderboard Container (State 5)
    this.leaderboardOverlay = new PIXI.Container();
    this.leaderboardOverlay.visible = false;
    this.hudLayer.addChild(this.leaderboardOverlay);
  }

  showToast(message, color = 0x00E5FF) {
    this.toastText.text = message;
    this.toastText.style.fill = (typeof color === 'string') ? color : '#' + color.toString(16).padStart(6, '0');
    gsap.killTweensOf(this.toastContainer);
    this.toastContainer.y = 510;
    gsap.timeline()
      .to(this.toastContainer, { alpha: 1, y: 530, duration: 0.35, ease: 'back.out(1.5)' })
      .to(this.toastContainer, { alpha: 0, y: 500, duration: 0.4, delay: 2.2 });
  }

  showCombatText(text, x, y, color = 0x00E5FF) {
    const label = new PIXI.Text(text, {
      fontFamily: 'Montserrat, Rajdhani, sans-serif',
      fontSize: 20,
      fontWeight: '900',
      fill: (typeof color === 'string') ? color : '#' + color.toString(16).padStart(6, '0'),
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 6,
    });
    label.anchor.set(0.5);
    label.x = x + (Math.random() - 0.5) * 16;
    label.y = y;
    this.combatTextContainer.addChild(label);

    gsap.timeline({
      onComplete: () => {
        this.combatTextContainer.removeChild(label);
        label.destroy();
      }
    })
    .to(label, { y: y - 45, alpha: 1, duration: 0.15 })
    .to(label, { y: y - 80, alpha: 0, duration: 0.45, ease: 'power1.in' }, '+=0.2');
  }

  // --- STATE TRANSITIONS ---
  enterState(newState) {
    this.currentState = newState;
    this.stateTimer = CONFIG.DURATIONS[newState] || 30;

    switch (newState) {
      case CONFIG.STATES.LOBBY:
        this.onEnterLobby();
        break;
      case CONFIG.STATES.ROSTER_SHOWCASE:
        this.onEnterRosterShowcase();
        break;
      case CONFIG.STATES.MATCH:
        this.onEnterMatch();
        break;
      case CONFIG.STATES.VICTORY_PODIUM:
        this.onEnterVictoryPodium();
        break;
      case CONFIG.STATES.LEADERBOARD:
        this.onEnterLeaderboard();
        break;
    }
  }

  onEnterLobby() {
    this.centerBanner.visible = true;
    this.promptText.visible = true;
    this.leaderboardOverlay.visible = false;
    this.bannerTitle.text = 'LOBİ & KATILIM ZAMANI';
    this.bannerTitle.style.fill = '#00E5FF';
    this.promptText.text = "Katılmak için 'kırmızı' veya 'mavi' yazın! (Sadece Takipçiler)";

    this.physics.reset();
    this.winnerTeam = null;
    this.arena.ball.visible = false; // Hide ball in lobby

    // Set all avatars to idle in their team zones
    this.repositionLobbyAvatars();
  }

  onEnterRosterShowcase() {
    sounds.playVictory();
    this.centerBanner.visible = true;
    this.promptText.visible = true;
    this.leaderboardOverlay.visible = false;
    this.bannerTitle.text = 'TAKIMLAR BELİRLENDİ!';
    this.bannerTitle.style.fill = '#FFD700';
    this.promptText.text = `${this.redTeam.size} KIRMIZI  VS  ${this.blueTeam.size} MAVİ - SAVAŞ BAŞLIYOR!`;

    this.arena.ball.visible = true;
    this.arena.ball.y = CONFIG.CORRIDOR.CENTER_Y;

    // Line up characters in stadium grid formation on both stages
    this.repositionShowcaseAvatars();
  }

  onEnterMatch() {
    sounds.playImpulse();
    this.centerBanner.visible = true;
    this.promptText.visible = false;
    this.leaderboardOverlay.visible = false;
    this.bannerTitle.text = 'TUG-OF-WAR SAVAŞI';
    this.bannerTitle.style.fill = '#FF0055';

    this.physics.startMatch();
    this.arena.ball.visible = true;

    // Set all avatars to pushing posture at boundary line
    this.repositionMatchAvatars();
  }

  onEnterVictoryPodium() {
    sounds.playVictory();
    sounds.playCrowdRoar();
    this.centerBanner.visible = true;
    this.promptText.visible = false;
    this.leaderboardOverlay.visible = false;

    const winnerName = (this.winnerTeam === 'RED') ? 'KIRMIZI TAKIM' : 'MAVİ TAKIM';
    const winnerColor = (this.winnerTeam === 'RED') ? CONFIG.RED_ZONE.COLOR_HEX : CONFIG.BLUE_ZONE.COLOR_HEX;
    this.bannerTitle.text = `${winnerName} KAZANDI!`;
    this.bannerTitle.style.fill = winnerColor;

    this.physics.stopMatch();

    // Spawn massive confetti and fireworks
    this.particles.spawnConfetti(CONFIG.STAGE_WIDTH / 2, CONFIG.CORRIDOR.CENTER_Y, [
      (this.winnerTeam === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR,
      0xFFD700, 0xFFFFFF
    ], 120);

    // Setup celebration podium
    this.setupVictoryPodium();
  }

  onEnterLeaderboard() {
    this.centerBanner.visible = false;
    this.promptText.visible = false;
    this.leaderboardOverlay.visible = true;

    this.buildLeaderboardView();
  }

  // --- REPOSITIONING & ROSTER MANAGEMENT HELPERS ---
  updateTeamStatsDisplay() {
    const redTotal = this.redTeam.size;
    const blueTotal = this.blueTeam.size;
    const redActive = Math.min(14, redTotal);
    const blueActive = Math.min(14, blueTotal);
    const redQueue = Math.max(0, redTotal - 14);
    const blueQueue = Math.max(0, blueTotal - 14);

    this.arena.updateTeamStats(redActive, this.redScore, blueActive, this.blueScore, redQueue, blueQueue);
  }

  // Ensure active interacting players are promoted to the frontline if in queue
  promotePlayerToStage(player) {
    player.lastActiveTimestamp = Date.now();
    const teamMap = (player.team === 'RED') ? this.redTeam : this.blueTeam;
    const isRed = (player.team === 'RED');

    // If player is already on stage, update timestamp and return
    if (player.visible && player.onStage) return;

    // Filter players currently on stage
    const onStagePlayers = Array.from(teamMap.values()).filter(p => p.onStage);

    if (onStagePlayers.length >= 14) {
      // Find the least recently active player to bench
      onStagePlayers.sort((a, b) => (a.lastActiveTimestamp || 0) - (b.lastActiveTimestamp || 0));
      const benched = onStagePlayers[0];
      benched.onStage = false;
      benched.visible = false;

      // Assign benched player's slot coordinates to the incoming active player
      player.x = benched.targetX;
      player.y = isRed ? -80 : CONFIG.STAGE_HEIGHT + 80;
      player.targetX = benched.targetX;
      player.targetY = benched.targetY;
    } else {
      // Free slot available
      const idx = onStagePlayers.length;
      const cols = 7;
      const spacingX = (CONFIG.STAGE_WIDTH - 280) / 6;
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      player.targetX = 140 + col * spacingX;
      player.targetY = isRed ? ((row === 0) ? 200 : 315) : ((row === 0) ? 1605 : 1720);
      player.x = player.targetX;
      player.y = isRed ? -80 : CONFIG.STAGE_HEIGHT + 80;
    }

    player.onStage = true;
    player.visible = true;
    gsap.from(player, {
      y: isRed ? -90 : CONFIG.STAGE_HEIGHT + 90,
      alpha: 0,
      duration: 0.45,
      ease: 'back.out(1.5)'
    });

    this.updateTeamStatsDisplay();
  }

  repositionLobbyAvatars() {
    const arrange = (teamMap, isRed) => {
      const allAvatars = Array.from(teamMap.values());
      if (allAvatars.length === 0) return;

      allAvatars.sort((a, b) => (b.lastActiveTimestamp || 0) - (a.lastActiveTimestamp || 0));

      const active = allAvatars.slice(0, 14);
      const queued = allAvatars.slice(14);

      queued.forEach(av => {
        av.visible = false;
        av.onStage = false;
      });

      const cols = 7;
      const spacingX = (CONFIG.STAGE_WIDTH - 280) / 6;
      const startX = 140;

      active.forEach((av, idx) => {
        av.visible = true;
        av.onStage = true;
        av.setState('idle');
        gsap.to(av.scale, { x: av.baseScale, y: av.baseScale, duration: 0.35 });
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        av.targetX = startX + col * spacingX;
        av.targetY = isRed ? (200 + row * 115) : (1605 + row * 115);
      });
    };

    arrange(this.redTeam, true);
    arrange(this.blueTeam, false);
    this.updateTeamStatsDisplay();
  }

  repositionShowcaseAvatars() {
    const arrange = (teamMap, isRed) => {
      const allAvatars = Array.from(teamMap.values());
      if (allAvatars.length === 0) return;

      allAvatars.sort((a, b) => (b.lastActiveTimestamp || 0) - (a.lastActiveTimestamp || 0));

      const active = allAvatars.slice(0, 14);
      const queued = allAvatars.slice(14);

      queued.forEach(av => {
        av.visible = false;
        av.onStage = false;
      });

      const cols = 7;
      const spacingX = (CONFIG.STAGE_WIDTH - 280) / 6;
      const startX = 140;

      active.forEach((av, idx) => {
        av.visible = true;
        av.onStage = true;
        av.setState('idle');
        gsap.to(av.scale, { x: av.baseScale, y: av.baseScale, duration: 0.3 });
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        av.targetX = startX + col * spacingX;
        av.targetY = isRed ? (200 + row * 115) : (1605 + row * 115);
      });
    };

    arrange(this.redTeam, true);
    arrange(this.blueTeam, false);
    this.updateTeamStatsDisplay();
  }

  repositionMatchAvatars() {
    const arrange = (teamMap, isRed) => {
      const allAvatars = Array.from(teamMap.values());
      if (allAvatars.length === 0) return;

      allAvatars.sort((a, b) => (b.lastActiveTimestamp || 0) - (a.lastActiveTimestamp || 0));

      const active = allAvatars.slice(0, 14);
      const queued = allAvatars.slice(14);

      queued.forEach(av => {
        av.visible = false;
        av.onStage = false;
      });

      const cols = 7;
      const spacingX = (CONFIG.STAGE_WIDTH - 280) / 6;
      const startX = 140;

      active.forEach((av, idx) => {
        av.visible = true;
        av.onStage = true;
        av.setState('idle'); // IDLE! Does not emit static lines. Only pulses when action triggered!
        gsap.to(av.scale, { x: av.baseScale, y: av.baseScale, duration: 0.3 });
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        av.targetX = startX + col * spacingX;
        // Red: Row 0 at 200 (back row), Row 1 at 315 (front battle line)
        // Blue: Row 0 at 1605 (front battle line), Row 1 at 1720 (back row)
        if (isRed) {
          av.targetY = (row === 0) ? 200 : 315;
        } else {
          av.targetY = (row === 0) ? 1605 : 1720;
        }
      });
    };

    arrange(this.redTeam, true);
    arrange(this.blueTeam, false);
    this.updateTeamStatsDisplay();
  }

  setupVictoryPodium() {
    const winningMap = (this.winnerTeam === 'RED') ? this.redTeam : this.blueTeam;
    const losingMap = (this.winnerTeam === 'RED') ? this.blueTeam : this.redTeam;

    const winners = Array.from(winningMap.values()).sort((a, b) => b.points - a.points);
    const losers = Array.from(losingMap.values());

    // 1. Center Podium: Top 3 Gifters / Contributors
    const podiumCoords = [
      { x: CONFIG.STAGE_WIDTH / 2, y: CONFIG.CORRIDOR.CENTER_Y - 40, scale: 1.35 },     // 1st Place
      { x: CONFIG.STAGE_WIDTH / 2 - 190, y: CONFIG.CORRIDOR.CENTER_Y + 40, scale: 1.15 }, // 2nd Place
      { x: CONFIG.STAGE_WIDTH / 2 + 190, y: CONFIG.CORRIDOR.CENTER_Y + 40, scale: 1.15 }  // 3rd Place
    ];

    winners.forEach((av, idx) => {
      av.setState('celebration');
      if (idx < 3) {
        av.targetX = podiumCoords[idx].x;
        av.targetY = podiumCoords[idx].y;
        gsap.to(av.scale, { x: podiumCoords[idx].scale, y: podiumCoords[idx].scale, duration: 0.5 });
      } else {
        // Cheering background crowd
        const row = Math.floor((idx - 3) / 6);
        const col = (idx - 3) % 6;
        av.targetX = 130 + col * 160;
        av.targetY = CONFIG.CORRIDOR.CENTER_Y + 200 + row * 80;
        gsap.to(av.scale, { x: 0.75, y: 0.75, duration: 0.5 });
      }
    });

    // 2. Losers in slump posture in corners
    losers.forEach((av, idx) => {
      av.setState('defeat');
      const side = (idx % 2 === 0) ? 90 : CONFIG.STAGE_WIDTH - 90;
      const yOffset = 180 + Math.floor(idx / 2) * 65;
      av.targetX = side;
      av.targetY = (this.winnerTeam === 'RED') ? CONFIG.BLUE_ZONE.TOP + yOffset : CONFIG.RED_ZONE.TOP + yOffset;
      gsap.to(av.scale, { x: 0.65, y: 0.65, duration: 0.5 });
    });
  }

  buildLeaderboardView() {
    this.leaderboardOverlay.removeChildren();

    // Dark semi-transparent cyber overlay
    const bg = new PIXI.Graphics();
    bg.beginFill(0x06050C, 0.94);
    bg.drawRect(0, 0, CONFIG.STAGE_WIDTH, CONFIG.STAGE_HEIGHT);
    bg.endFill();
    this.leaderboardOverlay.addChild(bg);

    // Title
    const title = new PIXI.Text('MVP LİDERLİK TABLOSU', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 32,
      fontWeight: '900',
      fill: '#FFD700',
      dropShadow: true,
      dropShadowColor: '#FFD700',
      dropShadowBlur: 10,
    });
    title.anchor.set(0.5);
    title.x = CONFIG.STAGE_WIDTH / 2;
    title.y = 220;
    this.leaderboardOverlay.addChild(title);

    // Subtitle Countdown
    this.lbTimerText = new PIXI.Text('Sonraki tur: 10s', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: 20,
      fontWeight: '700',
      fill: '#94A3B8',
    });
    this.lbTimerText.anchor.set(0.5);
    this.lbTimerText.x = CONFIG.STAGE_WIDTH / 2;
    this.lbTimerText.y = 270;
    this.leaderboardOverlay.addChild(this.lbTimerText);

    // Render Side-by-Side Neon Tables:
    // Left: Winning Team Top 5
    // Right: Losing Team Top 5
    const winningMap = (this.winnerTeam === 'RED') ? this.redTeam : this.blueTeam;
    const losingMap = (this.winnerTeam === 'RED') ? this.blueTeam : this.redTeam;

    const renderTable = (x, y, teamName, isWinner, avatarsMap, colorHex, colorInt) => {
      const container = new PIXI.Container();
      container.x = x;
      container.y = y;

      const pW = 460;
      const pH = 820;

      // Card Background
      const pBg = new PIXI.Graphics();
      pBg.beginFill(0x100D20, 0.95);
      pBg.lineStyle(2, colorInt, 0.9);
      pBg.drawRoundedRect(0, 0, pW, pH, 16);
      pBg.endFill();
      container.addChild(pBg);

      // Header
      const headerText = new PIXI.Text(`${teamName} ${isWinner ? '★ KAZANAN ★' : ''}`, {
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 20,
        fontWeight: '900',
        fill: colorHex,
      });
      headerText.x = 24;
      headerText.y = 24;
      container.addChild(headerText);

      // Rows for Top 5
      const sorted = Array.from(avatarsMap.values()).sort((a, b) => b.points - a.points).slice(0, 5);

      if (sorted.length === 0) {
        const emptyText = new PIXI.Text('Katılımcı yok', {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 16,
          fill: '#64748B',
        });
        emptyText.x = 24;
        emptyText.y = 80;
        container.addChild(emptyText);
      } else {
        sorted.forEach((player, idx) => {
          const rowY = 80 + idx * 135;

          // Row card background
          const rowBg = new PIXI.Graphics();
          rowBg.beginFill(0x18142E, 0.85);
          rowBg.lineStyle(1, 0x332854, 1);
          rowBg.drawRoundedRect(16, rowY, pW - 32, 115, 12);
          rowBg.endFill();
          container.addChild(rowBg);

          // Rank Badge
          const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#94A3B8', '#94A3B8'];
          const rankText = new PIXI.Text(`#${idx + 1}`, {
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 22,
            fontWeight: '900',
            fill: rankColors[idx] || '#FFFFFF',
          });
          rankText.x = 32;
          rankText.y = rowY + 40;
          container.addChild(rankText);

          // Nickname
          const name = new PIXI.Text(player.userData.nickname || player.userData.uniqueId, {
            fontFamily: 'Montserrat, sans-serif',
            fontSize: 17,
            fontWeight: '800',
            fill: '#FFFFFF',
          });
          name.x = 90;
          name.y = rowY + 18;
          container.addChild(name);

          // Stats readout
          const stats = new PIXI.Text(`Puan: ${player.points}  |  ❤️ ${player.likeCount}  |  💬 ${player.commentCount}  |  💎 ${player.giftDiamonds}`, {
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 13,
            fontWeight: '600',
            fill: '#94A3B8',
          });
          stats.x = 90;
          stats.y = rowY + 54;
          container.addChild(stats);
        });
      }

      this.leaderboardOverlay.addChild(container);
    };

    // Table 1 (Winning Team)
    const winTeamName = (this.winnerTeam === 'RED') ? 'KIRMIZI' : 'MAVİ';
    const winColorHex = (this.winnerTeam === 'RED') ? CONFIG.RED_ZONE.COLOR_HEX : CONFIG.BLUE_ZONE.COLOR_HEX;
    const winColorInt = (this.winnerTeam === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR;
    renderTable(50, 320, winTeamName, true, winningMap, winColorHex, winColorInt);

    // Table 2 (Losing Team)
    const loseTeamName = (this.winnerTeam === 'RED') ? 'MAVİ' : 'KIRMIZI';
    const loseColorHex = (this.winnerTeam === 'RED') ? CONFIG.BLUE_ZONE.COLOR_HEX : CONFIG.RED_ZONE.COLOR_HEX;
    const loseColorInt = (this.winnerTeam === 'RED') ? CONFIG.BLUE_ZONE.COLOR : CONFIG.RED_ZONE.COLOR;
    renderTable(570, 320, loseTeamName, false, losingMap, loseColorHex, loseColorInt);
  }

  // --- TIKTOK LIVE EVENTS & BALANCING ---
  handleJoin(userData, requestedTeam) {
    if (this.currentState !== CONFIG.STATES.LOBBY) {
      // In-match joining: queue or place them directly if desired
    }

    // Follower check
    if (!userData.isFollower) {
      this.showToast(`@${userData.nickname || userData.uniqueId}: Katılmak için Takip Etmelisin!`, '#FF3366');
      return null;
    }

    // Check if player already exists
    if (this.allPlayers.has(userData.uniqueId)) {
      return this.allPlayers.get(userData.uniqueId);
    }

    // Auto-balance (10% Rule)
    const redCount = this.redTeam.size;
    const blueCount = this.blueTeam.size;
    const totalPlayers = redCount + blueCount;
    let assignedTeam = requestedTeam.toUpperCase();

    if (totalPlayers < CONFIG.BALANCE.MIN_PLAYERS_FOR_PERCENT_RULE) {
      // < 10 players: difference cannot exceed 1
      if (assignedTeam === 'RED' && redCount > blueCount) {
        assignedTeam = 'BLUE';
        this.showToast(`Denge Kuralı: @${userData.nickname || userData.uniqueId} MAVİ takıma atandı!`, CONFIG.BLUE_ZONE.COLOR);
      } else if (assignedTeam === 'BLUE' && blueCount > redCount) {
        assignedTeam = 'RED';
        this.showToast(`Denge Kuralı: @${userData.nickname || userData.uniqueId} KIRMIZI takıma atandı!`, CONFIG.RED_ZONE.COLOR);
      }
    } else {
      // >= 10 players: abs(red - blue) <= total * 0.10
      const futureRed = (assignedTeam === 'RED') ? redCount + 1 : redCount;
      const futureBlue = (assignedTeam === 'BLUE') ? blueCount + 1 : blueCount;
      const futureTotal = totalPlayers + 1;
      const diff = Math.abs(futureRed - futureBlue);

      if (diff > futureTotal * CONFIG.BALANCE.MAX_PERCENT_DIFF) {
        // Overloaded team, flip to opposite team
        assignedTeam = (assignedTeam === 'RED') ? 'BLUE' : 'RED';
        const teamLabel = (assignedTeam === 'RED') ? 'KIRMIZI' : 'MAVİ';
        const teamColor = (assignedTeam === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR;
        this.showToast(`Takım Dengelendi: @${userData.nickname || userData.uniqueId} -> ${teamLabel}`, teamColor);
      }
    }

    // Create procedural avatar
    const avatar = new Avatar(userData, assignedTeam);
    avatar.lastActiveTimestamp = Date.now();
    this.charactersLayer.addChild(avatar);

    const teamMap = (assignedTeam === 'RED') ? this.redTeam : this.blueTeam;
    const isRed = (assignedTeam === 'RED');

    // Store in maps
    if (assignedTeam === 'RED') {
      this.redTeam.set(userData.uniqueId, avatar);
    } else {
      this.blueTeam.set(userData.uniqueId, avatar);
    }
    this.allPlayers.set(userData.uniqueId, avatar);

    // Check if slot on stage is available (Max 14 warriors on stage)
    const onStageCount = Array.from(teamMap.values()).filter(p => p.onStage).length;
    if (onStageCount <= 14) {
      avatar.onStage = true;
      avatar.visible = true;

      const idx = onStageCount - 1;
      const cols = 7;
      const spacingX = (CONFIG.STAGE_WIDTH - 280) / 6;
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      avatar.targetX = 140 + col * spacingX;
      avatar.targetY = isRed ? (200 + row * 115) : (1605 + row * 115);

      avatar.x = avatar.targetX;
      avatar.y = isRed ? -80 : CONFIG.STAGE_HEIGHT + 80;

      // Drop-in elastic bounce animation
      gsap.from(avatar, {
        y: isRed ? -100 : CONFIG.STAGE_HEIGHT + 100,
        alpha: 0,
        duration: 0.65,
        ease: 'bounce.out'
      });
    } else {
      // Off-stage in supporter queue
      avatar.onStage = false;
      avatar.visible = false;
      avatar.targetX = CONFIG.STAGE_WIDTH / 2;
      avatar.targetY = isRed ? 200 : 1605;
      avatar.x = avatar.targetX;
      avatar.y = avatar.targetY;
    }

    sounds.playJoin(assignedTeam);
    this.updateTeamStatsDisplay();
    return avatar;
  }

  handleLike(userData, count = 1) {
    let player = this.allPlayers.get(userData.uniqueId);
    if (!player) {
      const team = (this.redTeam.size <= this.blueTeam.size) ? 'RED' : 'BLUE';
      player = this.handleJoin(userData, team);
    }
    if (!player) return;

    player.likeCount += count;
    player.points += count * 2;
    player.lastActiveTimestamp = Date.now();
    const isRed = (player.team === 'RED');
    const teamColor = isRed ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR;

    if (isRed) {
      this.redScore += count * 2;
    } else {
      this.blueScore += count * 2;
    }

    // Ensure player is on stage (swaps in if in queue)
    this.promotePlayerToStage(player);

    if (this.currentState === CONFIG.STATES.MATCH) {
      this.physics.applyImpulse(player.team, 'like');

      // Trigger punchy 0.38s push burst on this character only
      player.triggerPushBurst(0.38);

      // Fire animated dynamic laser beam from player hands to the central orb
      this.arena.fireBeam(player.x, isRed ? player.y + 35 : player.y - 35, this.arena.ball.x, this.arena.ball.y, teamColor, false);

      // Hit effect on the ball
      this.particles.spawnSpark(this.arena.ball.x, this.arena.ball.y, teamColor, 4);

      // Floating combat text
      this.showCombatText('+0.15% ❤️', player.x, isRed ? player.y + 50 : player.y - 50, teamColor);

      sounds.playImpulse();
    }

    this.updateTeamStatsDisplay();
  }

  handleComment(userData, commentText) {
    const text = (commentText || '').trim().toLowerCase();

    // Joining check
    if (CONFIG.COMMANDS.RED.some(c => text.includes(c))) {
      this.handleJoin(userData, 'RED');
      return;
    }
    if (CONFIG.COMMANDS.BLUE.some(c => text.includes(c))) {
      this.handleJoin(userData, 'BLUE');
      return;
    }

    // Active Match push impulse
    let player = this.allPlayers.get(userData.uniqueId);
    if (!player) return;

    player.commentCount += 1;
    player.points += 5;
    player.lastActiveTimestamp = Date.now();
    const isRed = (player.team === 'RED');
    const teamColor = isRed ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR;

    if (isRed) {
      this.redScore += 5;
    } else {
      this.blueScore += 5;
    }

    // Ensure player is on stage
    this.promotePlayerToStage(player);

    if (this.currentState === CONFIG.STATES.MATCH) {
      this.physics.applyImpulse(player.team, 'comment');

      // Trigger punchy 0.38s push burst on this character only
      player.triggerPushBurst(0.38);

      // Fire animated dynamic laser beam from player hands to the central orb
      this.arena.fireBeam(player.x, isRed ? player.y + 35 : player.y - 35, this.arena.ball.x, this.arena.ball.y, teamColor, false);

      // Hit sparks on ball
      this.particles.spawnSpark(this.arena.ball.x, this.arena.ball.y, teamColor, 5);

      // Floating combat text
      this.showCombatText('+0.15% 💬', player.x, isRed ? player.y + 50 : player.y - 50, teamColor);

      sounds.playLaser();
    }

    this.updateTeamStatsDisplay();
  }

  handleGift(userData, giftName, diamondCount = 1) {
    let player = this.allPlayers.get(userData.uniqueId);
    if (!player) {
      const team = (this.redTeam.size <= this.blueTeam.size) ? 'RED' : 'BLUE';
      player = this.handleJoin(userData, team);
    }
    if (!player) return;

    const diamonds = Math.max(1, diamondCount);
    player.giftDiamonds += diamonds;
    player.points += diamonds * 50;
    player.lastActiveTimestamp = Date.now();
    const isRed = (player.team === 'RED');
    const teamColor = isRed ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR;

    if (isRed) {
      this.redScore += diamonds * 50;
    } else {
      this.blueScore += diamonds * 50;
    }

    // Ensure player is on stage
    this.promotePlayerToStage(player);

    // Trigger explosive visual aura & scale surge for 1.2s
    player.triggerGiftAura(diamonds);
    sounds.playGift();

    if (this.currentState === CONFIG.STATES.MATCH) {
      const impulsePx = this.physics.applyImpulse(player.team, 'gift', diamonds);
      const impulsePct = ((impulsePx / CONFIG.STAGE_HEIGHT) * 100).toFixed(1);

      // Fire thick pulsing mega-beam with high voltage arcs to the ball
      this.arena.fireBeam(player.x, isRed ? player.y + 40 : player.y - 40, this.arena.ball.x, this.arena.ball.y, teamColor, true, diamonds);

      // Camera screen shake!
      this.arena.triggerScreenShake(Math.min(22, 14 + diamonds * 0.1), 0.45);

      // Massive fireworks & sparks around the ball
      this.particles.spawnFirework(this.arena.ball.x, this.arena.ball.y, teamColor, 40);

      // Floating combat text
      this.showCombatText(`💎 +${impulsePct}% MEGA DARBE!`, player.x, isRed ? player.y + 55 : player.y - 55, 0xFFD700);
    }

    this.showToast(`🎁 @${player.userData.nickname || player.userData.uniqueId}: ${giftName || 'Hediye'} (${diamonds} 💎)`, '#FFD700');
    this.updateTeamStatsDisplay();
  }

  // --- FAST-FORWARD / NEXT STATE ---
  skipToNextState() {
    switch (this.currentState) {
      case CONFIG.STATES.LOBBY:
        this.enterState(CONFIG.STATES.ROSTER_SHOWCASE);
        break;
      case CONFIG.STATES.ROSTER_SHOWCASE:
        this.enterState(CONFIG.STATES.MATCH);
        break;
      case CONFIG.STATES.MATCH:
        this.winnerTeam = this.physics.resolveTimeoutWinner();
        this.enterState(CONFIG.STATES.VICTORY_PODIUM);
        break;
      case CONFIG.STATES.VICTORY_PODIUM:
        this.enterState(CONFIG.STATES.LEADERBOARD);
        break;
      case CONFIG.STATES.LEADERBOARD:
        this.enterState(CONFIG.STATES.LOBBY);
        break;
    }
  }

  // --- MAIN UPDATE TICK ---
  update(delta) {
    // 1. Countdown timer
    this.stateTimer -= (1 / 60) * delta;
    const secondsRemaining = Math.max(0, Math.ceil(this.stateTimer));

    // Update banner countdown text
    if (this.centerBanner.visible) {
      this.bannerSubText.text = `${secondsRemaining}s`;
    }
    if (this.currentState === CONFIG.STATES.LEADERBOARD && this.lbTimerText) {
      this.lbTimerText.text = `Sonraki tur: ${secondsRemaining}s`;
    }

    // Periodic countdown audio cue
    if (secondsRemaining <= 3 && Math.abs(this.stateTimer - secondsRemaining) < 0.02) {
      sounds.playBeep(secondsRemaining === 1);
    }

    // State expiration triggers
    if (this.stateTimer <= 0) {
      this.skipToNextState();
      return;
    }

    // 2. Physics & Match update
    if (this.currentState === CONFIG.STATES.MATCH) {
      const matchWinner = this.physics.update(delta);
      if (matchWinner) {
        this.winnerTeam = matchWinner;
        this.enterState(CONFIG.STATES.VICTORY_PODIUM);
        return;
      }
    }

    // 3. Update Arena (ball position, directional pulse rings, and active action laser beams)
    this.arena.update(delta, this.physics.ballY);

    // 4. Update all character animations
    this.allPlayers.forEach(avatar => {
      avatar.update(delta);
    });

    // 5. Update particle systems
    this.particles.update(delta);
  }
}
