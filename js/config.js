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
  { id: 'atlasmk', grupo: 'narr', nome: 'Atlas ilustrados', sub: 'portas para as obras', tipo: 'html', on: true, sw: { cor: '#efe3c8' },
    desc: 'Miniaturas posicionadas no lugar a que cada obra se refere. Clique para abrir o atlas.' },
  { id: 'cidades', grupo: 'narr', nome: 'Cidades e vilas', tipo: 'html', on: true, sw: { cor: '#ffffff', forma: 'dot' }, arquivo: 'data/cidades.geojson' },

  // ---------------- hidrovia em disputa (pesquisa out/2026)
  { id: 'hv_com', grupo: 'hv', nome: '1 · Hidrovia das commodities', sub: 'rota da soja e do milho + notícias e impactos socioambientais', arquivo: 'data/hv_commodities.geojson', tipo: 'misto', on: true, raio: 7,
    corLinha: ['match', ['get', 'tipo'], 'comboio', '#c8102e', 'navio', '#7a0a1c', 'ferrograo', '#e07b00', '#c8102e'],
    largura: ['interpolate', ['linear'], ['zoom'], 5, ['match', ['get', 'tipo'], 'comboio', 3.2, 2.2], 11, ['match', ['get', 'tipo'], 'comboio', 7, 4]],
    corExpr: ['match', ['get', 'tipo'], 'terminal', '#c8102e', 'dragagem', '#ff7a1a', 'comunidade', '#2f8a4e', 'sagrado', '#7b5cc4', 'fauna', '#2f6fd0', 'mobilizacao', '#e0b000', 'politica', '#111111', '#888888'],
    sw: { cor: '#c8102e', forma: 'line' },
    legenda: [['#c8102e', 'Rota dos comboios de grãos (Miritituba → Santarém)'], ['#7a0a1c', 'Exportação por navios'], ['#e07b00', 'Ferrogrão projetada'], ['#c8102e', '● Porto / terminal'], ['#ff7a1a', '● Dragagem'], ['#2f8a4e', '● Comunidade afetada'], ['#7b5cc4', '● Lugar sagrado / arqueológico'], ['#2f6fd0', '● Fauna e clima'], ['#e0b000', '● Mobilização'], ['#111111', '● Decisão política / projeto']],
    desc: 'O corredor de escoamento de commodities pelo Tapajós (Arco Norte) e, ao longo dele, pontos com notícias, relatórios e ações judiciais sobre o que a hidrovia degrada: portos, dragagem, comunidades, lugares sagrados, fauna e as lutas contra ela (até out/2026).',
    titulo: p => p.nome,
    info: p => p.kind === 'rota' ? [['Ciclo', p.ciclo], ['Descrição', p.descricao], ['Fontes', p.fonte], ['Link', p.url]] : [['Tema', p.categoria], ['O que acontece', p.situacao], ['Atores', p.atores], ['Impactos', p.impactos], ['Localização', p.precisao], ['Fontes', p.fonte], ['Link', p.url]] },
  { id: 'hv_loc', grupo: 'hv', nome: '2 · Caminhos das comunidades', sub: 'rotas entre vilas, cidades e ramais · pesca e permanência', arquivo: 'data/hv_comunidades.geojson', tipo: 'misto', on: true, raio: 6,
    corLinha: ['match', ['get', 'tipo'], 'linha', '#f3d36b', 'travessia', '#f3d36b', 'pesca', '#3fbf7f', 'mobilizacao', '#e0b000', 'ramal', '#c9a27a', '#f3d36b'],
    largura: ['match', ['get', 'tipo'], 'ramal', 1.1, 'pesca', 2.4, 2.6], dash: [2, 1.6],
    corExpr: ['match', ['get', 'tipo'], 'pesca', '#3fbf7f', 'feira', '#f3d36b', 'permanencia', '#ffffff', '#cccccc'],
    sw: { cor: '#f3d36b', forma: 'line' },
    legenda: [['#f3d36b', 'Barcos de linha, recreios e travessias'], ['#3fbf7f', 'Caminhos de pesca'], ['#e0b000', 'Barqueata (2026)'], ['#c9a27a', 'Ramais e estradas vicinais'], ['#3fbf7f', '● Lugar de pesca'], ['#f3d36b', '● Desembarque / feira'], ['#ffffff', '● Comunidade / lugar de permanência']],
    desc: 'Os caminhos de quem vive no rio: barcos de linha entre vilas e cidades, travessias, caminhos de pesca e ramais que ligam comunidades à beira. Os pontos marcam lugares de pesca e de permanência de comunidades indígenas, quilombolas, extrativistas e ribeirinhas. Traçados esquemáticos e localizações aproximadas.',
    titulo: p => p.nome, info: p => [['Descrição', p.descricao], ['Localização', p.precisao], ['Fontes', p.fonte]] },
  { id: 'hv_seres', grupo: 'hv', nome: '3 · Seres do rio', sub: 'botos, peixe-boi, quelônios, peixes migradores · ícones bordados', arquivo: 'data/hv_seres.geojson', tipo: 'icone', on: true,
    icones: ['boto', 'tucuxi', 'peixeboi', 'ariranha', 'iaca', 'tartaruga', 'dourada', 'jaraqui', 'pedral'],
    sw: { cor: '#ee8fa1', forma: 'dot' },
    legenda: [['#ee8fa1', 'Boto-vermelho'], ['#9aa6b8', 'Tucuxi'], ['#8b8174', 'Peixe-boi'], ['#6e4a2c', 'Ariranha'], ['#6b7a3a', 'Quelônios'], ['#e3ad45', 'Dourada'], ['#c3cdd2', 'Jaraqui e matrinxã'], ['#7a6a44', 'Peixes dos pedrais']],
    desc: 'Animais e outros seres que habitam o rio, desenhados como bordados, nos lugares onde as fontes os registram, com as ameaças que a hidrovia, o garimpo e a crise climática trazem para eles.',
    titulo: p => p.nome,
    corpo: p => `<p class="bor-tipo" style="background:#2f6fd0">${CD.esc(p.cientifico || '')}</p><p class="bor-txt">${CD.esc(p.texto || '')}</p>`,
    info: p => [['Localização', p.precisao], ['Fontes', p.fonte]] },

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
    legenda: [['#e8b62c', 'Encantado bordado à mão, georreferenciado'], ['#ff3355', 'Contorno da TI Bragança-Marituba (Munduruku), em ponto alinhavo']],
    desc: 'Encantados da cartografia têxtil, bordados à mão e colocados no mapa onde vivem. A Cobra Grande está na divisa do Lago Verde com o Tapajós, em Alter do Chão. A Mulher de Dourado está na TI Munduruku Bragança-Marituba, cujo contorno aparece em vermelho. As posições de lugares sagrados são indicativas.',
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
