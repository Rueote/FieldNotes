import { jsPDF } from 'jspdf';
import { Project, ScriptLine, TitlePage } from '@/types/screenplay';

// ── Page geometry ──────────────────────────────────────────────────────────────
const COURIER   = 'Courier';
const FONT_SIZE = 12;
const PAGE_W    = 8.5;
const PAGE_H    = 11;
const MARGIN_L  = 1.5;
const MARGIN_R  = 1.0;
const MARGIN_T  = 1.0;
const MARGIN_B  = 1.0;
const LH        = 12; // 12pt Courier single-spaced

const inPt = (inches: number) => inches * 72;

function colMetrics(type: string): { left: number; right: number } {
  switch (type) {
    case 'character':     return { left: 3.7, right: 1.0 };
    case 'parenthetical': return { left: 3.1, right: 2.0 };
    case 'dialogue':      return { left: 2.5, right: 2.5 };
    default:              return { left: MARGIN_L, right: MARGIN_R };
  }
}

function spacesBefore(type: string, prevType: string | null): number {
  if (prevType === null) return 0;
  if (type === 'scene-heading') return 1;
  if (type === 'transition')    return 1;
  if (type === 'character')     return 1;
  if (type === 'action') {
    if (prevType === 'scene-heading') return 0;
    return 1;
  }
  if (type === 'lyrics') return 1;
  return 0;
}

function addTitlePage(doc: jsPDF, tp: TitlePage) {
  const cx = PAGE_W / 2;
  doc.setFont(COURIER, 'normal');
  doc.setFontSize(FONT_SIZE);

  const titleText = (tp.title || 'Untitled').toUpperCase();
  const titleY    = 4.3;

  doc.setFont(COURIER, 'bold');
  doc.setFontSize(FONT_SIZE);

  const titleWidth = doc.getTextWidth(titleText);
  const titleXpt   = inPt(cx) - titleWidth / 2;
  const titleYpt   = inPt(titleY);

  doc.text(titleText, inPt(cx), titleYpt, { align: 'center' });
  doc.setLineWidth(0.75);
  doc.line(titleXpt, titleYpt + 2, titleXpt + titleWidth, titleYpt + 2);

  doc.setFont(COURIER, 'normal');

  let infoY = titleY + 0.35;
  if (tp.genre) {
    doc.text(tp.genre, inPt(cx), inPt(infoY), { align: 'center' });
    infoY += 0.25;
  }
  if (tp.writtenBy) {
    doc.text(tp.writtenBy, inPt(cx), inPt(infoY), { align: 'center' });
    infoY += 0.25;
  }
  if (tp.additional) {
    doc.text(tp.additional, inPt(cx), inPt(infoY), { align: 'center' });
  }
  if (tp.contact) {
    let cy = 8.75;
    tp.contact.split('\n').forEach(l => {
      doc.text(l, inPt(MARGIN_L), inPt(cy));
      cy += 0.2;
    });
  }
  if (tp.year) {
    doc.text(tp.year, inPt(cx), inPt(10.2), { align: 'center' });
  }
}

