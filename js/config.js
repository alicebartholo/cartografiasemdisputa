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

CD.VIEW = { center: [-55.05, -3.05], zoom: 7.1, pitch: 48, bearing: -12 };
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
  { id: 'atlasmk', grupo: 'narr', nome: 'Atlas ilustrados', sub: 'portas para as obras', tipo: 'html', on: true, sw: { cor: '#efe3c8' },
    desc: 'Miniaturas posicionadas no lugar a que cada obra se refere. Clique para abrir o atlas.' },
  { id: 'cidades', grupo: 'narr', nome: 'Cidades e vilas', tipo: 'html', on: true, sw: { cor: '#ffffff', forma: 'dot' }, arquivo: 'data/cidades.geojson' },

  // ---------------- hidrovia em disputa (pesquisa out/2026)
  { id: 'hv_conf', grupo: 'hv', nome: 'Conflitos da hidrovia', sub: 'terminais, dragagem, comunidades, lugares sagrados', arquivo: 'data/hv_conflitos.geojson', tipo: 'circle', on: true, raio: 7,
    corExpr: ['match', ['get', 'tipo'], 'terminal', '#c8102e', 'dragagem', '#ff7a1a', 'comunidade', '#2f8a4e', 'sagrado', '#7b5cc4', 'fauna', '#2f6fd0', 'mobilizacao', '#e0b000', '#888888'],
    sw: { cor: '#c8102e', forma: 'dot' },
    legenda: [['#c8102e', 'Terminal / porto'], ['#ff7a1a', 'Dragagem'], ['#2f8a4e', 'Comunidade / território afetado'], ['#7b5cc4', 'Lugar sagrado / arqueológico'], ['#2f6fd0', 'Reprodução de fauna'], ['#e0b000', 'Mobilização']],
    desc: 'Locais de conflito entre a hidrovia do Tapajós e os modos de vida locais, levantados em reportagens, relatórios e ações judiciais (até out/2026). Localizações aproximadas quando indicado.',
    titulo: p => p.nome, info: p => [['Situação', p.situacao], ['Atores', p.atores], ['Impactos', p.impactos], ['Localização', p.precisao], ['Fontes', p.fonte], ['Link', p.url]] },
  { id: 'hv_hum', grupo: 'hv', nome: 'Caminhos humanos e logísticos', sub: 'comboios, navios, pescadores, barqueata', arquivo: 'data/hv_caminhos_humanos.geojson', tipo: 'line', on: true,
    corExpr: ['match', ['get', 'tipo'], 'comboio', '#c8102e', 'navio', '#8a0c20', 'pesca', '#2f8a4e', 'mobilizacao', '#e0b000', '#888'], largura: ['interpolate', ['linear'], ['zoom'], 6, 2.2, 11, 5],
    sw: { cor: '#c8102e', forma: 'line' },
    legenda: [['#c8102e', 'Comboios graneleiros'], ['#8a0c20', 'Navios de exportação'], ['#2f8a4e', 'Pescadores'], ['#e0b000', 'Barqueata (2026)']],
    desc: 'Rotas da carga e rotas da vida cotidiana no mesmo rio. Os traçados de pesca e da barqueata são esquemáticos.',
    titulo: p => p.nome, info: p => [['Ciclo', p.ciclo], ['Descrição', p.descricao], ['Fontes', p.fonte]] },
  { id: 'hv_nh', grupo: 'hv', nome: 'Caminhos não humanos', sub: 'peixes, botos, quelônios, peixe-boi, sedimentos · esquemático', arquivo: 'data/hv_caminhos_nao_humanos.geojson', tipo: 'line', on: true, dash: [1.2, 1.4],
    corExpr: ['match', ['get', 'grupo'], 'peixe', '#2f6fd0', 'mamifero', '#7b5cc4', 'reptil', '#2f8a4e', 'materia', '#b08a3c', '#888'], largura: ['interpolate', ['linear'], ['zoom'], 6, 2.4, 11, 5.5],
    sw: { cor: '#2f6fd0', forma: 'line' },
    legenda: [['#2f6fd0', 'Peixes migradores'], ['#7b5cc4', 'Botos e peixe-boi'], ['#2f8a4e', 'Quelônios'], ['#b08a3c', 'Sedimento e mercúrio']],
    desc: 'Esquemas dos ciclos e deslocamentos de seres que também usam o rio como caminho. Não são rastreamentos: indicam rotas e ciclos descritos na literatura.',
    titulo: p => p.nome, info: p => [['Ciclo / caminho', p.ciclo], ['Interferência', p.interferencia], ['Fontes', p.fonte]] },

  // ---------------- encantados e não humanos (pesquisa out/2026)
  { id: 'en_lug', grupo: 'en', nome: 'Lugares encantados, sagrados e fauna', sub: 'Fundo, cemitérios, pedrais, botos e tucuxis · aproximado', arquivo: 'data/en_lugares.geojson', tipo: 'circle', on: true, raio: 7.5,
    corExpr: ['match', ['get', 'tipo'], 'fundo', '#4b2a8a', 'encantado', '#7b5cc4', 'cemiterio', '#1b1b1b', 'pedral', '#b08a3c', 'fauna', '#2f6fd0', '#888'],
    sw: { cor: '#7b5cc4', forma: 'dot' },
    legenda: [['#4b2a8a', 'O Fundo (trecho de dragagem)'], ['#7b5cc4', 'Lugar encantado / de respeito'], ['#1b1b1b', 'Cemitério / antepassados'], ['#b08a3c', 'Pedral / corredeira sagrada'], ['#2f6fd0', 'Fauna ameaçada']],
    desc: 'Lugares ligados aos encantados, aos mortos e aos animais do rio, com as ameaças associadas à hidrovia e a obras da mesma rota. Localizações aproximadas e indicativas: muitos lugares sagrados não devem ser expostos com precisão.',
    titulo: p => p.nome, info: p => [['Seres', p.ser], ['Ameaça', p.ameaca], ['Relato / dado', p.relato], ['Localização', p.precisao], ['Fontes', p.fonte], ['Link', p.url]] },

  // ---------------- territórios
  { id: 'ti', grupo: 'terr', nome: 'Terras indígenas', sub: 'FUNAI', arquivo: 'data/terras_indigenas.geojson', tipo: 'fill', on: true,
    cor: '#c8102e', opac: 0.22, linha: '#ff5a6e', sw: { cor: '#c8102e' },
    desc: 'Polígonos de terras indígenas (FUNAI) no recorte da área de estudo. A camada foi fornecida dissolvida, sem atributos por território.',
    info: () => [['Fonte', 'FUNAI'], ['Observação', 'Polígonos dissolvidos — sem nome/fase por território neste arquivo']] },
  { id: 'quilombos', grupo: 'terr', nome: 'Territórios quilombolas', sub: 'INCRA', arquivo: 'data/quilombos.geojson', tipo: 'fill', on: true,
    cor: '#b06ad8', opac: 0.35, linha: '#e2c2ff', sw: { cor: '#b06ad8' },
    desc: 'Territórios quilombolas (INCRA) do Baixo Amazonas e Baixo Tapajós.',
    info: () => [['Fonte', 'INCRA'], ['Observação', 'Polígonos dissolvidos — sem atributos por comunidade neste arquivo']] },
  { id: 'uc', grupo: 'terr', nome: 'Unidades de conservação', sub: 'ICMBio — federais', arquivo: 'data/icmbio.geojson', tipo: 'fill', on: true,
    corExpr: ['match', ['get', 'grupo'], 'PI', '#3f9a5c', '#9cc36b'], opac: 0.18, linha: '#b9e08d', sw: { cor: '#7fb069' },
    legenda: [['#3f9a5c', 'Proteção integral (PI)'], ['#9cc36b', 'Uso sustentável (US)']],
    desc: 'Unidades de conservação federais (ICMBio): Flona do Tapajós, Resex Tapajós-Arapiuns, APA do Tapajós, Parna da Amazônia, entre outras.',
    titulo: p => p.nome, info: p => [['Categoria', p.categoria], ['Grupo', p.grupo === 'PI' ? 'Proteção integral' : 'Uso sustentável'], ['Criação', p.ano], ['Ato legal', p.ato], ['Municípios', p.municipios], ['Jurisdição', p.jurisdicao]] },
  { id: 'urb', grupo: 'terr', nome: 'Áreas urbanizadas', sub: 'IBGE', arquivo: 'data/areas_urbanizadas.geojson', tipo: 'fill', on: false,
    cor: '#f1e4c4', opac: 0.55, linha: '#fff4d8', sw: { cor: '#f1e4c4' },
    titulo: p => 'Área urbanizada — ' + (p.nome || ''), info: p => [['UF', p.uf], ['Densidade', p.densidade], ['Porte', p.categoria]] },

  // ---------------- memória
  { id: 'arq', grupo: 'mem', nome: 'Sítios arqueológicos', sub: 'IPHAN — 546 sítios', arquivo: 'data/arqueologia.geojson', tipo: 'circle', on: true,
    corExpr: ['match', ['get', 'classificacao'], 'Pré-colonial', '#f0b35e', 'Pré-colonial e Histórico', '#e58f4a', 'Histórico', '#c9c3b5', '#a9876a'],
    sw: { cor: '#f0b35e', forma: 'dot' },
    legenda: [['#f0b35e', 'Pré-colonial'], ['#e58f4a', 'Pré-colonial e histórico'], ['#c9c3b5', 'Histórico'], ['#a9876a', 'Sem classificação']],
    desc: 'Cadastro Nacional de Sítios Arqueológicos (IPHAN). Terra preta, cerâmica tapajônica e assentamentos de longa duração revelam séculos de manejo do território.',
    titulo: p => p.nome || 'Sítio arqueológico', info: p => [['Código IPHAN', p.codigo], ['Natureza', p.natureza], ['Classificação', p.classificacao], ['Síntese', p.sintese], ['Cadastro', p.data]] },

  // ---------------- águas
  { id: 'agua', grupo: 'agua', nome: 'Massas d’água', sub: 'rios e lagos', arquivo: 'data/massa_dagua.geojson', tipo: 'fill', on: false,
    cor: '#2f8fae', opac: 0.55, linha: '#7fd0e6', sw: { cor: '#2f8fae' }, info: () => [['Fonte', 'ANA — base hidrográfica']] },
  { id: 'igapo', grupo: 'agua', nome: 'Igapós e várzeas', sub: 'florestas inundáveis', arquivo: 'data/igapo.geojson', tipo: 'fill', on: false,
    cor: '#4fb39a', opac: 0.35, linha: '#8fe0c8', sw: { cor: '#4fb39a' },
    desc: 'Florestas sazonalmente alagadas: o território anfíbio onde terra e água se alternam ao ritmo da cheia e da vazante.', info: () => [['Tipo', 'Floresta inundável (igapó/várzea)']] },
  { id: 'dren', grupo: 'agua', nome: 'Rede de drenagem', sub: 'igarapés e rios', arquivo: 'data/drenagem.geojson', tipo: 'line', on: true,
    cor: '#6cc7e6', largura: ['interpolate', ['linear'], ['to-number', ['get', 'ordem']], 1, 0.4, 4, 1.2, 7, 2.8], sw: { cor: '#6cc7e6', forma: 'line' },
    titulo: p => p.nome || 'Curso d’água', info: p => [['Ordem', p.ordem], ['Comprimento (km)', p.km]] },

  // ---------------- infraestrutura
  { id: 'hidrovia', grupo: 'infra', nome: 'Hidrovias', sub: 'ANTAQ / SNV', arquivo: 'data/hidrovia.geojson', tipo: 'line', on: true,
    cor: '#ff7a5c', largura: 2.6, dash: [2, 1.5], sw: { cor: '#ff7a5c', forma: 'line' },
    desc: 'O rio desenhado como canal logístico: eixo de escoamento de grãos do Arco Norte até os terminais de Santarém.',
    titulo: p => p.nome || 'Hidrovia', info: p => [['Operacional', p.operaciona], ['Regime', p.regime]] },
  { id: 'rodovia', grupo: 'infra', nome: 'Rodovias', sub: 'BR-163, BR-230 e estaduais', arquivo: 'data/rodovia.geojson', tipo: 'line', on: true,
    corExpr: ['match', ['get', 'revestimento'], 'Pavimentado', '#ffcf6b', '#d8b88a'], largura: ['interpolate', ['linear'], ['zoom'], 6, 0.8, 11, 2.4], sw: { cor: '#ffcf6b', forma: 'line' },
    legenda: [['#ffcf6b', 'Pavimentada'], ['#d8b88a', 'Não pavimentada / outras']],
    titulo: p => p.sigla || 'Rodovia', info: p => [['Jurisdição', p.jurisdicao], ['Revestimento', p.revestimento], ['Situação', p.situacao]] },
  { id: 'portos', grupo: 'infra', nome: 'Portos e terminais', sub: '17 instalações', arquivo: 'data/portos.geojson', tipo: 'circle', on: true,
    cor: '#e0604a', raio: 6, sw: { cor: '#e0604a', forma: 'dot' },
    titulo: p => 'Porto — ' + p.Nome, info: p => [['UF', p.Unidade_Fe], ['Rio', p.Local]] },

  // ---------------- desmatamento
  { id: 'prodes', grupo: 'desm', nome: 'Desmatamento 2008–2025', sub: 'polígonos ≥ 20 ha · linha do tempo', arquivo: 'data/desmatamento_prodes.geojson', tipo: 'fill', on: false, timeline: true,
    corExpr: yearRamp, opac: 0.8, sw: { cor: '#ea7d33' },
    legenda: [['#f7e27c', '2008'], ['#f3b94a', '2013'], ['#ea7d33', '2018'], ['#d8452a', '2022'], ['#a5161a', '2025']],
    desc: 'Incrementos anuais de desmatamento por corte raso (PRODES/INPE). Para leveza, o mapa exibe polígonos a partir de 20 ha; as estatísticas consideram todos os polígonos.',
    titulo: p => 'Desmatamento ' + p.y, info: p => [['Ano PRODES', p.y], ['Área', (p.a * 100).toFixed(1) + ' ha'], ['Classe', p.c], ['Imagem', p.d], ['Satélite', p.s]] },
  { id: 'hist', grupo: 'desm', nome: 'Desmatamento acumulado até 2007', sub: 'máscara histórica · polígonos ≥ 40 ha', arquivo: 'data/desmatamento_historico.geojson', tipo: 'fill', on: false,
    cor: '#8a4f35', opac: 0.6, sw: { cor: '#8a4f35' },
    titulo: () => 'Desmatamento até 2007', info: p => [['Área', (p.a * 100).toFixed(1) + ' ha'], ['Fonte', 'PRODES — máscara histórica']] },
  { id: 'grade', grupo: 'desm', nome: 'Intensidade 3D', sub: 'km² desmatados por célula de ~2,8 km', arquivo: 'data/desmatamento_grade.geojson', tipo: 'extrude', on: false, timeline: true,
    sw: { cor: '#d8452a' },
    desc: 'Grade de 0,025° em que a altura e a cor indicam a área desmatada acumulada (inclui a máscara anterior a 2008). Acompanha a linha do tempo.',
    titulo: () => 'Célula de desmatamento', info: p => [['Acumulado até 2007', p.h.toFixed(2) + ' km²'], ['Total até 2025', p.t.toFixed(2) + ' km²']] }
];
