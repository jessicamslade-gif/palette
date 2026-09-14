export function isAuthed(req) {
  const secret = process.env.APP_SECRET;
  if (!secret) return false;
  const cookieToken = req.cookies?.auth_token;
  const headerToken = req.headers['x-api-key'];
  return cookieToken === secret || headerToken === secret;
}
