# Cartografias em Disputa — WebGIS & Atlas Ilustrados do Baixo Tapajós

Geoportal com dois modos integrados:

1. **Mapa geográfico** — MapLibre GL com relevo 3D (exagero vertical ajustável), mapas base (satélite, topográfico, noturno, claro, papel), camadas com legenda e opacidade, busca, painel de dados, linha do tempo do desmatamento PRODES (2008–2025) e **pontos narrativos** com texto, imagens, fontes e vista de câmera 3D.
2. **Atlas** — seis colagens (9.600 × 5.400 px) com zoom profundo, arrasto com inércia, minimapa, índice e pontos clicáveis (hotspots). Cada hotspot pode levar ao lugar correspondente no mapa, e cada ponto do mapa pode abrir o atlas.

## Como abrir

**Windows:** dê dois cliques em `iniciar_servidor.bat`. O navegador abre em `http://localhost:8080`. Deixe a janela preta aberta enquanto usa o site.
**Mac/Linux (ou se o PowerShell falhar):** no terminal, dentro desta pasta: `python3 server.py`.

> É preciso internet para a biblioteca de mapas, as fontes, as imagens de satélite e o relevo. Os atlas funcionam a partir dos arquivos locais.

Abrir o `index.html` direto (sem servidor) não funciona, porque o navegador bloqueia a leitura dos arquivos de dados.

## Como adicionar conteúdo (modo Editar)

Com o servidor ativo, clique em **Editar** no topo:

- **Mapa:** clique em qualquer lugar para criar um ponto. Preencha título, categoria, resumo, texto, imagens (arraste do computador — elas são copiadas para `media/`), fontes, atlas relacionado e ordem no percurso. Ajuste o mapa e clique em **Usar a vista atual** para gravar a câmera 3D da história. Clique num ponto existente para editar ou excluir; arraste o marcador para movê-lo.
- **Atlas:** dentro de uma obra, clique sobre a imagem para criar um hotspot; arraste os existentes para reposicioná-los. O botão **Obra** edita título, subtítulo e lugar no mapa.
- **Nova obra:** na galeria dos atlas (com Editar ligado), use **Adicionar nova obra** e envie uma imagem PNG/JPG — por exemplo, a digitalização de uma ilustração sua. Imagens até ~12.000 px no maior lado funcionam bem.

Tudo é gravado em `data/pontos.geojson` e `atlas/atlas.json`. A cada salvamento, a versão anterior vai para `_backup/`.
Sem servidor, as edições ficam só no navegador; use os botões de exportar no painel **Narrativas** para baixar os arquivos.

Os textos aceitam: parágrafos (linha em branco), `**negrito**`, `*itálico*`, `> citação` e `[link](https://…)`.

## Estrutura

```
index.html            página principal
css/app.css           estilos
js/config.js          categorias, mapas base e definição das camadas (cores, legendas, atributos)
js/map.js             modo mapa (MapLibre, camadas, linha do tempo, pontos, edição)
js/atlas.js           visor de zoom profundo, hotspots e edição
js/app.js             abertura, navegação (#mapa, #atlas/<obra>/<ponto>), modo edição
js/util.js            salvar/enviar arquivos, textos, galeria
data/                 camadas GeoJSON otimizadas para web + pontos.geojson + estatísticas
atlas/atlas.json      lista de obras e hotspots
atlas/atlas1..3/      peças (tiles) das obras em vários níveis de zoom + preview.jpg
media/                imagens dos pontos (recortes das obras e uploads)
server.ps1            servidor local (Windows) com salvamento
server.py             servidor local alternativo (Python 3)
```

## Sobre os dados

As camadas em `data/` foram geradas a partir dos arquivos originais da pasta (que permanecem intactos):

- Acentuação corrompida dos atributos (ex.: `S�tio`, `Igarap�`) foi restaurada por dicionário e regras; nomes raros podem ter correções imperfeitas.
- Geometrias simplificadas (Douglas–Peucker) e coordenadas arredondadas para ~1 m.
- **Desmatamento:** refeito a partir de `desmatamento.1.geojson` (108.409 polígonos, 2008–2025) e `desmatamento.2.geojson` (máscara até 2007). O mapa mostra polígonos ≥ 20 ha (2008–2025) e ≥ 40 ha (até 2007); a grade 3D e as estatísticas usam todos os polígonos. Total 2008–2025 no recorte: **12.774 km²**; até 2007: **39.828 km²**.
- Terras indígenas, quilombos, igapós e massas d’água vieram dissolvidos (sem atributos por território).
- Os arquivos `conservação.geojson`, `desmatamento.2008.geojson`, `desmatamento08.geojson` e `desmatammento08.geojson` estão vazios.

Para mudar cores, nomes ou incluir uma nova camada, edite `js/config.js` (cada camada é um bloco com `arquivo`, `tipo`, `cor`, `legenda` e `info`).

## Sobre os atlas

As três obras são esquemas interpretativos, sem escala, compostos a partir da bibliografia do projeto. As localizações geográficas dos hotspots são aproximadas. Substitua-as ou complemente-as com suas próprias obras pelo modo Editar.

## Publicar na internet

O site é estático: pode ser publicado no GitHub Pages, Netlify ou similar enviando a pasta inteira (exceto os arquivos originais grandes da raiz). Online, a edição não grava arquivos — edite localmente e publique de novo.

