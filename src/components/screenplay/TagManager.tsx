import { useState } from 'react';
import { Tag } from '@/types/screenplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface TagManagerProps {
  tags: Tag[];
  onAddTag: (tag: Tag) => void;
  onUpdateTag: (id: string, updates: Partial<Tag>) => void;
  onRemoveTag: (id: string) => void;
}

const PRESET_COLORS = ['#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#22c55e', '#ec4899', '#f97316', '#a855f7', '#eab308', '#3b82f6'];

export function TagManager({ tags, onAddTag, onUpdateTag, onRemoveTag }: TagManagerProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const handleAdd = () => {
    if (!newName.trim()) return;
    onAddTag({
      id: crypto.randomUUID(),
      name: newName.trim(),
      color: newColor,
      category: newName.trim(),
    });
    setNewName('');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs gap-1">
          <Settings2 className="w-3.5 h-3.5" />
          Tags
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={tag.color}
                  onChange={e => onUpdateTag(tag.id, { color: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <Input
                  value={tag.name}
                  onChange={e => onUpdateTag(tag.id, { name: e.target.value })}
                  className="h-8 text-sm flex-1"
                />
                <Button variant="ghost" size="sm" onClick={() => onRemoveTag(tag.id)} className="text-destructive h-8 w-8 p-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0" />
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New tag name..."
            className="h-8 text-sm flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()} className="h-8">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
