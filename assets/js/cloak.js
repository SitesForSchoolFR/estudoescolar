/**
 * School Disguise Suite:
 * 1) Tab Cloak (Title + Favicon presets & custom, shared with about:blank windows)
 * 2) Instant Panic Mode (Interactive Brazilian School Study Quiz overlay + optional redirect)
 * 3) Launch entire portal inside an about:blank iframe wrapper
 */
(function (global) {
  'use strict';

  const PRESETS = {
    estudoescolar: {
      label: 'Estudo Escolar (Padrão)',
      title: 'Estudo Escolar — Quizzes, Resumos e Atividades',
      icon: 'favicon.svg'
    },
    classroom: {
      label: 'Google Sala de Aula',
      title: 'Turmas — Google Sala de Aula',
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f9d58"/><rect x="8" y="10" width="48" height="44" rx="6" fill="#1e8e3e" stroke="#fbbc04" stroke-width="4"/><circle cx="32" cy="27" r="6" fill="#fff"/><path d="M20 43c0-6 5.4-10 12-10s12 4 12 10" fill="#fff"/></svg>')
    },
    docs: {
      label: 'Google Documentos',
      title: 'Resumo de História - 3º Bimestre - Documentos Google',
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M14 6h24l12 12v40a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="#4285f4"/><path d="M38 6v12h12z" fill="#a1c2fa"/><path d="M18 28h28v3H18zm0 8h28v3H18zm0 8h20v3H18z" fill="#fff"/></svg>')
    },
    drive: {
      label: 'Google Drive',
      title: 'Meu Drive — Google Drive',
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="24,10 40,10 58,40 42,40" fill="#fbbc04"/><polygon points="24,10 6,40 14,54 32,24" fill="#0f9d58"/><polygon points="14,54 50,54 58,40 22,40" fill="#4285f4"/></svg>')
    },
    khan: {
      label: 'Khan Academy',
      title: 'Funções Quadráticas | Matemática | Khan Academy',
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="32,4 58,19 58,45 32,60 6,45 6,19" fill="#14bf96"/><circle cx="32" cy="23" r="6" fill="#fff"/><path d="M16 32c0 12 16 18 16 18s16-6 16-18c-8 2-16 8-16 8s-8-6-16-8z" fill="#fff"/></svg>')
    },
    desmos: {
      label: 'Calculadora Desmos',
      title: 'Desmos | Calculadora Gráfica',
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#138943"/><path d="M8 46 Q 24 8, 36 32 T 56 16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>')
    },
    wikipedia: {
      label: 'Wikipédia',
      title: 'Revolução Industrial — Wikipédia, a enciclopédia livre',
      icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#f8f9fa" stroke="#cbd5e1" stroke-width="2"/><text x="32" y="45" text-anchor="middle" font-family="Georgia,serif" font-size="38" font-weight="bold" fill="#111">W</text></svg>')
    }
  };

  const QUIZ_BANK = [
    {
      subject: 'Matemática · Funções do 2º Grau',
      q: 'Considere a função f(x) = x² − 6x + 8. Quais são as raízes reais dessa função?',
      opts: ['x = 2 e x = 4', 'x = −2 e x = −4', 'x = 1 e x = 8', 'x = 3 e x = 5'],
      ans: 0,
      exp: 'Pela fórmula de Bhaskara: Δ = (−6)² − 4·1·8 = 36 − 32 = 4. Logo x = (6 ± 2)/2, resultando em x₁ = 2 e x₂ = 4.'
    },
    {
      subject: 'Biologia · Citologia',
      q: 'Qual organela citoplasmática é a principal responsável pela respiração celular aeróbica e produção de ATP?',
      opts: ['Complexo Golgiense', 'Mitocôndria', 'Lisossomo', 'Ribossomo'],
      ans: 1,
      exp: 'As mitocôndrias realizam o Ciclo de Krebs e a cadeia respiratória, sintetizando a maior parte do ATP celular.'
    },
    {
      subject: 'História do Brasil · Era Vargas',
      q: 'A Consolidação das Leis do Trabalho (CLT), marco dos direitos trabalhistas no Brasil, foi promulgada em:',
      opts: ['1922, no governo Epitácio Pessoa', '1930, no Governo Provisório', '1943, durante o Estado Novo', '1964, no governo João Goulart'],
      ans: 2,
      exp: 'A CLT foi sancionada pelo Decreto-Lei nº 5.452 em 1º de maio de 1943 por Getúlio Vargas, durante o Estado Novo.'
    },
    {
      subject: 'Física · Cinemática',
      q: 'Um móvel percorre 180 km em 2 horas e 30 minutos com velocidade constante. Qual é sua velocidade média?',
      opts: ['60 km/h', '72 km/h', '75 km/h', '90 km/h'],
      ans: 1,
      exp: 'Convertendo 2h30min para 2,5 h, temos Vm = Δs / Δt = 180 / 2,5 = 72 km/h (ou 20 m/s).'
    },
    {
      subject: 'Língua Portuguesa · Figuras de Linguagem',
      q: 'Na frase "Choveu uma eternidade naquela tarde de inverno", predomina qual figura de linguagem?',
      opts: ['Eufemismo', 'Hipérbole', 'Antítese', 'Prosopopeia'],
      ans: 1,
      exp: 'A hipérbole consiste no exagero intencional ("uma eternidade") para intensificar a expressividade do enunciado.'
    },
    {
      subject: 'Química · Estequiometria e Gases',
      q: 'Qual é o volume aproximado ocupado por 2 mols de um gás ideal nas CNTP (0 °C e 1 atm)?',
      opts: ['11,2 L', '22,4 L', '44,8 L', '67,2 L'],
      ans: 2,
      exp: 'Nas CNTP, 1 mol de gás ideal ocupa aproximadamente 22,4 L. Portanto, 2 mols ocupam 44,8 L.'
    },
    {
      subject: 'Geografia · Climatologia',
      q: 'O fenômeno caracterizado pelo aquecimento anormal das águas superficiais do Oceano Pacífico Equatorial é chamado de:',
      opts: ['La Niña', 'El Niño', 'Inversão Térmica', 'Monção Austral'],
      ans: 1,
      exp: 'O El Niño provoca aquecimento anômalo do Pacífico Equatorial, alterando o regime de chuvas em todo o Brasil.'
    }
  ];

  const STORAGE_KEY = 'ee_cloak_v1';
  let cfg = {
    preset: 'estudoescolar',
    customTitle: '',
    customIcon: '',
    panicKey: 'F9',
    panicUrl: ''
  };
  let quizIdx = 0;
  let quizHits = 0;
  let quizAnswered = false;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      cfg = { ...cfg, ...saved };
    } catch (_) {}
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (_) {}
  }

  function getActiveCloak() {
    if (cfg.preset === 'custom') {
      return {
        title: cfg.customTitle.trim() || PRESETS.estudoescolar.title,
        icon: cfg.customIcon.trim() || new URL('favicon.svg', global.location.href).href
      };
    }
    const p = PRESETS[cfg.preset] || PRESETS.estudoescolar;
    const iconHref = p.icon.startsWith('data:') || p.icon.startsWith('http')
      ? p.icon
      : new URL(p.icon, global.location.href).href;
    return { title: p.title, icon: iconHref };
  }

  function applyCloak() {
    const { title, icon } = getActiveCloak();
    document.title = title;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = icon;
  }

  function renderPanicQuestion() {
    const item = QUIZ_BANK[quizIdx % QUIZ_BANK.length];
    const subj = document.getElementById('panic-subject');
    const qEl = document.getElementById('panic-question');
    const optsEl = document.getElementById('panic-options');
    const fbEl = document.getElementById('panic-feedback');
    const progEl = document.getElementById('panic-progress');
    if (!qEl || !optsEl) return;

    quizAnswered = false;
    subj.textContent = item.subject;
    progEl.textContent = `Questão ${(quizIdx % QUIZ_BANK.length) + 1} de ${QUIZ_BANK.length} · Acertos: ${quizHits}`;
    qEl.textContent = item.q;
    fbEl.hidden = true;
    fbEl.textContent = '';
    optsEl.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];
    item.opts.forEach((optText, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'panic-opt';
      const badge = document.createElement('span');
      badge.className = 'panic-opt-letter';
      badge.textContent = letters[i];
      const txt = document.createElement('span');
      txt.textContent = optText;
      btn.append(badge, txt);
      btn.addEventListener('click', () => {
        if (quizAnswered) return;
        quizAnswered = true;
        const all = optsEl.querySelectorAll('.panic-opt');
        all.forEach((b, idx) => {
          if (idx === item.ans) b.classList.add('is-correct');
          else if (idx === i) b.classList.add('is-wrong');
        });
        if (i === item.ans) quizHits++;
        progEl.textContent = `Questão ${(quizIdx % QUIZ_BANK.length) + 1} de ${QUIZ_BANK.length} · Acertos: ${quizHits}`;
        fbEl.textContent = (i === item.ans ? 'Correto! ' : 'Revisão: ') + item.exp;
        fbEl.hidden = false;
      });
      optsEl.appendChild(btn);
    });
  }

  function togglePanic(forceState) {
    const overlay = document.getElementById('panic-overlay');
    if (!overlay) return;
    const next = typeof forceState === 'boolean' ? forceState : overlay.hidden;
    if (next && cfg.panicUrl && cfg.panicUrl.startsWith('http')) {
      global.location.replace(cfg.panicUrl);
      return;
    }
    overlay.hidden = !next;
    document.body.classList.toggle('panic-active', next);
    if (global.CursorEngine) global.CursorEngine.refresh();
    if (next) renderPanicQuestion();
  }

  function openSiteInAboutBlank() {
    const win = global.open('about:blank', '_blank');
    if (!win) {
      if (global.UI && global.UI.toast) {
        global.UI.toast('Pop-up bloqueado! Permita pop-ups no navegador para abrir em about:blank.', 'warn');
      }
      return false;
    }
    const { title, icon } = getActiveCloak();
    const siteUrl = global.location.href;
    const safeTitle = title.replace(/[<>&"]/g, '');
    const safeIcon = icon.replace(/"/g, '%22');
    const safeUrl = siteUrl.replace(/"/g, '%22');
    win.document.open();
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><link rel="icon" href="${safeIcon}"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#090b10}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${safeUrl}" allow="autoplay; fullscreen; gamepad; pointer-lock; clipboard-read; clipboard-write" allowfullscreen></iframe></body></html>`);
    win.document.close();
    if (global.UI && global.UI.toast) {
      global.UI.toast('Portal aberto camuflado em about:blank!', 'success');
    }
    return true;
  }

  global.CloakManager = {
    PRESETS,
    init() {
      load();
      applyCloak();

      const nextBtn = document.getElementById('panic-next-btn');
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          quizIdx++;
          renderPanicQuestion();
        });
      }
      const exitEl = document.getElementById('panic-secret-exit');
      if (exitEl) {
        exitEl.addEventListener('dblclick', () => togglePanic(false));
      }

      global.addEventListener('keydown', (e) => {
        if (cfg.panicKey && e.key.toLowerCase() === cfg.panicKey.toLowerCase()) {
          e.preventDefault();
          togglePanic();
        }
      });
    },
    getConfig() { return { ...cfg }; },
    getActiveCloak,
    update(patch) {
      cfg = { ...cfg, ...patch };
      save();
      applyCloak();
    },
    togglePanic,
    openSiteInAboutBlank
  };
})(window);
