import { ScriptLine, LineType, createLine, createProject, Project } from '@/types/screenplay';

/**
 * Detect line type from text content
 */
function detectLineType(text: string, prevType: LineType | null): LineType {
  const trimmed = text.trim();
  if (!trimmed) return 'action';

  // Scene heading patterns
  if (/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s/i.test(trimmed)) return 'scene-heading';

  // Transition patterns
  if (/^(CUT TO:|FADE OUT\.|FADE IN:|DISSOLVE TO:|SMASH CUT TO:|MATCH CUT TO:)$/i.test(trimmed)) return 'transition';
  if (/^.+TO:$/i.test(trimmed) && trimmed === trimmed.toUpperCase()) return 'transition';

  // Parenthetical
  if (/^\(.*\)$/.test(trimmed)) return 'parenthetical';

  // Character name - all caps, short line, not after action
  if (trimmed === trimmed.toUpperCase() && trimmed.length < 50 && /^[A-Z][A-Z\s.'()-]+$/.test(trimmed)) {
    return 'character';
  }

  // Dialogue follows character or parenthetical
  if (prevType === 'character' || prevType === 'parenthetical') return 'dialogue';

  return 'action';
}

/**
 * Parse plain text screenplay content into ScriptLines
 */
export function parseScreenplayText(text: string): ScriptLine[] {
  const rawLines = text.split('\n');
  const lines: ScriptLine[] = [];
  let prevType: LineType | null = null;

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    // Skip completely empty lines but keep structure
    if (!trimmed) {
      // Add empty action line for spacing if previous line exists
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

  // Ensure at least one line
  if (lines.length === 0) {
    lines.push(createLine('action', ''));
  }

  return lines;
}

/**
 * Parse a PDF file - extract text and parse as screenplay
 */
export async function importPDF(file: File): Promise<ScriptLine[]> {
  // Read PDF as text using basic extraction
  const arrayBuffer = await file.arrayBuffer();
  const text = extractTextFromPDFBuffer(arrayBuffer);
  return parseScreenplayText(text);
}

/**
 * Basic PDF text extraction from buffer
 */
function extractTextFromPDFBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // Extract text between stream/endstream markers and decode
  const lines: string[] = [];
  const streamRegex = /stream\s*\n([\s\S]*?)endstream/g;
  let match;
  
  while ((match = streamRegex.exec(text)) !== null) {
    const content = match[1];
    // Extract text from PDF text operators
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

  // If PDF parsing didn't yield much, try to extract any readable text
  if (lines.length < 3) {
    const readableText = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2 && !/^[%<\/\\[\]{}]/.test(l))
      .filter(l => !l.includes('endobj') && !l.includes('startxref'));
    return readableText.join('\n');
  }

  return lines.join('\n');
}

/**
 * Parse .kitsp file (JSON format)
 */
export async function importKITSP(file: File): Promise<Project | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // If it's a full project export
    if (data.lines && Array.isArray(data.lines)) {
      return {
        id: crypto.randomUUID(),
        name: data.name || file.name.replace(/\.kitsp$/, ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        titlePage: data.titlePage || { title: data.name || '', writtenBy: '' },
        lines: data.lines.map((l: any) => ({
          id: l.id || crypto.randomUUID(),
          type: l.type || 'action',
          text: l.text || '',
        })),
        labels: data.labels || [],
        tags: data.tags || [],
        showSceneNumbers: data.showSceneNumbers || false,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse .fountain file format
 */
export function parseFountain(text: string): ScriptLine[] {
  return parseScreenplayText(text);
}

/**
 * Import a file and return parsed lines or project
 */
export async function importFile(file: File): Promise<{ lines?: ScriptLine[]; project?: Project }> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'kitsp') {
    const project = await importKITSP(file);
    if (project) return { project };
    return { lines: [createLine('action', '')] };
  }

  if (ext === 'pdf') {
    const lines = await importPDF(file);
    return { lines };
  }

  // txt, fountain, fdx - treat as plain text
  const text = await file.text();
  const lines = parseScreenplayText(text);
  return { lines };
}
