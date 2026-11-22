// The Gilded Vault — laser tripwires.
// A tripwire is a thin red beam stretched across a passage the thief has to
// use. Walk through it upright and it trips: the alarm spikes and a guard
// comes to look. Sneak (Shift) and Wren crawls underneath it. The glass
// cutter (key 4) snips a beam dead for the rest of the job. Beams flicker
// faintly as they idle, and flash hard for a moment after a trip.

import { TILE, LASER_ALARM_SPIKE, LASER_COOLDOWN_SECONDS } from './config.js';
import { LASER_SPOTS, tileCenter } from './level.js';

export function createLasers() {
  return LASER_SPOTS.map((spot) => {
    const at = tileCenter(spot.col, spot.row);
    return {
      col: spot.col,
      row: spot.row,
      axis: spot.axis, // 'h': beam runs left-right; 'v': top-bottom
      x: at.x,
      y: at.y,
      disabled: false, // cut with the glass cutter
      flashTimer: 0, // >0 just after a trip: the beam burns bright
      flickerPhase: spot.col * 1.7 + spot.row * 2.3, // fixed, deterministic
    };
  });
}

// The beam's endpoints in pixels, for drawing and for the cutter's range.
export function beamEnds(beam) {
  const half = TILE / 2;
  if (beam.axis === 'h') {
    return { x1: beam.x - half, y1: beam.y, x2: beam.x + half, y2: beam.y };
  }
  return { x1: beam.x, y1: beam.y - half, x2: beam.x, y2: beam.y + half };
}

// Distance from a point to the beam's tile: beams are judged by tile, the
// same way loot is picked up, so what the player sees is what trips.
export function thiefOnBeam(beam, thief) {
  return (
    Math.floor(thief.x / TILE) === beam.col && Math.floor(thief.y / TILE) === beam.row
  );
}

// Tick every beam against the thief. Returns the beam that tripped this
// tick, or null. A trip needs the thief upright (sneaking crawls under)
// and the shared cooldown run out, so standing on a beam trips it once,
// not sixty times a second. The caller applies the consequences.
export function updateLasers(lasers, thief, state, dt) {
  if (state.cooldown > 0) state.cooldown -= dt;
  let tripped = null;
  for (const beam of lasers) {
    if (beam.flashTimer > 0) beam.flashTimer -= dt;
    if (beam.disabled || tripped) continue;
    if (state.cooldown > 0) continue;
    if (!thiefOnBeam(beam, thief)) continue;
    if (thief.sneaking) continue; // under the beam, clean
    beam.flashTimer = 0.9;
    state.cooldown = LASER_COOLDOWN_SECONDS;
    tripped = beam;
  }
  return tripped;
}

// What a trip costs on the meter, exported so the engine and the tests
// read the same number the tuning file promises.
export function laserSpike() {
  return LASER_ALARM_SPIKE;
}

// The nearest live beam within range of the thief, or null. The glass
// cutter reaches the closest one only, so a thief picks their moment.
export function nearestLiveBeam(lasers, thief, range) {
  let best = null;
  let bestDist = Infinity;
  for (const beam of lasers) {
    if (beam.disabled) continue;
    const dist = Math.hypot(beam.x - thief.x, beam.y - thief.y);
    if (dist < bestDist) {
      best = beam;
      bestDist = dist;
    }
  }
  return bestDist <= range ? best : null;
}
