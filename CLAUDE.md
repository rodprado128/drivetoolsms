# DriveTools Microsoft Edition

## Contexto
Porte do app DriveTools de Google Apps Script para Microsoft 365.
Versão Google funcional já existe. Referências em /reference/.
LER /reference/DRIVETOOLS_HANDOFF.md antes de qualquer decisão de arquitetura.

## Stack alvo
- SPA pura, sem backend
- Vite + TypeScript + React 18
- MSAL.js v3 (@azure/msal-browser + @azure/msal-react)
- @microsoft/microsoft-graph-client
- Tailwind CSS v4
- Framer Motion
- lucide-react
- Hosting final: Azure Static Web Apps Free tier

## Credenciais Entra ID (já configurados)
- Client ID: dc18f904-0b4a-4672-8d83-6d1615b60dc7
- Tenant ID: 57021020-6c74-44f5-aadf-f4ad80a2e9fd
- Authority: https://login.microsoftonline.com/common
- Redirect URI dev: http://localhost:5173
- Scopes: Files.ReadWrite.All, User.Read, Sites.ReadWrite.All, offline_access

Esses valores vão no .env como VITE_GRAPH_CLIENT_ID e VITE_GRAPH_TENANT_ID.

## Camada Graph (CRÍTICO)
Toda chamada Graph passa por src/graph/. Estrutura:
- src/graph/types.ts -> tipos compartilhados (DriveItem, Permission, etc)
- src/graph/client.ts -> singleton do Microsoft Graph Client com auth provider MSAL
- src/graph/retry.ts -> retry exponencial em 429 respeitando Retry-After header
- src/graph/dashboard.ts, drive-clean.ts, organizer.ts, exposed.ts -> funções por módulo

Nenhum componente chama Graph direto. Sempre via src/graph/.

## DESIGN SYSTEM: iOS 26 Liquid Glass (CRÍTICO)

O app DEVE replicar fielmente o visual do iOS 26 Liquid Glass.

### Propriedades de superfícies elevadas (cards, modais, topbar, sidebar, dropdowns, toasts):
- backdrop-filter: blur(24px) saturate(180%)
- Background light: rgba(255, 255, 255, 0.72)
- Background dark: rgba(28, 28, 30, 0.62)
- Border: 1px solid rgba(255, 255, 255, 0.18) light, rgba(255, 255, 255, 0.08) dark
- Box-shadow externo: 0 8px 32px rgba(0, 0, 0, 0.12)
- Box-shadow interno (highlight superior): inset 0 1px 0 rgba(255, 255, 255, 0.25)
- border-radius: 24px em cards, 16px em botões, 12px em inputs, 999px em pills

### Tipografia:
- Font stack: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif
- Pesos: 400, 500, 600, 700
- Tracking negativo em headings: letter-spacing: -0.02em
- Tamanhos: títulos grandes 28-34px, headings 20-22px, body 15-17px

### Paleta de cores (iOS system colors):
- Blue: #0A84FF (acento principal)
- Red: #FF453A (destrutivo)
- Green: #30D158 (sucesso)
- Orange: #FF9F0A (alerta)
- Purple: #BF5AF2
- Pink: #FF375F
- Teal: #64D2FF
- Cinzas system adaptativos

### Background do app:
- Mesh gradient vibrante porém suave de fundo
- 4-5 blobs coloridos com filter: blur(80px) animados lentamente (Framer Motion infinito)
- Cores dos blobs: tons de blue, purple, pink, teal, baixa saturação no light, alta no dark
- Esse fundo é o que o backdrop-filter dos cards precisa para criar o efeito glass

### Animações (assinatura Apple):
- Easing padrão: cubic-bezier(0.32, 0.72, 0, 1)
- Duração padrão: 350ms
- Hover em cards: scale(1.02) + leve aumento de brilho da borda
- Tap feedback: scale(0.97) com spring bounce
- Modais: slide-up estilo iOS sheet
- Route transitions: cross-fade + leve scale
- Toasts: deslizam do topo, capsule glass

### Componentes obrigatórios na Sessão 1:
- GlassCard (base do design system)
- GlassButton (primary, secondary, destructive)
- GlassInput
- GlassPill
- GlassModal (bottom sheet em mobile, centered em desktop)
- GlassTopbar
- IOSToggle (estilo iOS switch, não checkbox)
- MeshBackground (a camada de fundo animada)
- ThemeToggle (light/dark/auto)

### Adaptive light/dark:
- Detectar prefers-color-scheme inicialmente
- Toggle manual no header com 3 estados: light, dark, auto
- Persistir em localStorage
- Transição de tema com 300ms

### O que EVITAR:
- Sombras duras ou border-radius pequenos
- Cores chapadas em superfícies elevadas
- Animações lineares
- Componentes Material Design ou Ant Design
- Bibliotecas de UI pesadas (Material UI, Chakra, Ant Design, etc)

## Módulos a portar (na ordem)
1. Auth + Dashboard + Storage donut + design system
2. Drive Clean (dedup com quickXorHash)
3. Drive Organizer
4. Drive Exposed + Renewals
5. i18n PT/EN/ES + landing + deploy

## Regras técnicas obrigatórias
- Toda chamada Graph com retry exponencial em 429 respeitando Retry-After
- quickXorHash é o ÚNICO hash garantido para Personal + Business (NÃO usar MD5)
- Tratar OneDrive Personal vs Business com branching quando campos divergem
- Throttling é dinâmico, nunca assumir limite fixo
- Paginação via @odata.nextLink, não pageToken
- State files de scans longos vão para o OneDrive do usuário

## Convenções de código
- Comentários em PT-BR, código em inglês
- Sem em-dash, usar ponto ou vírgula
- Funções públicas prefixadas: dash_, dc_, do_, de_
- Componentes em PascalCase, hooks com prefix use
- Cada componente em arquivo próprio com index.ts barrel exports

## Comandos do projeto
- npm run dev (porta 5173)
- npm run build
- npm run lint

## O que NÃO fazer
- Não criar backend
- Não usar bibliotecas pagas
- Não adicionar features fora do escopo
- Não fazer commit automático
- Não usar UI libraries prontas, construir tudo com Tailwind
- Não pular o glassmorphism em nenhum componente elevado
- Não chamar Graph direto, sempre via src/graph/
