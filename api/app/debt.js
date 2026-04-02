const { supabase } = require('../_utils/supabase');

module.exports = async (req, res) => {
  // Route: GET /api/app/debt — list all loans
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('loans').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });

    const loans = data.map(row => ({
      id: row.id,
      name: row.name,
      borrowed: Number(row.borrowed),
      apr: Number(row.apr),
      monthly: Number(row.monthly),
      paid: Number(row.paid),
      remaining: Number(row.remaining),
      installmentsPaid: row.installments_paid,
      totalInstallments: row.total_installments,
      interestPaid: row.interest_paid ? Number(row.interest_paid) : undefined,
      principalPaid: row.principal_paid ? Number(row.principal_paid) : undefined,
      interestRemaining: row.interest_remaining ? Number(row.interest_remaining) : undefined,
      avgPayment: row.avg_payment ? Number(row.avg_payment) : undefined,
      properInstallment: row.proper_installment ? Number(row.proper_installment) : undefined,
      revolving: row.revolving,
      danger: row.danger,
      color: row.color,
      startYear: row.start_year,
      startMonth: row.start_month,
    }));

    return res.json({ loans });
  }

  // Route: PUT /api/app/debt — pay or undo
  // Body: { action: "pay", loanId } or { action: "undo", loanId, previous: { installmentsPaid, paid, remaining } }
  if (req.method === 'PUT') {
    const { action, loanId, previous } = req.body || {};
    const id = parseInt(loanId, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid loanId' });

    if (action === 'pay') {
      const { data: loan, error: fetchErr } = await supabase
        .from('loans').select('*').eq('id', id).single();

      if (fetchErr || !loan) return res.status(404).json({ error: 'Loan not found' });
      if (loan.installments_paid >= loan.total_installments || Number(loan.remaining) <= 0) {
        return res.status(400).json({ error: 'Loan already fully paid' });
      }

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

      const { error: updateErr } = await supabase.from('loans').update(updates).eq('id', id);
      if (updateErr) return res.status(500).json({ error: updateErr.message });

      return res.json({
        ok: true,
        previous: { installmentsPaid: loan.installments_paid, paid: Number(loan.paid), remaining },
      });
    }

    if (action === 'undo') {
      if (!previous || previous.installmentsPaid == null || previous.paid == null || previous.remaining == null) {
        return res.status(400).json({ error: 'Previous state required' });
      }

      const { error } = await supabase.from('loans').update({
        installments_paid: previous.installmentsPaid,
        paid: previous.paid,
        remaining: previous.remaining,
      }).eq('id', id);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
