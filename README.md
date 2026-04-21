# JL Jurisprudência — Monitor STJ/STF

PWA para monitorar decisões relevantes do **STJ** e **STF** nas áreas de Plano de Saúde, INSS/Previdenciário, Consumidor e Família.

**Escritório:** Johnatan Lopes Advocacia

---

## Funcionalidades

- Filtragem por tribunal (STJ / STF / Ambos) e área de atuação
- Detecção automática de área por palavras-chave
- Notificações push quando há novas decisões (últimas 24h)
- Modo offline com cache local das últimas decisões
- Pull-to-refresh no mobile
- Auto-atualização a cada 30 minutos
- Instalável na tela inicial (PWA)

---

## Requisitos

- Node.js 18+
- npm 9+

---

## Instalação rápida

```bash
# 1. Entrar no diretório
cd jl-jurisprudencia

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas chaves VAPID (veja abaixo)

# 4. (Opcional) Gerar ícones PNG para iOS/Safari
npm run generate-icons

# 5. Rodar em desenvolvimento
npm run dev
```

Acesse: **http://localhost:3000**

---

## Configuração de Notificações Push (VAPID)

As notificações push requerem um par de chaves VAPID.

### Gerar suas chaves:

```bash
npx web-push generate-vapid-keys
```

Saída esperada:
```
=======================================
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBURSaefAsZqAyX5o1

Private Key:
UUxI4O8-HoHQZ7ZQq0VWQf0TxnQZ5POq1q2OA1cJ1A0
=======================================
```

### Configurar no `.env.local`:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=SUA_CHAVE_PUBLICA_AQUI
VAPID_PRIVATE_KEY=SUA_CHAVE_PRIVADA_AQUI
VAPID_EMAIL=mailto:contato@seuescritorio.com.br
```

> **Atenção:** A chave privada nunca deve ser exposta no cliente. Apenas `NEXT_PUBLIC_VAPID_PUBLIC_KEY` é pública.

---

## Fontes de dados

| Tribunal | Feed RSS |
|----------|----------|
| STJ | `https://www.stj.jus.br/sites/portalp/Comunicacao/noticias/RSS` |
| STF | `https://portal.stf.jus.br/rss/jurisprudencia.asp` |

- O fetch ocorre **server-side** (API route Next.js) — sem problema de CORS
- Fallback automático via proxy `allorigins.win` se o feed direto falhar
- Cache de **1 hora** por tribunal (em memória, via `node-cache`)

---

## Palavras-chave por área

| Área | Exemplos |
|------|---------|
| Plano de Saúde | plano de saúde, ANS, operadora, cobertura, internação |
| INSS / Prev. | INSS, aposentadoria, auxílio-doença, BPC, LOAS |
| Consumidor | CDC, dano moral, serasa, negativação, banco |
| Família | alimentos, guarda, divórcio, união estável, partilha |

Edite `lib/keywords.js` para adicionar/remover palavras-chave.

---

## Ícones PWA

Os ícones SVG já estão em `public/icons/`. Para gerar PNGs (necessários no iOS/Safari):

```bash
npm run generate-icons
```

Isso cria:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/apple-touch-icon.png`

---

## Deploy na Vercel

### Via CLI:

```bash
npm install -g vercel
vercel

# Produção:
vercel --prod
```

### Via GitHub:

1. Suba o projeto para um repositório GitHub
2. Importe em [vercel.com/new](https://vercel.com/new)
3. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_EMAIL`

### Variáveis obrigatórias na Vercel:

| Variável | Visibilidade |
|----------|-------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public (exposta no cliente) |
| `VAPID_PRIVATE_KEY` | Secret |
| `VAPID_EMAIL` | Secret |

---

## Adicionar à tela inicial (mobile)

### Android (Chrome):
1. Acesse o app no Chrome
2. Menu (⋮) → **"Adicionar à tela inicial"**
3. Confirme → ícone aparece na home

### iOS (Safari):
1. Acesse o app no Safari
2. Botão de compartilhar (□↑) → **"Adicionar à Tela de Início"**
3. Confirme → ícone aparece na home

---

## Estrutura do projeto

```
jl-jurisprudencia/
├── pages/
│   ├── index.js              # Página principal
│   ├── _app.js               # Registro do Service Worker
│   ├── _document.js          # Meta tags PWA + fontes
│   └── api/
│       ├── decisoes.js       # Endpoint RSS → JSON filtrado
│       └── subscribe.js      # Endpoint push subscriptions
├── components/
│   ├── Header.js             # Logo e cabeçalho
│   ├── FilterBar.js          # Filtros tribunal/área
│   ├── DecisionCard.js       # Card de cada decisão
│   ├── NotificationButton.js # Ativar/desativar push
│   └── LoadingSpinner.js     # Indicador de carregamento
├── lib/
│   └── keywords.js           # Palavras-chave por área
├── public/
│   ├── manifest.json         # Manifesto PWA
│   ├── sw.js                 # Service Worker
│   └── icons/                # Ícones SVG/PNG
├── styles/
│   └── globals.css           # Design system completo
└── scripts/
    └── generate-icons.js     # Gerador de PNGs
```

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Iniciar em produção |
| `npm run generate-icons` | Gerar ícones PNG a partir dos SVGs |

---

## Observações técnicas

- **Cache do Service Worker:** cache estático (cache-first) + API (network-first com fallback)
- **Periodic Background Sync:** verifica novas decisões a cada 4h (onde suportado)
- **Offline:** último fetch é salvo no `localStorage` para acesso sem conexão
- **CORS:** o fetch do RSS é feito server-side (Next.js API routes), sem problemas de CORS
- **Novas decisões:** o SW compara o feed atual com o cache e notifica apenas itens das últimas 24h não vistos antes
