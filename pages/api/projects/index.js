import { supabase } from '../../../lib/supabase';
import { isAuthed } from '../../../lib/auth';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, created_at, links(count)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const result = projects.map((p) => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      link_count: p.links?.[0]?.count ?? 0,
    }));

    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { name } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });

    const { data, error } = await supabase
      .from('projects')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).end();
}
