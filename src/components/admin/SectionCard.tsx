import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Small value/label pairs shown on the card face. */
  stats?: { label: string; value: string }[];
  onClick: () => void;
}

/** Clickable card that opens a section (rendered in a dialog by the caller). */
export default function SectionCard({ title, description, icon: Icon, stats, onClick }: SectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.map((s) => (
            <span key={s.label} className="rounded-md bg-muted/60 px-2 py-1 text-xs">
              <strong>{s.value}</strong> <span className="text-muted-foreground">{s.label}</span>
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
