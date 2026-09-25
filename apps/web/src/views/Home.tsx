import { useMemo, useRef, useState } from "react";
import {
  Search,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  GripVertical,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { dataset, byId, getFact, factKeys } from "../data";
import { searchRefrigerants } from "../../../../packages/refrigerant-data/src";
import {
  familyText,
  safetyGroupOrder,
} from "../../../../packages/i18n/src/refinements";
import { useApp } from "../context";
import {
  RefrigerantRow,
  SafetyGroupHelp,
  StarButton,
} from "../components/Common";
export function Home() {
  const { t, data, setData, go } = useApp();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const [edit, setEdit] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [family, setFamily] = useState("");
  const [safety, setSafety] = useState("");
  const [kind, setKind] = useState("");
  const [support, setSupport] = useState(false);
  const dragged = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searching =
    all || query.length > 0 || !!family || !!safety || !!kind || support;
  const results = useMemo(() => {
    const matches = query
      ? searchRefrigerants(query).map((m) => m.refrigerant)
      : dataset.refrigerants;
    return matches.filter(
      (r) =>
        (!family || r.family === family) &&
        (!safety || String(getFact(r, ...factKeys.safety)?.value) === safety) &&
        (!kind || r.kind === kind) &&
        (!support || r.coverage.regulatory_eu_fi === "verified"),
    );
  }, [query, family, safety, kind, support]);
  const favourites = data.favourites
    .map((id) => byId.get(id))
    .filter((r) => r !== undefined);
  const recent = data.recent
    .map((id) => byId.get(id))
    .filter((r) => r !== undefined);
  function move(id: string, offset: number) {
    setData((d) => {
      const favourites = [...d.favourites];
      const index = favourites.indexOf(id);
      const to = index + offset;
      if (index < 0 || to < 0 || to >= favourites.length) return d;
      favourites.splice(index, 1);
      favourites.splice(to, 0, id);
      return { ...d, favourites };
    });
  }
  function drop(target: string) {
    if (dragged.current) {
      const current = dragged.current;
      setData((d) => {
        const favourites = [...d.favourites];
        const from = favourites.indexOf(current),
          to = favourites.indexOf(target);
        if (from < 0 || to < 0) return d;
        favourites.splice(from, 1);
        favourites.splice(to, 0, current);
        return { ...d, favourites };
      });
      dragged.current = null;
    }
  }
  return (
    <>
      <h1>{t("refrigerants")}</h1>
      <div className="search-field">
        <Search size={22} />
        <input
          ref={searchRef}
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            className="icon-button"
            aria-label={t("clearSearch")}
            onClick={() => {
              setQuery("");
              searchRef.current?.focus();
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>
      {searching ? (
        <>
          <details className="filter-panel">
            <summary>
              <SlidersHorizontal size={18} />
              {t("filters")}
            </summary>
            <div className="form-grid">
              <label>
                {t("family")}
                <select
                  id="family-filter"
                  value={family}
                  onChange={(e) => setFamily(e.target.value)}
                >
                  <option value="">{t("allFamilies")}</option>
                  {[...new Set(dataset.refrigerants.map((r) => r.family))]
                    .sort((a, b) =>
                      familyText(data.locale, a).localeCompare(
                        familyText(data.locale, b),
                        data.locale,
                      ),
                    )
                    .map((v) => (
                      <option key={v} value={v}>
                        {familyText(data.locale, v)}
                      </option>
                    ))}
                </select>
              </label>
              <div>
                <div className="help-heading">
                  <label htmlFor="safety-filter">{t("safety")}</label>
                  <SafetyGroupHelp />
                </div>
                <select
                  id="safety-filter"
                  value={safety}
                  onChange={(e) => setSafety(e.target.value)}
                >
                  <option value="">{t("allSafety")}</option>
                  {safetyGroupOrder
                    .filter((group) =>
                      dataset.refrigerants.some(
                        (r) =>
                          String(
                            getFact(r, ...factKeys.safety)?.value ?? "",
                          ) === group,
                      ),
                    )
                    .map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                </select>
              </div>
              <label>
                {t("identity")}
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="">{t("allKinds")}</option>
                  <option value="pure">{t("pure")}</option>
                  <option value="blend">{t("blend")}</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={support}
                  onChange={(e) => setSupport(e.target.checked)}
                />
                {t("checkSupported")}
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setFamily("");
                  setSafety("");
                  setKind("");
                  setSupport(false);
                }}
              >
                {t("clearFilters")}
              </button>
            </div>
          </details>
          <section className="section">
            <div className="section-heading">
              <h2>{t("results", { count: results.length })}</h2>
              <button
                className="text-button"
                onClick={() => {
                  setAll(false);
                  setQuery("");
                  setFamily("");
                  setSafety("");
                  setKind("");
                  setSupport(false);
                }}
              >
                {t("back")}
              </button>
            </div>
            {query &&
              searchRefrigerants(query).some(
                (m) => m.match === "suggested",
              ) && <p className="notice">{t("searchSuggestions")}</p>}
            {results.length ? (
              results.map((r) => <RefrigerantRow key={r.id} r={r} />)
            ) : (
              <p className="empty">{t("noResults")}</p>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="section">
            <div className="section-heading">
              <h2>{t("favourites")}</h2>
              {favourites.length > 0 && (
                <button className="text-button" onClick={() => setEdit(!edit)}>
                  {t(edit ? "done" : "edit")}
                </button>
              )}
            </div>
            {favourites.length ? (
              (expanded || edit ? favourites : favourites.slice(0, 6)).map(
                (r, index) => (
                  <div key={r.id} data-favourite-id={r.id}>
                    <RefrigerantRow r={r}>
                      {edit ? (
                        <div className="row-controls">
                          <button
                            className="icon-button drag-handle"
                            aria-label={`${t("drag")} ${r.designation}`}
                            onPointerDown={(e) => {
                              dragged.current = r.id;
                              e.currentTarget.setPointerCapture(e.pointerId);
                            }}
                            onPointerUp={(e) => {
                              if (
                                e.currentTarget.hasPointerCapture(e.pointerId)
                              )
                                e.currentTarget.releasePointerCapture(
                                  e.pointerId,
                                );
                              const target = document
                                .elementFromPoint(e.clientX, e.clientY)
                                ?.closest<HTMLElement>("[data-favourite-id]")
                                ?.dataset.favouriteId;
                              if (target) drop(target);
                              else dragged.current = null;
                            }}
                            onPointerCancel={() => {
                              dragged.current = null;
                            }}
                          >
                            <GripVertical size={16} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={index === 0}
                            aria-label={t("moveUp", { name: r.designation })}
                            onClick={() => move(r.id, -1)}
                          >
                            <ArrowUp size={18} />
                          </button>
                          <button
                            className="icon-button"
                            disabled={index === favourites.length - 1}
                            aria-label={t("moveDown", { name: r.designation })}
                            onClick={() => move(r.id, 1)}
                          >
                            <ArrowDown size={18} />
                          </button>
                          <StarButton r={r} />
                        </div>
                      ) : undefined}
                    </RefrigerantRow>
                  </div>
                ),
              )
            ) : (
              <div className="empty">
                <p className="secondary">{t("emptyFavouritesBody")}</p>
              </div>
            )}
            {favourites.length > 6 && !edit && (
              <button
                className="text-button"
                onClick={() => setExpanded(!expanded)}
              >
                {t(expanded ? "less" : "more")}
              </button>
            )}
            <button className="primary all-link" onClick={() => setAll(true)}>
              {t("all")}
              <ArrowRight size={20} />
            </button>
          </section>
          {recent.length > 0 && (
            <section className="section">
              <h2>{t("recent")}</h2>
              {recent.slice(0, 5).map((r) => (
                <RefrigerantRow key={r.id} r={r} />
              ))}
            </section>
          )}
        </>
      )}
      <div className="comparison-link">
        {data.favourites.some((id) => !byId.has(id)) && (
          <p className="caption">{t("missingSavedId")}</p>
        )}
        <button className="text-button" onClick={() => go("/compare")}>
          {t("compare")}
          <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
