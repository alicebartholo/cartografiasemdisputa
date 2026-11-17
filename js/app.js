/* Orquestração: abertura, modos, rotas (#mapa, #atlas/<id>/<hotspot>), edição */
(function () {
  const CD = window.CD, $ = CD.$, $$ = CD.$$;
  const App = CD.App = { mode: 'cos', lastMap: 'cos', mapReady: null };
  const isMap = m => m === 'ext' || m === 'cos';
  App.isMap = () => isMap(App.mode);

  App.setMode = function (m, push = true) {
    if (m === 'mapa') m = App.lastMap || 'cos';
    App.mode = m; if (isMap(m)) { App.lastMap = m; CD.Map.setMapa(m); }
    $$('.modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    $('#mapView').classList.toggle('on', isMap(m));
    $('#atlasView').classList.toggle('on', m === 'atlas');
    $('#dossieView').classList.toggle('on', m === 'dossie');
    $('#cadernoView').classList.toggle('on', m === 'caderno');
    if (m === 'dossie') loadDossie(App.dzDoc);
    if (isMap(m) && CD.Map.map) setTimeout(() => CD.Map.map.resize(), 30);
    if (m === 'atlas' && !CD.Atlas.cur) CD.Atlas.renderGallery();
    if (push && isMap(m) && location.hash !== '#' + CD.MAPAS[m].hash) history.replaceState(null, '', '#' + CD.MAPAS[m].hash);
    if (push && m === 'atlas' && !location.hash.startsWith('#atlas')) history.replaceState(null, '', '#atlas');
  };
  const dzCache = {}; let dzBound = false;
  async function loadDossie(doc) {
    doc = doc || App.dzDoc || 'narrativas'; App.dzDoc = doc;
    $$('#dossieTabs a').forEach(x => x.classList.toggle('on', x.dataset.doc === doc));
    const box = $('#dossieBody');
    if (doc === 'narrativas') { await renderNarrativas(box); bindDz(box); return; }
    if (!dzCache[doc]) {
      box.innerHTML = '<p class="dz-loading">Carregando o dossiê…</p>';
      try { const r = await fetch('dossie/' + doc + '.html', { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); dzCache[doc] = await r.text(); }
      catch (e) { box.innerHTML = '<p class="dz-loading">Não foi possível carregar o dossiê. Abra o site pelo servidor local (iniciar_servidor.bat).</p>'; return; }
    }
    if (box.dataset.doc !== doc) { box.innerHTML = dzCache[doc]; box.dataset.doc = doc; $('#dossieView').scrollTop = 0; }
    bindDz(box);
  }
  /* meta-aba: as narrativas para ler em sequência, separadas pelos dois mapas */
  async function renderNarrativas(box) {
    if (box.dataset.doc === 'narrativas') return;
    box.innerHTML = '<p class="dz-loading">Carregando as narrativas…</p>';
    await App.mapReady;
    const pts = ((CD.Map.points || {}).features || []).slice().sort((a, b) => (a.properties.ordem || 999) - (b.properties.ordem || 999));
    const sec = id => {
      const fs = pts.filter(f => CD.mapaDoPonto(f.properties) === id);
      return `<section class="nv-sec" id="nv-${id}"><h2 class="nv-h">${CD.MAPAS[id].nome}<small>${fs.length} narrativas · ${CD.MAPAS[id].desc}</small></h2>
        <div class="nv-grid">${fs.map(f => { const p = f.properties; const c = CD.CATS[p.categoria] || {}; const im = (p.imagens || [])[0];
          return `<article class="nv-card" data-id="${CD.esc(p.id)}">
            <div class="nv-img" style="${im ? `background-image:url('${CD.esc(im.src)}')` : `background:${c.cor || '#333'}`}"></div>
            <div class="nv-body"><span class="cat"><i style="background:${c.cor}"></i>${CD.esc(c.nome || '')}</span><h3>${CD.esc(p.titulo)}</h3><p>${CD.esc(p.resumo || '')}</p>
            <div class="nv-act"><button class="btn sm" data-ler="${CD.esc(p.id)}">Ler</button><a class="btn sm primary" href="#mapa/${encodeURIComponent(p.id)}">Ver no mapa</a></div></div>
          </article>`; }).join('')}</div></section>`;
    };
    box.innerHTML = `<div class="dz nv"><header class="dz-head"><p class="dz-kicker">meta-aba · narrativas</p><h1>Narrativas do território</h1>
      <p class="dz-lead">As histórias que atravessam os dois mapas. Leia aqui ou abra cada uma no lugar a que se refere.</p>
      <nav class="nv-nav"><a href="#nv-ext">${CD.MAPAS.ext.nome}</a><a href="#nv-cos">${CD.MAPAS.cos.nome}</a></nav></header>
      ${sec('ext')}${sec('cos')}<div id="nvLeitura" class="nv-leitura"></div></div>`;
    box.dataset.doc = 'narrativas'; $('#dossieView').scrollTop = 0;
    box.querySelectorAll('[data-ler]').forEach(b => b.onclick = () => {
      const f = pts.find(x => x.properties.id === b.dataset.ler); if (!f) return;
      const L = $('#nvLeitura'); L.innerHTML = `<div class="nv-leitura-box"><button class="btn icon nv-x" title="Fechar">${CD.icon('x')}</button>${CD.storyHTML(f.properties, `<div class="story-actions"><a class="btn sm primary" href="#mapa/${encodeURIComponent(f.properties.id)}">Ver no mapa</a></div>`)}</div>`;
      L.classList.add('on'); CD.bindLightbox(L, f.properties.imagens || []);
      $('.nv-x', L).onclick = () => L.classList.remove('on');
      L.onclick = e => { if (e.target === L) L.classList.remove('on'); };
    });
  }
  function bindDz(box) {
    if (dzBound) return; dzBound = true;
    const tip = document.createElement('div'); tip.id = 'dzTip'; document.body.appendChild(tip);
    box.addEventListener('mousemove', ev => {
      const el = ev.target.closest('[data-tip]');
      if (!el) { tip.style.display = 'none'; return; }
      tip.textContent = el.getAttribute('data-tip'); tip.style.display = 'block';
      const x = Math.min(ev.clientX + 14, window.innerWidth - tip.offsetWidth - 10); tip.style.left = x + 'px'; tip.style.top = (ev.clientY + 16) + 'px';
    });
    box.addEventListener('mouseleave', () => tip.style.display = 'none');
    box.addEventListener('click', ev => {
      const im = ev.target.closest('.dz-map img'); if (im) { CD.lightbox(im.getAttribute('src'), im.getAttribute('alt')); return; }
      const t = ev.target.closest('[data-tour]'); if (t) { ev.preventDefault(); App.startTour(t.dataset.tour); return; }
      const aEl = ev.target.closest('a[href^="#"]'); if (!aEl) return;
      const h = aEl.getAttribute('href');
      if (h.startsWith('#mapa') || h.startsWith('#dossie') || h.startsWith('#extrativismo') || h.startsWith('#cosmologia')) return; // navega normalmente
      ev.preventDefault(); const el = box.querySelector(h); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  App.startTour = async function (route) {
    const m = route === 'hidrovia' ? 'ext' : route === 'encantados' ? 'cos' : (App.lastMap || 'cos');
    App.setMode(m); await App.mapReady; CD.Map.startTour(route);
  };
  App.openAtlas = function (id, hs) { location.hash = '#atlas/' + id + (hs ? '/' + hs : ''); };
  App.goMap = async function (cam, hs) {
    App.setMode(App.lastMap || 'cos');
    await App.mapReady;
    CD.Map.map.flyTo(Object.assign({ duration: 2600, essential: true }, cam));
    if (hs) {
      // marcador temporário com o título do hotspot
      const el = document.createElement('div'); el.className = 'mk'; const c = (CD.CATS[hs.categoria] || {}).cor || '#e3a857';
      el.style.background = c; el.style.color = c; el.innerHTML = `<span class="mk-label" style="opacity:1">${CD.esc(hs.titulo)}</span>`;
      const mk = new maplibregl.Marker({ element: el }).setLngLat(cam.center).addTo(CD.Map.map);
      setTimeout(() => mk.remove(), 12000);
    }
  };

  async function route() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    const [m, id, hs] = h.split('/');
    if (m === 'atlas') { location.replace('#cosmologia'); return; }
    if (m === 'extrativismo' || m === 'cosmologia') { App.setMode(m === 'extrativismo' ? 'ext' : 'cos', false); return; }
    if (false) {
      App.setMode('atlas', false);
      if (id) { if (!CD.Atlas.cur || CD.Atlas.cur.id !== id) await CD.Atlas.open(id, hs); else if (hs) CD.Atlas.openHotspot(hs); }
      else if (CD.Atlas.cur) CD.Atlas.close();
    } else if (m === 'dossie') {
      App.dzDoc = id || App.dzDoc || 'narrativas';
      App.setMode('dossie', false);
    } else if (m === 'caderno') {
      App.setMode('caderno', false);
      CD.Caderno.open(+id || 0);
    } else if (m === 'mapa' || m === '') {
      if (id) {
        await App.mapReady;
        const f = CD.Map.points && CD.Map.points.features.find(x => x.properties.id === id);
        App.setMode(f ? CD.mapaDoPonto(f.properties) : (App.lastMap || 'cos'), false);
        CD.Map.openPoint(id);
      } else App.setMode(App.lastMap || 'cos', false);
    }
  }
  window.addEventListener('hashchange', () => { hideIntro(); route(); });

  function hideIntro() { if ($('#intro').style.display === 'none') return; $('#intro').classList.add('hide'); setTimeout(() => $('#intro').style.display = 'none', 800); }
  function showIntro() { $('#intro').style.display = ''; requestAnimationFrame(() => $('#intro').classList.remove('hide')); }

  App.setEditing = function (on) {
    document.body.classList.toggle('editing', on);
    $('#btnEdit').classList.toggle('on', on);
    CD.Map.setEditing(on); CD.Atlas.setEditing(on);
    if (on) {
      $('#side').classList.remove('closed');
      $$('#side .tabs [data-tab]').forEach(x => x.classList.toggle('on', x.dataset.tab === 'tPoints'));
      $$('#side .tabpane').forEach(p => p.classList.toggle('on', p.id === 'tPoints'));
      $('#editHint').innerHTML = `<b>Modo edição ${CD.api.server ? '· salvando na pasta do projeto' : '· servidor local inativo'}</b><br>
        ${App.isMap() ? 'Clique no mapa para criar um ponto narrativo; clique num ponto existente para editá-lo.' : 'Nos atlas, clique sobre a obra para criar um hotspot e arraste os existentes para movê-los.'}
        ${CD.api.server ? '' : '<br><br>Sem o servidor (arquivo <b>iniciar_servidor.bat</b>), as alterações ficam só neste navegador — exporte os arquivos e coloque-os nas pastas <b>data/</b> e <b>atlas/</b>.'}
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" id="expP">${CD.icon('download')} pontos.geojson</button><button class="btn sm" id="expA">${CD.icon('download')} atlas.json</button></div>`;
      $('#expP').onclick = () => CD.Map.exportPoints();
      $('#expA').onclick = () => CD.api.download('atlas.json', CD.Atlas.data);
      CD.toast(App.isMap() ? 'Modo edição: clique no mapa para adicionar um ponto.' : 'Modo edição: clique na obra para adicionar um ponto.');
    }
  };

  async function boot() {
    await CD.api.check();
    await CD.Atlas.load();
    CD.Atlas.init();
    $$('.modes button').forEach(b => b.onclick = () => { if (b.dataset.mode === 'atlas') location.hash = CD.Atlas.cur ? '#atlas/' + CD.Atlas.cur.id : '#atlas'; else if (b.dataset.mode === 'dossie') location.hash = '#dossie/' + (App.dzDoc || 'narrativas'); else if (b.dataset.mode === 'caderno') location.hash = '#caderno'; else location.hash = '#' + CD.MAPAS[b.dataset.mode].hash; });
    $('#brand').onclick = showIntro;
    $('#btnAbout').onclick = () => $('#about').classList.add('on');
    $('#btnEdit').onclick = () => App.setEditing(!document.body.classList.contains('editing'));
    $('#btnTour').onclick = e => { e.stopPropagation(); $('#tourMenu').classList.toggle('on'); };
    $$('#tourMenu [data-route]').forEach(b => b.onclick = () => { $('#tourMenu').classList.remove('on'); App.startTour(b.dataset.route); });
    document.addEventListener('click', e => { if (!e.target.closest('.tour-wrap')) $('#tourMenu').classList.remove('on'); });
    $$('[data-go]').forEach(b => b.onclick = async () => {
      hideIntro(); const g = b.dataset.go;
      if (g === 'dossie') location.hash = '#dossie';
      else if (g === 'caderno') location.hash = '#caderno';
      else if (g === 'tour') App.startTour('principal');
      else if (g === 'ext' || g === 'cos') location.hash = '#' + CD.MAPAS[g].hash;
      else location.hash = '#cosmologia';
    });
    if (location.hash && location.hash.length > 1) hideIntro();
    if (!window.maplibregl) {
      // segunda tentativa por outra CDN
      await new Promise(res => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js'; s.onload = s.onerror = res; document.head.appendChild(s);
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css'; document.head.appendChild(l); setTimeout(res, 8000); });
    }
    if (!window.maplibregl) {
      CD.toast('Não foi possível carregar a biblioteca de mapas (sem internet?). O caderno e os dossiês continuam disponíveis.', true);
      App.mapReady = Promise.resolve();
      CD.Map.map = { getCenter: () => ({ lng: CD.VIEW.center[0], lat: CD.VIEW.center[1] }), getZoom: () => 8, resize() { }, flyTo() { } };
      CD.Map.points = await CD.api.load('data/pontos.geojson', { features: [] });
    } else {
      App.mapReady = CD.Map.init().catch(e => { console.error(e); CD.toast('Erro ao iniciar o mapa: ' + e.message, true); });
    }
    await route();
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
