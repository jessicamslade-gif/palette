import { supabase } from '../../../lib/supabase';
import { isAuthed } from '../../../lib/auth';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    // Used to fetch the "General Catalog" — links with no project assigned yet.
    const { data, error } = await supabase
      .from('links')
      .select('*')
      .is('project_id', null)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const {
      project_id,
      url,
      title,
      image_url,
      image_width,
      image_height,
      file_size_bytes,
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
        image_url: image_url || null,
        image_width: image_width || null,
        image_height: image_height || null,
        file_size_bytes: file_size_bytes || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).end();
}
