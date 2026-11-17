import { useLayoutEffect, useRef, type InputHTMLAttributes } from "react";
import "./signed-decimal-input.css";

/** Toggle only the leading sign; preserve decimal separators and unfinished input. */
export function toggleDecimalSign(value: string): string {
  const prefix = value.match(/^\s*/)?.[0] ?? "";
  const remainder = value.slice(prefix.length);
  return (
    prefix +
    (remainder.startsWith("-")
      ? remainder.slice(1)
      : "-" + (remainder.startsWith("+") ? remainder.slice(1) : remainder))
  );
}

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
  /** Omit for an ordinary decimal input without the sign action. */
  signLabel?: string;
};

/** Native decimal keypad plus a focused-field sign action, including iOS Safari. */
export function SignedDecimalInput({
  value,
  onValueChange,
  signLabel,
  ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);
  useLayoutEffect(() => {
    if (!selection.current || !input.current) return;
    input.current.setSelectionRange(
      selection.current.start,
      selection.current.end,
    );
    selection.current = null;
  }, [value]);
  function toggleSign() {
    const field = input.current;
    if (!field) return;
    const next = toggleDecimalSign(value);
    const difference = next.length - value.length;
    selection.current = {
      start: Math.max(
        0,
        Math.min(
          next.length,
          (field.selectionStart ?? value.length) + difference,
        ),
      ),
      end: Math.max(
        0,
        Math.min(
          next.length,
          (field.selectionEnd ?? value.length) + difference,
        ),
      ),
    };
    // Keep focus synchronous with the user gesture, so Safari retains its keypad.
    field.focus({ preventScroll: true });
    onValueChange(next);
  }
  return (
    <div
      className={"signed-decimal-input" + (signLabel ? " has-sign-action" : "")}
    >
      <input
        {...props}
        ref={input}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {signLabel && (
        <button
          type="button"
          className="signed-decimal-sign"
          aria-label={signLabel}
          disabled={props.disabled || props.readOnly}
          onPointerDown={(event) => event.preventDefault()}
          onClick={toggleSign}
        >
          <span aria-hidden="true">±</span>
        </button>
      )}
    </div>
  );
}
