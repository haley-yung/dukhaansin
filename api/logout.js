module.exports = (req, res) => {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0');
  return res.status(200).json({ ok: true });
};
