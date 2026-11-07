/**
 * BallWar - Main Entrypoint & PIXI Initializer
 * Target Resolution: 1080 x 1920 (9:16 Vertical)
 */

import { CONFIG } from './config.js';
import { Arena } from './systems/arena.js';
import { TugOfWarPhysics } from './systems/physics.js';
import { ParticlePool } from './systems/particlePool.js';
import { GameManager } from './systems/gameManager.js';
import { TikTokBridge } from './systems/tiktokBridge.js';
import { sounds } from './systems/soundManager.js';

const PIXI = window.PIXI;

class BallWarApp {
  constructor() {
    this.canvasContainer = document.getElementById('game-container');
    this.initPixi();
  }

  async initPixi() {
    // Check if PIXI is loaded from CDN
    if (!window.PIXI) {
      console.error('Pixi.js kütüphanesi yüklenemedi!');
      return;
    }

    // Create PIXI Application with strict 1080x1920 dimensions
    this.app = new PIXI.Application({
      width: CONFIG.STAGE_WIDTH,
      height: CONFIG.STAGE_HEIGHT,
      backgroundColor: CONFIG.PALETTE.BG_DARK,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    // Append canvas to container
    this.canvasContainer.appendChild(this.app.view);
    this.app.view.classList.add('game-canvas');

    // 1. Particle Pool
    this.particles = new ParticlePool(this.app.stage, 350);

    // 2. Arena
    this.arena = new Arena(this.app);
    this.app.stage.addChild(this.arena);

    // 3. Physics Engine
    this.physics = new TugOfWarPhysics();

    // 4. Game Manager (State Machine, Avatars, Scores)
    this.gameManager = new GameManager(this.app, this.arena, this.physics, this.particles);

    // 5. TikTok Event Bridge & Dev Tools
    this.bridge = new TikTokBridge(this.gameManager);

    // 6. Global interaction unlocks audio context
    window.addEventListener('pointerdown', () => sounds.ensureContext(), { once: true });
    window.addEventListener('keydown', () => sounds.ensureContext(), { once: true });

    // 7. Pixi Ticker Update Loop
    this.app.ticker.add((delta) => {
      this.gameManager.update(delta);
    });

    // Expose instance for console debugging
    window.ballWar = this;
    console.log('⚡ BallWar başarıyla başlatıldı! (1080x1920)');
  }
}

// Start game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new BallWarApp();
});
