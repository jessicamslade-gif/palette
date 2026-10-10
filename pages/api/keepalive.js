import { supabase } from '../../lib/supabase';

// Called once a day by the Vercel cron job defined in vercel.json.
// It runs a tiny real query so Supabase sees regular activity and doesn't
// auto-pause the free-tier project. Returns no data.
export default async function handler(req, res) {
  // Optional protection: if CRON_SECRET is set in Vercel, Vercel's cron
  // sends it automatically, and anyone else is turned away.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false });
  }

  const { error } = await supabase.from('projects').select('id').limit(1);

  if (error) {
    // A non-200 shows up in Vercel's cron logs so a failure is visible.
    return res.status(500).json({ ok: false });
  }

  return res.status(200).json({ ok: true, checkedAt: new Date().toISOString() });
}
