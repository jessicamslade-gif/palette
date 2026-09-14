import { supabase } from '../../../lib/supabase';
import { isAuthed } from '../../../lib/auth';
import { buildCatalogPdf } from '../../../lib/pdf';

export default async function handler(req, res) {
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;

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
    .order('created_at', { ascending: true });
  if (lErr) return res.status(500).json({ error: lErr.message });

  const pdfBytes = await buildCatalogPdf(project, links);
  const safeName = project.name.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'catalog';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
  res.status(200).send(Buffer.from(pdfBytes));
}
