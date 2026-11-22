// The Gilded Vault — the game engine.
// Owns the game state and the loop: title, playing, paused, busted, escaped.
// Each tick moves the thief, the guards and the cameras, ticks the alarm, and
// checks pickups and the getaway. The score is loot, plus a time bonus for a
// fast job, minus whatever the tools cost.

import {
  VIEW_W,
  VIEW_H,
  TILE,
  LOOT_VALUES,
  TIME_BONUS_START,
  TIME_BONUS_PER_SECOND,
} from './config.js';
import { createThief, moveThief, moveThiefToward, useSmoke, useEmp, throwDecoy, thiefTile } from './thief.js';
import { createGuards, updateGuards } from './guards.js';
import { createCameras, updateCameras } from './cameras.js';
import { createAlarm, updateAlarm, resetAlarm } from './alarm.js';
import { STAR_TILE, EXIT_TILE, LOOT_SPOTS } from './level.js';
import {
  createSoundBank,
  playFootstep,
  playPickup,
  playAlarmBeep,
  playSmoke,
  playEmp,
  playDecoy,
  playBusted,
  playGetaway,
  toggleMute,
} from './audio.js';

export function createGame() {
  return {
    state: 'title', // title | playing | paused | busted | escaped
    time: 0, // seconds spent on the job
    thief: createThief(),
    guards: createGuards(),
    cameras: createCameras(),
    alarm: createAlarm(),
    loot: [
      { col: STAR_TILE.col, row: STAR_TILE.row, kind: 'star', taken: false },
      ...LOOT_SPOTS.map((spot) => ({ col: spot.col, row: spot.row, kind: spot.kind, taken: false })),
    ],
    smokes: [],
    decoy: null,
    sounds: createSoundBank(),
    hint: 'WASD or click to move. Lift the Gilded Star, then reach the green GETAWAY van.',
    breakdown: null,
    alarmBeepTimer: 0,
    stepTimer: 0,
  };
}

export function startHeist(game) {
  const fresh = createGame();
  Object.assign(game, fresh, { state: 'playing' });
  game.hint = 'Stay out of the red cones. Blue cones are cameras — watch them sweep.';
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function escapeVault(game) {
  const thief = game.thief;
  const timeBonus = Math.max(0, TIME_BONUS_START - Math.floor(game.time) * TIME_BONUS_PER_SECOND);
  const total = thief.score + timeBonus - thief.spentOnTools;
  game.breakdown = {
    loot: thief.score,
    timeBonus,
    tools: thief.spentOnTools,
    total,
    timeText: formatTime(game.time),
  };
  game.state = 'escaped';
  game.hint = 'Clean getaway. Press R to run it again.';
  playGetaway(game.sounds);
}

function bustThief(game) {
  game.state = 'busted';
  game.hint = 'Busted. Press R to case the joint again.';
  playBusted(game.sounds);
}

function checkPickups(game) {
  const thief = game.thief;
  const tile = thiefTile(thief);
  for (const item of game.loot) {
    if (item.taken) continue;
    if (item.col === tile.col && item.row === tile.row) {
      item.taken = true;
      const value = LOOT_VALUES[item.kind];
      thief.score += value;
      thief.lootTaken.push(item.kind);
      if (item.kind === 'star') {
        thief.hasStar = true;
        game.hint = 'The Star is yours! Now reach the green GETAWAY van — east side, bottom floor.';
      } else {
        game.hint = `Picked up ${item.kind} (+$${value}). The Star is still in the vault cage.`;
      }
      playPickup(game.sounds);
    }
  }
  // The getaway only opens once the Star is lifted.
  if (tile.col === EXIT_TILE.col && tile.row === EXIT_TILE.row) {
    if (thief.hasStar) {
      escapeVault(game);
    } else {
      game.hint = 'The van will not leave without the Gilded Star. Go back for it.';
    }
  }
}

function applyInput(game, input, dt) {
  const thief = game.thief;
  thief.sneaking = input.sneak;
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx !== 0 || dy !== 0) {
    thief.moveTarget = null;
    moveThief(thief, dx, dy, dt);
  } else if (thief.moveTarget) {
    if (!moveThiefToward(thief, thief.moveTarget, dt)) thief.moveTarget = null;
  }
  if (thief.moving) {
    game.stepTimer -= dt;
    if (game.stepTimer <= 0) {
      playFootstep(game.sounds);
      game.stepTimer = thief.sneaking ? 0.55 : 0.34;
    }
  }
}

