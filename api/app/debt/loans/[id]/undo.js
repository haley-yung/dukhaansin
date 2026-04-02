const { supabase } = require('../../../../_utils/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const id = parseInt(req.query.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid loan ID' });

  // Frontend sends the previous state to restore
  const { installmentsPaid, paid, remaining } = req.body || {};

  if (installmentsPaid == null || paid == null || remaining == null) {
    return res.status(400).json({ error: 'Previous state required (installmentsPaid, paid, remaining)' });
  }

  const { error } = await supabase
    .from('loans')
    .update({
      installments_paid: installmentsPaid,
      paid: paid,
      remaining: remaining,
    })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ ok: true });
};
