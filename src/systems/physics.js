/**
 * BallWar - Physics Engine & Tug-of-War Dynamics
 * Implements impulse forces, terminal velocity clamping, damping and win condition checks.
 */

import { CONFIG } from '../config.js';

export class TugOfWarPhysics {
  constructor() {
    this.reset();
  }

  reset() {
    this.ballY = CONFIG.CORRIDOR.CENTER_Y; // 960px
    this.velocity = 0; // px/frame
    this.winner = null;
    this.isMatchActive = false;
  }

  startMatch() {
    this.ballY = CONFIG.CORRIDOR.CENTER_Y;
    this.velocity = 0;
    this.winner = null;
    this.isMatchActive = true;
  }

  stopMatch() {
    this.isMatchActive = false;
  }

  // Calculate gift impulse percentage based on diamond count (1.5% to 3.5%)
  calculateGiftImpulse(diamondCount = 1) {
    const minP = CONFIG.PHYSICS.GIFT_MIN_IMPULSE_PERCENT;
    const maxP = CONFIG.PHYSICS.GIFT_MAX_IMPULSE_PERCENT;
    // Logarithmic scale for diamond scaling
    const normalized = Math.min(1, Math.log10(Math.max(1, diamondCount)) / 3); // 1 diamond -> 0, 1000 diamonds -> 1
    return minP + (maxP - minP) * normalized;
  }

  // Apply push impulse from a team
  applyImpulse(team, type = 'like', diamondCount = 1) {
    if (!this.isMatchActive) return 0;

    // Team direction: Red pushes DOWN (+1), Blue pushes UP (-1)
    const direction = (team === 'RED') ? CONFIG.RED_ZONE.DIRECTION : CONFIG.BLUE_ZONE.DIRECTION;

    let impulsePercent = 0;
    if (type === 'comment') {
      impulsePercent = CONFIG.PHYSICS.COMMENT_IMPULSE_PERCENT; // 0.15%
    } else if (type === 'like') {
      impulsePercent = CONFIG.PHYSICS.LIKE_IMPULSE_PERCENT; // 0.15%
    } else if (type === 'gift') {
      impulsePercent = this.calculateGiftImpulse(diamondCount); // 1.5% - 3.5%
    }

    // Convert screen percentage to raw pixels (1080 x 1920)
    const impulsePx = CONFIG.STAGE_HEIGHT * impulsePercent;

    // Add to velocity
    this.velocity += impulsePx * direction;
    return impulsePx;
  }

  // Update physics simulation per frame
  update(delta) {
    if (!this.isMatchActive) return this.winner;

    // 1. Velocity damping / friction
    this.velocity *= Math.pow(CONFIG.PHYSICS.DAMPING, delta);

    // 2. Terminal Velocity Clamping (Max 5% screen distance per second)
    // 96 px/s / 60 frames = 1.6 px/frame
    const maxSpeedPerFrame = (CONFIG.PHYSICS.MAX_SPEED_PER_SEC / 60) * delta;
    if (Math.abs(this.velocity) > maxSpeedPerFrame) {
      this.velocity = Math.sign(this.velocity) * maxSpeedPerFrame;
    }

    // 3. Position update
    this.ballY += this.velocity * delta;

    // 4. Win Condition Checks
    // Ball pushed into Red Goal (Y <= 384) -> Blue Wins
    if (this.ballY <= CONFIG.PHYSICS.RED_GOAL_Y) {
      this.ballY = CONFIG.PHYSICS.RED_GOAL_Y;
      this.winner = 'BLUE';
      this.isMatchActive = false;
      return this.winner;
    }

    // Ball pushed into Blue Goal (Y >= 1536) -> Red Wins
    if (this.ballY >= CONFIG.PHYSICS.BLUE_GOAL_Y) {
      this.ballY = CONFIG.PHYSICS.BLUE_GOAL_Y;
      this.winner = 'RED';
      this.isMatchActive = false;
      return this.winner;
    }

    return null;
  }

  // Evaluate winner when 60 seconds time out occurs
  resolveTimeoutWinner() {
    this.isMatchActive = false;
    if (this.ballY > CONFIG.CORRIDOR.CENTER_Y) {
      // Red pushed it deeper into Blue's half
      this.winner = 'RED';
    } else if (this.ballY < CONFIG.CORRIDOR.CENTER_Y) {
      // Blue pushed it deeper into Red's half
      this.winner = 'BLUE';
    } else {
      // Exact center tie -> random or coin flip
      this.winner = (Math.random() < 0.5) ? 'RED' : 'BLUE';
    }
    return this.winner;
  }
}
