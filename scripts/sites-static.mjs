import { cpSync, rmSync } from "node:fs";
// Sites supports static output at the repository root.
rmSync("dist", { recursive: true, force: true });
cpSync("apps/web/dist", "dist", { recursive: true });
