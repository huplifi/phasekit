import { useEffect } from "react";
import { useApp } from "./context";

/** Protect transient form edits from a service-worker update; navigation ends the draft. */
export function useDraftGuard() {
  const { setDraftDirty } = useApp();
  useEffect(() => () => setDraftDirty(false), [setDraftDirty]);
  return setDraftDirty;
}
