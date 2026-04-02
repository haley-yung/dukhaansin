const { supabase } = require('../../_utils/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('id');

  if (error) return res.status(500).json({ error: error.message });

  // Convert snake_case DB columns to camelCase for frontend
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
};
