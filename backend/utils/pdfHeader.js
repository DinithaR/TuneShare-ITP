// Standardized PDF header drawer for all reports/receipts
// Usage:
//   import { drawReportHeader } from '../utils/pdfHeader.js'
//   const afterY = drawReportHeader(doc, { subtitle: 'Payment Receipt', accent: '#ec4899' })
//   // continue drawing content starting around afterY

export function drawReportHeader(doc, options = {}) {
  const {
    subtitle = 'Report',
    brand = 'TuneShare',
    accent = '#ec4899',
    y = 40,
    height = 60,
    left = doc.page.margins.left,
    right = doc.page.width - doc.page.margins.right,
  } = options;

  const width = right - left;

  // Accent bar
  doc.save();
  doc.rect(left, y, width, height).fill(accent);
  doc.restore();

  // Brand + subtitle
  doc
    .fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(brand, left + 10, y + 15, { continued: true });
  doc
    .font('Helvetica')
    .text(` • ${subtitle}`);

  // Set cursor after header
  const nextY = y + height + 10;
  doc.y = nextY;
  return nextY;
}
