/**
 * Subtle synthesized UI audio engine (Web Audio API, zero external assets, toggleable)
 */
(function (global) {
  'use strict';

  let ctx = null;
  let enabled = true;
  let volume = 0.25;

  function ensureCtx() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (_) { return null; }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gainMult = 1, endFreq = null) {
    const c = ensureCtx();
    if (!c) return;
    try {
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
      const peak = Math.max(0.001, volume * gainMult * 0.16);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (_) {}
  }

  global.SoundFX = {
    configure(opts = {}) {
      if (typeof opts.enabled === 'boolean') enabled = opts.enabled;
      if (typeof opts.volume === 'number') volume = Math.min(1, Math.max(0, opts.volume));
    },
    isEnabled() { return enabled; },
    click() { tone(520, 0.055, 'triangle', 0.7, 680); },
    fav(added) {
      if (added) {
        tone(523.25, 0.09, 'sine', 0.9, 659.25);
        setTimeout(() => tone(783.99, 0.14, 'sine', 0.85, 1046.5), 55);
      } else {
        tone(440, 0.09, 'sine', 0.6, 310);
      }
    },
    launch() {
      tone(392, 0.09, 'triangle', 0.9, 523.25);
      setTimeout(() => tone(659.25, 0.16, 'sine', 0.95, 783.99), 65);
    },
    rouletteTick() { tone(620 + Math.random() * 180, 0.035, 'sine', 0.45); },
    achievement() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => tone(f, 0.18, 'triangle', 0.9), i * 75);
      });
    },
    chat() { tone(740, 0.07, 'sine', 0.55, 880); }
  };
})(window);
