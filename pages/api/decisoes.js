import NodeCache from 'node-cache';
import { detectArea, matchesArea } from '../../lib/keywords';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// URL do proxy no Render.com (altere após o deploy do servidor)
const PROXY_URL =
  process.env.PROXY_URL ||
  'https://jl-juris-proxy.onrender.com';

const STJ_URL = 'https://processo.stj.jus.br/SCON/';
const STF_URL = 'https://jurisprudencia.stf.jus.br/pages/search';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_DECISOES = [
  // PLANO DE SAÚDE
  { id: 'mock-stj-saude-1', tribunal: 'STJ', titulo: 'Plano de saúde não pode negar cobertura a procedimento indicado por médico', ementa: 'A operadora não pode recusar cobertura a procedimento prescrito pelo médico assistente quando incluído no rol da ANS, sendo abusiva cláusula contratual restritiva. Dano moral configurado.', data: new Date(Date.now() - 1 * 86400000).toISOString(), link: STJ_URL, area: 'saude', fonte: 'mock' },
  { id: 'mock-stj-saude-2', tribunal: 'STJ', titulo: 'Negativa de internação por plano de saúde gera dano moral in re ipsa', ementa: 'A recusa injustificada de cobertura de internação hospitalar em situação de urgência configura dano moral in re ipsa, prescindindo de comprovação do efetivo prejuízo.', data: new Date(Date.now() - 3 * 86400000).toISOString(), link: STJ_URL, area: 'saude', fonte: 'mock' },
  { id: 'mock-stf-saude-1', tribunal: 'STF', titulo: 'STF: ANS pode ampliar rol de cobertura obrigatória por resolução normativa', ementa: 'A ANS possui competência para ampliar o rol de procedimentos de cobertura obrigatória pelos planos de saúde por resolução normativa, com caráter exemplificativo.', data: new Date(Date.now() - 5 * 86400000).toISOString(), link: STF_URL, area: 'saude', fonte: 'mock' },
  { id: 'mock-stj-saude-3', tribunal: 'STJ', titulo: 'Operadora deve reembolsar tratamento fora da rede em situação de urgência', ementa: 'Em situação de urgência sem estabelecimento credenciado na localidade, a operadora é obrigada a reembolsar as despesas fora da rede, nos limites do contrato.', data: new Date(Date.now() - 7 * 86400000).toISOString(), link: STJ_URL, area: 'saude', fonte: 'mock' },
  // INSS
  { id: 'mock-stj-inss-1', tribunal: 'STJ', titulo: 'Direito ao auxílio-doença após alta indevida do INSS', ementa: 'O segurado incapaz para o trabalho, comprovado por perícia judicial, faz jus ao restabelecimento do auxílio-doença mesmo após cessação administrativa pelo INSS.', data: new Date(Date.now() - 2 * 86400000).toISOString(), link: STJ_URL, area: 'inss', fonte: 'mock' },
  { id: 'mock-stf-inss-1', tribunal: 'STF', titulo: 'STF reafirma constitucionalidade do BPC/LOAS para pessoa com deficiência', ementa: 'O critério de renda per capita inferior a 1/4 do salário mínimo não é o único meio de prova da miserabilidade para o BPC/LOAS, admitindo outros elementos probatórios.', data: new Date(Date.now() - 4 * 86400000).toISOString(), link: STF_URL, area: 'inss', fonte: 'mock' },
  { id: 'mock-stj-inss-2', tribunal: 'STJ', titulo: 'Tempo rural sem registro conta para aposentadoria com prova testemunhal', ementa: 'O tempo de trabalho rural pode ser computado para aposentadoria no INSS, desde que comprovado por início de prova material corroborado por prova testemunhal idônea.', data: new Date(Date.now() - 6 * 86400000).toISOString(), link: STJ_URL, area: 'inss', fonte: 'mock' },
  { id: 'mock-stj-inss-3', tribunal: 'STJ', titulo: 'Pensão por morte: companheira em união estável tem direito sem registro formal', ementa: 'A companheira em união estável faz jus à pensão por morte do INSS independentemente de registro em cartório, desde que comprovada a convivência duradoura, pública e contínua.', data: new Date(Date.now() - 8 * 86400000).toISOString(), link: STJ_URL, area: 'inss', fonte: 'mock' },
  // CONSUMIDOR
  { id: 'mock-stj-consumidor-1', tribunal: 'STJ', titulo: 'Banco responde por dano moral em inscrição indevida no Serasa/SPC', ementa: 'A instituição financeira que insere indevidamente o nome do consumidor nos cadastros de restrição ao crédito responde por dano moral, sendo presumido o abalo à honra e ao crédito.', data: new Date(Date.now() - 1 * 86400000).toISOString(), link: STJ_URL, area: 'consumidor', fonte: 'mock' },
  { id: 'mock-stj-consumidor-2', tribunal: 'STJ', titulo: 'Juros abusivos em contrato bancário são nulos pelo CDC', ementa: 'São nulas as cláusulas que estipulam juros remuneratórios muito superiores à média do mercado financeiro, configurando abusividade nos termos do Código de Defesa do Consumidor.', data: new Date(Date.now() - 3 * 86400000).toISOString(), link: STJ_URL, area: 'consumidor', fonte: 'mock' },
  { id: 'mock-stf-consumidor-1', tribunal: 'STF', titulo: 'STF: CDC aplica-se a contratos de financiamento imobiliário bancário', ementa: 'O CDC aplica-se aos contratos de financiamento imobiliário com instituições financeiras, sendo o mutuário considerado consumidor para todos os fins legais.', data: new Date(Date.now() - 5 * 86400000).toISOString(), link: STF_URL, area: 'consumidor', fonte: 'mock' },
  { id: 'mock-stj-consumidor-3', tribunal: 'STJ', titulo: 'Consumidor tem direito à devolução em dobro de cobrança indevida', ementa: 'O consumidor que sofre cobrança indevida tem direito à devolução em dobro do montante pago, nos termos do art. 42, § único, do CDC, salvo engano justificável por parte do fornecedor.', data: new Date(Date.now() - 7 * 86400000).toISOString(), link: STJ_URL, area: 'consumidor', fonte: 'mock' },
  // FAMÍLIA
  { id: 'mock-stj-familia-1', tribunal: 'STJ', titulo: 'Guarda compartilhada é a regra mesmo com pais em cidades diferentes', ementa: 'A guarda compartilhada aplica-se como regra nas separações, sendo possível mesmo com genitores em cidades distintas, priorizando sempre o melhor interesse da criança.', data: new Date(Date.now() - 2 * 86400000).toISOString(), link: STJ_URL, area: 'familia', fonte: 'mock' },
  { id: 'mock-stj-familia-2', tribunal: 'STJ', titulo: 'Alimentos gravídicos convertem-se automaticamente em pensão ao nascituro', ementa: 'Os alimentos gravídicos convertem-se automaticamente em pensão alimentícia em favor do filho após o nascimento, sem necessidade de nova ação judicial.', data: new Date(Date.now() - 4 * 86400000).toISOString(), link: STJ_URL, area: 'familia', fonte: 'mock' },
  { id: 'mock-stf-familia-1', tribunal: 'STF', titulo: 'Filho por reprodução assistida post mortem tem direito à herança', ementa: 'O filho concebido por reprodução assistida post mortem, com autorização prévia do pai falecido, possui direito à herança e ao reconhecimento da filiação.', data: new Date(Date.now() - 6 * 86400000).toISOString(), link: STF_URL, area: 'familia', fonte: 'mock' },
  { id: 'mock-stj-familia-3', tribunal: 'STJ', titulo: 'Partilha em união estável retroage à data do início da convivência', ementa: 'Na dissolução da união estável, a partilha dos bens adquiridos onerosamente retroage ao início da convivência, sendo presumida a contribuição de ambos os companheiros.', data: new Date(Date.now() - 9 * 86400000).toISOString(), link: STJ_URL, area: 'familia', fonte: 'mock' },
];

