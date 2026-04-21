export default function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-area">
          <div className="logo-badge" aria-hidden="true">JL</div>
          <div className="logo-text">
            <h1 className="logo-title">Jurisprudência</h1>
            <p className="logo-subtitle">Johnatan Lopes Advocacia</p>
          </div>
        </div>

        {/* Balança da Justiça */}
        <div className="header-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Haste vertical */}
            <line x1="20" y1="5" x2="20" y2="36" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
            {/* Base */}
            <line x1="13" y1="37" x2="27" y2="37" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
            {/* Viga horizontal */}
            <line x1="6" y1="13" x2="34" y2="13" stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round"/>
            {/* Pivô */}
            <circle cx="20" cy="13" r="2.5" fill="#c9a84c"/>
            <circle cx="20" cy="13" r="1.2" fill="#1a1a2e"/>
            {/* Fios esquerdo */}
            <line x1="9" y1="13" x2="7" y2="24" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="9" y1="13" x2="13" y2="24" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round"/>
            {/* Prato esquerdo */}
            <path d="M5.5 24 Q10 27.5 14.5 24" stroke="#c9a84c" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
            {/* Fios direito */}
            <line x1="31" y1="13" x2="27" y2="24" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round"/>
            <line x1="31" y1="13" x2="33" y2="24" stroke="#c9a84c" strokeWidth="1.2" strokeLinecap="round"/>
            {/* Prato direito */}
            <path d="M25.5 24 Q30 27.5 34.5 24" stroke="#c9a84c" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </header>
  );
}
