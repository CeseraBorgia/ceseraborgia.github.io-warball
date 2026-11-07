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

    // Build HUD & Overlays
    this.buildHUD();

    // Start with Lobby
    this.enterState(CONFIG.STATES.LOBBY);
  }

  buildHUD() {
    // 1. Center Banner / Countdown Display
    this.centerBanner = new PIXI.Container();
    this.centerBanner.x = CONFIG.STAGE_WIDTH / 2;
    this.centerBanner.y = CONFIG.CORRIDOR.CENTER_Y - 140;

    const bannerBg = new PIXI.Graphics();
    bannerBg.beginFill(0x0A0814, 0.92);
    bannerBg.lineStyle(2, 0xBD00FF, 1);
    bannerBg.drawRoundedRect(-280, -45, 560, 90, 20);
    bannerBg.endFill();

    this.bannerTitle = new PIXI.Text('LOBİ & KATILIM ZAMANI', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 22,
      fontWeight: '900',
      fill: '#00E5FF',
      dropShadow: true,
      dropShadowColor: '#00E5FF',
      dropShadowBlur: 6,
    });
    this.bannerTitle.anchor.set(0.5, 0.7);

    this.bannerSubText = new PIXI.Text('30s', {
      fontFamily: 'Montserrat, Rajdhani, sans-serif',
      fontSize: 34,
      fontWeight: '900',
      fill: '#FFD700',
    });
    this.bannerSubText.anchor.set(0.5, -0.4);

    this.centerBanner.addChild(bannerBg);
    this.centerBanner.addChild(this.bannerTitle);
    this.centerBanner.addChild(this.bannerSubText);
    this.hudLayer.addChild(this.centerBanner);

    // 2. Joining Prompt Marquee (Bottom / Middle)
    this.promptText = new PIXI.Text("Katılmak için 'kırmızı' veya 'mavi' yazın! (Sadece Takipçiler)", {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: 19,
      fontWeight: '700',
      fill: '#FFFFFF',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 5,
    });
    this.promptText.anchor.set(0.5);
    this.promptText.x = CONFIG.STAGE_WIDTH / 2;
    this.promptText.y = CONFIG.CORRIDOR.CENTER_Y + 140;
    this.hudLayer.addChild(this.promptText);

    // 3. Notification Toast Banner (for Auto-balance & Follower alerts)
    this.toastContainer = new PIXI.Container();
    this.toastContainer.x = CONFIG.STAGE_WIDTH / 2;
    this.toastContainer.y = CONFIG.CORRIDOR.CENTER_Y - 240;
    this.toastContainer.alpha = 0;

    const toastBg = new PIXI.Graphics();
    toastBg.beginFill(0x1B0B2E, 0.95);
    toastBg.lineStyle(2, 0xFF0055, 1);
    toastBg.drawRoundedRect(-320, -26, 640, 52, 14);
    toastBg.endFill();

    this.toastText = new PIXI.Text('Bildirim', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 16,
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
    this.toastContainer.y = CONFIG.CORRIDOR.CENTER_Y - 260;
    gsap.timeline()
      .to(this.toastContainer, { alpha: 1, y: CONFIG.CORRIDOR.CENTER_Y - 240, duration: 0.35, ease: 'back.out(1.5)' })
      .to(this.toastContainer, { alpha: 0, y: CONFIG.CORRIDOR.CENTER_Y - 270, duration: 0.4, delay: 2.5 });
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

  // --- REPOSITIONING HELPERS ---
  repositionLobbyAvatars() {
    const arrange = (teamMap, isRed) => {
      const avatars = Array.from(teamMap.values());
      const count = avatars.length;
      if (count === 0) return;

      const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(count))));
      const spacingX = Math.min(130, (CONFIG.STAGE_WIDTH - 240) / Math.max(1, cols - 1));
      const startX = (CONFIG.STAGE_WIDTH - (cols - 1) * spacingX) / 2;
      const baseY = isRed ? 220 : 1720;

      avatars.forEach((av, idx) => {
        av.setState('idle');
        gsap.to(av.scale, { x: av.baseScale, y: av.baseScale, duration: 0.4 });
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        av.targetX = startX + c * spacingX;
        av.targetY = baseY + (isRed ? r * 80 : -r * 80);
      });
    };

    arrange(this.redTeam, true);
    arrange(this.blueTeam, false);
  }

  repositionShowcaseAvatars() {
    const arrange = (teamMap, isRed) => {
      const avatars = Array.from(teamMap.values());
      const count = avatars.length;
      if (count === 0) return;

      const cols = 5;
      const spacingX = (CONFIG.STAGE_WIDTH - 260) / (cols - 1);
      const startX = 130;
      const baseY = isRed ? 180 : 1740;

      avatars.forEach((av, idx) => {
        av.setState('idle');
        gsap.to(av.scale, { x: av.baseScale, y: av.baseScale, duration: 0.3 });
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        av.targetX = startX + c * spacingX;
        av.targetY = baseY + (isRed ? r * 75 : -r * 75);
      });
    };

    arrange(this.redTeam, true);
    arrange(this.blueTeam, false);
  }

  repositionMatchAvatars() {
    const arrange = (teamMap, isRed) => {
      const avatars = Array.from(teamMap.values());
      const count = avatars.length;
      if (count === 0) return;

      const cols = Math.min(8, Math.max(4, count));
      const spacingX = (CONFIG.STAGE_WIDTH - 240) / Math.max(1, cols - 1);
      const startX = 120;
      const lineY = isRed ? CONFIG.RED_ZONE.STATION_Y : CONFIG.BLUE_ZONE.STATION_Y;

      avatars.forEach((av, idx) => {
        av.setState('pushing');
        gsap.to(av.scale, { x: av.baseScale, y: av.baseScale, duration: 0.3 });
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        av.targetX = startX + col * spacingX;
        av.targetY = lineY + (isRed ? -row * 65 : row * 65);
      });
    };

    arrange(this.redTeam, true);
    arrange(this.blueTeam, false);
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
    this.charactersLayer.addChild(avatar);

    // Initial spawn coordinates (above screen for Red, below for Blue)
    const spawnX = 140 + Math.random() * (CONFIG.STAGE_WIDTH - 280);
    const dropY = (assignedTeam === 'RED') ? -80 : CONFIG.STAGE_HEIGHT + 80;
    const targetY = (assignedTeam === 'RED') ? 220 + Math.random() * 90 : 1700 - Math.random() * 90;

    avatar.x = spawnX;
    avatar.y = dropY;
    avatar.targetX = spawnX;
    avatar.targetY = targetY;

    // Drop-in elastic bounce animation
    gsap.from(avatar, {
      y: dropY,
      alpha: 0,
      duration: 0.75,
      ease: 'bounce.out'
    });

    sounds.playJoin(assignedTeam);

    // Store in maps
    if (assignedTeam === 'RED') {
      this.redTeam.set(userData.uniqueId, avatar);
    } else {
      this.blueTeam.set(userData.uniqueId, avatar);
    }
    this.allPlayers.set(userData.uniqueId, avatar);

    this.arena.updateTeamStats(this.redTeam.size, this.redScore, this.blueTeam.size, this.blueScore);
    return avatar;
  }

  handleLike(userData, count = 1) {
    let player = this.allPlayers.get(userData.uniqueId);
    if (!player) {
      // Auto-join to team with fewer members if not joined yet
      const team = (this.redTeam.size <= this.blueTeam.size) ? 'RED' : 'BLUE';
      player = this.handleJoin(userData, team);
    }
    if (!player) return;

    player.likeCount += count;
    player.points += count * 2;

    if (player.team === 'RED') {
      this.redScore += count * 2;
    } else {
      this.blueScore += count * 2;
    }

    if (this.currentState === CONFIG.STATES.MATCH) {
      this.physics.applyImpulse(player.team, 'like');
      this.particles.spawnSpark(player.x, player.y, (player.team === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR, 3);
      sounds.playImpulse();
    }

    this.arena.updateTeamStats(this.redTeam.size, this.redScore, this.blueTeam.size, this.blueScore);
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

    if (player.team === 'RED') {
      this.redScore += 5;
    } else {
      this.blueScore += 5;
    }

    if (this.currentState === CONFIG.STATES.MATCH) {
      this.physics.applyImpulse(player.team, 'comment');
      this.particles.spawnSpark(player.x, player.y, (player.team === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR, 4);
      sounds.playLaser();
    }

    this.arena.updateTeamStats(this.redTeam.size, this.redScore, this.blueTeam.size, this.blueScore);
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

    if (player.team === 'RED') {
      this.redScore += diamonds * 50;
    } else {
      this.blueScore += diamonds * 50;
    }

    // Trigger explosive visual aura & scale surge
    player.triggerGiftAura(diamonds);
    sounds.playGift();

    if (this.currentState === CONFIG.STATES.MATCH) {
      this.physics.applyImpulse(player.team, 'gift', diamonds);
      this.particles.spawnFirework(this.arena.ball.x, this.arena.ball.y, (player.team === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR, 35);
    }

    this.showToast(`🎁 @${player.userData.nickname || player.userData.uniqueId}: ${giftName || 'Hediye'} (${diamonds} 💎)`, '#FFD700');
    this.arena.updateTeamStats(this.redTeam.size, this.redScore, this.blueTeam.size, this.blueScore);
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

    // 3. Update Arena ball & beams
    const isMatch = (this.currentState === CONFIG.STATES.MATCH);
    this.arena.update(delta, this.physics.ballY);
    this.arena.drawEnergyBeams(Array.from(this.redTeam.values()), Array.from(this.blueTeam.values()), isMatch);

    // 4. Update all character animations
    this.allPlayers.forEach(avatar => {
      avatar.update(delta);
    });

    // 5. Update particle systems
    this.particles.update(delta);
  }
}
