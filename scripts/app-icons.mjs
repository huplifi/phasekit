// PNGs are committed. Run manually with Sharp 0.35.x when changing the SVGs:
// node scripts/app-icons.mjs /absolute/path/to/node_modules/sharp
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const sharp = createRequire(import.meta.url)(process.argv[2] || "sharp");
const root = new URL("../", import.meta.url);
for (const beta of [false, true]) {
  const source = fileURLToPath(
    new URL(`design/icons/app-icon${beta ? "-beta" : ""}.svg`, root),
  );
  for (const size of beta ? [180, 192, 512] : [192, 512]) {
    const output = fileURLToPath(
      new URL(
        `apps/web/public/icons/icon${beta ? "-beta" : ""}-v2-${size}.png`,
        root,
      ),
    );
    await sharp(source).resize(size, size).removeAlpha().png().toFile(output);
  }
}
