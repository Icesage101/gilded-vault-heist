// The Gilded Vault — tuning constants.
// One place for every number the game balances on, so a tweak never means
// hunting through the engine. All distances are in canvas pixels.

export const TILE = 48;
export const COLS = 24;
export const ROWS = 15;
export const VIEW_W = COLS * TILE; // 1152
export const VIEW_H = ROWS * TILE; // 720

// Thief movement.
export const THIEF_SPEED = 168; // px per second, walking
export const THIEF_SNEAK_SPEED = 96; // px per second, sneaking
export const THIEF_RADIUS = 14;

// Guards.
export const GUARD_SPEED = 62; // patrol walk
export const GUARD_CHASE_SPEED = 118; // investigating a sighting
export const GUARD_RADIUS = 15;
export const GUARD_VIEW_RANGE = 175; // px, how far a guard can see
export const GUARD_VIEW_HALF_ANGLE = 0.61; // radians, ~35 degrees each side
export const GUARD_LOOK_AROUND_SECONDS = 3.0;

// Cameras.
export const CAMERA_VIEW_RANGE = 185;
export const CAMERA_VIEW_HALF_ANGLE = 0.5;
export const CAMERA_SWEEP_SPEED = 0.45; // radians per second

// The alarm meter: 0 to 100. Fill while seen, drain while hidden.
export const ALARM_MAX = 100;
export const ALARM_GUARD_RATE = 55; // per second, inside a guard cone
export const ALARM_GUARD_CLOSE_RATE = 85; // per second, within 70 px of a guard
export const ALARM_CAMERA_RATE = 45; // per second, inside a camera cone
export const ALARM_DRAIN_RATE = 18; // per second, unseen
export const ALARM_SNEAK_FACTOR = 0.5; // sneaking halves how fast the meter fills
export const ALARM_WARN_AT = 70; // "SPOTTED!" warning starts here
export const ALARM_GRACE_SECONDS = 1.2; // time to break sight after the meter tops out

// Tools, and what each one costs from the final score.
export const TOOL_SMOKE_COST = 150;
export const TOOL_EMP_COST = 200;
export const TOOL_DECOY_COST = 50;
export const TOOL_CUTTER_COST = 120;
export const SMOKE_START_COUNT = 2;
export const EMP_START_COUNT = 2;
export const DECOY_START_COUNT = 3;
export const CUTTER_START_COUNT = 2;
export const SMOKE_RADIUS = 140;
export const SMOKE_SECONDS = 5;
export const EMP_SECONDS = 8;
export const DECOY_THROW_RANGE = 280;
export const CUTTER_RANGE = 95; // px: how close the thief must be to a beam

// Laser tripwires. Crossing a live beam while upright spikes the alarm and
// sends a guard to look; sneaking (Shift) crawls under it safely, and the
// glass cutter (key 4) kills a beam for good.
export const LASER_ALARM_SPIKE = 38;
export const LASER_COOLDOWN_SECONDS = 2.0;

// Guard suspicion and chase. Crossing 35 on the meter makes the nearest
// guard suspicious (it stops and stares); at 55 a guard that can see the
// thief gives chase, and a chasing guard that reaches the thief busts them.
export const ALARM_SUSPICION_AT = 35;
export const ALARM_CHASE_AT = 55;
export const GUARD_CHASE_LOSE_SECONDS = 2.5;
export const GUARD_CATCH_DISTANCE = 27;

// Combo scoring: loot lifted within the combo window of the previous lift
// pays its value times the combo count. A run that never lets the meter
// past 50 earns the ghost bonus at the getaway.
export const COMBO_WINDOW_SECONDS = 8;
export const GHOST_BONUS = 300;
export const GHOST_ALARM_CAP = 50;

// Loot values in dollars.
export const LOOT_VALUES = {
  star: 1000, // the Gilded Star, the job's target
  gold: 250, // gold bars
  ledger: 150, // the vault ledger
  emerald: 300, // the emerald tiara
  crown: 350, // the crown jewels, north-east gallery
  ruby: 275, // the ruby necklace, strongroom
};

// Time bonus at the getaway: 900 points, losing 6 a second.
export const TIME_BONUS_START = 900;
export const TIME_BONUS_PER_SECOND = 6;

// Colours.
export const COLORS = {
  floor: '#2b2620',
  floorAlt: '#2f2a23',
  wall: '#171310',
  wallTop: '#3a3128',
  caseGlass: '#4a6b7d',
  caseGold: '#c9a227',
  vaultWall: '#4d4a55',
  star: '#ffd94d',
  exit: '#2fae5f',
  thief: '#e8b23a',
  guard: '#c94f4f',
  camera: '#7fb3d5',
  coneGuard: 'rgba(220, 80, 80, 0.28)',
  coneCamera: 'rgba(120, 180, 230, 0.26)',
  coneBlind: 'rgba(140, 140, 140, 0.12)',
  alarmLow: '#e8b23a',
  alarmHigh: '#e5484d',
  smoke: 'rgba(200, 200, 200, 0.45)',
  laser: '#ff3b30',
  laserGlow: 'rgba(255, 59, 48, 0.55)',
  marbleLight: '#35302a',
  marbleDark: '#28231e',
  carpet: 'rgba(122, 32, 38, 0.5)',
  spotlight: 'rgba(255, 214, 120, 0.10)',
};
