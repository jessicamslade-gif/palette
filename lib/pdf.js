import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 25;
const IMG_BOX = 120;
const BLOCK_HEIGHT = 150;
const HEADER_HEIGHT = 56;

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url);
  }
}

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch (e) {
    return null; // fall back to embedding the raw bytes
  }
}

// Downloads one image and returns bytes pdf-lib can embed, or null.
// sharp converts any format (webp, avif, gif, svg, ...) to a small JPEG,
// which also keeps the PDF file size down.
async function fetchImage(url, sharp) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PaletteCatalog/1.0)',
        Accept: 'image/*',
      },
    });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());

    if (sharp) {
      try {
        const jpeg = await sharp(buf)
          .rotate()
          .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#f5f5f5' })
          .jpeg({ quality: 85 })
          .toBuffer();
        return { bytes: jpeg, type: 'jpg' };
      } catch (e) {
        // fall through to the raw bytes below
      }
    }
    const contentType = resp.headers.get('content-type') || '';
    const isPng = contentType.includes('png') || /\.png($|\?)/i.test(url);
    return { bytes: new Uint8Array(buf), type: isPng ? 'png' : 'jpg' };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Helvetica can only draw Latin-1-ish characters; anything else (emoji,
// some symbols) would crash the export, so swap those for '?'.
function safe(text) {
  return String(text ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\n\x20-\x7E\xA0-\xFF\u2013\u2014\u2022\u2026]/g, '?');
}

// Wraps text, respecting the line breaks the person typed.
function wrapParagraphs(text, font, size, maxWidth) {
  const lines = [];
  for (const para of safe(text).split(/\r?\n/)) {
    if (!para.trim()) { lines.push(''); continue; }
    lines.push(...wrapText(para, font, size, maxWidth));
  }
  return lines;
}

function groupBySection(links) {
  const groups = {};
  for (const link of links) {
    const key = link.section || 'Ungrouped';
    if (!groups[key]) groups[key] = [];
    groups[key].push(link);
  }
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => ({ section: key, links: groups[key] }));
}

