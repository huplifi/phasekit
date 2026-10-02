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
  const ready = () => {
    print.disabled = false;
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
    if (image.naturalWidth > 0) ready();
    else failed();
  } else {
    image.addEventListener(
      "load",
      () => (image.naturalWidth > 0 ? ready() : failed()),
      { once: true },
    );
    image.addEventListener("error", failed, { once: true });
  }
})();