// ── PDF export ─────────────────────────────────────────────────────────────────
export function exportToPDF(project: Project): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  doc.setFont(COURIER, 'normal');
  doc.setFontSize(FONT_SIZE);

  addTitlePage(doc, project.titlePage);
  doc.addPage();

  const maxY = inPt(PAGE_H - MARGIN_B);
  let y      = inPt(MARGIN_T);
  let prevType: string | null = null;

  const printable = project.lines.filter(l => l.text.trim() && l.type !== 'non-printable');

  for (let i = 0; i < printable.length; i++) {
    const line = printable[i];
    const text = line.text.trim();
    const { left, right } = colMetrics(line.type);
    const maxWidth  = inPt(PAGE_W - left - right);
    const isUpper   = line.type === 'scene-heading' || line.type === 'character' || line.type === 'transition';
    const displayText = isUpper ? text.toUpperCase() : text;
    const blanks    = spacesBefore(line.type, prevType);
    const isBold    = line.type === 'scene-heading';

    doc.setFont(COURIER, isBold ? 'bold' : 'normal');
    const wrapped   = doc.splitTextToSize(displayText, maxWidth);
    const spaceNeeded = (blanks + wrapped.length) * LH;

    if (line.type === 'scene-heading') {
      const remainingAfter = maxY - (y + spaceNeeded);
      if (y + spaceNeeded > maxY || remainingAfter < LH * 3) {
        doc.addPage(); y = inPt(MARGIN_T);
      } else { y += blanks * LH; }
    } else if (line.type === 'character') {
      const nextLine    = printable[i + 1];
      const nextMetrics = colMetrics(nextLine?.type || 'action');
      const nextWrapped = nextLine
        ? doc.splitTextToSize(nextLine.text.trim(), inPt(PAGE_W - nextMetrics.left - nextMetrics.right))
        : [];
      const needed = (blanks + wrapped.length + (nextWrapped.length || 1)) * LH;
      if (y + needed > maxY) {
        doc.addPage(); y = inPt(MARGIN_T);
      } else { y += blanks * LH; }
    } else {
      if (y + spaceNeeded > maxY) {
        doc.addPage(); y = inPt(MARGIN_T);
      } else { y += blanks * LH; }
    }

    doc.setFont(COURIER, isBold ? 'bold' : 'normal');
    wrapped.forEach((wl: string) => {
      if (y + LH > maxY) {
        doc.addPage(); y = inPt(MARGIN_T);
        doc.setFont(COURIER, isBold ? 'bold' : 'normal');
      }
      if (line.type === 'transition') {
        doc.text(wl, inPt(PAGE_W - MARGIN_R), y, { align: 'right' });
      } else {
        doc.text(wl, inPt(left), y);
      }
      y += LH;
    });

    doc.setFont(COURIER, 'normal');
    prevType = line.type;
  }

  doc.save(`${project.name || 'screenplay'}.pdf`);
}

// ── Render to jsPDF instance (for preview) ─────────────────────────────────────
export function renderToPDF(project: Project): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  doc.setFont(COURIER, 'normal');
  doc.setFontSize(FONT_SIZE);

  addTitlePage(doc, project.titlePage);
  doc.addPage();

  const maxY = inPt(PAGE_H - MARGIN_B);
  let y      = inPt(MARGIN_T);
  let prevType: string | null = null;

  const printable = project.lines.filter(l => l.text.trim() && l.type !== 'non-printable');

  for (let i = 0; i < printable.length; i++) {
    const line = printable[i];
    const text = line.text.trim();
    const { left, right } = colMetrics(line.type);
    const maxWidth    = inPt(PAGE_W - left - right);
    const isUpper     = line.type === 'scene-heading' || line.type === 'character' || line.type === 'transition';
    const displayText = isUpper ? text.toUpperCase() : text;
    const blanks      = spacesBefore(line.type, prevType);
    const isBold      = line.type === 'scene-heading';

    doc.setFont(COURIER, isBold ? 'bold' : 'normal');
    const wrapped     = doc.splitTextToSize(displayText, maxWidth);
    const spaceNeeded = (blanks + wrapped.length) * LH;

    if (line.type === 'scene-heading') {
      const remainingAfter = maxY - (y + spaceNeeded);
      if (y + spaceNeeded > maxY || remainingAfter < LH * 3) {
        doc.addPage(); y = inPt(MARGIN_T);
      } else { y += blanks * LH; }
    } else if (line.type === 'character') {
      const nextLine    = printable[i + 1];
      const nextMetrics = colMetrics(nextLine?.type || 'action');
      const nextWrapped = nextLine
        ? doc.splitTextToSize(nextLine.text.trim(), inPt(PAGE_W - nextMetrics.left - nextMetrics.right))
        : [];
      const needed = (blanks + wrapped.length + (nextWrapped.length || 1)) * LH;
      if (y + needed > maxY) {
        doc.addPage(); y = inPt(MARGIN_T);
      } else { y += blanks * LH; }
    } else {
      if (y + spaceNeeded > maxY) {
        doc.addPage(); y = inPt(MARGIN_T);
      } else { y += blanks * LH; }
    }

    doc.setFont(COURIER, isBold ? 'bold' : 'normal');
    wrapped.forEach((wl: string) => {
      if (y + LH > maxY) {
        doc.addPage(); y = inPt(MARGIN_T);
        doc.setFont(COURIER, isBold ? 'bold' : 'normal');
      }
      if (line.type === 'transition') {
        doc.text(wl, inPt(PAGE_W - MARGIN_R), y, { align: 'right' });
      } else {
        doc.text(wl, inPt(left), y);
      }
      y += LH;
    });

    doc.setFont(COURIER, 'normal');
    prevType = line.type;
  }

  return doc;
}

