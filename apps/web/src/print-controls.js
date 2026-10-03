/* global window, document */
// Runs in the preview's own realm. An installed mobile app may suspend its opener.
(() => {
  const toolbar = document.querySelector(".print-toolbar");
  const back = toolbar?.querySelector("a");
  const print = toolbar?.querySelector(".print-action");
  if (!back || !print) return;
  const fi = document.documentElement.lang === "fi";
  const showError = (message) => {
    let notice = document.querySelector(".print-error");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "notice print-error";
      notice.setAttribute("role", "alert");
      toolbar.after(notice);
    }
    notice.textContent = message;
  };

  back.addEventListener("click", (event) => {
    event.preventDefault();
    const returnUrl = back.href;
    try {
      window.opener?.focus();
      window.close();
      if (window.closed) return;
    } catch {
      // Installed apps may not allow closing the preview.
    }
    const current = new URL(window.location.href, returnUrl);
    const target = new URL(returnUrl);
    const reloadRequired =
      current.origin === target.origin &&
      current.pathname === target.pathname &&
      current.search === target.search;
    window.location.replace(returnUrl);
    if (reloadRequired) window.location.reload();
  });

  print.addEventListener("click", () => {
    try {
      window.focus();
      window.print();
    } catch {
      showError(
        fi
          ? "Tulostusikkunaa ei voitu avata. Yritä uudelleen tai avaa raportti selaimessa."
          : "The print dialog could not open. Try again or open the report in your browser.",
      );
    }
  });

  const image = document.querySelector("img[data-print-chart]");
  let chartReady = !image;
  let fontsReady = !document.documentElement.dataset.printFonts;
  const ready = () => {
    if (chartReady && fontsReady) print.disabled = false;
  };
  const settleFonts = () => {
    fontsReady = true;
    ready();
  };
  const loadEmbeddedFonts = () => {
    if (!document.fonts) return settleFonts();
    Promise.allSettled([
      document.fonts.load("600 12px Unbounded"),
      document.fonts.load("400 12px Poppins"),
      document.fonts.load("700 12px Poppins"),
      document.fonts.load('600 12px "Ioskeley Mono"'),
    ]).then(settleFonts);
  };
  // This timer runs in the preview even if an installed app suspends its opener.
  // Unavailable fonts must never stop a complete report being printed.
  if (!fontsReady) {
    window.setTimeout(settleFonts, 2200);
    if (document.documentElement.dataset.printFonts === "embedded")
      loadEmbeddedFonts();
    else
      document.addEventListener("phasekit-print-fonts", loadEmbeddedFonts, {
        once: true,
      });
  }
  const chartLoaded = () => {
    chartReady = true;
    ready();
  };
  const failed = () => {
    showError(
      fi
        ? "Tallennetun kaavion lataus epäonnistui. Tulostusta ei aloitettu."
        : "The saved chart could not load. Printing was cancelled.",
    );
  };
  if (!image) ready();
  else if (image.complete) {
    if (image.naturalWidth > 0) chartLoaded();
    else failed();
  } else {
    image.addEventListener(
      "load",
      () => (image.naturalWidth > 0 ? chartLoaded() : failed()),
      { once: true },
    );
    image.addEventListener("error", failed, { once: true });
  }
})();
