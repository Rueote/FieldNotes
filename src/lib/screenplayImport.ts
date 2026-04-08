import { ScriptLine, LineType, createLine, Project } from '@/types/screenplay';

function detectLineType(text: string, prevType: LineType | null): LineType {
  const trimmed = text.trim();
  if (!trimmed) return 'action';

  if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s/i.test(trimmed)) return 'scene-heading';
  if (/^(CUT TO:|FADE OUT\.|FADE IN:|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:)$/i.test(trimmed)) return 'transition';
  if (/^.+TO:$/i.test(trimmed) && trimmed === trimmed.toUpperCase()) return 'transition';
  if (/^\(.*\)$/.test(trimmed)) return 'parenthetical';
  if (trimmed === trimmed.toUpperCase() && trimmed.length < 50 && /^[A-Z][A-Z\s.'()-]+$/.test(trimmed)) return 'character';
  if (prevType === 'character' || prevType === 'parenthetical') return 'dialogue';

  return 'action';
}

export function parseScreenplayText(text: string): ScriptLine[] {
  const rawLines = text.split('\n');
  const lines: ScriptLine[] = [];
  let prevType: LineType | null = null;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      if (lines.length > 0 && lines[lines.length - 1].text !== '') {
        lines.push(createLine('action', ''));
        prevType = 'action';
      }
      continue;
    }
    const type = detectLineType(trimmed, prevType);
    lines.push(createLine(type, trimmed));
    prevType = type;
  }

  if (lines.length === 0) lines.push(createLine('action', ''));
  return lines;
}

function fdxTypeToLineType(fdxType: string): LineType {
  switch (fdxType) {
    case 'Scene Heading': return 'scene-heading';
    case 'Action':        return 'action';
    case 'Character':     return 'character';
    case 'Dialogue':      return 'dialogue';
    case 'Parenthetical': return 'parenthetical';
    case 'Transition':    return 'transition';
    default:              return 'action';
  }
}

export function parseFDX(text: string): ScriptLine[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');

  if (doc.querySelector('parsererror')) {
    return parseScreenplayText(text);
  }

  const paragraphs = doc.querySelectorAll('Paragraph');
  const lines: ScriptLine[] = [];

  paragraphs.forEach(para => {
    const fdxType = para.getAttribute('Type') || 'Action';
    const lineType = fdxTypeToLineType(fdxType);

    let content = '';
    para.querySelectorAll('Text').forEach(t => { content += t.textContent || ''; });

    if (!content.trim() && lineType === 'action') return;
    lines.push(createLine(lineType, content.trim()));
  });

  if (lines.length === 0) lines.push(createLine('action', ''));
  return lines;
}

/**
 * Parse a .kitsp file — supports both the full Project shape and
 * a lines-only shape from older exports.
 */
export async function importKITSP(file: File): Promise<Project | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Full project export (has id, name, lines, labels, tags)
    if (data.id && data.lines && Array.isArray(data.lines)) {
      return {
        id: data.id || crypto.randomUUID(),
        name: data.name || file.name.replace(/\.kitsp$/, ''),
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now(),
        titlePage: data.titlePage || { title: data.name || '', writtenBy: '' },
        lines: data.lines.map((l: any) => ({
          id: l.id || crypto.randomUUID(),
          type: (l.type as LineType) || 'action',
          text: l.text || '',
        })),
        labels: Array.isArray(data.labels) ? data.labels : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        showSceneNumbers: data.showSceneNumbers ?? false,
      };
    }

    // Lines-only shape
    if (Array.isArray(data.lines)) {
      return {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.kitsp$/, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        titlePage: { title: file.name.replace(/\.kitsp$/, ''), writtenBy: '' },
        lines: data.lines.map((l: any) => ({
          id: l.id || crypto.randomUUID(),
          type: (l.type as LineType) || 'action',
          text: l.text || '',
        })),
        labels: [],
        tags: [],
        showSceneNumbers: false,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function importPDF(file: File): Promise<ScriptLine[]> {
  const arrayBuffer = await file.arrayBuffer();
  const text = extractTextFromPDFBuffer(arrayBuffer);
  return parseScreenplayText(text);
}

function extractTextFromPDFBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const lines: string[] = [];
  const streamRegex = /stream\s*\n([\s\S]*?)endstream/g;
  let match;

  while ((match = streamRegex.exec(text)) !== null) {
    const content = match[1];
    const textOps = content.match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g);
    if (textOps) {
      for (const op of textOps) {
        const textMatch = op.match(/\((.*?)\)/g);
        if (textMatch) {
          const lineText = textMatch.map(t => t.slice(1, -1)).join('');
          if (lineText.trim()) lines.push(lineText);
        }
      }
    }
  }

  if (lines.length < 3) {
    return text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2 && !/^[%<\/\\[\]{}]/.test(l))
      .filter(l => !l.includes('endobj') && !l.includes('startxref'))
      .join('\n');
  }

  return lines.join('\n');
}

export async function importFile(file: File): Promise<{ lines?: ScriptLine[]; project?: Project }> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'kitsp') {
    const project = await importKITSP(file);
    if (project) return { project };
    return { lines: [createLine('action', '')] };
  }

  if (ext === 'fdx') {
    const text = await file.text();
    return { lines: parseFDX(text) };
  }

  if (ext === 'pdf') {
    return { lines: await importPDF(file) };
  }

  // txt, fountain
  const text = await file.text();
  return { lines: parseScreenplayText(text) };
}
