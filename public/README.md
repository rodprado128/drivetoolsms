# DriveTools · Asset pack

Logo Liquid Glass iOS 26 (blue → purple → pink) em todas as resoluções necessárias.

## O que tem aqui

### Fontes editáveis (SVG)
- `logo.svg` — versão completa, com glow Liquid Glass (filter `feGaussianBlur` + drop shadow roxo). Use em qualquer tamanho ≥128px e para edição no Figma/Illustrator.
- `logo-simple.svg` — versão sem filter, só forma e gradiente. Use em rasterizações muito pequenas (≤64px) onde o blur estraga.

### Favicons (raiz do site)
- `favicon.ico` — multi-resolução 16/32/48. É o que navegadores antigos vão pegar primeiro.
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-64.png`, `favicon-96.png` — PNGs explícitos.
- `apple-touch-icon.png` (180×180) — atalho da home screen no iOS.
- `icon-192.png`, `icon-512.png` — PWA / Android.
- `site.webmanifest` — manifest PWA, já configurado com nome, cores e ícones.

### Topbar do app (canto superior esquerdo, ao lado de "DriveTools")
- `logo-topbar-32.png` — 1× (telas comuns).
- `logo-topbar-48.png` — 1.5× (telas média densidade).
- `logo-topbar-64.png` — 2× (Retina, telas HiDPI).

Sirva os três e deixe o navegador escolher via `srcset`:

```html
<img
  src="/logo-topbar-32.png"
  srcset="/logo-topbar-32.png 1x, /logo-topbar-48.png 1.5x, /logo-topbar-64.png 2x"
  alt="DriveTools"
  width="32"
  height="32"
/>
```

Ou, se preferir, use diretamente o `logo.svg` no `<img>` que escala em qualquer DPI:

```html
<img src="/logo.svg" alt="DriveTools" width="32" height="32" />
```

### Carrossel LinkedIn / material gráfico
- `logo-512.png` — alta qualidade, fundo transparente, ideal para slides quadrados.
- `logo-1024.png` — uso em PDFs / posts onde a logo aparece grande.
- `logo-2048.png` — impressão, retina, segurança máxima de qualidade.

Todos com fundo 100% transparente. Para o LinkedIn, exporte seus slides em PNG (1080×1080 ou 1080×1350) e use a `logo-1024.png` posicionada.

## Como instalar os favicons

1. Coloque todos estes arquivos na raiz do site (`/`):
   - `favicon.ico`
   - `favicon-16.png`
   - `favicon-32.png`
   - `apple-touch-icon.png`
   - `icon-192.png`
   - `icon-512.png`
   - `logo.svg`
   - `site.webmanifest`

2. Cole no `<head>` do HTML o conteúdo de `favicon-snippet.html`.

3. Faça hard reload (`Ctrl+Shift+R`) para o navegador descartar o favicon antigo do cache.

## Cor do tema

Hex usados, caso precise replicar em outros materiais:

- `#0A84FF` — system blue (início do gradiente)
- `#BF5AF2` — system purple (meio)
- `#FF375F` — vibrant pink (fim)
- `#080010` — fundo escuro de referência (Liquid Glass dark mode)

## Notas técnicas

- O glow no SVG full custa renderização. Se a logo aparecer em listas longas (ex: tabelas com 200 linhas), use a versão simple ou um PNG.
- Para mudar a paleta sem refazer tudo: edite `logo.svg`, abra o terminal e rode `python3 gen.py` na pasta do projeto. Todos os PNGs e o `.ico` são re-gerados.
- `favicon.ico` foi montado com `Image.save(..., format="ICO")` do Pillow, sem perdas, pronto para uso.
