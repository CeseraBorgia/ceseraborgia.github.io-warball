/**
 * BallWar - Arena Visuals & Stage Layout (1080 x 1920)
 * Neon Cyberpunk / Synthwave Rave arena with perspective grid, laser fences & energy orb.
 */

import { CONFIG } from '../config.js';

const PIXI = window.PIXI;

export class Arena extends PIXI.Container {
  constructor(app) {
    super();
    this.app = app;

    // Sub-containers in layer order
    this.bgContainer = new PIXI.Container();
    this.gridContainer = new PIXI.Container();
    this.bordersContainer = new PIXI.Container();
    this.beamsContainer = new PIXI.Container();
    this.ballContainer = new PIXI.Container();
    this.uiOverlayContainer = new PIXI.Container();

    // Persistent beams graphics to prevent per-frame allocation
    this.beamsGfx = new PIXI.Graphics();
    this.beamsContainer.addChild(this.beamsGfx);

    this.addChild(this.bgContainer);
    this.addChild(this.gridContainer);
    this.addChild(this.bordersContainer);
    this.addChild(this.beamsContainer);
    this.addChild(this.ballContainer);
    this.addChild(this.uiOverlayContainer);

    this.animTime = 0;
    this.ballY = CONFIG.CORRIDOR.CENTER_Y;
    this.ballPulse = 0;
    this.pushRatio = 0.5; // 0 (Red goal) to 1 (Blue goal)

    // Dynamic action beam pulses (Like, Comment, Gift) - Trigger on action only!
    this.activeBeams = [];

    // Screen shake state
    this.shakeIntensity = 0;
    this.shakeTime = 0;

    this.buildStaticElements();
    this.buildBall();
    this.buildUIBadges();
  }

  buildStaticElements() {
    // 1. Cosmic Deep Background
    const bg = new PIXI.Graphics();
    bg.beginFill(CONFIG.CORRIDOR.COLOR_BG);
    bg.drawRect(0, 0, CONFIG.STAGE_WIDTH, CONFIG.STAGE_HEIGHT);
    bg.endFill();

    // Red Endzone subtle floor gradient tint
    bg.beginFill(CONFIG.RED_ZONE.COLOR, 0.12);
    bg.drawRect(0, 0, CONFIG.STAGE_WIDTH, CONFIG.RED_ZONE.BOTTOM);
    bg.endFill();

    // Blue Endzone subtle floor gradient tint
    bg.beginFill(CONFIG.BLUE_ZONE.COLOR, 0.12);
    bg.drawRect(0, CONFIG.BLUE_ZONE.TOP, CONFIG.STAGE_WIDTH, CONFIG.BLUE_ZONE.HEIGHT);
    bg.endFill();

    this.bgContainer.addChild(bg);

    // 2. Neon Side Laser Rails (Left and Right borders)
    const rails = new PIXI.Graphics();
    // Left Rail
    rails.lineStyle(4, 0xBD00FF, 0.85);
    rails.moveTo(45, 40);
    rails.lineTo(45, CONFIG.STAGE_HEIGHT - 40);
    // Right Rail
    rails.moveTo(CONFIG.STAGE_WIDTH - 45, 40);
    rails.lineTo(CONFIG.STAGE_WIDTH - 45, CONFIG.STAGE_HEIGHT - 40);

    // Inner glowing lines
    rails.lineStyle(1.5, 0xFFFFFF, 0.95);
    rails.moveTo(45, 40);
    rails.lineTo(45, CONFIG.STAGE_HEIGHT - 40);
    rails.moveTo(CONFIG.STAGE_WIDTH - 45, 40);
    rails.lineTo(CONFIG.STAGE_WIDTH - 45, CONFIG.STAGE_HEIGHT - 40);

    this.bordersContainer.addChild(rails);

    // 3. Goal Lines (Red Y=384, Blue Y=1536)
    this.goalLinesGfx = new PIXI.Graphics();
    this.bordersContainer.addChild(this.goalLinesGfx);

    // 4. Moving Synthwave Grid Lines
    this.gridGfx = new PIXI.Graphics();
    this.gridContainer.addChild(this.gridGfx);
  }

