// The Gilded Vault — the alarm meter.
// The meter is the game's tension: it fills while any guard or camera can see
// the thief and drains while they stay hidden. At 70 the room knows something
// is wrong and the nearest guard comes to look. At 100 the alarm trips, but
// the bust is fair: the thief gets a short grace to break line of sight, and
// only a thief still seen when the grace runs out gets caught.

import {
  ALARM_MAX,
  ALARM_GUARD_RATE,
  ALARM_GUARD_CLOSE_RATE,
  ALARM_CAMERA_RATE,
  ALARM_DRAIN_RATE,
  ALARM_SNEAK_FACTOR,
  ALARM_WARN_AT,
  ALARM_GRACE_SECONDS,
} from './config.js';
import { guardSeesThief, sendGuardToInvestigate } from './guards.js';
import { cameraSeesThief } from './cameras.js';

export function createAlarm() {
  return {
    value: 0,
    warned: false, // the guard has been sent to investigate once
    tripped: false, // the meter topped out; grace is running
    graceTimer: 0,
  };
}

// Returns 'seen' | 'hidden' | 'busted'.
export function updateAlarm(alarm, guards, cameras, thief, dt) {
  let seenByGuard = false;
  let seenByCamera = false;
  let closeGuard = false;
  for (const guard of guards) {
    if (guardSeesThief(guard, thief)) {
      seenByGuard = true;
      if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < 70) closeGuard = true;
    }
  }
  for (const camera of cameras) {
    if (cameraSeesThief(camera, thief)) seenByCamera = true;
  }
  const seen = seenByGuard || seenByCamera;

  if (seen) {
    let rate = seenByGuard ? (closeGuard ? ALARM_GUARD_CLOSE_RATE : ALARM_GUARD_RATE) : 0;
    if (seenByCamera) rate = Math.max(rate, ALARM_CAMERA_RATE);
    if (thief.sneaking) rate *= ALARM_SNEAK_FACTOR;
    alarm.value = Math.min(ALARM_MAX, alarm.value + rate * dt);
  } else if (!alarm.tripped) {
    alarm.value = Math.max(0, alarm.value - ALARM_DRAIN_RATE * dt);
  }

  // The warning: once the meter crosses 70, a guard comes to look.
  if (alarm.value >= ALARM_WARN_AT && !alarm.warned) {
    alarm.warned = true;
    sendGuardToInvestigate(guards, thief.x, thief.y);
  }
  if (alarm.value < ALARM_WARN_AT - 15) alarm.warned = false;

  if (alarm.value >= ALARM_MAX && !alarm.tripped) {
    alarm.tripped = true;
    alarm.graceTimer = ALARM_GRACE_SECONDS;
  }

  if (alarm.tripped) {
    if (!seen) {
      // Broke sight in time: the alarm stands down, badly rattled.
      alarm.tripped = false;
      alarm.value = 60;
      alarm.warned = true;
      return 'hidden';
    }
    alarm.graceTimer -= dt;
    if (alarm.graceTimer <= 0) return 'busted';
  }
  return seen ? 'seen' : 'hidden';
}

export function resetAlarm(alarm) {
  alarm.value = 0;
  alarm.warned = false;
  alarm.tripped = false;
  alarm.graceTimer = 0;
}
