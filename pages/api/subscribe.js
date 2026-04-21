/**
 * Endpoint para registrar/remover subscriptions de push notification.
 *
 * POST /api/subscribe  – registra uma subscription
 * DELETE /api/subscribe – remove uma subscription
 *
 * Para produção, substitua o armazenamento em memória por um banco de dados.
 */

// Armazenamento simples em memória (use um DB em produção)
const subscriptions = new Map();

export default function handler(req, res) {
  if (req.method === 'POST') {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Subscription inválida' });
    }
    const key = subscription.endpoint;
    subscriptions.set(key, { subscription, createdAt: new Date().toISOString() });
    console.log('[Push] Subscription registrada:', key.slice(-30));
    return res.status(201).json({ ok: true, message: 'Subscription registrada' });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint obrigatório' });
    subscriptions.delete(endpoint);
    return res.status(200).json({ ok: true });
  }

  // GET – retorna contagem (útil para debug)
  if (req.method === 'GET') {
    return res.json({ total: subscriptions.size });
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
