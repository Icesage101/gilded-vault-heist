// The Gilded Vault — synthesized sound.
// Every sound is made with the Web Audio API at run time: no audio files,
// no network. A tiny helper builds tones and noise bursts, and each named
// sound is one short phrase on top of it. Mute lives here too.

export function createSoundBank() {
  return {
    context: null,
    muted: false,
    stepTimer: 0,
  };
}

function ensureContext(bank) {
  if (!bank.context) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    bank.context = new AudioContext();
  }
  if (bank.context.state === 'suspended') bank.context.resume();
  return bank.context;
}

function tone(bank, frequency, duration, type, volume, when = 0, slideTo = null) {
  const ctx = ensureContext(bank);
  if (!ctx || bank.muted) return;
  const start = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseBurst(bank, duration, volume, lowpass = 1200) {
  const ctx = ensureContext(bank);
  if (!ctx || bank.muted) return;
  const start = ctx.currentTime;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
}

// A soft footstep tick, throttled by the engine while the thief walks.
export function playFootstep(bank) {
  noiseBurst(bank, 0.06, 0.08, 500);
}

// Two-note chime when loot is picked up. A running combo pitches the
// chime up a step per link, so a streak sounds like it climbs.
export function playPickup(bank, combo = 1) {
  const lift = Math.pow(1.12, Math.min(combo - 1, 5));
  tone(bank, 880 * lift, 0.12, 'sine', 0.16);
  tone(bank, 1318 * lift, 0.2, 'sine', 0.14, 0.09);
}

// The tripwire's buzz: a harsh square blare, unmistakably not the beeps.
export function playLaser(bank) {
  tone(bank, 180, 0.3, 'square', 0.16, 0, 140);
  tone(bank, 190, 0.3, 'square', 0.12, 0.05, 150);
}

// The cutter's snip: a tiny metallic click and a falling sparkle.
export function playCut(bank) {
  tone(bank, 2600, 0.05, 'triangle', 0.15);
  tone(bank, 1750, 0.09, 'sine', 0.12, 0.06);
  tone(bank, 1200, 0.12, 'sine', 0.1, 0.13);
}

// A low alarm beep; the engine calls it faster as the meter climbs.
export function playAlarmBeep(bank) {
  tone(bank, 620, 0.14, 'square', 0.1);
  tone(bank, 620, 0.14, 'square', 0.1, 0.18);
}

// The hiss of a smoke pellet.
export function playSmoke(bank) {
  noiseBurst(bank, 0.7, 0.2, 2400);
}

// The EMP zap: a square wave falling fast.
export function playEmp(bank) {
  tone(bank, 1400, 0.35, 'square', 0.12, 0, 120);
}

// The clink of a thrown decoy coin.
export function playDecoy(bank) {
  tone(bank, 2400, 0.06, 'triangle', 0.14);
  tone(bank, 1900, 0.08, 'triangle', 0.12, 0.08);
}

// The bust sting: a short dissonant fall.
export function playBusted(bank) {
  tone(bank, 220, 0.5, 'sawtooth', 0.16, 0, 110);
  tone(bank, 233, 0.5, 'sawtooth', 0.14, 0, 116);
}

// The getaway fanfare: a rising arpeggio.
export function playGetaway(bank) {
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, i) => tone(bank, note, 0.22, 'triangle', 0.16, i * 0.11));
}

export function toggleMute(bank) {
  bank.muted = !bank.muted;
  return bank.muted;
}
