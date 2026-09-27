import type { KeyboardEvent } from "react";

/** Exclusive choices share the catalogue's underlined visual language. */
export function ExclusiveChoices<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const enabled = options
      .map((option, i) => (option.disabled ? -1 : i))
      .filter((i) => i >= 0);
    const position = enabled.indexOf(index);
    let next: number;
    if (event.key === "ArrowRight")
      next = enabled[(position + 1) % enabled.length];
    else if (event.key === "ArrowLeft")
      next = enabled[(position - 1 + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[enabled.length - 1];
    else return;
    event.preventDefault();
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll("button");
    buttons?.[next]?.focus();
    onChange(options[next].value);
  }
  return (
    <div
      className={`tabs choice-tabs ${className}`}
      role="group"
      aria-label={label}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={option.disabled}
          onKeyDown={(event) => move(event, index)}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
