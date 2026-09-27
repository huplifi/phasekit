import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import type { Refrigerant } from "../../../../packages/core/src/contracts";
import {
  refinementText,
  familyText,
} from "../../../../packages/i18n/src/refinements";
import { byId, dataset } from "../data";
import { useApp } from "../context";
import { StarButton } from "./Common";
import "./picker-refinements.css";

interface PickerBaseProps {
  label?: string;
}

export interface SingleRefrigerantPickerProps extends PickerBaseProps {
  mode?: "single";
  value?: string;
  onChange: (id: string) => void;
  onClear?: () => void;
  selectedIds?: never;
  onToggle?: never;
  maxSelected?: never;
  selectedId?: never;
  onSelect?: never;
}

export interface MultiRefrigerantPickerProps extends PickerBaseProps {
  mode: "multi";
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxSelected?: number;
  value?: never;
  onChange?: never;
  onClear?: never;
  selectedId?: never;
  onSelect?: never;
}

export type RefrigerantPickerProps =
  SingleRefrigerantPickerProps | MultiRefrigerantPickerProps;

function foldSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

function searchableText(r: Refrigerant) {
  return foldSearch(
    [r.designation, r.name.fi, r.name.en, r.cas ?? "", ...r.aliases].join(" "),
  );
}

function RefrigerantResult({
  r,
  active,
  multi,
  disabled,
  onChoose,
  onFavouriteToggled,
}: {
  r: Refrigerant;
  active: boolean;
  multi: boolean;
  disabled: boolean;
  onChoose: () => void;
  onFavouriteToggled: (added: boolean) => void;
}) {
  const { data, t } = useApp();
  const { locale } = data;
  const family = familyText(locale, r.family);
  const actionLabel = multi
    ? `${t(active ? "removeCompare" : "addCompare")} ${r.designation}`
    : `${refinementText(locale, "chooseRefrigerant")} ${r.designation}`;

  return (
    <div className="refrigerant-row picker-result">
      <button
        className="refrigerant-link"
        type="button"
        aria-label={actionLabel}
        aria-pressed={active}
        disabled={disabled}
        onClick={onChoose}
      >
        <span>
          <strong className="mono">{r.designation}</strong>
          <span className="secondary">{family}</span>
        </span>
        {active ? (
          <Check
            className="picker-selected-icon"
            size={20}
            aria-hidden="true"
          />
        ) : (
          <ChevronRight size={20} aria-hidden="true" />
        )}
      </button>
      <div className="picker-result-favourite">
        <StarButton r={r} onToggled={onFavouriteToggled} />
      </div>
    </div>
  );
}

