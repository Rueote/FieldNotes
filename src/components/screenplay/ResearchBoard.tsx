import { useState, useRef, useCallback, useEffect } from 'react';
import { Project } from '@/types/screenplay';
import { Plus, Folder, FileText, Link, Image, Square, Trash2 } from 'lucide-react';

interface BoardItem {
  id: string;
  type: 'note' | 'folder' | 'link' | 'image' | 'section';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  url?: string;
  imageSrc?: string;
}

const NOTE_COLORS = [
  { cls: '#1e2030', dot: '#3a3a55', label: 'Default' },
  { cls: '#1a2820', dot: '#2d5a3d', label: 'Green' },
  { cls: '#2a1a1a', dot: '#5a2d2d', label: 'Red' },
  { cls: '#1a1e2a', dot: '#2d3d5a', label: 'Blue' },
  { cls: '#26211a', dot: '#5a4a2d', label: 'Amber' },
];

const SIDEBAR_TOOLS = [
  { type: 'note' as const, label: 'Note', icon: FileText },
  { type: 'folder' as const, label: 'Folder', icon: Folder },
  { type: 'link' as const, label: 'Link', icon: Link },
  { type: 'image' as const, label: 'Image', icon: Image },
  { type: 'section' as const, label: 'Section', icon: Square },
];

function makeItem(type: BoardItem['type'], x: number, y: number): BoardItem {
  const id = crypto.randomUUID();
  const defaults: Record<BoardItem['type'], Partial<BoardItem>> = {
    note:    { width: 220, height: 160, color: NOTE_COLORS[0].cls, title: '', content: '' },
    folder:  { width: 220, height: 140, color: '#1e2030', title: 'New Folder', content: '' },
    link:    { width: 240, height: 80,  color: '#1a1e2a', title: '', content: '', url: '' },
    image:   { width: 200, height: 160, color: '#111118', title: '', content: '', imageSrc: '' },
    section: { width: 320, height: 220, color: 'transparent', title: 'Section', content: '' },
  };
  return { id, type, x, y, ...defaults[type] } as BoardItem;
}

interface ResearchBoardProps {
  project: Project | null;
}

