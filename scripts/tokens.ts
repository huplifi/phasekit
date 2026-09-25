import { readFileSync, writeFileSync } from "node:fs";
const tokens = JSON.parse(readFileSync("assets/design-tokens.json", "utf8"));
const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const lines = (o: Record<string, unknown>, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? lines(v as Record<string, unknown>, `${prefix}${kebab(k)}-`)
      : [`  --${prefix}${kebab(k)}: ${String(v)};`],
  );
const css = `/* Generated from assets/design-tokens.json. Do not edit. */\n:root {\n${lines(tokens.palette, "palette-").join("\n")}\n${Object.entries(
  tokens.typography,
)
  .filter(([, v]) => (v as { family?: string }).family)
  .map(([k, v]) => `  --font-${k}: "${(v as { family: string }).family}";`)
  .join("\n")}\n${Object.entries(tokens.layout)
  .filter(([, v]) => typeof v === "number")
  .map(([k, v]) => `  --${kebab(k)}: ${v}px;`)
  .join("\n")}\n}\n${Object.entries(tokens.themes)
  .map(
    ([k, v]) =>
      `[data-theme="${k}"] {\n${lines(v as Record<string, unknown>).join("\n")}\n}`,
  )
  .join("\n")}\n`;
writeFileSync("packages/ui/src/tokens.css", css);
