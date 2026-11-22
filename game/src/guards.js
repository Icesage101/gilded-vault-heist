// The Gilded Vault — patrolling guards and their vision cones.
// A guard walks its waypoints, pauses to look around at each one, and turns
// its cone toward whatever it is watching. When the alarm is high the nearest
// guard leaves its patrol to investigate the last place the thief was seen.

import {
  GUARD_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_LOOK_AROUND_SECONDS,
  TILE,
} from './config.js';
import { GUARD_PATROLS, blocksSight, tileCenter } from './level.js';

export function createGuards() {
  return GUARD_PATROLS.map((patrol) => {
    const start = tileCenter(patrol.waypoints[0].col, patrol.waypoints[0].row);
    return {
      name: patrol.name,
      waypoints: patrol.waypoints.map((w) => tileCenter(w.col, w.row)),
      x: start.x,
      y: start.y,
      waypointIndex: 1,
      patrolDirection: 1,
      facing: 0,
      pauseTimer: 0,
      state: 'patrol', // patrol | investigate | look
      investigateTarget: null,
      lookTimer: 0,
      blindTimer: 0, // smoke: the guard cannot see at all
      speed: GUARD_SPEED,
    };
  });
}

function moveToward(guard, target, speed, dt) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = Math.atan2(dy, dx);
  return dist - step < 2;
}

// True when nothing solid stands between the two points. Sampled along the
// segment, one sample per quarter tile, which is fine for cones this short.
export function hasLineOfSight(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const col = Math.floor((x1 + (x2 - x1) * t) / TILE);
    const row = Math.floor((y1 + (y2 - y1) * t) / TILE);
    if (blocksSight(col, row)) return false;
  }
  return true;
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the thief stands inside this guard's cone and the guard can see
// them: in range, inside the cone angle, and with a clear line of sight.
export function guardSeesThief(guard, thief) {
  if (guard.blindTimer > 0) return false;
  const dx = thief.x - guard.x;
  const dy = thief.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return false;
  if (dist < 26) return hasLineOfSight(guard.x, guard.y, thief.x, thief.y);
  const angleToThief = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleToThief, guard.facing)) > GUARD_VIEW_HALF_ANGLE) return false;
  return hasLineOfSight(guard.x, guard.y, thief.x, thief.y);
}

export function sendGuardToInvestigate(guards, x, y) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const guard of guards) {
    if (guard.state === 'investigate') continue;
    const dist = Math.hypot(guard.x - x, guard.y - y);
    if (dist < nearestDist) {
      nearest = guard;
      nearestDist = dist;
    }
  }
  if (nearest) {
    nearest.state = 'investigate';
    nearest.investigateTarget = { x, y };
  }
}

export function updateGuards(guards, dt) {
  for (const guard of guards) {
    if (guard.blindTimer > 0) guard.blindTimer -= dt;

    if (guard.state === 'investigate' && guard.investigateTarget) {
      const arrived = moveToward(guard, guard.investigateTarget, GUARD_CHASE_SPEED, dt);
      if (arrived) {
        guard.state = 'look';
        guard.lookTimer = GUARD_LOOK_AROUND_SECONDS;
      }
      continue;
    }

    if (guard.state === 'look') {
      guard.lookTimer -= dt;
      guard.facing += dt * 1.6; // slowly scans the room while looking
      if (guard.lookTimer <= 0) {
        guard.state = 'patrol';
        guard.investigateTarget = null;
      }
      continue;
    }

    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      guard.facing += dt * 0.9; // glance around at the waypoint
      continue;
    }

    const target = guard.waypoints[guard.waypointIndex];
    const arrived = moveToward(guard, target, guard.speed, dt);
    if (arrived) {
      guard.pauseTimer = 0.9;
      guard.waypointIndex += guard.patrolDirection;
      if (guard.waypointIndex >= guard.waypoints.length || guard.waypointIndex < 0) {
        guard.patrolDirection *= -1;
        guard.waypointIndex += guard.patrolDirection * 2;
      }
    }
  }
}
