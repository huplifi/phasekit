import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Search, X } from "lucide-react";
import { useApp } from "../context";
import { Back } from "../components/Common";
import { ExclusiveChoices } from "../components/ExclusiveChoices";
import {
  symbols,
  symbolSources,
  categoryLabels,
  representationLabels,
  statusLabels,
  searchSymbols,
  type SchematicSymbol,
} from "../symbols";
import "../symbols.css";

type Domain = "cold" | "electrical";
function SymbolImage({
  symbol,
  large = false,
}: {
  symbol: SchematicSymbol;
  large?: boolean;
}) {
  return (
    <span
      className={`schematic-symbol-image${large ? " schematic-symbol-image-large" : ""}`}
      aria-hidden="true"
      style={
        {
          "--schematic-symbol-url": `url("/symbols/${encodeURI(symbol.file)}")`,
        } as CSSProperties
      }
    />
  );
}
const detailText = (value: string | string[] | number[] | undefined) =>
  Array.isArray(value) ? value.join(", ") : (value ?? "");

export function Symbols() {
  const { data } = useApp();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const [domain, setDomain] = useState<Domain>("cold");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<SchematicSymbol | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const id = useId();
  const label = (
    labels: Record<string, { fi: string; en: string }>,
    key: string,
  ) => labels[key]?.[data.locale] ?? key;
  const name = (symbol: SchematicSymbol) =>
    data.locale === "fi" ? symbol.name_fi : symbol.name_en;
  const domainSymbols = useMemo(
    () =>
      symbols.filter((symbol) =>
        domain === "cold"
          ? symbol.category === "kylmakierto"
          : symbol.category !== "kylmakierto",
      ),
    [domain],
  );
  const categories = useMemo(
    () => [...new Set(domainSymbols.map((symbol) => symbol.category))],
    [domainSymbols],
  );
  const matches = useMemo(
    () => searchSymbols(query, domain, category || undefined),
    [query, domain, category],
  );

  useEffect(() => {
    const element = dialog.current;
    if (!selected) {
      if (element?.open) element.close();
      trigger.current?.focus({ preventScroll: true });
      return;
    }
    if (element && !element.open) element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  return (
    <div className="schematic-symbols">
      <Back to="/tools" />
      <h1>{l("Kaaviosymbolit", "Schematic symbols")}</h1>
      <p className="secondary">
        {l(
          "Tunnista symboli ja avaa sen käyttötarkoitus sekä lähdetiedot.",
          "Identify a symbol and open its purpose and source details.",
        )}
      </p>
      <ExclusiveChoices
        label={l("Symbolien aihealue", "Symbol domain")}
        value={domain}
        options={[
          { value: "cold", label: l("Kylmä", "Refrigeration") },
          { value: "electrical", label: l("Sähkö", "Electrical") },
        ]}
        onChange={(next) => {
          setDomain(next);
          setCategory("");
        }}
      />
      <div className="schematic-symbol-filters">
        <label
          className="schematic-symbol-search-label"
          htmlFor={`${id}-search`}
        >
          {l("Hae symboleja", "Search symbols")}
          <span className="search-field">
            <Search size={20} aria-hidden="true" />
            <input
              id={`${id}-search`}
              type="search"
              value={query}
              autoComplete="off"
              placeholder={
                domain === "cold"
                  ? l("Esim. kompressori", "E.g. compressor")
                  : l("Esim. kosketin", "E.g. contact")
              }
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                className="icon-button"
                aria-label={l("Tyhjennä haku", "Clear search")}
                onClick={() => setQuery("")}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </span>
        </label>
        {categories.length > 1 && (
          <label>
            {l("Ryhmä", "Category")}
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">{l("Kaikki ryhmät", "All categories")}</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {label(categoryLabels, value)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="caption secondary schematic-symbol-count" role="status">
        {l(`${matches.length} symbolia`, `${matches.length} symbols`)}
      </p>
      {matches.length ? (
        <div className="schematic-symbol-grid">
          {matches.map((symbol) => (
            <button
              type="button"
              className="schematic-symbol-card"
              key={symbol.id}
              aria-label={name(symbol)}
              aria-haspopup="dialog"
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(symbol);
              }}
            >
              <SymbolImage symbol={symbol} />
              <strong>{name(symbol)}</strong>
              <span className="schematic-symbol-meta">
                {label(representationLabels, symbol.representation)}
              </span>
              {symbol.status !== "lahdevertailtu" && (
                <span className="schematic-symbol-status">
                  {label(statusLabels, symbol.status)}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="empty">
          {l(
            "Tästä aihealueesta ei löytynyt symboleja. Kokeile toista hakusanaa tai ryhmää.",
            "No symbols found in this domain. Try another search term or category.",
          )}
        </p>
      )}
      <dialog
        ref={dialog}
        className="schematic-symbol-dialog"
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          event.preventDefault();
          setSelected(null);
        }}
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
      >
        {selected && (
          <div className="schematic-symbol-detail">
            <header className="schematic-symbol-dialog-heading">
              <h2 id={`${id}-title`}>{name(selected)}</h2>
              <button
                ref={closeButton}
                type="button"
                className="icon-button"
                aria-label={l("Sulje symbolin tiedot", "Close symbol details")}
                onClick={() => setSelected(null)}
              >
                <X size={24} aria-hidden="true" />
              </button>
            </header>
            <p
              className="schematic-symbol-alternate caption secondary"
              lang={data.locale === "fi" ? "en" : "fi"}
            >
              {data.locale === "fi" ? selected.name_en : selected.name_fi}
            </p>
            {selected.aliases_fi.length > 0 && (
              <p className="caption secondary schematic-symbol-aliases">
                {l("Muut hakunimet", "Finnish search aliases")}:{" "}
                <span lang="fi">{selected.aliases_fi.join(" · ")}</span>
              </p>
            )}
            <div className="schematic-symbol-preview">
              <SymbolImage symbol={selected} large />
            </div>
            <dl className="schematic-symbol-facts">
              <div>
                <dt>{l("Ryhmä", "Category")}</dt>
                <dd>{label(categoryLabels, selected.category)}</dd>
              </div>
              <div>
                <dt>{l("Esitystapa", "Representation")}</dt>
                <dd>{label(representationLabels, selected.representation)}</dd>
              </div>
              <div>
                <dt>{l("Tarkistuksen tila", "Checking status")}</dt>
                <dd>{label(statusLabels, selected.status)}</dd>
              </div>
            </dl>
            {data.locale === "en" && (
              <p className="caption secondary">
                Original descriptions and source notes below are in Finnish.
              </p>
            )}
            <section>
              <h3>{l("Käyttötarkoitus", "Purpose")}</h3>
              <p lang="fi">{selected.purpose}</p>
            </section>
            {selected.notes.length > 0 && (
              <section>
                <h3>{l("Huomioita", "Notes")}</h3>
                <p lang="fi">{selected.notes}</p>
              </section>
            )}
            <details className="schematic-symbol-sources">
              <summary>
                {l("Lähteet ja rajaukset", "Sources and scope")}
              </summary>
              {selected.sources.length > 0 ? (
                <ul>
                  {selected.sources.map((reference, index) => {
                    const source = symbolSources[reference.source];
                    return (
                      <li key={`${reference.source}-${index}`}>
                        {source?.url ? (
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                        ) : (
                          <strong>{source?.title ?? reference.source}</strong>
                        )}
                        {detailText(reference.pages) && (
                          <p className="caption">
                            {l("Sivut", "Pages")}: {detailText(reference.pages)}
                          </p>
                        )}
                        {detailText(reference.labels) && (
                          <p className="caption">
                            {detailText(reference.labels)}
                          </p>
                        )}
                        {source?.note && (
                          <p className="caption secondary" lang="fi">
                            {source.note}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="caption secondary">
                  {l(
                    "Tälle symbolille ei ole yksilöityä lähdeviitettä.",
                    "No individual source reference is recorded for this symbol.",
                  )}
                </p>
              )}
              <p>
                <a
                  href="https://huplifi.github.io/kylmasentaja-keuda-public/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {l("Opintojen symbolikirjasto", "Study symbol library")}
                </a>
              </p>
              <p className="caption secondary">
                {l(
                  "Omat opetuspiirrokset, eivät virallinen standardijulkaisu.",
                  "Original teaching illustrations, not an official standards publication.",
                )}
              </p>
              <p className="caption secondary">
                {l(
                  "Tarkista symbolin merkitys myös käytettävän kaavion selitteestä. Esitystapa voi vaihdella.",
                  "Check the symbol against the legend of the schematic in use. Representations may vary.",
                )}
              </p>
            </details>
          </div>
        )}
      </dialog>
    </div>
  );
}
