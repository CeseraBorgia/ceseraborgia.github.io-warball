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

  updateTeamStats(redCount, redScore, blueCount, blueScore) {
    this.redStatsText.text = `${redCount} Savaşçı | ${redScore} Puan`;
    this.blueStatsText.text = `${blueCount} Savaşçı | ${blueScore} Puan`;
  }

  // Draw dynamic energy beams from pushing avatars into the ball
  drawEnergyBeams(redAvatars, blueAvatars, activeMatch) {
    const beamsGfx = this.beamsGfx;
    beamsGfx.clear();

    if (!activeMatch) return;

    const bx = this.ball.x;
    const by = this.ball.y;

    // Draw Red beams
    redAvatars.forEach(av => {
      if (av.state === 'pushing') {
        const jitter = (Math.random() - 0.5) * 14;
        beamsGfx.lineStyle(3.5, CONFIG.RED_ZONE.COLOR, 0.85);
        beamsGfx.moveTo(av.x, av.y + 20);
        beamsGfx.quadraticCurveTo((av.x + bx) / 2 + jitter, (av.y + by) / 2, bx, by);

        // Core laser wire
        beamsGfx.lineStyle(1.5, 0xFFFFFF, 0.95);
        beamsGfx.moveTo(av.x, av.y + 20);
        beamsGfx.quadraticCurveTo((av.x + bx) / 2 + jitter, (av.y + by) / 2, bx, by);
      }
    });

    // Draw Blue beams
    blueAvatars.forEach(av => {
      if (av.state === 'pushing') {
        const jitter = (Math.random() - 0.5) * 14;
        beamsGfx.lineStyle(3.5, CONFIG.BLUE_ZONE.COLOR, 0.85);
        beamsGfx.moveTo(av.x, av.y - 20);
        beamsGfx.quadraticCurveTo((av.x + bx) / 2 + jitter, (av.y + by) / 2, bx, by);

        beamsGfx.lineStyle(1.5, 0xFFFFFF, 0.95);
        beamsGfx.moveTo(av.x, av.y - 20);
        beamsGfx.quadraticCurveTo((av.x + bx) / 2 + jitter, (av.y + by) / 2, bx, by);
      }
    });
  }

  update(delta, ballY) {
    this.animTime += 0.04 * delta;
    this.ballY = ballY;
    this.ball.y = ballY;

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

    // 3. Render Multi-layered Energy Orb
    this.renderBallGraphics();
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
