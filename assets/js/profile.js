/**
 * Player Profile, Favorites, Recent History, XP/Levels, Daily Streak & Achievements
 * Leaderboard & Global Chat activate automatically once the user sets a profile name.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'ee_profile_v1';

  const AVATARS = [
    '🎮', '🦊', '🐉', '👾', '⚡', '🔥', '🌙', '🦆',
    '🎯', '🚀', '💎', '👑', '🐱', '🐺', '⚔️', '🎧',
    '🕹️', '🌟', '🧊', '🍀', '🦈', '🦉', '🎭', '🛸'
  ];

  const NAME_COLORS = [
    '#818cf8', '#22d3ee', '#34d399', '#fbbf24',
    '#fb7185', '#c084fc', '#f97316', '#38bdf8'
  ];

  const TITLES = [
    'Estudante Disfarçado',
    'Caçador de Joias',
    'Mestre dos Ports',
    'Speedrunner',
    'Lenda do Recreio',
    'Explorador Retrô',
    'Viciado em Indie',
    'Pro Player'
  ];

  const ACHIEVEMENTS = [
    { id: 'first_play', icon: '🎮', name: 'Primeira Sessão', desc: 'Abriu seu primeiro jogo em about:blank', xp: 50, check: s => s.totalLaunches >= 1 },
    { id: 'profile_set', icon: '🪪', name: 'Identidade Revelada', desc: 'Configurou um nome no seu perfil para o Ranking', xp: 75, check: s => !!s.name.trim() },
    { id: 'explorer_5', icon: '🧭', name: 'Explorador Curioso', desc: 'Jogou 5 jogos diferentes do catálogo', xp: 100, check: s => s.playedIds.length >= 5 },
    { id: 'explorer_20', icon: '🌍', name: 'Veterano do Catálogo', desc: 'Jogou 20 jogos diferentes', xp: 250, check: s => s.playedIds.length >= 20 },
    { id: 'fav_1', icon: '❤️', name: 'Primeiro Favorito', desc: 'Adicionou um jogo à sua coleção de Favoritos', xp: 40, check: s => s.favorites.length >= 1 },
    { id: 'fav_10', icon: '⭐', name: 'Curador Pessoal', desc: 'Guardou 10 jogos nos Favoritos', xp: 150, check: s => s.favorites.length >= 10 },
    { id: 'gem_hunter', icon: '💎', name: 'Garimpeiro de Joias', desc: 'Descobriu 3 jogos da coleção Joias Escondidas', xp: 120, check: s => s.gemsPlayed >= 3 },
    { id: 'port_master', icon: '🖥️', name: 'Mestre dos Ports', desc: 'Jogou 3 ports de PC ou Console', xp: 120, check: s => s.portsPlayed >= 3 },
    { id: 'play_30m', icon: '⏱️', name: 'Meia Hora de Diversão', desc: 'Acumulou 30 minutos de jogo', xp: 160, check: s => s.playSeconds >= 1800 },
    { id: 'play_2h', icon: '🔥', name: 'Maratonista', desc: 'Acumulou 2 horas jogando no portal', xp: 350, check: s => s.playSeconds >= 7200 },
    { id: 'social_msg', icon: '💬', name: 'Voz da Galera', desc: 'Enviou uma mensagem no Chat Global', xp: 80, check: s => s.chatMessages >= 1 },
    { id: 'customizer', icon: '🎨', name: 'Estilo Próprio', desc: 'Personalizou o tema, cursor ou background', xp: 60, check: s => s.customized >= 1 }
  ];

  let state = {
    name: '',
    avatar: '🎮',
    color: '#818cf8',
    title: 'Estudante Disfarçado',
    xp: 0,
    playSeconds: 0,
    totalLaunches: 0,
    favorites: [],
    recents: [],      // [{ id, ts }]
    playedIds: [],
    gemsPlayed: 0,
    portsPlayed: 0,
    chatMessages: 0,
    customized: 0,
    streak: 1,
    lastDay: '',
    unlocked: [],
    currentGame: '',
    privKey: '',
    pubKey: ''
  };

  const listeners = new Set();

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function yesterdayStr() {
    const d = new Date(Date.now() - 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function ensureKeys() {
    if ((!state.privKey || state.privKey.length !== 64) && global.NostrCrypto) {
      state.privKey = global.NostrCrypto.generateSecretKey();
    }
    if (state.privKey && !state.pubKey && global.NostrCrypto) {
      try { state.pubKey = global.NostrCrypto.getPublicKey(state.privKey); } catch (_) {}
    }
  }

  function updateStreak() {
    const today = todayStr();
    if (state.lastDay === today) return;
    if (state.lastDay === yesterdayStr()) {
      state.streak = (state.streak || 1) + 1;
      state.xp += 35;
    } else if (state.lastDay) {
      state.streak = 1;
    } else {
      state.streak = 1;
    }
    state.lastDay = today;
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (raw && typeof raw === 'object') {
        state = {
          ...state,
          ...raw,
          favorites: Array.isArray(raw.favorites) ? raw.favorites : [],
          recents: Array.isArray(raw.recents) ? raw.recents : [],
          playedIds: Array.isArray(raw.playedIds) ? raw.playedIds : [],
          unlocked: Array.isArray(raw.unlocked) ? raw.unlocked : []
        };
      }
    } catch (_) {}
    ensureKeys();
    updateStreak();
    save(false);
  }

  function save(notify = true) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    if (notify) {
      listeners.forEach(fn => { try { fn(state); } catch (_) {} });
    }
  }

  function checkAchievements() {
    let gained = false;
    for (const ach of ACHIEVEMENTS) {
      if (!state.unlocked.includes(ach.id) && ach.check(state)) {
        state.unlocked.push(ach.id);
        state.xp += ach.xp;
        gained = true;
        if (global.SoundFX) global.SoundFX.achievement();
        if (global.UI && global.UI.toast) {
          global.UI.toast(`${ach.icon} Conquista: ${ach.name} (+${ach.xp} XP)`, 'achievement');
        }
      }
    }
    if (gained) save(true);
    return gained;
  }

  function computeLevel(xp) {
    // Smooth curve: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 250 XP, Level 4 = 450 XP...
    let lvl = 1;
    let req = 100;
    let rem = Math.max(0, Math.floor(xp || 0));
    while (rem >= req) {
      rem -= req;
      lvl++;
      req = Math.round(100 + (lvl - 1) * 65);
    }
    return { level: lvl, currentXp: rem, nextXp: req, pct: Math.min(100, Math.round((rem / req) * 100)) };
  }

  function formatPlaytime(seconds) {
    const s = Math.max(0, Math.floor(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m} min`;
    return `${s}s`;
  }

  global.ProfileStore = {
    AVATARS,
    NAME_COLORS,
    TITLES,
    ACHIEVEMENTS,
    init() { load(); },
    get() { return { ...state }; },
    hasName() { return state.name.trim().length >= 2; },
    getLevel() { return computeLevel(state.xp); },
    computeLevel,
    formatPlaytime,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setProfile({ name, avatar, color, title }) {
      if (typeof name === 'string') {
        state.name = name.replace(/[\r\n\t<>]/g, '').trim().slice(0, 24);
      }
      if (avatar && AVATARS.includes(avatar)) state.avatar = avatar;
      if (color && /^#[0-9a-fA-F]{6}$/.test(color)) state.color = color;
      if (typeof title === 'string' && title.trim()) state.title = title.trim().slice(0, 32);
      checkAchievements();
      save(true);
      if (global.SocialHub && state.name.length >= 2) {
        global.SocialHub.publishLeaderboard(true);
      }
    },
    isFavorite(gameId) {
      return state.favorites.includes(gameId);
    },
    toggleFavorite(gameId) {
      const idx = state.favorites.indexOf(gameId);
      let added = false;
      if (idx >= 0) {
        state.favorites.splice(idx, 1);
      } else {
        state.favorites.unshift(gameId);
        added = true;
        if (state.favorites.length <= 30) state.xp += 10;
      }
      if (global.SoundFX) global.SoundFX.fav(added);
      checkAchievements();
      save(true);
      return added;
    },
    recordLaunch(game) {
      if (!game) return;
      state.totalLaunches++;
      state.currentGame = game.n || '';
      const isNew = !state.playedIds.includes(game.id);
      if (isNew) {
        state.playedIds.push(game.id);
        state.xp += 30;
        if (Array.isArray(game.k)) {
          if (game.k.includes('joias')) state.gemsPlayed++;
          if (game.k.includes('ports')) state.portsPlayed++;
        }
      } else {
        state.xp += 8;
      }
      state.recents = [{ id: game.id, ts: Date.now() }, ...state.recents.filter(r => r.id !== game.id)].slice(0, 60);
      checkAchievements();
      save(true);
      if (global.SocialHub && state.name.length >= 2) {
        global.SocialHub.publishLeaderboard(false);
      }
    },
    addPlaySeconds(sec) {
      if (sec <= 0) return;
      state.playSeconds += sec;
      // Award 5 XP per 30 seconds of active gaming
      state.xp += Math.max(1, Math.round(sec / 6));
      checkAchievements();
      save(true);
      if (global.SocialHub && state.name.length >= 2) {
        global.SocialHub.publishLeaderboard(false);
      }
    },
    clearCurrentGame() {
      if (state.currentGame) {
        state.currentGame = '';
        save(true);
      }
    },
    recordChatMessage() {
      state.chatMessages++;
      state.xp += 12;
      checkAchievements();
      save(true);
    },
    recordCustomization() {
      if (state.customized === 0) {
        state.customized = 1;
        checkAchievements();
        save(true);
      }
    },
    exportBackup() {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        profile: { ...state, privKey: state.privKey },
        settings: localStorage.getItem('ee_settings_v1'),
        cloak: localStorage.getItem('ee_cloak_v1')
      };
      return JSON.stringify(payload, null, 2);
    },
    importBackup(jsonStr) {
      const data = JSON.parse(jsonStr);
      if (!data || !data.profile || typeof data.profile !== 'object') {
        throw new Error('Arquivo de backup inválido');
      }
      state = { ...state, ...data.profile };
      ensureKeys();
      save(true);
      if (data.settings) localStorage.setItem('ee_settings_v1', data.settings);
      if (data.cloak) localStorage.setItem('ee_cloak_v1', data.cloak);
      return true;
    }
  };
})(window);
