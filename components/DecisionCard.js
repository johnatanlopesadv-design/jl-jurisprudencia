import { useState } from 'react';

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
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DecisionCard({ decisao, index }) {
  const [expandido, setExpandido] = useState(false);

  const {
    tribunal = 'STJ',
    titulo = '',
    area = '',
    data,
    link,
    classe,
    orgao,
    assuntos = [],
    situacao,
    relator,
    id,
  } = decisao || {};

  const areaLabel = AREA_LABELS[area] || area;
  const areaIcon  = AREA_ICONS[area]  || '⚖️';
  const delay     = Math.min(index * 50, 400);

  function abrirProcesso() {
    if (link && link.startsWith('http')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div
      className={`decision-card area-${area}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header: badges + data */}
      <div className="card-header">
        <div className="card-badges">
          <span className="badge badge-stj">{tribunal}</span>
          {area && (
            <span className={`badge badge-${area}`}>{areaIcon} {areaLabel}</span>
          )}
        </div>
        <time className="card-date" dateTime={data}>{formatDate(data)}</time>
      </div>

      {/* Título */}
      <h2 className="card-title">{titulo}</h2>

      {/* Resumo sempre visível */}
      {assuntos.length > 0 && (
        <p className="card-ementa">
          {assuntos.join(' · ')}
        </p>
      )}

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="card-details">
          {orgao && (
            <div className="detail-row">
              <span className="detail-label">Órgão julgador</span>
              <span className="detail-value">{orgao}</span>
            </div>
          )}
          {relator && (
            <div className="detail-row">
              <span className="detail-label">Relator</span>
              <span className="detail-value">{relator}</span>
            </div>
          )}
          {situacao && (
            <div className="detail-row">
              <span className="detail-label">Situação</span>
              <span className="detail-value">{situacao}</span>
            </div>
          )}
          {id && (
            <div className="detail-row">
              <span className="detail-label">Nº processo</span>
              <span className="detail-value detail-mono">{id}</span>
            </div>
          )}
        </div>
      )}

      {/* Rodapé */}
      <div className="card-footer">
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="card-link-text"
            onClick={() => setExpandido((v) => !v)}
          >
            {expandido ? 'Recolher' : 'Ver detalhes'}
            <svg
              width="13" height="13" viewBox="0 0 13 13" fill="none"
              style={{ transform: expandido ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M2 6.5H11M7.5 3L11 6.5L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {link && (
            <button
              type="button"
              className="card-link-text"
              style={{ color: 'var(--text-muted)', fontSize: '12px' }}
              onClick={abrirProcesso}
            >
              Ver no STJ ↗
            </button>
          )}
        </div>
        <span className="card-source">DataJud · CNJ</span>
      </div>
    </div>
  );
}