// ── FDX export ─────────────────────────────────────────────────────────────────
export function exportToFDX(project: Project): void {
  const typeToFDX: Record<string, string> = {
    'scene-heading': 'Scene Heading', 'action': 'Action', 'character': 'Character',
    'dialogue': 'Dialogue', 'parenthetical': 'Parenthetical', 'transition': 'Transition',
    'lyrics': 'Action', 'non-printable': 'Action',
  };
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let fdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="5">
  <Content>
    <TitlePage>
      <Content>
        <Paragraph Type="Title Page" Alignment="Center"><Text>${esc(project.titlePage.title||'')}</Text></Paragraph>
        <Paragraph Type="Title Page" Alignment="Center"><Text>${esc(project.titlePage.writtenBy||'')}</Text></Paragraph>
      </Content>
    </TitlePage>
`;
  project.lines.filter(l => l.type !== 'non-printable').forEach(line => {
    fdx += `    <Paragraph Type="${typeToFDX[line.type]||'Action'}"><Text>${esc(line.text)}</Text></Paragraph>\n`;
  });
  fdx += `  </Content>\n</FinalDraft>`;

  const blob = new Blob([fdx], { type: 'application/xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${project.name||'screenplay'}.fdx`; a.click();
  URL.revokeObjectURL(url);
}

