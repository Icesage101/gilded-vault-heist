// The Gilded Vault — the thief.
// Wren, the thief, moves with the keys or a click, sneaks with Shift, and
// carries four tools, each bought with score: smoke to blind a cone, an EMP
// burst to kill the cameras, a decoy coin to pull a guard away, and a glass
// cutter to snip a laser tripwire dead. Loot is picked up by walking over
// it; the Star is the job, the rest is bonus. Loot lifted in quick
// succession builds a combo that multiplies what each piece pays.

import {
  THIEF_SPEED,
  THIEF_SNEAK_SPEED,
  THIEF_RADIUS,
  SMOKE_START_COUNT,
  EMP_START_COUNT,
  DECOY_START_COUNT,
  CUTTER_START_COUNT,
  SMOKE_RADIUS,
  SMOKE_SECONDS,
  EMP_SECONDS,
  DECOY_THROW_RANGE,
  CUTTER_RANGE,
  TOOL_SMOKE_COST,
  TOOL_EMP_COST,
  TOOL_DECOY_COST,
  TOOL_CUTTER_COST,
  TILE,
} from './config.js';
import { isSolidTile, tileCenter, SPAWN_TILE } from './level.js';
import { nearestLiveBeam } from './lasers.js';

export function createThief() {
  const spawn = tileCenter(SPAWN_TILE.col, SPAWN_TILE.row);
  return {
    x: spawn.x,
    y: spawn.y,
    radius: THIEF_RADIUS,
    facing: 0,
    moving: false,
    sneaking: false,
    // click-to-move target; null when steering with the keys
    moveTarget: null,
    tools: {
      smoke: SMOKE_START_COUNT,
      emp: EMP_START_COUNT,
      decoy: DECOY_START_COUNT,
      cutter: CUTTER_START_COUNT,
    },
    lootTaken: [], // kinds taken, in order
    hasStar: false,
    score: 0,
    spentOnTools: 0,
    combo: 0, // current loot streak (0 = no streak running)
    comboTimer: 0, // seconds left to keep the streak alive
    bestCombo: 0, // the longest streak of the run, for the getaway screen
  };
}

// Circle-vs-tile collision: try the full step, then each axis alone, so the
// thief slides along walls instead of sticking to them.
function canStand(x, y, radius) {
  const left = Math.floor((x - radius) / TILE);
  const right = Math.floor((x + radius) / TILE);
  const top = Math.floor((y - radius) / TILE);
  const bottom = Math.floor((y + radius) / TILE);
  for (let row = top; row <= bottom; row++) {
    for (let col = left; col <= right; col++) {
      if (isSolidTile(col, row)) return false;
    }
  }
  return true;
}

export function moveThief(thief, dx, dy, dt) {
  if (dx === 0 && dy === 0) {
    thief.moving = false;
    return;
  }
  const len = Math.hypot(dx, dy);
  const speed = thief.sneaking ? THIEF_SNEAK_SPEED : THIEF_SPEED;
  const stepX = (dx / len) * speed * dt;
  const stepY = (dy / len) * speed * dt;
  thief.facing = Math.atan2(dy, dx);
  thief.moving = true;
  if (canStand(thief.x + stepX, thief.y, thief.radius)) thief.x += stepX;
  if (canStand(thief.x, thief.y + stepY, thief.radius)) thief.y += stepY;
}

// Steer toward a clicked floor point; returns true while still travelling.
export function moveThiefToward(thief, target, dt) {
  const dx = target.x - thief.x;
  const dy = target.y - thief.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 6) {
    thief.moving = false;
    return false;
  }
  moveThief(thief, dx, dy, dt);
  return true;
}

export function thiefTile(thief) {
  return { col: Math.floor(thief.x / TILE), row: Math.floor(thief.y / TILE) };
}

// --- Tools. Each one spends score and returns true when it fired. ---

export function useSmoke(thief, smokes) {
  if (thief.tools.smoke <= 0) return false;
  thief.tools.smoke -= 1;
  thief.spentOnTools += TOOL_SMOKE_COST;
  smokes.push({ x: thief.x, y: thief.y, radius: SMOKE_RADIUS, timer: SMOKE_SECONDS });
  return true;
}

export function useEmp(thief, cameras) {
  if (thief.tools.emp <= 0) return false;
  thief.tools.emp -= 1;
  thief.spentOnTools += TOOL_EMP_COST;
  for (const camera of cameras) camera.offlineTimer = EMP_SECONDS;
  return true;
}

// Throw a decoy coin at a floor point: the nearest guard walks over to look.
// Returns the coin, or null when it cannot be thrown.
export function throwDecoy(thief, x, y) {
  if (thief.tools.decoy <= 0) return null;
  if (Math.hypot(x - thief.x, y - thief.y) > DECOY_THROW_RANGE) return null;
  const col = Math.floor(x / TILE);
  const row = Math.floor(y / TILE);
  if (isSolidTile(col, row)) return null;
  thief.tools.decoy -= 1;
  thief.spentOnTools += TOOL_DECOY_COST;
  return { x, y, timer: 6 };
}

// Snip the nearest live laser beam with the glass cutter. The beam dies
// for the rest of the job; returns the beam that was cut, or null when no
// charge is left or no live beam is in reach.
export function useCutter(thief, lasers) {
  if (thief.tools.cutter <= 0) return null;
  const beam = nearestLiveBeam(lasers, thief, CUTTER_RANGE);
  if (!beam) return null;
  thief.tools.cutter -= 1;
  thief.spentOnTools += TOOL_CUTTER_COST;
  beam.disabled = true;
  beam.flashTimer = 0;
  return beam;
}
