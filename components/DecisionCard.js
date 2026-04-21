import { useState } from 'react';

export default function DecisionCard({ decisao, index }) {
  const [expandido, setExpandido] = useState(false);

  const numeroProcesso = decisao?.id?.match(/\d{20}/)?.[0] || '';

  return (
    <div style={{
      background: '#1a1a2e',
      border: '1px solid #c9a84c33',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ background: '#c9a84c22', color: '#c9a84c', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
          {decisao?.tribunal} • {decisao?.area}
        </span>
        <span style={{ color: '#888', fontSize: '12px' }}>
          {decisao?.data ? new Date(decisao.data).toLocaleDateString('pt-BR') : ''}
        </span>
      </div>

      <h3 style={{ color: '#fff', fontSize: '14px', margin: '10px 0 8px', lineHeight: '1.4' }}>
        {decisao?.titulo}
      </h3>

      <p style={{ color: '#aaa', fontSize: '13px', margin: '0 0 12px', lineHeight: '1.5' }}>
        {expandido ? decisao?.ementa : `${decisao?.ementa?.slice(0, 120)}...`}
      </p>

      {expandido && numeroProcesso && (
        <p style={{ color: '#888', fontSize: '12px', margin: '0 0 8px' }}>
          Processo: {numeroProcesso}
        </p>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setExpandido(!expandido)}
          style={{
            background: 'transparent',
            border: '1px solid #c9a84c',
            color: '#c9a84c',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          {expandido ? 'Recolher' : 'Ver ementa completa'}
        </button>

        <a
          href="https://www.stj.jus.br/sites/portalp/Paginas/jurisprudencia.aspx"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'transparent',
            border: '1px solid #555',
            color: '#aaa',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            textDecoration: 'none'
          }}
        >
          Buscar no STJ
        </a>
      </div>
    </div>
  );
}
