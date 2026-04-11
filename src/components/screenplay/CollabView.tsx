import { Users, Zap } from 'lucide-react';

export function CollabView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-editor-bg">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Users className="w-8 h-8 text-primary" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-lg font-semibold text-foreground mb-2">Collaboration</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Real-time collaboration is a future feature. Soon you'll be able to share your project
          with a director, producer, or co-writer and edit together live.
        </p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
        <Zap className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Coming soon</span>
      </div>
    </div>
  );
}
