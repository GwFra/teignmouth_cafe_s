"use client";

import { useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatType, formatTypeLabel } from "@/lib/format";
import type { ReviewRow } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  type: ReviewRow["type"];
  className?: string;
}

/**
 * A review type's emoji, with its name ("Barista"/"Machine") shown on hover,
 * focus or tap.
 */
export function ReviewType({ type, className }: Props) {
  const [open, setOpen] = useState(false);
  const label = formatTypeLabel(type);

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn("cursor-default", className)}
            // Radix tooltips ignore taps (and close on pointerdown), so open
            // explicitly on click; tapping elsewhere dismisses it.
            onClick={() => setOpen(true)}
          >
            {formatType(type)}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
