/* Estudo Escolar — Portal Controller */
(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DEFAULTS={theme:'neon',accent:'#7A0F1B',accent2:'#C8102E',bgMode:'static',focus:false,bgSpeed:1,bgDensity:1,ripples:true,bgImage:'',cursor:'neon',cursorTrail:true,cursorScale:1,sound:true,volume:.6,cdn:0,hud:true,density:'normal',tilt:true,sort:'popular'};
let settings={...DEFAULTS}; try{Object.assign(settings,JSON.parse(localStorage.getItem('ee_settings_v1')||'{}'))}catch(e){}
if(settings.accent==='#6366f1'&&settings.accent2==='#22d3ee'){settings.accent=DEFAULTS.accent;settings.accent2=DEFAULTS.accent2} // redesign migration (cores padrão antigas)
let games=[],mirrors=null,collection='todos',query='',shown=60,currentGame=null,lbSort='xp';
const COLLECTIONS=[
 {id:'night',icon:'',label:'BlogPaste'},
 {id:'driveu7',icon:'',label:'Drive U-7'},{id:'bikesense',icon:'',label:'BikeSense'},{id:'todos',icon:'',label:'Todos os Jogos'},{id:'famosos',icon:'',label:'Famosos'},{id:'favoritos',icon:'',label:'Favoritos'},{id:'joias',icon:'',label:'Joias Escondidas'},{id:'recentes',icon:'',label:'Recentes'},{id:'ports',icon:'',label:'Ports de PC/Console'},{id:'acao',icon:'',label:'Ação'},{id:'corrida-esportes',icon:'',label:'Corrida & Esportes'},{id:'plataforma',icon:'',label:'Plataforma'},{id:'estrategia',icon:'',label:'Estratégia'},{id:'terror',icon:'',label:'Terror'},{id:'ritmo',icon:'',label:'Ritmo / FNF'},{id:'retro',icon:'',label:'Retrô'},{id:'multiplayer',icon:'',label:'Multiplayer'},{id:'mundos',icon:'',label:'Mundos Abertos'}];
const SOURCES={night:'BlogPaste · Night.Games',driveu7:'Drive U-7 · Unblocked Games G+',bikesense:'BikeSense · Achroma',mantle:'Mantle · Mineral','gn-math':'GN-Math','gn-math-v2':'GN-Math v2',duckmath:'DuckMath',p2p:'P2P · WebSight',ported2browser:'Ported2Browser'};
function saveSettings(){localStorage.setItem('ee_settings_v1',JSON.stringify(settings))}
function toast(msg,type='info'){const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;$('#toasts').appendChild(t);requestAnimationFrame(()=>t.classList.add('show'));setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300)},3600)}
window.UI={toast,showPopupBlockedPrompt(opts){const m=$('#popup-modal');m.hidden=false;$('#popup-open-btn').onclick=()=>{m.hidden=true;GameLauncher.launchRawOption(opts)}}};
function applySettings(){
 document.documentElement.dataset.theme=settings.theme;
 document.documentElement.style.setProperty('--accent',settings.accent);
 document.documentElement.style.setProperty('--accent-2',settings.accent2);
 SoundFX.configure({enabled:settings.sound,volume:settings.volume});
 BgEngine.configure({mode:settings.bgMode,speed:settings.bgSpeed,density:settings.bgDensity,clickRipples:settings.ripples,customImage:settings.bgImage});
 CursorEngine.configure({style:settings.cursor,trail:settings.cursorTrail,scale:settings.cursorScale});
 GameLauncher.configure({preferredCdnIdx:settings.cdn,hudEnabled:settings.hud});
 document.body.classList.toggle('compact',settings.density==='compact');
 document.body.classList.toggle('focus-mode',!!settings.focus);
 const fb=document.getElementById('focus-btn'); if(fb)fb.setAttribute('aria-pressed',String(!!settings.focus));
 document.body.classList.toggle('no-tilt',!settings.tilt);
 saveSettings();
 // sync controls
 const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v}; const chk=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=!!v};
 set('set-theme',settings.theme);set('set-accent',settings.accent);set('set-accent2',settings.accent2);set('set-bg',settings.bgMode);set('set-bg-speed',settings.bgSpeed);set('set-bg-density',settings.bgDensity);set('set-bg-image',settings.bgImage);set('set-cursor',settings.cursor);set('set-cursor-scale',settings.cursorScale);set('set-volume',settings.volume);set('set-cdn',settings.cdn);
 chk('set-ripples',settings.ripples);chk('set-cursor-trail',settings.cursorTrail);chk('set-sound',settings.sound);chk('set-hud',settings.hud);chk('set-tilt',settings.tilt);set('set-density',settings.density);
}
function filtered(){
 let list=games.slice();
 if(collection==='favoritos'){const p=ProfileStore.get();list=list.filter(g=>p.favorites.includes(g.id))}
 else if(collection==='recentes'){const p=ProfileStore.get();const map=new Map(p.recents.map((r,i)=>[r.id,i]));list=list.filter(g=>map.has(g.id)).sort((a,b)=>map.get(a.id)-map.get(b.id))}
 else if(collection==='portais'){list=[]}
 else if(SOURCES[collection]){list=list.filter(g=>g.s.includes(collection))}
 else if(collection!=='todos'){list=list.filter(g=>g.k.includes(collection))}
 if(query){const q=query.toLowerCase();list=list.filter(g=>g.n.toLowerCase().includes(q)||(g.a||'').toLowerCase().includes(q))}
 const sort=settings.sort;
 if(sort==='az')list.sort((a,b)=>a.n.localeCompare(b.n)); else if(sort==='za')list.sort((a,b)=>b.n.localeCompare(a.n));
 else if(sort==='source')list.sort((a,b)=>(a.s[0]||'').localeCompare(b.s[0]||'')); else list.sort((a,b)=>b.p-a.p);
 return list;
}
function coverHTML(g){
 const urls=GameLauncher.resolveCoverUrls(g).filter(Boolean);
 const first=urls[0]||'';
 if(!first){ // jogos sem capa na fonte: placeholder com a inicial, na paleta do site
  const ph='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12161C"/><stop offset="1" stop-color="#7A0F1B"/></linearGradient></defs><rect width="400" height="225" fill="url(#g)"/><text x="200" y="140" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="96" fill="#EDEFF2">${(g.n||'?').trim().charAt(0).toUpperCase()}</text></svg>`);
  return `<img loading="lazy" alt="${esc(g.n)}" src="${ph}">`;
 }
 return `<img loading="lazy" alt="${esc(g.n)}" src="${esc(first)}" data-fallbacks='${esc(JSON.stringify(urls.slice(1)))}' onerror="imgFallback(this)">`;
}
window.imgFallback=function(img){const f=JSON.parse(img.dataset.fallbacks||'[]');if(f.length){img.src=f.shift();img.dataset.fallbacks=JSON.stringify(f)}else{img.onerror=null;img.src='data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A0F1B"/><stop offset="1" stop-color="#C8102E"/></linearGradient></defs><rect width="400" height="225" fill="url(#g)"/><text x="200" y="120" text-anchor="middle" font-family="Arial" font-size="42" fill="white">🎮</text></svg>`)}}
function render(){
 const isPortals=collection==='portais';
 $('#portals-view').hidden=!isPortals; $('#games-view').hidden=isPortals;
 $('#collection-title').textContent=isPortals?'Portais & Mirrors Originais':(COLLECTIONS.find(c=>c.id===collection)?.label||SOURCES[collection]||'Jogos');
 if(isPortals){renderPortals();return}
 const list=filtered(); $('#results-count').textContent=list.length+' jogos encontrados';
 const slice=list.slice(0,shown);
 $('#games-grid').innerHTML=slice.map(g=>`<article class="game-card" data-id="${g.id}" tabindex="0">
   <div class="card-cover">${coverHTML(g)}<span class="source-badge">${esc(SOURCES[g.s[0]]||g.s[0])}</span><button class="fav-btn ${ProfileStore.isFavorite(g.id)?'active':''}" data-fav="${g.id}" title="Favoritar" aria-label="Favoritar ${esc(g.n)}">♥</button></div>
   <div class="card-body"><h3>${esc(g.n)}</h3><p>${esc(g.d||'Jogue agora direto no navegador, sem instalar nada.')}</p><div class="card-meta"><span>${Math.round((g.p||0)/1000)}k jogadas</span><button class="open-btn" data-open="${g.id}">Abrir</button></div></div></article>`).join('')||'<div class="empty">Nenhum jogo encontrado. Favorite jogos clicando no coração.</div>';
 $('#load-more-wrap').hidden=shown>=list.length;
 attachTilt();
}
function renderPortals(){
 if(!mirrors)return;
 $('#portals-grid').innerHTML=mirrors.portals.map(p=>`<article class="portal-card" style="--portal:${p.color}"><h3>${esc(p.name)}</h3><span class="badge">${esc(p.badge)}</span><p>${esc(p.description)}</p><small>Crédito: ${esc(p.credit)}</small><div class="portal-actions"><button class="btn primary" data-portal="${p.id}">▶ Abrir em about:blank</button><select data-portal-mirror="${p.id}">${p.mirrors.map((m,i)=>`<option value="${i}">${esc(m.label)}</option>`).join('')}</select></div></article>`).join('');
}
function attachTilt(){if(!settings.tilt)return;$$('.game-card').forEach(c=>{c.onmousemove=e=>{const r=c.getBoundingClientRect();c.style.transform=`perspective(700px) rotateY(${(e.clientX-r.left)/r.width*6-3}deg) rotateX(${3-(e.clientY-r.top)/r.height*6}deg)`};c.onmouseleave=()=>c.style.transform=''})}
function renderHero(){
 const f=games.filter(g=>g.f===1).sort((a,b)=>b.p-a.p).slice(0,8);
 $('#hero-track').innerHTML=f.map(g=>`<div class="hero-slide" data-hero="${g.id}" tabindex="0" role="button" aria-label="${esc(g.n)}">${coverHTML(g)}<div><h3>${esc(g.n)}</h3><p>${esc(g.d||'')}</p><span class="hero-open">Abrir</span></div></div>`).join('');
}
function renderNav(){
 $('#collections-nav').innerHTML=COLLECTIONS.map(c=>`<button class="nav-item ${collection===c.id?'active':''}" data-col="${c.id}">${c.icon} ${c.label} <span>${countFor(c.id)}</span></button>`).join('')+`<div class="nav-sep">Fontes</div>`+Object.entries(SOURCES).map(([id,l])=>`<button class="nav-item ${collection===id?'active':''}" data-col="${id}">${l} <span>${games.filter(g=>g.s.includes(id)).length}</span></button>`).join('')+`<button class="nav-item ${collection==='portais'?'active':''}" data-col="portais">Portais & Mirrors <span>${mirrors?mirrors.portals.length:5}</span></button>`;
}
function countFor(id){if(SOURCES[id])return games.filter(g=>g.s.includes(id)).length;if(id==='todos')return games.length;if(id==='favoritos')return ProfileStore.get().favorites.length;if(id==='recentes')return ProfileStore.get().recents.length;return games.filter(g=>g.k.includes(id)).length}
function openGame(g){
 currentGame=g;
 $('#game-modal').hidden=false;
 $('#modal-cover').innerHTML=coverHTML(g);
 $('#modal-title').textContent=g.n; $('#modal-desc').textContent=g.d||'Jogue direto no navegador.';
 $('#modal-meta').innerHTML=`<span class="badge">${g.s.map(s=>SOURCES[s]||s).join(' · ')}</span>${g.a?`<span class="badge">${esc(g.a)}</span>`:''}<span class="badge">Popularidade ${g.p||0}</span>`;
 $('#modal-controls').textContent=g.ct||'Mouse e teclado / toque na tela, conforme o jogo.';
 const cands=GameLauncher.buildGameCandidates(g);
 $('#modal-mirrors').innerHTML=cands.map((c,i)=>`<option value="${i}">Servidor ${i+1}${c.type==='iframe'?' · web':' · app'}</option>`).join('');
 $('#modal-fav').textContent=ProfileStore.isFavorite(g.id)?'♥ Nos favoritos':'Adicionar aos favoritos';
}
function renderProfile(){
 const p=ProfileStore.get(),lvl=ProfileStore.getLevel();
 $('#profile-summary').innerHTML=`<div class="avatar">${esc(p.avatar)}</div><div><strong style="color:${esc(p.color)}">${esc(p.name||'Visitante')}</strong><small>${esc(p.title)} · Nível ${lvl.level}</small><div class="xpbar"><i style="width:${Math.round(lvl.progress*100)}%"></i></div><small>XP ${p.xp} · ${ProfileStore.formatPlaytime(p.playSeconds)} · ${p.playedIds.length} jogos · ${p.streak} dias de streak</small></div>`;
 $('#profile-name').value=p.name;$('#profile-title').value=p.title;
 $('#avatars').innerHTML=ProfileStore.AVATARS.map(a=>`<button class="chip ${p.avatar===a?'active':''}" data-avatar="${a}">${a}</button>`).join('');
 $('#colors').innerHTML=ProfileStore.NAME_COLORS.map(c=>`<button class="color-dot ${p.color===c?'active':''}" data-color="${c}" style="background:${c}"></button>`).join('');
 $('#achievements').innerHTML=ProfileStore.ACHIEVEMENTS.map(a=>{const un=p.unlocked.includes(a.id);return `<div class="ach ${un?'unlocked':''}"><span>${a.icon}</span><div><strong>${a.name}</strong><small>${a.desc} · +${a.xp} XP</small></div><b>${un?'✅':'🔒'}</b></div>`}).join('');
}
function renderLeaderboard(){
 const box=$('#leaderboard-body');
 if(!ProfileStore.hasName()){box.innerHTML=`<div class="empty">Defina um nome no perfil para entrar no ranking global.<br><br><button class="btn primary" onclick="document.getElementById('leaderboard-modal').hidden=true;openModal('profile-modal')">Criar meu perfil</button></div>`;return}
 const rows=SocialHub.getLeaderboard(lbSort);
 box.innerHTML=rows.length?`<table class="lb-table"><thead><tr><th>#</th><th>Jogador</th><th>Nível</th><th>XP</th><th>Tempo</th><th>Jogos</th><th>Streak</th></tr></thead><tbody>${rows.slice(0,100).map((r,i)=>`<tr><td>${i+1}</td><td><span style="color:${esc(r.color||'#fff')}">${esc(r.avatar||'🎮')} ${esc(r.name)}</span></td><td>${r.level||1}</td><td>${r.xp||0}</td><td>${ProfileStore.formatPlaytime(r.playSeconds||0)}</td><td>${r.gamesPlayed||0}</td><td>${r.streak||0}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Conectando ao ranking global… jogue e seu placar aparece aqui!</div>';
}
function renderChat(){
 const msgs=SocialHub.getMessages();
 $('#chat-messages').innerHTML=msgs.map(m=>{
   let shared=''; try{const sg=m.sharedGame; if(sg) shared=`<button class="shared-card" data-shared="${esc(sg.id)}">${esc(sg.name)} — jogar</button>`}catch(e){}
   return `<div class="chat-msg"><span>${esc(m.avatar||'🎮')}</span><div><strong style="color:${esc(m.color||'#fff')}">${esc(m.name)} <small>Nv.${m.level||1} · ${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></strong><p>${esc(m.text)}</p>${shared}<button class="mute-btn" data-mute="${esc(m.pubkey)}">silenciar</button></div></div>`}).join('')||'<div class="empty">Sem mensagens ainda. Seja o primeiro a falar.</div>';
 const st=SocialHub.getStatus(); $('#chat-status').textContent=`${st.connectedCount}/${st.totalRelays} relays · ${st.unreadCount} não lidas`;
 $('#chat-badge').hidden=st.unreadCount===0; $('#chat-badge').textContent=st.unreadCount;
 const el=$('#chat-messages'); el.scrollTop=el.scrollHeight;
}
window.openModal=id=>{const e=document.getElementById(id);if(e)e.hidden=false; if(id==='profile-modal')renderProfile(); if(id==='leaderboard-modal')renderLeaderboard(); if(id==='credits-modal')renderCredits()};
function closeModals(){$$('.modal').forEach(m=>m.hidden=true)}
function renderCredits(){
 const list=mirrors?.credits||[];
 $('#credits-list').innerHTML=list.map(c=>`<article class="credit-card" style="--portal:${c.color}"><h3>${esc(c.name)}</h3><span class="badge">${esc(c.countLabel)}</span><p><strong>${esc(c.role)}</strong></p><p>${esc(c.authors)}</p><small>${esc(c.notes)}</small>${c.url?`<br><a href="${esc(c.url)}" target="_blank" rel="noopener">Visitar fonte ↗</a>`:''}</article>`).join('');
 $('#credits-footer-list').innerHTML=list.map(c=>`<span>${esc(c.name)} — ${esc(c.authors)}</span>`).join('');
}
async function init(){
 ProfileStore.init();
 // engines need DOM
 BgEngine.init(); CursorEngine.init(); CloakManager.init();
 try{const [g,m]=await Promise.all([fetch('data/games.json').then(r=>r.json()),fetch('data/mirrors.json').then(r=>r.json())]);games=g;mirrors=m;GameLauncher.setCdnConfig(m.cdns)}catch(e){toast('Erro ao carregar catálogo','warn')}
 SocialHub.init();
 applySettings(); renderNav(); renderHero(); render(); renderProfile(); renderCredits();
 // cdn select options
 $('#set-cdn').innerHTML=GameLauncher.getCdnProviders().map(p=>`<option value="${p.idx}">${p.host}</option>`).join(''); $('#set-cdn').value=settings.cdn;
 $('#set-cloak').innerHTML=Object.entries(CloakManager.PRESETS).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')+`<option value="custom">Personalizado</option>`;
 const ck=CloakManager.getConfig(); $('#set-cloak').value=ck.preset; $('#cloak-title').value=ck.customTitle||'';$('#cloak-icon').value=ck.customIcon||'';$('#panic-key').value=ck.panicKey||'F9';$('#panic-url').value=ck.panicUrl||'';
 ProfileStore.subscribe(()=>{renderProfile();renderNav(); if(collection==='favoritos'||collection==='recentes')render()});
 SocialHub.onChat(renderChat); SocialHub.onLeaderboard(()=>{if(!$('#leaderboard-modal').hidden)renderLeaderboard()}); SocialHub.onStatus(renderChat);
 setInterval(()=>{if(!$('#leaderboard-modal').hidden)renderLeaderboard()},8000);
 bind();
 toast(`Bem-vindo! ${games.length} jogos carregados`,'success');
}
function bind(){
 document.addEventListener('click',e=>{
  const col=e.target.closest('[data-col]'); if(col){collection=col.dataset.col;shown=60;SoundFX.click();renderNav();render();window.scrollTo({top:0,behavior:'smooth'});return}
  const openBtn=e.target.closest('[data-open]'); if(openBtn){e.stopPropagation();const g=games.find(x=>x.id===openBtn.dataset.open);if(g)GameLauncher.launchGame(g);return}
  const fav=e.target.closest('[data-fav]'); if(fav){e.stopPropagation();const added=ProfileStore.toggleFavorite(fav.dataset.fav);fav.classList.toggle('active',added);toast(added?'Adicionado aos favoritos':'Removido dos Favoritos');return}
  const card=e.target.closest('.game-card'); if(card){const g=games.find(x=>x.id===card.dataset.id);if(g)openGame(g);return}
  const hero=e.target.closest('[data-hero]'); if(hero){const g=games.find(x=>x.id===hero.dataset.hero);if(g)openGame(g);return}
  const portal=e.target.closest('[data-portal]'); if(portal){const p=mirrors.portals.find(x=>x.id===portal.dataset.portal);const sel=document.querySelector(`[data-portal-mirror="${p.id}"]`);GameLauncher.launchPortal(p,Number(sel?.value||0));return}
  const av=e.target.closest('[data-avatar]'); if(av){ProfileStore.setProfile({avatar:av.dataset.avatar});renderProfile();return}
  const co=e.target.closest('[data-color]'); if(co){ProfileStore.setProfile({color:co.dataset.color});renderProfile();return}
  const mute=e.target.closest('[data-mute]'); if(mute){SocialHub.muteUser(mute.dataset.mute);renderChat();return}
  const shared=e.target.closest('[data-shared]'); if(shared){const g=games.find(x=>x.id===shared.dataset.shared);if(g)openGame(g);return}
  if(e.target.classList.contains('modal'))e.target.hidden=true;
 });
 $('#games-grid').addEventListener('keydown',e=>{if(e.key==='Enter'){const c=e.target.closest('.game-card');if(c){const g=games.find(x=>x.id===c.dataset.id);if(g)openGame(g)}}});
 $('#search-input').addEventListener('input',e=>{query=e.target.value;shown=60;render()});
 $('#sort-select').addEventListener('change',e=>{settings.sort=e.target.value;saveSettings();render()});
 $('#load-more').onclick=()=>{shown+=60;render()};
 $('#roulette-btn').onclick=()=>{const pool=filtered().length?filtered():games;let i=0;const iv=setInterval(()=>{SoundFX.rouletteTick();const g=pool[Math.floor(Math.random()*pool.length)];$('#collection-title').textContent=''+g.n;if(++i>14){clearInterval(iv);openGame(g)}},70)};
 $('#random-hero').onclick=()=>$('#roulette-btn').click();
 $('#search-input').addEventListener('keydown',e=>{if(e.key==='Escape'){e.target.value='';query='';render()}});
 document.addEventListener('keydown',e=>{if((e.ctrlKey&&e.key.toLowerCase()==='k')||e.key==='/'){if(document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){e.preventDefault();$('#search-input').focus()}}});
 $$('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').hidden=true);
 $('#play-btn').onclick=()=>{if(currentGame)GameLauncher.launchGame(currentGame,Number($('#modal-mirrors').value||0))};
 $('#modal-fav').onclick=()=>{if(!currentGame)return;ProfileStore.toggleFavorite(currentGame.id);$('#modal-fav').textContent=ProfileStore.isFavorite(currentGame.id)?'♥ Nos favoritos':'Adicionar aos favoritos';render()};
 $('#download-btn').onclick=()=>currentGame&&GameLauncher.downloadGameOffline(currentGame);
 $('#share-btn').onclick=async()=>{if(!currentGame)return;if(!ProfileStore.hasName()){toast('Defina um nome no perfil para compartilhar no Chat Global','warn');openModal('profile-modal');return}const r=await SocialHub.sendChatMessage(`Recomendo ${currentGame.n}!`,{id:currentGame.id,name:currentGame.n});toast(r.ok?'Compartilhado no Chat Global!':'Erro ao compartilhar',r.ok?'success':'warn')};
 $('#save-profile').onclick=()=>{ProfileStore.setProfile({name:$('#profile-name').value,title:$('#profile-title').value});toast('Perfil salvo! Ranking e chat global liberados','success');renderProfile();renderLeaderboard()};
 $('#export-btn').onclick=()=>{const blob=new Blob([ProfileStore.exportBackup()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='estudo-escolar-backup.json';a.click()};
 $('#import-file').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{ProfileStore.importBackup(t);applySettings();toast('Backup importado!','success');location.reload()}catch(err){toast('Backup inválido','warn')}})};
 // chat
 $('#chat-toggle').onclick=()=>{const d=$('#chat-drawer');d.classList.toggle('open');SocialHub.setChatOpen(d.classList.contains('open'));renderChat()};
 $('#chat-close').onclick=()=>{$('#chat-drawer').classList.remove('open');SocialHub.setChatOpen(false)};
 $$('.chat-tab').forEach(t=>t.onclick=()=>{$$('.chat-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');SocialHub.setChannel(t.dataset.ch);renderChat()});
 $('#chat-send').onclick=sendChat; $('#chat-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});
 async function sendChat(){const v=$('#chat-input').value.trim();if(!v)return;const r=await SocialHub.sendChatMessage(v,null);if(!r.ok){toast(r.reason==='need_name'?'Defina um nome no Perfil para usar o Chat Global':'Aguarde um pouco antes de enviar novamente','warn');if(r.reason==='need_name')openModal('profile-modal')}else{$('#chat-input').value='';renderChat()}}
 $$('.lb-tab').forEach(t=>t.onclick=()=>{$$('.lb-tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');lbSort=t.dataset.sort;renderLeaderboard()});
 // studio bindings
 const bindSet=(id,key,parse=v=>v,after)=>{const el=document.getElementById(id);if(el)el.addEventListener('input',()=>{settings[key]=parse(el.type==='checkbox'?el.checked:el.value);ProfileStore.recordCustomization();applySettings();BgEngine.refreshColors&&BgEngine.refreshColors()})};
 bindSet('set-theme','theme');bindSet('set-accent','accent');bindSet('set-accent2','accent2');bindSet('set-bg','bgMode');bindSet('set-bg-speed','bgSpeed',Number);bindSet('set-bg-density','bgDensity',Number);bindSet('set-bg-image','bgImage');bindSet('set-cursor','cursor');bindSet('set-cursor-scale','cursorScale',Number);bindSet('set-volume','volume',Number);bindSet('set-cdn','cdn',Number);
 bindSet('set-ripples','ripples');bindSet('set-cursor-trail','cursorTrail');bindSet('set-sound','sound');bindSet('set-hud','hud');bindSet('set-tilt','tilt');bindSet('set-density','density');
 $('#set-cloak').onchange=e=>{CloakManager.update({preset:e.target.value});ProfileStore.recordCustomization();toast('Camuflagem da aba aplicada 🎭','success')};
 $('#apply-cloak-custom').onclick=()=>{CloakManager.update({preset:'custom',customTitle:$('#cloak-title').value,customIcon:$('#cloak-icon').value});toast('Cloak personalizado aplicado!','success')};
 $('#apply-panic').onclick=()=>{CloakManager.update({panicKey:$('#panic-key').value||'F9',panicUrl:$('#panic-url').value});toast('Botão de pânico configurado!','success')};
 $('#panic-test').onclick=()=>CloakManager.togglePanic(true);
 $('#open-blank-site').onclick=()=>CloakManager.openSiteInAboutBlank();
 // header buttons
 const menuBtn=$('#menu-btn'),menuDrop=$('#menu-dropdown');
 if(menuBtn&&menuDrop){menuBtn.onclick=e=>{e.stopPropagation();const open=menuDrop.hidden;menuDrop.hidden=!open;menuBtn.setAttribute('aria-expanded',String(open))};
 document.addEventListener('click',e=>{if(!menuDrop.hidden&&!e.target.closest('.top-actions')){menuDrop.hidden=true;menuBtn.setAttribute('aria-expanded','false')}});
 menuDrop.addEventListener('click',()=>{menuDrop.hidden=true;menuBtn.setAttribute('aria-expanded','false')});}
 const focusBtn=$('#focus-btn'); if(focusBtn)focusBtn.onclick=()=>{settings.focus=!settings.focus;applySettings();toast(settings.focus?'Modo foco ativado: só busca e jogos':'Modo foco desativado')};
 $('#profile-btn').onclick=()=>openModal('profile-modal'); $('#leaderboard-btn').onclick=()=>openModal('leaderboard-modal'); $('#studio-btn').onclick=()=>openModal('studio-modal'); $('#credits-btn').onclick=()=>openModal('credits-modal');
}
document.addEventListener('DOMContentLoaded',init);
})();
