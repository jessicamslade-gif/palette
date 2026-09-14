import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const IMG_BOX = 160;
const BLOCK_HEIGHT = 190;

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

  page.drawText(project.name, {
    x: MARGIN, y, size: 22, font: boldFont, color: rgb(0.1, 0.1, 0.1),
  });
  y -= 28;
  page.drawText(`${links.length} item${links.length === 1 ? '' : 's'}  ·  exported ${new Date().toLocaleDateString()}`, {
    x: MARGIN, y, size: 10, font, color: rgb(0.45, 0.45, 0.45),
  });
  y -= 34;

  const groups = groupBySection(links);

  for (const group of groups) {
    if (y - 24 < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(group.section.toUpperCase(), {
      x: MARGIN, y, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2),
    });
    y -= 22;

    for (const link of group.links) {
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

      const detailBits = [link.color, link.size, link.price].filter(Boolean).join('   ·   ');
      if (detailBits) {
        textY -= 4;
        page.drawText(detailBits, { x: textX, y: textY, size: 10, font: boldFont, color: rgb(0.35, 0.35, 0.35) });
        textY -= 15;
      }

      textY -= 6;
      const urlLines = wrapText(link.url, font, 9, textWidth).slice(0, 2);
      for (const line of urlLines) {
        page.drawText(line, { x: textX, y: textY, size: 9, font, color: rgb(0.25, 0.35, 0.8) });
        textY -= 13;
      }

      page.drawLine({
        start: { x: MARGIN, y: y - BLOCK_HEIGHT + 15 },
        end: { x: PAGE_WIDTH - MARGIN, y: y - BLOCK_HEIGHT + 15 },
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
