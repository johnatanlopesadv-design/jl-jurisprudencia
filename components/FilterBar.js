import { useState } from 'react';

const TRIBUNAIS = [
  { id: 'ambos', label: 'STJ + STF' },
  { id: 'stj',   label: 'STJ' },
  { id: 'stf',   label: 'STF' },
];

const AREAS = [
  { id: 'todas',      label: 'Todas',           icon: '⚖️' },
  { id: 'saude',      label: 'Plano de Saúde',  icon: '🏥' },
  { id: 'inss',       label: 'INSS / Prev.',    icon: '📋' },
  { id: 'consumidor', label: 'Consumidor',      icon: '🛡️' },
  { id: 'familia',    label: 'Família',         icon: '👨‍👩‍👧' },
];

export default function FilterBar({
  tribunal,
  setTribunal,
  area,
  setArea,
  counts,
  ultimaAtualizacao,
  onRefresh,
  loading,
}) {
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 1000);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="filter-bar">
      {/* Tribunal */}
      <div className="filter-section">
        <p className="filter-label">Tribunal</p>
        <div className="tribunal-group" role="group" aria-label="Filtrar por tribunal">
          {TRIBUNAIS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTribunal(t.id)}
              className={`tribunal-btn ${tribunal === t.id ? `active-${t.id}` : ''}`}
              aria-pressed={tribunal === t.id}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Área */}
      <div className="filter-section">
        <p className="filter-label">Área de atuação</p>
        <div className="area-scroll" role="group" aria-label="Filtrar por área">
          {AREAS.map((a) => {
            const count = a.id === 'todas'
              ? Object.values(counts || {}).reduce((s, v) => s + v, 0)
              : (counts || {})[a.id] || 0;

            return (
              <button
                key={a.id}
                onClick={() => setArea(a.id)}
                className={`area-btn ${area === a.id ? `active-${a.id}` : ''}`}
                aria-pressed={area === a.id}
              >
                <span role="img" aria-hidden="true">{a.icon}</span>
                {a.label}
                {count > 0 && (
                  <span className="area-count" aria-label={`${count} decisões`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Meta row */}
      <div className="filter-meta">
        <span className="last-updated">
          Atualizado: {formatDate(ultimaAtualizacao)}
        </span>
        <button
          className={`refresh-btn ${spinning ? 'spinning' : ''}`}
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Atualizar decisões"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path
              d="M11.5 6.5A5 5 0 1 1 6.5 1.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <polyline
              points="6.5,1.5 9,1.5 9,4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Atualizar
        </button>
      </div>
    </div>
  );
}
