// The Gilded Vault — particles.
// Small, short-lived sparks and puffs that sell the moments the flat shapes
// cannot: gold bursting off lifted loot, the cutter's snip, a beam's angry
// flash, dust off a smoke pellet. One flat array, updated by the engine and
// drawn by the renderer; nothing here touches game state that matters.

export function createParticles() {
  return [];
}

// A ring of sparks flying out from a point and falling quiet.
// kind picks the colour in the renderer: 'gold', 'red', 'puff', 'glass'.
export function spawnBurst(particles, x, y, kind, count = 10, speed = 90) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.35;
    const pace = speed * (0.45 + ((i * 37) % 10) / 14);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * pace,
      vy: Math.sin(angle) * pace - 18,
      life: 0.55 + ((i * 13) % 10) / 22,
      maxLife: 0.9,
      size: kind === 'puff' ? 7 + (i % 3) * 3 : 2 + (i % 3),
      kind,
    });
  }
}

// A slow rising puff, for smoke pellets and the getaway's dust.
export function spawnPuff(particles, x, y) {
  spawnBurst(particles, x, y, 'puff', 7, 42);
}

// Age every particle and drop the dead. Gravity is a gentle drag, not a
// fall: sparks hang in the vault's still air for a beat, then fade.
export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.4 * dt;
    p.vy = p.vy * (1 - 2.4 * dt) - 12 * dt; // a whisper of lift
  }
}

// Twinkle phase for the sparkles that hang over untaken loot: a pure
// function of the tile and the clock, so a frozen screenshot still shows
// them and every render of the same moment agrees.
export function sparkleAlpha(col, row, slot, time) {
  const phase = Math.sin(time * 2.2 + col * 1.31 + row * 2.17 + slot * 2.4);
  return phase > 0.55 ? (phase - 0.55) / 0.45 : 0;
}

export function sparkleOffset(col, row, slot) {
  return {
    dx: ((col * 7 + row * 13 + slot * 11) % 17) - 8,
    dy: ((col * 5 + row * 3 + slot * 7) % 13) - 6,
  };
}