  buildBall() {
    this.ball = new PIXI.Container();
    this.ball.x = CONFIG.STAGE_WIDTH / 2;
    this.ball.y = CONFIG.CORRIDOR.CENTER_Y;

    // Ball visual layers
    this.ballOuterHalo = new PIXI.Graphics();
    this.ballPulseRing = new PIXI.Graphics(); // Directional dynamic shockwave ring
    this.ballPlasmaRings = new PIXI.Graphics();
    this.ballCore = new PIXI.Graphics();
    this.ballLightning = new PIXI.Graphics();

    // Digital readout inside ball
    this.ballText = new PIXI.Text('50%', {
      fontFamily: 'Montserrat, Rajdhani, sans-serif',
      fontSize: 26,
      fontWeight: '900',
      fill: '#FFFFFF',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 6,
    });
    this.ballText.anchor.set(0.5);

    this.ball.addChild(this.ballOuterHalo);
    this.ball.addChild(this.ballPulseRing);
    this.ball.addChild(this.ballPlasmaRings);
    this.ball.addChild(this.ballCore);
    this.ball.addChild(this.ballLightning);
    this.ball.addChild(this.ballText);

    this.ballContainer.addChild(this.ball);
  }

  buildUIBadges() {
    // Red Team Top Header Badge
    this.redBadge = new PIXI.Container();
    this.redBadge.x = CONFIG.STAGE_WIDTH / 2;
    this.redBadge.y = 50;

    const rBg = new PIXI.Graphics();
    rBg.beginFill(0x160814, 0.92);
    rBg.lineStyle(2.5, CONFIG.RED_ZONE.COLOR, 1);
    rBg.drawRoundedRect(-220, -32, 440, 64, 16);
    rBg.endFill();

    this.redTitleText = new PIXI.Text('KIRMIZI TAKIM', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 24,
      fontWeight: '900',
      fill: CONFIG.RED_ZONE.COLOR_HEX,
      dropShadow: true,
      dropShadowColor: CONFIG.RED_ZONE.COLOR_HEX,
      dropShadowBlur: 8,
    });
    this.redTitleText.anchor.set(0.5, 0.7);

