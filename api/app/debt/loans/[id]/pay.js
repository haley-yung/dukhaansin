const { supabase } = require('../../../../_utils/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const id = parseInt(req.query.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid loan ID' });

  // Get current loan state
  const { data: loan, error: fetchErr } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !loan) return res.status(404).json({ error: 'Loan not found' });

  if (loan.installments_paid >= loan.total_installments || Number(loan.remaining) <= 0) {
    return res.status(400).json({ error: 'Loan already fully paid' });
  }

  // Calculate payment
  const remaining = Number(loan.remaining);
  const monthly = Number(loan.monthly);
  const apr = Number(loan.apr);
  const interest = remaining * (apr / 100 / 12);
  const principal = Math.max(monthly - interest, 0);

  const updates = {
    installments_paid: loan.installments_paid + 1,
    paid: Math.round((Number(loan.paid) + monthly) * 100) / 100,
    remaining: Math.max(Math.round((remaining - principal) * 100) / 100, 0),
  };

  const { error: updateErr } = await supabase
    .from('loans')
    .update(updates)
    .eq('id', id);

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Return the previous state so frontend can undo
  return res.json({
    ok: true,
    previous: {
      installmentsPaid: loan.installments_paid,
      paid: Number(loan.paid),
      remaining: remaining,
    },
  });
};
