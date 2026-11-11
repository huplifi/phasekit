import { useMemo, useEffect, useState } from "react";
import { useApp } from "../context";
import { assetPath, sharedAssetUrl } from "../asset-qr";
import { createSharedAssetLink } from "../asset-sharing-types";
import type { AssetType } from "../asset-sharing-types";
import {
  buildAssetSnapshot,
  snapshotFingerprint,
  newColdReport,
  publishAsset,
  recoverAssetReceipt,
  revokeSharedAsset,
} from "../asset-sharing";
import { AssetQr } from "../components/AssetQr";
import { AssetHistory } from "../components/AssetHistory";
import "./reports.css";
import "./asset-sharing.css";

export function AssetDetail({ path }: { path: string }) {
  const { data, setData, go, persistSharedLink, persistenceStatus } = useApp();
  const fi = data.locale === "fi";
  const parts = path.split("/");
  const type: AssetType = parts[2] === "site" ? "site" : "equipment";
  let id = "";
  try {
    id = decodeURIComponent(parts[3] ?? "");
  } catch {
    /* invalid asset */
  }
  const equipment =
    type === "equipment"
      ? data.equipment.find((item) => item.id === id)
      : undefined;
  const site = data.sites?.find(
    (item) => item.id === (type === "site" ? id : equipment?.siteId),
  );
  const root = type === "site" ? site : equipment;
  const link = data.sharedLinks?.find(
    (item) => item.assetType === type && item.assetId === id,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState<
    "matched" | "different" | null
  >(null);
  const snapshot = useMemo(
    () => (root ? buildAssetSnapshot(data, type, id) : null),
    [data, type, id, root],
  );
  useEffect(() => {
    let active = true;
    if (snapshot)
      void snapshotFingerprint(snapshot).then((value) => {
        if (active) setFingerprint(value);
      });
    return () => {
      active = false;
    };
  }, [snapshot]);
  if (!root || !snapshot)
    return (
      <section>
        <h1>
          {fi
            ? "Kohdetta ei löydy tältä laitteelta"
            : "Asset is not stored on this device"}
        </h1>
        <p>
          {fi
            ? "Avaa jaettu QR-linkki lukukoodilla tai tuo varmuuskopio."
            : "Open the shared QR link with its read code, or import a backup."}
        </p>
        <a href="#/equipment">
          {fi ? "Kohteet ja laitteet" : "Sites and equipment"}
        </a>
      </section>
    );
  const foreignOrigin = Boolean(link && link.origin !== window.location.origin);
  const changed = Boolean(
    link?.publishedFingerprint && fingerprint !== link.publishedFingerprint,
  );
  async function publish() {
    if (!snapshot || foreignOrigin || needsRecovery) return;
    setBusy(true);
    setError("");
    try {
      const credentials =
        link ?? createSharedAssetLink(type, id, window.location.origin);
      // Persist credentials durably before the first network request. A failed
      // request retains the same random ID and secrets for an idempotent retry.
      await persistSharedLink(credentials);
      const receipt = await publishAsset(credentials, snapshot);
      await persistSharedLink({ ...credentials, ...receipt });
      setPreview(false);
      setNeedsRecovery(false);
      setRecoveryNotice(null);
    } catch (failure) {
      if (
        link?.etag &&
        !(failure instanceof Error && failure.message === "too-large")
      )
        setNeedsRecovery(true);
      setRecoveryNotice(null);
      setError(
        failure instanceof Error && failure.message === "conflict"
          ? fi
            ? "Palvelinkopion hallintatiedot ovat vanhentuneet. Päivitys on voinut onnistua vastauksen katkettua, tai kopio on muuttunut toisessa laitteessa. Palauta jaon hallintatiedot ennen jatkamista."
            : "The server receipt is out of date. An update may have succeeded before its response was lost, or another device changed the copy. Recover sharing details before continuing."
          : failure instanceof Error && failure.message === "too-large"
            ? fi
              ? "Jaettava sisältö ylittää 4 Mt. Vähennä kuvia ennen jakamista. Paikalliset tiedot säilyvät."
              : "The shared document exceeds 4 MB. Reduce images before sharing. Local data is retained."
            : link?.etag
              ? fi
                ? "Päivityksen tilaa ei voitu varmistaa. Paikalliset tiedot säilyvät. Palauta jaon hallintatiedot ennen jatkamista."
                : "The update outcome could not be confirmed. Local data is retained. Recover sharing details before continuing."
              : fi
                ? "Palvelinjako ei onnistunut. Paikalliset tiedot ja jakotunniste säilyvät; yritä uudelleen verkkoyhteydellä."
                : "Sharing failed. Local records and sharing credentials are retained; retry when connected.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!link || !snapshot || foreignOrigin) return;
    setBusy(true);
    setError("");
    try {
      const receipt = await recoverAssetReceipt(link);
      await persistSharedLink({ ...link, ...receipt });
      const localFingerprint = await snapshotFingerprint(snapshot);
      setRecoveryNotice(
        receipt.publishedFingerprint === localFingerprint
          ? "matched"
          : "different",
      );
      setNeedsRecovery(false);
      setPreview(false);
    } catch {
      setError(
        fi
          ? "Jaon hallintatietojen palautus ei onnistunut. Paikalliset tiedot säilyvät. Yritä uudelleen verkkoyhteydellä."
          : "Sharing details could not be recovered. Local data is retained. Retry when connected.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    if (
      foreignOrigin ||
      !link?.etag ||
      !window.confirm(
        fi
          ? "Suljetaanko tämä jaettu linkki? Nykyinen QR-tarra lakkaa toimimasta."
          : "Revoke this shared link? Its QR label will stop working.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await revokeSharedAsset(link);
      setData((current) => ({
        ...current,
        sharedLinks: current.sharedLinks?.filter((item) => item.id !== link.id),
      }));
    } catch (failure) {
      if (failure instanceof Error && failure.message === "conflict") {
        setNeedsRecovery(true);
        setError(
          fi
            ? "Jaon hallintatiedot ovat vanhentuneet. Palauta jaon hallintatiedot ja sulje sitten jako."
            : "Sharing details are out of date. Recover sharing details, then revoke the share.",
        );
      } else
        setError(
          fi
            ? "Jaon sulkeminen epäonnistui. Linkki voi olla yhä käytössä."
            : "Revocation failed. The link may still be active.",
        );
    } finally {
      setBusy(false);
    }
  }
  function createCold() {
    const report = newColdReport(equipment, site);
    setData((current) => ({
      ...current,
      checklistDrafts: [...current.checklistDrafts, report],
    }));
    go(`/checklists/${encodeURIComponent(report.id)}`);
  }
  return (
    <section className="section asset-detail">
      <a href="#/equipment">
        ← {fi ? "Kohteet ja laitteet" : "Sites and equipment"}
      </a>
      <h1>{root.name}</h1>
      {site && (
        <p className="secondary">
          {site.name} · {site.address}
        </p>
      )}
      {equipment && (
        <p>
          {[equipment.model, equipment.serialNumber, equipment.location]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <p className="caption" role="status">
        {persistenceStatus === "saved"
          ? fi
            ? "Tallennettu tälle laitteelle"
            : "Saved on this device"
          : persistenceStatus === "saving"
            ? fi
              ? "Tallennetaan tälle laitteelle…"
              : "Saving on this device…"
            : fi
              ? "Paikallinen tallennus epäonnistui"
              : "Local save failed"}
      </p>
      <div className="button-group">
        <button
          className="primary"
          onClick={() =>
            go(`/electrical-measurements/${type}/${encodeURIComponent(id)}`)
          }
        >
          {fi ? "Lisää sähkömittaus" : "Add electrical measurement"}
        </button>
        <button
          className="secondary-button"
          onClick={createCold}
          disabled={data.checklistDrafts.length >= 1000}
        >
          {fi ? "Aloita kylmäraportti" : "Start refrigeration report"}
        </button>
      </div>
      {type === "site" && snapshot.data.equipment.length > 0 && (
        <div className="section">
          <h2>{fi ? "Laitteet" : "Equipment"}</h2>
          {snapshot.data.equipment.map((item) => (
            <p key={item.id}>
              <a href={`#${assetPath("equipment", item.id)}`}>{item.name}</a>
            </p>
          ))}
        </div>
      )}
      <section className="section">
        <h2>
          {fi ? "Yhteinen QR ja palvelinkopio" : "Shared QR and server copy"}
        </h2>
        {foreignOrigin && link && (
          <p className="notice warning">
            {fi
              ? "Jako kuuluu toiselle sivustolle. Avaa alkuperäinen sivusto päivittääksesi tai sulkeaksesi jaon."
              : "This share belongs to another website. Open the original website to update or revoke it."}{" "}
            <a href={sharedAssetUrl(link.id, link.origin)} rel="noreferrer">
              {link.origin}
            </a>
          </p>
        )}
        <p role="status">
          {link?.publishedAt
            ? `${fi ? "Palvelinkopio" : "Server snapshot"}: ${new Date(link.publishedAt).toLocaleString(fi ? "fi-FI" : "en-GB")} · ${changed ? (fi ? "Paikalliset muutokset jakamatta" : "Local changes not shared") : fi ? "Vastaa paikallisia tietoja" : "Matches local records"}`
            : fi
              ? "Ei jaettua palvelinkopiota. Tiedot ovat vain tällä laitteella."
              : "No shared server copy. Records are only on this device."}
        </p>
        <p>
          {fi
            ? "Jakaminen lähettää kohteen tai laitteen tiedot sekä siihen liittyvät mittaukset, raportit ja historian palvelimelle. Mukaan tulevat tekijät, yhteystiedot, huomiot ja kuvat. Tietoja päivitetään vain painamalla alla olevaa painiketta."
            : "Sharing sends this asset and its related readings, reports and history to the server, including technicians, contact details, notes and images. Data updates only when you press the button below."}
        </p>
        <p>
          {fi
            ? "QR-linkki ei yksin avaa tietoja. Tarran erillinen lukukoodi avaa palvelinkopion kaikille tarran tai sen kuvan saaneille. Muokkausavain jää tälle laitteelle ja varmuuskopioon. Säilytä varmuuskopio, jotta voit päivittää tai sulkea jaon myöhemmin."
            : "The QR URL alone cannot open records. The separate read code on the label opens the server copy for anyone who has the label or its photo. The editing key remains on this device and in its backup. Keep a backup to retain update and revocation access."}
        </p>
        <button
          className="secondary-button"
          onClick={() => setPreview(!preview)}
        >
          {preview
            ? fi
              ? "Sulje jaon esikatselu"
              : "Close sharing preview"
            : fi
              ? "Esikatsele jaettava sisältö"
              : "Preview shared content"}
        </button>
        {link?.publishedAt && (
          <div className="button-group">
            <button
              className="secondary-button"
              disabled={busy || foreignOrigin || persistenceStatus !== "saved"}
              onClick={() => void recover()}
            >
              {fi ? "Palauta jaon hallintatiedot" : "Recover sharing details"}
            </button>
          </div>
        )}
        {recoveryNotice === "matched" && (
          <p className="notice" role="status">
            {fi
              ? "Jaon hallintatiedot palautettu. Palvelinkopio vastaa paikallisia tietoja."
              : "Sharing details recovered. The server copy matches local records."}
          </p>
        )}
        {recoveryNotice === "different" && link && (
          <p className="notice warning" role="status">
            {fi
              ? "Palvelinkopio eroaa paikallisista tiedoista. Se voi sisältää uudempia tietoja. Tarkista jaettu kopio lukukoodilla ennen kuin korvaat sen paikallisilla tiedoilla."
              : "The server copy differs from local records and may contain newer information. Review the shared copy with its read code before replacing it with local records."}{" "}
            <a
              href={sharedAssetUrl(link.id, link.origin)}
              target="_blank"
              rel="noreferrer"
            >
              {fi ? "Avaa palvelinkopio" : "Open server copy"}
            </a>
          </p>
        )}
        {preview && (
          <div className="asset-record">
            <h3>
              {fi
                ? "Palvelimelle lähetettävä sisältö"
                : "Content to send to the server"}
            </h3>
            <p>
              {snapshot.data.equipment.length} {fi ? "laitetta" : "devices"} ·{" "}
              {snapshot.data.electricalMeasurements?.length ?? 0}{" "}
              {fi ? "sähkömittausta" : "readings"} ·{" "}
              {(snapshot.data.electricalReports?.length ?? 0) +
                snapshot.data.checklistDrafts.length}{" "}
              {fi ? "raporttia" : "reports"}
            </p>
            <p>
              {fi
                ? "Alla oleva historia sisältää jaettavat raportit ja mittaukset. PDF-näkymistä voit tarkistaa koko sisällön ennen jakamista."
                : "The history below contains the shared reports and readings. Open PDF previews to review their full content before sharing."}
            </p>
            <button
              className="primary"
              disabled={
                busy ||
                persistenceStatus !== "saved" ||
                foreignOrigin ||
                needsRecovery
              }
              onClick={() => void publish()}
            >
              {busy
                ? fi
                  ? "Jaetaan…"
                  : "Sharing…"
                : recoveryNotice === "different"
                  ? fi
                    ? "Korvaa palvelinkopio paikallisilla tiedoilla"
                    : "Replace server copy with local records"
                  : link?.etag
                    ? fi
                      ? "Päivitä palvelinkopio"
                      : "Update server copy"
                    : fi
                      ? "Jaa palvelimelle ja luo QR"
                      : "Share to server and create QR"}
            </button>
          </div>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {link?.publishedAt && (
          <>
            <AssetQr
              url={sharedAssetUrl(link.id, link.origin)}
              title={root.name}
              identifier={equipment?.serialNumber || root.id}
              readCode={link.readCode}
              fi={fi}
            />
            <p className="caption">
              {fi ? "Lukukoodi" : "Read code"}:{" "}
              <strong className="mono">{link.readCode}</strong>
            </p>
            <button
              className="text-button danger-text"
              disabled={busy || foreignOrigin}
              onClick={() => void revoke()}
            >
              {fi ? "Sulje jaettu linkki" : "Revoke shared link"}
            </button>
          </>
        )}
      </section>
      <AssetHistory
        snapshot={snapshot}
        fi={fi}
        openElectricalReport={(reportId) =>
          go(`/electrical-reports/${encodeURIComponent(reportId)}`)
        }
      />
    </section>
  );
}