// ── Fountain export ────────────────────────────────────────────────────────────
// Fountain is plain text with specific formatting conventions
export function exportToFountain(project: Project): void {
  const tp = project.titlePage;
  const lines: string[] = [];

  // Title page metadata block
  if (tp.title)     lines.push(`Title: ${tp.title}`);
  if (tp.writtenBy) lines.push(`Author: ${tp.writtenBy}`);
  if (tp.genre)     lines.push(`Draft date: ${tp.year || ''}`);
  if (tp.contact)   lines.push(`Contact: ${tp.contact.replace(/\n/g, ', ')}`);
  lines.push(''); // blank line ends title block

  let prevType: string | null = null;

  project.lines
    .filter(l => l.type !== 'non-printable')
    .forEach(line => {
      const text = line.text.trim();
      if (!text) return;

      // Add blank line between elements where needed (same logic as PDF)
      const blanks = spacesBefore(line.type, prevType);
      for (let b = 0; b < blanks; b++) lines.push('');

      switch (line.type) {
        case 'scene-heading':
          // Fountain scene headings must start with INT./EXT. or be prefixed with .
          lines.push(text.toUpperCase().startsWith('INT') || text.toUpperCase().startsWith('EXT')
            ? text.toUpperCase()
            : '.' + text.toUpperCase());
          break;
        case 'action':
          lines.push(text);
          break;
        case 'character':
          lines.push(text.toUpperCase());
          break;
        case 'dialogue':
          lines.push(text);
          break;
        case 'parenthetical':
          lines.push(text.startsWith('(') ? text : `(${text})`);
          break;
        case 'transition':
          lines.push(`> ${text.toUpperCase()}`);
          break;
        case 'lyrics':
          lines.push(`~${text}`);
          break;
        default:
          lines.push(text);
      }

      prevType = line.type;
    });

  const content = lines.join('\n');
  const blob    = new Blob([content], { type: 'text/plain' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href = url; a.download = `${project.name||'screenplay'}.fountain`; a.click();
  URL.revokeObjectURL(url);
}

// ── DOCX export ────────────────────────────────────────────────────────────────
// Builds a minimal DOCX (Office Open XML) without any external library.
// Uses Courier New 12pt with proper margins and paragraph spacing.
export function exportToDOCX(project: Project): void {
  const tp = project.titlePage;

  // DOCX twips conversion (1 inch = 1440 twips)
  const twips = (inches: number) => Math.round(inches * 1440);

  const esc = (s: string) =>
    s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // Build a paragraph XML element
  const para = (text: string, opts: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    align?: 'left'|'center'|'right';
    indent?: number;   // left indent in inches
    rightIndent?: number;
    spaceBefore?: number; // space before in twips
    fontSize?: number; // half-points
    allCaps?: boolean;
  } = {}) => {
    const {
      bold = false, italic = false, underline = false,
      align = 'left', indent = 0, rightIndent = 0,
      spaceBefore = 0, fontSize = 24, allCaps = false,
    } = opts;

    const pPr = `<w:pPr>
        <w:jc w:val="${align}"/>
        <w:ind w:left="${twips(indent)}" w:right="${twips(rightIndent)}"/>
        <w:spacing w:before="${spaceBefore}" w:line="240" w:lineRule="exact"/>
      </w:pPr>`;

    const rPr = `<w:rPr>
        <w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>
        <w:sz w:val="${fontSize}"/>
        <w:szCs w:val="${fontSize}"/>
        ${bold ? '<w:b/><w:bCs/>' : ''}
        ${italic ? '<w:i/><w:iCs/>' : ''}
        ${underline ? '<w:u w:val="single"/>' : ''}
        ${allCaps ? '<w:caps/>' : ''}
      </w:rPr>`;

    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
  };

  const paras: string[] = [];

  // ── Title page ──
  paras.push(para('', {})); // spacer
  paras.push(para('', {}));
  paras.push(para('', {}));
  paras.push(para('', {}));
  paras.push(para((tp.title || 'Untitled').toUpperCase(), {
    bold: true, underline: true, align: 'center', fontSize: 24,
  }));
  if (tp.genre) paras.push(para(tp.genre, { align: 'center' }));
  if (tp.writtenBy) paras.push(para(tp.writtenBy, { align: 'center' }));
  if (tp.additional) paras.push(para(tp.additional, { align: 'center' }));

  // Page break
  paras.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);

  // ── Script lines ──
  let prevType: string | null = null;
  const SPACE_BEFORE = twips(1/6); // one blank line ≈ 1/6 inch at 12pt

  project.lines
    .filter(l => l.type !== 'non-printable')
    .forEach(line => {
      const text = line.text.trim();
      if (!text) return;

      const blanks = spacesBefore(line.type, prevType);
      const sbPt   = blanks > 0 ? SPACE_BEFORE : 0;

      switch (line.type) {
        case 'scene-heading':
          paras.push(para(text.toUpperCase(), { bold: true, spaceBefore: SPACE_BEFORE }));
          break;
        case 'action':
          paras.push(para(text, { spaceBefore: sbPt }));
          break;
        case 'character':
          paras.push(para(text.toUpperCase(), { indent: 2.2, spaceBefore: SPACE_BEFORE }));
          break;
        case 'dialogue':
          paras.push(para(text, { indent: 1.5, rightIndent: 1.5 }));
          break;
        case 'parenthetical':
          paras.push(para(text.startsWith('(') ? text : `(${text})`, { indent: 1.7, rightIndent: 2.0 }));
          break;
        case 'transition':
          paras.push(para(text.toUpperCase(), { align: 'right', spaceBefore: SPACE_BEFORE }));
          break;
        case 'lyrics':
          paras.push(para(text, { italic: true, spaceBefore: SPACE_BEFORE }));
          break;
        default:
          paras.push(para(text, { spaceBefore: sbPt }));
      }

      prevType = line.type;
    });

  // ── Assemble DOCX XML ──
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:sectPr>
      <w:pgSz w:w="${twips(8.5)}" w:h="${twips(11)}"/>
      <w:pgMar w:top="${twips(1)}" w:right="${twips(1)}" w:bottom="${twips(1)}" w:left="${twips(1.5)}"/>
    </w:sectPr>
    ${paras.join('\n    ')}
  </w:body>
</w:document>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

  // Pack into a ZIP (DOCX is a ZIP file)
  // We use a minimal ZIP builder without external deps
  const files: { name: string; content: string }[] = [
    { name: '[Content_Types].xml',    content: contentTypesXml },
    { name: '_rels/.rels',            content: relsXml },
    { name: 'word/document.xml',      content: docXml },
    { name: 'word/_rels/document.xml.rels', content: wordRelsXml },
  ];

  const zip = buildZip(files);
  const blob = new Blob([zip], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${project.name||'screenplay'}.docx`; a.click();
  URL.revokeObjectURL(url);
}

// ── Minimal ZIP builder ────────────────────────────────────────────────────────
function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const crc32Table = makeCrc32Table();

  interface LocalEntry { header: Uint8Array; data: Uint8Array; offset: number; name: Uint8Array; crc: number; }
  const entries: LocalEntry[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data      = encoder.encode(file.content);
    const crc       = crc32(crc32Table, data);
    const modTime   = 0x0000;
    const modDate   = 0x0000;

    // Local file header
    const header = new Uint8Array(30 + nameBytes.length);
    const hv     = new DataView(header.buffer);
    hv.setUint32(0,  0x504B0304, false); // signature
    hv.setUint16(4,  20, true);           // version needed
    hv.setUint16(6,  0,  true);           // flags
    hv.setUint16(8,  0,  true);           // compression (stored)
    hv.setUint16(10, modTime, true);
    hv.setUint16(12, modDate, true);
    hv.setUint32(14, crc >>> 0, true);
    hv.setUint32(18, data.length, true);
    hv.setUint32(22, data.length, true);
    hv.setUint16(26, nameBytes.length, true);
    hv.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    entries.push({ header, data, offset, name: nameBytes, crc });
    offset += header.length + data.length;
  }

  // Central directory
  const cdEntries: Uint8Array[] = [];
  for (const e of entries) {
    const cd  = new Uint8Array(46 + e.name.length);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0,  0x504B0102, false);
    cdv.setUint16(4,  20, true);
    cdv.setUint16(6,  20, true);
    cdv.setUint16(8,  0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, e.crc >>> 0, true);
    cdv.setUint32(20, e.data.length, true);
    cdv.setUint32(24, e.data.length, true);
    cdv.setUint16(28, e.name.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, e.offset, true);
    cd.set(e.name, 46);
    cdEntries.push(cd);
  }

  const cdSize   = cdEntries.reduce((s, c) => s + c.length, 0);
  const cdOffset = offset;

  // End of central directory
  const eocd  = new Uint8Array(22);
  const eocdv = new DataView(eocd.buffer);
  eocdv.setUint32(0,  0x504B0506, false);
  eocdv.setUint16(4,  0, true);
  eocdv.setUint16(6,  0, true);
  eocdv.setUint16(8,  entries.length, true);
  eocdv.setUint16(10, entries.length, true);
  eocdv.setUint32(12, cdSize, true);
  eocdv.setUint32(16, cdOffset, true);
  eocdv.setUint16(20, 0, true);

  // Concatenate everything
  const totalSize = offset + cdSize + eocd.length;
  const result    = new Uint8Array(totalSize);
  let pos         = 0;
  for (const e of entries) {
    result.set(e.header, pos); pos += e.header.length;
    result.set(e.data,   pos); pos += e.data.length;
  }
  for (const cd of cdEntries) { result.set(cd, pos); pos += cd.length; }
  result.set(eocd, pos);

  return result;
}

function makeCrc32Table(): Uint32Array {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
}

function crc32(table: Uint32Array, data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) crc = table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
