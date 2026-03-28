const { createToken, checkPassword, ADMIN_USERNAME } = require('./_utils/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};

  if (username !== ADMIN_USERNAME || !(await checkPassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = createToken();
  const secure = process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secure}`);
  return res.status(200).json({ ok: true });
};
