/*
 * Sycamore Sam Clicker - sound effects.
 * All sounds are generated with the Web Audio API, so there are no audio files
 * to download or license. The audio context starts on the first sound, which
 * always follows a click or key press (browsers require a user gesture).
 */
(function (root) {
  'use strict';
  const SSC = (root.SSC = root.SSC || {});

  let ctx = null;
  let master = null;
  let enabled = true;
  let volume = 0.5;
  let lastClick = 0;

  function context() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', gain = 0.25) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  /** Short filtered noise burst: a leaf rustle. */
  function rustle(start) {
    const len = Math.floor(ctx.sampleRate * 0.07);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2500 + Math.random() * 1500;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(filter).connect(g).connect(master);
    src.start(start);
  }

  const sounds = {
    click(t) { rustle(t); },
    buy(t) { tone(660, t, 0.08, 'triangle', 0.18); tone(990, t + 0.06, 0.1, 'triangle', 0.15); },
    sell(t) { tone(700, t, 0.08, 'triangle', 0.15); tone(470, t + 0.06, 0.12, 'triangle', 0.13); },
    upgrade(t) { [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.06, 0.14, 'triangle', 0.15)); },
    golden(t) { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.07, 0.3, 'sine', 0.12)); },
    reward(t) { [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.05, 0.25, 'sine', 0.16)); },
    achievement(t) { [659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.3, 'sine', 0.16)); },
    graduate(t) { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, t + i * 0.12, 0.35, 'triangle', 0.18)); },
  };

  function play(name) {
    if (!enabled || !sounds[name]) return;
    if (name === 'click') {
      const nowMs = Date.now();
      if (nowMs - lastClick < 35) return; // avoid a buzz when clicking very fast
      lastClick = nowMs;
    }
    try {
      if (!context()) return;
      if (ctx.state === 'suspended') ctx.resume();
      sounds[name](ctx.currentTime + 0.005);
    } catch (e) {
      // Sound is optional; never let it break the game.
    }
  }

  SSC.audio = {
    play,
    setEnabled(on) { enabled = !!on; },
    setVolume(v) { volume = Math.min(1, Math.max(0, v)); if (master) master.gain.value = volume; },
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
