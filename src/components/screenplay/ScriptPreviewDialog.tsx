import { useState, useEffect, useRef } from 'react';
import { Project } from '@/types/screenplay';
import { renderToPDF, exportToPDF, exportToFDX, exportToFountain, exportToDOCX } from '@/lib/screenplayExport';
import { Button } from '@/components/ui/button';
import { Download, X, FileText, File, AlignLeft } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ScriptPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  project: Project;
}

export function ScriptPreviewDialog({ open, onClose, project }: ScriptPreviewDialogProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // Generate PDF blob URL for preview
    const doc = renderToPDF(project);
    const blob = doc.output('blob');
    const url  = URL.createObjectURL(blob);
    setPdfUrl(url);
    urlRef.current = url;

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [open, project]);

  const handleExport = (format: 'pdf' | 'fdx' | 'fountain' | 'docx') => {
    switch (format) {
      case 'pdf':     exportToPDF(project);      break;
      case 'fdx':     exportToFDX(project);      break;
      case 'fountain':exportToFountain(project); break;
      case 'docx':    exportToDOCX(project);     break;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent
        className="p-0 gap-0 flex flex-col overflow-hidden"
        style={{ maxWidth: '900px', width: '95vw', maxHeight: '92vh', height: '92vh' }}
      >
        {/* Header */}
        <div className="shrink-0 h-12 flex items-center justify-between px-4 border-b border-border bg-toolbar-bg">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{project.name}</span>
            <span className="text-xs text-muted-foreground">— Preview</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Export buttons */}
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => handleExport('pdf')}>
              <Download className="w-3.5 h-3.5" />PDF
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => handleExport('docx')}>
              <File className="w-3.5 h-3.5" />DOCX
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => handleExport('fdx')}>
              <AlignLeft className="w-3.5 h-3.5" />FDX
            </Button>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => handleExport('fountain')}>
              <AlignLeft className="w-3.5 h-3.5" />.fountain
            </Button>

            <div className="w-px h-4 bg-border mx-1" />

            <Button variant="ghost" size="sm" className="w-8 h-8 p-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF preview */}
        <div className="flex-1 overflow-hidden bg-[#404040]">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Script preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-white/40 text-sm">
              Generating preview…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
