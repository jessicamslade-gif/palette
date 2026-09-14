import { supabase } from '../../../lib/supabase';
import { isAuthed } from '../../../lib/auth';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (pErr) return res.status(404).json({ error: 'Project not found' });

    const { data: links, error: lErr } = await supabase
      .from('links')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (lErr) return res.status(500).json({ error: lErr.message });

    return res.status(200).json({ ...project, links });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