    this.redStatsText = new PIXI.Text('0 Savaşçı | 0 Puan', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: 16,
      fontWeight: '700',
      fill: '#E2E8F0',
    });
    this.redStatsText.anchor.set(0.5, -0.6);

    this.redBadge.addChild(rBg);
    this.redBadge.addChild(this.redTitleText);
    this.redBadge.addChild(this.redStatsText);
    this.uiOverlayContainer.addChild(this.redBadge);

    // Blue Team Bottom Header Badge
    this.blueBadge = new PIXI.Container();
    this.blueBadge.x = CONFIG.STAGE_WIDTH / 2;
    this.blueBadge.y = CONFIG.STAGE_HEIGHT - 50;

    const bBg = new PIXI.Graphics();
    bBg.beginFill(0x06141F, 0.92);
    bBg.lineStyle(2.5, CONFIG.BLUE_ZONE.COLOR, 1);
    bBg.drawRoundedRect(-220, -32, 440, 64, 16);
    bBg.endFill();

    this.blueTitleText = new PIXI.Text('MAVİ TAKIM', {
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 24,
      fontWeight: '900',
      fill: CONFIG.BLUE_ZONE.COLOR_HEX,
      dropShadow: true,
      dropShadowColor: CONFIG.BLUE_ZONE.COLOR_HEX,
      dropShadowBlur: 8,
    });
    this.blueTitleText.anchor.set(0.5, 0.7);

    this.blueStatsText = new PIXI.Text('0 Savaşçı | 0 Puan', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: 16,
      fontWeight: '700',
      fill: '#E2E8F0',
    });
    this.blueStatsText.anchor.set(0.5, -0.6);

    this.blueBadge.addChild(bBg);
    this.blueBadge.addChild(this.blueTitleText);
    this.blueBadge.addChild(this.blueStatsText);
    this.uiOverlayContainer.addChild(this.blueBadge);

    // Center Corridor Distance Markers
    this.markersGfx = new PIXI.Graphics();
    this.uiOverlayContainer.addChild(this.markersGfx);
    this.drawMarkers();
  }

  drawMarkers() {
    const g = this.markersGfx;
    g.clear();

    // 50% Center Zero-Gravity Line
    g.lineStyle(2, 0xFFFFFF, 0.35);
    for (let x = 70; x < CONFIG.STAGE_WIDTH - 70; x += 30) {
      g.moveTo(x, 960);
      g.lineTo(x + 16, 960);
    }

    // 25% Line (Closer to Red)
    g.lineStyle(1.5, CONFIG.RED_ZONE.COLOR, 0.4);
    for (let x = 90; x < CONFIG.STAGE_WIDTH - 90; x += 40) {
      g.moveTo(x, 672);
      g.lineTo(x + 20, 672);
    }

    // 75% Line (Closer to Blue)
    g.lineStyle(1.5, CONFIG.BLUE_ZONE.COLOR, 0.4);
    for (let x = 90; x < CONFIG.STAGE_WIDTH - 90; x += 40) {
      g.moveTo(x, 1248);
      g.lineTo(x + 20, 1248);
    }
  }

  updateTeamStats(redCount, redScore, blueCount, blueScore, redQueue = 0, blueQueue = 0) {
    const redQueueStr = redQueue > 0 ? ` (+${redQueue} Sırada)` : '';
    const blueQueueStr = blueQueue > 0 ? ` (+${blueQueue} Sırada)` : '';
    this.redStatsText.text = `${redCount} Savaşçı${redQueueStr} | ${redScore} Puan`;
    this.blueStatsText.text = `${blueCount} Savaşçı${blueQueueStr} | ${blueScore} Puan`;
  }

  // Fire an action-triggered laser beam or mega-beam to the ball (fades out in 0.4s or 0.9s)
  fireBeam(fromX, fromY, toX, toY, color, isMega = false, diamonds = 1) {
    this.activeBeams.push({
      fromX,
      fromY,
      toX,
      toY,
      color,
      isMega,
      diamonds,
      life: 0,
      maxLife: isMega ? 0.9 : 0.38,
      width: isMega ? 12 : 4.5,
      coreWidth: isMega ? 4.5 : 1.5,
      jitter: isMega ? 16 : 7
    });
  }

  // Subtle or explosive camera screen shake
  triggerScreenShake(intensity = 15, duration = 0.45) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
  }

  // Render only the active pulsed action beams
  renderBeams(delta) {
    const gfx = this.beamsGfx;
    gfx.clear();

    for (let i = this.activeBeams.length - 1; i >= 0; i--) {
      const b = this.activeBeams[i];
      b.life += (1 / 60) * delta;
      if (b.life >= b.maxLife) {
        this.activeBeams.splice(i, 1);
        continue;
      }

      const progress = b.life / b.maxLife;
      const alpha = Math.max(0, 1 - Math.pow(progress, 1.6));

      const steps = b.isMega ? 16 : 10;
      const dx = (b.toX - b.fromX) / steps;
      const dy = (b.toY - b.fromY) / steps;

      // Outer plasma glow for mega gift beams
      if (b.isMega) {
        gfx.lineStyle(b.width * 2.2, b.color, alpha * 0.4);
        gfx.moveTo(b.fromX, b.fromY);
        for (let s = 1; s <= steps; s++) {
          const px = b.fromX + dx * s + (s < steps ? (Math.random() - 0.5) * b.jitter * 1.5 : 0);
          const py = b.fromY + dy * s + (s < steps ? (Math.random() - 0.5) * b.jitter * 1.5 : 0);
          gfx.lineTo(px, py);
        }
      }

      // Main colored laser line
      gfx.lineStyle(b.width, b.color, alpha * 0.9);
      gfx.moveTo(b.fromX, b.fromY);
      for (let s = 1; s <= steps; s++) {
        const jitterAmount = (s < steps) ? (Math.random() - 0.5) * b.jitter : 0;
        const px = b.fromX + dx * s + jitterAmount;
        const py = b.fromY + dy * s + jitterAmount;
        gfx.lineTo(px, py);
      }

      // Bright white high-energy laser core
      gfx.lineStyle(b.coreWidth, 0xFFFFFF, alpha * 0.95);
      gfx.moveTo(b.fromX, b.fromY);
      for (let s = 1; s <= steps; s++) {
        const jitterAmount = (s < steps) ? (Math.random() - 0.5) * (b.jitter * 0.35) : 0;
        const px = b.fromX + dx * s + jitterAmount;
        const py = b.fromY + dy * s + jitterAmount;
        gfx.lineTo(px, py);
      }
    }
  }

  update(delta, ballY) {
    this.animTime += 0.04 * delta;
    this.ballY = ballY;
    this.ball.y = ballY;

    // 0. Screen shake update
    if (this.shakeTime > 0) {
      this.x = (Math.random() - 0.5) * this.shakeIntensity;
      this.y = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeTime -= (1 / 60) * delta;
      this.shakeIntensity *= Math.pow(0.92, delta);
    } else {
      this.x = 0;
      this.y = 0;
    }

    // Calculate progression percentage (0% = Red Goal at 384, 100% = Blue Goal at 1536)
    const range = CONFIG.CORRIDOR.BOTTOM - CONFIG.CORRIDOR.TOP;
    this.pushRatio = Math.max(0, Math.min(1, (ballY - CONFIG.CORRIDOR.TOP) / range));
    const percentInt = Math.round(this.pushRatio * 100);
    this.ballText.text = `${percentInt}%`;

    // 1. Draw synthwave perspective grid with scrolling motion
    const grid = this.gridGfx;
    grid.clear();
    grid.lineStyle(1.5, CONFIG.CORRIDOR.GRID_COLOR, 0.5);

    // Vertical perspective lines
    const numVerts = 14;
    for (let i = 0; i <= numVerts; i++) {
      const x = 50 + (i / numVerts) * (CONFIG.STAGE_WIDTH - 100);
      grid.moveTo(x, CONFIG.CORRIDOR.TOP);
      grid.lineTo(x, CONFIG.CORRIDOR.BOTTOM);
    }

    // Horizontal moving scanlines
    const offset = (this.animTime * 25) % 40;
    for (let y = CONFIG.CORRIDOR.TOP + offset; y <= CONFIG.CORRIDOR.BOTTOM; y += 40) {
      grid.moveTo(50, y);
      grid.lineTo(CONFIG.STAGE_WIDTH - 50, y);
    }

    // 2. Animate Goal Hazard Lines
    const gl = this.goalLinesGfx;
    gl.clear();
    const pulseRed = 0.6 + Math.sin(this.animTime * 4) * 0.35;
    const pulseBlue = 0.6 + Math.cos(this.animTime * 4) * 0.35;

    // Red Goal Line (Y=384)
    gl.lineStyle(5, CONFIG.RED_ZONE.COLOR, pulseRed);
    gl.moveTo(45, CONFIG.RED_ZONE.BOTTOM);
    gl.lineTo(CONFIG.STAGE_WIDTH - 45, CONFIG.RED_ZONE.BOTTOM);
    // Hazard dashes
    gl.lineStyle(2, 0xFFFFFF, pulseRed);
    for (let x = 60; x < CONFIG.STAGE_WIDTH - 60; x += 40) {
      gl.moveTo(x, CONFIG.RED_ZONE.BOTTOM - 6);
      gl.lineTo(x + 15, CONFIG.RED_ZONE.BOTTOM + 6);
    }

    // Blue Goal Line (Y=1536)
    gl.lineStyle(5, CONFIG.BLUE_ZONE.COLOR, pulseBlue);
    gl.moveTo(45, CONFIG.BLUE_ZONE.TOP);
    gl.lineTo(CONFIG.STAGE_WIDTH - 45, CONFIG.BLUE_ZONE.TOP);
    // Hazard dashes
    gl.lineStyle(2, 0xFFFFFF, pulseBlue);
    for (let x = 60; x < CONFIG.STAGE_WIDTH - 60; x += 40) {
      gl.moveTo(x, CONFIG.BLUE_ZONE.TOP - 6);
      gl.lineTo(x + 15, CONFIG.BLUE_ZONE.TOP + 6);
    }

    // 3. Render Multi-layered Energy Orb & Directional Pulses
    this.renderBallGraphics();

    // 4. Render Active Action Laser Beams
    this.renderBeams(delta);
  }

  renderBallGraphics() {
    const t = this.animTime;
    const r = CONFIG.BALL.BASE_RADIUS;

    // Color interpolation based on position:
    // If pushed down (pushRatio > 0.5) -> Red dominates (ball heading to Blue)
    // If pushed up (pushRatio < 0.5) -> Blue dominates (ball heading to Red)
    let dominantColor = 0xBD00FF;
    if (this.pushRatio > 0.55) {
      dominantColor = CONFIG.RED_ZONE.COLOR;
    } else if (this.pushRatio < 0.45) {
      dominantColor = CONFIG.BLUE_ZONE.COLOR;
    }

    // Outer Halo
    const halo = this.ballOuterHalo;
    halo.clear();
    const haloR = r + 24 + Math.sin(t * 5) * 8;
    halo.beginFill(dominantColor, 0.22);
    halo.drawCircle(0, 0, haloR);
    halo.endFill();

    // Dynamic Directional Shockwave Pulse Ring (Expands towards the pushed team)
    const pulseRing = this.ballPulseRing;
    pulseRing.clear();
    const cycle = (t * 2.2) % 1; // 0 to 1
    const pRadius = r + 12 + cycle * 50;
    const pAlpha = (1 - cycle) * 0.75;

    if (this.pushRatio > 0.52) {
      // Red pushing down into Blue territory: expanding Red downward shockwave
      pulseRing.lineStyle(3.5, CONFIG.RED_ZONE.COLOR, pAlpha);
      pulseRing.drawEllipse(0, cycle * 14, pRadius, pRadius * 0.82);
    } else if (this.pushRatio < 0.48) {
      // Blue pushing up into Red territory: expanding Blue upward shockwave
      pulseRing.lineStyle(3.5, CONFIG.BLUE_ZONE.COLOR, pAlpha);
      pulseRing.drawEllipse(0, -cycle * 14, pRadius, pRadius * 0.82);
    } else {
      // Neutral zero-gravity corona ring
      pulseRing.lineStyle(2.5, 0xBD00FF, pAlpha * 0.55);
      pulseRing.drawCircle(0, 0, pRadius);
    }

    // Plasma Rings (Rotating in opposite directions)
    const rings = this.ballPlasmaRings;
    rings.clear();
    rings.lineStyle(3, dominantColor, 0.7);
    // Ring 1 (tilted)
    rings.drawEllipse(0, 0, r + 16, (r + 16) * 0.45);
    rings.rotation = t * 1.5;

    // Ball Core
    const core = this.ballCore;
    core.clear();
    core.beginFill(0x160824, 0.95);
    core.lineStyle(4, dominantColor, 1);
    core.drawCircle(0, 0, r);
    core.endFill();

    // Inner bright glow ring
    core.lineStyle(2, 0xFFFFFF, 0.85);
    core.drawCircle(0, 0, r - 8);

    // Lightning Arcs inside the orb
    const lightning = this.ballLightning;
    lightning.clear();
    lightning.lineStyle(2, 0xFFFFFF, 0.9);
    for (let i = 0; i < 3; i++) {
      const a1 = (t * 4 + i * 2) % (Math.PI * 2);
      const a2 = a1 + 1.2;
      const x1 = Math.cos(a1) * (r - 12);
      const y1 = Math.sin(a1) * (r - 12);
      const x2 = Math.cos(a2) * (r - 12);
      const y2 = Math.sin(a2) * (r - 12);
      lightning.moveTo(x1, y1);
      lightning.lineTo((x1 + x2) / 2 + (Math.random() - 0.5) * 10, (y1 + y2) / 2 + (Math.random() - 0.5) * 10);
      lightning.lineTo(x2, y2);
    }
  }
}
