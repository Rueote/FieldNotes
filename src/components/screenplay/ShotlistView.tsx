import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Shot, ShotColumn, ShotColumnId, ScriptLine, getScenes } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Settings2, Download, MapPin, Clock, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShotlistViewProps {
  lines: ScriptLine[];
  shots: Shot[];
  shotColumns: ShotColumn[];
  onAddShot: (sceneNumber: number) => void;
  onUpdateShot: (shotId: string, updates: Partial<Shot>) => void;
  onRemoveShot: (shotId: string) => void;
  onUpdateColumns: (columns: ShotColumn[]) => void;
}

const SUGGESTIONS: Partial<Record<ShotColumnId, string[]>> = {
  shotType:  ['WS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'POV', 'Insert', 'Aerial', 'Two Shot'],
  movement:  ['Static', 'Pan', 'Tilt', 'Dolly', 'Track', 'Handheld', 'Steadicam', 'Crane', 'Drone', 'Zoom'],
  intExt:    ['INT.', 'EXT.', 'INT./EXT.'],
  timeOfDay: ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'CONTINUOUS', 'LATER'],
};

const ALL_COLUMN_DEFS: { id: ShotColumnId; label: string }[] = [
  { id: 'scene',       label: 'Scene'             },
  { id: 'shot',        label: 'Shot'              },
  { id: 'description', label: 'Shot Description'  },
  { id: 'movement',    label: 'Movement'          },
  { id: 'shotType',    label: 'Shot Type'         },
  { id: 'lens',        label: 'Lens'              },
  { id: 'equipment',   label: 'Special Equipment' },
  { id: 'intExt',      label: 'Int/Ext'           },
  { id: 'timeOfDay',   label: 'Time of Day'       },
  { id: 'notes',       label: 'Notes'             },
];

const MIN_COL_WIDTH = 50;

function getCellValue(shot: Shot, id: ShotColumnId): string {
  switch (id) {
    case 'scene':       return String(shot.sceneNumber);
    case 'shot':        return String(shot.shotNumber);
    case 'description': return shot.description;
    case 'movement':    return shot.movement;
    case 'shotType':    return shot.shotType;
    case 'lens':        return shot.lens;
    case 'equipment':   return shot.equipment;
    case 'intExt':      return shot.intExt;
    case 'timeOfDay':   return shot.timeOfDay;
    case 'notes':       return shot.notes;
    default:            return '';
  }
}

function toShotField(id: ShotColumnId, value: string): Partial<Shot> {
  switch (id) {
    case 'description': return { description: value };
    case 'movement':    return { movement: value };
    case 'shotType':    return { shotType: value };
    case 'lens':        return { lens: value };
    case 'equipment':   return { equipment: value };
    case 'intExt':      return { intExt: value };
    case 'timeOfDay':   return { timeOfDay: value };
    case 'notes':       return { notes: value };
    default:            return {};
  }
}

