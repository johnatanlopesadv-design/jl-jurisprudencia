const AREA_LABELS = {
  saude:      'Plano de Saúde',
  inss:       'INSS / Prev.',
  consumidor: 'Consumidor',
  familia:    'Família',
};

const AREA_ICONS = {
  saude:      '🏥',
  inss:       '📋',
  consumidor: '🛡️',
  familia:    '👨‍👩‍👧',
};

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildDecisionUrl(decision) {
  if (decision.fonte === 'datajud' && decision.id) {
    const match = decision.id.match(/STJ_SUP_(\d+)/);
    if (match) {
      return `https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroRegistro&termo=${match[1]}`;
    }
  }
  return decision.link || 'https://processo.stj.jus.br/SCON/';
}

export default function DecisionCard({ decisao, index }) {
  const { tribunal, titulo, ementa, data, link, area } = decisao;

  const delay         = Math.min(index * 50, 400);
  const areaClass     = area ? `area-${area}` : '';
  const tribunalClass = tribunal === 'STJ' ? 'badge-stj' : 'badge-stf';
  const areaLabel     = AREA_LABELS[area] || area;
  const areaIcon      = AREA_ICONS[area] || '⚖️';

  const resolvedUrl = buildDecisionUrl(decisao);

  // Valida URL sem depender de new URL() para não re-encodar parâmetros
  const hasLink = typeof resolvedUrl === 'string' && resolvedUrl.startsWith('http');

  function abrirLink() {
    const url = resolvedUrl;
    console.log('[JL Juris] abrirLink chamado, url =', url);

    if (!url || !url.startsWith('http')) {
      console.warn('[JL Juris] URL inválida:', url);
      return;
    }

    // window.open é chamado diretamente no handler síncrono do clique —
    // browsers não bloqueiam isso como popup.
    // Usar <button> (não <a>) evita que o Next.js intercepte como rota interna.
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className={`decision-card ${areaClass}`}
      style={{ '--card-delay': `${delay}ms` }}
    >
      {/* Badges + data */}
      <div className="card-header">
        <div className="card-badges">
          <span className={`badge ${tribunalClass}`}>{tribunal}</span>
          {area && (
            <span className={`badge badge-${area}`}>
              {areaIcon} {areaLabel}
            </span>
          )}
        </div>
        <time className="card-date" dateTime={data}>
          {formatDate(data)}
        </time>
      </div>

      {/* Título */}
      <h2 className="card-title">{titulo}</h2>

      {/* Ementa */}
      {ementa && <p className="card-ementa">{ementa}</p>}

      {/* Rodapé */}
      <div className="card-footer">
        {hasLink ? (
          /*
           * <button type="button"> — NUNCA interceptado pelo Next.js router.
           * Ao contrário de <a href="...">, o router do Next.js não instala
           * listener de clique em <button>, então window.open() funciona
           * sem interferência.
           */
          <button
            type="button"
            className="card-link-text"
            onClick={abrirLink}
          >
            Ver decisão completa
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2 6.5H11M7.5 3L11 6.5L7.5 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <span className="card-link-text card-link-disabled">
            Link indisponível
          </span>
        )}
        <span className="card-source">via {tribunal}</span>
      </div>
    </div>
  );
}