export async function buildCatalogPdf(project, links) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Branded header band with logo + project title together.
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-white.png');
    const logoBytes = fs.readFileSync(logoPath);
    const logoImg = await pdfDoc.embedPng(logoBytes);

    page.drawRectangle({
      x: 0, y: PAGE_HEIGHT - HEADER_HEIGHT, width: PAGE_WIDTH, height: HEADER_HEIGHT,
      color: rgb(0.11, 0.11, 0.11),
    });

    const logoSize = HEADER_HEIGHT - 20;
    const logoScale = logoSize / logoImg.height;
    const logoWidth = logoImg.width * logoScale;
    page.drawImage(logoImg, {
      x: MARGIN,
      y: PAGE_HEIGHT - HEADER_HEIGHT + 10,
      width: logoWidth,
      height: logoSize,
    });

    const titleSize = 15;
    page.drawText(project.name, {
      x: MARGIN + logoWidth + 16,
      y: PAGE_HEIGHT - HEADER_HEIGHT / 2 - titleSize / 2 + 3,
      size: titleSize,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    y = PAGE_HEIGHT - HEADER_HEIGHT - 20;
  } catch (e) {
    // logo missing or unreadable — fall back to plain text title
    page.drawText(project.name, {
      x: MARGIN, y, size: 18, font: boldFont, color: rgb(0.1, 0.1, 0.1),
    });
    y -= 22;
  }

  page.drawText(`${links.length} item${links.length === 1 ? '' : 's'}  ·  exported ${new Date().toLocaleDateString()}`, {
    x: MARGIN, y, size: 9, font, color: rgb(0.45, 0.45, 0.45),
  });
  y -= 20;

  // Overall note for the client
  if (project.notes && project.notes.trim()) {
    const noteSize = 10;
    const lineH = 14;
    const noteWidth = PAGE_WIDTH - MARGIN * 2 - 16;
    const noteLines = wrapParagraphs(project.notes.trim(), font, noteSize, noteWidth);
    let i = 0;
    while (i < noteLines.length) {
      if (y - lineH < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      const fit = Math.max(1, Math.floor((y - MARGIN) / lineH));
      const chunk = noteLines.slice(i, i + fit);
      const boxH = chunk.length * lineH + 8;
      page.drawRectangle({ x: MARGIN, y: y - boxH + 4, width: PAGE_WIDTH - MARGIN * 2, height: boxH, color: rgb(0.96, 0.96, 0.96) });
      page.drawRectangle({ x: MARGIN, y: y - boxH + 4, width: 3, height: boxH, color: rgb(0.11, 0.11, 0.11) });
      chunk.forEach((line, n) => {
        page.drawText(line, { x: MARGIN + 14, y: y - 8 - n * lineH, size: noteSize, font, color: rgb(0.2, 0.2, 0.2) });
      });
      y -= boxH + 4;
      i += chunk.length;
    }
    y -= 14;
  }

  // Fetch every image up front, in parallel, so a big project doesn't
  // time out downloading them one at a time.
  const sharp = await loadSharp();
  const images = new Map();
  await Promise.all(
    links.map(async (link) => {
      if (link.image_url) images.set(link.id, await fetchImage(link.image_url, sharp));
    })
  );

  const groups = groupBySection(links);

  for (const group of groups) {
    if (y - 20 < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(safe(group.section).toUpperCase(), {
      x: MARGIN, y, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2),
    });
    y -= 18;

    for (const link of group.links) {
      if (y - BLOCK_HEIGHT < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      let imgDrawn = false;
      const fetched = images.get(link.id);
      if (fetched) {
        try {
          const img = fetched.type === 'png'
            ? await pdfDoc.embedPng(fetched.bytes)
            : await pdfDoc.embedJpg(fetched.bytes);
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
          // couldn't decode — fall through to the placeholder
        }
      }
      if (!imgDrawn) {
        page.drawRectangle({
          x: MARGIN, y: y - IMG_BOX, width: IMG_BOX, height: IMG_BOX,
          color: rgb(0.96, 0.96, 0.96),
          borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.5,
        });
        const label = 'No image';
        const labelWidth = font.widthOfTextAtSize(label, 9);
        page.drawText(label, {
          x: MARGIN + (IMG_BOX - labelWidth) / 2,
          y: y - IMG_BOX / 2 - 3,
          size: 9, font, color: rgb(0.68, 0.68, 0.68),
        });
      }

      const textX = MARGIN + IMG_BOX + 16;
      const textWidth = PAGE_WIDTH - textX - MARGIN;
      let textY = y - 12;

      const title = link.title || link.url;
      const titleLines = wrapText(safe(title), boldFont, 11, textWidth).slice(0, 2);
      for (const line of titleLines) {
        page.drawText(line, { x: textX, y: textY, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        textY -= 14;
      }

      const detailBits = safe([link.color, link.size, link.price].filter(Boolean).join('   ·   '));
      if (detailBits) {
        textY -= 3;
        page.drawText(detailBits, { x: textX, y: textY, size: 9, font: boldFont, color: rgb(0.35, 0.35, 0.35) });
        textY -= 13;
      }

      if (link.notes && link.notes.trim()) {
        textY -= 6;
        const noteLines = wrapParagraphs(link.notes.trim(), font, 9, textWidth);
        const shown = noteLines.slice(0, 5);
        if (noteLines.length > 5) shown[4] = shown[4].replace(/\s*\S{0,3}$/, '') + '…';
        for (const line of shown) {
          page.drawText(line, { x: textX, y: textY, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
          textY -= 11;
        }
      }

      textY -= 5;
      page.drawText(hostnameOf(link.url), { x: textX, y: textY, size: 8, font, color: rgb(0.25, 0.35, 0.8) });

      page.drawLine({
        start: { x: MARGIN, y: y - BLOCK_HEIGHT + 12 },
        end: { x: PAGE_WIDTH - MARGIN, y: y - BLOCK_HEIGHT + 12 },
        thickness: 0.5, color: rgb(0.88, 0.88, 0.88),
      });

      y -= BLOCK_HEIGHT;
    }
  }

  return pdfDoc.save();
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
