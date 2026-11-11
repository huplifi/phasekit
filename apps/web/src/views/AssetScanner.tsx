import "./asset-sharing.css";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context";
import { parseAssetQr } from "../asset-qr";

type Detector = {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
};
export function AssetScanner() {
  const { data, go } = useApp();
  const fi = data.locale === "fi";
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const scanGeneration = useRef(0);
  const startPending = useRef(false);
  const isMounted = useRef(true);
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      scanGeneration.current++;
      cleanup.current();
    };
  }, []);
  function open(input: string) {
    const path = parseAssetQr(input.trim(), window.location.origin);
    if (!path) {
      setError(
        fi
          ? "QR-linkin pitää olla tämän PhaseKit-sivuston kohde-, laite- tai jaettu linkki."
          : "Use a site, equipment or shared QR link from this PhaseKit website.",
      );
      return false;
    }
    cleanup.current();
    go(path);
    return true;
  }
  async function scan() {
    if (startPending.current || camera) return;
    setError("");
    const DetectorClass = (
      window as unknown as {
        BarcodeDetector?: new (options: { formats: string[] }) => Detector;
      }
    ).BarcodeDetector;
    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
      setError(
        fi
          ? "Tämä selain ei tue kameraskannausta. Käytä puhelimen kamerasovellusta ja avaa QR-linkki, tai liitä linkki alle."
          : "This browser does not support camera scanning. Open the QR link with your phone’s camera app, or paste it below.",
      );
      return;
    }
    const generation = ++scanGeneration.current;
    startPending.current = true;
    setStarting(true);
    try {
      cleanup.current();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (!isMounted.current || generation !== scanGeneration.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      let active = true;
      let timer: ReturnType<typeof setTimeout>;
      cleanup.current = () => {
        active = false;
        clearTimeout(timer);
        stream.getTracks().forEach((track) => track.stop());
        if (isMounted.current) setCamera(false);
      };
      setCamera(true);
      if (!video.current) {
        cleanup.current();
        return;
      }
      video.current.srcObject = stream;
      await video.current.play();
      const detector = new DetectorClass({ formats: ["qr_code"] });
      const tick = async () => {
        if (!active || !video.current) return;
        try {
          const found = await detector.detect(video.current);
          if (found.some((item) => open(item.rawValue))) return;
        } catch {
          /* wait for a readable frame */
        }
        if (active) timer = setTimeout(() => void tick(), 250);
      };
      void tick();
    } catch {
      cleanup.current();
      if (isMounted.current)
        setError(
          fi
            ? "Kameraa ei voitu avata. Salli kameran käyttö tai liitä linkki."
            : "Could not open the camera. Allow camera access or paste the link.",
        );
    } finally {
      startPending.current = false;
      if (isMounted.current) setStarting(false);
    }
  }
  return (
    <section className="section asset-detail">
      <h1>{fi ? "Skannaa kohteen QR" : "Scan asset QR"}</h1>
      <p>
        {fi
          ? "Skannaa pysyvä kohde- tai laitetarra. Jaetun kopion lukukoodi kysytään avaamisen jälkeen."
          : "Scan the permanent site or equipment label. A shared copy asks for the read code after opening."}
      </p>
      <div className="button-group">
        <button
          className="secondary-button"
          disabled={starting || camera}
          onClick={() => void scan()}
        >
          {fi ? "Avaa kamera" : "Open camera"}
        </button>
        {camera && (
          <button className="text-button" onClick={() => cleanup.current()}>
            {fi ? "Sulje kamera" : "Close camera"}
          </button>
        )}
      </div>
      <video
        ref={video}
        hidden={!camera}
        playsInline
        muted
        style={{ width: "100%", maxHeight: "24rem" }}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          open(value);
        }}
      >
        <label>
          {fi ? "Tai liitä QR-linkki" : "Or paste the QR link"}
          <input
            type="url"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <button className="primary">{fi ? "Avaa kohde" : "Open asset"}</button>
      </form>
      {error && (
        <p className="notice warning" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