// ── Editable cell ─────────────────────────────────────────────────────────────
function Cell({ value, onChange, suggestions, width, readOnly }: {
  value: string;
  onChange?: (v: string) => void;
  suggestions?: string[];
  width: number;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const [showSug, setShowSug] = useState(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = useCallback((v: string) => {
    setEditing(false);
    setShowSug(false);
    if (v !== value) onChange?.(v);
  }, [value, onChange]);

  const filtered = suggestions
    ? draft.trim()
      ? suggestions.filter(s => s.toLowerCase().startsWith(draft.toLowerCase()) && s.toLowerCase() !== draft.toLowerCase())
      : suggestions
    : [];

  // Key: width is set ONLY via inline style on the td. No minWidth/maxWidth fighting the table.
  const tdStyle: React.CSSProperties = { width, overflow: 'hidden' };

  if (readOnly) {
    return (
      <td className="px-2 py-1.5 text-xs border-r border-border font-mono text-muted-foreground" style={tdStyle}>
        {value}
      </td>
    );
  }

  return (
    <td className="p-0 border-r border-border relative" style={tdStyle}>
      {editing ? (
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={e => { setDraft(e.target.value); setShowSug(true); }}
          onBlur={() => setTimeout(() => commit(draft), 150)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commit(draft); }
            if (e.key === 'Escape') { setDraft(value); commit(value); }
          }}
          className="w-full px-2 py-1.5 text-xs outline-none border-0 block bg-transparent"
        />
      ) : (
        <div
          className="px-2 py-1.5 text-xs cursor-text hover:bg-white/5 transition-colors min-h-[28px]"
          onClick={() => { setDraft(value); setEditing(true); setShowSug(true); }}
        >
          <span className={cn('block truncate', !value && 'opacity-25')}>{value || '—'}</span>
        </div>
      )}
      {editing && showSug && filtered.length > 0 && (
        <div
          className="absolute left-0 top-full z-50 rounded shadow-lg py-1 border bg-popover"
          onMouseDown={e => e.preventDefault()}
          style={{ minWidth: Math.max(width, 130) }}
        >
          {filtered.map(s => (
            <button key={s} className="w-full text-left px-3 py-1 text-xs hover:bg-accent block"
              onClick={() => { setDraft(s); commit(s); }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </td>
  );
}

// ── Resizable column header ───────────────────────────────────────────────────
// ONLY this column's width changes. Pointer capture keeps tracking on cursor.
function ResizableTh({ col, onResize }: {
  col: ShotColumn;
  onResize: (id: ShotColumnId, newWidth: number) => void;
}) {
  const dragging = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(0);
  const gripRef  = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const next = Math.max(MIN_COL_WIDTH, startW.current + (e.clientX - startX.current));
    onResize(col.id, next);
  }, [col.id, onResize]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    gripRef.current?.releasePointerCapture(e.pointerId);
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = col.width;
    gripRef.current?.setPointerCapture(e.pointerId);
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [col.width]);

  useEffect(() => {
    const grip = gripRef.current;
    if (!grip) return;
    grip.addEventListener('pointermove', onPointerMove);
    grip.addEventListener('pointerup',   onPointerUp);
    return () => {
      grip.removeEventListener('pointermove', onPointerMove);
      grip.removeEventListener('pointerup',   onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <th
      className="px-2 py-2 text-left text-xs font-semibold border-r border-border relative select-none"
      style={{ width: col.width }}  // width here just sets the header cell; table auto handles column
    >
      <span className="block truncate pr-2">{col.label}</span>
      <div ref={gripRef} onPointerDown={onPointerDown}
        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group">
        <div className="absolute right-0 top-2 bottom-2 w-[2px] rounded opacity-0 group-hover:opacity-100 bg-[#4d9fff] transition-opacity" />
      </div>
    </th>
  );
}

// ── Scene sidebar ─────────────────────────────────────────────────────────────
function SceneSidebar({ scenes, shots, selectedScene, onSelect, isOpen, onToggle }: {
  scenes: ReturnType<typeof getScenes>;
  shots: Shot[];
  selectedScene: number | null;
  onSelect: (n: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (!isOpen) {
    return (
      <div className="shrink-0 border-r border-border bg-sidebar flex flex-col items-center py-2">
        <Button variant="ghost" size="sm" onClick={onToggle} title="Open scene list" className="w-8 h-8 p-0">
          <PanelLeft className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-[220px] shrink-0 border-r border-border bg-sidebar flex flex-col">
      <div className="h-10 flex items-center justify-between px-3 border-b border-sidebar-border shrink-0">
        <span className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider">Scenes</span>
        <Button variant="ghost" size="sm" onClick={onToggle} className="w-7 h-7 p-0 text-sidebar-foreground">
          <PanelLeftClose className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between gap-2',
              selectedScene === null
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'hover:bg-sidebar-accent text-sidebar-foreground'
            )}
          >
            <span className="text-xs font-semibold">All Scenes</span>
            <span className="text-[10px] opacity-60">{shots.length} shots</span>
          </button>
          <div className="h-px bg-sidebar-border my-1" />
          {scenes.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">No scenes yet.</p>
          )}
          {scenes.map(scene => {
            const count  = shots.filter(s => s.sceneNumber === scene.number).length;
            const active = selectedScene === scene.number;
            return (
              <button key={scene.number} onClick={() => onSelect(scene.number)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-md transition-colors',
                  active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'hover:bg-sidebar-accent'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                    active ? 'bg-white/20 text-white' : 'bg-sidebar-accent text-sidebar-primary')}>
                    {scene.number}
                  </span>
                  {scene.intExt && (
                    <span className={cn('text-[10px] font-medium uppercase', active ? 'text-white/70' : 'text-muted-foreground')}>
                      {scene.intExt}
                    </span>
                  )}
                  <span className={cn('text-[10px] ml-auto shrink-0', active ? 'text-white/60' : 'text-muted-foreground')}>
                    {count} shot{count !== 1 ? 's' : ''}
                  </span>
                </div>
                {scene.location && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className={cn('w-3 h-3 shrink-0', active ? 'text-white/60' : 'text-muted-foreground')} />
                    <span className={cn('text-xs font-medium truncate', active ? 'text-white/90' : 'text-sidebar-foreground')}>
                      {scene.location}
                    </span>
                  </div>
                )}
                {scene.timeOfDay && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className={cn('w-3 h-3 shrink-0', active ? 'text-white/50' : 'text-muted-foreground')} />
                    <span className={cn('text-[11px]', active ? 'text-white/70' : 'text-muted-foreground')}>
                      {scene.timeOfDay}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ShotlistView({
  lines, shots, shotColumns,
  onAddShot, onUpdateShot, onRemoveShot, onUpdateColumns,
}: ShotlistViewProps) {
  const scenes  = useMemo(() => getScenes(lines), [lines]);
  const enabled = shotColumns.filter(c => c.enabled);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(true);

  const visibleScenes  = useMemo(() =>
    selectedScene === null ? scenes : scenes.filter(s => s.number === selectedScene),
    [scenes, selectedScene]
  );

  // Hide Scene# col when looking at a single scene — it's redundant
  const visibleEnabled = selectedScene === null
    ? enabled
    : enabled.filter(c => c.id !== 'scene');

  const toggleCol = (id: ShotColumnId) =>
    onUpdateColumns(shotColumns.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));

  // Resize ONLY the target column. No clamping against container — let the table scroll.
  const resizeCol = useCallback((id: ShotColumnId, newWidth: number) => {
    onUpdateColumns(shotColumns.map(c =>
      c.id === id ? { ...c, width: Math.max(MIN_COL_WIDTH, newWidth) } : c
    ));
  }, [shotColumns, onUpdateColumns]);

  const exportCSV = () => {
    const exportShots = selectedScene === null ? shots : shots.filter(s => s.sceneNumber === selectedScene);
    const headers = enabled.map(c => `"${c.label}"`).join(',');
    const rows    = exportShots.map(s => enabled.map(col => `"${getCellValue(s, col.id).replace(/"/g, '""')}"`).join(','));
    const blob    = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = selectedScene ? `scene-${selectedScene}-shots.csv` : 'shotlist.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const visibleShotCount = selectedScene === null
    ? shots.length
    : shots.filter(s => s.sceneNumber === selectedScene).length;

  // Table is exactly as wide as its columns — overflows and scrolls, never redistributes
  const tableWidth = visibleEnabled.reduce((s, c) => s + c.width, 0) + 40 + 32;

  return (
    <div className="flex-1 overflow-hidden flex flex-row bg-editor-bg">

      <SceneSidebar
        scenes={scenes} shots={shots}
        selectedScene={selectedScene} onSelect={setSelectedScene}
        isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)}
      />

      <div className="flex-1 overflow-hidden flex flex-col min-w-0">

        {/* Toolbar */}
        <div className="h-10 bg-toolbar-bg border-b border-border flex items-center px-4 gap-2 shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {selectedScene === null ? 'All Scenes' : `Scene ${selectedScene}`}
          </span>
          <span className="text-xs text-muted-foreground">
            · {visibleShotCount} shot{visibleShotCount !== 1 ? 's' : ''}
          </span>
          <div className="ml-auto flex gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  <Settings2 className="w-3.5 h-3.5" />Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52">
                <p className="text-xs font-semibold mb-3">Toggle columns</p>
                <div className="space-y-2">
                  {ALL_COLUMN_DEFS.map(col => {
                    const isCore = col.id === 'scene' || col.id === 'shot';
                    const cur    = shotColumns.find(c => c.id === col.id);
                    return (
                      <label key={col.id} className={cn('flex items-center gap-2 text-xs cursor-pointer', isCore && 'opacity-40 cursor-not-allowed')}>
                        <input type="checkbox" checked={cur?.enabled ?? false} disabled={isCore}
                          onChange={() => !isCore && toggleCol(col.id)} />
                        {col.label}
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" />CSV
            </Button>
          </div>
        </div>

        {/* Table — scrolls horizontally, columns never redistribute */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {visibleScenes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Add scene headings to your script to start building your shot list.
            </div>
          ) : (
            <table
              className="border-collapse text-xs"
              style={{
                tableLayout: 'fixed',
                width: tableWidth,     // exact pixel width — never stretches
                minWidth: 'unset',     // critical: don't let it grow to fill container
              }}
            >
              <colgroup>
                <col style={{ width: 40 }} />
                {visibleEnabled.map(col => (
                  <col key={col.id} style={{ width: col.width }} />
                ))}
                <col style={{ width: 32 }} />
              </colgroup>
              <thead className="sticky top-0 z-20 bg-toolbar-bg border-b border-border">
                <tr>
                  <th className="w-10 border-r border-border" />
                  {visibleEnabled.map(col => (
                    <ResizableTh key={col.id} col={col} onResize={resizeCol} />
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {visibleScenes.map(scene => {
                  const sceneShots = shots
                    .filter(s => s.sceneNumber === scene.number)
                    .sort((a, b) => a.shotNumber - b.shotNumber);

                  return (
                    <>
                      {selectedScene === null && (
                        <tr key={`hdr-${scene.number}`} className="border-b border-border bg-muted/30">
                          <td className="w-10 border-r border-border" />
                          <td colSpan={visibleEnabled.length + 1} className="px-3 py-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-2">
                              Scene {scene.number}
                            </span>
                            <span className="text-xs font-medium">{scene.heading}</span>
                            <span className="text-[10px] text-muted-foreground ml-3">
                              {sceneShots.length} shot{sceneShots.length !== 1 ? 's' : ''}
                            </span>
                          </td>
                        </tr>
                      )}

                      {sceneShots.map(shot => (
                        <tr key={shot.id} className="border-b border-border hover:bg-white/3 group transition-colors">
                          <td className="w-10 border-r border-border" />
                          {visibleEnabled.map(col => (
                            <Cell
                              key={col.id}
                              value={getCellValue(shot, col.id)}
                              onChange={v => onUpdateShot(shot.id, toShotField(col.id, v))}
                              suggestions={SUGGESTIONS[col.id]}
                              width={col.width}
                              readOnly={col.id === 'scene' || col.id === 'shot'}
                            />
                          ))}
                          <td className="w-8 text-center border-l border-border">
                            <button onClick={() => onRemoveShot(shot.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1 rounded">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}

                      <tr key={`add-${scene.number}`} className="border-b border-border">
                        <td className="w-10 border-r border-border" />
                        <td colSpan={visibleEnabled.length + 1} className="px-3 py-1.5">
                          <button onClick={() => onAddShot(scene.number)}
                            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                            <Plus className="w-3 h-3" />Add shot
                          </button>
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
