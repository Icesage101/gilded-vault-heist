// The Gilded Vault — bootstrap.
// Wires the canvas, the input and the engine together and runs the loop.
// With ?shot=<name> in the URL the game stages one fixed pose and renders a
// single frame, for screenshots; otherwise it plays live at 60 fps.

import { VIEW_W, VIEW_H } from './config.js';
import { createGame, updateGame } from './engine.js';
import { createInput, bindInput } from './input.js';
import { render } from './render.js';
import { stageShot, freezeCameras } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const game = createGame();
const input = createInput();
bindInput(input, canvas);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!game.frozen) updateGame(game, input, dt);
  render(ctx, game);
  if (!game.frozen) requestAnimationFrame(frame);
}

if (shotName) {
  freezeCameras(game.cameras);
  if (stageShot(game, shotName)) {
    render(ctx, game);
    document.title = `The Gilded Vault — ${shotName}`;
  } else {
    requestAnimationFrame(frame);
  }
} else {
  requestAnimationFrame(frame);
}

// Exposed for playtesting and debugging in the browser console.
window.__heist = { game, input };
