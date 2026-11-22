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
  COMBO_WINDOW_SECONDS,
  GHOST_BONUS,
  GHOST_ALARM_CAP,
  ALARM_CHASE_AT,
  GUARD_CATCH_DISTANCE,
} from './config.js';
import { createThief, moveThief, moveThiefToward, useSmoke, useEmp, throwDecoy, useCutter, thiefTile } from './thief.js';
import { createGuards, updateGuards, guardSeesThief, sendGuardToInvestigate, startChase } from './guards.js';
import { createCameras, updateCameras } from './cameras.js';
import { createAlarm, updateAlarm, resetAlarm } from './alarm.js';
import { createLasers, updateLasers, laserSpike } from './lasers.js';
import { createParticles, spawnBurst, spawnPuff, updateParticles } from './particles.js';
import { STAR_TILE, EXIT_TILE, LOOT_SPOTS } from './level.js';
import {
  createSoundBank,
  playFootstep,
  playPickup,
  playAlarmBeep,
  playSmoke,
  playEmp,
  playDecoy,
  playLaser,
  playCut,
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
    lasers: createLasers(),
    laserState: { cooldown: 0 }, // shared trip cooldown, lives in lasers.js terms
    particles: createParticles(),
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
  game.hint = 'Stay out of the red cones. Red beams are lasers: sneak (Shift) under them, or cut them with [4].';
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function escapeVault(game) {
  const thief = game.thief;
  const timeBonus = Math.max(0, TIME_BONUS_START - Math.floor(game.time) * TIME_BONUS_PER_SECOND);
  // The ghost bonus: a run the room never really noticed pays extra.
  const ghost = game.alarm.peak <= GHOST_ALARM_CAP ? GHOST_BONUS : 0;
  const total = thief.score + timeBonus + ghost - thief.spentOnTools;
  game.breakdown = {
    loot: thief.score,
    timeBonus,
    ghost,
    bestCombo: thief.bestCombo,
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
      // Combo: a lift inside the window of the last one extends the
      // streak, and the piece pays its value times the streak length.
      thief.combo = thief.comboTimer > 0 ? thief.combo + 1 : 1;
      thief.comboTimer = COMBO_WINDOW_SECONDS;
      if (thief.combo > thief.bestCombo) thief.bestCombo = thief.combo;
      const value = LOOT_VALUES[item.kind] * thief.combo;
      thief.score += value;
      thief.lootTaken.push(item.kind);
      const at = { x: (item.col + 0.5) * TILE, y: (item.row + 0.5) * TILE };
      spawnBurst(game.particles, at.x, at.y, 'gold', 12, 100);
      const comboText = thief.combo > 1 ? ` COMBO x${thief.combo}!` : '';
      if (item.kind === 'star') {
        thief.hasStar = true;
        game.hint = `The Star is yours (+$${value})!${comboText} Now reach the green GETAWAY van — east side, bottom floor.`;
      } else {
        game.hint = `Picked up ${item.kind} (+$${value}).${comboText} The Star is still in the vault cage.`;
      }
      playPickup(game.sounds, thief.combo);
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
      spawnPuff(game.particles, thief.x, thief.y);
      game.hint = 'Smoke out — the cones are blind for five seconds. Move.';
    } else {
      game.hint = 'No smoke pellets left.';
    }
  }
  if (input.consume('cutter')) {
    const cut = useCutter(thief, game.lasers);
    if (cut) {
      playCut(game.sounds);
      spawnBurst(game.particles, cut.x, cut.y, 'glass', 9, 70);
      game.hint = 'Snip. That laser is dead for the rest of the job.';
    } else if (thief.tools.cutter <= 0) {
      game.hint = 'No cutter charges left.';
    } else {
      game.hint = 'No live laser in reach. Get closer to a beam to cut it.';
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

  // The combo streak dies if the thief dawdles between lifts.
  if (game.thief.comboTimer > 0) {
    game.thief.comboTimer -= dt;
    if (game.thief.comboTimer <= 0) game.thief.combo = 0;
  }

  updateGuards(game.guards, dt, game.thief);
  updateCameras(game.cameras, dt, game.time);
  updateParticles(game.particles, dt);

  // Laser tripwires: crossing a live beam upright spikes the meter and
  // brings a guard to look at the beam. Sneaking crawls underneath.
  const trippedBeam = updateLasers(game.lasers, game.thief, game.laserState, dt);
  if (trippedBeam) {
    game.alarm.value = Math.min(100, game.alarm.value + laserSpike());
    sendGuardToInvestigate(game.guards, trippedBeam.x, trippedBeam.y);
    spawnBurst(game.particles, trippedBeam.x, trippedBeam.y, 'red', 10, 85);
    playLaser(game.sounds);
    game.hint = 'Tripwire! The beam burned the alarm up. A guard is coming to look.';
  }

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

  // Chase: with the meter high, a guard with eyes on the thief stops
  // patrolling and runs them down. Hands on the thief ends the job.
  if (game.alarm.value >= ALARM_CHASE_AT) {
    for (const guard of game.guards) {
      if (guard.state !== 'chase' && guardSeesThief(guard, game.thief)) {
        startChase(guard, game.thief);
        game.hint = 'A guard is chasing you! Break line of sight and let the trail go cold.';
      }
    }
  }
  for (const guard of game.guards) {
    if (
      guard.state === 'chase' &&
      Math.hypot(guard.x - game.thief.x, guard.y - game.thief.y) < GUARD_CATCH_DISTANCE
    ) {
      bustThief(game);
      game.hint = 'Caught by a guard. Press R to case the joint again.';
      return;
    }
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
