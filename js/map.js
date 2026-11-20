/* Modo 1 — Mapa geográfico (MapLibre GL, relevo 3D, camadas, narrativas editáveis) */
(function () {
  const CD = window.CD, $ = CD.$, $$ = CD.$$;
  const M = CD.Map = {
    map: null, points: { type: 'FeatureCollection', features: [] }, markers: {}, atlasMarkers: [], cityMarkers: [],
    year: 2025, playing: null, data: {}, loaded: {}, current: null, tour: null, draft: null
  };
  const ORDER = ['desm_acum', 'agua', 'uc', 'ti', 'bor_lim', 'quilombos', 'urb', 'rodovia', 'hv_com', 'arq', 'portos', 'en_lug', 'resex_com', 'bor_pts', 'en_bord'];
  M.mapa = 'cos';
  const inMapa = d => !CD.LAYER_MAPAS || !CD.LAYER_MAPAS[d.id] || CD.LAYER_MAPAS[d.id].includes(M.mapa);
  const catNoMapa = c => !CD.MAPAS || CD.MAPAS[M.mapa].cats.includes(c);
  const layerIds = def => def.tipo === 'fill' ? [def.id + '-f', def.id + '-l'] : def.tipo === 'bordado' ? [def.id + '-f', def.id + '-lim', ...def.obras.map((o, i) => def.id + '-img' + i)] : def.tipo === 'misto' ? [def.id + '-l', def.id] : def.tipo === 'calor' ? [def.id + '-h', def.id] : [def.id];
  const def = id => CD.LAYERS.find(l => l.id === id);

  /* ======================================================= estilo base */
  function baseStyle() {
    const sources = {
      dem: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Relevo: Mapzen / AWS Terrain Tiles' },
      demhs: { type: 'raster-dem', tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], encoding: 'terrarium', tileSize: 256, maxzoom: 14 },
      labels: { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, maxzoom: 18 }
    };
    const layers = [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b1011' } }];
    const def0 = (CD.BASEMAPS.find(b => b.padrao) || CD.BASEMAPS[0]).id;
    CD.BASEMAPS.forEach(b => {
      const vis = b.id === def0 ? 'visible' : 'none';
      if (b.tiles) {
        if (b.fundo) layers.push({ id: 'bm-' + b.id + '-bg', type: 'background', layout: { visibility: vis }, paint: { 'background-color': b.fundo } });
        sources['bm-' + (b.src || b.id)] = sources['bm-' + (b.src || b.id)] || { type: 'raster', tiles: b.tiles, tileSize: 256, maxzoom: b.max || 18, attribution: b.attr };
        layers.push({ id: 'bm-' + b.id, type: 'raster', source: 'bm-' + (b.src || b.id), layout: { visibility: vis }, paint: Object.assign({ 'raster-fade-duration': 200 }, b.paint || {}) });
      } else {
        layers.push({ id: 'bm-' + b.id, type: 'background', layout: { visibility: vis }, paint: { 'background-color': b.color } });
      }
    });
    layers.push({ id: 'hillshade', type: 'hillshade', source: 'demhs', paint: { 'hillshade-exaggeration': 0.6, 'hillshade-shadow-color': '#0d1f33', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#0d2c45' } });
    layers.push({ id: 'labels', type: 'raster', source: 'labels', paint: { 'raster-opacity': 0.85 } });
    return { version: 8, sources, layers };
  }

  /* ======================================================= início */
  M.init = async function () {
    const map = M.map = new maplibregl.Map({
      container: 'map', style: baseStyle(), center: CD.VIEW.center, zoom: CD.VIEW.zoom, pitch: CD.VIEW.pitch, bearing: CD.VIEW.bearing,
      maxPitch: 85, hash: false, attributionControl: { compact: true }, preserveDrawingBuffer: true, maxBounds: [[-64, -10], [-46, 4]]
    });
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    M.ready = new Promise(res => map.on('load', res));
    await M.ready;
    // abre em 2D: relevo desligado (pode ser ativado no botão de relevo 3D)
    try { map.setSky && map.setSky({ 'sky-color': '#16232a', 'horizon-color': '#c9a46b', 'fog-color': '#1a2224', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.25 }); } catch (e) { }
    CD.LAYERS.forEach(d => { if (d.on && inMapa(d) && d.tipo !== 'html') addLayer(d); });
    buildLayerPanel(); buildBasemaps(); bindControls(); bindMapEvents();
    await loadPoints(); await loadCities(); M.drawAtlasMarkers(); await buildIndex(); await buildStats();
    M.loaded = true; M.setMapa(M.mapa, true);
  };

  /* ======================================================= os dois mapas */
  M.setMapa = function (id, force) {
    if (!CD.MAPAS || !CD.MAPAS[id] || (id === M.mapa && !force)) { M.mapa = id || M.mapa; return; }
    M.mapa = id; document.body.dataset.mapa = id;
    const t = $('#mapaTitulo'); if (t) t.innerHTML = `<b>${CD.MAPAS[id].nome}</b><span>${CD.MAPAS[id].desc}</span>`;
    if (!M.loaded) return;
    CD.LAYERS.forEach(d => { const v = d.on && inMapa(d); if (d.tipo === 'html' || v || M.map.getLayer(layerIds(d)[0])) setVis(d, v); });
    buildLayerPanel(); updateTimelineVisibility(); renderPointList(); applyPointVis();
  };
  function applyPointVis() {
    const on = def('pontos').on;
    const inTour = id => M.tour && M.tour.list.some(x => x.properties.id === id);
    M.points.features.forEach(f => { const m = M.markers[f.properties.id]; if (!m) return; const id = f.properties.id;
      const el = m.getElement();
      el.style.display = inTour(id) ? 'none' : on && (catNoMapa(f.properties.categoria) || id === M.current) ? '' : 'none';
      el.classList.toggle('dim', !!M.tour); });
  }
  M.applyPointVis = applyPointVis;

  /* ======================================================= camadas */
  function beforeIdFor(id) {
    const i = ORDER.indexOf(id);
    for (let k = i + 1; k < ORDER.length; k++) {
      const d = def(ORDER[k]); if (!d) continue;
      const lid = layerIds(d)[0]; if (M.map.getLayer(lid)) return lid;
    }
    return undefined;
  }
  /* semente de olho-de-cabra (Ormosia): grão vermelho-alaranjado com a ponta preta */
  function seedIcons(map) {
    const draw = (name, body, dark) => {
      if (map.hasImage(name)) return;
      const W = 64, H = 84, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      const cx = W / 2, cy = H / 2 + 2, rx = 22, ry = 30;
      g.save(); g.filter = 'blur(3px)'; g.fillStyle = 'rgba(10,4,2,.55)'; g.beginPath(); g.ellipse(cx + 3, cy + 5, rx, ry, 0, 0, 7); g.fill(); g.restore();
      g.save(); g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.clip();
      let gr = g.createRadialGradient(cx - 8, cy - 4, 3, cx, cy, ry * 1.1); gr.addColorStop(0, body[0]); gr.addColorStop(.6, body[1]); gr.addColorStop(1, body[2]);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.beginPath(); g.ellipse(cx + 2, cy - ry * .78, rx * 1.15, ry * .62, -.25, 0, 7);
      gr = g.createRadialGradient(cx - 4, cy - ry * .85, 1, cx, cy - ry * .7, ry * .7); gr.addColorStop(0, dark[0]); gr.addColorStop(1, dark[1]); g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx - 8, cy + 2, 4, 9, -.35, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(cx - 2, cy - ry * .78, 5, 2.5, -.3, 0, 7); g.fill();
      g.restore();
      g.strokeStyle = 'rgba(40,8,2,.75)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
      map.addImage(name, g.getImageData(0, 0, W, H), { pixelRatio: 2 });
    };
    draw('semente', ['#ff8a5a', '#e0431c', '#9c2310'], ['#3a3330', '#050403']);
    draw('semente-escura', ['#e2572e', '#b52a12', '#6e1608'], ['#2a2220', '#030202']);
  }
  function addLayer(d) {
    const map = M.map;
    if (map.getLayer(layerIds(d)[0])) { setVis(d, true); return; }
    const card = $(`.layer[data-id="${d.id}"]`); card && card.classList.add('loading');
    if (!map.getSource(d.id)) map.addSource(d.id, { type: 'geojson', data: d.arquivo, generateId: true });
    const before = beforeIdFor(d.id);
    const op = d.opMul == null ? 1 : d.opMul;
    if (d.tipo === 'fill') {
      map.addLayer({ id: d.id + '-f', type: 'fill', source: d.id, paint: { 'fill-color': d.corExpr || d.cor, 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], Math.min(1, (d.opac || .4) + .25) * op, (d.opac || .4) * op] } }, before);
      map.addLayer({ id: d.id + '-l', type: 'line', source: d.id, paint: { 'line-color': d.linha || d.corExpr || d.cor, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, .5, 10, 1.6], 'line-opacity': .9 * op } }, before);
    } else if (d.tipo === 'line') {
      const paint = { 'line-color': d.corExpr || d.cor, 'line-width': d.largura || 1.5, 'line-opacity': .9 * op };
      if (d.dash) paint['line-dasharray'] = d.dash;
      map.addLayer({ id: d.id, type: 'line', source: d.id, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint }, before);
    } else if (d.tipo === 'circle') {
      map.addLayer({ id: d.id, type: 'circle', source: d.id, paint: {
        'circle-color': d.corExpr || d.cor, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, (d.raio || 4) * .6, 10, (d.raio || 4) * 1.4, 14, (d.raio || 4) * 2.2],
        'circle-stroke-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ffffff', '#1b1209'], 'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 1], 'circle-opacity': op, 'circle-stroke-opacity': op, 'circle-pitch-alignment': 'map' } }, before);
    } else if (d.tipo === 'calor') {
      map.addLayer({ id: d.id + '-h', type: 'heatmap', source: d.id, maxzoom: 14, paint: {
        'heatmap-weight': 1,
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 9, 1.2, 12, 2],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 5, 7, 8, 14, 10, 22, 12, 32, 14, 40],
        'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(255,255,255,0)', 0.08, 'rgba(255,240,234,0.55)', 0.25, 'rgba(250,196,178,0.8)', 0.45, 'rgba(242,138,110,0.88)', 0.65, 'rgba(224,65,44,0.92)', 0.85, 'rgba(180,22,24,0.95)', 1, 'rgba(110,6,12,1)'],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 11.5, 0.9 * op, 13.5, 0] } }, before);
      map.addLayer({ id: d.id, type: 'circle', source: d.id, minzoom: 11, paint: {
        'circle-color': d.corExpr || '#f0b35e', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 14, 7],
        'circle-stroke-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ffffff', '#1b1209'], 'circle-stroke-width': 1,
        'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 12.5, op], 'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 12.5, op] } }, before);
    } else if (d.tipo === 'misto') {
      const lp = { 'line-color': d.corLinha || '#c8102e', 'line-width': d.largura || 2, 'line-opacity': .9 * op };
      if (d.dash) lp['line-dasharray'] = d.dash;
      map.addLayer({ id: d.id + '-l', type: 'line', source: d.id, filter: ['!=', ['geometry-type'], 'Point'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: lp }, before);
      map.addLayer({ id: d.id, type: 'circle', source: d.id, filter: ['==', ['geometry-type'], 'Point'], paint: {
        'circle-color': d.corExpr || d.cor, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, (d.raio || 5) * .6, 10, (d.raio || 5) * 1.3, 14, (d.raio || 5) * 2],
        'circle-stroke-color': ['case', ['boolean', ['feature-state', 'hover'], false], '#ffffff', '#1b1209'], 'circle-stroke-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 1.2], 'circle-opacity': op, 'circle-stroke-opacity': op, 'circle-pitch-alignment': 'map' } }, before);
    } else if (d.tipo === 'icone') {
      if (d._carregando) return; d._carregando = true;
      Promise.all(d.icones.map(n => new Promise(res => {
        if (map.hasImage('ser-' + n)) return res();
        const im = new Image(128, 128); im.onload = () => { try { map.addImage('ser-' + n, im, { pixelRatio: 2 }); } catch (e) { } res(); }; im.onerror = () => res(); im.src = 'media/seres/' + n + '.svg';
      }))).then(() => {
        d._carregando = false;
        if (map.getLayer(d.id)) return;
        map.addLayer({ id: d.id, type: 'symbol', source: d.id, layout: {
          'icon-image': ['concat', 'ser-', ['get', 'icone']], 'icon-size': ['interpolate', ['linear'], ['zoom'], 6, .55, 10, .95, 14, 1.5],
          'icon-allow-overlap': true, 'icon-ignore-placement': true }, paint: { 'icon-opacity': d.opMul == null ? 1 : d.opMul } }, beforeIdFor(d.id));
        if (!d.on) map.setLayoutProperty(d.id, 'visibility', 'none');
      });
    } else if (d.tipo === 'bordado') {
      map.addLayer({ id: d.id + '-f', type: 'fill', source: d.id, filter: ['==', ['get', 'tipo'], 'encantado'], paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.01 } }, before);
      map.addLayer({ id: d.id + '-lim', type: 'line', source: d.id, filter: ['==', ['get', 'tipo'], 'limite'], layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ff3355', 'line-width': 2.6, 'line-dasharray': [2.2, 1.3], 'line-opacity': .9 * op } }, before);
      d.obras.forEach((o, i) => {
        const sid = d.id + '-src' + i;
        if (!map.getSource(sid)) map.addSource(sid, { type: 'image', url: o.src, coordinates: o.coords });
        map.addLayer({ id: d.id + '-img' + i, type: 'raster', source: sid, paint: { 'raster-opacity': op, 'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, before);
      });
    } else if (d.tipo === 'seed') {
      seedIcons(map);
      map.addLayer({ id: d.id, type: 'symbol', source: d.id, layout: {
        'icon-image': ['match', ['get', 'tipo'], 'sagrado', 'semente-escura', 'semente'], 'icon-rotate': ['coalesce', ['get', 'rot'], 0],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 8, .42, 11, .75, 14, 1.15], 'icon-allow-overlap': true, 'icon-ignore-placement': true,
        'icon-pitch-alignment': 'map', 'icon-rotation-alignment': 'map' }, paint: { 'icon-opacity': op } }, before);
    } else if (d.tipo === 'extrude') {
      map.addLayer({ id: d.id, type: 'fill-extrusion', source: d.id, paint: { 'fill-extrusion-color': gridColor(), 'fill-extrusion-height': gridHeight(), 'fill-extrusion-opacity': .85 * op, 'fill-extrusion-vertical-gradient': true } }, before);
    }
    if (d.timeline) applyYear();
    const t0 = Date.now();
    const slow = setTimeout(() => { if (!map.isSourceLoaded(d.id)) CD.toast('Carregando “' + d.nome + '”… (arquivo grande, pode levar alguns segundos)'); }, 2500);
    const done = () => { clearTimeout(slow); const c = $(`.layer[data-id="${d.id}"]`); c && c.classList.remove('loading'); map.off('sourcedata', onData); map.off('error', onErr); };
    const onData = e => { if (e.sourceId === d.id && e.isSourceLoaded) done(); };
    const onErr = e => {
      if (e.sourceId !== d.id && !(e.source && e.source.data === d.arquivo)) return;
      done(); layerIds(d).forEach(id => map.getLayer(id) && map.removeLayer(id)); map.getSource(d.id) && map.removeSource(d.id);
      d.on = false; const c = $(`.layer[data-id="${d.id}"]`); if (c) { c.classList.remove('on'); const cb = $('input[type=checkbox]', c); if (cb) cb.checked = false; }
      CD.toast('Não foi possível carregar “' + d.nome + '” (' + d.arquivo + '). ' + (location.protocol === 'file:' ? 'Abra o site pelo iniciar_servidor.bat, não pelo index.html direto.' : 'Verifique se o arquivo foi publicado.'), true);
      console.warn('camada', d.id, e.error);
    };
    map.on('sourcedata', onData); map.on('error', onErr);
  }
  function setVis(d, v) {
    if (d.tipo === 'html') {
      if (d.id === 'pontos') { applyPointVis(); return; }
      if (d.id === 'atlasmk') M.atlasMarkers.forEach(m => m.getElement().style.display = v ? '' : 'none');
      if (d.id === 'cidades') M.cityMarkers.forEach(m => m.getElement().style.display = v ? '' : 'none');
      return;
    }
    if (v && !M.map.getLayer(layerIds(d)[0])) return addLayer(d);
    layerIds(d).forEach(id => M.map.getLayer(id) && M.map.setLayoutProperty(id, 'visibility', v ? 'visible' : 'none'));
  }
  function setOpacity(d, k) {
    d.opMul = k; const map = M.map;
    if (!map.getLayer(layerIds(d)[0])) return;
    if (d.tipo === 'fill') {
      map.setPaintProperty(d.id + '-f', 'fill-opacity', ['case', ['boolean', ['feature-state', 'hover'], false], Math.min(1, (d.opac || .4) + .25) * k, (d.opac || .4) * k]);
      map.setPaintProperty(d.id + '-l', 'line-opacity', .9 * k);
    } else if (d.tipo === 'line') map.setPaintProperty(d.id, 'line-opacity', .9 * k);
    else if (d.tipo === 'circle') { map.setPaintProperty(d.id, 'circle-opacity', k); map.setPaintProperty(d.id, 'circle-stroke-opacity', k); }
    else if (d.tipo === 'extrude') map.setPaintProperty(d.id, 'fill-extrusion-opacity', .85 * k);
    else if (d.tipo === 'seed' || d.tipo === 'icone') map.setPaintProperty(d.id, 'icon-opacity', k);
    else if (d.tipo === 'calor') { map.setPaintProperty(d.id + '-h', 'heatmap-opacity', ['interpolate', ['linear'], ['zoom'], 11.5, 0.9 * k, 13.5, 0]); map.setPaintProperty(d.id, 'circle-opacity', ['interpolate', ['linear'], ['zoom'], 11, 0, 12.5, k]); map.setPaintProperty(d.id, 'circle-stroke-opacity', ['interpolate', ['linear'], ['zoom'], 11, 0, 12.5, k]); }
    else if (d.tipo === 'misto') { map.setPaintProperty(d.id + '-l', 'line-opacity', .9 * k); map.setPaintProperty(d.id, 'circle-opacity', k); map.setPaintProperty(d.id, 'circle-stroke-opacity', k); }
    else if (d.tipo === 'bordado') { map.setPaintProperty(d.id + '-lim', 'line-opacity', .9 * k); d.obras.forEach((o, i) => map.setPaintProperty(d.id + '-img' + i, 'raster-opacity', k)); }
  }

  function buildLayerPanel() {
    const box = $('#layerList'); box.innerHTML = '';
    CD.GROUPS.forEach(g => {
      const ls = CD.LAYERS.filter(l => l.grupo === g.id && inMapa(l)); if (!ls.length) return;
      const el = document.createElement('div'); el.className = 'group';
      el.innerHTML = `<div class="group-h"><span>${g.nome}</span>${CD.icon('down')}</div><div class="layers">${ls.map(d => `
        <div class="layer ${d.on ? 'on' : ''}" data-id="${d.id}">
          <div class="layer-row">
            <span class="sw ${d.sw && d.sw.forma ? d.sw.forma : ''}" style="background:${d.sw ? d.sw.cor : '#888'}"></span>
            <div class="layer-name">${d.nome}${d.sub ? `<small>${d.sub}</small>` : ''}</div>
            <span class="loading-dot"></span>
            <button class="more" title="Opções e legenda">${CD.icon('dots')}</button>
            <label class="tg"><input type="checkbox" ${d.on ? 'checked' : ''}><span></span></label>
          </div>
          <div class="layer-extra">
            ${d.tipo !== 'html' ? `<label>Opacidade <input type="range" min="0" max="1" step="0.05" value="1" class="op"></label>` : ''}
            ${d.legenda ? `<div class="legend-items">${d.legenda.map(([c, t]) => `<div><i style="background:${c}"></i>${t}</div>`).join('')}</div>` : ''}
            ${d.desc ? `<p>${d.desc}</p>` : ''}
            ${d.arquivo ? `<p style="color:var(--dim)">Arquivo: ${d.arquivo}</p>` : ''}
          </div>
        </div>`).join('')}</div>`;
      box.appendChild(el);
      $('.group-h', el).onclick = () => el.classList.toggle('collapsed');
    });
    $$('.layer', box).forEach(card => {
      const d = def(card.dataset.id);
      const cb = $('input[type=checkbox]', card);
      cb.onchange = () => { d.on = cb.checked; card.classList.toggle('on', d.on); setVis(d, d.on); updateTimelineVisibility(); };
      $('.layer-name', card).onclick = () => { cb.checked = !cb.checked; cb.onchange(); };
      $('.more', card).onclick = () => card.classList.toggle('open');
      const op = $('.op', card); if (op) op.oninput = () => setOpacity(d, +op.value);
    });
  }
  M.toggleLayer = (id, v) => { const card = $(`.layer[data-id="${id}"]`); const cb = card && $('input[type=checkbox]', card); if (cb && cb.checked !== v) { cb.checked = v; cb.onchange(); } };

  /* ======================================================= linha do tempo */
  function cumExpr(y) {
    const parts = [['get', 'h']];
    for (let k = 2008; k <= y; k++) parts.push(['coalesce', ['get', 'y' + k], 0]);
    return ['+', ...parts];
  }
  function gridHeight() { return ['*', cumExpr(M.year), 1400]; }
  function gridColor() { return ['interpolate', ['linear'], cumExpr(M.year), 0, '#f7e27c', 1, '#f3b94a', 2.5, '#ea7d33', 4.5, '#d8452a', 7, '#6e0d10']; }
  function applyYear() {
    const map = M.map, y = M.year;
    if (map.getLayer('prodes-f')) {
      const f = ['<=', ['get', 'y'], y];
      map.setFilter('prodes-f', f); map.setFilter('prodes-l', f);
      map.setPaintProperty('prodes-l', 'line-color', ['case', ['==', ['get', 'y'], y], '#ffffff', 'rgba(0,0,0,0)']);
    }
    if (map.getLayer('grade')) { map.setPaintProperty('grade', 'fill-extrusion-height', gridHeight()); map.setPaintProperty('grade', 'fill-extrusion-color', gridColor()); }
    $('#tlYear').textContent = y; $('#tlRange').value = y;
    const st = M.stats; if (st) {
      const a = st.anos.find(x => x.ano === y);
      const acc = st.anos.filter(x => x.ano <= y).reduce((s, x) => s + x.km2, 0);
      $('#tlInfo').innerHTML = `Em <b>${y}</b>: <b>${a ? a.km2.toLocaleString('pt-BR') : 0} km²</b> desmatados (${a ? a.poligonos.toLocaleString('pt-BR') : 0} polígonos).<br>Acumulado 2008–${y}: <b>${Math.round(acc).toLocaleString('pt-BR')} km²</b> · antes de 2008: ${Math.round(st.anterior_2008_km2).toLocaleString('pt-BR')} km²`;
      drawChart();
    }
  }
  M.setYear = y => { M.year = y; applyYear(); };
  function updateTimelineVisibility() {
    const on = CD.LAYERS.some(d => d.timeline && d.on && inMapa(d));
    $('#timeline').classList.toggle('on', on);
  }

  /* ======================================================= base, controles */
  function buildBasemaps() {
    const box = $('#basemaps');
    const def0 = (CD.BASEMAPS.find(b => b.padrao) || CD.BASEMAPS[0]).id;
    box.innerHTML = CD.BASEMAPS.map(b => `<div class="bm ${b.id === def0 ? 'on' : ''}" data-id="${b.id}"><div style="${b.thumb ? `background-image:url('${b.thumb}')` : `background:${b.color}`}"></div>${b.nome}</div>`).join('');
    $$('.bm', box).forEach(el => el.onclick = () => {
      $$('.bm', box).forEach(x => x.classList.toggle('on', x === el));
      M.setBasemap(el.dataset.id);
    });
  }
  M.setBasemap = function (id) {
    const map = M.map;
    CD.BASEMAPS.forEach(b => {
      const v = b.id === id ? 'visible' : 'none';
      map.setLayoutProperty('bm-' + b.id, 'visibility', v);
      if (map.getLayer('bm-' + b.id + '-bg')) map.setLayoutProperty('bm-' + b.id + '-bg', 'visibility', v);
    });
    const b = CD.BASEMAPS.find(x => x.id === id);
    map.setLayoutProperty('labels', 'visibility', b.labels ? 'visible' : 'none');
    if (b.agua && !map.getLayer('fg-agua')) {
      map.addSource('fg-agua', { type: 'geojson', data: 'data/massa_dagua.geojson' });
      map.addLayer({ id: 'fg-agua', type: 'fill', source: 'fg-agua', paint: { 'fill-color': b.agua } }, 'hillshade');
    }
    if (map.getLayer('fg-agua')) { map.setLayoutProperty('fg-agua', 'visibility', b.agua ? 'visible' : 'none'); if (b.agua) map.setPaintProperty('fg-agua', 'fill-color', b.agua); }
    map.setPaintProperty('hillshade', 'hillshade-exaggeration', b.relevo != null ? b.relevo : +$('#hsRange').value);
  };
  function bindControls() {
    const map = M.map;
    $('#cZoomIn').onclick = () => map.zoomIn();
    $('#cZoomOut').onclick = () => map.zoomOut();
    $('#cNorth').onclick = () => map.easeTo({ bearing: 0, pitch: map.getPitch() > 5 && map.getBearing() === 0 ? 0 : map.getPitch() });
    map.on('rotate', () => $('#compassNeedle').style.transform = `rotate(${-map.getBearing()}deg)`);
    $('#cHome').onclick = () => M.home();
    $('#cFull').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    $('#cBase').onclick = () => { $('#basemaps').classList.toggle('on'); $('#terrainBox').classList.remove('on'); };
    $('#c3d').onclick = () => { $('#terrainBox').classList.toggle('on'); $('#basemaps').classList.remove('on'); };
    $('#exRange').oninput = e => { const v = +e.target.value; $('#exVal').textContent = v.toFixed(1) + '×'; try { v > 0 ? map.setTerrain({ source: 'dem', exaggeration: v }) : map.setTerrain(null); } catch (er) { } $('#c3d').classList.toggle('on', v > 0); };
    $('#hsRange').oninput = e => { const v = +e.target.value; $('#hsVal').textContent = Math.round(v * 100) + '%'; map.setPaintProperty('hillshade', 'hillshade-exaggeration', v); };
    $$('#terrainBox [data-pitch]').forEach(b => b.onclick = () => map.easeTo({ pitch: +b.dataset.pitch, duration: 900 }));
    $('#tlRange').oninput = e => M.setYear(+e.target.value);
    $('#tlTicks').innerHTML = Array.from({ length: 18 }, (_, i) => `<span>${i % 3 === 0 || i === 17 ? 2008 + i : '·'}</span>`).join('');
    $('#tlPlay').onclick = () => {
      if (M.playing) { clearInterval(M.playing); M.playing = null; $('#tlPlay').innerHTML = CD.icon('play'); return; }
      if (M.year >= 2025) M.setYear(2008);
      $('#tlPlay').innerHTML = CD.icon('pause');
      M.playing = setInterval(() => { if (M.year >= 2025) { $('#tlPlay').click(); return; } M.setYear(M.year + 1); }, 900);
    };
    $('#tlClose').onclick = () => { CD.LAYERS.filter(d => d.timeline).forEach(d => M.toggleLayer(d.id, false)); };
    $('#sideClose').onclick = () => $('#side').classList.add('closed');
    $('#sideToggle').onclick = () => $('#side').classList.remove('closed');
    $$('#side .tabs [data-tab]').forEach(b => b.onclick = () => {
      $$('#side .tabs [data-tab]').forEach(x => x.classList.toggle('on', x === b));
      $$('#side .tabpane').forEach(p => p.classList.toggle('on', p.id === b.dataset.tab));
    });
    $$('[data-close="mapStory"]').forEach(b => b.onclick = () => M.closeStory());
  }
  M.home = () => M.map.flyTo({ center: CD.VIEW.center, zoom: CD.VIEW.zoom, pitch: CD.VIEW.pitch, bearing: CD.VIEW.bearing, duration: 2200 });

  /* ======================================================= interação com feições */
  const interactive = () => CD.LAYERS.filter(d => d.on && d.tipo !== 'html' && M.map.getLayer(layerIds(d)[0])).flatMap(d => d.tipo === 'fill' ? [d.id + '-f'] : d.tipo === 'bordado' ? [d.id + '-f', d.id + '-lim'] : d.tipo === 'misto' ? [d.id + '-l', d.id] : d.tipo === 'calor' ? [d.id] : [d.id]).reverse();
  let hoverF = null, tip = { remove() { } };
  function bindMapEvents() {
    const map = M.map;
    tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'hover-tip' });
    map.on('mousemove', e => {
      const el = map.queryTerrainElevation ? map.queryTerrainElevation(e.lngLat) : null;
      $('#coords').textContent = `${Math.abs(e.lngLat.lat).toFixed(4)}° ${e.lngLat.lat < 0 ? 'S' : 'N'} · ${Math.abs(e.lngLat.lng).toFixed(4)}° O${el != null ? ' · ' + Math.round(el / (map.getTerrain() ? map.getTerrain().exaggeration || 1 : 1)) + ' m' : ''}`;
      if (document.body.classList.contains('editing')) return;
      const fs = map.queryRenderedFeatures(e.point, { layers: interactive() });
      if (hoverF) { map.setFeatureState(hoverF, { hover: false }); hoverF = null; }
      if (fs.length) {
        const f = fs[0]; const d = def(f.layer.id.replace(/-(f|lim|l)$/, ''));
        if (f.id != null) { hoverF = { source: f.source, id: f.id }; map.setFeatureState(hoverF, { hover: true }); }
        map.getCanvas().style.cursor = 'pointer';
        tip.setLngLat(e.lngLat).setHTML(`<b>${CD.esc(d.titulo ? d.titulo(f.properties) : d.nome)}</b><span>${CD.esc(d.nome)}</span>`).addTo(map);
      } else { map.getCanvas().style.cursor = ''; tip.remove(); }
    });
    map.on('mouseout', () => tip.remove());
    map.on('click', e => {
      if (document.body.classList.contains('editing')) { M.newPoint(e.lngLat); return; }
      const fs = map.queryRenderedFeatures(e.point, { layers: interactive() });
      if (!fs.length) return;
      const f = fs[0]; const d = def(f.layer.id.replace(/-(f|lim|l)$/, ''));
      M.showFeature(d, f.properties, e.lngLat);
    });
  }
  M.showFeature = function (d, p, lngLat) {
    const rows = d.info ? d.info(p).filter(r => r[1] != null && r[1] !== '' && r[1] !== 'None') : [];
    const near = lngLat ? nearestPoint(lngLat) : null;
    openStory(`<div class="story-hero empty"></div><div class="story-content">
      <span class="cat"><i style="background:${d.sw ? d.sw.cor : '#999'}"></i>${CD.esc(d.nome)}</span>
      <h2>${CD.esc(d.titulo ? d.titulo(p) : d.nome)}</h2>
      ${d.corpo ? d.corpo(p) : d.desc ? `<p class="lead" style="font-size:13.5px">${d.desc}</p>` : ''}
      <table class="meta-table">${rows.map(r => `<tr><td>${CD.esc(r[0])}</td><td>${/^https?:/.test(String(r[1])) ? `<a href="${CD.esc(r[1])}" target="_blank" rel="noopener">abrir fonte ↗</a>` : CD.esc(r[1])}</td></tr>`).join('')}</table>
      ${lngLat ? `<p class="src" style="margin-top:10px">${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}</p>` : ''}
      ${near ? `<div class="story-actions"><button class="btn sm" data-open-point="${near.properties.id}">${CD.icon('pin')} Narrativa próxima: ${CD.esc(near.properties.titulo)}</button></div>` : ''}
      <div class="sources"><b>Fonte</b>${CD.esc(d.sub || '')}</div></div>`);
    const b = $('#mapStory [data-open-point]'); if (b) b.onclick = () => M.openPoint(b.dataset.openPoint);
  };
  function nearestPoint(ll) {
    let best = null, bd = 0.08;
    M.points.features.forEach(f => { const [x, y] = f.geometry.coordinates; const dd = Math.hypot(x - ll.lng, y - ll.lat); if (dd < bd) { bd = dd; best = f; } });
    return best;
  }
  function openStory(html, after) {
    const st = $('#mapStory'); $('.story-body', st).innerHTML = html; $('.story-body', st).scrollTop = 0; st.classList.add('on'); $('#mapView').classList.add('story-open');
    after && after(st);
  }
  M.closeStory = () => { $('#mapStory').classList.remove('on'); $('#mapView').classList.remove('story-open'); setSel(null); if (M.draft) { M.draft.remove(); M.draft = null; } };

  /* ======================================================= cidades */
  async function loadCities() {
    const gj = await CD.api.load('data/cidades.geojson', { features: [] });
    // camada 'Cidades e vilas' retirada do mapa; os nomes seguem só na busca
    M.data.cidades = gj;
  }

  /* ======================================================= pontos narrativos */
  async function loadPoints() {
    M.points = await CD.api.load('data/pontos.geojson', { type: 'FeatureCollection', features: [] });
    renderPoints();
  }
  function renderPoints() {
    Object.values(M.markers).forEach(m => m.remove()); M.markers = {};
    const vis = def('pontos').on;
    const noMapa = p => catNoMapa(p.categoria);
    M.points.features.forEach(f => {
      const p = f.properties; const c = (CD.CATS[p.categoria] || {}).cor || '#e3a857';
      const el = document.createElement('div'); el.className = 'mk'; el.style.background = c; el.style.color = c;
      el.innerHTML = `<span class="mk-label">${CD.esc(p.titulo)}</span>`;
      if (!vis || !noMapa(p)) el.style.display = 'none';
      el.addEventListener('click', ev => { ev.stopPropagation(); M.openPoint(p.id); });
      M.markers[p.id] = new maplibregl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(M.map);
    });
    renderPointList(); buildIndex();
  }
  let catFilter = null;
  function renderPointList() {
    const chips = $('#pointChips');
    chips.innerHTML = `<button class="chip ${!catFilter ? 'on' : ''}" data-c="">Todas</button>` + Object.entries(CD.CATS).filter(([k]) => catNoMapa(k)).map(([k, v]) => `<button class="chip ${catFilter === k ? 'on' : ''}" data-c="${k}"><i style="background:${v.cor}"></i>${v.nome}</button>`).join('');
    $$('.chip', chips).forEach(ch => ch.onclick = () => { catFilter = ch.dataset.c || null; renderPointList(); });
    if (catFilter && !catNoMapa(catFilter)) catFilter = null;
    const fs = sortedPoints().filter(f => catNoMapa(f.properties.categoria) && (!catFilter || f.properties.categoria === catFilter));
    $('#pointList').innerHTML = fs.length ? fs.map(f => { const p = f.properties; const c = CD.CATS[p.categoria] || {}; const im = (p.imagens || [])[0];
      return `<div class="pitem" data-id="${p.id}"><div class="thumb" style="${im ? `background-image:url('${CD.esc(im.src)}')` : `background:${c.cor || '#333'}33`}"></div>
        <div><span class="cat"><i style="background:${c.cor}"></i>${CD.esc(c.nome || '')}</span><h4>${CD.esc(p.titulo)}</h4><p>${CD.esc(p.resumo || '')}</p></div></div>`; }).join('')
      : '<p class="src">Nenhum ponto nesta categoria.</p>';
    $$('#pointList .pitem').forEach(el => el.onclick = () => M.openPoint(el.dataset.id));
  }
  const sortedPoints = () => M.points.features.slice().sort((a, b) => (a.properties.ordem || 999) - (b.properties.ordem || 999));
  function setSel(id) { Object.entries(M.markers).forEach(([k, m]) => m.getElement().classList.toggle('sel', k === id)); if (M.points) applyPointVis(); }
  /* área livre do mapa (descontando o painel da narrativa) para centralizar o foco */
  const focusPad = () => {
    const w = window.innerWidth, h = window.innerHeight;
    if (w > 900) return { top: 70, bottom: 60, left: 60, right: 470 };
    return { top: 70, bottom: Math.round(h * 0.52), left: 30, right: 30 };
  };
  M.flyToPoint = function (p, coords) {
    const cam = p.camera || {};
    const pad = focusPad();
    if (cam.bounds) return M.map.fitBounds(cam.bounds, { padding: pad, pitch: 0, bearing: 0, duration: 2400, essential: true, maxZoom: 13 });
    M.map.flyTo({ center: cam.center || coords, zoom: cam.zoom || 12.5, pitch: 0, bearing: 0, duration: 2400, essential: true, padding: pad });
  };
  M.openPoint = function (id, fly = true) {
    const f = M.points.features.find(x => x.properties.id === id); if (!f) return;
    const p = f.properties; M.current = id; setSel(id);
    if (M.tour && !M.tour.list.some(x => x.properties.id === id)) M.endTour();
    if (document.body.classList.contains('editing')) return M.editPoint(f);
    const at = null; // atlas de colagens retirado do site
    const extra = `<div class="story-actions">
      <button class="btn sm" data-act="fly">${CD.icon('camera')} Ver a paisagem</button>
      ${at ? `<button class="btn sm primary" data-act="atlas">${CD.icon('book')} Abrir no atlas</button>` : ''}
      </div>`;
    const tourNav = M.tour ? `<div class="story-nav"><button class="btn sm" data-act="prev">${CD.icon('left')} Anterior</button><span>${M.tour.i + 1} / ${M.tour.list.length}</span><button class="btn sm primary" data-act="next">Próximo ${CD.icon('right')}</button></div>` : '';
    openStory(CD.storyHTML(p, extra), st => {
      CD.bindLightbox(st, p.imagens || []);
      const q = s => $(`[data-act="${s}"]`, st);
      q('fly').onclick = () => M.flyToPoint(p, f.geometry.coordinates);
      if (q('atlas')) q('atlas').onclick = () => CD.App.openAtlas(p.atlas.id, p.atlas.hotspot);
    });
    const old = $('#mapStory .story-nav'); old && old.remove();
    if (tourNav) { $('#mapStory').insertAdjacentHTML('beforeend', tourNav); $('#mapStory [data-act="prev"]').onclick = () => M.tourStep(-1); $('#mapStory [data-act="next"]').onclick = () => M.tourStep(1); }
    if (fly) M.flyToPoint(p, f.geometry.coordinates);
  };

  /* ---------- percurso: linha do trajeto, paradas numeradas e foco na narrativa */
  const TOUR_NOMES = { principal: 'Cartografias em disputa', hidrovia: 'Hidrovia em disputa', encantados: 'Encantados e não humanos' };
  let tourMk = [];
  function tourGeo(list, i) {
    const cs = list.map(f => f.geometry.coordinates);
    return {
      type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { parte: 'feito' }, geometry: { type: 'LineString', coordinates: cs.slice(0, i + 1).length > 1 ? cs.slice(0, i + 1) : [cs[0], cs[0]] } },
        { type: 'Feature', properties: { parte: 'falta' }, geometry: { type: 'LineString', coordinates: cs.slice(i).length > 1 ? cs.slice(i) : [cs[i], cs[i]] } }
      ]
    };
  }
  function drawTour() {
    const map = M.map, T = M.tour; if (!T) return;
    const data = tourGeo(T.list, T.i);
    if (map.getSource('tour')) map.getSource('tour').setData(data);
    else {
      map.addSource('tour', { type: 'geojson', data });
      map.addLayer({ id: 'tour-casing', type: 'line', source: 'tour', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0b1112', 'line-width': 6, 'line-opacity': .55 } });
      map.addLayer({ id: 'tour-line', type: 'line', source: 'tour', layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['match', ['get', 'parte'], 'feito', '#f2c14e', '#fbf3e2'], 'line-width': ['match', ['get', 'parte'], 'feito', 3.4, 2.2],
          'line-dasharray': [1.6, 1.4], 'line-opacity': ['match', ['get', 'parte'], 'feito', .95, .7] } });
    }
    if (!tourMk.length) tourMk = T.list.map((f, k) => {
      const p = f.properties; const c = (CD.CATS[p.categoria] || {}).cor || '#e3a857';
      const el = document.createElement('div'); el.className = 'mk-num'; el.style.setProperty('--c', c);
      el.innerHTML = `<b>${k + 1}</b><span class="mk-label">${CD.esc(p.titulo)}</span>`;
      el.title = p.titulo;
      el.addEventListener('click', ev => { ev.stopPropagation(); M.tour.i = k; M.tourStep(0); });
      return new maplibregl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(map);
    });
    tourMk.forEach((m, k) => { const el = m.getElement(); el.classList.toggle('on', k === T.i); el.classList.toggle('done', k < T.i); });
    $('#tourDots').innerHTML = T.list.map((f, k) => `<i class="${k === T.i ? 'on' : k < T.i ? 'done' : ''}" data-k="${k}" title="${CD.esc(f.properties.titulo)}"></i>`).join('');
    $$('#tourDots i').forEach(d => d.onclick = () => { M.tour.i = +d.dataset.k; M.tourStep(0); });
  }
  function clearTour() {
    const map = M.map;
    ['tour-line', 'tour-casing'].forEach(l => map.getLayer(l) && map.removeLayer(l));
    if (map.getSource('tour')) map.removeSource('tour');
    tourMk.forEach(m => m.remove()); tourMk = [];
  }
  M.startTour = function (route = 'principal') {
    const list = sortedPoints().filter(f => f.properties.ordem && (route === 'principal' ? !f.properties.percurso : f.properties.percurso === route));
    if (!list.length) return CD.toast('Defina o campo “ordem no percurso” em algum ponto.');
    if (M.tour) clearTour();
    M.tour = { list, i: 0, route }; $('#tourBar b').textContent = TOUR_NOMES[route] || 'Percurso'; $('#tourBar').classList.add('on');
    document.body.classList.add('touring');
    drawTour(); applyPointVis();
    // visão geral do trajeto antes de mergulhar no primeiro ponto
    const b = new maplibregl.LngLatBounds(); list.forEach(f => b.extend(f.geometry.coordinates));
    M.map.fitBounds(b, { padding: { top: 90, bottom: 80, left: 60, right: 60 }, pitch: 0, bearing: 0, duration: 1600, maxZoom: 11 });
    clearTimeout(M._tourT); M._tourT = setTimeout(() => M.tour && M.tourStep(0), 2300);
  };
  M.tourStep = function (k) {
    if (!M.tour) return;
    clearTimeout(M._tourT);
    M.tour.i = Math.max(0, Math.min(M.tour.list.length - 1, M.tour.i + k));
    $('#tourPos').textContent = `${M.tour.i + 1} de ${M.tour.list.length}`;
    drawTour();
    M.openPoint(M.tour.list[M.tour.i].properties.id);
  };
  M.endTour = () => {
    clearTimeout(M._tourT);
    if (!M.tour) return;
    M.tour = null; clearTour(); document.body.classList.remove('touring');
    $('#tourBar').classList.remove('on'); const n = $('#mapStory .story-nav'); n && n.remove(); applyPointVis();
  };
  $('#tourPrev').onclick = () => M.tourStep(-1); $('#tourNext').onclick = () => M.tourStep(1); $('#tourEnd').onclick = () => M.endTour();
  document.addEventListener('keydown', e => { if (!M.tour || /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') M.tourStep(1); else if (e.key === 'ArrowLeft') M.tourStep(-1); else if (e.key === 'Escape') M.endTour(); });

  /* ---------- edição */
  M.newPoint = function (ll) {
    const f = { type: 'Feature', geometry: { type: 'Point', coordinates: [+ll.lng.toFixed(6), +ll.lat.toFixed(6)] }, properties: { id: CD.uid('p'), titulo: '', categoria: 'aguas', resumo: '', texto: '', imagens: [], fontes: '', novo: true } };
    M.editPoint(f);
  };
  M.editPoint = function (f) {
    const p = f.properties; const isNew = !!p.novo;
    if (M.draft) { M.draft.remove(); M.draft = null; }
    let coords = f.geometry.coordinates.slice();
    if (isNew) { const el = document.createElement('div'); el.className = 'mk-new'; M.draft = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(coords).addTo(M.map); M.draft.on('dragend', () => { const l = M.draft.getLngLat(); coords = [+l.lng.toFixed(6), +l.lat.toFixed(6)]; $('#fLon').value = coords[0]; $('#fLat').value = coords[1]; }); }
    else { const mk = M.markers[p.id]; if (mk) { mk.setDraggable(true); mk.on('dragend', () => { const l = mk.getLngLat(); coords = [+l.lng.toFixed(6), +l.lat.toFixed(6)]; $('#fLon').value = coords[0]; $('#fLat').value = coords[1]; }); } }
    let cam = p.camera || null;
    const atlases = CD.Atlas.list();
    openStory(`<div class="form">
      <h2>${isNew ? 'Novo ponto narrativo' : 'Editar ponto'}</h2>
      <div class="sub">Arraste o marcador no mapa para reposicionar. Textos aceitam parágrafos, **negrito**, *itálico*, &gt; citação e [links](https://…).</div>
      <div class="fld"><label>Título</label><input id="fTit" value="${CD.esc(p.titulo)}" placeholder="Ex.: A cobra-grande do Lago Verde"></div>
      <div class="row2"><div class="fld"><label>Categoria</label><select id="fCat">${CD.catOptions(p.categoria)}</select></div>
        <div class="fld"><label>Ordem no percurso</label><input id="fOrd" type="number" min="0" value="${p.ordem || ''}" placeholder="vazio = fora do percurso"></div></div>
      <div class="fld"><label>Resumo (uma frase)</label><input id="fRes" value="${CD.esc(p.resumo || '')}"></div>
      <div class="fld"><label>Texto</label><textarea id="fTxt" rows="9">${CD.esc(p.texto || '')}</textarea></div>
      <div class="fld"><label>Imagens</label><div id="fImgs"></div><small>A primeira imagem é a capa. Com o servidor local ativo, os arquivos são copiados para a pasta <b>media/</b>.</small></div>
      <div class="fld"><label>Fontes / referências</label><textarea id="fFon" rows="3" style="min-height:70px">${CD.esc(p.fontes || '')}</textarea></div>
      <div class="row2"><div class="fld"><label>Atlas relacionado</label><select id="fAt"><option value="">— nenhum —</option>${atlases.map(a => `<option value="${a.id}" ${p.atlas && p.atlas.id === a.id ? 'selected' : ''}>${CD.esc(a.titulo)}</option>`).join('')}</select></div>
        <div class="fld"><label>Hotspot</label><select id="fHs"></select></div></div>
      <div class="row2"><div class="fld"><label>Longitude</label><input id="fLon" value="${coords[0]}"></div><div class="fld"><label>Latitude</label><input id="fLat" value="${coords[1]}"></div></div>
      <div class="fld"><label>Vista 3D da história</label><button class="btn sm" id="fCam">${CD.icon('camera')} Usar a vista atual do mapa</button> <small id="fCamInfo">${cam ? `zoom ${cam.zoom.toFixed(1)} · inclinação ${Math.round(cam.pitch)}° · rumo ${Math.round(cam.bearing)}°` : 'não definida (usa uma vista padrão)'}</small></div>
      <div class="form-actions">${!isNew ? `<button class="btn danger" id="fDel">${CD.icon('trash')} Excluir</button>` : ''}<span style="flex:1"></span><button class="btn" id="fCancel">Cancelar</button><button class="btn primary" id="fSave">${CD.icon('save')} Salvar</button></div>
    </div>`);
    const imgs = CD.imageEditor($('#fImgs'), p.imagens || []);
    const fillHs = () => { const a = CD.Atlas.get($('#fAt').value); $('#fHs').innerHTML = '<option value="">— obra inteira —</option>' + (a ? a.hotspots.map(h => `<option value="${h.id}" ${p.atlas && p.atlas.hotspot === h.id ? 'selected' : ''}>${CD.esc(h.titulo)}</option>`).join('') : ''); };
    fillHs(); $('#fAt').onchange = fillHs;
    $('#fCam').onclick = e => { e.preventDefault(); const c = M.map.getCenter(); cam = { center: [+c.lng.toFixed(5), +c.lat.toFixed(5)], zoom: M.map.getZoom(), pitch: M.map.getPitch(), bearing: M.map.getBearing() }; $('#fCamInfo').textContent = `zoom ${cam.zoom.toFixed(1)} · inclinação ${Math.round(cam.pitch)}° · rumo ${Math.round(cam.bearing)}°`; };
    $('#fCancel').onclick = () => { M.closeStory(); renderPoints(); };
    if ($('#fDel')) $('#fDel').onclick = async () => {
      if (!confirm('Excluir o ponto “' + (p.titulo || 'sem título') + '”?')) return;
      M.points.features = M.points.features.filter(x => x.properties.id !== p.id);
      const r = await CD.api.save('data/pontos.geojson', M.points); CD.toast(CD.savedMsg(r)); M.closeStory(); renderPoints();
    };
    $('#fSave').onclick = async () => {
      const np = { id: p.id, titulo: $('#fTit').value.trim() || 'Sem título', categoria: $('#fCat').value, resumo: $('#fRes').value.trim(), texto: $('#fTxt').value, imagens: imgs.get(), fontes: $('#fFon').value.trim() };
      const o = parseInt($('#fOrd').value, 10); if (o) np.ordem = o;
      if (p.percurso) np.percurso = p.percurso;
      if ($('#fAt').value) np.atlas = { id: $('#fAt').value, hotspot: $('#fHs').value || null };
      if (cam) np.camera = cam;
      const nc = [parseFloat($('#fLon').value), parseFloat($('#fLat').value)];
      const nf = { type: 'Feature', geometry: { type: 'Point', coordinates: isFinite(nc[0]) && isFinite(nc[1]) ? nc : coords }, properties: np };
      const i = M.points.features.findIndex(x => x.properties.id === p.id);
      if (i >= 0) M.points.features[i] = nf; else M.points.features.push(nf);
      const r = await CD.api.save('data/pontos.geojson', M.points);
      CD.toast(CD.savedMsg(r));
      if (M.draft) { M.draft.remove(); M.draft = null; }
      renderPoints(); M.closeStory();
    };
  };
  M.setEditing = on => {
    $('#editHint').style.display = on ? '' : 'none';
    if (!on) { Object.values(M.markers).forEach(m => m.setDraggable(false)); if (M.draft) { M.draft.remove(); M.draft = null; } }
    tip.remove();
  };
  M.exportPoints = () => CD.api.download('pontos.geojson', M.points);

  /* ======================================================= marcadores dos atlas */
  M.drawAtlasMarkers = function () {
    if (!window.maplibregl || !M.map || !M.map.addLayer || !def('atlasmk')) return;
    M.atlasMarkers.forEach(m => m.remove()); M.atlasMarkers = [];
    CD.Atlas.list().forEach(a => {
      if (!a.geo) return;
      const el = document.createElement('div'); el.className = 'mk-atlas'; el.style.backgroundImage = `url('${a.capa}')`; el.title = a.titulo; el.dataset.k = CD.Atlas.label ? CD.Atlas.label(a).toUpperCase() : 'ATLAS';
      if (!def('atlasmk').on) el.style.display = 'none';
      el.onclick = ev => { ev.stopPropagation(); CD.App.openAtlas(a.id); };
      M.atlasMarkers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(a.geo).addTo(M.map));
    });
  };

  /* ======================================================= busca */
  let index = [];
  async function buildIndex() {
    index = [];
    M.points.features.forEach(f => index.push({ t: f.properties.titulo, s: 'Narrativa', c: f.geometry.coordinates, go: () => M.openPoint(f.properties.id) }));
    (M.data.cidades ? M.data.cidades.features : []).forEach(f => index.push({ t: f.properties.Nome, s: 'Cidade · ' + f.properties.Tipo, c: f.geometry.coordinates, z: 11 }));
    const need = [['arq', 'data/arqueologia.geojson'], ['uc', 'data/icmbio.geojson'], ['portos', 'data/portos.geojson']];
    for (const [k, path] of need) if (!M.data[k]) M.data[k] = await CD.api.load(path, { features: [] });
    M.data.arq.features.forEach(f => index.push({ t: f.properties.nome || f.properties.codigo, s: 'Sítio arqueológico · ' + (f.properties.classificacao || ''), c: f.geometry.coordinates, z: 13, go: () => { M.toggleLayer('arq', true); M.showFeature(def('arq'), f.properties); } }));
    M.data.portos.features.forEach(f => index.push({ t: f.properties.Nome, s: 'Porto · ' + f.properties.Local, c: f.geometry.coordinates, z: 12 }));
    M.data.uc.features.forEach(f => { const b = bbox(f.geometry); index.push({ t: f.properties.nome, s: 'Unidade de conservação · ' + f.properties.categoria, b, go: () => { M.toggleLayer('uc', true); M.showFeature(def('uc'), f.properties); } }); });
    if (def('atlasmk')) CD.Atlas.list().forEach(a => (a.hotspots || []).forEach(h => index.push({ t: h.titulo, s: 'Atlas · ' + a.titulo, go: () => CD.App.openAtlas(a.id, h.id) })));
  }
  M.rebuildIndex = buildIndex;
  function bbox(g) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; const w = c => typeof c[0] === 'number' ? (x0 = Math.min(x0, c[0]), y0 = Math.min(y0, c[1]), x1 = Math.max(x1, c[0]), y1 = Math.max(y1, c[1])) : c.forEach(w); w(g.coordinates); return [[x0, y0], [x1, y1]]; }
  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  $('#search').addEventListener('input', e => {
    const q = norm(e.target.value.trim()); const box = $('#searchResults');
    if (q.length < 2) { box.classList.remove('on'); return; }
    const res = index.filter(r => norm(r.t).includes(q)).slice(0, 30);
    box.innerHTML = res.length ? res.map((r, i) => `<div data-i="${i}">${CD.esc(r.t)}<small>${CD.esc(r.s)}</small></div>`).join('') : '<div><small>Nada encontrado</small></div>';
    box.classList.add('on');
    $$('div[data-i]', box).forEach(el => el.onclick = () => {
      const r = res[+el.dataset.i]; box.classList.remove('on');
      if (r.b) M.map.fitBounds(r.b, { padding: 80, pitch: 0, duration: 2000 });
      else if (r.c) M.map.flyTo({ center: r.c, zoom: r.z || 11, pitch: 0, duration: 2200 });
      r.go && r.go();
    });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.searchbox')) $('#searchResults').classList.remove('on'); });

  /* ======================================================= dados / estatísticas */
  async function buildStats() {
    M.stats = await CD.api.load('data/desmatamento_stats.json', null);
    const arq = M.data.arq.features, uc = M.data.uc.features;
    const kmArea = g => { let A = 0; const ring = r => { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(a) / 2; };
      (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).forEach(p => { A += ring(p[0]); for (let k = 1; k < p.length; k++) A -= ring(p[k]); }); return A * 111.32 * 110.57 * Math.cos(3 * Math.PI / 180); };
    const ucA = { PI: 0, US: 0 }; uc.forEach(f => ucA[f.properties.grupo === 'PI' ? 'PI' : 'US'] += kmArea(f.geometry));
    const st = M.stats;
    $('#stats').innerHTML = [
      [arq.length, 'sítios arqueológicos (IPHAN)'], [uc.length, 'unidades de conservação federais'],
      [st ? Math.round(st.total_2008_2025_km2).toLocaleString('pt-BR') + ' km²' : '—', 'desmatados 2008–2025'], [st ? Math.round(st.anterior_2008_km2).toLocaleString('pt-BR') + ' km²' : '—', 'desmatados até 2007'],
      [M.points.features.length, 'pontos narrativos']
    ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
    const cnt = {}; arq.forEach(f => cnt[f.properties.classificacao || 'Sem classificação'] = (cnt[f.properties.classificacao || 'Sem classificação'] || 0) + 1);
    const lg = def('arq').legenda;
    $('#arqStats').innerHTML = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => { const c = (lg.find(x => x[1].toLowerCase() === k.toLowerCase()) || ['#a9876a'])[0]; return `<div><i style="background:${c}"></i>${k}: <b style="color:var(--text)">${v}</b></div>`; }).join('');
    $('#ucStats').innerHTML = `<div><i style="background:#3f9a5c"></i>Proteção integral: <b style="color:var(--text)">${uc.filter(f => f.properties.grupo === 'PI').length}</b> · ~${Math.round(ucA.PI).toLocaleString('pt-BR')} km² no recorte</div>
      <div><i style="background:#9cc36b"></i>Uso sustentável: <b style="color:var(--text)">${uc.filter(f => f.properties.grupo !== 'PI').length}</b> · ~${Math.round(ucA.US).toLocaleString('pt-BR')} km² no recorte</div>`;
    applyYear();
  }
  function drawChart() {
    const st = M.stats; if (!st) return;
    const svg = $('#chart'); const W = svg.clientWidth || 300, H = 170, pad = 22;
    const max = Math.max(...st.anos.map(a => a.km2));
    const bw = (W - pad) / st.anos.length;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = [0, .5, 1].map(k => `<line x1="${pad}" x2="${W}" y1="${H - 18 - (H - 34) * k}" y2="${H - 18 - (H - 34) * k}" stroke="rgba(255,255,255,.07)"/><text x="0" y="${H - 15 - (H - 34) * k}">${Math.round(max * k)}</text>`).join('') +
      st.anos.map((a, i) => { const h = (H - 34) * a.km2 / max; const cls = a.ano === M.year ? 'cur' : a.ano > M.year ? 'future' : '';
        return `<rect class="bar ${cls}" data-y="${a.ano}" x="${pad + i * bw + 1.5}" y="${H - 18 - h}" width="${bw - 3}" height="${h}" rx="2" style="cursor:pointer"><title>${a.ano}: ${a.km2} km²</title></rect>${i % 3 === 0 || i === st.anos.length - 1 ? `<text x="${pad + i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${String(a.ano).slice(2)}</text>` : ''}`; }).join('');
    $$('rect[data-y]', svg).forEach(r => r.onclick = () => M.toggleLayer('desm_acum', true));
  }
  window.addEventListener('resize', () => drawChart());
})();
