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
  y -= 24;

  const groups = groupBySection(links);

  for (const group of groups) {
    if (y - 20 < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    page.drawText(group.section.toUpperCase(), {
      x: MARGIN, y, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.2),
    });
    y -= 18;

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

      const textX = MARGIN + IMG_BOX + 16;
      const textWidth = PAGE_WIDTH - textX - MARGIN;
      let textY = y - 12;

      const title = link.title || link.url;
      const titleLines = wrapText(title, boldFont, 11, textWidth).slice(0, 2);
      for (const line of titleLines) {
        page.drawText(line, { x: textX, y: textY, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        textY -= 14;
      }

      const detailBits = [link.color, link.size, link.price].filter(Boolean).join('   ·   ');
      if (detailBits) {
        textY -= 3;
        page.drawText(detailBits, { x: textX, y: textY, size: 9, font: boldFont, color: rgb(0.35, 0.35, 0.35) });
        textY -= 13;
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
