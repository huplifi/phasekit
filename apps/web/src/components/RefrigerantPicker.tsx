import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";
import type { Refrigerant } from "../../../../packages/core/src/contracts";
import {
  refinementText,
  familyText,
} from "../../../../packages/i18n/src/refinements";
import { byId, dataset } from "../data";
import { useApp } from "../context";
import { StarButton } from "./Common";

interface PickerBaseProps {
  label?: string;
  initialLimit?: number;
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
}: {
  r: Refrigerant;
  active: boolean;
  multi: boolean;
  disabled: boolean;
  onChoose: () => void;
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
        <StarButton r={r} />
      </div>
    </div>
  );
}

export function RefrigerantPicker(props: RefrigerantPickerProps) {
  const { data, t } = useApp();
  const inputId = useId();
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const initialLimit = Math.max(props.initialLimit ?? 6, 1);
  const favouriteIds = data.favourites;
  const favouriteSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);
  const foldedQuery = foldSearch(query.trim());

  const results = useMemo(() => {
    const matches = dataset.refrigerants.filter(
      (r) =>
        (!favouritesOnly || favouriteIds.includes(r.id)) &&
        (!foldedQuery || searchableText(r).includes(foldedQuery)),
    );
    return matches.sort((a, b) => {
      const aIndex = favouriteIds.indexOf(a.id);
      const bIndex = favouriteIds.indexOf(b.id);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return 0;
    });
  }, [favouriteIds, foldedQuery, favouritesOnly]);

  const visibleResults = showAll ? results : results.slice(0, initialLimit);
  const favourites = visibleResults.filter((r) => favouriteSet.has(r.id));
  const others = visibleResults.filter((r) => !favouriteSet.has(r.id));
  const selectedIds = props.mode === "multi" ? props.selectedIds : [];
  const selectedCount = selectedIds.length;
  const selectedRefrigerant =
    props.mode !== "multi" && props.value ? byId.get(props.value) : undefined;
  const limit = props.mode === "multi" ? (props.maxSelected ?? 3) : Infinity;
  const hasMore = results.length > initialLimit;

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
        onChoose={() => {
          if (props.mode === "multi") {
            toggleCompared(r.id);
          } else {
            props.onChange(r.id);
            setExpanded(false);
            setQuery("");
            setShowAll(false);
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
            onClick={() => setExpanded((value) => !value)}
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
            onClick={() => setExpanded(true)}
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
                    setQuery(event.target.value);
                    setShowAll(false);
                  }}
                  placeholder={t("searchHint")}
                  aria-label={props.label ?? t("search")}
                />
                {query && (
                  <button
                    className="icon-button picker-clear-search"
                    type="button"
                    aria-label={t("clearSearch")}
                    onClick={() => setQuery("")}
                  >
                    <X size={18} />
                  </button>
                )}
              </span>
            </div>
            <div
              className="picker-scope"
              role="group"
              aria-label={
                data.locale === "fi"
                  ? "Näytettävät kylmäaineet"
                  : "Refrigerants to show"
              }
            >
              <button
                type="button"
                aria-pressed={!favouritesOnly}
                onClick={() => {
                  setFavouritesOnly(false);
                  setShowAll(false);
                }}
              >
                {data.locale === "fi" ? "Kaikki" : "All"}
              </button>
              <button
                type="button"
                aria-pressed={favouritesOnly}
                onClick={() => {
                  setFavouritesOnly(true);
                  setShowAll(false);
                }}
              >
                {t("favourites")}
              </button>
            </div>
            <p className="caption picker-result-count" aria-live="polite">
              {t("results", { count: results.length })}
              {props.mode === "multi" &&
                ` · ${t("compareCount", { count: selectedCount })}`}
            </p>
            <div className="picker-results">
              {results.length === 0 ? (
                <p className="empty">
                  {favouritesOnly && !favouriteIds.length
                    ? data.locale === "fi"
                      ? "Ei suosikkeja vielä. Lisää aine suosikiksi Kaikki-listan tähdestä."
                      : "No favourites yet. Add one using its star in the All list."
                    : t("noResults")}
                </p>
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
                  {hasMore && (
                    <button
                      className="text-button picker-more"
                      type="button"
                      onClick={() => setShowAll((value) => !value)}
                    >
                      {showAll
                        ? refinementText(data.locale, "showFewerResults")
                        : refinementText(data.locale, "showMoreResults", {
                            count: results.length - initialLimit,
                          })}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

export function getRefrigerant(id: string) {
  return byId.get(id);
}
