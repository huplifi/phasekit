import { Coverage } from "./views/Coverage";
import { Symbols } from "./views/Symbols";
import { HeatQuantityCalculator } from "./views/HeatQuantityCalculator";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  Snowflake,
  Wrench,
  Bookmark,
  Settings as SettingsIcon,
  WifiOff,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  X,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { AppContext } from "./context";
import { byId } from "./data";
import { createDurableWriter, emptyData, loadData, saveData } from "./storage";
import type { Snapshot, UserData, ToolRecord } from "./storage";
import { translate } from "../../../packages/i18n/src";
import type { MessageKey } from "../../../packages/i18n/src";
import { Home } from "./views/Home";
import { RefrigerantDetail } from "./views/RefrigerantDetail";
import { Compare } from "./views/Compare";
import { Check } from "./views/Check";
import { Calculator } from "./views/Calculator";
import { PTCalculator } from "./views/PTCalculator";
import { Tools } from "./views/Tools";
import { ReleaseHistory } from "./views/ReleaseHistory";
import { Settings } from "./views/Settings";
import { Saved } from "./views/Saved";
import { Equipment } from "./views/Equipment";
import { UnitConverter } from "./views/UnitConverter";
import {
  ThermalPowerCalculator,
  ElectricalCalculator,
  WorkChecklists,
  PipeCalculator,
} from "./views/FieldTools";
import { appVersion, isBeta } from "./release";
const pathNow = () => window.location.hash.replace(/^#/, "") || "/";
export function App() {
  const [data, setRenderedData] = useState(emptyData);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<
    "saving" | "saved" | "error"
  >("saved");
  const writeRevision = useRef(0);
  const [path, setPath] = useState(pathNow);
  const historyIndexRef = useRef(
    Number.isSafeInteger(window.history.state?.phasekitNavigationIndex)
      ? (window.history.state.phasekitNavigationIndex as number)
      : 0,
  );
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [undo, setUndo] = useState<{ id: string; index: number } | null>(null);
  const [draftDirty, setDraftDirtyState] = useState(false);
  const [showUpdateDraft, setShowUpdateDraft] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [systemDark, setSystemDark] = useState(
    matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const writable = useRef(false);
  const dataRef = useRef<UserData>(data);
  const draftDirtyRef = useRef(false);
  const storageErrorRef = useRef(false);
  const writer = useRef(createDurableWriter(saveData));
  const mainRef = useRef<HTMLElement>(null);
  const setDraftDirty = useCallback((dirty: boolean) => {
    draftDirtyRef.current = dirty;
    setDraftDirtyState(dirty);
    if (!dirty) setShowUpdateDraft(false);
  }, []);
  const enqueue = useCallback((next: UserData) => {
    const revision = ++writeRevision.current;
    setPersistenceStatus("saving");
    const attempt = writer.current.enqueue(next);
    void attempt.then(
      () => {
        if (revision !== writeRevision.current) return;
        setPersistenceStatus("saved");
        storageErrorRef.current = false;
        setStorageError(false);
      },
      () => {
        if (revision !== writeRevision.current) return;
        setPersistenceStatus("error");
        storageErrorRef.current = true;
        setStorageError(true);
      },
    );
    return attempt;
  }, []);
  const setData = useCallback<Dispatch<SetStateAction<UserData>>>(
    (action) => {
      const next =
        typeof action === "function" ? action(dataRef.current) : action;
      dataRef.current = next;
      setRenderedData(next);
      if (writable.current) void enqueue(next);
    },
    [enqueue],
  );
  const persistSnapshot = useCallback(
    async (snapshot: Snapshot) => {
      if (!writable.current) throw new Error("Storage not ready");
      const next = {
        ...dataRef.current,
        snapshots: [snapshot, ...dataRef.current.snapshots],
      };
      dataRef.current = next;
      setRenderedData(next);
      try {
        await enqueue(next);
      } catch (error) {
        // Keep failed snapshots out of the in-memory list, so retry cannot
        // create duplicate IDs. Preserve unrelated changes made meanwhile.
        const rollback = {
          ...dataRef.current,
          snapshots: dataRef.current.snapshots.filter(
            (item) => item.id !== snapshot.id,
          ),
        };
        dataRef.current = rollback;
        setRenderedData(rollback);
        try {
          await enqueue(rollback);
        } catch {
          /* the failure banner remains visible */
        }
        throw error;
      }
    },
    [enqueue],
  );
  const persistToolRecord = useCallback(
    async (record: ToolRecord) => {
      if (!writable.current) throw new Error("Storage not ready");
      const next = {
        ...dataRef.current,
        toolRecords: [record, ...dataRef.current.toolRecords],
      };
      dataRef.current = next;
      setRenderedData(next);
      try {
        await enqueue(next);
      } catch (error) {
        const rollback = {
          ...dataRef.current,
          toolRecords: dataRef.current.toolRecords.filter(
            (item) => item.id !== record.id,
          ),
        };
        dataRef.current = rollback;
        setRenderedData(rollback);
        try {
          await enqueue(rollback);
        } catch {
          /* Keep failure banner visible. */
        }
        throw error;
      }
    },
    [enqueue],
  );
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () => setMessage(translate(data.locale, "unavailable")),
  });
  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) =>
      translate(data.locale, key, values),
    [data.locale],
  );
  useEffect(() => {
    let active = true;
    loadData()
      .then((d) => {
        if (active) {
          writable.current = true;
          dataRef.current = d;
          setRenderedData(d);
        }
      })
      .catch(() => {
        if (active) {
          setPersistenceStatus("error");
          storageErrorRef.current = true;
          setStorageError(true);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function applyUpdate(discardDraft = false) {
    if (draftDirtyRef.current && !discardDraft) {
      setShowUpdateDraft(true);
      return;
    }
    setUpdating(true);
    try {
      await writer.current.flush();
      if (!writable.current || storageErrorRef.current)
        throw new Error("Storage write failed");
      if (draftDirtyRef.current && !discardDraft) {
        setShowUpdateDraft(true);
        return;
      }
      if (discardDraft) setDraftDirty(false);
      await updateServiceWorker(true);
    } catch {
      setMessage(t("updateStorageBlocked"));
    } finally {
      setUpdating(false);
    }
  }
  useEffect(() => {
    // Stamp existing and newly created hash entries so a guarded form can undo
    // Back, Forward or a new hash navigation without overwriting history.
    window.history.replaceState(
      {
        ...window.history.state,
        phasekitNavigationIndex: historyIndexRef.current,
      },
      "",
    );
    const onHash = () => {
      // Let detail guards synchronously cancel navigation before updating the
      // route, which would unmount the form holding its unsaved notes.
      if (
        !window.dispatchEvent(
          new Event("phasekit:before-navigation", { cancelable: true }),
        )
      )
        return;
      const storedIndex = window.history.state?.phasekitNavigationIndex;
      const nextIndex = Number.isSafeInteger(storedIndex)
        ? (storedIndex as number)
        : historyIndexRef.current + 1;
      if (!Number.isSafeInteger(storedIndex))
        window.history.replaceState(
          { ...window.history.state, phasekitNavigationIndex: nextIndex },
          "",
        );
      historyIndexRef.current = nextIndex;
      setPath(pathNow());
    };
    const onOnline = () => setOnline(navigator.onLine);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onTheme = () => setSystemDark(media.matches);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    media.addEventListener("change", onTheme);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
      media.removeEventListener("change", onTheme);
    };
  }, []);
  const theme =
    data.theme === "system" ? (systemDark ? "dark" : "light") : data.theme;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = data.locale;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#091720" : "#FAFEFF");
    document
      .querySelector<HTMLLinkElement>("#phasekit-theme-favicon")
      ?.setAttribute(
        "href",
        theme === "dark"
          ? "/phasekit-logo-dark.svg"
          : "/phasekit-logo-light.svg",
      );
  }, [theme, data.locale]);
  useLayoutEffect(() => {
    mainRef.current?.focus();
    window.scrollTo(0, 0);
  }, [path, ready]);
  useEffect(() => {
    const [section, id] = path.split("/").slice(1);
    if (!ready) return;
    if (section === "refrigerants" && byId.has(id))
      setData((d) => ({
        ...d,
        recent: [id, ...d.recent.filter((v) => v !== id)].slice(0, 20),
      }));
  }, [path, ready]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);
  function go(next: string) {
    if (next === path) {
      mainRef.current?.focus();
      return;
    }
    window.location.hash = next;
  }
  function toggleCompare(id: string) {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((value) => value !== id));
      return;
    }
    if (compareIds.length >= 3) {
      setMessage(t("maxCompare"));
      return;
    }
    setCompareIds([...compareIds, id]);
  }
  function toggleFavourite(id: string) {
    const index = data.favourites.indexOf(id);
    if (index >= 0) {
      setUndo({ id, index });
      setData((d) => ({
        ...d,
        favourites: d.favourites.filter((x) => x !== id),
      }));
    } else {
      setUndo(null);
      setData((d) => ({ ...d, favourites: [...d.favourites, id] }));
    }
  }
  const [section, id, detailTab] = path.split("/").slice(1);
  const r = id ? byId.get(id) : undefined;
  const nav = [
    { key: "refrigerants", path: "/", icon: Snowflake },
    { key: "tools", path: "/tools", icon: Wrench },
    { key: "saved", path: "/reports", icon: Bookmark },
    { key: "settings", path: "/settings", icon: SettingsIcon },
  ] as const;
  const activeNav = [
    "tools",
    "check",
    "pt",
    "ph",
    "shsc",
    "co2e",
    "compare",
    "convert",
    "thermal-power",
    "heat-quantity",
    "symbols",
    "electrical",
    "pipe",
  ].includes(section)
    ? "tools"
    : ["saved", "reports", "equipment", "checklists"].includes(section)
      ? "saved"
      : section === "settings" ||
          section === "releases" ||
          (section === "coverage" && !r)
        ? "settings"
        : "refrigerants";
  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        persistenceStatus,
        persistSnapshot,
        persistToolRecord,
        setDraftDirty,
        t,
        go,
        notify: setMessage,
        compareIds,
        toggleCompare,
        toggleFavourite,
      }}
    >
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        {t("skip")}
      </a>
      <div className="app-shell">
        <header className="brand-header">
          <a href="#/" aria-label="PhaseKit">
            <img
              src={
                theme === "dark"
                  ? "/phasekit-logo-dark.svg"
                  : "/phasekit-logo-light.svg"
              }
              alt=""
              width="40"
              height="40"
            />
            <span>PhaseKit</span>
          </a>
          {!online && (
            <span className="offline-indicator">
              <WifiOff size={16} />
              {t("offline")}
            </span>
          )}
        </header>
        {isBeta && (
          <aside className="beta-banner caption" aria-label="Beta">
            <div className="beta-banner-heading">
              <strong>Beta</strong>
              <span className="mono">{appVersion}</span>
            </div>
            <div className="beta-banner-actions">
              <a className="beta-release-link" href="#/releases">
                {data.locale === "fi" ? "Versiohistoria" : "Release history"}
              </a>
              <a
                href="https://phasekit.app"
                aria-describedby="beta-storage-note"
              >
                {data.locale === "fi" ? "Vakaa versio" : "Stable version"}
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            </div>
            <p id="beta-storage-note">
              {data.locale === "fi"
                ? "Betan tallennukset ovat erillään vakaasta versiosta."
                : "Beta records are separate from the stable version."}
            </p>
          </aside>
        )}
        {storageError && (
          <p role="alert" className="notice error">
            {t("storageError")}
          </p>
        )}
        {needRefresh && (
          <aside
            className="notice update-notice"
            aria-label={
              data.locale === "fi" ? "Sovelluspäivitys" : "Application update"
            }
          >
            <strong className="update-notice-heading">
              <RefreshCw size={20} aria-hidden="true" />
              {data.locale === "fi"
                ? "Päivitys saatavilla"
                : "Update available"}
            </strong>
            <p className="caption secondary">{t("updateNote")}</p>
            <button
              className="secondary-button"
              disabled={updating}
              onClick={() => void applyUpdate()}
            >
              {t("update")}
            </button>
            {showUpdateDraft && draftDirty && (
              <div className="notice warning" role="alert">
                <p>{t("updateDraftBlocked")}</p>
                <div className="button-group">
                  <button
                    className="text-button"
                    onClick={() => setShowUpdateDraft(false)}
                  >
                    {t("cancel")}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={updating}
                    onClick={() => void applyUpdate(true)}
                  >
                    {t("discardDraftAndUpdate")}
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
        <main id="main" tabIndex={-1} ref={mainRef}>
          {!ready ? (
            <p>{t("loading")}</p>
          ) : section === "check" ? (
            <Check key={r?.id ?? "check"} r={r} />
          ) : section === "pt" ? (
            <PTCalculator key={r?.id ?? "pt"} initial={r} />
          ) : section === "ph" || section === "shsc" || section === "co2e" ? (
            <Calculator
              key={`${section === "co2e" ? "co2e" : "cycle"}-${r?.id ?? ""}`}
              tool={section === "co2e" ? "co2e" : "shsc"}
              initial={r}
            />
          ) : section === "refrigerants" ? (
            r ? (
              <RefrigerantDetail
                key={`${r.id}:${detailTab ?? ""}`}
                r={r}
                initialTab={
                  detailTab === "properties" ? "properties" : "overview"
                }
              />
            ) : (
              <p className="notice">{t("unknownId")}</p>
            )
          ) : section === "compare" ? (
            <Compare />
          ) : section === "tools" ? (
            <Tools />
          ) : section === "convert" ? (
            <UnitConverter />
          ) : section === "symbols" ? (
            <Symbols />
          ) : section === "heat-quantity" ? (
            <HeatQuantityCalculator />
          ) : section === "thermal-power" ? (
            <ThermalPowerCalculator />
          ) : section === "electrical" ? (
            <ElectricalCalculator />
          ) : section === "pipe" ? (
            <PipeCalculator />
          ) : section === "checklists" ? (
            <WorkChecklists />
          ) : section === "equipment" ? (
            <Equipment />
          ) : section === "saved" || section === "reports" ? (
            <Saved path={path} historyIndex={historyIndexRef.current} />
          ) : section === "coverage" ? (
            <Coverage r={r} />
          ) : section === "releases" ? (
            <ReleaseHistory />
          ) : section === "settings" ? (
            <Settings />
          ) : (
            <Home />
          )}
        </main>
        {compareIds.length > 0 && section !== "compare" && (
          <div className="comparison-bar">
            <button className="text-button" onClick={() => go("/compare")}>
              {t("compareCount", { count: compareIds.length })}
              <ArrowRight size={18} />
            </button>
            <button
              className="icon-button"
              aria-label={t("cancel")}
              onClick={() => setCompareIds([])}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <nav className="main-nav" aria-label="PhaseKit">
          {nav.map(({ key, path: next, icon: Icon }) => (
            <a
              href={`#${next}`}
              key={key}
              aria-current={activeNav === key ? "page" : undefined}
            >
              <Icon size={24} />
              <span>
                {key === "saved"
                  ? data.locale === "fi"
                    ? "Raportit"
                    : "Reports"
                  : t(key)}
              </span>
            </a>
          ))}
        </nav>
      </div>
      <div className="live-message" role="status" aria-live="polite">
        {message && <span>{message}</span>}
      </div>
      {undo && (
        <div className="undo-toast" role="status">
          <span>{t("removed")}</span>
          <button
            className="text-button"
            onClick={() => {
              const value = undo;
              setData((d) => {
                const favourites = d.favourites.filter((id) => id !== value.id);
                favourites.splice(
                  Math.min(value.index, favourites.length),
                  0,
                  value.id,
                );
                return { ...d, favourites };
              });
              setUndo(null);
            }}
          >
            {t("undo")}
          </button>
          <button
            className="icon-button"
            aria-label={t("done")}
            onClick={() => setUndo(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
