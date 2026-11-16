/**
 * Interactive 60fps Canvas Background Engine
 * Modes: constellation, grid, aurora, matrix, fireflies, chalkboard, custom, static
 * Reacts smoothly to mouse pointer movement, hover parallax, and click shockwaves.
 */
(function (global) {
  'use strict';

  const FORMULAS = [
    'f(x) = ax² + bx + c', 'Δ = b² − 4ac', 'sen²θ + cos²θ = 1', 'E = mc²',
    'a² + b² = c²', '∫ xⁿ dx', 'lim x→∞', 'π ≈ 3,14159', 'F = m · a',
    'PV = nRT', 'log₂(n)', '∑ k=1..n', 'e^(iπ) + 1 = 0', 'v = Δs / Δt',
    'φ = 1,618', '√(x² + y²)', 'P(A∩B)', 'C₆H₁₂O₆'
  ];

  let canvas, ctx;
  let width = 0, height = 0, dpr = 1;
  let rafId = null;
  let paused = false;

  const state = {
    mode: 'constellation',
    speed: 1,
    density: 1,
    clickRipples: true,
    customImage: '',
    accentRgb: [99, 102, 241],
    accent2Rgb: [34, 211, 238],
    isLight: false
  };

  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  let particles = [];
  let ripples = [];
  let matrixCols = [];
  let tick = 0;

  function hexToRgb(hex) {
    const clean = String(hex || '#6366f1').replace('#', '').trim();
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const n = parseInt(full, 16);
    if (Number.isNaN(n)) return [99, 102, 241];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function syncThemeColors() {
    const cs = getComputedStyle(document.documentElement);
    state.accentRgb = hexToRgb(cs.getPropertyValue('--accent').trim() || '#6366f1');
    state.accent2Rgb = hexToRgb(cs.getPropertyValue('--accent-2').trim() || '#22d3ee');
    state.isLight = document.documentElement.getAttribute('data-theme') === 'caderno';
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(global.devicePixelRatio || 1, 1.75);
    width = global.innerWidth;
    height = global.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildScene();
  }

  function rebuildScene() {
    particles = [];
    matrixCols = [];
    const areaFactor = Math.min(1.6, Math.max(0.45, (width * height) / (1440 * 900)));
    const mult = areaFactor * state.density;

    if (state.mode === 'constellation') {
      const count = Math.round(72 * mult);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55,
          r: Math.random() * 1.9 + 0.9,
          alt: i % 3 === 0
        });
      }
    } else if (state.mode === 'fireflies') {
      const count = Math.round(52 * mult);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -Math.random() * 0.45 - 0.1,
          r: Math.random() * 3.8 + 1.4,
          depth: Math.random() * 0.8 + 0.2,
          phase: Math.random() * Math.PI * 2,
          alt: i % 2 === 0
        });
      }
    } else if (state.mode === 'matrix') {
      const colW = 22;
      const cols = Math.ceil(width / colW);
      for (let i = 0; i < cols; i++) {
        matrixCols.push({
          x: i * colW,
          y: Math.random() * height,
          speed: (1.2 + Math.random() * 2.2),
          char: String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96))
        });
      }
    } else if (state.mode === 'chalkboard') {
      const count = Math.round(28 * mult);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.24,
          vy: (Math.random() - 0.5) * 0.24,
          text: FORMULAS[i % FORMULAS.length],
          size: 12 + Math.floor(Math.random() * 6),
          alpha: 0.08 + Math.random() * 0.12
        });
      }
    }
  }

  function applyCustomImage() {
    const imgEl = document.getElementById('bg-custom-image');
    if (!imgEl) return;
    if (state.mode === 'custom' && state.customImage) {
      imgEl.style.backgroundImage = `url("${CSS.escape ? state.customImage.replace(/"/g, '%22') : state.customImage}")`;
      imgEl.style.opacity = '1';
    } else {
      imgEl.style.opacity = '0';
      imgEl.style.backgroundImage = 'none';
    }
  }

  function spawnRipple(x, y) {
    if (!state.clickRipples || state.mode === 'static') return;
    ripples.push({ x, y, r: 4, maxR: 210, alpha: 0.55 });
    if (ripples.length > 8) ripples.shift();

    // Push nearby particles gently
    for (const p of particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1 && dist < 190 && typeof p.vx === 'number') {
        const force = (1 - dist / 190) * 2.8;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }
  }

  function drawRipples(r1, g1, b1) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 4.2 * Math.max(0.5, state.speed);
      rp.alpha *= 0.94;
      if (rp.alpha < 0.015 || rp.r > rp.maxR) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r1},${g1},${b1},${rp.alpha.toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function render() {
    if (paused || state.mode === 'static') {
      rafId = null;
      if (ctx) ctx.clearRect(0, 0, width, height);
      return;
    }

    tick += 0.012 * state.speed;
    if (pointer.active) {
      pointer.x += (pointer.tx - pointer.x) * 0.14;
      pointer.y += (pointer.ty - pointer.y) * 0.14;
    }

    const [r1, g1, b1] = state.accentRgb;
    const [r2, g2, b2] = state.accent2Rgb;
    const alphaScale = state.isLight ? 0.55 : 1;

    if (state.mode === 'matrix') {
      ctx.fillStyle = state.isLight ? 'rgba(248,250,252,0.18)' : 'rgba(9,11,16,0.16)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (const col of matrixCols) {
        if (Math.random() < 0.08) {
          col.char = String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96));
        }
        const dist = pointer.active ? Math.hypot(col.x - pointer.x, col.y - pointer.y) : 9999;
        const glow = dist < 170 ? 0.65 : 0.2;
        ctx.fillStyle = dist < 170
          ? `rgba(${r2},${g2},${b2},${(glow * alphaScale).toFixed(3)})`
          : `rgba(${r1},${g1},${b1},${(glow * alphaScale).toFixed(3)})`;
        ctx.fillText(col.char, col.x, col.y);
        col.y += col.speed * state.speed * 1.4;
        if (col.y > height + 20 && Math.random() > 0.965) {
          col.y = -16;
        }
      }
      drawRipples(r2, g2, b2);
      rafId = requestAnimationFrame(render);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    // Subtle cursor spotlight glow across interactive modes
    if (pointer.active && state.mode !== 'custom') {
      const grad = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 340);
      grad.addColorStop(0, `rgba(${r1},${g1},${b1},${(0.11 * alphaScale).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(${r2},${g2},${b2},${(0.04 * alphaScale).toFixed(3)})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    if (state.mode === 'constellation') {
      const linkDist = 135;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * state.speed;
        p.y += p.vy * state.speed;
        // Damp velocity bursts smoothly
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0.75) {
          p.vx *= 0.96;
          p.vy *= 0.96;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < 175 && d > 1) {
            const lineA = (1 - d / 175) * 0.34 * alphaScale;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(${r2},${g2},${b2},${lineA.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            // Gentle attraction ring
            if (d > 55) {
              p.x += (dx / d) * 0.32 * state.speed;
              p.y += (dy / d) * 0.32 * state.speed;
            }
          }
        }

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          if (Math.abs(dx) > linkDist || Math.abs(dy) > linkDist) continue;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const a = (1 - d / linkDist) * 0.17 * alphaScale;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(${r1},${g1},${b1},${a.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.alt
          ? `rgba(${r2},${g2},${b2},${(0.55 * alphaScale).toFixed(3)})`
          : `rgba(${r1},${g1},${b1},${(0.5 * alphaScale).toFixed(3)})`;
        ctx.fill();
      }
    } else if (state.mode === 'grid') {
      const step = Math.max(36, Math.round(54 / Math.sqrt(state.density)));
      const offset = (tick * 28) % step;
      ctx.lineWidth = 1;

      for (let x = -step; x <= width + step; x += step) {
        const dist = pointer.active ? Math.abs(x - pointer.x) : 9999;
        const a = (dist < 180 ? 0.06 + (1 - dist / 180) * 0.14 : 0.045) * alphaScale;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.strokeStyle = `rgba(${r1},${g1},${b1},${a.toFixed(3)})`;
        ctx.stroke();
      }
      for (let y = -step + offset; y <= height + step; y += step) {
        const dist = pointer.active ? Math.abs(y - pointer.y) : 9999;
        const a = (dist < 180 ? 0.06 + (1 - dist / 180) * 0.14 : 0.045) * alphaScale;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.strokeStyle = `rgba(${r1},${g1},${b1},${a.toFixed(3)})`;
        ctx.stroke();
      }
      if (pointer.active) {
        const gx = Math.round(pointer.x / step) * step;
        const gy = Math.round((pointer.y - offset) / step) * step + offset;
        ctx.beginPath();
        ctx.arc(gx, gy, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r2},${g2},${b2},${(0.75 * alphaScale).toFixed(3)})`;
        ctx.fill();
      }
    } else if (state.mode === 'aurora') {
      const mx = pointer.active ? (pointer.x / width - 0.5) * 160 : 0;
      const my = pointer.active ? (pointer.y / height - 0.5) * 110 : 0;
      const orbs = [
        { x: width * 0.25 + Math.sin(tick * 0.8) * 140 + mx, y: height * 0.3 + Math.cos(tick * 0.6) * 90 + my, rad: Math.max(width, height) * 0.42, c: state.accentRgb, a: 0.16 },
        { x: width * 0.75 + Math.cos(tick * 0.7) * 150 - mx * 0.7, y: height * 0.62 + Math.sin(tick * 0.9) * 100 - my * 0.7, rad: Math.max(width, height) * 0.44, c: state.accent2Rgb, a: 0.13 },
        { x: width * 0.5 + Math.sin(tick * 0.5 + 2) * 180, y: height * 0.85 + Math.cos(tick * 0.4) * 70, rad: Math.max(width, height) * 0.36, c: state.accentRgb, a: 0.1 }
      ];
      for (const o of orbs) {
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.rad);
        g.addColorStop(0, `rgba(${o.c[0]},${o.c[1]},${o.c[2]},${(o.a * alphaScale).toFixed(3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }
    } else if (state.mode === 'fireflies') {
      const px = pointer.active ? (pointer.x / width - 0.5) * 45 : 0;
      const py = pointer.active ? (pointer.y / height - 0.5) * 45 : 0;
      for (const p of particles) {
        p.x += p.vx * state.speed;
        p.y += p.vy * state.speed;
        p.phase += 0.025 * state.speed;
        if (p.y < -20) { p.y = height + 20; p.x = Math.random() * width; }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        const drawX = p.x + px * p.depth;
        const drawY = p.y + py * p.depth;
        const pulse = (Math.sin(p.phase) * 0.5 + 0.5) * 0.55 + 0.18;
        const c = p.alt ? state.accent2Rgb : state.accentRgb;
        const g = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, p.r * 4.2);
        g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${(pulse * alphaScale).toFixed(3)})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.r * 4.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (state.mode === 'chalkboard') {
      ctx.font = '500 14px ui-monospace, Georgia, serif';
      for (const p of particles) {
        p.x += p.vx * state.speed;
        p.y += p.vy * state.speed;
        if (p.x < -140) p.x = width + 40;
        if (p.x > width + 140) p.x = -80;
        if (p.y < -30) p.y = height + 25;
        if (p.y > height + 30) p.y = -20;
        const dist = pointer.active ? Math.hypot(p.x - pointer.x, p.y - pointer.y) : 9999;
        const boost = dist < 180 ? (1 - dist / 180) * 0.25 : 0;
        const col = state.isLight ? `30,41,59` : `${r1},${g1},${b1}`;
        ctx.font = `${p.size}px Georgia, "Times New Roman", serif`;
        ctx.fillStyle = `rgba(${col},${Math.min(0.5, p.alpha + boost).toFixed(3)})`;
        ctx.fillText(p.text, p.x, p.y);
      }
    }

    drawRipples(r2, g2, b2);
    rafId = requestAnimationFrame(render);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (!paused && state.mode !== 'static') {
      rafId = requestAnimationFrame(render);
    } else if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
  }

  global.BgEngine = {
    init() {
      canvas = document.getElementById('bg-canvas');
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      syncThemeColors();
      resize();

      global.addEventListener('resize', resize, { passive: true });
      global.addEventListener('pointermove', (e) => {
        if (!pointer.active) {
          pointer.x = e.clientX;
          pointer.y = e.clientY;
        }
        pointer.tx = e.clientX;
        pointer.ty = e.clientY;
        pointer.active = true;
      }, { passive: true });
      global.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });
      global.addEventListener('pointerdown', (e) => spawnRipple(e.clientX, e.clientY), { passive: true });
      document.addEventListener('visibilitychange', () => {
        paused = document.hidden;
        if (!paused) startLoop();
      });

      startLoop();
    },
    configure(opts = {}) {
      let needRebuild = false;
      if (opts.mode && opts.mode !== state.mode) {
        state.mode = opts.mode;
        needRebuild = true;
      }
      if (typeof opts.speed === 'number') state.speed = Math.min(2.5, Math.max(0.2, opts.speed));
      if (typeof opts.density === 'number' && opts.density !== state.density) {
        state.density = Math.min(1.8, Math.max(0.4, opts.density));
        needRebuild = true;
      }
      if (typeof opts.clickRipples === 'boolean') state.clickRipples = opts.clickRipples;
      if (typeof opts.customImage === 'string') state.customImage = opts.customImage.trim();

      syncThemeColors();
      applyCustomImage();
      if (needRebuild && canvas) rebuildScene();
      startLoop();
    },
    refreshColors() {
      syncThemeColors();
    }
  };
})(window);
