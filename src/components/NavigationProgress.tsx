"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Fire this (e.g. before a router.push) to show the bar for programmatic navigation. */
export const PROGRESS_START_EVENT = "lf:progress-start";
export function startNavigationProgress() {
  window.dispatchEvent(new Event(PROGRESS_START_EVENT));
}

/**
 * A thin bar across the top of the window while a page is loading, like
 * GitHub, Linear or YouTube. It starts when an internal link is clicked (or
 * on startNavigationProgress) and finishes when the URL changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [progress, setProgress] = useState<number | null>(null);
  const timers = useRef<{ show?: number; trickle?: number; hide?: number; giveUp?: number }>({});
  const visible = useRef(false);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const t = timers.current;
    const clear = () => {
      window.clearTimeout(t.show);
      window.clearInterval(t.trickle);
      window.clearTimeout(t.hide);
      window.clearTimeout(t.giveUp);
    };
    const start = () => {
      clear();
      // A short delay, so instant (prefetched) navigations don't flash a bar.
      t.show = window.setTimeout(() => {
        visible.current = true;
        setProgress(8);
        t.trickle = window.setInterval(() => {
          setProgress((p) => (p === null ? p : p + (90 - p) * 0.08));
        }, 200);
      }, 80);
      // Never leave a stuck bar (a download link, a cancelled navigation).
      t.giveUp = window.setTimeout(() => finish(), 15_000);
    };
    const finish = () => {
      clear();
      if (!visible.current) return;
      visible.current = false;
      setProgress(100);
      t.hide = window.setTimeout(() => setProgress(null), 400);
    };

    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download") || a.dataset.noProgress !== undefined) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }

    finishRef.current = finish;
    // Capture phase: next/link calls preventDefault before a bubbling listener would run.
    document.addEventListener("click", onClick, true);
    window.addEventListener(PROGRESS_START_EVENT, start);
    return () => {
      clear();
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(PROGRESS_START_EVENT, start);
    };
  }, []);

  // The new page has rendered: complete the bar.
  useEffect(() => {
    finishRef.current();
  }, [pathname, search]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      style={{ opacity: progress === null || progress === 100 ? 0 : 1, transition: "opacity 250ms ease 150ms" }}
    >
      <div
        className="h-full bg-accent shadow-[0_0_8px_var(--color-accent)]"
        style={{
          width: `${progress ?? 0}%`,
          transition: progress === null ? "none" : "width 200ms ease-out",
        }}
      />
    </div>
  );
}
