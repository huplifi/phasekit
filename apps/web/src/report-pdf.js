/* global window, atob */
(() => {
  "use strict";
  "use strict";
  const { jsPDF } = window.jspdf;
  const MARGIN = 14;
  const WIDTH = 182;
  const BOTTOM = 283;
  const SKIP = ".print-toolbar,script,style,button,[hidden],[data-pdf-control]";
  /** Read the embedded TTF cmap ourselves: jsPDF otherwise silently omits glyphs. */
  function glyphLookup(base64) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const u16 = (n) => view.getUint16(n);
    const u32 = (n) => view.getUint32(n);
    let cmap = 0;
    for (let i = 0; i < u16(4); i++) {
      const at = 12 + i * 16;
      if (u32(at) === 0x636d6170) cmap = u32(at + 8);
    }
    if (!cmap) throw new Error("pdf_font_cmap_missing");
    const maps = [];
    for (let i = 0; i < u16(cmap + 2); i++) {
      const entry = cmap + 4 + i * 8;
      const platform = u16(entry);
      if (
        platform !== 0 &&
        !(platform === 3 && [1, 10].includes(u16(entry + 2)))
      )
        continue;
      const at = cmap + u32(entry + 4);
      const format = u16(at);
      if (format === 12) {
        maps.push((code) => {
          let low = 0,
            high = u32(at + 12) - 1;
          while (low <= high) {
            const mid = (low + high) >>> 1;
            const group = at + 16 + mid * 12;
            if (code < u32(group)) high = mid - 1;
            else if (code > u32(group + 4)) low = mid + 1;
            else return u32(group + 8) + code - u32(group) !== 0;
          }
          return false;
        });
      } else if (format === 4) {
        const count = u16(at + 6) / 2;
        const ends = at + 14,
          starts = ends + count * 2 + 2;
        const deltas = starts + count * 2,
          ranges = deltas + count * 2;
        maps.push((code) => {
          if (code > 0xffff) return false;
          for (let j = 0; j < count; j++) {
            if (code > u16(ends + j * 2)) continue;
            const start = u16(starts + j * 2);
            if (code < start) return false;
            const delta = view.getInt16(deltas + j * 2);
            const offset = u16(ranges + j * 2);
            if (!offset) return ((code + delta) & 0xffff) !== 0;
            const glyph = u16(ranges + j * 2 + offset + (code - start) * 2);
            return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0;
          }
          return false;
        });
      }
    }
    if (!maps.length) throw new Error("pdf_font_cmap_unsupported");
    return (code) => maps.some((map) => map(code));
  }
  function embeddedFont(doc, weight, family = "Poppins") {
    for (const style of Array.from(doc.querySelectorAll("style"))) {
      for (const rule of (style.textContent ?? "").matchAll(
        /@font-face\s*\{([^}]+)\}/g,
      )) {
        if (
          !new RegExp(`font-family:\\s*["']?${family}["']?\\s*;`, "i").test(
            rule[1],
          ) ||
          !new RegExp(`font-weight:\\s*${weight}\\s*;`).test(rule[1])
        )
          continue;
        const data = /url\(["']?data:[^,]+;base64,([^"')\s]+)/.exec(rule[1]);
        if (data) return data[1];
      }
    }
    throw new Error(`pdf_font_missing_${family}_${weight}`);
  }
  /** Preserve inline separators and block boundaries, without duplicating nested text. */
  function content(node) {
    if (node.nodeType === 3) return node.textContent ?? "";
    if (node.nodeType !== 1) return "";
    const el = node;
    if (el.matches(SKIP)) return "";
    if (el.tagName === "BR") return "\n";
    const value = Array.from(el.childNodes).map(content).join("");
    return /^(P|DIV|LI|DT|DD)$/.test(el.tagName) ||
      el.matches(".subline,.caption,.oil-code")
      ? `\n${value}\n`
      : value;
  }
  /** Generate vector text from the completed print document, without network requests. */
  async function buildReportPdf(doc) {
    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const supported = {};
    for (const [weight, style] of [
      ["400", "normal"],
      ["700", "bold"],
    ]) {
      const data = embeddedFont(doc, weight);
      supported[style] = glyphLookup(data);
      pdf.addFileToVFS(`Poppins-${style}.ttf`, data);
      pdf.addFont(`Poppins-${style}.ttf`, "Poppins", style);
    }
    const symbols = embeddedFont(doc, "400", "PhaseKit PDF Symbols");
    supported.symbols = glyphLookup(symbols);
    pdf.addFileToVFS("PhaseKit-Symbols.ttf", symbols);
    pdf.addFont("PhaseKit-Symbols.ttf", "PhaseKitSymbols", "normal");
    function runs(text, size, bold) {
      const style = bold ? "bold" : "normal";
      const result = [];
      for (const char of text) {
        const code = char.codePointAt(0);
        const primary = supported[style](code);
        if (code > 0xffff || (!primary && !supported.symbols(code)))
          throw new Error(
            `pdf_font_glyph_missing_U+${code.toString(16).toUpperCase()}`,
          );
        const family = primary ? "Poppins" : "PhaseKitSymbols";
        const fontStyle = primary ? style : "normal";
        const last = result.at(-1);
        if (last && last.family === family && last.style === fontStyle)
          last.text += char;
        else result.push({ family, style: fontStyle, text: char });
      }
      pdf.setFontSize(size);
      return result.map((run) => {
        pdf.setFont(run.family, run.style);
        return { ...run, width: pdf.getTextWidth(run.text) };
      });
    }
    const textWidth = (text, size, bold) =>
      runs(text, size, bold).reduce((sum, run) => sum + run.width, 0);
    function drawText(text, x, baseline, size, bold) {
      for (const run of runs(text, size, bold)) {
        pdf.setFont(run.family, run.style);
        pdf.text(run.text, x, baseline);
        x += run.width;
      }
    }
    pdf.setProperties({ title: doc.title, creator: "PhaseKit" });
    pdf.setTextColor(24, 33, 39);
    pdf.setDrawColor(146, 159, 165);
    let y = MARGIN;
    const page = () => {
      pdf.addPage();
      y = MARGIN;
    };
    const room = (height) => {
      if (y + height > BOTTOM) page();
    };
    const normalise = (value) =>
      value.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").trim();
    function lines(value, width, size = 9, bold = false) {
      const text = normalise(value);
      // Wrap at code-point boundaries as well as spaces (URLs and unbroken notes).
      return text.split("\n").flatMap((paragraph) => {
        if (!paragraph) return [""];
        const result = [];
        let rest = paragraph;
        while (textWidth(rest, size, bold) > width) {
          const chars = Array.from(rest);
          let end = 0,
            lastSpace = -1;
          while (
            end < chars.length &&
            textWidth(chars.slice(0, end + 1).join(""), size, bold) <= width
          ) {
            if (chars[end] === " ") lastSpace = end;
            end++;
          }
          if (!end) throw new Error("pdf_text_width_too_small");
          const cut = lastSpace > 0 ? lastSpace : end;
          result.push(chars.slice(0, cut).join(""));
          rest = chars.slice(cut).join("").replace(/^ +/, "");
        }
        result.push(rest);
        return result;
      });
    }
    function paragraph(
      value,
      size = 9,
      bold = false,
      x = MARGIN,
      width = WIDTH,
    ) {
      if (!normalise(value)) return;
      const wrapped = lines(value, width, size, bold);
      const step = size * 0.3528 * 1.5;
      room(Math.min(wrapped.length, 2) * step);
      for (const line of wrapped) {
        room(step);
        drawText(line, x, y + size * 0.3528, size, bold);
        y += step;
      }
      y += 2;
    }
    function table(el) {
      const rows = Array.from(el.rows);
      const count = Math.max(...rows.map((row) => row.cells.length));
      if (!count) return;
      const widths =
        count > 2
          ? [
              WIDTH * 0.24,
              ...Array(count - 1).fill((WIDTH * 0.76) / (count - 1)),
            ]
          : Array(count).fill(WIDTH / count);
      const step = 4.2;
      const headers = Array.from(el.tHead?.rows ?? []);
      const nextPage = () => {
        page();
        for (const header of headers) draw(header, true);
        if (y + step + 3 > BOTTOM) throw new Error("pdf_table_header_too_long");
      };
      const draw = (row, repeat = false) => {
        if (
          Array.from(row.cells).some(
            (cell) => cell.colSpan !== 1 || cell.rowSpan !== 1,
          )
        )
          throw new Error("pdf_table_spans_unsupported");
        const cells = Array.from(row.cells).map((cell, i) =>
          lines(content(cell), widths[i] - 4, 8, cell.tagName === "TH"),
        );
        const total = Math.max(1, ...cells.map((cell) => cell.length));
        if (
          y + total * step + 3 > BOTTOM &&
          total * step + 3 < BOTTOM - MARGIN &&
          !repeat
        )
          nextPage();
        let offset = 0;
        while (offset < total) {
          if (y + step + 3 > BOTTOM) {
            if (repeat) throw new Error("pdf_table_header_too_long");
            nextPage();
          }
          const take = Math.min(
            total - offset,
            Math.floor((BOTTOM - y - 3) / step),
          );
          let x = MARGIN;
          cells.forEach((cell, index) => {
            pdf.setFont(
              "Poppins",
              row.cells[index].tagName === "TH" ? "bold" : "normal",
            );
            pdf.setFontSize(8);
            cell
              .slice(offset, offset + take)
              .forEach((line, i) =>
                drawText(
                  line,
                  x + 2,
                  y + 3 + i * step,
                  8,
                  row.cells[index].tagName === "TH",
                ),
              );
            x += widths[index];
          });
          y += take * step + 2;
          pdf.line(MARGIN, y, MARGIN + WIDTH, y);
          y += 1;
          offset += take;
        }
      };
      for (const row of rows) draw(row);
      y += 3;
    }
    async function image(el) {
      if (!el.src.startsWith("data:") && !el.src.startsWith("blob:"))
        throw new Error("pdf_image_not_embedded");
      try {
        await el.decode();
        if (!el.naturalWidth || !el.naturalHeight) throw new Error("empty");
        const canvas = doc.createElement("canvas");
        const ratio = el.naturalHeight / el.naturalWidth;
        canvas.width = Math.min(2400, el.naturalWidth);
        canvas.height = Math.round(canvas.width * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
        const height = Math.min(110, WIDTH * ratio);
        const width = height / ratio;
        room(height + 4);
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          MARGIN + (WIDTH - width) / 2,
          y,
          width,
          height,
        );
        y += height + 4;
      } catch {
        throw new Error("pdf_image_unavailable");
      }
    }
    async function walk(node) {
      if (node.nodeType === 3) {
        paragraph(node.textContent ?? "");
        return;
      }
      if (node.nodeType !== 1) return;
      const el = node;
      if (el.matches(SKIP)) return;
      if (el.tagName === "TABLE") {
        table(el);
        return;
      }
      if (el.tagName === "IMG") {
        await image(el);
        return;
      }
      if (el.matches(".signature-line")) {
        room(15);
        y += 12;
        pdf.line(MARGIN, y, MARGIN + 82, y);
        y += 2;
        return;
      }
      if (el.matches(".checklist-steps li")) {
        const mark = el.querySelector(".checkmark");
        room(8);
        pdf.rect(MARGIN, y + 1, 3.5, 3.5);
        if (mark?.textContent === "☑") {
          pdf.line(MARGIN + 0.5, y + 2.8, MARGIN + 1.5, y + 3.8);
          pdf.line(MARGIN + 1.5, y + 3.8, MARGIN + 3, y + 1.5);
        }
        const label = Array.from(el.childNodes)
          .filter((child) => child !== mark)
          .map(content)
          .join("");
        paragraph(label, 9, false, MARGIN + 6, WIDTH - 6);
        return;
      }
      if (/^H[1-6]$/.test(el.tagName)) {
        room(18);
        y += 3;
        paragraph(content(el), el.tagName === "H1" ? 18 : 11, true);
        if (el.tagName !== "H1") {
          pdf.line(MARGIN, y - 1, MARGIN + WIDTH, y - 1);
        }
        return;
      }
      if (el.tagName === "LI") {
        const ordered = el.parentElement?.tagName === "OL";
        const index = el.parentElement
          ? Array.from(el.parentElement.children).indexOf(el) + 1
          : 1;
        const text = content(el);
        paragraph(`${ordered ? `${index}.` : "-"} ${text}`);
        for (const link of Array.from(el.querySelectorAll("a[href]"))) {
          const href = link.getAttribute("href") ?? "";
          if (/^https?:\/\//i.test(href) && !text.includes(href))
            paragraph(href, 8);
        }
        return;
      }
      if (
        el.matches(
          "p,dt,dd,footer,figcaption,.hero-label,.date-card,.document-status,.signature-caption",
        )
      ) {
        const bold = el.matches(
          "dt,.hero-label,.document-status,.document-subhead,.hero-value,.checklist-progress",
        );
        paragraph(
          el.matches(".date-card")
            ? Array.from(el.childNodes).map(content).join("\n")
            : content(el),
          el.matches(".hero-value")
            ? 16
            : el.matches("footer,.notice,.brand")
              ? 8
              : 9,
          bold,
        );
        return;
      }
      // Containers recurse; inline-only nodes are consumed once as a text block.
      if (
        !el.querySelector(
          "p,div,section,dl,dt,dd,table,img,li,h1,h2,footer,figcaption",
        )
      ) {
        paragraph(content(el));
        return;
      }
      for (const child of Array.from(el.childNodes)) await walk(child);
    }
    for (const child of Array.from(doc.body.childNodes)) await walk(child);
    return pdf.output("blob");
  }

  window.phasekitBuildPdf = buildReportPdf;
})();
