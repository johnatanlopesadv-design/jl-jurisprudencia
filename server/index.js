const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 3001;
const DATAJUD_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

// Cache de 2 horas
const cache = new NodeCache({ stdTTL: 7200, checkperiod: 600 });

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      'https://jl-jurisprudencia.vercel.app',
      /^https:\/\/jl-jurisprudencia.*\.vercel\.app$/,
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET'],
  })
);
app.use(express.json());

// ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
const TRIBUNAL_ENDPOINTS = {
  STJ: 'https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search',
  STF: 'https://api-publica.datajud.cnj.jus.br/api_publica_stf/_search',
};

const STJ_LINK = 'https://processo.stj.jus.br/SCON/';
const STF_LINK = 'https://jurisprudencia.stf.jus.br/pages/search';

// Termos de busca por área (OR implícito via should)
const AREA_TERMS = {
  saude:      ['plano de saude', 'ANS', 'operadora de saude', 'cobertura medica'],
  inss:       ['previdenciario', 'auxilio doenca', 'aposentadoria', 'BPC LOAS'],
  consumidor: ['defesa do consumidor', 'CDC', 'dano moral', 'contrato bancario'],
  familia:    ['alimentos', 'guarda compartilhada', 'divorcio', 'uniao estavel'],
};

// ─── DATAJUD FETCH ────────────────────────────────────────────────────────────
async function queryDataJud(tribunal, area, terms, size = 25) {
  const endpoint = TRIBUNAL_ENDPOINTS[tribunal];

  const body = {
    query: {
      bool: {
        should: terms.flatMap((term) => [
          { match: { 'dadosBasicos.assunto.descricao': { query: term, operator: 'or' } } },
          { match_phrase: { 'dadosBasicos.assunto.descricao': term } },
        ]),
        minimum_should_match: 1,
      },
    },
    size,
    sort: [{ 'dadosBasicos.dataAjuizamento': { order: 'desc' } }],
    _source: ['dadosBasicos', 'movimentos'],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `ApiKey ${DATAJUD_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'JLJurisprudencia-Proxy/1.0',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const hits = json?.hits?.hits || [];

  return hits
    .map((hit, idx) => {
      const db = hit._source?.dadosBasicos || {};
      const numero = db.numeroProcesso || hit._id || '';
      const classe = db.classeProcessual?.nome || '';
      const assuntos = (db.assunto || []).map((a) => a.descricao).filter(Boolean);
      const assuntoStr = assuntos.join('; ');

      const titulo = classe
        ? `${classe}${numero ? ` – ${numero}` : ''}`
        : `Processo ${tribunal}${numero ? ` – ${numero}` : ''}`;

      // Ementa: assuntos do processo + último movimento relevante
      const movimentos = hit._source?.movimentos || [];
      const ultMov = movimentos
        .slice()
        .reverse()
        .find((m) => m.complemento && m.complemento.length > 10);
      const ementa =
        [assuntoStr, ultMov?.complemento]
          .filter(Boolean)
          .join(' | ')
          .slice(0, 500) ||
        `${classe || 'Decisão'} relativa a ${terms[0]}`;

      const dataRaw = db.dataAjuizamento || db.dataDistribuicao;

      return {
        id: `datajud-${tribunal.toLowerCase()}-${area}-${hit._id || idx}`,
        tribunal,
        titulo: titulo.trim(),
        ementa: ementa.trim(),
        data: dataRaw ? new Date(dataRaw).toISOString() : new Date().toISOString(),
        link: tribunal === 'STJ' ? STJ_LINK : STF_LINK,
        area,
        fonte: 'datajud',
      };
    })
    .filter((d) => d.titulo.length > 3);
}

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ENDPOINT PRINCIPAL ───────────────────────────────────────────────────────
app.get('/api/decisoes', async (req, res) => {
  const { area = 'todas', tribunal = 'ambos' } = req.query;
  const cacheKey = `decisoes_${tribunal}_${area}`;

  // Cache hit
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[Cache] HIT para ${cacheKey}`);
    return res.json({ ...cached, fromCache: true });
  }

  // Montar lista de queries
  const tribunalList =
    tribunal === 'ambos'
      ? ['STJ', 'STF']
      : [tribunal.toUpperCase()];

  const areaList =
    area === 'todas'
      ? Object.keys(AREA_TERMS)
      : [area];

  const queries = [];
  for (const t of tribunalList) {
    for (const a of areaList) {
      queries.push({ tribunal: t, area: a, terms: AREA_TERMS[a] || [a] });
    }
  }

  console.log(`[API] Iniciando ${queries.length} queries DataJud...`);
  const startTime = Date.now();

  const results = await Promise.allSettled(
    queries.map((q) => queryDataJud(q.tribunal, q.area, q.terms, 25))
  );

  let allItems = [];
  const fontes = {};
  const erros = [];

  results.forEach((r, i) => {
    const { tribunal: t, area: a } = queries[i];
    const key = t.toLowerCase();

    if (r.status === 'fulfilled' && r.value.length > 0) {
      allItems.push(...r.value);
      fontes[key] = 'datajud';
      console.log(`[DataJud] ${t}/${a}: ${r.value.length} itens`);
    } else {
      const err = r.reason?.message || 'sem resultados';
      erros.push(`${t}/${a}: ${err}`);
      console.warn(`[DataJud] ${t}/${a} falhou: ${err}`);
    }
  });

  // Deduplicar por ID
  const seen = new Set();
  allItems = allItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Ordenar por data (mais recente primeiro)
  allItems.sort((a, b) => new Date(b.data) - new Date(a.data));

  const elapsed = Date.now() - startTime;
  console.log(`[API] Concluído em ${elapsed}ms: ${allItems.length} itens únicos`);

  // Contagem por área
  const counts = {};
  allItems.forEach((item) => {
    if (item.area) counts[item.area] = (counts[item.area] || 0) + 1;
  });

  const payload = {
    decisoes: allItems.slice(0, 100),
    total: allItems.length,
    counts,
    ultimaAtualizacao: new Date().toISOString(),
    fontes,
    erros: erros.length > 0 ? erros : undefined,
    elapsedMs: elapsed,
  };

  // Só cacheia se tiver dados reais
  if (allItems.length > 0) {
    cache.set(cacheKey, payload);
  }

  res.json(payload);
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[JL Juris Proxy] Servidor rodando na porta ${PORT}`);
  console.log(`[JL Juris Proxy] Health: http://localhost:${PORT}/health`);
  console.log(`[JL Juris Proxy] API:    http://localhost:${PORT}/api/decisoes`);
});