export function ResearchBoard({ project }: ResearchBoardProps) {
  const storageKey = project ? `research_v2_${project.id}` : null;

  const [items, setItems] = useState<BoardItem[]>(() => {
    if (!storageKey) return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startItemX: number;
    startItemY: number;
  } | null>(null);
  const resizeState = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const sidebarDragType = useRef<BoardItem['type'] | null>(null);

  const save = useCallback((next: BoardItem[]) => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
  }, [storageKey]);

  const updateItems = useCallback((next: BoardItem[]) => {
    setItems(next);
    save(next);
  }, [save]);

  const updateItem = useCallback((id: string, patch: Partial<BoardItem>) => {
    setItems(prev => {
      const next = prev.map(it => it.id === id ? { ...it, ...patch } : it);
      save(next);
      return next;
    });
  }, [save]);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(it => it.id !== id);
      save(next);
      return next;
    });
  }, [save]);

  const addItem = useCallback((type: BoardItem['type'], x: number, y: number) => {
    const item = makeItem(type, x, y);
    setItems(prev => {
      const next = [...prev, item];
      save(next);
      return next;
    });
  }, [save]);

  // Board drop
  const onBoardDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = sidebarDragType.current;
    if (!type || !boardRef.current) return;
    const r = boardRef.current.getBoundingClientRect();
    addItem(type, e.clientX - r.left - 110, e.clientY - r.top - 40);
    sidebarDragType.current = null;
  }, [addItem]);

  // Mouse move / up for drag + resize
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragState.current) {
        const dx = e.clientX - dragState.current.startMouseX;
        const dy = e.clientY - dragState.current.startMouseY;
        updateItem(dragState.current.id, {
          x: Math.max(0, dragState.current.startItemX + dx),
          y: Math.max(0, dragState.current.startItemY + dy),
        });
      }
      if (resizeState.current) {
        const dx = e.clientX - resizeState.current.startMouseX;
        const dy = e.clientY - resizeState.current.startMouseY;
        updateItem(resizeState.current.id, {
          width: Math.max(120, resizeState.current.startW + dx),
          height: Math.max(60, resizeState.current.startH + dy),
        });
      }
    };
    const onUp = () => { dragState.current = null; resizeState.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [updateItem]);

  // Paste images
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))?.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const item = makeItem('image', 60 + Math.random() * 160, 60 + Math.random() * 120);
        item.imageSrc = ev.target?.result as string;
        setItems(prev => { const next = [...prev, item]; save(next); return next; });
      };
      reader.readAsDataURL(file);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [save]);

  const startDrag = (e: React.MouseEvent, item: BoardItem) => {
    e.preventDefault();
    dragState.current = { id: item.id, startMouseX: e.clientX, startMouseY: e.clientY, startItemX: item.x, startItemY: item.y };
  };

  const startResize = (e: React.MouseEvent, item: BoardItem) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = { id: item.id, startMouseX: e.clientX, startMouseY: e.clientY, startW: item.width, startH: item.height };
  };

  const bringToFront = (id: string) => {
    setItems(prev => {
      const next = [...prev.filter(i => i.id !== id), prev.find(i => i.id === id)!];
      save(next);
      return next;
    });
  };

  const uploadImage = (id: string) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = e => updateItem(id, { imageSrc: e.target?.result as string });
      reader.readAsDataURL(f);
    };
    inp.click();
  };

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileText className="w-10 h-10 opacity-30" />
        <p className="text-sm">Open a project to access Research</p>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#12121a]" style={{ fontFamily: 'inherit' }}>

      {/* Sidebar */}
      <div className="flex flex-col items-center py-3 gap-1 border-r border-white/8 bg-[#1a1a25] w-14 shrink-0 z-10">
        {SIDEBAR_TOOLS.map(({ type, label, icon: Icon }) => (
          <div
            key={type}
            draggable
            onDragStart={() => { sidebarDragType.current = type; }}
            className="flex flex-col items-center justify-center gap-1 w-10 h-11 rounded-lg text-white/40 hover:text-white/85 hover:bg-white/8 cursor-grab transition-colors select-none"
            title={label}
          >
            <Icon className="w-4 h-4" />
            <span style={{ fontSize: 9 }}>{label}</span>
          </div>
        ))}

        <div className="w-7 h-px bg-white/8 my-1" />

        <button
          onClick={() => updateItems([])}
          className="flex flex-col items-center justify-center gap-1 w-10 h-11 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/8 transition-colors"
          title="Clear board"
        >
          <Trash2 className="w-4 h-4" />
          <span style={{ fontSize: 9 }}>Clear</span>
        </button>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="flex-1 relative overflow-hidden"
        onDragOver={e => e.preventDefault()}
        onDrop={onBoardDrop}
      >
        {/* Empty state */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
            <Plus className="w-8 h-8 text-white/10" />
            <p className="text-white/15 text-sm">Drag tools onto the board</p>
            <p className="text-white/8 text-xs">Paste images · Drag to move · Corner to resize</p>
          </div>
        )}

        {/* Items */}
        {items.map(item => (
          <div
            key={item.id}
            style={{ position: 'absolute', left: item.x, top: item.y, width: item.width, height: item.type === 'note' || item.type === 'image' || item.type === 'section' ? item.height : 'auto', zIndex: 1, userSelect: 'none' }}
            onMouseDown={e => { bringToFront(item.id); startDrag(e, item); }}
          >
            {/* NOTE */}
            {item.type === 'note' && (
              <div className="w-full h-full flex flex-col rounded-lg border border-white/10 overflow-hidden" style={{ background: item.color }}>
                <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/8">
                  <input
                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-white/80 placeholder:text-white/25 min-w-0"
                    value={item.title}
                    placeholder="Title..."
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => updateItem(item.id, { title: e.target.value })}
                  />
                  <button onMouseDown={e => e.stopPropagation()} onClick={() => deleteItem(item.id)} className="text-white/20 hover:text-red-400 transition-colors text-base leading-none">×</button>
                </div>
                {/* Color dots */}
                <div className="flex gap-1 px-2 py-1" onMouseDown={e => e.stopPropagation()}>
                  {NOTE_COLORS.map(c => (
                    <div
                      key={c.cls}
                      onClick={() => updateItem(item.id, { color: c.cls })}
                      style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, cursor: 'pointer', outline: item.color === c.cls ? '2px solid rgba(255,255,255,0.5)' : 'none', outlineOffset: 1 }}
                    />
                  ))}
                </div>
                <textarea
                  className="flex-1 bg-transparent border-none outline-none text-xs text-white/65 placeholder:text-white/20 resize-none p-2"
                  style={{ lineHeight: 1.5 }}
                  value={item.content}
                  placeholder="Write anything..."
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => updateItem(item.id, { content: e.target.value })}
                />
              </div>
            )}

            {/* FOLDER */}
            {item.type === 'folder' && (
              <div className="w-full rounded-lg border border-white/10 overflow-hidden" style={{ background: item.color }}>
                <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/8" style={{ background: 'rgba(77,159,255,0.08)' }}>
                  <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: '#4d9fff' }} />
                  <input
                    className="flex-1 bg-transparent border-none outline-none text-xs font-semibold text-white/80 placeholder:text-white/25 min-w-0"
                    value={item.title}
                    placeholder="Folder name..."
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => updateItem(item.id, { title: e.target.value })}
                  />
                  <button onMouseDown={e => e.stopPropagation()} onClick={() => deleteItem(item.id)} className="text-white/20 hover:text-red-400 text-base leading-none">×</button>
                </div>
                <textarea
                  className="w-full bg-transparent border-none outline-none text-xs text-white/50 placeholder:text-white/20 resize-none p-2.5"
                  style={{ minHeight: 60, lineHeight: 1.5 }}
                  value={item.content}
                  placeholder="Notes, links..."
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => updateItem(item.id, { content: e.target.value })}
                />
              </div>
            )}

            {/* LINK */}
            {item.type === 'link' && (
              <div className="w-full rounded-lg border overflow-hidden p-2.5" style={{ background: '#1a1e2a', borderColor: 'rgba(100,140,220,0.25)' }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Link className="w-3 h-3 shrink-0" style={{ color: '#4d9fff' }} />
                  <input
                    className="flex-1 bg-transparent border-none outline-none text-xs text-white/60 placeholder:text-white/20 min-w-0"
                    value={item.title}
                    placeholder="Label..."
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => updateItem(item.id, { title: e.target.value })}
                  />
                  <button onMouseDown={e => e.stopPropagation()} onClick={() => deleteItem(item.id)} className="text-white/20 hover:text-red-400 text-base leading-none">×</button>
                </div>
                <input
                  className="w-full bg-transparent border-none outline-none text-xs placeholder:text-white/20 min-w-0"
                  style={{ color: '#4d9fff', fontFamily: 'monospace' }}
                  value={item.url ?? ''}
                  placeholder="https://..."
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => updateItem(item.id, { url: e.target.value })}
                />
              </div>
            )}

            {/* IMAGE */}
            {item.type === 'image' && (
              <div className="w-full h-full rounded-lg border border-white/10 overflow-hidden relative" style={{ background: '#111118' }}>
                {item.imageSrc ? (
                  <img src={item.imageSrc} alt="" className="w-full h-full object-cover block" />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => uploadImage(item.id)}
                  >
                    <Image className="w-6 h-6 text-white/20" />
                    <span className="text-white/20 text-xs">Click to upload</span>
                    <span className="text-white/10 text-xs">or paste image</span>
                  </div>
                )}
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => deleteItem(item.id)}
                  className="absolute top-1.5 right-1.5 text-white/40 hover:text-red-400 text-base leading-none"
                  style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            )}

            {/* SECTION */}
            {item.type === 'section' && (
              <div className="w-full h-full rounded-xl" style={{ border: '1.5px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-2 p-2.5">
                  <input
                    className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-white/45 placeholder:text-white/20 min-w-0"
                    value={item.title}
                    placeholder="Section name..."
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => updateItem(item.id, { title: e.target.value })}
                  />
                  <button onMouseDown={e => e.stopPropagation()} onClick={() => deleteItem(item.id)} className="text-white/20 hover:text-red-400 text-base leading-none">×</button>
                </div>
              </div>
            )}

            {/* Resize handle */}
            <div
              onMouseDown={e => startResize(e, item)}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, cursor: 'se-resize', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 2 }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5">
                <path d="M7 1L1 7M7 4L4 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
