// The Gilded Vault — canvas rendering.
// Everything the player sees is drawn here: the vault floor, the cones, the
// people, the loot, the HUD and the screens. The game draws in one frame on
// purpose: the room, the thief, the guards and their cones, the cameras, the
// loot target and the alarm meter are all visible at a glance.

import {
  TILE,
  COLS,
  ROWS,
  VIEW_W,
  VIEW_H,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  CAMERA_VIEW_RANGE,
  CAMERA_VIEW_HALF_ANGLE,
  ALARM_MAX,
  ALARM_WARN_AT,
  COLORS,
} from './config.js';
import { TILEMAP, tileAt, tileCenter, EXIT_TILE, STAR_TILE, LOOT_SPOTS } from './level.js';

function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tile = TILEMAP[row][col];
      if (tile === '#') continue;
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
      ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
    }
  }
  // Faint carpet runner down the middle band, for orientation.
  ctx.fillStyle = 'rgba(120, 40, 40, 0.18)';
  ctx.fillRect(0, 7 * TILE, VIEW_W, 4 * TILE);
}

function drawWalls(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(col, row) !== '#') continue;
      const x = col * TILE;
      const y = row * TILE;
      const isVault = row >= 8 && row <= 10 && col >= 10 && col <= 14;
      ctx.fillStyle = isVault ? COLORS.vaultWall : COLORS.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y + 5, TILE, 2);
    }
  }
}

function drawCases(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(col, row) !== 'C') continue;
      const x = col * TILE + 7;
      const y = row * TILE + 7;
      ctx.fillStyle = '#1c2226';
      ctx.fillRect(x, y, TILE - 14, TILE - 14);
      ctx.fillStyle = COLORS.caseGlass;
      ctx.fillRect(x + 3, y + 3, TILE - 20, TILE - 20);
      ctx.strokeStyle = COLORS.caseGold;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, TILE - 14, TILE - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 6, y + 4, 4, TILE - 24);
    }
  }
}

