import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { createQrLabel } from "../asset-qr";

export function AssetQr({
  url,
  title,
  identifier,
  readCode,
  fi,
}: {
  url: string;
  title: string;
  identifier: string;
  readCode?: string;
  fi: boolean;
}) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setImage("");
    setError("");
    void createQrLabel(url, title, identifier, readCode, fi)
      .then((canvas) => {
        if (active) setImage(canvas.toDataURL("image/png"));
      })
      .catch(() => {
        if (active)
          setError(
            fi ? "QR-kuvan luonti epäonnistui." : "Could not create QR image.",
          );
      });
    return () => {
      active = false;
    };
  }, [url, title, identifier, readCode, fi]);
  function print() {
    const win = window.open("", "_blank");
    if (!win) {
      setError(
        fi
          ? "Salli tulostusikkunan avaaminen."
          : "Allow the print window to open.",
      );
      return;
    }
    win.opener = null;
    win.document.title = `${title} · PhaseKit`;
    const style = win.document.createElement("style");
    style.textContent =
      "body{margin:12mm;background:white;color:black}img{display:block;width:80mm;max-width:100%;height:auto;image-rendering:pixelated}@page{margin:10mm}";
    const img = win.document.createElement("img");
    img.alt = title;
    img.src = image;
    img.onload = () => {
      win.focus();
      win.print();
    };
    win.document.head.append(style);
    win.document.body.append(img);
  }
  return (
    <div className="asset-qr">
      {image && (
        <img
          src={image}
          alt={fi ? `QR-tarra: ${title}` : `QR label: ${title}`}
          style={{
            width: "min(100%, 320px)",
            height: "auto",
            background: "white",
          }}
        />
      )}
      <div className="button-group">
        <a
          className="secondary-button"
          href={image || undefined}
          download={`phasekit-${identifier.replace(/[^a-z0-9-]/gi, "-")}.png`}
          aria-disabled={!image}
          onClick={(event) => {
            if (!image) event.preventDefault();
          }}
        >
          <Download size={18} />
          {fi ? "Tallenna kuvana" : "Save image"}
        </a>
        <button className="secondary-button" disabled={!image} onClick={print}>
          <Printer size={18} />
          {fi ? "Tulosta" : "Print"}
        </button>
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
