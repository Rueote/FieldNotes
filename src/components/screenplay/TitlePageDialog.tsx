import { TitlePage } from '@/types/screenplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TitlePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titlePage: TitlePage;
  onUpdate: (updates: Partial<TitlePage>) => void;
}

export function TitlePageDialog({ open, onOpenChange, titlePage, onUpdate }: TitlePageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Title Page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label className="text-xs">Script Name</Label>
            <Input value={titlePage.title} onChange={e => onUpdate({ title: e.target.value })} placeholder="Untitled Screenplay" />
          </div>
          <div>
            <Label className="text-xs">Genre</Label>
            <Input value={titlePage.genre || ''} onChange={e => onUpdate({ genre: e.target.value })} placeholder="e.g. Drama, Comedy, Thriller" />
          </div>
          <div>
            <Label className="text-xs">Written By</Label>
            <Input value={titlePage.writtenBy} onChange={e => onUpdate({ writtenBy: e.target.value })} placeholder="Author name" />
          </div>
          <div>
            <Label className="text-xs">Additional Credits</Label>
            <Input value={titlePage.additional || ''} onChange={e => onUpdate({ additional: e.target.value })} placeholder="Based on..." />
          </div>
          <div>
            <Label className="text-xs">Contact Details</Label>
            <Textarea
              value={titlePage.contact || ''}
              onChange={e => onUpdate({ contact: e.target.value })}
              placeholder="Name&#10;Address&#10;Phone&#10;Email"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-xs">Year</Label>
            <Input value={titlePage.year || ''} onChange={e => onUpdate({ year: e.target.value })} placeholder={new Date().getFullYear().toString()} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