function drawCone(ctx, x, y, facing, halfAngle, range, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCones(ctx, guards, cameras) {
  for (const guard of guards) {
    drawCone(
      ctx,
      guard.x,
      guard.y,
      guard.facing,
      GUARD_VIEW_HALF_ANGLE,
      GUARD_VIEW_RANGE,
      guard.blindTimer > 0 ? COLORS.coneBlind : COLORS.coneGuard,
    );
  }
  for (const camera of cameras) {
    const offline = camera.offlineTimer > 0 || camera.blindTimer > 0;
    drawCone(
      ctx,
      camera.x,
      camera.y,
      camera.facing,
      CAMERA_VIEW_HALF_ANGLE,
      CAMERA_VIEW_RANGE,
      offline ? COLORS.coneBlind : COLORS.coneCamera,
    );
  }
}

function drawLoot(ctx, loot, time) {
  const pulse = 1 + Math.sin(time * 3) * 0.08;
  for (const item of loot) {
    if (item.taken) continue;
    const at = tileCenter(item.col, item.row);
    if (item.kind === 'star') {
      ctx.save();
      ctx.translate(at.x, at.y);
      ctx.rotate(Math.PI / 4);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = COLORS.star;
      ctx.shadowColor = COLORS.star;
      ctx.shadowBlur = 18;
      ctx.fillRect(-13, -13, 26, 26);
      ctx.restore();
      ctx.fillStyle = '#fff6c9';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE GILDED STAR', at.x, at.y - 30);
    } else {
      const labels = { gold: 'GOLD', ledger: 'LEDGER', emerald: 'EMERALD' };
      const colors = { gold: '#d8b13a', ledger: '#c9c2b4', emerald: '#3ecf8e' };
      ctx.fillStyle = colors[item.kind];
      ctx.beginPath();
      ctx.arc(at.x, at.y, 10 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[item.kind], at.x, at.y + 24);
    }
  }
}

function drawExit(ctx, time) {
  const at = tileCenter(EXIT_TILE.col, EXIT_TILE.row);
  const glow = 0.5 + Math.sin(time * 2.5) * 0.2;
  ctx.fillStyle = `rgba(47, 174, 95, ${glow})`;
  ctx.fillRect(EXIT_TILE.col * TILE + 2, EXIT_TILE.row * TILE + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = COLORS.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(EXIT_TILE.col * TILE + 2, EXIT_TILE.row * TILE + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = '#eafff1';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('GETAWAY', at.x + 22, at.y - 26);
  ctx.textAlign = 'center';
  ctx.fillText('VAN', at.x, at.y + 4);
}

function drawSmoke(ctx, smokes) {
  for (const smoke of smokes) {
    const alpha = Math.min(0.5, (smoke.timer / 5) * 0.5);
    ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(smoke.x - 30, smoke.y + 18, smoke.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(smoke.x + 34, smoke.y - 14, smoke.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawDecoy(ctx, decoy) {
  if (!decoy) return;
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(decoy.x, decoy.y, 8 + Math.sin(Date.now() / 150) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.arc(decoy.x, decoy.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawGuards(ctx, guards) {
  for (const guard of guards) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = guard.state === 'patrol' ? COLORS.guard : '#ff8c1a';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b0d0d';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 7, guard.y + Math.sin(guard.facing) * 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9d9';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.state === 'investigate' ? '!' : guard.state === 'look' ? '?' : '', guard.x, guard.y - 22);
    ctx.fillStyle = '#f3e6e6';
    ctx.font = '10px sans-serif';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y + 28);
  }
}

function drawCameras(ctx, cameras) {
  for (const camera of cameras) {
    const offline = camera.offlineTimer > 0;
    ctx.fillStyle = offline ? '#555' : COLORS.camera;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = offline ? '#222' : '#d6ecff';
    ctx.beginPath();
    ctx.arc(
      camera.x + Math.cos(camera.facing) * 5,
      camera.y + Math.sin(camera.facing) * 5,
      4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    if (offline) {
      ctx.fillStyle = '#ffb347';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OFFLINE', camera.x, camera.y - 16);
    }
  }
}

function drawThief(ctx, thief, time) {
  const bob = thief.moving ? Math.sin(time * 12) * 1.5 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 12, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.thief;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y + bob, thief.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241a08';
  ctx.beginPath();
  ctx.arc(
    thief.x + Math.cos(thief.facing) * 6,
    thief.y + bob + Math.sin(thief.facing) * 6,
    5.5,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.strokeStyle = '#fff2c9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y + bob, thief.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(thief.sneaking ? 'SNEAKING' : 'WREN', thief.x, thief.y + 28);
}

function drawHud(ctx, game) {
  const { thief, alarm, time } = game;
  ctx.fillStyle = 'rgba(10, 8, 6, 0.88)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.fillStyle = '#f3ead8';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE GILDED VAULT', 14, 29);

  // Alarm meter.
  const meterX = 230;
  const meterW = 300;
  ctx.fillStyle = '#f3ead8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ALARM', meterX, 18);
  ctx.fillStyle = '#241d18';
  ctx.fillRect(meterX, 22, meterW, 14);
  const ratio = alarm.value / ALARM_MAX;
  ctx.fillStyle = alarm.tripped ? '#ff2e2e' : ratio >= ALARM_WARN_AT / ALARM_MAX ? COLORS.alarmHigh : COLORS.alarmLow;
  ctx.fillRect(meterX, 22, meterW * ratio, 14);
  ctx.strokeStyle = '#f3ead8';
  ctx.lineWidth = 1;
  ctx.strokeRect(meterX, 22, meterW, 14);
  if (alarm.tripped) {
    ctx.fillStyle = '#ff5b5b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('BREAK SIGHT!', meterX + meterW + 10, 34);
  } else if (alarm.value >= ALARM_WARN_AT) {
    ctx.fillStyle = '#ff8c1a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('SPOTTED!', meterX + meterW + 10, 34);
  }

  // Loot, tools, timer, score.
  ctx.fillStyle = '#f3ead8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  const lootText = `LOOT $${thief.score.toLocaleString()}`;
  ctx.fillText(lootText, 640, 29);
  const toolsText = `[1] Smoke x${thief.tools.smoke}  [2] EMP x${thief.tools.emp}  [3] Decoy x${thief.tools.decoy}`;
  ctx.font = '12px sans-serif';
  ctx.fillText(toolsText, 760, 29);
  const seconds = Math.floor(time);
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(clock, VIEW_W - 14, 29);
  ctx.textAlign = 'left';

  // Hint line at the bottom.
  ctx.fillStyle = 'rgba(10, 8, 6, 0.8)';
  ctx.fillRect(0, VIEW_H - 26, VIEW_W, 26);
  ctx.fillStyle = '#cbbd9f';
  ctx.font = '12px sans-serif';
  ctx.fillText(game.hint, 14, VIEW_H - 8);
}

function drawVignette(ctx, alarm, time) {
  if (alarm.value < ALARM_WARN_AT && !alarm.tripped) return;
  const pulse = alarm.tripped ? 0.35 + Math.sin(time * 10) * 0.12 : 0.16;
  const gradient = ctx.createRadialGradient(
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.35,
    VIEW_W / 2,
    VIEW_H / 2,
    VIEW_H * 0.75,
  );
  gradient.addColorStop(0, 'rgba(229, 72, 77, 0)');
  gradient.addColorStop(1, `rgba(229, 72, 77, ${pulse})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function overlay(ctx, title, lines, accent, footer) {
  ctx.fillStyle = 'rgba(8, 6, 5, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 70);
  ctx.fillStyle = '#f3ead8';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 20 + i * 28);
  });
  if (footer) {
    ctx.fillStyle = '#cbbd9f';
    ctx.font = '14px sans-serif';
    ctx.fillText(footer, VIEW_W / 2, VIEW_H / 2 + 130);
  }
}

export function render(ctx, game) {
  const { thief, guards, cameras, loot, smokes, decoy, alarm, time } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  drawExit(ctx, time);
  drawCones(ctx, guards, cameras);
  drawCases(ctx);
  drawWalls(ctx);
  drawLoot(ctx, loot, time);
  drawSmoke(ctx, smokes);
  drawDecoy(ctx, decoy);
  drawCameras(ctx, cameras);
  drawGuards(ctx, guards);
  drawThief(ctx, thief, time);
  drawVignette(ctx, alarm, time);
  drawHud(ctx, game);

  if (game.state === 'title') {
    overlay(ctx, 'THE GILDED VAULT', [
      'One thief. One vault. One very shiny diamond.',
      'Cross the floor, lift the Gilded Star, and reach the getaway van.',
      'Guards and cameras fill the alarm meter. At 100, you are caught.',
      'WASD / arrows to move, Shift to sneak, click to walk.',
      '[1] Smoke  [2] EMP  [3] Decoy (click a spot)  — every tool costs score.',
      'Press Enter or click to start the job.',
    ], '#e8b23a', null);
  } else if (game.state === 'paused') {
    overlay(ctx, 'PAUSED', ['The vault waits. Nobody moves while you think.', 'Press P to carry on.'], '#cbbd9f', null);
  } else if (game.state === 'busted') {
    overlay(ctx, 'BUSTED', [
      'The alarm tripped and the guards closed in.',
      `Loot carried: $${thief.score.toLocaleString()} — the Star stays in the vault.`,
      'Read the cones before you move. Smoke buys five seconds.',
    ], '#e5484d', 'Press R to play again');
  } else if (game.state === 'escaped') {
    const breakdown = game.breakdown;
    overlay(ctx, 'CLEAN GETAWAY', [
      `The Gilded Star is yours. The van is already moving.`,
      `Loot $${breakdown.loot.toLocaleString()}  +  time bonus $${breakdown.timeBonus}  −  tools $${breakdown.tools}`,
      `FINAL SCORE  $${breakdown.total.toLocaleString()}   in ${breakdown.timeText}`,
    ], '#2fae5f', 'Press R to play again');
  }
}
