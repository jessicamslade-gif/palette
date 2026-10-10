import { supabase } from '../../lib/supabase';
import { isAuthed } from '../../lib/auth';

const BUCKET = 'link-images';

// The browser sends a resized JPEG as base64, so the body stays well under
// Vercel's request size limit.
export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

async function uploadTo(path, buffer) {
  return supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'image/jpeg',
    upsert: false,
  });
}

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  const { link_id, data } = req.body || {};
  if (!link_id || !data) {
    return res.status(400).json({ error: 'link_id and data are required' });
  }

  const buffer = Buffer.from(data, 'base64');
  const path = `${link_id}-${Date.now()}.jpg`;

  let { error } = await uploadTo(path, buffer);

  // First upload ever: the storage bucket doesn't exist yet, so create it
  // (public, so the image URL works in the app, share links, and the PDF).
  if (error && /not found/i.test(error.message || '')) {
    await supabase.storage.createBucket(BUCKET, { public: true });
    ({ error } = await uploadTo(path, buffer));
  }

  if (error) return res.status(500).json({ error: error.message });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: updated, error: updateError } = await supabase
    .from('links')
    .update({ image_url: pub.publicUrl })
    .eq('id', link_id)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });
  return res.status(200).json(updated);
}
