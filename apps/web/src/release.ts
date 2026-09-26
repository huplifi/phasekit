import { version } from "../../../package.json";

export const appVersion = version;
export const buildRevision =
  import.meta.env.VITE_BUILD_REVISION || "development";
export const isBeta =
  version.includes("-beta.") ||
  import.meta.env.VITE_RELEASE_CHANNEL === "beta" ||
  window.location.hostname === "beta.phasekit.app" ||
  (window.location.hostname.startsWith("deploy-preview-") &&
    window.location.hostname.endsWith("--phasekit-beta.netlify.app"));
export const releaseChannel = isBeta ? "beta" : "stable";
