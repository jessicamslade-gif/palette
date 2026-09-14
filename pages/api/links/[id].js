import { supabase } from '../../../lib/supabase';
import { isAuthed } from '../../../lib/auth';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.query;

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    // Used to move a link between projects/General Catalog, and to edit color/size.
    const { project_id, color, size } = req.body || {};
    const update = {};
    if (project_id !== undefined) update.project_id = project_id || null;
    if (color !== undefined) update.color = color || null;
    if (size !== undefined) update.size = size || null;

    const { data, error } = await supabase
      .from('links')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.status(405).end();
}
