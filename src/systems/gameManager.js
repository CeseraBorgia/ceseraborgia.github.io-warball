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
    this.vipPlayers = [];
    this.activeRoster = [];
    this.queue = [];

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
    // 1. Center Banner / Countdown Display - Pinned at Y=415 (Between Red Row 3 and Red Goal Y=480, zero overlap with ball)
    this.centerBanner = new PIXI.Container();
    this.centerBanner.x = CONFIG.STAGE_WIDTH / 2;
    this.centerBanner.y = 415;

    const bannerBg = new PIXI.Graphics();
    bannerBg.beginFill(0x0A0814, 0.92);
    bannerBg.lineStyle(2, 0xBD00FF, 1);
    bannerBg.drawRoundedRect(-240, -32, 480, 64, 16);
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

    // 2. Joining Prompt Marquee - Placed at Y=1500 (Just above Blue frontline Y=1580, corridor stays clear)
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
    this.promptText.y = 1500;
    this.hudLayer.addChild(this.promptText);

    // 3. Notification Toast Banner - Floats at Y=515
    this.toastContainer = new PIXI.Container();
    this.toastContainer.x = CONFIG.STAGE_WIDTH / 2;
    this.toastContainer.y = 515;
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
    this.leaderboardOverlay.removeChildren();
    this.bannerTitle.text = 'LOBİ & KATILIM ZAMANI';
    this.bannerTitle.style.fill = '#00E5FF';
    this.bannerTitle.style.fontSize = 20;
    this.promptText.text = "Katılmak için 'kırmızı' veya 'mavi' yazın! (Sadece Takipçiler)";

    // 1. Wipe and destroy all existing player avatars completely (Zero carryover)
    this.allPlayers.forEach(av => {
      av.isVipGifter = false;
      gsap.killTweensOf(av);
      gsap.killTweensOf(av.scale);
      av.destroy({ children: true });
    });
    this.charactersLayer.removeChildren();

    // 2. Clear all collections
    this.redTeam.clear();
    this.blueTeam.clear();
    this.allPlayers.clear();
    this.vipPlayers = [];
    this.activeRoster = [];
    this.queue = [];

    // 3. Reset scores & round state
    this.redScore = 0;
    this.blueScore = 0;
    this.winnerTeam = null;

    // 4. Clear combat texts & reset arena effects
    this.combatTextContainer.removeChildren();
    if (this.arena.resetRound) {
      this.arena.resetRound();
    }

    // 5. Reset physics & hide central ball in lobby
    this.physics.reset();
    this.arena.ball.visible = false;

    // 6. Refresh HUD to show 0 warriors and 0 points
    this.updateTeamStatsDisplay();
  }

  onEnterRosterShowcase() {
    sounds.playVictory();
    this.centerBanner.visible = true;
    this.promptText.visible = true;
    this.leaderboardOverlay.visible = false;
    this.bannerTitle.text = 'TAKIMLAR BELİRLENDİ!';
    this.bannerTitle.style.fill = '#FFD700';
    this.bannerTitle.style.fontSize = 20;
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
    this.bannerTitle.style.fontSize = 20;

    this.physics.startMatch();
    this.arena.ball.visible = true;

    // Set all avatars in stadium formation
    this.repositionMatchAvatars();
  }

  onEnterVictoryPodium() {
    sounds.playVictory();
    sounds.playCrowdRoar();
    this.centerBanner.visible = true;
    this.promptText.visible = false;
    this.leaderboardOverlay.visible = false;

    // Intra-match VIP lock expires as soon as active match ends
    this.allPlayers.forEach(p => {
      p.isVipGifter = false;
    });

    const winnerName = (this.winnerTeam === 'RED') ? 'KIRMIZI TAKIM' : 'MAVİ TAKIM';
    const winnerColor = (this.winnerTeam === 'RED') ? CONFIG.RED_ZONE.COLOR_HEX : CONFIG.BLUE_ZONE.COLOR_HEX;
    
    // Huge, punchy, cinematic victory announcement
    this.bannerTitle.text = `★ ${winnerName} KAZANDI! ★`;
    this.bannerTitle.style.fill = winnerColor;
    this.bannerTitle.style.fontSize = 26;
    this.bannerSubText.text = 'ZAFER KUTLAMASI';
    this.bannerSubText.style.fill = '#FFD700';

    gsap.fromTo(this.centerBanner.scale, { x: 0.7, y: 0.7 }, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2)' });

    this.physics.stopMatch();

    // Spawn massive confetti and fireworks
    this.particles.spawnConfetti(CONFIG.STAGE_WIDTH / 2, CONFIG.CORRIDOR.CENTER_Y, [
      (this.winnerTeam === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR,
      0xFFD700, 0xFFFFFF
    ], 160);

    // Setup celebration podium
    this.setupVictoryPodium();
  }

  onEnterLeaderboard() {
    this.centerBanner.visible = false;
    this.promptText.visible = false;
    this.leaderboardOverlay.visible = true;

    this.buildLeaderboardView();
  }

  // --- 30 PLAYERS GRID FORMATION & VIP PRIORITY ROTATION ---

  // Calculate stadium formation slot coordinates (3 rows of 10)
  getSlotCoords(team, slotIndex) {
    const isRed = (team === 'RED');
    // slotIndex 0-9: Row 0 (Back row)
    // slotIndex 10-19: Row 1 (Middle row)
    // slotIndex 20-29: Row 2 (Frontline VIP row near goal)
    const row = Math.floor(slotIndex / 10); // 0, 1, 2
    const col = slotIndex % 10; // 0-9

    const startX = 65;
    const spacingX = (CONFIG.STAGE_WIDTH - 130) / 9; // ~105.55px across 1080px
    const x = startX + col * spacingX;

    let y;
    if (isRed) {
      if (row === 0) y = 170;      // Row 1 (Back Row)
      else if (row === 1) y = 250; // Row 2 (Middle Row)
      else y = 330;                // Row 3 (Frontline VIP Row near goal Y=480)
    } else {
      if (row === 0) y = 1740;     // Row 1 (Back Row)
      else if (row === 1) y = 1660;// Row 2 (Middle Row)
      else y = 1580;               // Row 3 (Frontline VIP Row near goal Y=1440)
    }

    return { x, y, isFrontline: (row === 2) };
  }

  // Calculate dynamic rotation priority: score = (contributionScore * 0.4) + (recencyDecay * 0.6)
  getPriorityScore(player) {
    const now = Date.now();
    const elapsedSec = Math.max(0, (now - (player.lastActiveTimestamp || 0)) / 1000);
    const recencyScore = Math.max(0, 5000 - elapsedSec * 30);
    return (player.points * 0.4) + (recencyScore * 0.6);
  }

  // Synchronize 30 on-stage slots with VIP gifter locks & dynamic queue rotation
  syncTeamRoster(teamName, targetState = 'idle') {
    const isRed = (teamName === 'RED');
    const teamMap = isRed ? this.redTeam : this.blueTeam;
    const allPlayers = Array.from(teamMap.values());
    if (allPlayers.length === 0) return;

    const isMatchState = (this.currentState === CONFIG.STATES.MATCH);

    // 1. Separate Gifters and Regular (Likers/Commenters)
    // VIP lock is active STRICTLY during State 3 (Active Match)
    let vipGifters = [];
    let overflowGifters = [];
    let regulars = [];

    if (isMatchState) {
      const gifters = allPlayers.filter(p => p.giftDiamonds > 0);
      regulars = allPlayers.filter(p => p.giftDiamonds === 0);

      // Sort gifters by diamond count + recency
      gifters.sort((a, b) => {
        const scoreA = (a.giftDiamonds * 1000) + (a.lastActiveTimestamp || 0);
        const scoreB = (b.giftDiamonds * 1000) + (b.lastActiveTimestamp || 0);
        return scoreB - scoreA;
      });

      // VIP Frontline Slots (Max 10 Reserved Slots in Frontline: slots 20 to 29)
      vipGifters = gifters.slice(0, 10);
      overflowGifters = gifters.slice(10);
    } else {
      // Lobby / Showcase / Podium: All 60 on-screen slots are 100% open without frontline VIP locking
      regulars = [...allPlayers];
    }

    // 2. Candidates for remaining open slots (Slots 0-19, plus any unfilled frontline slots)
    const openCandidates = [...overflowGifters, ...regulars];
    openCandidates.sort((a, b) => this.getPriorityScore(b) - this.getPriorityScore(a));

    const totalOpenSlots = 30 - vipGifters.length;
    const activeOpenPlayers = openCandidates.slice(0, totalOpenSlots);
    const queuedPlayers = openCandidates.slice(totalOpenSlots);

    // Update tracking collections
    this.vipPlayers = vipGifters;
    this.activeRoster = [...vipGifters, ...activeOpenPlayers];
    this.queue = queuedPlayers;

    // Hide queued off-screen supporters
    queuedPlayers.forEach(p => {
      p.visible = false;
      p.onStage = false;
      p.isVipGifter = false;
    });

    // Place VIP Gifters in Frontline (Row 3, slots 20 to 20 + vipGifters.length - 1)
    vipGifters.forEach((p, idx) => {
      const slotIndex = 20 + idx;
      const coords = this.getSlotCoords(teamName, slotIndex);
      p.targetX = coords.x;
      p.targetY = coords.y;
      p.onStage = true;
      p.visible = true;
      p.isVipGifter = true;
      p.setState(targetState);
      gsap.to(p.scale, { x: p.baseScale, y: p.baseScale, duration: 0.3 });
    });

    // Available slot indices for open candidates:
    // Slots 0 to 19 (Row 1 Back & Row 2 Middle), plus any unfilled slots from (20 + vipGifters.length) to 29
    const availableSlots = [];
    for (let i = 0; i < 20; i++) availableSlots.push(i);
    for (let i = 20 + vipGifters.length; i < 30; i++) availableSlots.push(i);

    activeOpenPlayers.forEach((p, idx) => {
      const slotIndex = availableSlots[idx];
      const coords = this.getSlotCoords(teamName, slotIndex);
      p.targetX = coords.x;
      p.targetY = coords.y;
      p.onStage = true;
      p.visible = true;
      p.isVipGifter = false;
      p.setState(targetState);
      gsap.to(p.scale, { x: p.baseScale, y: p.baseScale, duration: 0.3 });
    });

    this.updateTeamStatsDisplay();
  }

  // Promote active interacting player to stage if in queue
  promotePlayerToStage(player) {
    player.lastActiveTimestamp = Date.now();
    const isRed = (player.team === 'RED');

    // If player is already on stage, timestamp is refreshed; keep their slot
    if (player.visible && player.onStage) return;

    // Player is currently off-screen in queue!
    const isMatchState = (this.currentState === CONFIG.STATES.MATCH);

    // If player is a gifter and we are in active match, full re-sync gives them an immediate VIP frontline slot
    if (isMatchState && player.giftDiamonds > 0) {
      player.x = CONFIG.STAGE_WIDTH / 2;
      player.y = isRed ? -80 : CONFIG.STAGE_HEIGHT + 80;
      this.syncTeamRoster(player.team, 'idle');
      gsap.from(player, {
        y: isRed ? -80 : CONFIG.STAGE_HEIGHT + 80,
        alpha: 0,
        duration: 0.45,
        ease: 'back.out(1.5)'
      });
      return;
    }

    // Player is a regular like/comment engager:
    // Find the on-stage player in OPEN slots (isVipGifter !== true) with lowest priority
    const teamMap = isRed ? this.redTeam : this.blueTeam;
    const onStageRegulars = Array.from(teamMap.values()).filter(p => p.onStage && !p.isVipGifter);

    const vipCount = isMatchState ? Math.min(10, Array.from(teamMap.values()).filter(p => p.giftDiamonds > 0).length) : 0;
    const maxRegularSlots = 30 - vipCount;
    if (onStageRegulars.length >= maxRegularSlots) {
      onStageRegulars.sort((a, b) => this.getPriorityScore(a) - this.getPriorityScore(b));
      const benched = onStageRegulars[0];
      benched.onStage = false;
      benched.visible = false;

      // Transfer slot coordinates with snappy drop-in
      player.x = benched.targetX;
      player.y = isRed ? -80 : CONFIG.STAGE_HEIGHT + 80;
      player.targetX = benched.targetX;
      player.targetY = benched.targetY;
      player.onStage = true;
      player.visible = true;
      player.isVipGifter = false;

      gsap.from(player, {
        y: isRed ? -80 : CONFIG.STAGE_HEIGHT + 80,
        alpha: 0,
        duration: 0.45,
        ease: 'back.out(1.5)'
      });
    } else {
      this.syncTeamRoster(player.team, 'idle');
    }

    this.updateTeamStatsDisplay();
  }

  repositionLobbyAvatars() {
    this.syncTeamRoster('RED', 'idle');
    this.syncTeamRoster('BLUE', 'idle');
  }

  repositionShowcaseAvatars() {
    this.syncTeamRoster('RED', 'idle');
    this.syncTeamRoster('BLUE', 'idle');
  }

  repositionMatchAvatars() {
    this.syncTeamRoster('RED', 'idle');
    this.syncTeamRoster('BLUE', 'idle');
  }

  updateTeamStatsDisplay() {
    const redTotal = this.redTeam.size;
    const blueTotal = this.blueTeam.size;
    const redActive = Array.from(this.redTeam.values()).filter(p => p.onStage).length;
    const blueActive = Array.from(this.blueTeam.values()).filter(p => p.onStage).length;
    const redQueue = Math.max(0, redTotal - 30);
    const blueQueue = Math.max(0, blueTotal - 30);

    this.arena.updateTeamStats(redActive, this.redScore, blueActive, this.blueScore, redQueue, blueQueue);
  }

  // --- VICTORY PODIUM (Big Winners, Top 3 Royal Crowns, Top 10 MVPs, Background Cheering) ---
  setupVictoryPodium() {
    const winningMap = (this.winnerTeam === 'RED') ? this.redTeam : this.blueTeam;
    const losingMap = (this.winnerTeam === 'RED') ? this.blueTeam : this.redTeam;

    const winners = Array.from(winningMap.values()).sort((a, b) => {
      // Sort by gifts first, then points
      if (b.giftDiamonds !== a.giftDiamonds) return b.giftDiamonds - a.giftDiamonds;
      return b.points - a.points;
    });
    const losers = Array.from(losingMap.values());

    // 1. Center Podium: Top 3 Gifters in full scale glory (2.2x - 2.45x with Royal Crowns)
    const podiumCoords = [
      { x: CONFIG.STAGE_WIDTH / 2, y: 900, scale: 2.45, rank: 1 },       // 1st Place (Gold Crown)
      { x: CONFIG.STAGE_WIDTH / 2 - 230, y: 955, scale: 2.20, rank: 2 }, // 2nd Place (Silver Crown)
      { x: CONFIG.STAGE_WIDTH / 2 + 230, y: 955, scale: 2.20, rank: 3 }  // 3rd Place (Bronze Crown)
    ];

    // 2. Wing Pedestals: Top 4-10 MVPs (Positions 4 to 10 scaled to 1.65x)
    const wingCoords = [
      { x: 150, y: 1100 }, // Pos 4
      { x: 930, y: 1100 }, // Pos 5
      { x: 260, y: 1190 }, // Pos 6
      { x: 820, y: 1190 }, // Pos 7
      { x: 150, y: 1270 }, // Pos 8
      { x: 930, y: 1270 }, // Pos 9
      { x: 540, y: 1280 }  // Pos 10
    ];

    winners.forEach((av, idx) => {
      av.setState('celebration');
      av.alpha = 1;
      av.visible = true;

      if (idx < 3) {
        // Top 3 Gifters: 2.2x - 2.45x with Royal Crowns
        av.targetX = podiumCoords[idx].x;
        av.targetY = podiumCoords[idx].y;
        av.setCrown(true, podiumCoords[idx].rank);
        gsap.to(av.scale, { x: podiumCoords[idx].scale, y: podiumCoords[idx].scale, duration: 0.5 });
      } else if (idx < 10) {
        // Top 4 to 10 MVPs on Tiered Pedestals: 1.65x
        const wing = wingCoords[idx - 3];
        av.targetX = wing.x;
        av.targetY = wing.y;
        av.setCrown(false);
        gsap.to(av.scale, { x: 1.65, y: 1.65, duration: 0.5 });
      } else {
        // Remaining winning roster: Celebrating behind at minimum 1.40x!
        av.setCrown(false);
        const crowdIdx = idx - 10;
        const crowdRow = Math.floor(crowdIdx / 6);
        const crowdCol = crowdIdx % 6;
        av.targetX = 140 + crowdCol * 160;
        av.targetY = 660 + crowdRow * 95;
        gsap.to(av.scale, { x: 1.40, y: 1.40, duration: 0.5 });
      }
    });

    // 3. Losers in slump posture in corners (dimmed, scale 0.75x)
    losers.forEach((av, idx) => {
      av.setState('defeat');
      av.setCrown(false);
      av.alpha = 0.35;
      const side = (idx % 2 === 0) ? 80 : CONFIG.STAGE_WIDTH - 80;
      const yOffset = 150 + Math.floor(idx / 2) * 55;
      av.targetX = side;
      av.targetY = (this.winnerTeam === 'RED') ? CONFIG.PHYSICS.BLUE_GOAL_Y + yOffset : yOffset;
      gsap.to(av.scale, { x: 0.75, y: 0.75, duration: 0.5 });
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

    avatar.x = CONFIG.STAGE_WIDTH / 2;
    avatar.y = isRed ? -80 : CONFIG.STAGE_HEIGHT + 80;

    sounds.playJoin(assignedTeam);
    this.syncTeamRoster(assignedTeam, (this.currentState === CONFIG.STATES.MATCH) ? 'idle' : 'idle');

    if (avatar.onStage) {
      gsap.from(avatar, {
        y: isRed ? -90 : CONFIG.STAGE_HEIGHT + 90,
        alpha: 0,
        duration: 0.55,
        ease: 'bounce.out'
      });
    }

    return avatar;
  }

  handleLike(userData, count = 1) {
    let player = this.allPlayers.get(userData.uniqueId);
    if (!player) {
      // In Lobby, viewers MUST type 'kırmızı' or 'mavi' to join. Likes do not auto-join during lobby!
      if (this.currentState === CONFIG.STATES.LOBBY) {
        return;
      }
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

      // Floating combat text (+0.35% impulse)
      this.showCombatText('+0.35% ❤️', player.x, isRed ? player.y + 50 : player.y - 50, teamColor);

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

      // Floating combat text (+0.45% impulse)
      this.showCombatText('+0.45% 💬', player.x, isRed ? player.y + 50 : player.y - 50, teamColor);

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
