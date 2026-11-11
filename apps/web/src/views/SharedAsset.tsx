import "./asset-sharing.css";
import { useState } from "react";
import { useApp } from "../context";
import { readSharedAsset, importAssetSnapshot } from "../asset-sharing";
import type { AssetSnapshot } from "../asset-snapshot";
import { assetPath } from "../asset-qr";
import { AssetHistory } from "../components/AssetHistory";

export function SharedAsset({ id }: { id: string }) {
  const { data, setData, go } = useApp();
  const fi = data.locale === "fi";
  const [code, setCode] = useState("");
  const [snapshot, setSnapshot] = useState<AssetSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function read() {
    setBusy(true);
    setError("");
    try {
      setSnapshot(await readSharedAsset(id, code));
      setCode("");
    } catch {
      setError(
        fi
          ? "Tietoja ei voitu avata. Tarkista tarran lukukoodi ja verkkoyhteys."
          : "Could not open records. Check the label’s read code and your connection.",
      );
    } finally {
      setBusy(false);
    }
  }
  function importLocal() {
    if (!snapshot) return;
    try {
      // Validate before applying; never overwrite a local record with the same ID.
      const next = importAssetSnapshot(data, snapshot);
      setData(next);
      go(assetPath(snapshot.assetType, snapshot.assetId));
    } catch {
      setError(
        fi
          ? "Tällä laitteella on jo samalla tunnisteella eri tietoja. Tuonti keskeytettiin: paikallisia tietoja ei korvattu. Jaettua kopiota voi lukea tässä."
          : "This device has different records with the same identifier. Import stopped without replacing local records. You can continue reading the shared copy here.",
      );
    }
  }
  const root =
    snapshot?.assetType === "site"
      ? snapshot.data.sites[0]
      : snapshot?.data.equipment[0];
  return (
    <section className="section asset-detail">
      <h1>{root?.name ?? (fi ? "Avaa jaettu kohde" : "Open shared asset")}</h1>
      {!snapshot ? (
        <>
          <p>
            {fi
              ? "Syötä QR-tarrassa näkyvä erillinen lukukoodi. Linkki ei yksin anna pääsyä tietoihin. Lukukoodia ei tallenneta tähän laitteeseen."
              : "Enter the separate read code printed on the QR label. The link alone does not grant access. The read code is not stored on this device."}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void read();
            }}
          >
            <label>
              {fi ? "Lukukoodi" : "Read code"}
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={40}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy
                ? fi
                  ? "Avataan…"
                  : "Opening…"
                : fi
                  ? "Avaa tiedot"
                  : "Open records"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="notice">
            {fi
              ? "Jaettu palvelinkopio · vain luku"
              : "Shared server snapshot · read only"}
            <br />
            {new Date(snapshot.publishedAt).toLocaleString(
              fi ? "fi-FI" : "en-GB",
            )}
          </p>
          <p>
            {fi
              ? "Tämä on erikseen jaettu kopio. Uudemmat paikalliset kirjaukset näkyvät vasta, kun omistaja päivittää palvelinkopion."
              : "This is an explicitly shared copy. Newer local records appear when the owner updates the server snapshot."}
          </p>
          <p>
            {snapshot.data.sites
              .map((site) =>
                [site.name, site.address].filter(Boolean).join(" · "),
              )
              .join(" · ")}
          </p>
          {snapshot.data.equipment.map((item) => (
            <details key={item.id} className="asset-record">
              <summary>{item.name}</summary>
              <p>
                {[item.model, item.serialNumber, item.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p>{item.notes}</p>
            </details>
          ))}
          <button className="secondary-button" onClick={importLocal}>
            {fi
              ? "Tuo tälle laitteelle ja jatka työkaluissa"
              : "Import to this device and continue in Tools"}
          </button>
          <p className="caption secondary">
            {fi
              ? "Tuonti tallentaa jaetut tiedot tälle laitteelle. Se ei anna palvelinkopion muokkausavainta eikä korvaa ristiriitaisia paikallisia tietoja. Tuonnin jälkeen voit aloittaa kylmäraportin esitäytetyillä laitetiedoilla."
              : "Import saves shared records on this device. It does not grant the server editing key or replace conflicting local records. You can then start a refrigeration report with equipment details prefilled."}
          </p>
          <AssetHistory snapshot={snapshot} fi={fi} />
        </>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
