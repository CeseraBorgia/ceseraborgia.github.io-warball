/**
 * BallWar - Object-Pooled Particle Emitter System
 * Minimizes Garbage Collection drops for smooth 60 FPS performance on 1080x1920 canvas.
 */

const PIXI = window.PIXI;

class Particle {
  constructor() {
    this.sprite = new PIXI.Graphics();
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.alpha = 1;
    this.scale = 1;
    this.rotation = 0;
    this.vRot = 0;
    this.life = 0;
    this.maxLife = 1;
    this.gravity = 0;
    this.color = 0xFFFFFF;
    this.type = 'spark'; // spark, confetti, laser
  }

  reset() {
    this.active = false;
    this.sprite.visible = false;
    this.sprite.alpha = 1;
  }
}

export class ParticlePool {
  constructor(stage, initialSize = 350) {
    this.stage = stage;
    this.container = new PIXI.Container();
    this.stage.addChild(this.container);

    this.pool = [];
    this.activeParticles = [];

    // Pre-allocate pool
    for (let i = 0; i < initialSize; i++) {
      const p = new Particle();
      this.pool.push(p);
      this.container.addChild(p.sprite);
      p.sprite.visible = false;
    }
  }

  getParticle() {
    let p = this.pool.pop();
    if (!p) {
      // Allocate on demand if pool depleted
      p = new Particle();
      this.container.addChild(p.sprite);
    }
    p.active = true;
    p.sprite.visible = true;
    this.activeParticles.push(p);
    return p;
  }

  // Spawn an energy spark around the ball or character
  spawnSpark(x, y, color = 0x00E5FF, count = 5) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      p.x = x + (Math.random() - 0.5) * 40;
      p.y = y + (Math.random() - 0.5) * 40;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = 0;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.3;
      p.vRot = (Math.random() - 0.5) * 0.2;
      p.color = color;
      p.type = 'spark';

      p.sprite.clear();
      p.sprite.beginFill(color);
      p.sprite.drawCircle(0, 0, 3 + Math.random() * 3);
      p.sprite.endFill();
      p.sprite.x = p.x;
      p.sprite.y = p.y;
    }
  }

  // Confetti explosion for victory
  spawnConfetti(x, y, colors = [0xFF0055, 0x00E5FF, 0xFFD700, 0x39FF14], count = 40) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      p.x = x + (Math.random() - 0.5) * 60;
      p.y = y + (Math.random() - 0.5) * 40;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 8 + Math.random() * 16;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = 0.35 + Math.random() * 0.2;
      p.life = 0;
      p.maxLife = 2.0 + Math.random() * 1.5;
      p.vRot = (Math.random() - 0.5) * 0.3;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.type = 'confetti';

      const w = 8 + Math.random() * 8;
      const h = 5 + Math.random() * 6;
      p.sprite.clear();
      p.sprite.beginFill(p.color);
      p.sprite.drawRect(-w / 2, -h / 2, w, h);
      p.sprite.endFill();
      p.sprite.x = p.x;
      p.sprite.y = p.y;
    }
  }

  // Fireworks shell explosion
  spawnFirework(x, y, color = 0xFFD700, count = 50) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      p.x = x;
      p.y = y;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const speed = 4 + Math.random() * 8;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.gravity = 0.12;
      p.life = 0;
      p.maxLife = 1.2 + Math.random() * 0.8;
      p.vRot = 0;
      p.color = color;
      p.type = 'firework';

      p.sprite.clear();
      p.sprite.beginFill(color);
      p.sprite.drawCircle(0, 0, 3.5);
      p.sprite.endFill();
      p.sprite.x = p.x;
      p.sprite.y = p.y;
    }
  }

  update(delta) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life += (1 / 60) * delta;

      if (p.life >= p.maxLife) {
        // Return to pool
        p.reset();
        this.activeParticles.splice(i, 1);
        this.pool.push(p);
        continue;
      }

      // Physics update
      p.vy += p.gravity * delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.rotation += p.vRot * delta;

      // Alpha fade out
      const progress = p.life / p.maxLife;
      p.sprite.alpha = 1 - progress * progress;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.rotation = p.rotation;

      if (p.type === 'confetti') {
        // 3D tumbling illusion
        p.sprite.scale.x = Math.cos(p.life * 8);
      }
    }
  }
}
