// The Gilded Vault — security cameras.
// A camera sits on its mount and sweeps its cone back and forth across the
// floor it watches. An EMP burst takes a camera offline for a while; smoke
// blinds it like it blinds a guard. A camera never moves, so its cone is a
// rhythm to learn: cross while it sweeps away.

import { CAMERA_VIEW_RANGE, CAMERA_VIEW_HALF_ANGLE, CAMERA_SWEEP_SPEED } from './config.js';
import { CAMERA_SPOTS, tileCenter } from './level.js';
import { hasLineOfSight } from './guards.js';

export function createCameras() {
  return CAMERA_SPOTS.map((spot) => {
    const at = tileCenter(spot.col, spot.row);
    return {
      x: at.x,
      y: at.y,
      facing: spot.facing,
      restFacing: spot.facing,
      sweep: spot.sweep,
      sweepPhase: Math.random() * Math.PI * 2,
      offlineTimer: 0, // EMP: the camera is dark
      blindTimer: 0, // smoke: the lens sees nothing
    };
  });
}

export function updateCameras(cameras, dt, time) {
  for (const camera of cameras) {
    if (camera.offlineTimer > 0) camera.offlineTimer -= dt;
    if (camera.blindTimer > 0) camera.blindTimer -= dt;
    // Sweep smoothly: a sine around the rest direction.
    camera.facing =
      camera.restFacing + Math.sin(time * CAMERA_SWEEP_SPEED + camera.sweepPhase) * camera.sweep;
  }
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when the thief stands inside this camera's cone with a clear view.
export function cameraSeesThief(camera, thief) {
  if (camera.offlineTimer > 0 || camera.blindTimer > 0) return false;
  const dx = thief.x - camera.x;
  const dy = thief.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CAMERA_VIEW_RANGE) return false;
  if (dist < 24) return hasLineOfSight(camera.x, camera.y, thief.x, thief.y);
  const angleToThief = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleToThief, camera.facing)) > CAMERA_VIEW_HALF_ANGLE) return false;
  return hasLineOfSight(camera.x, camera.y, thief.x, thief.y);
}

export function anyCameraSeesThief(cameras, thief) {
  return cameras.some((camera) => cameraSeesThief(camera, thief));
}
