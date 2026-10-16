/* Dates & Ranges — section behaviors */
(function () {
  "use strict";
  const { qs, qsa, on } = window.lab;

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DOW = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => y + "-" + pad(m + 1) + "-" + pad(d);

  /* ================= Custom calendar ================= */
  const cal = qs("#trip-calendar");
  if (cal) {
    const input = qs("#trip-date-input");
    const label = qs("#cal-label");
    const dowEl = qs("#cal-dow");
    const daysEl = qs("#cal-days");
    const out = qs("#cal-out");
    const now = new Date();
    let view = { y: now.getFullYear(), m: now.getMonth() };
    let selected = null;

    dowEl.innerHTML = DOW.map((d) => '<div class="cal-dow">' + d + "</div>").join("");

    const render = () => {
      label.textContent = MONTHS[view.m] + " " + view.y;
      const first = new Date(view.y, view.m, 1).getDay();
      const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
      const prevDays = new Date(view.y, view.m, 0).getDate();
      let html = "";
      for (let i = first - 1; i >= 0; i--) {
        html += '<div class="cal-day muted" aria-hidden="true">' + (prevDays - i) + "</div>";
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const key = iso(view.y, view.m, d);
        const isToday = key === iso(now.getFullYear(), now.getMonth(), now.getDate());
        html += '<button type="button" class="cal-day' + (isToday ? " today" : "") +
          (selected === key ? " selected" : "") + '" data-day="' + key + '" data-testid="cal-day-' + key +
          '" data-automation-id="cal-day-' + key + '"' +
          (selected === key ? ' aria-current="date"' : "") + ">" + d + "</button>";
      }
      const total = first + daysInMonth;
      const tail = (7 - (total % 7)) % 7;
      for (let i = 1; i <= tail; i++) {
        html += '<div class="cal-day muted" aria-hidden="true">' + i + "</div>";
      }
      daysEl.innerHTML = html;
    };

    const openCal = (show) => {
      cal.hidden = !show;
      qs("#cal-toggle").setAttribute("aria-expanded", String(show));
    };

    on(qs("#cal-toggle"), "click", () => openCal(cal.hidden));
    on(input, "click", () => openCal(cal.hidden));

    on(qs("#cal-prev"), "click", () => {
      view.m--;
      if (view.m < 0) { view.m = 11; view.y--; }
      render();
    });
    on(qs("#cal-next"), "click", () => {
      view.m++;
      if (view.m > 11) { view.m = 0; view.y++; }
      render();
    });
    on(qs("#cal-today"), "click", () => {
      view = { y: now.getFullYear(), m: now.getMonth() };
      select(iso(now.getFullYear(), now.getMonth(), now.getDate()));
    });
    on(qs("#cal-clear"), "click", () => {
      selected = null;
      input.value = "";
      if (out) out.textContent = "No date selected.";
      render();
      document.dispatchEvent(new CustomEvent("lab:calendar", { detail: { value: "" } }));
    });

    const select = (key) => {
      selected = key;
      input.value = key;
      const dt = new Date(key + "T00:00:00");
      if (out) out.textContent = "Selected: " + key + " (" + DOW[dt.getDay()] + ", " +
        MONTHS[dt.getMonth()] + " " + dt.getDate() + ")";
      render();
      document.dispatchEvent(new CustomEvent("lab:calendar", { detail: { value: key } }));
    };

    on(daysEl, "click", (e) => {
      const btn = e.target.closest(".cal-day[data-day]");
      if (!btn) return;
      select(btn.getAttribute("data-day"));
    });

    openCal(true);
    render();
  }

  /* ================= Date range ================= */
  const rs = qs("#range-start"), re = qs("#range-end");
  if (rs && re) {
    const nights = qs("#range-nights"), dates = qs("#range-dates"), out = qs("#range-out");

    const calculate = () => {
      const a = rs.value, b = re.value;
      if (!a || !b) {
        out.className = "alert alert-error";
        nights.textContent = "Missing dates";
        dates.textContent = "Please choose both check-in and check-out.";
        return;
      }
      const d1 = new Date(a + "T00:00:00"), d2 = new Date(b + "T00:00:00");
      const diff = Math.round((d2 - d1) / 86400000);
      if (diff <= 0) {
        out.className = "alert alert-error";
        nights.textContent = "Invalid range";
        dates.textContent = "Check-out must be after check-in.";
        return;
      }
      out.className = "alert alert-success";
      nights.textContent = diff + (diff === 1 ? " night" : " nights");
      dates.textContent = a + " \u2192 " + b;
      document.dispatchEvent(new CustomEvent("lab:range", { detail: { nights: diff } }));
    };

    on(qs("#range-calc"), "click", calculate);
    on(qs("#range-swap"), "click", () => {
      const t = rs.value;
      rs.value = re.value;
      re.value = t;
      calculate();
    });
    on(rs, "change", calculate);
    on(re, "change", calculate);
    calculate();
  }

  /* ================= Sliders ================= */
  const vol = qs("#volume-slider");
  if (vol) {
    const vo = qs("#volume-out");
    const sync = () => { vo.textContent = vol.value; };
    on(vol, "input", sync);
    sync();
  }

  const yrs = qs("#rating-slider");
  if (yrs) {
    const yo = qs("#years-out");
    const sync = () => { yo.textContent = yrs.value + (yrs.value === "1" ? " year" : " years"); };
    on(yrs, "input", sync);
    sync();
  }

  const pMin = qs("#price-min"), pMax = qs("#price-max");
  if (pMin && pMax) {
    const fill = qs("#price-fill"), out = qs("#price-out");
    const GAP = 0; // min cannot pass max
    const sync = () => {
      let a = Number(pMin.value), b = Number(pMax.value);
      if (a > b - GAP) {
        if (document.activeElement === pMin) { a = b - GAP; pMin.value = String(a); }
        else { b = a + GAP; pMax.value = String(b); }
      }
      const min = Number(pMin.min), max = Number(pMin.max);
      const l = ((a - min) / (max - min)) * 100;
      const r = ((b - min) / (max - min)) * 100;
      fill.style.left = l + "%";
      fill.style.width = (r - l) + "%";
      out.textContent = "$" + a + " \u2014 $" + b;
    };
    on(pMin, "input", sync);
    on(pMax, "input", sync);
    sync();
  }

  /* ================= Star rating ================= */
  const starOut = qs("#star-out");
  qsa('#star-rating input[type="radio"]').forEach((r) => {
    on(r, "change", () => {
      if (starOut) starOut.textContent = "Rating: " + r.value + " of 5";
      document.dispatchEvent(new CustomEvent("lab:rating", { detail: { value: Number(r.value) } }));
    });
  });

  /* ================= Color picker ================= */
  const color = qs("#brand-color");
  if (color) {
    const hex = qs("#color-hex"), swatch = qs("#color-swatch");
    const sync = () => {
      const v = color.value.toLowerCase();
      hex.value = v;
      swatch.style.background = v;
      document.dispatchEvent(new CustomEvent("lab:color", { detail: { value: v } }));
    };
    on(color, "input", sync);
    sync();
  }
})();
