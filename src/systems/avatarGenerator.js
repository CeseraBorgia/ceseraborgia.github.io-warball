/**
 * BallWar - Procedural Edgy/Cool Human Avatar System
 * Generates modular vector characters in Pixi.js, deterministically hashed by `uniqueId`.
 */

import { CONFIG } from '../config.js';

const PIXI = window.PIXI;
const gsap = window.gsap;

// Deterministic DJB2 hash with seed support
function hashString(str) {
  let hash = 5381;
  const s = String(str || 'guest');
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) + s.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Pseudo-random number generator derived from hash
class SeededRNG {
  constructor(seed) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  next() {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  choice(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  range(min, max) {
    return min + this.next() * (max - min);
  }
}

// Visual Palette Options for Modular Generation
const PALETTES = {
  SKIN_TONES: [
    { name: 'fair', color: 0xFDE2D2, cyberSeam: 0xFF5588 },
    { name: 'peach', color: 0xF5C6A5, cyberSeam: 0x00E5FF },
    { name: 'tan', color: 0xD19B74, cyberSeam: 0x39FF14 },
    { name: 'deep', color: 0x7C4927, cyberSeam: 0xFFD700 },
    { name: 'cyber_lavender', color: 0xD0C0F0, cyberSeam: 0xBD00FF },
    { name: 'synth_teal', color: 0x80DEEA, cyberSeam: 0xFF007F },
    { name: 'midnight_chrome', color: 0x242436, cyberSeam: 0x00F0FF }
  ],
  HAIR_COLORS: [
    0xFF007F, // Hot Pink
    0x39FF14, // Acid Green
    0x00F0FF, // Electric Cyan
    0xBD00FF, // Neon Purple
    0xFFFFFF, // Platinum White
    0xFF6600, // Cyber Orange
    0xFFD700  // Neon Gold
  ],
  CLOTH_COLORS: [
    0x12121E, // Dark Tech Charcoal
    0x1E1E2E, // Cyber Navy
    0x2D1B36, // Deep Neon Violet
    0x0F292F, // Deep Neon Teal
    0x3B1824  // Deep Neon Crimson
  ],
  NEON_ACCENTS: [
    0xFF0055, 0x00E5FF, 0x39FF14, 0xBD00FF, 0xFF6600, 0xFFEE00
  ]
};

export class Avatar extends PIXI.Container {
  constructor(userData, team) {
    super();

    this.userData = userData; // { uniqueId, nickname, profilePictureUrl, isFollower }
    this.team = team; // 'RED' or 'BLUE'
    this.hash = hashString(userData.uniqueId);
    this.rng = new SeededRNG(this.hash);

    // Gameplay Attributes
    this.points = 0;
    this.likeCount = 0;
    this.commentCount = 0;
    this.giftDiamonds = 0;

    // Movement / Target coords
    this.targetX = 0;
    this.targetY = 0;
    this.state = 'idle'; // idle, pushing, celebration, defeat
    this.animTime = this.rng.range(0, Math.PI * 2); // Random offset for organic desynchronized idle
    this.isFacingDown = (this.team === 'RED');

    // Create container hierarchy
    this.shadowGraphics = new PIXI.Graphics();
    this.bodyContainer = new PIXI.Container();
    this.auraContainer = new PIXI.Container();
    this.nametagContainer = new PIXI.Container();

    this.addChild(this.shadowGraphics);
    this.addChild(this.auraContainer);
    this.addChild(this.bodyContainer);
    this.addChild(this.nametagContainer);

    // Build parts
    this.generateVisuals();
    this.createNametag();

    // Default scale - Increased to 1.45 (1.7x+ larger for mobile/OBS stream visibility)
    this.baseScale = 1.45;
    this.scale.set(this.baseScale);
    this.pushTimeout = null;
    this.lastActiveTimestamp = Date.now();
    this.onStage = true;
  }

  generateVisuals() {
    const rng = this.rng;

    const skin = rng.choice(PALETTES.SKIN_TONES);
    const hairColor = rng.choice(PALETTES.HAIR_COLORS);
    const clothColor = rng.choice(PALETTES.CLOTH_COLORS);
    const accentColor = (this.team === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR;
    const secondaryAccent = rng.choice(PALETTES.NEON_ACCENTS);

    // Style indices
    const hairStyle = Math.floor(rng.next() * 6); // 0-5
    const outfitType = Math.floor(rng.next() * 5); // 0-4
    const accessoryType = Math.floor(rng.next() * 5); // 0: Visor, 1: Shades, 2: Headset, 3: Mask, 4: Horns/Halo

    this.parts = {
      skin,
      hairColor,
      clothColor,
      accentColor,
      secondaryAccent,
      hairStyle,
      outfitType,
      accessoryType
    };

    // Draw Drop Shadow
    this.shadowGraphics.clear();
    this.shadowGraphics.beginFill(0x000000, 0.45);
    this.shadowGraphics.drawEllipse(0, 38, 28, 9);
    this.shadowGraphics.endFill();

    // Grouping inside bodyContainer
    this.legsGfx = new PIXI.Graphics();
    this.torsoGfx = new PIXI.Graphics();
    this.headGfx = new PIXI.Graphics();
    this.hairGfx = new PIXI.Graphics();
    this.faceGfx = new PIXI.Graphics();
    this.armsGfx = new PIXI.Graphics();
    this.accessoryGfx = new PIXI.Graphics();
    this.propsGfx = new PIXI.Graphics(); // For glowsticks during celebration

    this.bodyContainer.addChild(this.legsGfx);
    this.bodyContainer.addChild(this.torsoGfx);
    this.bodyContainer.addChild(this.armsGfx);
    this.bodyContainer.addChild(this.headGfx);
    this.bodyContainer.addChild(this.faceGfx);
    this.bodyContainer.addChild(this.hairGfx);
    this.bodyContainer.addChild(this.accessoryGfx);
    this.bodyContainer.addChild(this.propsGfx);

    this.drawLegsAndShoes();
    this.drawTorso();
    this.drawHeadAndFace();
    this.drawHair();
    this.drawAccessory();
    this.drawArms();
  }

  drawLegsAndShoes() {
    const g = this.legsGfx;
    const p = this.parts;
    g.clear();

    // Legs / Pants
    const pantColor = p.clothColor;
    const neonStripe = p.secondaryAccent;

    // Left Leg
    g.beginFill(pantColor);
    g.drawRoundedRect(-14, 8, 11, 24, 3);
    g.endFill();

    // Right Leg
    g.beginFill(pantColor);
    g.drawRoundedRect(3, 8, 11, 24, 3);
    g.endFill();

    // Neon Cyber Stripes on cargo pants
    g.lineStyle(2, neonStripe, 0.9);
    g.moveTo(-13, 14);
    g.lineTo(-13, 26);
    g.moveTo(13, 14);
    g.lineTo(13, 26);

    // High-top Cyber Sneakers
    g.lineStyle(0);
    // Left shoe
    g.beginFill(0x111119);
    g.drawRoundedRect(-17, 30, 15, 9, 3);
    g.endFill();
    // Glowing neon sole
    g.beginFill(p.accentColor);
    g.drawRect(-17, 37, 15, 3);
    g.endFill();

    // Right shoe
    g.beginFill(0x111119);
    g.drawRoundedRect(2, 30, 15, 9, 3);
    g.endFill();
    g.beginFill(p.accentColor);
    g.drawRect(2, 37, 15, 3);
    g.endFill();
  }

  drawTorso() {
    const g = this.torsoGfx;
    const p = this.parts;
    g.clear();

    // Base Torso / Outfit
    g.beginFill(p.clothColor);
    g.drawRoundedRect(-16, -16, 32, 28, 5);
    g.endFill();

    // Outfit styles
    switch (p.outfitType) {
      case 0: // Tactical Armor Vest
        g.beginFill(0x090910);
        g.drawRoundedRect(-14, -14, 28, 22, 4);
        g.endFill();
        // Glowing clips & straps
        g.lineStyle(2, p.accentColor, 1);
        g.moveTo(-11, -10);
        g.lineTo(11, -10);
        g.moveTo(-11, -2);
        g.lineTo(11, -2);
        // Chest Core Reactor
        g.lineStyle(0);
        g.beginFill(p.secondaryAccent);
        g.drawCircle(0, -6, 3.5);
        g.endFill();
        break;

      case 1: // Cyber Crop Top
        g.lineStyle(0);
        // Skin midriff
        g.beginFill(p.skin.color);
        g.drawRect(-13, 2, 26, 8);
        g.endFill();
        // Cyber Seams on skin
        g.lineStyle(1, p.skin.cyberSeam, 0.7);
        g.moveTo(-6, 3);
        g.lineTo(-6, 9);
        g.moveTo(6, 3);
        g.lineTo(6, 9);
        // Top edge neon trim
        g.lineStyle(2, p.accentColor, 1);
        g.moveTo(-15, -15);
        g.lineTo(15, -15);
        break;

      case 2: // Holographic Leather Jacket
        // Neon Lapels
        g.lineStyle(2.5, p.secondaryAccent, 1);
        g.moveTo(-14, -14);
        g.lineTo(-4, 6);
        g.moveTo(14, -14);
        g.lineTo(4, 6);
        // Neon zipper/accent
        g.lineStyle(2, p.accentColor, 1);
        g.moveTo(0, 0);
        g.lineTo(0, 10);
        break;

      case 3: // Neon Mesh Shirt
        // Mesh pattern grid
        g.lineStyle(1, p.secondaryAccent, 0.4);
        for (let x = -12; x <= 12; x += 6) {
          g.moveTo(x, -14);
          g.lineTo(x, 8);
        }
        for (let y = -12; y <= 8; y += 6) {
          g.moveTo(-12, y);
          g.lineTo(12, y);
        }
        // Glowing collar
        g.lineStyle(2, p.accentColor, 1);
        g.drawCircle(0, -14, 5);
        break;

      case 4: // Techwear Hoodie
      default:
        // Hood drawstrings
        g.lineStyle(2, p.accentColor, 1);
        g.moveTo(-4, -12);
        g.lineTo(-4, 2);
        g.moveTo(4, -12);
        g.lineTo(4, 2);
        // Front kangaroo pouch pocket
        g.lineStyle(1, p.secondaryAccent, 0.8);
        g.beginFill(0x0a0a14);
        g.drawRoundedRect(-10, -2, 20, 11, 2);
        g.endFill();
        break;
    }
  }

  drawHeadAndFace() {
    const h = this.headGfx;
    const f = this.faceGfx;
    const p = this.parts;
    h.clear();
    f.clear();

    // Head Base Shape
    h.beginFill(p.skin.color);
    h.drawRoundedRect(-15, -42, 30, 28, 9);
    h.endFill();

    // Cyber Seam / Tattoo on cheek
    h.lineStyle(1.5, p.skin.cyberSeam, 0.85);
    h.moveTo(9, -32);
    h.lineTo(13, -28);
    h.lineTo(9, -24);

    // Glowing Cyber Anime Eyes
    f.lineStyle(0);
    // Sclera/Socket
    f.beginFill(0x0A0A14);
    f.drawRect(-11, -33, 7, 5);
    f.drawRect(4, -33, 7, 5);
    f.endFill();

    // Glowing Neon Irises
    f.beginFill(p.secondaryAccent);
    f.drawRect(-9, -32, 4, 4);
    f.drawRect(6, -32, 4, 4);
    f.endFill();

    // Edgy Eyebrows
    f.lineStyle(1.5, 0x111119, 0.9);
    f.moveTo(-12, -36);
    f.lineTo(-4, -34);
    f.moveTo(12, -36);
    f.lineTo(4, -34);

    // Smirk / Mouth
    f.lineStyle(1.5, 0x332222, 0.8);
    f.moveTo(-3, -21);
    f.lineTo(3, -22);
  }

  drawHair() {
    const g = this.hairGfx;
    const p = this.parts;
    const color = p.hairColor;
    g.clear();

    switch (p.hairStyle) {
      case 0: // Tall Spiky Mohawk
        g.beginFill(color);
        g.drawPolygon([
          -6, -42,
          -4, -58,
          0, -64,
          4, -58,
          6, -42
        ]);
        g.drawPolygon([
          -4, -42,
          -8, -54,
          -1, -48
        ]);
        g.drawPolygon([
          4, -42,
          8, -54,
          1, -48
        ]);
        g.endFill();
        break;

      case 1: // Cyber Undercut / Side Sweep
        g.beginFill(0x111119); // Shaved side
        g.drawRect(-15, -42, 7, 14);
        g.endFill();
        // Sweeping neon bang
        g.beginFill(color);
        g.drawPolygon([
          -10, -44,
          16, -45,
          18, -32,
          8, -25,
          2, -38
        ]);
        g.endFill();
        break;

      case 2: // Neon Braids / Cyber Dreads
        g.lineStyle(3, color, 1);
        // Left dreads
        g.moveTo(-12, -40);
        g.lineTo(-18, -20);
        g.moveTo(-8, -42);
        g.lineTo(-14, -14);
        // Right dreads
        g.moveTo(12, -40);
        g.lineTo(18, -20);
        g.moveTo(8, -42);
        g.lineTo(14, -14);
        // Hair top
        g.lineStyle(0);
        g.beginFill(color);
        g.drawRoundedRect(-14, -46, 28, 9, 4);
        g.endFill();
        break;

      case 3: // Wild Cyberpunk Bangs
        g.beginFill(color);
        g.drawPolygon([
          -16, -44,
          -12, -26,
          -8, -38,
          -2, -24,
          4, -38,
          10, -25,
          16, -44,
          0, -48
        ]);
        g.endFill();
        break;

      case 4: // Rave Twin Pigtails / Buns
        g.beginFill(color);
        // Two glowing side buns
        g.drawCircle(-15, -44, 7);
        g.drawCircle(15, -44, 7);
        // Bangs
        g.drawRoundedRect(-12, -44, 24, 7, 3);
        g.endFill();
        // Neon hair ties
        g.lineStyle(2, p.accentColor, 1);
        g.drawCircle(-15, -44, 8);
        g.drawCircle(15, -44, 8);
        break;

      case 5: // Punk Rock Spikes
      default:
        g.beginFill(color);
        g.drawPolygon([
          -15, -42,
          -16, -53,
          -9, -46,
          -5, -57,
          0, -47,
          5, -57,
          9, -46,
          16, -53,
          15, -42
        ]);
        g.endFill();
        break;
    }
  }

  drawAccessory() {
    const g = this.accessoryGfx;
    const p = this.parts;
    g.clear();

    switch (p.accessoryType) {
      case 0: // Futuristic HUD Visor
        g.lineStyle(1.5, p.secondaryAccent, 1);
        g.beginFill(p.accentColor, 0.75);
        g.drawRoundedRect(-16, -34, 32, 8, 2);
        g.endFill();
        // Glowing visor scanner dot
        g.lineStyle(0);
        g.beginFill(0xFFFFFF, 0.9);
        g.drawCircle(-4, -30, 2);
        g.endFill();
        break;

      case 1: // Rave Matrix Sunglasses
        g.lineStyle(1, 0xFFFFFF, 0.8);
        g.beginFill(0x06060E, 0.95);
        g.drawPolygon([-14, -33, -2, -33, -4, -28, -13, -28]);
        g.drawPolygon([2, -33, 14, -33, 13, -28, 4, -28]);
        g.endFill();
        // Bridge
        g.lineStyle(1.5, p.accentColor, 1);
        g.moveTo(-2, -31);
        g.lineTo(2, -31);
        break;

      case 2: // DJ Rave Headset
        // Headband
        g.lineStyle(3, 0x111119, 1);
        g.moveTo(-16, -38);
        g.lineTo(0, -47);
        g.lineTo(16, -38);
        // Glowing earcups
        g.lineStyle(2, p.accentColor, 1);
        g.beginFill(p.secondaryAccent);
        g.drawRoundedRect(-18, -38, 5, 12, 2);
        g.drawRoundedRect(13, -38, 5, 12, 2);
        g.endFill();
        break;

      case 3: // Tactical Cyber Mask / Respirator
        g.lineStyle(1, p.accentColor, 1);
        g.beginFill(0x11111B, 0.95);
        g.drawPolygon([
          -11, -26,
          11, -26,
          8, -15,
          -8, -15
        ]);
        g.endFill();
        // Glowing intake filter vents
        g.lineStyle(0);
        g.beginFill(p.secondaryAccent);
        g.drawCircle(-5, -20, 2.5);
        g.drawCircle(5, -20, 2.5);
        g.endFill();
        break;

      case 4: // Neon Cyber Horns
        g.lineStyle(0);
        g.beginFill(p.accentColor, 0.95);
        g.drawPolygon([-14, -42, -21, -54, -11, -45]);
        g.drawPolygon([14, -42, 21, -54, 11, -45]);
        g.endFill();
        break;
    }
  }

  drawArms() {
    const g = this.armsGfx;
    const p = this.parts;
    g.clear();

    const skinColor = p.skin.color;
    const sleeveColor = p.clothColor;

    if (this.state === 'pushing') {
      // Pushing stance: Arms extended forward toward the central ball!
      const dir = this.isFacingDown ? 1 : -1;
      g.lineStyle(4, sleeveColor, 1);
      // Left arm thrusting
      g.moveTo(-14, -10);
      g.lineTo(-12, 10 * dir);
      g.lineTo(-8, 22 * dir);

      // Right arm thrusting
      g.moveTo(14, -10);
      g.lineTo(12, 10 * dir);
      g.lineTo(8, 22 * dir);

      // Hands with energy glow
      g.lineStyle(0);
      g.beginFill(skinColor);
      g.drawCircle(-8, 23 * dir, 4);
      g.drawCircle(8, 23 * dir, 4);
      g.endFill();

      // Energy charge nodes in hands
      g.beginFill(p.accentColor);
      g.drawCircle(-8, 23 * dir, 2.5);
      g.drawCircle(8, 23 * dir, 2.5);
      g.endFill();
    } else if (this.state === 'celebration') {
      // Arms raised high in the air
      g.lineStyle(4, sleeveColor, 1);
      g.moveTo(-14, -10);
      g.lineTo(-18, -32);
      g.moveTo(14, -10);
      g.lineTo(18, -32);

      // Hands
      g.lineStyle(0);
      g.beginFill(skinColor);
      g.drawCircle(-18, -34, 4);
      g.drawCircle(18, -34, 4);
      g.endFill();

      // Glowing Neon Glowsticks in hands!
      this.propsGfx.clear();
      this.propsGfx.lineStyle(4, p.secondaryAccent, 1);
      this.propsGfx.moveTo(-24, -48);
      this.propsGfx.lineTo(-12, -22);
      this.propsGfx.lineStyle(4, p.accentColor, 1);
      this.propsGfx.moveTo(24, -48);
      this.propsGfx.lineTo(12, -22);
    } else if (this.state === 'defeat') {
      // Slumped down arms
      g.lineStyle(4, sleeveColor, 0.7);
      g.moveTo(-14, -10);
      g.lineTo(-13, 14);
      g.moveTo(14, -10);
      g.lineTo(13, 14);
      g.lineStyle(0);
      g.beginFill(skinColor);
      g.drawCircle(-13, 15, 3.5);
      g.drawCircle(13, 15, 3.5);
      g.endFill();
      this.propsGfx.clear();
    } else {
      // Idle arms
      g.lineStyle(4, sleeveColor, 1);
      g.moveTo(-14, -10);
      g.lineTo(-15, 6);
      g.moveTo(14, -10);
      g.lineTo(15, 6);

      // Hands
      g.lineStyle(0);
      g.beginFill(skinColor);
      g.drawCircle(-15, 8, 3.5);
      g.drawCircle(15, 8, 3.5);
      g.endFill();

      // Subtle glowing neon charge nodes on idle hands (ready to strike)
      g.beginFill(p.accentColor, 0.7);
      g.drawCircle(-15, 8, 2.2);
      g.drawCircle(15, 8, 2.2);
      g.endFill();

      this.propsGfx.clear();
    }
  }

  createNametag() {
    this.nametagContainer.removeChildren();

    const nameText = this.userData.nickname || this.userData.uniqueId || 'Warrior';
    const displayName = (nameText.length > 12) ? nameText.substring(0, 10) + '..' : nameText;

    const accentColor = (this.team === 'RED') ? CONFIG.RED_ZONE.COLOR : CONFIG.BLUE_ZONE.COLOR;
    const accentHex = (this.team === 'RED') ? CONFIG.RED_ZONE.COLOR_HEX : CONFIG.BLUE_ZONE.COLOR_HEX;

    const label = new PIXI.Text(displayName, {
      fontFamily: 'Montserrat, Rajdhani, "Segoe UI", sans-serif',
      fontSize: 13,
      fontWeight: '800',
      fill: '#FFFFFF',
      letterSpacing: 0.5,
      dropShadow: true,
      dropShadowColor: accentHex,
      dropShadowDistance: 0,
      dropShadowBlur: 4,
    });
    label.anchor.set(0.5);

    const padX = 10;
    const padY = 5;
    const tagW = Math.max(68, label.width + padX * 2);
    const tagH = 22;

    const bg = new PIXI.Graphics();
    // Dark cyber pill background
    bg.beginFill(0x0A0814, 0.88);
    bg.lineStyle(1.5, accentColor, 0.95);
    bg.drawRoundedRect(-tagW / 2, -tagH / 2, tagW, tagH, 6);
    bg.endFill();

    // If verified follower, draw a glowing badge dot
    if (this.userData.isFollower) {
      bg.lineStyle(0);
      bg.beginFill(0x39FF14, 1); // Neon follower green dot
      bg.drawCircle(-tagW / 2 + 6, 0, 3);
      bg.endFill();
    }

    this.nametagContainer.addChild(bg);
    this.nametagContainer.addChild(label);

    // Place nametag above head
    this.nametagContainer.y = -68;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    this.drawArms(); // Redraw posture for state

    if (newState === 'pushing') {
      // Lean forward towards the center corridor
      const leanAngle = this.isFacingDown ? 0.22 : -0.22;
      gsap.to(this.bodyContainer, {
        rotation: leanAngle,
        duration: 0.35,
        ease: 'power2.out'
      });
    } else if (newState === 'celebration') {
      gsap.to(this.bodyContainer, {
        rotation: 0,
        duration: 0.25
      });
    } else if (newState === 'defeat') {
      gsap.to(this.bodyContainer, {
        rotation: this.isFacingDown ? -0.1 : 0.1,
        duration: 0.5,
        ease: 'power2.out'
      });
    } else {
      // Idle
      gsap.to(this.bodyContainer, {
        rotation: 0,
        duration: 0.3
      });
    }
  }

  // Temporary pushing burst when sending likes or comments
  triggerPushBurst(duration = 0.4) {
    this.lastActiveTimestamp = Date.now();
    this.setState('pushing');

    if (this.pushTimeout) {
      clearTimeout(this.pushTimeout);
    }

    this.pushTimeout = setTimeout(() => {
      if (this.state === 'pushing') {
        this.setState('idle');
      }
      this.pushTimeout = null;
    }, duration * 1000);
  }

  // Explosive aura and 1.5x scale surge when sending a gift
  triggerGiftAura(diamondCount = 1) {
    const scaleFactor = 1.5;
    const p = this.parts;
    this.lastActiveTimestamp = Date.now();

    // Trigger pushing burst for 1.2s
    this.triggerPushBurst(1.2);

    // Draw radiant energy aura
    this.auraContainer.removeChildren();
    const auraGfx = new PIXI.Graphics();
    auraGfx.lineStyle(4, p.accentColor, 1);
    auraGfx.beginFill(p.secondaryAccent, 0.4);
    auraGfx.drawCircle(0, 0, 56);
    auraGfx.endFill();
    this.auraContainer.addChild(auraGfx);

    // Pop scale animation via GSAP (sustained for 1.2s)
    gsap.killTweensOf(this.scale);
    gsap.timeline()
      .to(this.scale, {
        x: this.baseScale * scaleFactor,
        y: this.baseScale * scaleFactor,
        duration: 0.2,
        ease: 'back.out(2)'
      })
      .to(auraGfx, {
        alpha: 0,
        duration: 1.0,
        ease: 'power1.out',
        onComplete: () => {
          this.auraContainer.removeChildren();
        }
      }, '+=0.8')
      .to(this.scale, {
        x: this.baseScale,
        y: this.baseScale,
        duration: 0.35,
        ease: 'power2.inOut'
      }, '-=0.35');
  }

  // Update loop called every frame by Pixi ticker
  update(delta) {
    this.animTime += 0.05 * delta;

    if (this.state === 'idle') {
      // Subtle organic breathing & bouncing
      const bob = Math.sin(this.animTime * 1.5) * 2;
      const stretch = 1 + Math.sin(this.animTime * 1.5) * 0.035;
      this.bodyContainer.y = bob;
      this.bodyContainer.scale.y = stretch;
      this.bodyContainer.scale.x = 2 - stretch;
    } else if (this.state === 'pushing') {
      // High-frequency muscular pushing vibration
      const pulse = Math.sin(this.animTime * 12) * 1.5;
      const pushDirection = this.isFacingDown ? 1 : -1;
      this.bodyContainer.y = pulse * pushDirection;
    } else if (this.state === 'celebration') {
      // Jumping victory bounce
      const jump = Math.abs(Math.sin(this.animTime * 3)) * 16;
      this.bodyContainer.y = -jump;
      const stretch = 1 + Math.sin(this.animTime * 3) * 0.08;
      this.bodyContainer.scale.y = stretch;
    } else if (this.state === 'defeat') {
      // Slumped breathing
      this.bodyContainer.y = 4;
      this.bodyContainer.scale.y = 0.92;
      this.bodyContainer.scale.x = 1.05;
    }

    // Smooth movement interpolation to target position
    if (this.targetX !== undefined && this.targetY !== undefined) {
      this.x += (this.targetX - this.x) * 0.12 * delta;
      this.y += (this.targetY - this.y) * 0.12 * delta;
    }
  }

  destroy(options) {
    if (this.pushTimeout) {
      clearTimeout(this.pushTimeout);
      this.pushTimeout = null;
    }
    super.destroy(options);
  }
}
