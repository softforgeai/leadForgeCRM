"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Put inside a <Link>: shows a small spinner on that link while the page it
 * points to is loading, so you can see your click registered.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2 aria-label="Loading" className={cn("size-3.5 shrink-0 animate-spin", className)} /> : null;
}
