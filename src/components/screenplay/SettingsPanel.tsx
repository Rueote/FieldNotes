import { useState } from 'react';
import { RotateCcw, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

interface ColorRowProps {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
}

function ColorRow({ label, description, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div
          className="w-7 h-7 rounded border border-border shadow-sm"
          style={{ backgroundColor: value }}
        />

        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 cursor-pointer rounded border-0 bg-transparent p-0"
        />

        <span className="text-xs text-muted-foreground font-mono w-16">
          {value}
        </span>
      </div>
    </div>
  );
}

interface SettingsPanelProps {
  totalSeconds: number;
  onResetTime: () => void;
}

export function SettingsPanel({ totalSeconds, onResetTime }: SettingsPanelProps) {
  const { colors, updateColor, reset } = useTheme();

  const [confirmReset, setConfirmReset] = useState(false);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customise the appearance of FieldNotes
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </Button>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Appearance
            </h2>

            <div className="rounded-lg border border-border px-4">
              <ColorRow
                label="Background"
                description="The area behind the script page"
                value={colors.bg}
                onChange={(val) => updateColor('bg', val)}
              />

              <ColorRow
                label="Paper"
                description="The script page itself"
                value={colors.paper}
                onChange={(val) => updateColor('paper', val)}
              />

              <ColorRow
                label="Menus"
                description="Toolbar, scene list and breakdown panel"
                value={colors.ui}
                onChange={(val) => updateColor('ui', val)}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Text colour adjusts automatically based on brightness.
            </p>
          </section>

          {/* Usage */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Usage
            </h2>

            <div className="rounded-lg border border-border px-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>

                <div>
                  <div className="text-sm font-medium">
                    Total time in app
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cumulative time across all sessions
                  </div>
                </div>
              </div>

              <div className="flex items-end gap-4 mb-4 pl-1">
                {hours > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold tabular-nums">
                      {hours}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                      hours
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums">
                    {minutes}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    minutes
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums">
                    {seconds}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    seconds
                  </div>
                </div>
              </div>

              {/* RESET WITH CONFIRM */}
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Reset timer
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onResetTime();
                      setConfirmReset(false);
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Confirm reset
                  </button>

                  <button
                    onClick={() => setConfirmReset(false)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              About
            </h2>

            <div className="rounded-lg border border-border px-4 py-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version</span>
                <span>0.1.0</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Built by</span>
                <span>Rueote</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}