export function RefrigerantPicker(props: RefrigerantPickerProps) {
  const { data, t } = useApp();
  const inputId = useId();
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hasResultsBelow, setHasResultsBelow] = useState(false);
  const [sessionFavouriteIds, setSessionFavouriteIds] = useState(
    data.favourites,
  );
  const [favouriteMessage, setFavouriteMessage] = useState("");
  const sessionFavouriteSet = useMemo(
    () => new Set(sessionFavouriteIds),
    [sessionFavouriteIds],
  );
  const foldedQuery = foldSearch(query.trim());

  const results = useMemo(() => {
    const matches = dataset.refrigerants.filter(
      (r) => !foldedQuery || searchableText(r).includes(foldedQuery),
    );
    return matches.sort((a, b) => {
      const aIndex = sessionFavouriteIds.indexOf(a.id);
      const bIndex = sessionFavouriteIds.indexOf(b.id);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return 0;
    });
  }, [sessionFavouriteIds, foldedQuery]);

  const favourites = results.filter((r) => sessionFavouriteSet.has(r.id));
  const others = results.filter((r) => !sessionFavouriteSet.has(r.id));
  const selectedIds = props.mode === "multi" ? props.selectedIds : [];
  const selectedCount = selectedIds.length;
  const selectedRefrigerant =
    props.mode !== "multi" && props.value ? byId.get(props.value) : undefined;
  const limit = props.mode === "multi" ? (props.maxSelected ?? 3) : Infinity;

  useEffect(
    () => setExpanded(false),
    [props.mode, props.mode === "multi" ? undefined : props.value],
  );

  useEffect(() => {
    if (expanded) {
      dialogRef.current?.showModal();
      // Keep the list visible on touch devices; desktop search stays ready.
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        document.getElementById(inputId)?.focus();
      }
    } else {
      dialogRef.current?.close();
    }
  }, [expanded, inputId]);

  useEffect(() => {
    if (!expanded) return;
    const viewport = window.visualViewport;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const resize = () => {
      dialogRef.current?.style.setProperty(
        "--picker-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`,
      );
      dialogRef.current?.style.setProperty(
        "--picker-offset-top",
        `${viewport?.offsetTop ?? 0}px`,
      );
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
    };
  }, [expanded]);

  useEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = 0;
  }, [query]);

  useEffect(() => {
    if (!expanded) {
      setHasResultsBelow(false);
      return;
    }
    const resultsElement = resultsRef.current;
    if (!resultsElement) return;

    const updateContinuation = () => {
      const remaining =
        resultsElement.scrollHeight -
        resultsElement.clientHeight -
        resultsElement.scrollTop;
      setHasResultsBelow(remaining > 2);
    };

    updateContinuation();
    resultsElement.addEventListener("scroll", updateContinuation, {
      passive: true,
    });
    const resizeObserver = new ResizeObserver(updateContinuation);
    resizeObserver.observe(resultsElement);
    Array.from(resultsElement.children).forEach((child) =>
      resizeObserver.observe(child),
    );
    window.addEventListener("resize", updateContinuation);
    return () => {
      resultsElement.removeEventListener("scroll", updateContinuation);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateContinuation);
    };
  }, [expanded, results.length, query]);

  function toggleCompared(id: string) {
    if (props.mode !== "multi") return;
    props.onToggle(id);
    const nextCount = props.selectedIds.includes(id)
      ? selectedCount - 1
      : selectedCount + 1;
    if (nextCount >= 2) {
      setExpanded(false);
      requestAnimationFrame(() => changeButtonRef.current?.focus());
    }
  }

  function setQueryForSession(value: string) {
    setQuery(value);
    setSessionFavouriteIds(data.favourites);
  }

  function openPicker() {
    setSessionFavouriteIds(data.favourites);
    setExpanded(true);
  }

  function renderResult(r: Refrigerant) {
    const active =
      props.mode === "multi"
        ? props.selectedIds.includes(r.id)
        : props.value === r.id;
    const disabled =
      props.mode === "multi" && !active && selectedCount >= limit;
    return (
      <RefrigerantResult
        key={r.id}
        r={r}
        active={active}
        multi={props.mode === "multi"}
        disabled={disabled}
        onFavouriteToggled={(added) => {
          setFavouriteMessage(
            `${r.designation} ${data.locale === "fi" ? (added ? "lisätty suosikkeihin" : "poistettu suosikeista") : added ? "added to favourites" : "removed from favourites"}`,
          );
        }}
        onChoose={() => {
          if (props.mode === "multi") {
            toggleCompared(r.id);
          } else {
            props.onChange(r.id);
            setExpanded(false);
            setQueryForSession("");
            requestAnimationFrame(() => changeButtonRef.current?.focus());
          }
        }}
      />
    );
  }

  return (
    <section
      className="refrigerant-picker"
      aria-label={props.label ?? t("search")}
    >
      {props.mode === "multi" ? (
        <>
          {selectedIds.length > 0 && (
            <div
              className="picker-selected-list"
              role="group"
              aria-label={t("compareCount", { count: selectedCount })}
            >
              {selectedIds.map((id) => {
                const r = byId.get(id);
                if (!r) return null;
                return (
                  <button
                    className="picker-selected-chip"
                    type="button"
                    key={id}
                    aria-label={`${t("removeCompare")} ${r.designation}`}
                    onClick={() => toggleCompared(id)}
                  >
                    <span className="mono">{r.designation}</span>
                    <X size={16} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
          <button
            ref={changeButtonRef}
            className="secondary-button picker-disclosure-button"
            type="button"
            aria-expanded={expanded}
            onClick={() => {
              if (expanded) setExpanded(false);
              else openPicker();
            }}
          >
            {expanded
              ? t("done")
              : selectedCount > 0
                ? refinementText(data.locale, "editCompareSelection")
                : t("selectRefrigerant")}
          </button>
        </>
      ) : (
        <>
          <button
            ref={changeButtonRef}
            className="secondary-button picker-disclosure-button picker-compact-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={expanded}
            aria-label={
              props.value
                ? `${refinementText(data.locale, "changeSelection")}: ${selectedRefrigerant?.designation ?? props.value}`
                : t("selectRefrigerant")
            }
            onClick={openPicker}
          >
            <span>
              {props.value ? (
                <span className="picker-current">
                  <strong className="mono">
                    {selectedRefrigerant?.designation ?? props.value}
                  </strong>
                  {selectedRefrigerant && (
                    <span className="caption secondary">
                      {familyText(data.locale, selectedRefrigerant.family)}
                    </span>
                  )}
                </span>
              ) : (
                t("selectRefrigerant")
              )}
            </span>
            <Search size={20} aria-hidden="true" />
          </button>
          {props.onClear && props.value && (
            <button
              type="button"
              className="text-button"
              onClick={() => props.onClear?.()}
            >
              {refinementText(data.locale, "clearSelection")}
            </button>
          )}
        </>
      )}
      <dialog
        ref={dialogRef}
        className="picker-dialog"
        aria-labelledby={`${inputId}-title`}
        onCancel={() => setExpanded(false)}
        onClose={() => setExpanded(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setExpanded(false);
        }}
      >
        {expanded && (
          <div className="picker-dialog-content">
            <div className="picker-dialog-heading">
              <h2 id={`${inputId}-title`}>{t("selectRefrigerant")}</h2>
              <button
                type="button"
                className="icon-button"
                aria-label={
                  data.locale === "fi"
                    ? "Sulje kylmäainevalinta"
                    : "Close refrigerant selection"
                }
                onClick={() => setExpanded(false)}
              >
                <X size={22} />
              </button>
            </div>
            <div className="picker-search-row">
              {props.mode === "multi" && (
                <label className="picker-search-label" htmlFor={inputId}>
                  {props.label ?? t("search")}
                </label>
              )}
              <span className="search-field">
                <Search size={20} aria-hidden="true" />
                <input
                  id={inputId}
                  type="search"
                  name="refrigerant-query"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="search"
                  value={query}
                  onChange={(event) => {
                    setQueryForSession(event.target.value);
                  }}
                  placeholder={t("searchHint")}
                  aria-label={props.label ?? t("search")}
                />
                {query && (
                  <button
                    className="icon-button picker-clear-search"
                    type="button"
                    aria-label={t("clearSearch")}
                    onClick={() => setQueryForSession("")}
                  >
                    <X size={18} />
                  </button>
                )}
              </span>
            </div>
            <span
              className="picker-live-message"
              aria-live="polite"
              aria-atomic="true"
            >
              {favouriteMessage}
            </span>
            <p className="caption mono picker-result-count" aria-live="polite">
              {t("results", { count: results.length })}
              {props.mode === "multi" &&
                ` · ${t("compareCount", { count: selectedCount })}`}
            </p>
            <div className="picker-results" ref={resultsRef}>
              {results.length === 0 ? (
                <p className="empty">{t("noResults")}</p>
              ) : (
                <>
                  {favourites.length > 0 && (
                    <div className="picker-group">
                      <h3>{t("favourites")}</h3>
                      {favourites.map(renderResult)}
                    </div>
                  )}
                  {others.length > 0 && (
                    <div className="picker-group">
                      {favourites.length > 0 && <h3>{t("all")}</h3>}
                      {others.map(renderResult)}
                    </div>
                  )}
                </>
              )}
            </div>
            {hasResultsBelow && (
              <div className="picker-continuation-cue" aria-hidden="true">
                <ChevronDown size={16} />
              </div>
            )}
          </div>
        )}
      </dialog>
    </section>
  );
}

export function getRefrigerant(id: string) {
  return byId.get(id);
}
