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
// STF não possui índice na API pública do DataJud (CNJ não disponibiliza)
const TRIBUNAL_ENDPOINTS = {
  STJ: 'https://api-publica.datajud.cnj.jus.br/api_publica_stj/_search',
};

const STJ_LINK = 'https://processo.stj.jus.br/SCON/';

// Termos de busca por área (OR implícito via should)
const AREA_TERMS = {
  saude:      ['plano de saude', 'ANS', 'operadora de saude', 'cobertura medica'],
  inss:       ['previdenciario', 'auxilio doenca', 'aposentadoria', 'BPC LOAS'],
  consumidor: ['defesa do consumidor', 'CDC', 'dano moral', 'contrato bancario'],
  familia:    ['alimentos', 'guarda compartilhada', 'divorcio', 'uniao estavel'],
};

// ─── DATAJUD FETCH ────────────────────────────────────────────────────────────
// Estrutura real da API: campos na raiz do _source (sem wrapper dadosBasicos)
// assuntos[].nome, classe.nome, numeroProcesso, dataAjuizamento ("YYYYMMDDHHMMSS")
function parseDataJud(str) {
  if (!str) return new Date().toISOString();
  try {
    const s = String(str).padEnd(14, '0');
    const year = s.slice(0, 4);
    const month = s.slice(4, 6);
    const day = s.slice(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`).toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}
function montarResumo(src) {
  const partes = [];
  const assuntos = (src.assuntos || []).map((a) => a.nome).filter(Boolean);
  if (assuntos.length) partes.push(`Assunto: ${assuntos.join(', ')}`);
  if (src.orgaoJulgador?.nome) partes.push(`Órgão: ${src.orgaoJulgador.nome}`);
  if (src.relator?.nome) partes.push(`Relator: ${src.relator.nome}`);
  if (src.situacao) partes.push(`Situação: ${src.situacao}`);
  return partes.join(' | ') || 'Consulte o processo no STJ.';
}

async function queryDataJud(tribunal, area, terms, size = 50) {
  const endpoint = TRIBUNAL_ENDPOINTS[tribunal];

  const body = {
    query: {
      bool: {
        should: terms.flatMap((term) => [
          { match: { 'assuntos.nome': { query: term, operator: 'or' } } },
          { match_phrase: { 'assuntos.nome': term } },
          { match: { 'classe.nome': { query: term, operator: 'or' } } },
        ]),
        minimum_should_match: 1,
      },
    },
    size,
    sort: [{ _score: 'desc' }],
    _source: ['numeroProcesso', 'classe', 'assuntos', 'movimentos', 'dataAjuizamento', 'orgaoJulgador', 'situacao', 'relator', 'tribunal'],
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
      const src = hit._source || {};
      const numero = src.numeroProcesso || hit._id || String(idx);
      const assuntos = (src.assuntos || []).map((a) => a.nome).filter(Boolean);
      const assunto = assuntos[0] || area;
      const link = `https://jurisprudencia.stj.jus.br/pages/search?base=acordaos&pesquisa_inteira=${encodeURIComponent(assunto)}`;

      return {
        id: `datajud-stj-${area}-${numero}`,
        tribunal: 'STJ',
        titulo: `${src.classe?.nome || 'Processo'} — ${assunto}`,
        ementa: montarResumo(src),
        data: parseDataJud(src.dataAjuizamento),
        link,
        area,
        fonte: 'datajud',
        classe: src.classe?.nome || '',
        orgao: src.orgaoJulgador?.nome || '',
        assuntos,
        situacao: src.situacao || '',
        relator: src.relator?.nome || '',
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
  // STF não está disponível no DataJud público; usa apenas STJ com size dobrado
  const tribunalList =
    tribunal === 'ambos' || tribunal.toUpperCase() === 'STF'
      ? ['STJ']
      : [tribunal.toUpperCase()].filter((t) => TRIBUNAL_ENDPOINTS[t]);

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
    queries.map((q) => queryDataJud(q.tribunal, q.area, q.terms, 50))
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
