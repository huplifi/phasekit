import { createContext, useContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { UserData } from "./storage";
import type { Snapshot } from "./storage";
import type { ToolRecord } from "./storage";
import type { MessageKey } from "../../../packages/i18n/src";
export interface AppContextValue {
  data: UserData;
  setData: Dispatch<SetStateAction<UserData>>;
  persistSnapshot: (snapshot: Snapshot) => Promise<void>;
  persistToolRecord: (record: ToolRecord) => Promise<void>;
  setDraftDirty: (dirty: boolean) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  go: (path: string) => void;
  notify: (message: string) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  toggleFavourite: (id: string) => void;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("Missing AppContext");
  return context;
}
