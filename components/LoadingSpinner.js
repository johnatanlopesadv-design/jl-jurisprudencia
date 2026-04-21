export default function LoadingSpinner({ message = 'Buscando decisões...' }) {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="loading-text">{message}</p>
    </div>
  );
}
