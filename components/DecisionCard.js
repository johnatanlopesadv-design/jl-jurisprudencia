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
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function extractNumeroProcesso(id) {
  if (!id) return null;
  const match = id.match(/STJ_SUP_(\d+)/);
  return match ? match[1] : null;
}

export default function DecisionCard({ decisao, index }) {
  const { tribunal, titulo, ementa, data, area, id } = decisao;
  const [expandido, setExpandido] = useState(false);

  const delay         = Math.min(index * 50, 400);
  const areaClass     = area ? `area-${area}` : '';
  const tribunalClass = tribunal === 'STJ' ? 'badge-stj' : 'badge-stf';
  const areaLabel     = AREA_LABELS[area] || area;
  const areaIcon      = AREA_ICONS[area] || '⚖️';
  const numeroProcesso = extractNumeroProcesso(id);

  return (
    <div
      className={`decision-card ${areaClass}${expandido ? ' card-expandido' : ''}`}
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

      {/* Ementa resumida (colapsada) */}
      {!expandido && ementa && (
        <p className="card-ementa">{ementa}</p>
      )}

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="card-expanded-content">
          {ementa && (
            <div className="expanded-section">
              <span className="expanded-label">Ementa</span>
              <p className="expanded-ementa">{ementa}</p>
            </div>
          )}

          <div className="expanded-meta">
            {tribunal && (
              <div className="expanded-meta-item">
                <span className="expanded-label">Tribunal</span>
                <span>{tribunal}</span>
              </div>
            )}
            {areaLabel && (
              <div className="expanded-meta-item">
                <span className="expanded-label">Área</span>
                <span>{areaIcon} {areaLabel}</span>
              </div>
            )}
            {numeroProcesso && (
              <div className="expanded-meta-item">
                <span className="expanded-label">Número do processo</span>
                <span className="expanded-numero">{numeroProcesso}</span>
              </div>
            )}
          </div>

          <div className="expanded-footer">
            <a
              href="https://jurisprudencia.stj.jus.br/pages/search"
              target="_blank"
              rel="noopener noreferrer"
              className="expanded-stj-link"
            >
              Pesquisar no STJ
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path
                  d="M2 6.5H11M7.5 3L11 6.5L7.5 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="card-footer">
        <button
          type="button"
          className="card-link-text"
          onClick={() => setExpandido((v) => !v)}
        >
          {expandido ? 'Recolher' : 'Ver ementa completa'}
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            style={{ transform: expandido ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path
              d="M2 6.5H11M7.5 3L11 6.5L7.5 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="card-source">via {tribunal}</span>
      </div>
    </div>
  );
}
