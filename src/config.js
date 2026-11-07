/**
 * BallWar - Configuration & Constants
 * Target Resolution: 1080 x 1920 (9:16 Vertical / Mobile / OBS Live Stream)
 */

export const CONFIG = {
  // Screen Dimensions (Fixed 9:16 vertical stream resolution)
  STAGE_WIDTH: 1080,
  STAGE_HEIGHT: 1920,

  // Arena Layout Zones (Y coordinates)
  RED_ZONE: {
    NAME: 'KIRMIZI',
    COLOR: 0xFF0055,
    COLOR_HEX: '#FF0055',
    COLOR_GLOW: 0xFF3377,
    TOP: 0,
    BOTTOM: 384, // Top 20%
    HEIGHT: 384,
    SPAWN_Y_RANGE: [80, 320],
    STATION_Y: 340, // Match line Y
    DIRECTION: 1,   // Pushes DOWN (towards positive Y)
  },

  CORRIDOR: {
    TOP: 384,
    BOTTOM: 1536, // Middle 60%
    HEIGHT: 1152,
    CENTER_Y: 960, // Exactly 50%
    COLOR_BG: 0x0D0B18,
    GRID_COLOR: 0x241E38,
  },

  BLUE_ZONE: {
    NAME: 'MAVİ',
    COLOR: 0x00E5FF,
    COLOR_HEX: '#00E5FF',
    COLOR_GLOW: 0x33EEFF,
    TOP: 1536,
    BOTTOM: 1920, // Bottom 20%
    HEIGHT: 384,
    SPAWN_Y_RANGE: [1600, 1840],
    STATION_Y: 1580, // Match line Y
    DIRECTION: -1,   // Pushes UP (towards negative Y)
  },

  // Game States
  STATES: {
    LOBBY: 'LOBBY',
    ROSTER_SHOWCASE: 'ROSTER_SHOWCASE',
    MATCH: 'MATCH',
    VICTORY_PODIUM: 'VICTORY_PODIUM',
    LEADERBOARD: 'LEADERBOARD',
  },

  // State Durations in Seconds
  DURATIONS: {
    LOBBY: 30,
    ROSTER_SHOWCASE: 10,
    MATCH: 60,
    VICTORY_PODIUM: 15,
    LEADERBOARD: 10,
  },

  // Physics & Tug-of-War Tuning
  PHYSICS: {
    // Screen height is 1920px. 5% screen distance per second terminal velocity:
    // 1920 * 0.05 = 96px/s. At 60 FPS that is 1.6 px/frame.
    MAX_SPEED_PER_SEC: 96,
    DAMPING: 0.94, // Velocity friction per tick

    // Impulses in screen percentage (1920 * percent)
    // 0.15% = 2.88px impulse
    COMMENT_IMPULSE_PERCENT: 0.0015,
    LIKE_IMPULSE_PERCENT: 0.0015,

    // Gift impulse range: 1.5% to 3.5% (28.8px to 67.2px impulse)
    GIFT_MIN_IMPULSE_PERCENT: 0.015,
    GIFT_MAX_IMPULSE_PERCENT: 0.035,

    // Win Boundaries
    RED_GOAL_Y: 384,   // If ball reaches here, Blue wins
    BLUE_GOAL_Y: 1536, // If ball reaches here, Red wins
  },

  // Team Balancing Rules
  BALANCE: {
    MIN_PLAYERS_FOR_PERCENT_RULE: 10,
    MAX_PERCENT_DIFF: 0.10, // 10% rule
  },

  // TikTok Joining Commands
  COMMANDS: {
    RED: ['kirmizi', 'kırmızı', 'red', 'al'],
    BLUE: ['mavi', 'blue', 'gok', 'gök'],
  },

  // Ball Appearance
  BALL: {
    BASE_RADIUS: 65,
    CORE_COLOR_NEUTRAL: 0xE2E8F0,
    CORE_COLOR_RED: 0xFF0055,
    CORE_COLOR_BLUE: 0x00E5FF,
    GLOW_RADIUS: 110,
  },

  // Visual Palette
  PALETTE: {
    BG_DARK: 0x0A0814,
    PANEL_BG: 0x141026,
    BORDER_GLOW: 0x7928CA,
    ACCENT_GOLD: 0xFFD700,
    TEXT_WHITE: 0xFFFFFF,
    TEXT_MUTED: 0x94A3B8,
  }
};
