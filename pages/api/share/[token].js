import { supabase } from '../../../lib/supabase';

// Public route — no auth required. Anyone with the share link can view
// a read-only version of the project via its share_token.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { token } = req.query;

  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('*')
    .eq('share_token', token)
    .single();

  if (pErr) return res.status(404).json({ error: 'Not found' });

  const { data: links, error: lErr } = await supabase
    .from('links')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false });

  if (lErr) return res.status(500).json({ error: lErr.message });

  return res.status(200).json({ ...project, links });
}