function applyTools(game, input) {
  const thief = game.thief;
  if (input.consume('smoke')) {
    if (useSmoke(thief, game.smokes)) {
      playSmoke(game.sounds);
      game.hint = 'Smoke out — the cones are blind for five seconds. Move.';
    } else {
      game.hint = 'No smoke pellets left.';
    }
  }
  if (input.consume('emp')) {
    if (useEmp(thief, game.cameras)) {
      playEmp(game.sounds);
      game.hint = 'EMP burst — every camera is dark for eight seconds.';
    } else {
      game.hint = 'No EMP charges left.';
    }
  }
  if (input.consume('decoy')) {
    game.hint = 'Click a floor spot to throw the decoy coin.';
    game.awaitingDecoy = true;
  }
}

export function updateGame(game, input, dt) {
  if (game.state === 'title') {
    if (input.consume('start')) startHeist(game);
    return;
  }
  if (game.state === 'paused') {
    if (input.consume('pause')) game.state = 'playing';
    return;
  }
  if (game.state === 'busted' || game.state === 'escaped') {
    if (input.consume('restart')) startHeist(game);
    return;
  }
  // Playing. Drop any stale one-shot presses (an R tapped while playing
  // must not fire later, the moment the game ends).
  input.consume('restart');
  input.consume('start');
  if (input.consume('pause')) {
    game.state = 'paused';
    return;
  }
  if (input.consume('mute')) {
    const muted = toggleMute(game.sounds);
    game.hint = muted ? 'Sound off.' : 'Sound on.';
  }

  game.time += dt;
  applyInput(game, input, dt);
  applyTools(game, input);

  if (input.consume('click')) {
    const point = input.clickPoint;
    if (game.awaitingDecoy) {
      game.awaitingDecoy = false;
      const coin = throwDecoy(game.thief, point.x, point.y);
      if (coin) {
        game.decoy = coin;
        playDecoy(game.sounds);
        // The nearest guard walks over to look at the coin.
        let nearest = null;
        let nearestDist = Infinity;
        for (const guard of game.guards) {
          const dist = Math.hypot(guard.x - coin.x, guard.y - coin.y);
          if (dist < nearestDist) {
            nearest = guard;
            nearestDist = dist;
          }
        }
        if (nearest) {
          nearest.state = 'investigate';
          nearest.investigateTarget = { x: coin.x, y: coin.y };
        }
        game.hint = 'Coin thrown — a guard is going to check it out.';
      } else {
        game.hint = 'No decoy coins left, or that spot is out of throwing range.';
      }
    } else {
      game.thief.moveTarget = { x: point.x, y: point.y };
    }
  }

  updateGuards(game.guards, dt);
  updateCameras(game.cameras, dt, game.time);

  // Smoke blinds whatever it covers, for as long as it lasts.
  for (const smoke of game.smokes) {
    for (const guard of game.guards) {
      if (Math.hypot(guard.x - smoke.x, guard.y - smoke.y) < smoke.radius) guard.blindTimer = 0.1;
    }
    for (const camera of game.cameras) {
      if (Math.hypot(camera.x - smoke.x, camera.y - smoke.y) < smoke.radius) camera.blindTimer = 0.1;
    }
  }
  game.smokes = game.smokes.filter((smoke) => (smoke.timer -= dt) > 0);
  if (game.decoy) {
    game.decoy.timer -= dt;
    if (game.decoy.timer <= 0) game.decoy = null;
  }

  const alarmResult = updateAlarm(game.alarm, game.guards, game.cameras, game.thief, dt);
  if (alarmResult === 'busted') {
    bustThief(game);
    return;
  }
  if (game.alarm.value >= 70) {
    game.alarmBeepTimer -= dt;
    if (game.alarmBeepTimer <= 0) {
      playAlarmBeep(game.sounds);
      game.alarmBeepTimer = game.alarm.tripped ? 0.3 : 0.9;
    }
  }
  checkPickups(game);
}

export function resetForShot(game) {
  resetAlarm(game.alarm);
}