// ─── HANDLER ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { area = 'todas', tribunal = 'ambos', check } = req.query;
  const cacheKey = `proxy_${tribunal}_${area}`;

  // Cache local (evita hits repetidos ao proxy)
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.status(200).json({ ...cached, fromCache: true });
  }

  let allItems = [];
  let fonte = 'mock';
  let erroProxy = null;

  // ── Tenta o proxy no Render ────────────────────────────────────────────────
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
      allItems = data.decisoes;
      fonte = 'proxy';
      console.log(`[Proxy] OK: ${allItems.length} itens`);

      // Cacheia por 30 min
      const payload = buildPayload(allItems, data.fontes || {}, false, data.counts);
      cache.set(cacheKey, payload, 1800);
      return res.status(200).json(payload);
    }

    erroProxy = `Proxy retornou 0 itens`;
  } catch (err) {
    erroProxy = err.message;
    console.error('[Proxy] falhou:', err.message);
  }

  // ── Fallback: mock data ────────────────────────────────────────────────────
  console.warn('[Fallback] Usando mock. Erro proxy:', erroProxy);

  let mockItems = MOCK_DECISOES;
  if (tribunal !== 'ambos') {
    mockItems = mockItems.filter((d) => d.tribunal === tribunal.toUpperCase());
  }

  // Filtra por área se necessário
  if (area && area !== 'todas') {
    const byArea = mockItems.filter((d) => d.area === area || matchesArea(`${d.titulo} ${d.ementa}`, area));
    allItems = byArea.length > 0 ? byArea : mockItems;
  } else {
    allItems = mockItems;
  }

  const payload = buildPayload(
    allItems,
    { stj: 'mock', stf: 'mock' },
    true,
    buildCounts(allItems),
    erroProxy,
  );

  return res.status(200).json(payload);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function buildCounts(items) {
  const counts = {};
  items.forEach((item) => {
    const a = item.area || detectArea(`${item.titulo} ${item.ementa}`);
    if (a) counts[a] = (counts[a] || 0) + 1;
  });
  return counts;
}

function buildPayload(items, fontes, mock, counts, erroProxy) {
  // Ordena por data
  const sorted = [...items].sort((a, b) => new Date(b.data) - new Date(a.data));

  return {
    decisoes: sorted.slice(0, 60),
    total: sorted.length,
    counts: counts || buildCounts(sorted),
    ultimaAtualizacao: new Date().toISOString(),
    fontes,
    mock,
    ...(erroProxy ? { erroProxy } : {}),
  };
}
