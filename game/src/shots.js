// The Gilded Vault — staged states for screenshots.
// ?shot=start | play | alarm | win sets the game up in a fixed, deterministic
// pose and freezes it, so a screenshot shows the real game at its best: the
// title over the room, a mid-heist crossing, the alarm nearly tripping, and
// the getaway. Every pose is built through the game's own state, never drawn
// by hand, and the page is a real render of the game's own code.

import { TILE } from './config.js';
import { tileCenter } from './level.js';

function placeAt(game, col, row) {
  const at = tileCenter(col, row);
  game.thief.x = at.x;
  game.thief.y = at.y;
}

function faceThiefAt(game, col, row) {
  const at = tileCenter(col, row);
  game.thief.facing = Math.atan2(at.y - game.thief.y, at.x - game.thief.x);
}

// The title screen, the room behind it, thief at the spawn.
function stageStart(game) {
  game.state = 'title';
  game.time = 0;
}

// Mid-heist: the thief is crossing the middle band with the Star in sight,
// one guard's cone sweeping close by, a camera watching the cage approach,
// one piece of side loot already lifted, the alarm a third full.
function stagePlay(game) {
  game.state = 'playing';
  game.time = 47;
  placeAt(game, 9, 9);
  faceThiefAt(game, 12, 9);
  game.thief.score = 250;
  game.thief.lootTaken = ['gold'];
  game.loot.find((item) => item.kind === 'gold').taken = true;
  game.alarm.value = 34;
  const guard = game.guards[0];
  const guardAt = tileCenter(13, 3);
  guard.x = guardAt.x;
  guard.y = guardAt.y;
  guard.facing = Math.PI * 0.5;
  guard.state = 'patrol';
  const guard2 = game.guards[1];
  const guard2At = tileCenter(4, 8);
  guard2.x = guard2At.x;
  guard2.y = guard2At.y;
  guard2.facing = Math.PI;
  guard2.state = 'patrol';
  const camera = game.cameras[1];
  camera.facing = Math.PI * 0.85;
  game.hint = 'Stay out of the red cones. Blue cones are cameras — watch them sweep.';
}

// The alarm nearly tripping: the thief is caught inside a guard's cone, the
// meter at 82, the warning up, a smoke pellet just spent.
function stageAlarm(game) {
  game.state = 'playing';
  game.time = 96;
  placeAt(game, 13, 9);
  faceThiefAt(game, 15, 9);
  game.thief.score = 400;
  game.thief.lootTaken = ['gold', 'ledger'];
  game.loot.find((item) => item.kind === 'gold').taken = true;
  game.loot.find((item) => item.kind === 'ledger').taken = true;
  game.thief.tools.smoke = 1;
  game.thief.spentOnTools = 150;
  game.alarm.value = 82;
  game.alarm.warned = true;
  // The vault guard stands two tiles east, facing the thief down the open
  // cage row: the thief is genuinely inside its cone with a clear view.
  const guard = game.guards[1];
  const guardAt = tileCenter(15, 9);
  guard.x = guardAt.x;
  guard.y = guardAt.y;
  guard.facing = Math.PI;
  guard.state = 'investigate';
  guard.investigateTarget = { x: game.thief.x, y: game.thief.y };
  game.smokes.push({ x: game.thief.x - 90, y: game.thief.y, radius: 90, timer: 3.5 });
  game.hint = 'SPOTTED! Break line of sight before the meter tops out.';
}

// The getaway: the Star lifted, the thief at the van, score broken down.
function stageWin(game) {
  game.state = 'escaped';
  game.time = 142;
  placeAt(game, 22, 13);
  game.thief.hasStar = true;
  game.thief.score = 1450;
  game.thief.lootTaken = ['gold', 'ledger', 'star'];
  game.thief.spentOnTools = 150;
  for (const item of game.loot) {
    if (['gold', 'ledger', 'star'].includes(item.kind)) item.taken = true;
  }
  game.breakdown = {
    loot: 1450,
    timeBonus: 48,
    tools: 150,
    total: 1348,
    timeText: '02:22',
  };
  game.hint = 'Clean getaway. Press R to run it again.';
}

export function stageShot(game, name) {
  const stages = { start: stageStart, play: stagePlay, alarm: stageAlarm, win: stageWin };
  const stage = stages[name];
  if (!stage) return false;
  stage(game);
  game.frozen = true; // the loop renders one frame and stops ticking
  return true;
}

// Keep the camera sweep phase fixed for a shot, so the cone sits the same
// way every time the shot is taken.
export function freezeCameras(cameras) {
  for (const camera of cameras) camera.sweepPhase = 0;
}

export { TILE };
