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
import {
  TILEMAP,
  tileAt,
  tileCenter,
  EXIT_TILE,
  STAR_TILE,
  LOOT_SPOTS,
  PAINTING_TILES,
  MONEYBAG_TILES,
  VAULT_DOOR_TILE,
} from './level.js';
import { beamEnds } from './lasers.js';
import { sparkleAlpha, sparkleOffset } from './particles.js';

// A small deterministic hash of a tile, so decoration varies tile to tile
// but never flickers between frames or runs.
function tileHash(col, row, salt = 0) {
  let h = (col * 374761393 + row * 668265263 + salt * 974634211) % 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function drawFloor(ctx) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const tile = TILEMAP[row][col];
      if (tile === '#') continue;
      const x = col * TILE;
      const y = row * TILE;
      // Polished marble checker, two stones alternating.
      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.marbleLight : COLORS.marbleDark;
      ctx.fillRect(x, y, TILE, TILE);
      // A vein or two per stone, wandering the same way every frame.
      ctx.strokeStyle = 'rgba(210, 200, 180, 0.07)';
      ctx.lineWidth = 1;
      const v = tileHash(col, row);
      ctx.beginPath();
      ctx.moveTo(x + 6 + v * 20, y + TILE);
      ctx.lineTo(x + 16 + v * 22, y + TILE * 0.45);
      ctx.lineTo(x + 10 + v * 26, y);
      ctx.stroke();
      // Grout lines.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
  }
  // Carpets: a deep red runner down the middle band, a second through the
  // getaway hall, and a gold-trimmed mat inside the vault cage.
  ctx.fillStyle = COLORS.carpet;
  ctx.fillRect(TILE, 7 * TILE + 5, VIEW_W - 2 * TILE, 4 * TILE - 10);
  ctx.fillRect(10 * TILE + 5, 12 * TILE + 5, 13 * TILE - 10, 2 * TILE - 10);
  ctx.fillStyle = 'rgba(160, 44, 52, 0.55)';
  ctx.fillRect(10 * TILE + 5, 8 * TILE + 5, 5 * TILE - 10, 3 * TILE - 10);
  ctx.strokeStyle = 'rgba(216, 177, 58, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10 * TILE + 7, 8 * TILE + 7, 5 * TILE - 14, 3 * TILE - 14);
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
      // Pedestal, glass, gilt frame — and something precious inside: a
      // gem, a cup or a crown, chosen by the tile so it never changes.
      ctx.fillStyle = '#14100c';
      ctx.fillRect(x - 2, y + TILE - 16, TILE - 10, 5);
      ctx.fillStyle = '#1c2226';
      ctx.fillRect(x, y, TILE - 14, TILE - 14);
      ctx.fillStyle = COLORS.caseGlass;
      ctx.fillRect(x + 3, y + 3, TILE - 20, TILE - 20);
      const kind = Math.floor(tileHash(col, row, 3) * 3);
      ctx.fillStyle = '#ffd94d';
      if (kind === 0) {
        ctx.save();
        ctx.translate(x + 17, y + 17);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      } else if (kind === 1) {
        ctx.beginPath();
        ctx.arc(x + 17, y + 14, 7, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(x + 15, y + 14, 4, 8);
        ctx.fillRect(x + 11, y + 22, 12, 3);
      } else {
        ctx.beginPath();
        ctx.moveTo(x + 9, y + 22);
        ctx.lineTo(x + 11, y + 11);
        ctx.lineTo(x + 15, y + 17);
        ctx.lineTo(x + 19, y + 11);
        ctx.lineTo(x + 23, y + 17);
        ctx.lineTo(x + 25, y + 22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = COLORS.caseGold;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, TILE - 14, TILE - 14);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 6, y + 4, 4, TILE - 24);
    }
  }
}

