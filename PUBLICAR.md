# Publicar o geoportal (GitHub + Vercel)

O site é estático: não precisa de build. O que vai para o GitHub está definido no `.gitignore`
(só as pastas do site; a bibliografia, os dados brutos grandes, `_backup/` e `_versao_anterior/` ficam fora).

## 1. Enviar para o GitHub (uma vez)

Abra o **Prompt de Comando** dentro desta pasta (no Explorer, digite `cmd` na barra de endereço e Enter) e rode:

```
git init
git add .
git commit -m "Geoportal Cartografias em Disputa"
git branch -M main
git remote add origin https://github.com/alicebartholo/cartografiasemdisputa.git
git push -u origin main
```

Na primeira vez o Git abre uma janela para entrar na sua conta do GitHub.
(Se não tiver o Git instalado: https://git-scm.com/download/win — ou use o GitHub Desktop:
File → Add local repository → esta pasta → Publish/Push.)

Antes do `git commit`, confira com `git status` que **não** aparecem `bibliografia/`, `desmatamento.1.geojson` etc.

## 2. Conectar ao Vercel

1. Entre em https://vercel.com com a conta do GitHub.
2. **Add New → Project** → importe `cartografiasemdisputa`.
3. Framework Preset: **Other**. Build Command: vazio. Output Directory: vazio (raiz). **Deploy**.
4. O endereço fica como `cartografiasemdisputa.vercel.app` (dá para trocar em Settings → Domains).

## 3. Atualizar depois

Edite localmente (com `iniciar_servidor.bat` e o modo **Editar**), e depois:

```
git add .
git commit -m "Atualiza pontos e atlas"
git push
```

O Vercel publica a nova versão sozinho em ~1 minuto.

## Observações

- **Online, o modo Editar não grava arquivos** (não há servidor de salvamento no Vercel). As edições ficam só no navegador; para publicar, edite localmente e faça `git push`.
- Mapas base, relevo e fontes vêm de serviços externos (Esri, Carto, AWS, Google Fonts) e funcionam online normalmente.
- Imagens: fotos de campo (confirme que são suas), mapas históricos em domínio público e imagens da NASA. Revise os créditos antes de divulgar o link.
