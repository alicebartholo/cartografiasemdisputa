/* Configuração geral: categorias, mapas base, camadas */
window.CD = window.CD || {};

CD.CATS = {
  aguas:      { nome: 'Águas & Ser-Rio',          cor: '#2f6fd0' },
  encantes:   { nome: 'Encantes & Fundo',         cor: '#7b5cc4' },
  memoria:    { nome: 'Memória & Arqueologia',    cor: '#c07a2c' },
  territorio: { nome: 'Território & Resistência', cor: '#2f8a4e' },
  capital:    { nome: 'Infraestrutura & Capital', cor: '#c8102e' },
  ruptura:    { nome: 'Ruptura ecológica',        cor: '#e0b000' }
};

/* Dois mapas geográficos: cada camada pertence a um deles ou aos dois */
CD.MAPAS = {
  ext: { nome: 'Mapa do extrativismo', hash: 'extrativismo', cats: ['capital', 'ruptura', 'territorio'],
    desc: 'As linhas do planejamento: hidrovia das commodities, portos, estradas, Ferrogrão e o desmatamento que elas puxam.' },
  cos: { nome: 'Mapa cosmológico', hash: 'cosmologia', cats: ['aguas', 'encantes', 'memoria', 'territorio'],
    desc: 'As redes vivas: encantados, seres do rio, caminhos das comunidades, a TI Borari, a arqueologia e as águas.' }
};
const AMBOS = ['ext', 'cos'];
CD.LAYER_MAPAS = {
  pontos: AMBOS, ti: AMBOS, quilombos: AMBOS, resex_com: AMBOS, uc: AMBOS,
  hv_com: ['ext'], rodovia: ['ext'], portos: ['ext'], urb: ['ext'], desm_acum: ['ext'],
  en_lug: ['cos'], en_bord: ['cos'], bor_pts: ['cos'], bor_lim: ['cos'], arq: ['cos'], agua: AMBOS
};
// mapa de cada ponto narrativo: percurso primeiro, depois categoria
CD.mapaDoPonto = p => p.percurso === 'hidrovia' ? 'ext' : p.percurso === 'encantados' ? 'cos' : (['capital', 'ruptura'].includes(p.categoria) ? 'ext' : 'cos');

CD.VIEW = { center: [-55.05, -3.05], zoom: 7.1, pitch: 0, bearing: 0 };
CD.BOUNDS = [[-59.5, -6.6], [-51.2, 0.3]];

