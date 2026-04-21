import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

const PROXY_URL =
  process.env.PROXY_URL ||
  'https://jl-juris-proxy.onrender.com';

// ─── HANDLER ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { area = 'todas', tribunal = 'ambos' } = req.query;
  const cacheKey = `proxy_${tribunal}_${area}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, fromCache: true });
  }

  try {
    const params = new URLSearchParams({ area, tribunal });
    const url = `${PROXY_URL}/api/decisoes?${params}`;
    console.log(`[Proxy] GET ${url}`);

    const proxyRes = await fetch(url, {
      headers: { 'User-Agent': 'JLJurisprudencia-Next/1.0' },
      signal: AbortSignal.timeout(20000),
    });

    if (!proxyRes.ok) throw new Error(`Proxy HTTP ${proxyRes.status}`);

    const data = await proxyRes.json();

    if (data?.decisoes?.length > 0) {
      console.log(`[Proxy] OK: ${data.decisoes.length} itens`);
      const payload = buildPayload(data.decisoes, data.fontes || {}, data.counts);
      cache.set(cacheKey, payload, 1800);
      return res.status(200).json(payload);
    }

    throw new Error('Proxy retornou 0 itens');
  } catch (err) {
    console.error('[Proxy] falhou:', err.message);
    return res.status(200).json({
      decisoes: [],
      total: 0,
      counts: {},
      ultimaAtualizacao: new Date().toISOString(),
      fontes: {},
      erro: `Não foi possível carregar os dados: ${err.message}`,
    });
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function buildPayload(items, fontes, counts) {
  const sorted = [...items].sort((a, b) => new Date(b.data) - new Date(a.data));
  const c = counts || buildCounts(sorted);
  return {
    decisoes: sorted.slice(0, 60),
    total: sorted.length,
    counts: c,
    ultimaAtualizacao: new Date().toISOString(),
    fontes,
  };
}

function buildCounts(items) {
  const counts = {};
  items.forEach((item) => {
    if (item.area) counts[item.area] = (counts[item.area] || 0) + 1;
  });
  return counts;
}
