import type { ReactNode } from "react";
import "./formula-block.css";

/** A readable equation and its units, independent of the surrounding disclosure. */
export function FormulaBlock({
  formula,
  children,
}: {
  formula: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="formula-block">
      <div className="formula-block-equation">{formula}</div>
      {children && <div className="formula-block-explanation">{children}</div>}
    </div>
  );
}