CD.BASEMAPS = [
  { id: 'ciano', nome: 'Cianotipia', padrao: true, thumb: 'media/capa_cianotipia.jpg', src: 'sat',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attr: 'Imagens © Esri, Maxar, Earthstar Geographics', max: 18,
    fundo: '#163f78', paint: { 'raster-saturation': -1, 'raster-contrast': 0.35, 'raster-opacity': 0.5, 'raster-brightness-min': 0.15 }, relevo: 0.35 },
  { id: 'figura', nome: 'Figura-fundo', thumb: '', color: '#ffffff', agua: '#0d2c45', relevo: 0.25, attr: '' },
  { id: 'sat', nome: 'Satélite', thumb: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/6/32/22',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attr: 'Imagens © Esri, Maxar, Earthstar Geographics', labels: true, max: 18 },
  { id: 'topo', nome: 'Topográfico', thumb: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/6/32/22',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'], attr: '© Esri, HERE, Garmin, USGS, OpenStreetMap', max: 18 },
  { id: 'dark', nome: 'Noturno', thumb: 'https://a.basemaps.cartocdn.com/dark_all/6/22/32.png',
    tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', 'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'], attr: '© OpenStreetMap © CARTO', max: 19 },
  { id: 'light', nome: 'Claro', thumb: 'https://a.basemaps.cartocdn.com/light_all/6/22/32.png',
    tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png', 'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'], attr: '© OpenStreetMap © CARTO', max: 19 },
  { id: 'papel', nome: 'Papel', thumb: '', color: '#f6f4ee', relevo: 0.85, attr: '' }
];

/* Cada camada: id, grupo, nome, arquivo, tipo, pintura, legenda, info (atributos para o painel) */
const yearRamp = ['interpolate', ['linear'], ['get', 'y'], 2008, '#f7e27c', 2013, '#f3b94a', 2018, '#ea7d33', 2022, '#d8452a', 2025, '#a5161a'];

CD.GROUPS = [
  { id: 'narr', nome: 'Narrativas' },
  { id: 'hv', nome: 'Hidrovia em disputa · pesquisa 2026' },
  { id: 'en', nome: 'Encantados e não humanos · pesquisa 2026' },
  { id: 'bor', nome: 'TI Borari de Alter do Chão · autodemarcação 2025' },
  { id: 'terr', nome: 'Povos & territórios' },
  { id: 'mem', nome: 'Memória' },
  { id: 'agua', nome: 'Águas' },
  { id: 'infra', nome: 'Infraestrutura & capital' },
  { id: 'desm', nome: 'Desmatamento (PRODES)' }
];

CD.LAYERS = [
  // ---------------- narrativas (HTML markers)
  { id: 'pontos', grupo: 'narr', nome: 'Pontos narrativos', sub: 'histórias, imagens e relatos', tipo: 'html', on: true, sw: { cor: '#e3a857', forma: 'dot' },
    desc: 'Pontos criados no próprio geoportal (modo Editar). Cada ponto guarda texto, imagens, fontes e uma vista de câmera 3D.' },

  // ---------------- hidrovia em disputa (pesquisa out/2026)
  { id: 'hv_com', grupo: 'hv', nome: 'Hidrovia das commodities', sub: 'rota da soja e do milho, hidrovias oficiais (ANTAQ) + notícias e impactos', arquivo: 'data/hv_commodities.geojson', tipo: 'misto', on: true, raio: 7,
    corLinha: ['match', ['get', 'tipo'], 'comboio', '#c8102e', 'navio', '#7a0a1c', 'ferrograo', '#e07b00', 'antaq', '#ff8a70', '#c8102e'],
    largura: ['interpolate', ['linear'], ['zoom'], 5, ['match', ['get', 'tipo'], 'comboio', 3.2, 'antaq', 1.2, 2.2], 11, ['match', ['get', 'tipo'], 'comboio', 7, 'antaq', 2.2, 4]],
    corExpr: ['match', ['get', 'tipo'], 'terminal', '#c8102e', 'dragagem', '#ff7a1a', 'comunidade', '#2f8a4e', 'sagrado', '#7b5cc4', 'fauna', '#2f6fd0', 'mobilizacao', '#e0b000', 'politica', '#111111', '#888888'],
    sw: { cor: '#c8102e', forma: 'line' },
    legenda: [['#c8102e', 'Rota dos comboios de grãos (Miritituba → Santarém)'], ['#7a0a1c', 'Exportação por navios'], ['#e07b00', 'Ferrogrão projetada'], ['#ff8a70', 'Hidrovias oficiais (ANTAQ / SNV)'], ['#c8102e', '● Porto / terminal'], ['#ff7a1a', '● Dragagem'], ['#2f8a4e', '● Comunidade afetada'], ['#7b5cc4', '● Lugar sagrado / arqueológico'], ['#2f6fd0', '● Fauna e clima'], ['#e0b000', '● Mobilização'], ['#111111', '● Decisão política / projeto']],
    desc: 'O corredor de escoamento de commodities pelo Tapajós (Arco Norte), sobre a rede hidroviária oficial (ANTAQ / SNV), e, ao longo dele, pontos com notícias, relatórios e ações judiciais sobre o que a hidrovia degrada: portos, dragagem, comunidades, lugares sagrados, fauna e as lutas contra ela (até out/2026).',
    titulo: p => p.nome,
    info: p => p.kind === 'rota' ? [['Ciclo', p.ciclo], ['Descrição', p.descricao], ['Fontes', p.fonte], ['Link', p.url]] : [['Tema', p.categoria], ['O que acontece', p.situacao], ['Atores', p.atores], ['Impactos', p.impactos], ['Localização', p.precisao], ['Fontes', p.fonte], ['Link', p.url]] },
  // ---------------- encantados e não humanos (pesquisa out/2026)
  { id: 'en_lug', grupo: 'en', nome: 'Lugares encantados, sagrados e fauna', sub: 'Fundo, cemitérios, pedrais, botos e tucuxis · aproximado', arquivo: 'data/en_lugares.geojson', tipo: 'circle', on: true, raio: 7.5,
    corExpr: ['match', ['get', 'tipo'], 'fundo', '#4b2a8a', 'encantado', '#7b5cc4', 'cemiterio', '#1b1b1b', 'pedral', '#b08a3c', 'fauna', '#2f6fd0', '#888'],
    sw: { cor: '#7b5cc4', forma: 'dot' },
    legenda: [['#4b2a8a', 'O Fundo (trecho de dragagem)'], ['#7b5cc4', 'Lugar encantado / de respeito'], ['#1b1b1b', 'Cemitério / antepassados'], ['#b08a3c', 'Pedral / corredeira sagrada'], ['#2f6fd0', 'Fauna ameaçada']],
    desc: 'Lugares ligados aos encantados, aos mortos e aos animais do rio, com as ameaças associadas à hidrovia e a obras da mesma rota. Localizações aproximadas e indicativas: muitos lugares sagrados não devem ser expostos com precisão.',
    titulo: p => p.nome, info: p => [['Seres', p.ser], ['Ameaça', p.ameaca], ['Relato / dado', p.relato], ['Localização', p.precisao], ['Fontes', p.fonte], ['Link', p.url]] },

  { id: 'en_bord', grupo: 'en', nome: 'Encantados bordados', sub: 'Cobra Grande (Lago Verde) · Mulher de Dourado (TI Bragança-Marituba)', arquivo: 'data/encantados_bordados.geojson', tipo: 'bordado', on: true,
    obras: [
      { src: 'media/encantado_cobra_grande.webp', coords: [[-54.9558, -2.4865], [-54.9502, -2.4865], [-54.9502, -2.5045], [-54.9558, -2.5045]] },
      { src: 'media/encantado_mulher_dourado.webp', coords: [[-55.1007, -3.025], [-55.0893, -3.025], [-55.0893, -3.051], [-55.1007, -3.051]] }
    ],
    sw: { cor: '#e8b62c', forma: 'dot' },
    legenda: [['#e8b62c', 'Encantado bordado à mão, georreferenciado']],
    desc: 'Encantados da cartografia têxtil, bordados à mão e colocados no mapa onde vivem. A Cobra Grande está na divisa do Lago Verde com o Tapajós, em Alter do Chão. A Mulher de Dourado está na TI Munduruku Bragança-Marituba. As posições de lugares sagrados são indicativas.',
    titulo: p => p.nome,
    corpo: p => p.tipo === 'encantado' ? `<p class="bor-tipo" style="background:#b8860b">Encantado</p><h3 class="bor-h">${CD.esc(p.lugar || '')}</h3><p class="bor-txt">${CD.esc(p.texto || '')}</p>` : `<p class="bor-txt">${CD.esc(p.descricao || '')}</p>`,
    info: p => [['Localização', p.precisao], ['Fonte', p.fonte]] },

  // ---------------- TI Borari (Relatório de Autodemarcação, NEPES-UFOPA 2025)
  { id: 'bor_pts', grupo: 'bor', nome: 'Pontos de referência Borari', sub: 'sementes de olho-de-cabra · pontos de campo do relatório', arquivo: 'data/borari_pontos.geojson', tipo: 'seed', on: true,
    sw: { cor: '#d2431f', forma: 'dot' },
    legenda: [['#d2431f', 'Ponto de referência coletado em campo (drone com GPS)'], ['#8a1d10', 'Lugar sagrado citado no relatório (posição aproximada)']],
    desc: 'Os dez pontos de referência da autodemarcação (aldeias, lagos de pesca, pontas de praia e áreas de habitação), coletados em campo entre julho de 2024 e fevereiro de 2025, e dois lugares sagrados citados no relatório. Cada ponto é marcado com uma semente de olho-de-cabra, como na cartografia têxtil.',
    titulo: p => (p.n ? p.n + ' · ' : '') + p.nome,
    corpo: p => `<p class="bor-tipo">${CD.esc(p.categoria || '')}</p>
      <h3 class="bor-h">Importância para o povo Borari</h3>
      <p class="bor-txt">${CD.esc(p.importancia || '')}</p>
      ${p.depoimento ? `<blockquote class="bor-dep">“${CD.esc(p.depoimento)}”<cite>— ${CD.esc(p.depoimento_fonte || '')}</cite></blockquote>` : ''}`,
    info: p => [['Coleta em campo', p.data], ['Coordenadas', p.coord], ['Localização', p.precisao], ['Fonte', p.fonte]] },
  { id: 'bor_lim', grupo: 'bor', nome: 'Limites da TI Borari', sub: 'autodemarcação × delimitação FUNAI/INCRA', arquivo: 'data/borari_limites.geojson', tipo: 'line', on: true,
    corExpr: ['match', ['get', 'tipo'], 'auto', '#ff3355', '#9be37a'], largura: ['match', ['get', 'tipo'], 'auto', 3, 1.6], dash: [2.2, 1.3],
    sw: { cor: '#ff3355', forma: 'line' },
    legenda: [['#ff3355', 'Autodemarcação Borari (2025), em ponto alinhavo'], ['#9be37a', 'Delimitação FUNAI/INCRA (RCID 2009)']],
    desc: 'Contorno da autodemarcação feita pelo povo Borari com o NEPES-UFOPA, que inclui o Lago Verde e parte do Rio Tapajós, porque “água é território”. Em verde, a área de interesse da FUNAI/INCRA, que deixa de fora o Lago Verde e as pontas de praia. Ambos digitalizados da Figura 3 do relatório e georreferenciados pelos pontos de campo (precisão aproximada).',
    titulo: p => p.nome, info: p => [['Sobre', p.descricao], ['Precisão', p.precisao], ['Fonte', p.fonte]] },

  // ---------------- territórios
  { id: 'ti', grupo: 'terr', nome: 'Terras indígenas', sub: 'FUNAI', arquivo: 'data/terras_indigenas.geojson', tipo: 'fill', on: true,
    cor: '#c8102e', opac: 0.22, linha: '#ff5a6e', sw: { cor: '#c8102e' },
    desc: 'Terras indígenas no recorte da área de estudo, com nome, povo e fase do processo de demarcação (FUNAI, GeoServer, consulta em nov/2026).',
    titulo: p => p.nome || 'Terra indígena',
    info: p => [['Povo', p.povo], ['Fase', p.fase], ['Modalidade', p.modalidade], ['Área', p.area_ha != null ? Number(p.area_ha).toLocaleString('pt-BR') + ' ha' : ''], ['Municípios', p.municipios], ['Fonte', 'FUNAI']] },
  { id: 'resex_com', grupo: 'terr', nome: 'Comunidades e aldeias da Resex', sub: 'Tapajós-Arapiuns · OSM + ICMBio + pesquisas UFPA/UFOPA', arquivo: 'data/resex_comunidades.geojson', tipo: 'circle', on: true, raio: 5,
    corExpr: ['match', ['get', 'tipo'], 'aldeia', '#c8102e', '#f2efe6'], sw: { cor: '#c8102e', forma: 'dot' },
    legenda: [['#c8102e', 'Aldeia indígena'], ['#f2efe6', 'Comunidade']],
    desc: 'Comunidades e aldeias dentro e no limite da Reserva Extrativista Tapajós-Arapiuns (o ICMBio fala em cerca de 81). Posições do OpenStreetMap; povos das aldeias segundo pesquisas da UFPA/UFOPA e autodeclaração. Lista em construção: algumas aldeias citadas nas fontes ainda não têm coordenada.',
    titulo: p => p.nome,
    info: p => [['Tipo', p.tipo === 'aldeia' ? 'Aldeia indígena' : 'Comunidade'], ['Povo', p.povo], ['Situação', p.situacao], ['Localização', p.fonte_local], ['Fonte (aldeia)', p.fonte_aldeia]] },
  { id: 'quilombos', grupo: 'terr', nome: 'Territórios quilombolas', sub: 'INCRA', arquivo: 'data/quilombos.geojson', tipo: 'fill', on: true,
    cor: '#b06ad8', opac: 0.35, linha: '#e2c2ff', sw: { cor: '#b06ad8' },
    desc: 'Territórios quilombolas (INCRA) do Baixo Amazonas e Baixo Tapajós.',
    info: () => [['Fonte', 'INCRA'], ['Observação', 'Polígonos dissolvidos — sem atributos por comunidade neste arquivo']] },
  { id: 'uc', grupo: 'terr', nome: 'Unidades de conservação', sub: 'ICMBio — federais', arquivo: 'data/icmbio.geojson', tipo: 'fill', on: true,
    corExpr: ['match', ['get', 'categoria'], 'FLONA', '#2e8b4e', 'RESEX', '#e0a030', 'APA', '#b7d98a', '#2a8f8a'], opac: 0.26,
    linha: ['match', ['get', 'categoria'], 'FLONA', '#7be0a0', 'RESEX', '#ffd27a', 'APA', '#dff0c4', '#8fe0dc'], sw: { cor: '#2e8b4e' },
    legenda: [['#2e8b4e', 'Floresta Nacional (Flona) — ex.: Flona do Tapajós'], ['#e0a030', 'Reserva Extrativista (Resex) — ex.: Resex Tapajós-Arapiuns'], ['#b7d98a', 'Área de Proteção Ambiental (APA do Tapajós)'], ['#2a8f8a', 'Proteção integral (Parna, Esec, Rebio)']],
    desc: 'Unidades de conservação federais (ICMBio): Flona do Tapajós, Resex Tapajós-Arapiuns, APA do Tapajós, Parna da Amazônia, entre outras.',
    titulo: p => p.nome, info: p => [['Categoria', p.categoria], ['Grupo', p.grupo === 'PI' ? 'Proteção integral' : 'Uso sustentável'], ['Criação', p.ano], ['Ato legal', p.ato], ['Municípios', p.municipios], ['Jurisdição', p.jurisdicao]] },
  { id: 'urb', grupo: 'terr', nome: 'Áreas urbanizadas', sub: 'IBGE', arquivo: 'data/areas_urbanizadas.geojson', tipo: 'fill', on: true,
    cor: '#f1e4c4', opac: 0.55, linha: '#fff4d8', sw: { cor: '#f1e4c4' },
    titulo: p => 'Área urbanizada — ' + (p.nome || ''), info: p => [['UF', p.uf], ['Densidade', p.densidade], ['Porte', p.categoria]] },

  // ---------------- memória
  { id: 'arq', grupo: 'mem', nome: 'Sítios arqueológicos', sub: 'IPHAN — 546 sítios · mapa de calor', arquivo: 'data/arqueologia.geojson', tipo: 'calor', on: true,
    corExpr: ['match', ['get', 'classificacao'], 'Pré-colonial', '#f0b35e', 'Pré-colonial e Histórico', '#e58f4a', 'Histórico', '#c9c3b5', '#a9876a'],
    sw: { cor: '#e8503a', forma: 'dot' },
    legenda: [['#fde0d6', 'Poucos sítios'], ['#f4927a', ''], ['#e0412c', ''], ['#9e0f12', 'Maior concentração de sítios'], ['#f0b35e', '● De perto (zoom), cada sítio aparece como ponto: clique para ver a ficha']],
    desc: 'Cadastro Nacional de Sítios Arqueológicos (IPHAN), mostrado como mapa de calor: quanto mais escuro o vermelho, maior a concentração de sítios. Ao aproximar o mapa, os sítios aparecem um a um. Terra preta, cerâmica tapajônica e assentamentos de longa duração revelam séculos de manejo do território.',
    titulo: p => p.nome || 'Sítio arqueológico', info: p => [['Código IPHAN', p.codigo], ['Natureza', p.natureza], ['Classificação', p.classificacao], ['Síntese', p.sintese], ['Cadastro', p.data]] },

  // ---------------- águas
  { id: 'agua', grupo: 'agua', nome: 'Massas d’água', sub: 'rios e lagos', arquivo: 'data/massa_dagua.geojson', tipo: 'fill', on: true,
    cor: '#2f8fae', opac: 0.55, linha: '#7fd0e6', sw: { cor: '#2f8fae' }, info: () => [['Fonte', 'ANA — base hidrográfica']] },
  // ---------------- infraestrutura
  { id: 'rodovia', grupo: 'infra', nome: 'Rodovias', sub: 'BR-163, BR-230 e estaduais', arquivo: 'data/rodovia.geojson', tipo: 'line', on: true,
    corExpr: ['match', ['get', 'revestimento'], 'Pavimentado', '#e8505f', '#f08f98'], largura: ['interpolate', ['linear'], ['zoom'], 6, 0.8, 11, 2.4], sw: { cor: '#e8505f', forma: 'line' },
    legenda: [['#e8505f', 'Pavimentada'], ['#f08f98', 'Não pavimentada / outras']],
    titulo: p => p.sigla || 'Rodovia', info: p => [['Jurisdição', p.jurisdicao], ['Revestimento', p.revestimento], ['Situação', p.situacao]] },
  { id: 'portos', grupo: 'infra', nome: 'Portos e terminais', sub: '17 instalações', arquivo: 'data/portos.geojson', tipo: 'circle', on: true,
    cor: '#e0604a', raio: 6, sw: { cor: '#e0604a', forma: 'dot' },
    titulo: p => 'Porto — ' + p.Nome, info: p => [['UF', p.Unidade_Fe], ['Rio', p.Local]] },

  // ---------------- desmatamento
  { id: 'desm_acum', grupo: 'desm', nome: 'Desmatamento acumulado', sub: 'PRODES/INPE · até 2025', arquivo: 'data/desmatamento_acumulado.geojson', tipo: 'fill', on: true,
    cor: '#9a9a9a', opac: 0.7, sw: { cor: '#9a9a9a' },
    legenda: [['#9a9a9a', 'Área desmatada até 2025']],
    desc: 'Toda a floresta suprimida por corte raso no recorte, segundo o PRODES/INPE: a máscara histórica até 2007 somada aos incrementos anuais de 2008 a 2025. Para leveza, o mapa exibe polígonos a partir de 20 ha (40 ha na máscara histórica); as estatísticas consideram todos os polígonos.',
    titulo: p => p.y <= 2007 ? 'Desmatamento até 2007' : 'Desmatamento ' + p.y, info: p => [['Período', p.y <= 2007 ? 'até 2007' : 'PRODES ' + p.y], ['Área', (p.a * 100).toFixed(1) + ' ha'], ['Fonte', 'PRODES/INPE']] }
];
