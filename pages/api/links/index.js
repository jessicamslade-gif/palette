import { supabase } from '../../../lib/supabase';
import { isAuthed } from '../../../lib/auth';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // General Catalog — every link across every project.
    const { data, error } = await supabase
      .from('links')
      .select('*, projects(name)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const {
      project_id,
      url,
      title,
      section,
      color,
      size,
      price,
      image_url,
    } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const { data, error } = await supabase
      .from('links')
      .insert({
        project_id: project_id || null,
        url,
        title: title || null,
        section: section || null,
        color: color || null,
        size: size || null,
        price: price || null,
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).end();
}
