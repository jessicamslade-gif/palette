import { supabase } from '../../../lib/supabase';
import { buildCatalogPdf } from '../../../lib/pdf';

// Public route — no auth required, reachable via a project's share link.
export default async function handler(req, res) {
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
    .order('created_at', { ascending: true });
  if (lErr) return res.status(500).json({ error: lErr.message });

  const pdfBytes = await buildCatalogPdf(project, links);
  const safeName = project.name.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'catalog';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
  res.status(200).send(Buffer.from(pdfBytes));
}
