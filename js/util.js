/* Utilidades: persistência (servidor local ou navegador), UI básica */
(function () {
  const CD = window.CD;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  CD.$ = $; CD.$$ = $$;

  CD.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  CD.icon = (id, cls = '') => `<svg class="i ${cls}"><use href="#i-${id}"/></svg>`;
  CD.uid = (p = 'p') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* Markdown simplificado: parágrafos, **negrito**, *itálico*, > citação, [link](url) */
  CD.md = function (txt) {
    if (!txt) return '';
    const inline = t => CD.esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+|[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return String(txt).split(/\n\s*\n/).map(block => {
      const lines = block.trim().split('\n'); let out = '', buf = [], mode = null;
      const flush = () => {
        if (!buf.length) return;
        if (mode === 'ul') out += '<ul>' + buf.map(l => '<li>' + inline(l.replace(/^\s*[-•]\s+/, '')) + '</li>').join('') + '</ul>';
        else if (mode === 'tb') {
          const rows = buf.filter(l => !/^\s*\|?\s*:?-{2,}/.test(l)).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
          out += '<div class="md-table"><table>' + rows.map((r, i) => '<tr>' + r.map(c => i ? '<td>' + inline(c) + '</td>' : '<th>' + inline(c) + '</th>').join('') + '</tr>').join('') + '</table></div>';
        } else if (mode === 'q') out += '<blockquote>' + buf.map(l => inline(l.replace(/^>\s?/, ''))).join('<br>') + '</blockquote>';
        else out += '<p>' + buf.map(inline).join('<br>') + '</p>';
        buf = []; mode = null;
      };
      lines.forEach(l => {
        const m = /^\s*[-•]\s+/.test(l) ? 'ul' : /^\s*\|/.test(l) ? 'tb' : /^>/.test(l) ? 'q' : 'p';
        if (m !== mode) flush(); mode = m; buf.push(l);
      });
      flush(); return out;
    }).join('');
  };

  /* ------------------------------------------------ toast, lightbox, modal */
  let tt;
  CD.toast = (msg, err) => {
    const t = $('#toast'); t.textContent = msg; t.className = 'on' + (err ? ' err' : '');
    clearTimeout(tt); tt = setTimeout(() => t.className = '', err ? 5200 : 2800);
  };
  CD.lightbox = (src, cap) => {
    const lb = $('#lightbox'); $('img', lb).src = src; $('p', lb).textContent = cap || ''; lb.classList.add('on');
  };
  document.addEventListener('click', e => {
    if (e.target.closest('#lightbox')) $('#lightbox').classList.remove('on');
    const cm = e.target.closest('[data-close-modal]'); if (cm) cm.closest('.modal').classList.remove('on');
    if (e.target.classList && e.target.classList.contains('modal')) e.target.classList.remove('on');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { $('#lightbox').classList.remove('on'); $$('.modal.on').forEach(m => m.classList.remove('on')); }
  });

  /* ------------------------------------------------ persistência */
  const LS = 'cartografias:';
  const api = CD.api = { server: false };
  api.check = async () => {
    try {
      const r = await fetch('api/status', { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); api.server = !!j.ok; }
    } catch (e) { api.server = false; }
    return api.server;
  };
  api.load = async (path, fallback) => {
    const local = (() => { try { return localStorage.getItem(LS + path); } catch (e) { return null; } })();
    if (local && !api.server) { try { return JSON.parse(local); } catch (e) { } }
    try {
      const r = await fetch(path + (path.includes('?') ? '&' : '?') + 't=' + Date.now());
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      if (local) try { return JSON.parse(local); } catch (er) { }
      return fallback;
    }
  };
  api.save = async (path, obj) => {
    const txt = JSON.stringify(obj, null, 1);
    if (api.server) {
      try {
        const r = await fetch('api/salvar', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ arquivo: path, conteudo: txt }) });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.erro || r.status);
        try { localStorage.removeItem(LS + path); } catch (e) { }
        return { ok: true, where: 'pasta' };
      } catch (e) {
        CD.toast('Não foi possível salvar na pasta: ' + e.message, true);
      }
    }
    try { localStorage.setItem(LS + path, txt); } catch (e) { CD.toast('Sem espaço no navegador — exporte o arquivo.', true); return { ok: false }; }
    return { ok: true, where: 'navegador' };
  };
  api.upload = async (file) => {
    if (api.server) {
      const nome = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_').toLowerCase();
      const r = await fetch('api/upload?nome=' + encodeURIComponent(nome), { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.erro || 'falha no envio');
      return j.caminho;
    }
    // sem servidor: reduz e incorpora como dataURL
    return await new Promise((res, rej) => {
      const img = new Image(); const fr = new FileReader();
      fr.onload = () => { img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82));
      }; img.onerror = rej; img.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  };
  api.download = (name, obj) => {
    const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  CD.savedMsg = r => r.where === 'pasta' ? 'Salvo na pasta do projeto.' : 'Salvo neste navegador (servidor local inativo). Use “Exportar” para guardar o arquivo.';

  /* escolher imagens */
  CD.pickImages = () => new Promise(res => {
    const fp = $('#filePick'); fp.value = '';
    fp.onchange = () => res(Array.from(fp.files || []));
    fp.click();
  });

  /* editor de lista de imagens reutilizável (pontos e hotspots) */
  CD.imageEditor = function (container, imgs) {
    const list = imgs.map(x => Object.assign({}, x));
    function render() {
      container.innerHTML = `<div class="imglist">${list.map((im, i) => `
        <div class="imgrow" data-i="${i}"><div class="t" style="background-image:url('${CD.esc(im.src)}')"></div>
          <div><input class="cap" placeholder="Legenda / crédito" value="${CD.esc(im.legenda || '')}"></div>
          <div style="display:flex;gap:4px">
            <button class="btn icon sm up" title="Mover para cima">${CD.icon('left')}</button>
            <button class="btn icon sm danger del" title="Remover">${CD.icon('trash')}</button></div></div>`).join('')}</div>
        <div class="drop">${CD.icon('image')} Arraste imagens aqui ou clique para escolher</div>
        <div class="row2" style="margin-top:8px"><input class="url" placeholder="…ou cole o endereço (URL) de uma imagem"><button class="btn sm addurl">Adicionar URL</button></div>`;
      CD.$$('.cap', container).forEach((inp, i) => inp.oninput = () => list[i].legenda = inp.value);
      CD.$$('.del', container).forEach((b, i) => b.onclick = e => { e.preventDefault(); list.splice(i, 1); render(); });
      CD.$$('.up', container).forEach((b, i) => b.onclick = e => { e.preventDefault(); if (i > 0) { const t = list[i]; list[i] = list[i - 1]; list[i - 1] = t; render(); } });
      const drop = CD.$('.drop', container);
      drop.onclick = async () => add(await CD.pickImages());
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); add(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))); };
      CD.$('.addurl', container).onclick = e => { e.preventDefault(); const u = CD.$('.url', container).value.trim(); if (u) { list.push({ src: u, legenda: '' }); render(); } };
    }
    async function add(files) {
      for (const f of files) {
        try { CD.toast('Enviando ' + f.name + '…'); const src = await CD.api.upload(f); list.push({ src, legenda: '' }); render(); }
        catch (e) { CD.toast('Falha ao enviar imagem: ' + e.message, true); }
      }
      if (files.length) CD.toast(files.length + ' imagem(ns) adicionada(s).');
    }
    render();
    return { get: () => list.filter(x => x.src) };
  };

  /* bloco de história (usado no mapa e no atlas) */
  CD.storyHTML = function (o, extra = '') {
    const cat = CD.CATS[o.categoria];
    const imgs = o.imagens || [];
    const hero = imgs[0];
    return `
      <div class="story-hero ${hero ? '' : 'empty'}" ${hero ? `style="background-image:url('${CD.esc(hero.src)}')" data-lb="0"` : ''}></div>
      <div class="story-content">
        ${cat ? `<span class="cat"><i style="background:${cat.cor}"></i>${CD.esc(cat.nome)}</span>` : ''}
        <h2>${CD.esc(o.titulo || 'Sem título')}</h2>
        ${o.resumo ? `<p class="lead">${CD.esc(o.resumo)}</p>` : ''}
        <div class="txt">${CD.md(o.texto)}</div>
        ${imgs.length > 1 ? `<div class="gallery">${imgs.map((im, i) => `<figure data-lb="${i}" style="background-image:url('${CD.esc(im.src)}')" title="${CD.esc(im.legenda || '')}"></figure>`).join('')}</div>` : ''}
        ${hero && hero.legenda ? `<p class="src" style="margin-top:8px">Imagem: ${CD.esc(hero.legenda)}</p>` : ''}
        ${extra}
        ${o.fontes ? `<div class="sources"><b>Fontes</b>${CD.md(o.fontes)}</div>` : ''}
      </div>`;
  };
  CD.bindLightbox = function (root, imgs) {
    CD.$$('[data-lb]', root).forEach(el => el.onclick = () => { const im = imgs[+el.dataset.lb]; if (im) CD.lightbox(im.src, im.legenda); });
  };
  CD.catOptions = sel => Object.entries(CD.CATS).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.nome}</option>`).join('');
})();
