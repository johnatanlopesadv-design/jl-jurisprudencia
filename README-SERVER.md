# JL Juris Proxy — Deploy no Render.com

Servidor Express que busca decisões do CNJ DataJud e serve para o app Next.js na Vercel.

## Estrutura

```
server/
  index.js        ← servidor Express (porta 3001)
  package.json    ← dependências: express, cors, node-cache
  render.yaml     ← configuração de deploy no Render.com
```

## Deploy no Render.com

### Opção 1 — Via render.yaml (recomendado)

1. Acesse https://render.com e faça login
2. Clique em **New → Blueprint**
3. Conecte o repositório GitHub onde está este projeto
4. O Render detectará o `render.yaml` em `server/render.yaml`
   - Se não detectar, vá para **Settings → Root Directory** e defina como `server`
5. Clique em **Apply** — o deploy inicia automaticamente

### Opção 2 — Manual (Web Service)

1. Acesse https://render.com → **New → Web Service**
2. Conecte o repositório
3. Configure:
   - **Name:** `jl-juris-proxy`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
4. Em **Environment Variables**, adicione:
   - `PORT` = `3001`
5. Clique em **Create Web Service**

## URL do proxy após deploy

O Render cria uma URL no formato:
```
https://jl-juris-proxy.onrender.com
```

Se o nome já estiver em uso, será algo como `jl-juris-proxy-xxxx.onrender.com`.

## Configurar a URL no Next.js (Vercel)

Após o deploy, configure a variável de ambiente na Vercel:

1. Acesse https://vercel.com → projeto `jl-jurisprudencia`
2. Settings → Environment Variables
3. Adicione:
   - **Key:** `PROXY_URL`
   - **Value:** `https://jl-juris-proxy.onrender.com` (URL real do seu deploy)
   - **Environment:** Production, Preview, Development
4. Faça redeploy: `npx vercel --prod`

## Testando localmente

```bash
# Terminal 1 — proxy
cd server
npm install
npm run dev
# Acesse: http://localhost:3001/health
# Acesse: http://localhost:3001/api/decisoes

# Terminal 2 — Next.js
cd ..
PROXY_URL=http://localhost:3001 npm run dev
```

## Endpoints do proxy

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check (usado pelo Render) |
| GET | `/api/decisoes` | Retorna decisões do DataJud |

### Parâmetros de `/api/decisoes`

| Parâmetro | Valores | Padrão |
|-----------|---------|--------|
| `tribunal` | `stj`, `stf`, `ambos` | `ambos` |
| `area` | `saude`, `inss`, `consumidor`, `familia`, `todas` | `todas` |

### Exemplo de resposta

```json
{
  "decisoes": [...],
  "total": 87,
  "counts": { "saude": 22, "inss": 18, "consumidor": 25, "familia": 22 },
  "ultimaAtualizacao": "2026-04-12T10:00:00.000Z",
  "fontes": { "stj": "datajud", "stf": "datajud" },
  "mock": false
}
```

## Nota sobre o plano gratuito do Render

No plano gratuito, o serviço **hiberna após 15 min de inatividade**. A primeira requisição pode demorar ~30 segundos para "acordar" o servidor. Para evitar isso, considere:

- Configurar um cron job externo (ex: UptimeRobot) para fazer ping em `/health` a cada 10 min
- Fazer upgrade para o plano pago ($7/mês)
