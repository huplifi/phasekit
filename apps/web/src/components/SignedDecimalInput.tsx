import type { InputHTMLAttributes } from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: string;
  onValueChange: (value: string) => void;
  signed?: boolean;
};

export function SignedDecimalInput({
  value,
  onValueChange,
  signed = true,
  ...props
}: Props) {
  return (
    <input
      {...props}
      type="text"
      inputMode={signed ? "text" : "decimal"}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      spellCheck={false}
      value={value}
      onChange={(event) => onValueChange(event.target.value.replace(/^−/, "-"))}
    />
  );
}
