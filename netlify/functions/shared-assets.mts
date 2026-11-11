import { blobsSnapshotStore } from "../lib/blobs-snapshot-store";
import { getStore, getDeployStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import { sharedAssetsHandler } from "../lib/shared-assets";

export default async (request: Request, context: Context) => {
  // Production links survive deployments. Previews and branches cannot touch
  // production objects and intentionally live only for their own deployment.
  const store =
    context.deploy.context === "production"
      ? getStore({ name: "phasekit-shared-assets-v1", consistency: "strong" })
      : getDeployStore({
          name: "phasekit-shared-assets-v1",
          consistency: "strong",
        });
  return sharedAssetsHandler(blobsSnapshotStore(store))(request);
};
export const config: Config = {
  path: [
    "/api/shared-assets",
    "/api/shared-assets/:id",
    "/api/shared-assets/:id/read",
    "/api/shared-assets/:id/receipt",
  ],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
