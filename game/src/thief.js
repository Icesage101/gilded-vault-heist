// The Gilded Vault — the thief.
// Wren, the thief, moves with the keys or a click, sneaks with Shift, and
// carries three tools, each bought with score: smoke to blind a cone, an EMP
// burst to kill the cameras, and a decoy coin to pull a guard away. Loot is
// picked up by walking over it; the Star is the job, the rest is bonus.

import {
  THIEF_SPEED,
  THIEF_SNEAK_SPEED,
  THIEF_RADIUS,
  SMOKE_START_COUNT,
  EMP_START_COUNT,
  DECOY_START_COUNT,
  SMOKE_RADIUS,
  SMOKE_SECONDS,
  EMP_SECONDS,
  DECOY_THROW_RANGE,
  TOOL_SMOKE_COST,
  TOOL_EMP_COST,
  TOOL_DECOY_COST,
  TILE,
} from './config.js';
import { isSolidTile, tileCenter, SPAWN_TILE } from './level.js';

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
    },
    lootTaken: [], // kinds taken, in order
    hasStar: false,
    score: 0,
    spentOnTools: 0,
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
