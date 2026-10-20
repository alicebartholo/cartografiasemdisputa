/* Modo 2 — Atlas ilustrados: visor de zoom profundo com hotspots editáveis */
(function () {
  const CD = window.CD, $ = CD.$, $$ = CD.$$;
  const A = CD.Atlas = { data: { atlases: [] }, cur: null, sel: null, filter: null };
  A.list = () => A.data.atlases;
  A.get = id => A.data.atlases.find(a => a.id === id);
  A.load = async () => {
    A.data = await CD.api.load('atlas/atlas.json', { atlases: [] });
    A.data.atlases.forEach(a => { a.hotspots = a.hotspots || []; });
  };
  const save = async () => { const r = await CD.api.save('atlas/atlas.json', A.data); CD.toast(CD.savedMsg(r)); CD.Map.drawAtlasMarkers && CD.Map.drawAtlasMarkers(); CD.Map.rebuildIndex && CD.Map.rebuildIndex(); };

  /* ======================================================= galeria */
  const serieOf = x => x.serie || 'Colagens';
  const label = x => { const s = serieOf(x); const same = A.list().filter(y => serieOf(y) === s); return (s.startsWith('Prancha') ? 'Prancha ' : s.startsWith('Colag') ? 'Colagem ' : 'Obra ') + toRoman(same.indexOf(x) + 1); };
  A.label = label;
  A.renderGallery = function () {
    const ed = document.body.classList.contains('editing');
    const series = [...new Set(A.list().map(serieOf))];
    const desc = { 'Colagens': 'recortes, rasgos e sobreposições', 'Pranchas ilustradas': 'cortes e esquemas desenhados' };
    $('#cards').outerHTML = '<div id="cards"></div>';
    $('#cards').innerHTML = series.map(s => `<div class="serie-h"><h3>${CD.esc(s)}</h3><span>${CD.esc(desc[s] || '')}</span></div>
      <div class="cards">${A.list().filter(x => serieOf(x) === s).map(a => `
      <article class="card" data-id="${a.id}">
        <div class="cover" style="background-image:url('${CD.esc(a.capa)}')"><span class="num">${label(a)}</span></div>
        <div class="body"><h3>${CD.esc(a.titulo)}</h3><p>${CD.esc(a.subtitulo || '')}</p>
          <div class="foot"><span>${CD.icon('target')} ${a.hotspots.length} pontos</span>${a.geo ? `<span>${CD.icon('pin')} no mapa</span>` : ''}</div></div>
      </article>`).join('')}</div>`).join('') + (ed ? `<div class="cards" style="margin-top:22px"><article class="card add" id="addAtlas"><div>${CD.icon('plus')}<br><b>Adicionar nova obra</b><br><small>imagem PNG/JPG de grande formato</small></div></article></div>` : '');
    $$('#cards .card[data-id]').forEach(c => c.onclick = () => CD.App.openAtlas(c.dataset.id));
    const add = $('#addAtlas'); if (add) add.onclick = () => A.editAtlas(null);
  };
  const toRoman = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n - 1] || n;

  /* ======================================================= visor */
  const V = { s: 1, tx: 0, ty: 0, W: 1, H: 1, info: null, tiles: {}, anim: null, vx: 0, vy: 0 };
  const stage = () => $('#stage');

  A.open = async function (id, hsId) {
    const a = A.get(id); if (!a) return;
    A.cur = a; A.sel = null; A.filter = null;
    $('#gallery').style.display = 'none'; $('#viewer').classList.add('on');
    $('#vTitle small').textContent = label(a);
    $('#vTitle h2').textContent = a.titulo;
    $('#atlasStory').classList.remove('on'); $('#viewer').classList.remove('has-story');
    $('#tiles').innerHTML = ''; V.tiles = {};
    const low = $('#lowres');
    if (a.tipo === 'tiles') {
      V.info = await (await fetch(a.src + '/info.json')).json();
      V.W = V.info.width; V.H = V.info.height;
      low.src = a.src + '/preview.jpg';
    } else {
      V.info = null;
      await new Promise(res => { const im = new Image(); im.onload = () => { V.W = im.naturalWidth; V.H = im.naturalHeight; res(); }; im.onerror = res; im.src = a.src; });
      low.src = a.src;
    }
    low.style.width = V.W + 'px'; low.style.height = V.H + 'px';
    $('#navigator img').src = a.tipo === 'tiles' ? a.src + '/preview.jpg' : a.src;
    renderChips(); renderHotspots(); renderIndex();
    fit(false);
    if (hsId) setTimeout(() => A.openHotspot(hsId), 350);
  };
  A.close = function () {
    $('#viewer').classList.remove('on'); $('#gallery').style.display = ''; A.cur = null; A.renderGallery();
  };
  function vp() { const r = stage().getBoundingClientRect(); return { w: r.width, h: r.height }; }
  function fitScale() { const { w, h } = vp(); return Math.min(w / V.W, h / V.H) * 0.94; }
  function maxScale() { return V.info ? 1.6 : 2.5; }
  function clamp() {
    const { w, h } = vp();
    V.s = Math.max(fitScale() * 0.6, Math.min(maxScale(), V.s));
    const iw = V.W * V.s, ih = V.H * V.s, m = 0.5;
    V.tx = iw < w ? (w - iw) / 2 : Math.min(w * m, Math.max(w - iw - w * m, V.tx));
    V.ty = ih < h ? (h - ih) / 2 : Math.min(h * m, Math.max(h - ih - h * m, V.ty));
  }
  function fit(anim = true) {
    const { w, h } = vp(); const s = fitScale();
    const t = { s, tx: (w - V.W * s) / 2, ty: (h - V.H * s) / 2 };
    anim ? animateTo(t) : (Object.assign(V, t), render());
  }
  function render() {
    clamp();
    $('#plane').style.transform = `translate(${V.tx}px,${V.ty}px) scale(${V.s})`;
    if (V.info) updateTiles();
    placeHotspots(); updateNav();
  }
  function updateTiles() {
    const I = V.info, { w, h } = vp(), T = I.tileSize;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let L = I.levels - 1 - Math.floor(Math.log2(1 / (V.s * dpr)) + 0.15);
    L = Math.max(Math.min(2, I.levels - 1), Math.min(I.levels - 1, L));
    const f = Math.pow(2, I.levels - 1 - L);
    const x0 = Math.max(0, -V.tx / V.s), y0 = Math.max(0, -V.ty / V.s);
    const x1 = Math.min(V.W, (w - V.tx) / V.s), y1 = Math.min(V.H, (h - V.ty) / V.s);
    const lw = Math.ceil(V.W / f), lh = Math.ceil(V.H / f);
    const need = new Set();
    for (let ty = Math.floor(y0 / f / T); ty <= Math.min(Math.ceil(lh / T) - 1, Math.floor(y1 / f / T)); ty++)
      for (let tx = Math.floor(x0 / f / T); tx <= Math.min(Math.ceil(lw / T) - 1, Math.floor(x1 / f / T)); tx++) {
        const k = `${L}/${tx}_${ty}`; need.add(k);
        if (!V.tiles[k]) {
          const im = document.createElement('img'); im.className = 'tile'; im.decoding = 'async';
          const tw = Math.min(T, lw - tx * T), th = Math.min(T, lh - ty * T);
          im.style.left = tx * T * f + 'px'; im.style.top = ty * T * f + 'px';
          im.style.width = tw * f + 0.6 + 'px'; im.style.height = th * f + 0.6 + 'px';
          im.style.zIndex = L; im.src = `${A.cur.src}/${k}.jpg`;
          $('#tiles').appendChild(im); V.tiles[k] = im;
        }
      }
    // remove peças fora de vista ou de outros níveis (após carregar as novas)
    clearTimeout(V.gc);
    V.gc = setTimeout(() => { Object.keys(V.tiles).forEach(k => { if (!need.has(k)) { V.tiles[k].remove(); delete V.tiles[k]; } }); }, 700);
  }
  function animateTo(t, dur = 750) {
    cancelAnimationFrame(V.anim);
    const s0 = { s: V.s, tx: V.tx, ty: V.ty }, t0 = performance.now();
    // interpolar em espaço de zoom logarítmico mantendo o ponto-alvo
    const step = now => {
      let k = Math.min(1, (now - t0) / dur); k = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      V.s = Math.exp(Math.log(s0.s) + (Math.log(t.s) - Math.log(s0.s)) * k);
      V.tx = s0.tx + (t.tx - s0.tx) * k; V.ty = s0.ty + (t.ty - s0.ty) * k;
      render(); if (k < 1) V.anim = requestAnimationFrame(step);
    };
    V.anim = requestAnimationFrame(step);
  }
  function zoomAt(f, cx, cy, anim = true) {
    const ns = Math.max(fitScale() * 0.6, Math.min(maxScale(), V.s * f));
    const ix = (cx - V.tx) / V.s, iy = (cy - V.ty) / V.s;
    const t = { s: ns, tx: cx - ix * ns, ty: cy - iy * ns };
    anim ? animateTo(t, 380) : (Object.assign(V, t), render());
  }
  function focusOn(x, y, scale) {
    const { w, h } = vp(); const panel = $('#atlasStory').classList.contains('on') && w > 900 ? 460 : 0;
    const s = scale || Math.max(V.s, fitScale() * 2.6);
    animateTo({ s, tx: (w - panel) / 2 - x * V.W * s, ty: h / 2 - y * V.H * s }, 1000);
  }

  /* ---------- interação: arrastar, roda, pinça */
  const ptrs = new Map(); let drag = null, moved = 0, pinch = null;
  function bindStage() {
    const st = stage();
    st.addEventListener('pointerdown', e => {
      if (e.target.closest('.hs')) return;
      st.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelAnimationFrame(V.anim); cancelAnimationFrame(V.inertia);
      if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, tx: V.tx, ty: V.ty, t: performance.now() }; moved = 0; V.vx = V.vy = 0; st.classList.add('drag'); }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: V.s }; drag = null; }
    });
    st.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = st.getBoundingClientRect();
        zoomAt((pinch.s * d / pinch.d) / V.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, false); return;
      }
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
      const now = performance.now(); const dt = Math.max(1, now - drag.t);
      V.vx = (e.clientX - prev.x) / dt * 16; V.vy = (e.clientY - prev.y) / dt * 16; drag.t = now;
      V.tx = drag.tx + dx; V.ty = drag.ty + dy; render();
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId); st.classList.remove('drag');
      if (ptrs.size < 2) pinch = null;
      if (drag && ptrs.size === 0) {
        if (moved < 5) {
          const r = st.getBoundingClientRect(); const ix = (e.clientX - r.left - V.tx) / V.s / V.W, iy = (e.clientY - r.top - V.ty) / V.s / V.H;
          if (document.body.classList.contains('editing') && ix >= 0 && ix <= 1 && iy >= 0 && iy <= 1) A.newHotspot(ix, iy);
        } else {
          // inércia
          const glide = () => { V.vx *= .92; V.vy *= .92; V.tx += V.vx; V.ty += V.vy; render(); if (Math.hypot(V.vx, V.vy) > .4) V.inertia = requestAnimationFrame(glide); };
          V.inertia = requestAnimationFrame(glide);
        }
        drag = null;
      }
    };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    st.addEventListener('wheel', e => {
      e.preventDefault(); const r = st.getBoundingClientRect();
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      zoomAt(f, e.clientX - r.left, e.clientY - r.top, false);
    }, { passive: false });
    st.addEventListener('dblclick', e => { const r = st.getBoundingClientRect(); zoomAt(2, e.clientX - r.left, e.clientY - r.top); });
    window.addEventListener('resize', () => A.cur && render());
    document.addEventListener('keydown', e => {
      if (!A.cur || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      const { w, h } = vp();
      if (e.key === '+' || e.key === '=') zoomAt(1.5, w / 2, h / 2);
      if (e.key === '-') zoomAt(1 / 1.5, w / 2, h / 2);
      if (e.key === '0') fit();
      if (e.key === 'ArrowLeft') { V.tx += 120; render(); } if (e.key === 'ArrowRight') { V.tx -= 120; render(); }
      if (e.key === 'ArrowUp') { V.ty += 120; render(); } if (e.key === 'ArrowDown') { V.ty -= 120; render(); }
    });
    $('#vZoomIn').onclick = () => { const { w, h } = vp(); zoomAt(1.8, w / 2, h / 2); };
    $('#vZoomOut').onclick = () => { const { w, h } = vp(); zoomAt(1 / 1.8, w / 2, h / 2); };
    $('#vHome').onclick = () => fit();
    $('#vBack').onclick = () => { location.hash = '#atlas'; };
    $('#vFull').onclick = () => document.fullscreenElement ? document.exitFullscreen() : $('#viewer').requestFullscreen();
    $('#vList').onclick = () => $('#vIndex').classList.toggle('on');
    $('#vMap').onclick = () => { const a = A.cur; if (a && a.geo) CD.App.goMap({ center: a.geo, zoom: 10.5, pitch: 60 }); else CD.App.setMode('mapa'); };
    $('#navigator').onclick = e => {
      const r = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const { w, h } = vp(); animateTo({ s: V.s, tx: w / 2 - x * V.W * V.s, ty: h / 2 - y * V.H * V.s }, 500);
    };
    $$('[data-close="atlasStory"]').forEach(b => b.onclick = () => closeStory());
  }
  function updateNav() {
    const { w, h } = vp(); const nav = $('#navigator'); const nw = nav.clientWidth, nh = nw * V.H / V.W;
    nav.style.height = nh + 'px';
    const x0 = Math.max(0, -V.tx / V.s / V.W), y0 = Math.max(0, -V.ty / V.s / V.H);
    const x1 = Math.min(1, (w - V.tx) / V.s / V.W), y1 = Math.min(1, (h - V.ty) / V.s / V.H);
    Object.assign($('#navRect').style, { left: x0 * nw + 'px', top: y0 * nh + 'px', width: (x1 - x0) * nw + 'px', height: (y1 - y0) * nh + 'px' });
  }

  /* ---------- hotspots */
  function renderChips() {
    const used = new Set(A.cur.hotspots.map(h => h.categoria));
    $('#vChips').innerHTML = `<button class="chip ${!A.filter ? 'on' : ''}" data-c="">Todos os pontos</button>` +
      Object.entries(CD.CATS).filter(([k]) => used.has(k)).map(([k, v]) => `<button class="chip ${A.filter === k ? 'on' : ''}" data-c="${k}"><i style="background:${v.cor}"></i>${v.nome}</button>`).join('');
    $$('#vChips .chip').forEach(c => c.onclick = () => { A.filter = c.dataset.c || null; renderChips(); renderHotspots(); });
  }
  function renderHotspots() {
    const box = $('#hotlayer'); box.innerHTML = '';
    A.cur.hotspots.forEach(h => {
      const c = (CD.CATS[h.categoria] || {}).cor || '#e3a857';
      const el = document.createElement('div'); el.className = 'hs' + (A.filter && h.categoria !== A.filter ? ' dim' : '') + (A.sel === h.id ? ' sel' : '');
      el.style.color = c; el.dataset.id = h.id;
      el.innerHTML = `<span></span><div class="hs-label">${CD.esc(h.titulo)}</div>`;
      box.appendChild(el);
      // clique / arrasto (edição)
      let start = null;
      el.addEventListener('pointerdown', e => { e.stopPropagation(); start = { x: e.clientX, y: e.clientY, hx: h.x, hy: h.y, mv: 0 }; el.setPointerCapture(e.pointerId); });
      el.addEventListener('pointermove', e => {
        if (!start || !document.body.classList.contains('editing')) return;
        start.mv = Math.max(start.mv, Math.hypot(e.clientX - start.x, e.clientY - start.y));
        if (start.mv > 4) { h.x = Math.min(1, Math.max(0, start.hx + (e.clientX - start.x) / V.s / V.W)); h.y = Math.min(1, Math.max(0, start.hy + (e.clientY - start.y) / V.s / V.H)); placeHotspots(); }
      });
      el.addEventListener('pointerup', async () => {
        if (!start) return; const mv = start.mv; start = null;
        if (mv > 4 && document.body.classList.contains('editing')) { await save(); return; }
        A.openHotspot(h.id);
      });
    });
    placeHotspots();
  }
  function placeHotspots() {
    if (!A.cur) return;
    $$('#hotlayer .hs').forEach(el => { const h = A.cur.hotspots.find(x => x.id === el.dataset.id); if (!h) return; el.style.left = (V.tx + h.x * V.W * V.s) + 'px'; el.style.top = (V.ty + h.y * V.H * V.s) + 'px'; });
  }
  function renderIndex() {
    $('#vIndex').innerHTML = `<div class="h3" style="margin:6px 8px 8px">Índice da obra</div>` + (A.cur.hotspots.length ? A.cur.hotspots.map((h, i) => { const c = CD.CATS[h.categoria] || {};
      return `<div class="pitem" data-id="${h.id}"><div><span class="cat"><i style="background:${c.cor}"></i>${String(i + 1).padStart(2, '0')} · ${CD.esc(c.nome || '')}</span><h4>${CD.esc(h.titulo)}</h4><p>${CD.esc(h.resumo || '')}</p></div></div>`; }).join('') : '<p class="src" style="padding:8px">Ainda sem pontos. Ative “Editar” e clique sobre a obra para criar.</p>');
    $$('#vIndex .pitem').forEach(el => el.onclick = () => { $('#vIndex').classList.remove('on'); A.openHotspot(el.dataset.id); });
  }
  function closeStory() { $('#atlasStory').classList.remove('on'); $('#viewer').classList.remove('has-story'); A.sel = null; renderHotspots(); }
  function openStory(html, after) { const st = $('#atlasStory'); $('.story-body', st).innerHTML = html; $('.story-body', st).scrollTop = 0; st.classList.add('on'); $('#viewer').classList.add('has-story'); after && after(st); }

  A.openHotspot = function (id) {
    const a = A.cur; const h = a.hotspots.find(x => x.id === id); if (!h) return;
    A.sel = id; renderHotspots();
    if (history.replaceState) history.replaceState(null, '', `#atlas/${a.id}/${h.id}`);
    if (document.body.classList.contains('editing')) { A.editHotspot(h); focusOn(h.x, h.y); return; }
    const i = a.hotspots.indexOf(h);
    const pt = h.ponto && CD.Map.points.features.find(f => f.properties.id === h.ponto);
    const extra = `<div class="story-actions">
      ${h.geo ? `<button class="btn sm primary" data-act="map">${CD.icon('map')} Ver no mapa geográfico</button>` : ''}
      ${pt ? `<button class="btn sm" data-act="pt">${CD.icon('pin')} Narrativa: ${CD.esc(pt.properties.titulo)}</button>` : ''}</div>`;
    openStory(CD.storyHTML(h, extra) + `<div class="story-nav"><button class="btn sm" data-act="prev">${CD.icon('left')} Anterior</button><span>${i + 1} / ${a.hotspots.length}</span><button class="btn sm" data-act="next">Próximo ${CD.icon('right')}</button></div>`, st => {
      CD.bindLightbox(st, h.imagens || []);
      const q = s => $(`[data-act="${s}"]`, st);
      q('map') && (q('map').onclick = () => CD.App.goMap({ center: h.geo, zoom: h.zoom || 12, pitch: 62, bearing: h.bearing || 0 }, h));
      q('pt') && (q('pt').onclick = () => { CD.App.setMode('mapa'); CD.Map.openPoint(pt.properties.id); });
      q('prev').onclick = () => A.openHotspot(a.hotspots[(i - 1 + a.hotspots.length) % a.hotspots.length].id);
      q('next').onclick = () => A.openHotspot(a.hotspots[(i + 1) % a.hotspots.length].id);
    });
    focusOn(h.x, h.y, h.escala);
  };

  /* ---------- edição de hotspots */
  A.newHotspot = function (x, y) {
    const h = { id: CD.uid('h'), x: +x.toFixed(4), y: +y.toFixed(4), titulo: '', categoria: 'aguas', resumo: '', texto: '', imagens: [], novo: true };
    A.editHotspot(h);
  };
  A.editHotspot = function (h) {
    const a = A.cur; const isNew = !!h.novo;
    if (isNew) { A.cur.hotspots.push(h); renderHotspots(); }
    const pts = CD.Map.points.features;
    openStory(`<div class="form">
      <h2>${isNew ? 'Novo ponto na obra' : 'Editar ponto da obra'}</h2>
      <div class="sub">Arraste o marcador sobre a obra para reposicioná-lo.</div>
      <div class="fld"><label>Título</label><input id="hTit" value="${CD.esc(h.titulo)}"></div>
      <div class="row2"><div class="fld"><label>Categoria</label><select id="hCat">${CD.catOptions(h.categoria)}</select></div>
        <div class="fld"><label>Narrativa do mapa</label><select id="hPt"><option value="">— nenhuma —</option>${pts.map(f => `<option value="${f.properties.id}" ${h.ponto === f.properties.id ? 'selected' : ''}>${CD.esc(f.properties.titulo)}</option>`).join('')}</select></div></div>
      <div class="fld"><label>Resumo</label><input id="hRes" value="${CD.esc(h.resumo || '')}"></div>
      <div class="fld"><label>Texto</label><textarea id="hTxt" rows="9">${CD.esc(h.texto || '')}</textarea></div>
      <div class="fld"><label>Imagens</label><div id="hImgs"></div></div>
      <div class="fld"><label>Fontes</label><textarea id="hFon" rows="3" style="min-height:70px">${CD.esc(h.fontes || '')}</textarea></div>
      <div class="fld"><label>Lugar no mapa geográfico</label><div class="row2"><input id="hLon" placeholder="longitude" value="${h.geo ? h.geo[0] : ''}"><input id="hLat" placeholder="latitude" value="${h.geo ? h.geo[1] : ''}"></div>
        <small>Dica: abra o mapa, centralize no lugar e volte — ou use o botão abaixo.</small><button class="btn sm" id="hGeoMap" style="margin-top:6px">${CD.icon('target')} Usar o centro atual do mapa</button></div>
      <div class="form-actions">${!isNew ? `<button class="btn danger" id="hDel">${CD.icon('trash')} Excluir</button>` : ''}<span style="flex:1"></span><button class="btn" id="hCancel">Cancelar</button><button class="btn primary" id="hSave">${CD.icon('save')} Salvar</button></div></div>`);
    const imgs = CD.imageEditor($('#hImgs'), h.imagens || []);
    $('#hGeoMap').onclick = e => { e.preventDefault(); const c = CD.Map.map.getCenter(); $('#hLon').value = c.lng.toFixed(5); $('#hLat').value = c.lat.toFixed(5); h.zoom = +CD.Map.map.getZoom().toFixed(1); };
    $('#hCancel').onclick = () => { if (isNew) a.hotspots = a.hotspots.filter(x => x !== h); delete h.novo; closeStory(); };
    if ($('#hDel')) $('#hDel').onclick = async () => { if (!confirm('Excluir este ponto da obra?')) return; a.hotspots = a.hotspots.filter(x => x !== h); await save(); closeStory(); renderIndex(); renderChips(); };
    $('#hSave').onclick = async () => {
      delete h.novo;
      Object.assign(h, { titulo: $('#hTit').value.trim() || 'Sem título', categoria: $('#hCat').value, resumo: $('#hRes').value.trim(), texto: $('#hTxt').value, imagens: imgs.get(), fontes: $('#hFon').value.trim() });
      const lon = parseFloat($('#hLon').value), lat = parseFloat($('#hLat').value);
      if (isFinite(lon) && isFinite(lat)) h.geo = [lon, lat]; else delete h.geo;
      if ($('#hPt').value) h.ponto = $('#hPt').value; else delete h.ponto;
      await save(); renderHotspots(); renderIndex(); renderChips(); A.sel = null; document.body.classList.contains('editing') ? closeStory() : A.openHotspot(h.id);
    };
  };

  /* ---------- nova obra / editar metadados da obra */
  A.editAtlas = function (a) {
    const isNew = !a; a = a || { id: CD.uid('atlas'), titulo: '', subtitulo: '', tipo: 'imagem', src: '', capa: '', hotspots: [] };
    const m = document.createElement('div'); m.className = 'modal on';
    m.innerHTML = `<div class="modal-box scroll"><button class="btn icon x" data-close-modal>${CD.icon('x')}</button><div class="inner form" style="padding:30px">
      <h2>${isNew ? 'Nova obra no atlas' : 'Editar obra'}</h2><div class="sub">Envie uma imagem de grande formato (até ~12.000 px no maior lado funciona bem). Depois de criar, clique sobre a obra para marcar os pontos.</div>
      <div class="fld"><label>Título</label><input id="aTit" value="${CD.esc(a.titulo)}"></div>
      <div class="fld"><label>Subtítulo</label><input id="aSub" value="${CD.esc(a.subtitulo || '')}"></div>
      ${a.tipo !== 'tiles' ? `<div class="fld"><label>Imagem da obra</label><div class="row2"><input id="aSrc" value="${CD.esc(a.src)}" placeholder="media/minha_obra.jpg"><button class="btn" id="aUp">${CD.icon('image')} Escolher arquivo</button></div><div id="aPrev" style="margin-top:8px;height:140px;border-radius:8px;background:#222 center/contain no-repeat;${a.src ? `background-image:url('${CD.esc(a.src)}')` : ''}"></div></div>` : ''}
      <div class="fld"><label>Lugar no mapa (onde a miniatura aparece)</label><div class="row2"><input id="aLon" placeholder="longitude" value="${a.geo ? a.geo[0] : ''}"><input id="aLat" placeholder="latitude" value="${a.geo ? a.geo[1] : ''}"></div><button class="btn sm" id="aGeo" style="margin-top:6px">${CD.icon('target')} Usar o centro atual do mapa</button></div>
      <div class="form-actions">${!isNew ? `<button class="btn danger" id="aDel">${CD.icon('trash')} Remover obra</button>` : ''}<span style="flex:1"></span><button class="btn" data-close-modal>Cancelar</button><button class="btn primary" id="aSave">${CD.icon('save')} Salvar</button></div></div></div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close-modal]')) close(); });
    const up = $('#aUp', m); if (up) up.onclick = async () => { const [f] = await CD.pickImages(); if (!f) return; try { CD.toast('Enviando…'); const src = await CD.api.upload(f); $('#aSrc', m).value = src; $('#aPrev', m).style.backgroundImage = `url('${src}')`; CD.toast('Imagem carregada.'); } catch (e) { CD.toast(e.message, true); } };
    $('#aGeo', m).onclick = () => { const c = CD.Map.map.getCenter(); $('#aLon', m).value = c.lng.toFixed(5); $('#aLat', m).value = c.lat.toFixed(5); };
    if ($('#aDel', m)) $('#aDel', m).onclick = async () => { if (!confirm('Remover esta obra e seus pontos do atlas? (o arquivo de imagem não é apagado)')) return; A.data.atlases = A.data.atlases.filter(x => x.id !== a.id); await save(); close(); A.close(); };
    $('#aSave', m).onclick = async () => {
      a.titulo = $('#aTit', m).value.trim() || 'Obra sem título'; a.subtitulo = $('#aSub', m).value.trim();
      if (a.tipo !== 'tiles') { a.src = $('#aSrc', m).value.trim(); a.capa = a.src; if (!a.src) return CD.toast('Escolha a imagem da obra.', true); }
      const lon = parseFloat($('#aLon', m).value), lat = parseFloat($('#aLat', m).value);
      if (isFinite(lon) && isFinite(lat)) a.geo = [lon, lat]; else delete a.geo;
      if (isNew) A.data.atlases.push(a);
      await save(); close();
      if (isNew) CD.App.openAtlas(a.id); else { $('#vTitle h2').textContent = a.titulo; A.renderGallery(); }
    };
  };
  A.setEditing = on => { A.renderGallery(); if (A.cur) { renderHotspots(); if (!on) closeStory(); } updateEditTools(on); };
  function updateEditTools(on) {
    let b = $('#vEditMeta');
    if (on && !b) { b = document.createElement('button'); b.className = 'btn'; b.id = 'vEditMeta'; b.innerHTML = CD.icon('edit') + ' Obra'; b.title = 'Editar dados da obra'; b.onclick = () => A.editAtlas(A.cur); $('#vCtl').prepend(b); }
    if (!on && b) b.remove();
  }
  A.init = () => { bindStage(); A.renderGallery(); };
})();
