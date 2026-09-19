"use client";

import { cn } from "@/lib/utils";
import type { FeedAlgoMode } from "@/types/database.types";

const MODES: { value: FeedAlgoMode; label: string }[] = [
  { value: "balanced", label: "Balanceado" },
  { value: "chronological", label: "Cronológico" },
  { value: "discovery", label: "Descoberta" },
];

export function FeedModeSwitch({
  mode,
  onChange,
}: {
  mode: FeedAlgoMode;
  onChange: (mode: FeedAlgoMode) => void;
}) {
  return (
    <div className="inline-flex gap-0.5 rounded-full bg-muted p-1">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all",
            mode === m.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