// Gilt paintings on the walls: a dark landscape in a gold frame, the art
// varying by tile so the gallery never repeats itself exactly.
function drawPaintings(ctx) {
  for (const spot of PAINTING_TILES) {
    const x = spot.col * TILE + 6;
    const y = spot.row * TILE + 9;
    const w = TILE - 12;
    const h = TILE - 18;
    ctx.fillStyle = '#0f0c09';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#31435c');
    sky.addColorStop(0.6, '#5c4631');
    sky.addColorStop(1, '#241a10');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 220, 150, 0.8)';
    ctx.beginPath();
    ctx.arc(x + w * (0.25 + tileHash(spot.col, spot.row, 5) * 0.5), y + h * 0.32, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w * 0.4, y + h * 0.55);
    ctx.lineTo(x + w * 0.7, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = COLORS.caseGold;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  }
}

// The great vault door, set into the cage's south wall: a steel disc with
// a spoked wheel and a gold rim, drawn over the wall tile.
function drawVaultDoor(ctx) {
  const at = tileCenter(VAULT_DOOR_TILE.col, VAULT_DOOR_TILE.row);
  ctx.fillStyle = '#232028';
  ctx.fillRect(VAULT_DOOR_TILE.col * TILE, VAULT_DOOR_TILE.row * TILE, TILE, TILE);
  ctx.beginPath();
  ctx.arc(at.x, at.y, 21, 0, Math.PI * 2);
  ctx.fillStyle = '#565064';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.caseGold;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(at.x, at.y, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#3b3646';
  ctx.fill();
  ctx.strokeStyle = '#8f86a3';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(at.x, at.y);
    ctx.lineTo(at.x + Math.cos(a) * 14, at.y + Math.sin(a) * 14);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(at.x, at.y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.caseGold;
  ctx.fill();
}

// Money bags slumped against the walls: canvas sacks with a gold tie.
function drawMoneyBags(ctx) {
  for (const spot of MONEYBAG_TILES) {
    const at = tileCenter(spot.col, spot.row);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(at.x, at.y + 13, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6d5b34';
    ctx.beginPath();
    ctx.ellipse(at.x, at.y + 4, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#857044';
    ctx.beginPath();
    ctx.ellipse(at.x - 3, at.y, 6, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.caseGold;
    ctx.fillRect(at.x - 4, at.y - 9, 8, 3);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', at.x, at.y + 8);
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
    // Sparkles hang over everything worth stealing.
    for (let slot = 0; slot < 3; slot++) {
      const alpha = sparkleAlpha(item.col, item.row, slot, time);
      if (alpha <= 0) continue;
      const off = sparkleOffset(item.col, item.row, slot);
      ctx.fillStyle = `rgba(255, 240, 190, ${alpha})`;
      const sx = at.x + off.dx * 1.6;
      const sy = at.y + off.dy * 1.6;
      ctx.fillRect(sx - 1, sy - 4, 2, 8);
      ctx.fillRect(sx - 4, sy - 1, 8, 2);
    }
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
      const labels = { gold: 'GOLD', ledger: 'LEDGER', emerald: 'EMERALD', crown: 'CROWN', ruby: 'RUBY' };
      const colors = { gold: '#d8b13a', ledger: '#c9c2b4', emerald: '#3ecf8e', crown: '#ffb347', ruby: '#ff5b7f' };
      ctx.fillStyle = colors[item.kind];
      ctx.shadowColor = colors[item.kind];
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 10 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(at.x - 3, at.y - 3, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[item.kind], at.x, at.y + 24);
    }
  }
}

// Laser tripwires: emitter posts at each end, a glowing red line between,
// and a warning chevron strip on the floor beneath. A cut beam hangs dark
// with its ends capped; a tripped beam burns white-hot while it flashes.
function drawLasers(ctx, lasers, time) {
  for (const beam of lasers) {
    const ends = beamEnds(beam);
    if (!beam.disabled) {
      ctx.strokeStyle = 'rgba(255, 59, 48, 0.16)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (beam.axis === 'h') {
        ctx.moveTo(ends.x1, ends.y1 - 7);
        ctx.lineTo(ends.x2, ends.y2 - 7);
        ctx.moveTo(ends.x1, ends.y1 + 7);
        ctx.lineTo(ends.x2, ends.y2 + 7);
      } else {
        ctx.moveTo(ends.x1 - 7, ends.y1);
        ctx.lineTo(ends.x2 - 7, ends.y2);
        ctx.moveTo(ends.x1 + 7, ends.y1);
        ctx.lineTo(ends.x2 + 7, ends.y2);
      }
      ctx.stroke();
    }
    const flicker = 0.75 + Math.sin(time * 9 + beam.flickerPhase) * 0.25;
    ctx.save();
    if (!beam.disabled) {
      ctx.shadowColor = COLORS.laser;
      ctx.shadowBlur = beam.flashTimer > 0 ? 22 : 10;
      ctx.strokeStyle =
        beam.flashTimer > 0 ? '#ffffff' : `rgba(255, 59, 48, ${flicker})`;
      ctx.lineWidth = beam.flashTimer > 0 ? 3.5 : 2;
    } else {
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
    }
    ctx.beginPath();
    ctx.moveTo(ends.x1, ends.y1);
    ctx.lineTo(ends.x2, ends.y2);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
    // Emitter posts.
    for (const end of [
      { x: ends.x1, y: ends.y1 },
      { x: ends.x2, y: ends.y2 },
    ]) {
      ctx.fillStyle = '#191512';
      ctx.fillRect(end.x - 4, end.y - 4, 8, 8);
      ctx.fillStyle = beam.disabled ? '#4a4a4a' : COLORS.laser;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (beam.disabled) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.75)';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CUT', beam.x, beam.y - 10);
    }
  }
}

// Particles: gold sparks, red beam flashes, glass snips, grey puffs.
function drawParticles(ctx, particles) {
  const colors = {
    gold: '255, 217, 77',
    red: '255, 80, 60',
    glass: '170, 230, 255',
    puff: '190, 190, 190',
  };
  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.fillStyle = `rgba(${colors[p.kind] || colors.gold}, ${alpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.kind === 'puff' ? 1 + (1 - alpha) : 1), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Dramatic light: the vault is dark, and pools of warm light fall on the
// things worth looking at — the Star, the cases, the crown, the van.
function drawLighting(ctx, game) {
  const pools = [{ x: tileCenter(STAR_TILE.col, STAR_TILE.row), r: 130 }];
  for (const item of game.loot) {
    if (item.taken || item.kind === 'star') continue;
    pools.push({ x: tileCenter(item.col, item.row), r: 74 });
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (tileAt(col, row) === 'C') pools.push({ x: tileCenter(col, row), r: 66 });
    }
  }
  pools.push({ x: tileCenter(EXIT_TILE.col, EXIT_TILE.row), r: 84 });
  for (const pool of pools) {
    const glow = ctx.createRadialGradient(pool.x.x, pool.x.y, 4, pool.x.x, pool.x.y, pool.r);
    glow.addColorStop(0, COLORS.spotlight);
    glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(pool.x.x - pool.r, pool.x.y - pool.r, pool.r * 2, pool.r * 2);
  }
  // The room's edges fall off into darkness.
  const shade = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.86,
  );
  shade.addColorStop(0, 'rgba(4, 3, 8, 0)');
  shade.addColorStop(1, 'rgba(4, 3, 8, 0.42)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
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
  const bodyColors = {
    patrol: COLORS.guard,
    suspicious: '#e8b23a',
    investigate: '#ff8c1a',
    look: '#ff8c1a',
    chase: '#ff2e2e',
  };
  const marks = { suspicious: '?', investigate: '!', look: '?', chase: '!' };
  for (const guard of guards) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 12, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyColors[guard.state] || COLORS.guard;
    if (guard.state === 'chase') {
      ctx.shadowColor = '#ff2e2e';
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Cap and visor, turned the way the guard faces.
    ctx.fillStyle = '#571d1d';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 10, guard.facing - 2.4, guard.facing + 2.4);
    ctx.fill();
    ctx.fillStyle = '#2b0d0d';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing) * 7, guard.y + Math.sin(guard.facing) * 7, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = guard.state === 'chase' ? '#ff5b5b' : '#ffd9d9';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(marks[guard.state] || '', guard.x, guard.y - 22);
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
  // The loot satchel on Wren's back, and the Star's glow once it is hers.
  ctx.fillStyle = '#7a4d16';
  ctx.beginPath();
  ctx.arc(
    thief.x - Math.cos(thief.facing) * 9,
    thief.y + bob - Math.sin(thief.facing) * 9,
    6,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  if (thief.hasStar) {
    ctx.fillStyle = COLORS.star;
    ctx.shadowColor = COLORS.star;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(
      thief.x - Math.cos(thief.facing) * 9,
      thief.y + bob - Math.sin(thief.facing) * 9,
      2.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }
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
  ctx.fillText(lootText, 600, 20);
  if (thief.combo > 1 && thief.comboTimer > 0) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`COMBO x${thief.combo}`, 600, 36);
    ctx.fillStyle = 'rgba(255, 217, 77, 0.4)';
    ctx.fillRect(600, 39, 74 * Math.max(0, thief.comboTimer / 8), 3);
    ctx.fillStyle = '#f3ead8';
    ctx.font = 'bold 13px sans-serif';
  }
  const toolsText = `[1] Smoke x${thief.tools.smoke}  [2] EMP x${thief.tools.emp}  [3] Decoy x${thief.tools.decoy}  [4] Cutter x${thief.tools.cutter}`;
  ctx.font = '12px sans-serif';
  ctx.fillText(toolsText, 716, 29);
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
  drawMoneyBags(ctx);
  drawCones(ctx, guards, cameras);
  drawLasers(ctx, game.lasers, time);
  drawCases(ctx);
  drawWalls(ctx);
  drawPaintings(ctx);
  drawVaultDoor(ctx);
  drawLoot(ctx, loot, time);
  drawSmoke(ctx, smokes);
  drawDecoy(ctx, decoy);
  drawParticles(ctx, game.particles);
  drawCameras(ctx, cameras);
  drawGuards(ctx, guards);
  drawThief(ctx, thief, time);
  drawLighting(ctx, game);
  drawVignette(ctx, alarm, time);
  drawHud(ctx, game);

  if (game.state === 'title') {
    overlay(ctx, 'THE GILDED VAULT', [
      'One thief. One vault. One very shiny diamond.',
      'Cross two floors, lift the Gilded Star, and reach the getaway van.',
      'Guards, cameras and laser tripwires feed the alarm meter. At 100, you are caught.',
      'WASD / arrows to move, Shift to sneak under lasers, click to walk.',
      '[1] Smoke  [2] EMP  [3] Decoy  [4] Cutter — every tool costs score.',
      'Chain loot fast for combo multipliers. Stay unnoticed for the ghost bonus.',
      'Press Enter or click to start the job.',
    ], '#e8b23a', null);
  } else if (game.state === 'paused') {
    overlay(ctx, 'PAUSED', ['The vault waits. Nobody moves while you think.', 'Press P to carry on.'], '#cbbd9f', null);
  } else if (game.state === 'busted') {
    overlay(ctx, 'BUSTED', [
      'The alarm tripped and the guards closed in.',
      `Loot carried: $${thief.score.toLocaleString()} — the Star stays in the vault.`,
      'Read the cones before you move. Smoke buys five seconds, the cutter kills a laser.',
    ], '#e5484d', 'Press R to play again');
  } else if (game.state === 'escaped') {
    const breakdown = game.breakdown;
    const lines = [
      `The Gilded Star is yours. The van is already moving.`,
      `Loot $${breakdown.loot.toLocaleString()}  +  time bonus $${breakdown.timeBonus}  −  tools $${breakdown.tools}`,
    ];
    if (breakdown.ghost > 0) lines.push(`GHOST BONUS $${breakdown.ghost} — the room never knew you were there.`);
    if (breakdown.bestCombo > 1) lines.push(`Best combo x${breakdown.bestCombo} — a thief in a hurry is a rich thief.`);
    lines.push(`FINAL SCORE  $${breakdown.total.toLocaleString()}   in ${breakdown.timeText}`);
    overlay(ctx, 'CLEAN GETAWAY', lines, '#2fae5f', 'Press R to play again');
  }
}
