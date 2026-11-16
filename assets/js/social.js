/**
 * Decentralized Real-Time Global Chat & Global Leaderboards
 * Uses cryptographically signed NIP-01 events across multiple public WSS relays
 * (persistent global history + real-time live stream, zero API keys, unforgeable profiles)
 * with seamless BroadcastChannel + localStorage fallback when offline or behind strict firewalls.
 */
(function (global) {
  'use strict';

  const RELAYS = [
    'wss://nos.lol',
    'wss://relay.damus.io',
    'wss://relay.primal.net',
    'wss://offchain.pub'
  ];

  const APP_NS = 'estudoescolar-sfs-v1';
  const CHAT_TAG_PREFIX = APP_NS + '-chat-';
  const LB_TAG = APP_NS + '-lb';
  const CHAT_CACHE_KEY = 'ee_chat_cache_v1';
  const LB_CACHE_KEY = 'ee_lb_cache_v1';
  const MUTED_KEY = 'ee_chat_muted_v1';

  const CHANNELS = [
    { id: 'geral', label: '# geral', desc: 'Bate-papo global em tempo real' },
    { id: 'recomendacoes', label: '# dicas', desc: 'Indique e compartilhe seus jogos favoritos' },
    { id: 'recordes', label: '# recordes', desc: 'Desafios, conquistas e marcas dos jogadores' }
  ];

  const sockets = new Map();
  let bc = null;
  let activeChannel = 'geral';
  let chatOpen = false;
  let unreadCount = 0;
  let lastSendAt = 0;
  let lastLbPublishAt = 0;
  let connectedCount = 0;

  // Map<eventId, msgObj>
  const messages = new Map();
  // Map<pubkey, lbEntry>
  const leaderboard = new Map();
  let mutedPubkeys = new Set();

  const chatListeners = new Set();
  const lbListeners = new Set();
  const statusListeners = new Set();

  function loadCaches() {
    try {
      const savedMsgs = JSON.parse(localStorage.getItem(CHAT_CACHE_KEY) || '[]');
      if (Array.isArray(savedMsgs)) {
        savedMsgs.slice(-150).forEach(m => { if (m && m.id) messages.set(m.id, m); });
      }
    } catch (_) {}
    try {
      const savedLb = JSON.parse(localStorage.getItem(LB_CACHE_KEY) || '[]');
      if (Array.isArray(savedLb)) {
        savedLb.slice(0, 120).forEach(e => { if (e && e.pubkey) leaderboard.set(e.pubkey, e); });
      }
    } catch (_) {}
    try {
      const savedMuted = JSON.parse(localStorage.getItem(MUTED_KEY) || '[]');
      if (Array.isArray(savedMuted)) mutedPubkeys = new Set(savedMuted);
    } catch (_) {}
  }

  function persistChatCache() {
    try {
      const arr = Array.from(messages.values())
        .sort((a, b) => a.ts - b.ts)
        .slice(-150);
      localStorage.setItem(CHAT_CACHE_KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  function persistLbCache() {
    try {
      const arr = Array.from(leaderboard.values())
        .sort((a, b) => (b.xp || 0) - (a.xp || 0))
        .slice(0, 120);
      localStorage.setItem(LB_CACHE_KEY, JSON.stringify(arr));
    } catch (_) {}
  }

  function notifyChat() { chatListeners.forEach(fn => { try { fn(); } catch (_) {} }); }
  function notifyLb() { lbListeners.forEach(fn => { try { fn(); } catch (_) {} }); }
  function notifyStatus() {
    statusListeners.forEach(fn => {
      try { fn({ connectedCount, totalRelays: RELAYS.length, unreadCount }); } catch (_) {}
    });
  }

  function sanitizeStr(val, maxLen) {
    if (typeof val !== 'string') return '';
    return val.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLen);
  }

  async function ingestEvent(ev, isLive = false) {
    if (!ev || typeof ev !== 'object' || !ev.id || !ev.pubkey || !Array.isArray(ev.tags)) return;
    if (mutedPubkeys.has(ev.pubkey)) return;

    const tTag = ev.tags.find(t => t[0] === 't' && typeof t[1] === 'string');
    if (!tTag) return;
    const topic = tTag[1];

    // Verify cryptographic signature so entries cannot be forged
    if (global.NostrCrypto) {
      const valid = await global.NostrCrypto.verifyEvent(ev);
      if (!valid) return;
    }

    if (topic.startsWith(CHAT_TAG_PREFIX)) {
      if (messages.has(ev.id)) return;
      const ch = topic.slice(CHAT_TAG_PREFIX.length);
      if (!CHANNELS.some(c => c.id === ch)) return;

      let parsed;
      try { parsed = JSON.parse(ev.content); } catch (_) { return; }
      const text = sanitizeStr(parsed.text, 360);
      const name = sanitizeStr(parsed.name, 24);
      if (!text || !name) return;

      const msg = {
        id: ev.id,
        pubkey: ev.pubkey,
        channel: ch,
        name,
        avatar: sanitizeStr(parsed.avatar, 6) || '🎮',
        color: /^#[0-9a-fA-F]{6}$/.test(parsed.color) ? parsed.color : '#818cf8',
        level: Math.max(1, Math.min(999, Number(parsed.level) || 1)),
        text,
        gameId: sanitizeStr(parsed.gameId, 32),
        gameName: sanitizeStr(parsed.gameName, 64),
        ts: Math.min(Date.now() + 60000, (Number(ev.created_at) || Math.floor(Date.now() / 1000)) * 1000)
      };

      messages.set(msg.id, msg);
      persistChatCache();

      const me = global.ProfileStore ? global.ProfileStore.get() : null;
      const isMine = me && me.pubKey === msg.pubkey;
      if (isLive && !isMine && !chatOpen) {
        unreadCount = Math.min(99, unreadCount + 1);
        if (global.SoundFX) global.SoundFX.chat();
        notifyStatus();
      }
      notifyChat();
    } else if (topic === LB_TAG) {
      let parsed;
      try { parsed = JSON.parse(ev.content); } catch (_) { return; }
      const name = sanitizeStr(parsed.name, 24);
      if (name.length < 2) return;

      const ts = (Number(ev.created_at) || 0) * 1000;
      const existing = leaderboard.get(ev.pubkey);
      if (existing && existing.ts > ts) return;

      // Plausibility clamp so leaderboard stays fair & clean
      const entry = {
        pubkey: ev.pubkey,
        name,
        avatar: sanitizeStr(parsed.avatar, 6) || '🎮',
        color: /^#[0-9a-fA-F]{6}$/.test(parsed.color) ? parsed.color : '#818cf8',
        title: sanitizeStr(parsed.title, 32) || 'Jogador',
        xp: Math.max(0, Math.min(5000000, Math.floor(Number(parsed.xp) || 0))),
        playSeconds: Math.max(0, Math.min(36000000, Math.floor(Number(parsed.playSeconds) || 0))),
        gamesPlayed: Math.max(0, Math.min(5000, Math.floor(Number(parsed.gamesPlayed) || 0))),
        favoritesCount: Math.max(0, Math.min(5000, Math.floor(Number(parsed.favoritesCount) || 0))),
        achievements: Math.max(0, Math.min(50, Math.floor(Number(parsed.achievements) || 0))),
        streak: Math.max(1, Math.min(9999, Math.floor(Number(parsed.streak) || 1))),
        currentGame: sanitizeStr(parsed.currentGame, 60),
        ts
      };

      leaderboard.set(ev.pubkey, entry);
      persistLbCache();
      notifyLb();
    }
  }

  function updateConnectedCount() {
    let n = 0;
    sockets.forEach(s => { if (s && s.ws && s.ws.readyState === WebSocket.OPEN) n++; });
    if (n !== connectedCount) {
      connectedCount = n;
      notifyStatus();
    }
  }

  function subscribeRelay(ws) {
    try {
      const chatTags = CHANNELS.map(c => CHAT_TAG_PREFIX + c.id);
      ws.send(JSON.stringify(['REQ', 'ee-chat', { kinds: [1], '#t': chatTags, limit: 80 }]));
      ws.send(JSON.stringify(['REQ', 'ee-lb', { kinds: [30078], '#t': [LB_TAG], limit: 100 }]));
    } catch (_) {}
  }

  function connectRelay(url) {
    if (typeof WebSocket === 'undefined') return;
    const state = sockets.get(url) || { ws: null, retries: 0, eose: false };
    sockets.set(url, state);

    try {
      const ws = new WebSocket(url);
      state.ws = ws;
      state.eose = false;

      ws.onopen = () => {
        state.retries = 0;
        updateConnectedCount();
        subscribeRelay(ws);
        // Sync local player's profile onto newly connected relay if named
        if (global.ProfileStore && global.ProfileStore.hasName()) {
          publishLeaderboard(false);
        }
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (!Array.isArray(msg)) return;
          if (msg[0] === 'EOSE' && msg[1] === 'ee-chat') {
            state.eose = true;
          } else if (msg[0] === 'EVENT' && msg[2]) {
            ingestEvent(msg[2], state.eose && msg[1] === 'ee-chat');
          }
        } catch (_) {}
      };

      const handleClose = () => {
        updateConnectedCount();
        state.retries = Math.min(6, state.retries + 1);
        const delay = Math.min(60000, 3500 * Math.pow(1.8, state.retries));
        setTimeout(() => {
          if (!document.hidden) connectRelay(url);
        }, delay);
      };

      ws.onerror = () => {};
      ws.onclose = handleClose;
    } catch (_) {}
  }

  function broadcastEvent(ev) {
    const frame = JSON.stringify(['EVENT', ev]);
    sockets.forEach(s => {
      if (s && s.ws && s.ws.readyState === WebSocket.OPEN) {
        try { s.ws.send(frame); } catch (_) {}
      }
    });
    if (bc) {
      try { bc.postMessage({ type: 'nostr-event', ev }); } catch (_) {}
    }
  }

  async function sendChatMessage(text, sharedGame = null) {
    if (!global.ProfileStore || !global.ProfileStore.hasName()) {
      return { ok: false, reason: 'need_name' };
    }
    const now = Date.now();
    if (now - lastSendAt < 1800) {
      return { ok: false, reason: 'rate_limit' };
    }
    const clean = sanitizeStr(text, 360);
    if (!clean) return { ok: false, reason: 'empty' };

    const p = global.ProfileStore.get();
    const lvl = global.ProfileStore.getLevel().level;
    const payload = {
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      level: lvl,
      text: clean
    };
    if (sharedGame && sharedGame.id) {
      payload.gameId = sharedGame.id;
      payload.gameName = sharedGame.n;
    }

    const topic = CHAT_TAG_PREFIX + activeChannel;
    const ev = await global.NostrCrypto.signEvent({
      kind: 1,
      tags: [['t', topic], ['client', 'EstudoEscolar']],
      content: JSON.stringify(payload)
    }, p.privKey);

    lastSendAt = now;
    await ingestEvent(ev, false);
    broadcastEvent(ev);
    global.ProfileStore.recordChatMessage();
    publishLeaderboard(false);
    return { ok: true };
  }

  async function publishLeaderboard(force = false) {
    if (!global.ProfileStore || !global.ProfileStore.hasName()) return;
    const now = Date.now();
    if (!force && now - lastLbPublishAt < 12000) return;
    lastLbPublishAt = now;

    const p = global.ProfileStore.get();
    if (!p.privKey) return;

    const localEntry = {
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      title: p.title,
      xp: p.xp,
      playSeconds: p.playSeconds,
      gamesPlayed: p.playedIds.length,
      favoritesCount: p.favorites.length,
      achievements: p.unlocked.length,
      streak: p.streak || 1,
      currentGame: p.currentGame || ''
    };

    try {
      // NIP-78 parameterized replaceable event (1 live record per player pubkey!)
      const ev = await global.NostrCrypto.signEvent({
        kind: 30078,
        tags: [['d', LB_TAG], ['t', LB_TAG]],
        content: JSON.stringify(localEntry)
      }, p.privKey);
      await ingestEvent(ev, false);
      broadcastEvent(ev);
    } catch (_) {}
  }

  function syncLocalPlayerToMemory() {
    if (!global.ProfileStore) return;
    const p = global.ProfileStore.get();
    if (!p.pubKey) return;
    if (p.name && p.name.trim().length >= 2) {
      leaderboard.set(p.pubKey, {
        pubkey: p.pubKey,
        name: p.name.trim(),
        avatar: p.avatar,
        color: p.color,
        title: p.title,
        xp: p.xp,
        playSeconds: p.playSeconds,
        gamesPlayed: p.playedIds.length,
        favoritesCount: p.favorites.length,
        achievements: p.unlocked.length,
        streak: p.streak || 1,
        currentGame: p.currentGame || '',
        ts: Date.now()
      });
      persistLbCache();
    } else {
      leaderboard.delete(p.pubKey);
    }
    notifyLb();
  }

  global.SocialHub = {
    CHANNELS,
    init() {
      loadCaches();
      syncLocalPlayerToMemory();

      if (global.ProfileStore) {
        global.ProfileStore.subscribe(() => syncLocalPlayerToMemory());
      }

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          bc = new BroadcastChannel(APP_NS);
          bc.onmessage = (e) => {
            if (e.data && e.data.type === 'nostr-event') {
              ingestEvent(e.data.ev, true);
            }
          };
        } catch (_) {}
      }

      // Defer relay connections slightly so page paint is instant
      setTimeout(() => {
        RELAYS.forEach(url => connectRelay(url));
      }, 400);
    },
    getActiveChannel() { return activeChannel; },
    setChannel(ch) {
      if (CHANNELS.some(c => c.id === ch)) {
        activeChannel = ch;
        notifyChat();
      }
    },
    setChatOpen(isOpen) {
      chatOpen = !!isOpen;
      if (chatOpen && unreadCount > 0) {
        unreadCount = 0;
        notifyStatus();
      }
    },
    getMessages(channel = activeChannel) {
      return Array.from(messages.values())
        .filter(m => m.channel === channel && !mutedPubkeys.has(m.pubkey))
        .sort((a, b) => a.ts - b.ts)
        .slice(-100);
    },
    getLeaderboard(sortBy = 'xp') {
      syncLocalPlayerToMemory();
      const arr = Array.from(leaderboard.values()).filter(e => e.name && e.name.length >= 2 && !mutedPubkeys.has(e.pubkey));
      const keyMap = {
        xp: e => e.xp || 0,
        time: e => e.playSeconds || 0,
        games: e => e.gamesPlayed || 0,
        streak: e => e.streak || 0
      };
      const getter = keyMap[sortBy] || keyMap.xp;
      return arr.sort((a, b) => (getter(b) - getter(a)) || ((b.xp || 0) - (a.xp || 0)));
    },
    muteUser(pubkey) {
      if (!pubkey) return;
      mutedPubkeys.add(pubkey);
      try { localStorage.setItem(MUTED_KEY, JSON.stringify(Array.from(mutedPubkeys))); } catch (_) {}
      notifyChat();
      notifyLb();
    },
    getStatus() {
      return { connectedCount, totalRelays: RELAYS.length, unreadCount };
    },
    sendChatMessage,
    publishLeaderboard,
    onChat(fn) { chatListeners.add(fn); return () => chatListeners.delete(fn); },
    onLeaderboard(fn) { lbListeners.add(fn); return () => lbListeners.delete(fn); },
    onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); }
  };
})(window);
