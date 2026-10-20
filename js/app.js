/* Orquestração: abertura, modos, rotas (#mapa, #atlas/<id>/<hotspot>), edição */
(function () {
  const CD = window.CD, $ = CD.$, $$ = CD.$$;
  const App = CD.App = { mode: 'mapa', mapReady: null };

  App.setMode = function (m, push = true) {
    App.mode = m;
    $$('.modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
    $('#mapView').classList.toggle('on', m === 'mapa');
    $('#atlasView').classList.toggle('on', m === 'atlas');
    $('#dossieView').classList.toggle('on', m === 'dossie');
    if (m === 'dossie') loadDossie(App.dzDoc);
    if (m === 'mapa' && CD.Map.map) setTimeout(() => CD.Map.map.resize(), 30);
    if (m === 'atlas' && !CD.Atlas.cur) CD.Atlas.renderGallery();
    if (push && m === 'mapa' && location.hash !== '#mapa') history.replaceState(null, '', '#mapa');
    if (push && m === 'atlas' && !location.hash.startsWith('#atlas')) history.replaceState(null, '', '#atlas');
  };
  const dzCache = {}; let dzBound = false;
  async function loadDossie(doc) {
    doc = doc || App.dzDoc || 'hidrovia'; App.dzDoc = doc;
    $$('#dossieTabs a').forEach(x => x.classList.toggle('on', x.dataset.doc === doc));
    const box = $('#dossieBody');
    if (!dzCache[doc]) {
      box.innerHTML = '<p class="dz-loading">Carregando o dossiê…</p>';
      try { const r = await fetch('dossie/' + doc + '.html', { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); dzCache[doc] = await r.text(); }
      catch (e) { box.innerHTML = '<p class="dz-loading">Não foi possível carregar o dossiê. Abra o site pelo servidor local (iniciar_servidor.bat).</p>'; return; }
    }
    if (box.dataset.doc !== doc) { box.innerHTML = dzCache[doc]; box.dataset.doc = doc; $('#dossieView').scrollTop = 0; }
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
      if (h.startsWith('#mapa') || h.startsWith('#dossie')) return; // navega normalmente
      ev.preventDefault(); const el = box.querySelector(h); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  App.startTour = async function (route) { location.hash = '#mapa'; App.setMode('mapa'); await App.mapReady; CD.Map.startTour(route); };
  App.openAtlas = function (id, hs) { location.hash = '#atlas/' + id + (hs ? '/' + hs : ''); };
  App.goMap = async function (cam, hs) {
    App.setMode('mapa');
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
    if (m === 'atlas') {
      App.setMode('atlas', false);
      if (id) { if (!CD.Atlas.cur || CD.Atlas.cur.id !== id) await CD.Atlas.open(id, hs); else if (hs) CD.Atlas.openHotspot(hs); }
      else if (CD.Atlas.cur) CD.Atlas.close();
    } else if (m === 'dossie') {
      App.dzDoc = id || App.dzDoc || 'hidrovia';
      App.setMode('dossie', false);
    } else if (m === 'mapa' || m === '') {
      App.setMode('mapa', false);
      if (id) { await App.mapReady; CD.Map.openPoint(id); }
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
        ${App.mode === 'mapa' ? 'Clique no mapa para criar um ponto narrativo; clique num ponto existente para editá-lo.' : 'Nos atlas, clique sobre a obra para criar um hotspot e arraste os existentes para movê-los.'}
        ${CD.api.server ? '' : '<br><br>Sem o servidor (arquivo <b>iniciar_servidor.bat</b>), as alterações ficam só neste navegador — exporte os arquivos e coloque-os nas pastas <b>data/</b> e <b>atlas/</b>.'}
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn sm" id="expP">${CD.icon('download')} pontos.geojson</button><button class="btn sm" id="expA">${CD.icon('download')} atlas.json</button></div>`;
      $('#expP').onclick = () => CD.Map.exportPoints();
      $('#expA').onclick = () => CD.api.download('atlas.json', CD.Atlas.data);
      CD.toast(App.mode === 'mapa' ? 'Modo edição: clique no mapa para adicionar um ponto.' : 'Modo edição: clique na obra para adicionar um ponto.');
    }
  };

  async function boot() {
    await CD.api.check();
    await CD.Atlas.load();
    CD.Atlas.init();
    $$('.modes button').forEach(b => b.onclick = () => { if (b.dataset.mode === 'atlas') location.hash = CD.Atlas.cur ? '#atlas/' + CD.Atlas.cur.id : '#atlas'; else if (b.dataset.mode === 'dossie') location.hash = '#dossie/' + (App.dzDoc || 'hidrovia'); else location.hash = '#mapa'; });
    $('#brand').onclick = showIntro;
    $('#btnAbout').onclick = () => $('#about').classList.add('on');
    $('#btnEdit').onclick = () => App.setEditing(!document.body.classList.contains('editing'));
    $('#btnTour').onclick = e => { e.stopPropagation(); $('#tourMenu').classList.toggle('on'); };
    $$('#tourMenu [data-route]').forEach(b => b.onclick = () => { $('#tourMenu').classList.remove('on'); App.startTour(b.dataset.route); });
    document.addEventListener('click', e => { if (!e.target.closest('.tour-wrap')) $('#tourMenu').classList.remove('on'); });
    $$('[data-go]').forEach(b => b.onclick = async () => {
      hideIntro(); const g = b.dataset.go;
      if (g === 'atlas') location.hash = '#atlas';
      else if (g === 'dossie') location.hash = '#dossie';
      else if (g === 'tour') { location.hash = '#mapa'; await App.mapReady; CD.Map.startTour(); }
      else location.hash = '#mapa';
    });
    if (location.hash && location.hash.length > 1) hideIntro();
    if (!window.maplibregl) {
      // segunda tentativa por outra CDN
      await new Promise(res => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js'; s.onload = s.onerror = res; document.head.appendChild(s);
        const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css'; document.head.appendChild(l); setTimeout(res, 8000); });
    }
    if (!window.maplibregl) {
      CD.toast('Não foi possível carregar a biblioteca de mapas (sem internet?). Os atlas continuam disponíveis.', true);
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
