"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { startNavigationProgress } from "./NavigationProgress";

type FilterCtx = { pending: boolean; apply: (params: URLSearchParams) => void };
const Ctx = createContext<FilterCtx | null>(null);

/**
 * Wraps a filter bar and the results it controls. Filters update the URL
 * in a transition, so the current results stay on screen (dimmed) until the
 * new ones arrive, instead of the page reloading.
 */
export function FilterScope({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const apply = (params: URLSearchParams) => {
    const qs = params.toString();
    if (qs === window.location.search.replace(/^\?/, "")) return;
    startNavigationProgress();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  return (
    <Ctx.Provider value={{ pending, apply }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside <FilterScope>");
  return ctx;
}

const TEXT_TYPES = new Set(["text", "search", "email", "number", "tel", "url"]);
const isTextInput = (el: Element): el is HTMLInputElement =>
  el instanceof HTMLInputElement && TEXT_TYPES.has(el.type);

/**
 * A GET filter form that applies itself: selects and checkboxes immediately,
 * text fields 350 ms after you stop typing (or on Enter). Without JavaScript
 * it still works as a normal form. Empty values are left out of the URL, and
 * any filter change goes back to page 1.
 */
export function FilterForm({ children, className, ...props }: Omit<ComponentProps<"form">, "onSubmit" | "onChange">) {
  const { apply } = useFilters();
  const formRef = useRef<HTMLFormElement>(null);
  const debounce = useRef<number | undefined>(undefined);
  const defaultsSignature = useRef("");

  const submit = () => {
    window.clearTimeout(debounce.current);
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim() !== "") params.append(key, value.trim());
    }
    apply(params);
  };

  // When the server sends new defaults (a "Clear" link, back button), bring
  // the fields in line, except the one being typed in.
  useLayoutEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const fields = Array.from(form.elements).filter(
      (el): el is HTMLInputElement | HTMLSelectElement => el instanceof HTMLInputElement || el instanceof HTMLSelectElement,
    );
    const signature = fields
      .map((el) =>
        el instanceof HTMLSelectElement
          ? Array.from(el.options).findIndex((o) => o.defaultSelected)
          : el.type === "checkbox"
            ? String(el.defaultChecked)
            : el.defaultValue,
      )
      .join("\u0000");
    if (signature === defaultsSignature.current) return;
    const first = defaultsSignature.current === "";
    defaultsSignature.current = signature;
    if (first) return;
    for (const el of fields) {
      if (el === document.activeElement) continue;
      if (el instanceof HTMLSelectElement) {
        const i = Array.from(el.options).findIndex((o) => o.defaultSelected);
        el.selectedIndex = i === -1 ? 0 : i;
      } else if (el.type === "checkbox" || el.type === "radio") el.checked = el.defaultChecked;
      else if (el.type !== "hidden") el.value = el.defaultValue;
    }
  });

  useEffect(() => () => window.clearTimeout(debounce.current), []);

  return (
    <form
      ref={formRef}
      method="get"
      role="search"
      className={className}
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onChange={(e) => {
        if (isTextInput(e.target as Element)) {
          window.clearTimeout(debounce.current);
          debounce.current = window.setTimeout(submit, 350);
        } else submit();
      }}
    >
      {children}
    </form>
  );
}

/** Dims the results while new ones load, and tells screen readers it's busy. */
export function FilterResults({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFilters();
  return (
    <div
      aria-busy={pending}
      data-pending={pending || undefined}
      className={cn("transition-opacity duration-200 data-[pending]:pointer-events-none data-[pending]:opacity-55", className)}
    >
      {children}
    </div>
  );
}

/** A small spinner and "Updating…" that appear while filters apply. */
export function FilterPending({ className }: { className?: string }) {
  const { pending } = useFilters();
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted transition-opacity",
        pending ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      <Loader2 aria-hidden className="size-3.5 animate-spin" />
      {pending ? "Updating…" : ""}
    </span>
  );
}