Versão anterior do site: `_versao_anterior/`.

## Estética e colagens (atualização)

O visual segue o caderno teórico: papel branco, títulos pesados em azul-marinho (Archivo Black), texto em Arial, referências em fonte monoespaçada (Courier Prime), vermelho de marcador e a cianotipia da capa. O mapa abre no mapa base **Cianotipia** (imagem de satélite em azul); há também **Figura-fundo** (corpos d’água em azul-marinho sobre branco).

As colagens estão em `atlas/colagem1..3/` e `atlas/atlas1..3/` (IV–VI, refeitas a partir das pranchas ilustradas; os desenhos originais continuam em `atlas/fontes_svg/`):
- **I — A origem colonial dos mapas**: cartas coloniais rasgadas sobre a cianotipia do Baixo Tapajós.
- **II — Viver-mapear(-se)**: fotografias de campo, fios vermelhos, Fundo e encantes, autodemarcação Borari (pontos esquemáticos).
- **III — Conflitos · Ser-Rio**: corpos d’água e drenagem, cronologia, mercúrio e direitos da natureza.

Imagens usadas: fotografias do caderno (consideradas da autora — confirme), mapas históricos em domínio público e imagens da NASA. Obras de terceiros com direitos (Baniwa, Mary Vieira, Torres-García, Gaiagrafia, fotos Munduruku/Xavante) **não** foram usadas.
- **IV — O Fundo**: planta em cianotipia (Santarém–Alter do Chão) ligada por fios vermelhos ao corte do Ser-Rio: terminal, Sítio Porto, encontro das águas, Fundo, cobra-grande e aquífero.
- **V — A linha e a rede**: à esquerda a rede (RESEX, comunidades em posição esquemática, encantes); à direita a linha (rodovias, hidrovia, Ferrogrão projetada, soja e desmatamento PRODES).
- **VI — Daje Kapap Eypi**: médio Tapajós em cianotipia, os fechos do rio, garimpo, mercúrio, a UHE arquivada e a autodemarcação.

## Dossiê · Hidrovia em disputa (pesquisa out/2026)

- **Aba "Dossiê · hidrovia"** (`dossie/hidrovia.html`): relatório técnico com números-chave, ficha da hidrovia e das ETCs, cronologia 2003–2026, conflitos por grupo social, quadro conflito–lugar–atores, impactos, caminhos não humanos, atores, lacunas e 80 referências com link. Os botões "ver no mapa" abrem os pontos correspondentes.
- **Percurso "Hidrovia em disputa"**: 11 pontos narrativos novos (ids `hv_*` em `data/pontos.geojson`, campo `percurso: "hidrovia"`). O botão **Percurso** agora oferece os dois percursos.
- **Camadas novas** (grupo "Hidrovia em disputa"):
  - `data/hv_conflitos.geojson`: terminais, dragagem, comunidades, lugares sagrados, fauna e mobilizações (15 locais);
  - `data/hv_caminhos_humanos.geojson`: comboios, navios, pescadores, barqueata;
  - `data/hv_caminhos_nao_humanos.geojson`: dourada, jaraqui/matrinxã, botos, quelônios, peixe-boi, sedimento e mercúrio.
- Localizações marcadas como "aproximadas" e os caminhos não humanos são **esquemáticos** — não usar como coordenadas exatas. As sete passagens de dragagem não foram georreferenciadas (representadas por um símbolo do trecho).
- Os textos dos pontos aceitam agora listas (`- item`) e tabelas (`| a | b |`).

## Dossiê · Encantados e não humanos (pesquisa out/2026)

- A aba **Dossiês** agora tem dois documentos: `dossie/hidrovia.html` e `dossie/encantados.html` (rotas `#dossie/hidrovia` e `#dossie/encantados`).
- O dossiê *Encantados e não humanos* trata da cosmologia do Fundo, da hidrovia vista pelos encantados (moradas, cemitérios, pedrais), dos protocolos de consulta que protegem os encantados, da fauna ameaçada (tucuxi EN — IUCN 2020 e lista nacional pela Portaria MMA 1.704/2026; boto EN; peixe-boi, ariranha, iaçá, quelônios, dourada), do mundo sonoro do rio e de uma leitura cosmopolítica.
- **Percurso "Encantados e não humanos"**: 9 pontos (ids `en_*`).
- **Camada nova**: `data/en_lugares.geojson` — lugares encantados, cemitérios, pedrais e fauna, com localização aproximada. Atenção: o protocolo Munduruku pede que locais sagrados não sejam expostos; qualquer mapeamento mais preciso deve ser feito com as comunidades.

## Mapas e diagramas dos dossiês

- Mapas (PNG em `dossie/img/`, gerados a partir das camadas do projeto): corredor logístico do Tapajós, conflitos da hidrovia (numerados), Santarém e Lago do Maicá, lugares encantados e fauna (numerados), Alter do Chão / Lago Verde. Clique para ampliar.
- Diagramas e gráficos (SVG dentro do HTML, com informação ao passar o mouse e tabela de dados): portos 2013 × 2023, fluxo do grão, corte do canal, carga em Miritituba, calendário do rio, corte cosmológico (céu, terra, fundo), protocolos × encantados, status do tucuxi e do boto, estimativas de golfinhos no Tapajós.
- Esquemas e calendários são interpretativos e fora de escala; as datas aproximadas estão indicadas nas legendas.

