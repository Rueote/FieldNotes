import { jsPDF } from 'jspdf';
import { Project, ScriptLine, TitlePage } from '@/types/screenplay';

const COURIER = 'Courier';
const FONT_SIZE = 12;
const PAGE_W = 8.5; // inches
const PAGE_H = 11;
const MARGIN_LEFT = 1.5;
const MARGIN_RIGHT = 1;
const MARGIN_TOP = 1;
const MARGIN_BOTTOM = 1;
const LINE_HEIGHT = FONT_SIZE * 1.5; // points
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const USABLE_H = (PAGE_H - MARGIN_TOP - MARGIN_BOTTOM) * 72; // in points

// Convert inches to points
const inPt = (inches: number) => inches * 72;

function addTitlePagePDF(doc: jsPDF, tp: TitlePage) {
  const centerX = PAGE_W / 2;
  doc.setFont(COURIER, 'normal');
  doc.setFontSize(FONT_SIZE);

  // Title - centered, slightly above middle
  const titleY = 4.5;
  doc.setFontSize(24);
  doc.setFont(COURIER, 'bold');
  doc.text(tp.title || 'Untitled', inPt(centerX), inPt(titleY), { align: 'center' });

  // Genre
  doc.setFontSize(FONT_SIZE);
  doc.setFont(COURIER, 'normal');
  if (tp.genre) {
    doc.text(tp.genre, inPt(centerX), inPt(titleY + 0.5), { align: 'center' });
  }

  // Written By
  const authorY = titleY + (tp.genre ? 1.0 : 0.6);
  doc.text('Written by', inPt(centerX), inPt(authorY), { align: 'center' });
  doc.text(tp.writtenBy || '', inPt(centerX), inPt(authorY + 0.3), { align: 'center' });

  // Additional
  if (tp.additional) {
    doc.text(tp.additional, inPt(centerX), inPt(authorY + 0.8), { align: 'center' });
  }

  // Contact - left aligned, 3/4 down
  if (tp.contact) {
    const contactLines = tp.contact.split('\n');
    let contactY = 8.25;
    contactLines.forEach(line => {
      doc.text(line, inPt(MARGIN_LEFT), inPt(contactY));
      contactY += 0.25;
    });
  }

  // Year - centered at bottom
  if (tp.year) {
    doc.text(tp.year, inPt(centerX), inPt(10), { align: 'center' });
  }
}

function getLineLeftMargin(type: string): number {
  switch (type) {
    case 'character': return 3.7;
    case 'parenthetical': return 3.1;
    case 'dialogue': return 2.5;
    case 'transition': return MARGIN_LEFT;
    default: return MARGIN_LEFT;
  }
}

function getLineRightMargin(type: string): number {
  switch (type) {
    case 'character': return 1;
    case 'parenthetical': return 2;
    case 'dialogue': return 2.5;
    default: return MARGIN_RIGHT;
  }
}

export function exportToPDF(project: Project): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  doc.setFont(COURIER, 'normal');
  doc.setFontSize(FONT_SIZE);

  // Title page
  addTitlePagePDF(doc, project.titlePage);
  doc.addPage();

  let y = inPt(MARGIN_TOP);
  const maxY = inPt(PAGE_H - MARGIN_BOTTOM);

  const newPage = () => {
    doc.addPage();
    y = inPt(MARGIN_TOP);
  };

  project.lines.forEach(line => {
    const text = line.text.trim();
    if (!text) return;

    const leftMargin = getLineLeftMargin(line.type);
    const rightMargin = getLineRightMargin(line.type);
    const maxWidth = (PAGE_W - leftMargin - rightMargin) * 72;

    const isUpper = line.type === 'scene-heading' || line.type === 'character' || line.type === 'transition';
    const displayText = isUpper ? text.toUpperCase() : text;

    if (line.type === 'scene-heading') {
      doc.setFont(COURIER, 'bold');
      y += LINE_HEIGHT; // Extra space before scene heading
    } else {
      doc.setFont(COURIER, 'normal');
    }

    const alignment = line.type === 'transition' ? 'right' : 'left';
    const splitText = doc.splitTextToSize(displayText, maxWidth);

    for (const splitLine of splitText) {
      if (y + LINE_HEIGHT > maxY) newPage();
      
      if (alignment === 'right') {
        doc.text(splitLine, inPt(PAGE_W - rightMargin), y, { align: 'right' });
      } else {
        doc.text(splitLine, inPt(leftMargin), y);
      }
      y += LINE_HEIGHT;
    }

    if (line.type === 'scene-heading') {
      doc.setFont(COURIER, 'normal');
    }
  });

  doc.save(`${project.name || 'screenplay'}.pdf`);
}

/**
 * Export to FDX (Final Draft XML format)
 */
export function exportToFDX(project: Project): void {
  const typeToFDX: Record<string, string> = {
    'scene-heading': 'Scene Heading',
    'action': 'Action',
    'character': 'Character',
    'dialogue': 'Dialogue',
    'parenthetical': 'Parenthetical',
    'transition': 'Transition',
  };

  const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let fdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <TitlePage>
      <Content>
        <Paragraph Type="Title Page" Alignment="Center">
          <Text>${escapeXml(project.titlePage.title || '')}</Text>
        </Paragraph>
        <Paragraph Type="Title Page" Alignment="Center">
          <Text>Written by</Text>
        </Paragraph>
        <Paragraph Type="Title Page" Alignment="Center">
          <Text>${escapeXml(project.titlePage.writtenBy || '')}</Text>
        </Paragraph>
      </Content>
    </TitlePage>
`;

  project.lines.forEach(line => {
    const fdxType = typeToFDX[line.type] || 'Action';
    fdx += `    <Paragraph Type="${fdxType}">
      <Text>${escapeXml(line.text)}</Text>
    </Paragraph>
`;
  });

  fdx += `  </Content>
</FinalDraft>`;

  const blob = new Blob([fdx], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'screenplay'}.fdx`;
  a.click();
  URL.revokeObjectURL(url);
}
