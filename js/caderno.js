/* Caderno — folheador de páginas (sem bibliotecas externas)
   Capa sozinha à direita; depois, páginas em pares como no InDesign. */
(function () {
  const CD = window.CD, $ = CD.$;
  const K = CD.Caderno = { total: 0, spread: 0, single: false, busy: false, ready: false };
  const src = n => `caderno/pag/${String(n).padStart(2, '0')}.webp`;
  const thumb = n => `caderno/pag/t${String(n).padStart(2, '0')}.webp`;

  // páginas de cada abertura (null = vazio)
  function pagesOf(s) {
    if (K.single) return [s + 1];
    if (s === 0) return [null, 1];
    const l = 2 * s, r = 2 * s + 1;
    return [l <= K.total ? l : null, r <= K.total ? r : null];
  }
  const lastSpread = () => K.single ? K.total - 1 : Math.ceil(K.total / 2);
  const spreadOfPage = n => K.single ? n - 1 : Math.floor(n / 2);
  const pageImg = n => n ? `<img src="${src(n)}" alt="Página ${n}" draggable="false" decoding="async">` : '';
  function preload(s) { [s - 1, s + 1, s + 2].forEach(x => { if (x < 0 || x > lastSpread()) return; pagesOf(x).forEach(n => { if (n) { const i = new Image(); i.src = src(n); } }); }); }

  function render() {
    const [a, b] = pagesOf(K.spread);
    const book = $('#cadBook');
    book.classList.toggle('single', K.single);
    book.classList.toggle('cover', !K.single && K.spread === 0);
    book.classList.toggle('back', !K.single && b == null);
    $('#cadL').innerHTML = K.single ? '' : pageImg(a);
    $('#cadR').innerHTML = K.single ? pageImg(a) : pageImg(b);
    const lbl = K.single ? `${a} / ${K.total}` : (K.spread === 0 ? `capa / ${K.total}` : `${[a, b].filter(Boolean).join('–')} / ${K.total}`);
    $('#cadCount').textContent = lbl;
    $('#cadPrev').disabled = K.spread === 0; $('#cadNext').disabled = K.spread >= lastSpread();
    $$thumbs().forEach(t => t.classList.toggle('on', pagesOf(K.spread).includes(+t.dataset.p)));
    const on = document.querySelector('#cadThumbs .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    preload(K.spread);
    const h = '#caderno/' + (pagesOf(K.spread).find(Boolean) || 1);
    if (location.hash !== h) history.replaceState(null, '', h);
  }
  const $$thumbs = () => Array.from(document.querySelectorAll('#cadThumbs [data-p]'));

  function flip(dir) {
    const to = K.spread + dir;
    if (K.busy || to < 0 || to > lastSpread()) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { K.spread = to; render(); return; }
    K.busy = true; $('#cadernoView').classList.add('used');
    const [ca, cb] = pagesOf(K.spread), [na, nb] = pagesOf(to);
    const leaf = document.createElement('div');
    leaf.className = 'cad-leaf ' + (K.single ? 'one' : dir > 0 ? 'fwd' : 'bwd');
    if (K.single) {
      leaf.innerHTML = `<div class="face front">${pageImg(ca)}</div>`;
      $('#cadR').innerHTML = pageImg(na);
    } else if (dir > 0) {
      leaf.innerHTML = `<div class="face front">${pageImg(cb)}</div><div class="face backf">${pageImg(na)}</div>`;
      $('#cadR').innerHTML = pageImg(nb);
    } else {
      leaf.innerHTML = `<div class="face front">${pageImg(ca)}</div><div class="face backf">${pageImg(nb)}</div>`;
      $('#cadL').innerHTML = pageImg(na);
    }
    if (K.single && dir < 0) { leaf.innerHTML = `<div class="face front">${pageImg(na)}</div>`; leaf.classList.add('in'); $('#cadR').innerHTML = pageImg(ca); }
    $('#cadBook').appendChild(leaf);
    requestAnimationFrame(() => requestAnimationFrame(() => leaf.classList.add('go')));
    setTimeout(() => { leaf.remove(); K.spread = to; render(); K.busy = false; }, 720);
  }
  K.next = () => flip(1); K.prev = () => flip(-1);
  K.goPage = n => { n = Math.max(1, Math.min(K.total, n | 0)); K.spread = spreadOfPage(n); render(); };

  function layout() {
    const single = window.innerWidth < 760;
    if (single !== K.single) { const p = pagesOf(K.spread).find(Boolean) || 1; K.single = single; K.spread = spreadOfPage(p); }
    const stage = $('#cadStage'); if (!stage) return;
    const W = stage.clientWidth - 24, H = stage.clientHeight - 24, ratio = K.h / K.w;
    const pages = K.single ? 1 : 2;
    let pw = Math.min(W / pages, H / ratio); pw = Math.max(120, Math.floor(pw));
    const book = $('#cadBook'); book.style.width = pw * pages + 'px'; book.style.height = Math.round(pw * ratio) + 'px';
    render();
  }

  K.open = async function (page) {
    if (!K.ready) {
      try { const r = await fetch('caderno/caderno.json', { cache: 'no-cache' }); const j = await r.json(); K.total = j.paginas; K.w = j.largura; K.h = j.altura; }
      catch (e) { $('#cadStage').innerHTML = '<p class="dz-loading" style="color:#fff">Não foi possível carregar o caderno.</p>'; return; }
      $('#cadThumbs').innerHTML = Array.from({ length: K.total }, (_, i) => `<button data-p="${i + 1}" title="Página ${i + 1}"><img src="${thumb(i + 1)}" alt="" loading="lazy"><span>${i + 1}</span></button>`).join('');
      $('#cadThumbs').onclick = e => { const b = e.target.closest('[data-p]'); if (b) K.goPage(+b.dataset.p); };
      $('#cadPrev').onclick = K.prev; $('#cadNext').onclick = K.next;
      $('#cadL').onclick = () => { if (!K.single) K.prev(); };
      $('#cadR').onclick = () => K.next();
      $('#cadZoom').onclick = () => { const n = pagesOf(K.spread).filter(Boolean); CD.lightbox(src(n[n.length - 1]), 'Caderno · página ' + n[n.length - 1]); };
      $('#cadThumbsBtn').onclick = () => $('#cadernoView').classList.toggle('thumbs-on');
      document.addEventListener('keydown', e => {
        if (!$('#cadernoView').classList.contains('on') || e.target.closest('input,textarea')) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); K.next(); }
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); K.prev(); }
        if (e.key === 'Home') K.goPage(1); if (e.key === 'End') K.goPage(K.total);
      });
      let x0 = null; const st = $('#cadStage');
      st.addEventListener('pointerdown', e => { x0 = e.clientX; });
      st.addEventListener('pointerup', e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 50) { dx < 0 ? K.next() : K.prev(); } });
      window.addEventListener('resize', () => { if ($('#cadernoView').classList.contains('on')) layout(); });
      K.ready = true;
    }
    K.single = window.innerWidth < 760;
    K.spread = spreadOfPage(page || pagesOf(K.spread).find(Boolean) || 1);
    layout();
  };
})();
