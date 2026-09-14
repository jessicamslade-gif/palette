export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { password } = req.body || {};

  if (password && password === process.env.APP_SECRET) {
    res.setHeader(
      'Set-Cookie',
      `auth_token=${process.env.APP_SECRET}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ error: 'Invalid password' });
}
