import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useApp } from "../context";

/** Touch and keyboard accessible contextual help; never requires hovering. */
export function InfoHelp({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const { data } = useApp();
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <span
      ref={root}
      className="info-help"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="info-help-button"
        aria-label={`${data.locale === "fi" ? "Lisätietoa" : "About"}: ${label}`}
        aria-expanded={open}
        aria-controls={id}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Info size={18} aria-hidden="true" />
      </button>
      <span id={id} role="tooltip" className="info-help-content" hidden={!open}>
        {children}
      </span>
    </span>
  );
}
