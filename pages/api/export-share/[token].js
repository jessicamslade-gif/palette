import { supabase } from '../../../lib/supabase';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Public route — no auth required, reachable via a project's share link.

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const IMG_BOX = 160;
const BLOCK_HEIGHT = 190;

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

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(project.name, {
    x: MARGIN, y, size: 22, font: boldFont, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;
  page.drawText(`${links.length} item${links.length === 1 ? '' : 's'}  ·  exported ${new Date().toLocaleDateString()}`, {
    x: MARGIN, y, size: 10, font, color: rgb(0.45, 0.45, 0.45),
  });
  y -= 30;

  for (const link of links) {
    if (y - BLOCK_HEIGHT < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    let imgDrawn = false;
    if (link.image_url) {
      try {
        const imgResp = await fetch(link.image_url);
        const contentType = imgResp.headers.get('content-type') || '';
        const imgBytes = new Uint8Array(await imgResp.arrayBuffer());
        let img;
        if (contentType.includes('png') || /\.png($|\?)/i.test(link.image_url)) {
          img = await pdfDoc.embedPng(imgBytes);
        } else {
          img = await pdfDoc.embedJpg(imgBytes);
        }
        const scale = Math.min(IMG_BOX / img.width, IMG_BOX / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawRectangle({
          x: MARGIN, y: y - IMG_BOX, width: IMG_BOX, height: IMG_BOX,
          color: rgb(0.96, 0.96, 0.96),
        });
        page.drawImage(img, {
          x: MARGIN + (IMG_BOX - w) / 2,
          y: y - IMG_BOX + (IMG_BOX - h) / 2,
          width: w, height: h,
        });
        imgDrawn = true;
      } catch (e) {
        // skip images that fail to fetch/decode
      }
    }

    const textX = MARGIN + IMG_BOX + 20;
    const textWidth = PAGE_WIDTH - textX - MARGIN;
    let textY = y - 14;

    const title = link.title || link.url;
    const titleLines = wrapText(title, boldFont, 13, textWidth).slice(0, 2);
    for (const line of titleLines) {
      page.drawText(line, { x: textX, y: textY, size: 13, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      textY -= 17;
    }

    if (link.color || link.size) {
      textY -= 4;
      const detailBits = [link.color, link.size].filter(Boolean).join('   ·   ');
      page.drawText(detailBits, { x: textX, y: textY, size: 10, font: boldFont, color: rgb(0.35, 0.35, 0.35) });
      textY -= 15;
    }

    textY -= 6;
    const urlLines = wrapText(link.url, font, 9, textWidth).slice(0, 2);
    for (const line of urlLines) {
      page.drawText(line, { x: textX, y: textY, size: 9, font, color: rgb(0.25, 0.35, 0.8) });
      textY -= 13;
    }

    textY -= 8;
    const metaBits = [];
    if (link.image_width && link.image_height) metaBits.push(`${link.image_width}\u00d7${link.image_height}px`);
    if (link.file_size_bytes) metaBits.push(formatBytes(link.file_size_bytes));
    if (metaBits.length) {
      page.drawText(metaBits.join('   \u00b7   '), { x: textX, y: textY, size: 9, font, color: rgb(0.55, 0.55, 0.55) });
    }

    page.drawLine({
      start: { x: MARGIN, y: y - BLOCK_HEIGHT + 15 },
      end: { x: PAGE_WIDTH - MARGIN, y: y - BLOCK_HEIGHT + 15 },
      thickness: 0.5, color: rgb(0.88, 0.88, 0.88),
    });

    y -= BLOCK_HEIGHT;
  }

  const pdfBytes = await pdfDoc.save();
  const safeName = project.name.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'catalog';

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
  res.status(200).send(Buffer.from(pdfBytes));
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
