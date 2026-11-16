/**
 * Custom Cursor Engine
 * Styles: neon, pixel, sword, comet, crosshair, duck, pencil, default
 * Auto-disables on touch/coarse pointer devices, supports particle trails & size scaling.
 */
(function (global) {
  'use strict';

  const SVG_SHAPES = {
    neon: `<svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="3.4" fill="var(--accent-2)"/><circle cx="14" cy="14" r="5.5" fill="var(--accent)" opacity="0.3"/></svg>`,
    pixel: `<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><path d="M3 2h2v2h2v2h2v2h2v2h2v2h2v2h-5v2h2v4h-3v-4H7v2H5v2H3V2z" fill="var(--accent)" stroke="#fff" stroke-width="1.4"/></svg>`,
    sword: `<svg viewBox="0 0 28 28" fill="none"><path d="M4 4l13 5-3.5 3.5 7.5 7.5-2 2-7.5-7.5L8 18 4 4z" fill="var(--accent-2)" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><circle cx="21" cy="21" r="2" fill="var(--accent)"/></svg>`,
    comet: `<svg viewBox="0 0 28 28" fill="none"><path d="M14 2l3.1 7.6 8.2.7-6.2 5.4 1.9 8-7-4.3-7 4.3 1.9-8-6.2-5.4 8.2-.7L14 2z" fill="var(--accent-2)" stroke="var(--accent)" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    crosshair: `<svg viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="7.5" stroke="var(--accent-2)" stroke-width="1.6"/><path d="M14 2v6M14 20v6M2 14h6M20 14h6" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/><circle cx="14" cy="14" r="1.8" fill="#fff"/></svg>`,
    duck: `<svg viewBox="0 0 28 28" fill="none"><circle cx="12" cy="11" r="6.5" fill="#fbbf24" stroke="#78350f" stroke-width="1.2"/><ellipse cx="14.5" cy="19" rx="8" ry="5.5" fill="#f59e0b" stroke="#78350f" stroke-width="1.2"/><path d="M6 11.5l-4 1.5 4 1.8z" fill="#f97316" stroke="#78350f" stroke-width="0.9"/><circle cx="10.2" cy="9.8" r="1.3" fill="#0f172a"/></svg>`,
    pencil: `<svg viewBox="0 0 28 28" fill="none"><path d="M4 4l4 10 11 11 6-6L14 8 4 4z" fill="#fbbf24" stroke="#0f172a" stroke-width="1.3" stroke-linejoin="round"/><path d="M4 4l2.4 6 3.6-3.6L4 4z" fill="#1e293b"/><path d="M19 25l6-6-2.5-2.5-6 6L19 25z" fill="#f472b6" stroke="#0f172a" stroke-width="1.1"/></svg>`
  };

  // Hotspot alignment offsets (px) so clicks feel razor-accurate
  const HOTSPOTS = {
    neon: [-14, -14],
    pixel: [-3, -2],
    sword: [-4, -4],
    comet: [-14, -14],
    crosshair: [-14, -14],
    duck: [-4, -12],
    pencil: [-4, -4]
  };

  let dotEl, ringEl, trailContainer;
  let rafId = null;
  let isTouch = false;

  const cfg = {
    style: 'neon',
    trail: true,
    scale: 1
  };

  const pos = { x: -100, y: -100, rx: -100, ry: -100, visible: false, hover: false, down: false };
  let lastTrailTime = 0;

  function detectCoarse() {
    return global.matchMedia && global.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  function applyDomState() {
    const active = !isTouch && cfg.style !== 'default' && !document.body.classList.contains('panic-active');
    document.documentElement.classList.toggle('custom-cursor-on', active);
    if (!dotEl || !ringEl) return;
    if (!active) {
      dotEl.style.opacity = '0';
      ringEl.style.opacity = '0';
      return;
    }
    dotEl.innerHTML = SVG_SHAPES[cfg.style] || SVG_SHAPES.neon;
    dotEl.dataset.style = cfg.style;
    ringEl.style.display = (cfg.style === 'neon' || cfg.style === 'comet' || cfg.style === 'crosshair') ? 'block' : 'none';
  }

  function spawnTrailParticle(x, y) {
    if (!cfg.trail || !trailContainer || cfg.style === 'default' || document.body.classList.contains('panic-active')) return;
    const now = performance.now();
    if (now - lastTrailTime < 34) return;
    lastTrailTime = now;

    const p = document.createElement('span');
    p.className = 'cursor-spark';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    trailContainer.appendChild(p);
    setTimeout(() => p.remove(), 460);
  }

  function loop() {
    if (!isTouch && cfg.style !== 'default' && pos.visible && !document.body.classList.contains('panic-active')) {
      pos.rx += (pos.x - pos.rx) * 0.22;
      pos.ry += (pos.y - pos.ry) * 0.22;

      const [ox, oy] = HOTSPOTS[cfg.style] || [-14, -14];
      const pressScale = pos.down ? 0.84 : (pos.hover ? 1.14 : 1);
      const s = (cfg.scale * pressScale).toFixed(3);
      dotEl.style.opacity = '1';
      dotEl.style.transform = `translate3d(${(pos.x + ox * cfg.scale).toFixed(1)}px, ${(pos.y + oy * cfg.scale).toFixed(1)}px, 0) scale(${s})`;

      if (ringEl.style.display !== 'none') {
        const ringSize = pos.down ? 26 : (pos.hover ? 46 : 34);
        const half = (ringSize * cfg.scale) / 2;
        ringEl.style.width = (ringSize * cfg.scale) + 'px';
        ringEl.style.height = (ringSize * cfg.scale) + 'px';
        ringEl.style.opacity = pos.hover ? '0.9' : '0.52';
        ringEl.style.transform = `translate3d(${(pos.rx - half).toFixed(1)}px, ${(pos.ry - half).toFixed(1)}px, 0)`;
        ringEl.classList.toggle('is-hover', pos.hover);
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  global.CursorEngine = {
    init() {
      dotEl = document.getElementById('cursor-dot');
      ringEl = document.getElementById('cursor-ring');
      trailContainer = document.getElementById('cursor-trail');
      if (!dotEl || !ringEl) return;

      isTouch = detectCoarse();
      applyDomState();

      global.addEventListener('mousemove', (e) => {
        if (isTouch) return;
        if (!pos.visible) {
          pos.rx = e.clientX;
          pos.ry = e.clientY;
        }
        pos.x = e.clientX;
        pos.y = e.clientY;
        pos.visible = true;

        const target = e.target;
        pos.hover = !!(target && target.closest && target.closest('button, a, input, select, textarea, label, [role="button"], .game-card, .collection-tile'));
        spawnTrailParticle(e.clientX, e.clientY);
      }, { passive: true });

      global.addEventListener('mousedown', () => { pos.down = true; }, { passive: true });
      global.addEventListener('mouseup', () => { pos.down = false; }, { passive: true });
      document.addEventListener('mouseleave', () => {
        pos.visible = false;
        if (dotEl) dotEl.style.opacity = '0';
        if (ringEl) ringEl.style.opacity = '0';
      });

      if (!rafId) rafId = requestAnimationFrame(loop);
    },
    configure(opts = {}) {
      if (opts.style && (SVG_SHAPES[opts.style] || opts.style === 'default')) {
        cfg.style = opts.style;
      }
      if (typeof opts.trail === 'boolean') cfg.trail = opts.trail;
      if (typeof opts.scale === 'number') cfg.scale = Math.min(1.5, Math.max(0.75, opts.scale));
      applyDomState();
    },
    refresh() {
      applyDomState();
    },
    getConfig() {
      return { ...cfg };
    }
  };
})(window);
