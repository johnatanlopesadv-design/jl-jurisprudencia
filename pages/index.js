import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import FilterBar from '../components/FilterBar';
import DecisionCard from '../components/DecisionCard';
import NotificationButton from '../components/NotificationButton';
import LoadingSpinner from '../components/LoadingSpinner';

const OFFLINE_CACHE_KEY = 'jl_juris_cache';

export default function Home() {
  const router = useRouter();

  // ── Estado principal ──────────────────────────────────────────────────────
  const [tribunal, setTribunal] = useState('ambos');
  const [area, setArea]         = useState('todas');
  const [decisoes, setDecisoes] = useState([]);
  const [counts, setCounts]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  // ── Sincronizar filtros com URL ───────────────────────────────────────────
  useEffect(() => {
    if (!router.isReady) return;
    const { area: qArea, tribunal: qTrib } = router.query;
    if (qArea) setArea(qArea);
    if (qTrib) setTribunal(qTrib);
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!router.isReady) return;
    router.replace(
      { pathname: '/', query: { tribunal, area } },
      undefined,
      { shallow: true }
    );
  }, [tribunal, area]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch decisions ───────────────────────────────────────────────────────
  const fetchDecisoes = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ tribunal, area });
        const res = await fetch(`/api/decisoes?${params}`);

        if (!res.ok) {
          throw new Error(`Erro HTTP ${res.status}`);
        }

        const data = await res.json();
        const items = data.decisoes || [];
        setDecisoes(items);
        setCounts(data.counts || {});
        setUltimaAtualizacao(data.ultimaAtualizacao);
        setIsOffline(false);

        // Persistir para uso offline
        try {
          localStorage.setItem(
            OFFLINE_CACHE_KEY,
            JSON.stringify({
              decisoes: items,
              counts: data.counts,
              ultimaAtualizacao: data.ultimaAtualizacao,
              area,
              tribunal,
              cachedAt: new Date().toISOString(),
            })
          );
        } catch {/* localStorage pode estar cheio */}
      } catch (err) {
        console.error('[Fetch] Erro:', err.message);

        // Tentar carregar do cache local
        try {
          const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw);
            setDecisoes(cached.decisoes || []);
            setCounts(cached.counts || {});
            setUltimaAtualizacao(cached.ultimaAtualizacao);
            setIsOffline(true);
            setError(
              `Sem conexão com o servidor. Exibindo cache de ${formatCacheAge(cached.cachedAt)}.`
            );
          } else {
            setError('Não foi possível buscar as decisões. Verifique sua conexão.');
          }
        } catch {
          setError('Não foi possível buscar as decisões. Verifique sua conexão.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tribunal, area]
  );

  // Buscar ao montar e ao mudar filtros
  useEffect(() => {
    fetchDecisoes();
  }, [fetchDecisoes]);

  // Auto-refresh a cada 30 minutos
  useEffect(() => {
    const id = setInterval(() => fetchDecisoes(true), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchDecisoes]);

  // Monitor de conectividade
  useEffect(() => {
    function handleOnline()  { fetchDecisoes(true); }
    function handleOffline() { setIsOffline(true); }
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchDecisoes]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const touchStartY = useRef(null);
  const containerRef = useRef(null);

  function onTouchStart(e) {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }

  function onTouchMove(e) {
    if (touchStartY.current === null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 20) setRefreshing(true);
  }

  function onTouchEnd() {
    if (touchStartY.current === null) return;
    const diff = (touchStartY.current || 0);
    touchStartY.current = null;
    if (refreshing) fetchDecisoes(true);
    else setRefreshing(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const totalCount = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <>
      <Head>
        <title>JL Jurisprudência — Monitor STJ/STF</title>
        <meta
          name="description"
          content="Monitor de decisões relevantes do STJ e STF para Plano de Saúde, INSS, Consumidor e Família — Johnatan Lopes Advocacia."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <meta name="robots" content="noindex" />
        <meta property="og:title" content="JL Jurisprudência" />
        <meta property="og:description" content="Monitor de decisões STJ/STF" />
        <meta property="og:type" content="website" />
      </Head>

      <div
        className="app-container"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {refreshing && (
          <div className="pull-indicator" role="status" aria-live="polite">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ animation: 'spin 0.8s linear infinite' }}
            >
              <path
                d="M12 7A5 5 0 1 1 7 2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <polyline
                points="7,2 9.5,2 9.5,4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atualizando...
          </div>
        )}

        <Header />

        <div className="content-wrapper">
          <NotificationButton />

          <FilterBar
            tribunal={tribunal}
            setTribunal={setTribunal}
            area={area}
            setArea={setArea}
            counts={counts}
            ultimaAtualizacao={ultimaAtualizacao}
            onRefresh={() => { setRefreshing(true); fetchDecisoes(true); }}
            loading={loading}
          />

          {/* Offline badge */}
          {isOffline && (
            <div
              style={{
                margin: '12px 16px 0',
                padding: '8px 12px',
                background: 'rgba(201, 168, 76, 0.08)',
                border: '1px solid rgba(201, 168, 76, 0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📵 Modo offline — dados em cache
            </div>
          )}

          {/* Banner informativo */}
          <div className="info-banner">
            📋 Processos em tempo real do STJ — Copie o número e pesquise no SCON para ler a íntegra
          </div>

          <main className="decisions-container" id="main-content">
            {loading && <LoadingSpinner />}

            {error && !loading && (
              <div className="error-banner" role="alert">
                ⚠️ {error}
              </div>
            )}

            {!loading && decisoes.length === 0 && !error && (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">⚖️</div>
                <h2 className="empty-title">Nenhuma decisão encontrada</h2>
                <p className="empty-desc">
                  Não há decisões para os filtros selecionados. Tente selecionar
                  outra área ou tribunal.
                </p>
              </div>
            )}

            {!loading && decisoes.length > 0 && (
              <>
                <p className="results-summary" aria-live="polite">
                  <strong>{decisoes.length}</strong>
                  {decisoes.length === 1 ? ' decisão encontrada' : ' decisões encontradas'}
                  {totalCount > 0 && ` (${totalCount} com área identificada)`}
                </p>

                <div
                  className="decisions-grid"
                  role="list"
                  aria-label="Lista de decisões jurídicas"
                >
                  {decisoes.map((decisao, index) => (
                    <div role="listitem" key={decisao.id || index}>
                      <DecisionCard decisao={decisao} index={index} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

function formatCacheAge(cachedAt) {
  if (!cachedAt) return 'data desconhecida';
  const diff = Date.now() - new Date(cachedAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}
