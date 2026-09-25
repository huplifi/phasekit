import { writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify } from "csv-stringify/sync";
import {
  build,
  buildDataset,
  dataDir,
  normalized,
  readCanonicalRows,
  validateCanonical,
  writeCoverageReports,
} from "../src/build";
import { refrigerantRowSchema, type RefrigerantRow } from "../src/schema";
const [command, designation] = process.argv.slice(2);
try {
  if (command === "build") {
    const data = await build();
    console.log(
      `Built ${data.refrigerants.length} refrigerants · ${data.version}`,
    );
  } else if (command === "validate") {
    const rows = validateCanonical();
    buildDataset(rows);
    console.log(
      `Valid: ${rows.refrigerants.length} refrigerants, ${rows.sources.length} sources`,
    );
  } else if (command === "coverage") {
    await writeCoverageReports(buildDataset(validateCanonical()));
    console.log("Coverage reports updated");
  } else if (command === "add") {
    if (!designation || !/^R-?[a-z0-9]+(?:\([EZ]\))?$/i.test(designation))
      throw new Error("Usage: pnpm data:add R513A");
    const rows = readCanonicalRows(),
      id = normalized(designation);
    if (rows.refrigerants.some((r) => r.id === id))
      console.log(`${designation} already exists; unchanged`);
    else {
      const row = Object.fromEntries(
        Object.keys(refrigerantRowSchema.shape).map((key) => [key, ""]),
      ) as RefrigerantRow;
      Object.assign(row, {
        id,
        designation: designation.replace(/^r-?/i, "R"),
        kind: /^r[45]\d{2}/i.test(id) ? "blend" : "pure",
        identity_status: "partial",
        composition_status: /^r[45]\d{2}/i.test(id)
          ? "partial"
          : "not_applicable",
        safety_status: "partial",
        thermo_status: "partial",
        regulatory_eu_fi_status: "unsupported",
        pt_status: "unsupported",
      });
      rows.refrigerants.push(row);
      validateCanonical(rows);
      await writeFile(
        path.join(dataDir, "refrigerants.csv"),
        stringify(rows.refrigerants, {
          header: true,
          columns: Object.keys(refrigerantRowSchema.shape),
        }),
      );
      console.log(
        `Added ${designation} as an unverified draft. Supply cited identity, composition and property data before marking coverage verified.`,
      );
    }
  } else throw new Error("Expected add, validate, build or coverage");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
