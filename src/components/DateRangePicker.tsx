import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildPreset,
  fmtRange,
  PRESET_LABEL,
  type DateRange,
  type PresetKey,
} from "@/lib/format";

const PRESETS: PresetKey[] = [
  "this_month",
  "last_month",
  "last_7",
  "last_30",
  "last_90",
  "ytd",
  "last_year",
  "all_time",
];

export function DateRangePicker({
  value,
  onChange,
  align = "end",
  className,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({
    from: value.from,
    to: value.to,
  });

  const pickPreset = (k: PresetKey) => {
    const r = buildPreset(k);
    setDraft({ from: r.from, to: r.to });
    onChange(r);
    setOpen(false);
  };

  const apply = () => {
    if (draft.from && draft.to) {
      onChange({ from: draft.from, to: draft.to });
      setOpen(false);
    } else if (draft.from && !draft.to) {
      onChange({ from: draft.from, to: draft.from });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft({ from: value.from, to: value.to }); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start gap-2 font-normal min-w-[220px]", className)}
        >
          <CalendarIcon className="h-4 w-4 opacity-70" />
          <span className="truncate">{fmtRange(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0" sideOffset={6}>
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r border-border p-2 flex sm:flex-col gap-1 sm:w-40 overflow-x-auto sm:overflow-visible">
            {PRESETS.map((k) => (
              <button
                key={k}
                onClick={() => pickPreset(k)}
                className="text-left text-xs px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
              >
                {PRESET_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={value.from}
              selected={{ from: draft.from, to: draft.to }}
              onSelect={(r: any) => setDraft({ from: r?.from, to: r?.to })}
              className="rounded-md"
            />
            <div className="flex items-center justify-between p-2 border-t border-border mt-1">
              <span className="text-xs text-muted-foreground">
                {draft.from && draft.to
                  ? fmtRange({ from: draft.from, to: draft.to })
                  : draft.from
                    ? `${draft.from.toLocaleDateString()} – …`
                    : "Pick a range"}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={apply} disabled={!draft.from}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
