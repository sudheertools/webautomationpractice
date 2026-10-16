/* Quick Practice — section behaviors (single scrollable page) */
(function () {
  "use strict";
  const { qs, qsa, on, debounce } = window.lab;

  /* ---- bio character counter ---- */
  const bio = qs("#bio-textarea"), bioCount = qs("#bio-count");
  if (bio && bioCount) {
    on(bio, "input", () => {
      bioCount.textContent = String(bio.value.length);
      bioCount.parentElement.classList.toggle("over", bio.value.length >= 120);
    });
  }

  /* ---- quantity stepper ---- */
  const qty = qs("#quantity-input");
  if (qty) {
    const step = (d) => {
      const min = Number(qty.min || 0), max = Number(qty.max || 999);
      qty.value = String(Math.max(min, Math.min(max, Number(qty.value || 0) + d)));
      qty.dispatchEvent(new Event("change", { bubbles: true }));
    };
    on(qs("#qty-minus"), "click", () => step(-1));
    on(qs("#qty-plus"), "click", () => step(1));
  }

  /* ---- skills multi-select out ---- */
  const skills = qs("#skills-select"), skillsOut = qs("#skills-out");
  if (skills && skillsOut) {
    const sync = () => {
      const sel = Array.from(skills.selectedOptions).map((o) => o.value);
      skillsOut.textContent = sel.length ? "Selected: " + sel.join(", ") : "Selected: (none)";
    };
    on(skills, "change", sync);
    sync();
  }

  /* ---- select-all + indeterminate ---- */
  const master = qs("#select-all-modules");
  const modules = qsa(".module-cb");
  if (master && modules.length) {
    const syncMaster = () => {
      const n = modules.filter((m) => m.checked).length;
      master.checked = n === modules.length;
      master.indeterminate = n > 0 && n < modules.length;
    };
    on(master, "change", () => { modules.forEach((m) => { m.checked = master.checked; }); master.indeterminate = false; });
    modules.forEach((m) => on(m, "change", syncMaster));
    syncMaster();
  }

  /* ---- gender radio out ---- */
  const gOut = qs("#gender-out");
  qsa('input[name="gender"]').forEach((r) => {
    on(r, "change", () => { if (gOut) gOut.textContent = "Selected: " + r.value; });
  });

  /* ---- mini calendar ---- */
  const calWrap = qs("#cal-mini"), calHidden = qs("#cal-selected");
  if (calWrap) {
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    let view = { y: now.getFullYear(), m: now.getMonth() };
    let selected = "";
    const pad = (n) => String(n).padStart(2, "0");
    const iso = (y, m, d) => y + "-" + pad(m + 1) + "-" + pad(d);

    const render = () => {
      const first = new Date(view.y, view.m, 1).getDay();
      const days = new Date(view.y, view.m + 1, 0).getDate();
      const prev = new Date(view.y, view.m, 0).getDate();
      let html = '<button type="button" class="hdr" aria-label="Previous month" id="cal-prev">&lsaquo;</button>';
      html += '<button type="button" class="hdr" style="min-width:88px">' + MONTHS[view.m] + " " + view.y + "</button>";
      html += '<button type="button" class="hdr" aria-label="Next month" id="cal-next">&rsaquo;</button><span style="flex-basis:100%;height:0"></span>';
      ["S","M","T","W","T","F","S"].forEach((d) => { html += '<button type="button" class="hdr" disabled style="min-width:36px;border:none;background:none;font-size:10px">' + d + "</button>"; });
      for (let i = first - 1; i >= 0; i--) { html += '<button type="button" disabled style="opacity:.3">' + (prev - i) + "</button>"; }
      for (let d = 1; d <= days; d++) {
        const key = iso(view.y, view.m, d);
        const isToday = key === iso(now.getFullYear(), now.getMonth(), now.getDate());
        html += '<button type="button" data-day="' + key + '" data-testid="cal-day-' + key +
          '" data-automation-id="cal-day-' + key + '" class="' + (selected === key ? "sel" : "") +
          '" aria-label="' + key + (isToday ? " (today)" : "") + '">' + d + "</button>";
      }
      calWrap.innerHTML = html;
    };
    const go = (d) => { view.m += d; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } render(); };
    on(calWrap, "click", (e) => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      if (b.id === "cal-prev") return go(-1);
      if (b.id === "cal-next") return go(1);
      const key = b.getAttribute("data-day"); if (!key) return;
      selected = key; if (calHidden) calHidden.value = key; render();
    });
    render();
  }

  /* ---- single slider ---- */
  const vol = qs("#volume-slider"), volOut = qs("#volume-out");
  if (vol && volOut) { on(vol, "input", () => { volOut.textContent = vol.value; }); }

  /* ---- dual range ---- */
  const pMin = qs("#price-min"), pMax = qs("#price-max"), pFill = qs("#price-fill"), pOut = qs("#price-out");
  if (pMin && pMax) {
    const syncRange = () => {
      let a = Number(pMin.value), b = Number(pMax.value);
      if (a > b) { [a, b] = [b, a]; }
      const lo = Number(pMin.min), hi = Number(pMin.max), span = hi - lo;
      if (pFill) { pFill.style.left = ((a - lo) / span * 100) + "%"; pFill.style.width = ((b - a) / span * 100) + "%"; }
      if (pOut) pOut.textContent = "$" + a + " – $" + b;
    };
    on(pMin, "input", syncRange); on(pMax, "input", syncRange); syncRange();
  }

  /* ---- file drop zone ---- */
  const zone = qs("#drop-zone"), fileInput = qs("#resume-input");
  const resumeFile = qs("#resume-file"), resumeName = qs("#resume-filename"), resumeSize = qs("#resume-size");
  if (zone && fileInput) {
    on(zone, "click", () => fileInput.click());
    on(zone, "dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
    on(zone, "dragleave", () => zone.classList.remove("drag"));
    on(zone, "drop", (e) => {
      e.preventDefault(); zone.classList.remove("drag");
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    on(fileInput, "change", () => { if (fileInput.files.length) handleFile(fileInput.files[0]); });
    const handleFile = (f) => {
      resumeName.textContent = f.name;
      resumeSize.textContent = (f.size / 1024).toFixed(1) + " KB · " + (f.type || "unknown type");
      resumeFile.style.display = "flex";
    };
    on(qs("#resume-remove"), "click", () => {
      resumeFile.style.display = "none"; fileInput.value = "";
    });
  }

  /* ---- click counter ---- */
  let clicks = 0;
  on(qs("#btn-count"), "click", () => { clicks++; qs("#click-count").textContent = String(clicks); });

  /* ---- slow save ---- */
  const slowBtn = qs("#btn-slow"), slowStatus = qs("#slow-status");
  if (slowBtn) {
    on(slowBtn, "click", () => {
      slowBtn.disabled = true; slowBtn.classList.add("btn-loading"); slowStatus.textContent = "Saving…";
      setTimeout(() => {
        slowBtn.disabled = false; slowBtn.classList.remove("btn-loading");
        slowStatus.textContent = "Saved."; slowStatus.style.color = "var(--ok)";
      }, 1500);
    });
  }

  /* ---- double click ---- */
  on(qs("#btn-dbl"), "dblclick", () => { qs("#click-out").textContent = "Double-click registered!"; });

  /* ---- downloads ---- */
  on(qs("#dl-text"), "click", () => download("report.txt", "RESULT: PASS\n244 stable targets verified.", "text/plain"));
  on(qs("#dl-json"), "click", () => download("data.json", JSON.stringify({ ok: true, rows: 244 }, null, 2), "application/json"));
  function download(name, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    const st = qs("#dl-status"); if (st) { st.textContent = name + " downloaded"; st.style.color = "var(--ok)"; }
  }

  /* ---- tabs ---- */
  const tabStrip = qs(".tab-strip");
  if (tabStrip) {
    const tabs = qsa('[role="tab"]', tabStrip);
    const panels = qsa(".tab-panel");
    const activate = (name) => {
      tabs.forEach((t) => {
        const on_ = t.getAttribute("data-tab") === name;
        t.setAttribute("aria-selected", String(on_));
        t.setAttribute("tabindex", on_ ? "0" : "-1");
      });
      panels.forEach((p) => { p.hidden = p.getAttribute("data-panel") !== name; });
    };
    tabs.forEach((t) => { if (!t.disabled) on(t, "click", () => activate(t.getAttribute("data-tab"))); });
  }

  /* ---- accordion ---- */
  qsa(".acc-trigger").forEach((btn) => {
    on(btn, "click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      qsa(".acc-trigger").forEach((other) => {
        if (other === btn) return;
        other.setAttribute("aria-expanded", "false");
        const p = document.getElementById(other.getAttribute("aria-controls"));
        if (p) p.hidden = true;
        const s = other.querySelector("span"); if (s) s.textContent = "+";
      });
      btn.setAttribute("aria-expanded", String(!open));
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (panel) panel.hidden = open;
      const chev = btn.querySelector("span"); if (chev) chev.textContent = open ? "+" : "−";
    });
  });

  /* ---- modal ---- */
  const backdrop = qs("#modal-backdrop");
  if (backdrop) {
    on(qs("#open-modal"), "click", () => { backdrop.hidden = false; qs("#modal-email").focus(); });
    const close = () => { backdrop.hidden = true; };
    on(qs("#modal-close"), "click", close);
    on(backdrop, "click", (e) => { if (e.target === backdrop) close(); });
    on(document, "keydown", (e) => { if (e.key === "Escape" && !backdrop.hidden) close(); });
    on(qs("#modal-send"), "click", () => {
      const v = qs("#modal-email").value.trim();
      close();
      window.toast("Sent", "Notification queued for " + (v || "peer@company.com") + ".", "success");
    });
  }

  /* ---- JS dialogs ---- */
  const dlgOut = qs("#dialog-out");
  on(qs("#js-confirm"), "click", () => {
    const ok = window.confirm("Delete this item?");
    if (dlgOut) dlgOut.textContent = ok ? "User confirmed." : "User cancelled.";
  });
  on(qs("#js-alert"), "click", () => {
    window.alert("This is a native alert.");
    if (dlgOut) dlgOut.textContent = "Alert dismissed.";
  });
  on(qs("#js-prompt"), "click", () => {
    const v = window.prompt("Enter your name:", "Ada");
    if (dlgOut) dlgOut.textContent = v === null ? "Prompt cancelled." : "You entered: " + v;
  });

  /* ---- toasts ---- */
  on(qs("#toast-success"), "click", () => window.toast("Success", "Operation completed.", "success"));
  on(qs("#toast-error"), "click", () => window.toast("Error", "Something went wrong.", "error"));

  /* ---- delayed content ---- */
  const delaySel = qs("#delay-select"), delayed = qs("#delayed-card");
  on(qs("#delay-load"), "click", () => {
    delayed.style.display = "none";
    const ms = Number(delaySel.value) * 1000;
    setTimeout(() => { delayed.style.display = "flex"; }, ms);
  });

  /* ---- progress ---- */
  const progFill = qs("#prog-fill"), progLabel = qs("#prog-label");
  on(qs("#prog-start"), "click", () => {
    let p = 0; progFill.style.width = "0%"; progLabel.textContent = "0%";
    const t = setInterval(() => {
      p += 4; progFill.style.width = p + "%"; progLabel.textContent = p + "%";
      if (p >= 100) clearInterval(t);
    }, 100);
  });

  /* ---- table ---- */
  const ROWS = [
    { id: 1, name: "Aisha Khan", role: "SDET", status: "Active" },
    { id: 2, name: "Ben Carter", role: "QA Lead", status: "Active" },
    { id: 3, name: "Chloe Nguyen", role: "Automation Eng", status: "Away" },
    { id: 4, name: "Diego Silva", role: "SDET", status: "Active" },
    { id: 5, name: "Emma Wilson", role: "DevOps", status: "Inactive" },
    { id: 6, name: "Farah Ahmed", role: "QA Analyst", status: "Active" },
    { id: 7, name: "Grace Lee", role: "SDET", status: "Active" },
    { id: 8, name: "Hassan Ali", role: "Architect", status: "Away" },
    { id: 9, name: "Isla Brown", role: "QA Analyst", status: "Active" },
    { id: 10, name: "Jack Taylor", role: "DevOps", status: "Inactive" },
    { id: 11, name: "Kim Park", role: "SDET", status: "Active" },
    { id: 12, name: "Leo Martins", role: "QA Lead", status: "Away" }
  ];
  const tbody = qs("#table-body"), rowCount = qs("#row-count");
  let sortKey = "id", sortDir = 1;
  const renderTable = (filter) => {
    const f = (filter || "").toLowerCase();
    const rows = ROWS
      .filter((r) => !f || r.name.toLowerCase().includes(f) || r.role.toLowerCase().includes(f) || r.status.toLowerCase().includes(f))
      .sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
    tbody.innerHTML = rows.map((r) =>
      '<tr data-testid="row-' + r.id + '" data-automation-id="row-' + r.id + '"><td>' + r.id + "</td><td>" + r.name +
      "</td><td>" + r.role + '</td><td><span class="badge ' + (r.status === "Active" ? "badge-req" : r.status === "Away" ? "badge-int" : "badge-adv") + '">' + r.status + "</span></td></tr>"
    ).join("");
    if (rowCount) rowCount.textContent = String(rows.length);
  };
  if (tbody) {
    renderTable("");
    on(qs("#table-search"), "input", debounce((e) => renderTable(e.target.value), 140));
    on(qs("#table-reset"), "click", () => { qs("#table-search").value = ""; renderTable(""); });
    qsa("[data-sort]").forEach((th) => {
      on(th, "click", () => {
        const k = th.getAttribute("data-sort");
        sortDir = k === sortKey ? -sortDir : 1; sortKey = k; renderTable(qs("#table-search").value);
      });
    });
  }

  /* ---- flaky field ---- */
  let flakyTries = 0;
  on(qs("#flaky-btn"), "click", () => {
    flakyTries++;
    const val = qs("#flaky-input").value.trim();
    const st = qs("#flaky-status");
    if (flakyTries === 1) {
      st.textContent = "Network error — please retry."; st.style.color = "var(--err)";
    } else if (val === "pass") {
      st.textContent = "Accepted."; st.style.color = "var(--ok)";
    } else {
      st.textContent = "Invalid input — type exactly: pass"; st.style.color = "var(--warn)";
    }
  });

  /* ---- shadow DOM ---- */
  const host = qs("#shadow-host");
  if (host) {
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML =
      '<style>:host{display:block;font-family:inherit}' +
      "label{display:block;font-size:12px;color:var(--text-muted);margin-bottom:4px}" +
      "input{width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);box-sizing:border-box}" +
      "button{margin-top:8px;padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);cursor:pointer}" +
      "#shadow-msg{margin-top:8px;font-size:12px;color:var(--brand)}" +
      "</style>" +
      '<label for="shadow-input">Name (inside shadow root)</label>' +
      '<input type="text" id="shadow-input" data-testid="shadow-input" data-automation-id="shadow-input" placeholder="Type here…">' +
      '<button type="button" id="shadow-submit" data-testid="shadow-submit" data-automation-id="shadow-submit">Echo</button>' +
      '<div id="shadow-msg" data-testid="shadow-msg" data-automation-id="shadow-msg"></div>';
    const inp = root.getElementById("shadow-input");
    const msg = root.getElementById("shadow-msg");
    root.getElementById("shadow-submit").addEventListener("click", () => {
      msg.textContent = "You typed: " + (inp.value || "(empty)");
    });
  }

  /* ---- popup / tab / cookie ---- */
  on(qs("#open-popup"), "click", () => {
    const w = window.open("", "ll-popup", "width=420,height=320");
    if (w) {
      w.document.write("<h2 style='font-family:sans-serif'>Popup window</h2><p>Switch to this handle in your test.</p>");
      w.document.title = "LocatorLab Popup";
      const out = qs("#window-out"); if (out) out.textContent = "Popup opened — switch via window handle.";
    }
  });
  on(qs("#open-tab"), "click", () => {
    window.open("../index.html", "_blank");
    const out = qs("#window-out"); if (out) out.textContent = "New tab opened.";
  });

  let cookieBanner = null;
  on(qs("#open-cookie"), "click", () => {
    if (cookieBanner) { cookieBanner.remove(); cookieBanner = null; return; }
    cookieBanner = document.createElement("div");
    cookieBanner.id = "cookie-banner";
    cookieBanner.setAttribute("data-testid", "cookie-banner");
    cookieBanner.setAttribute("data-automation-id", "cookie-banner");
    cookieBanner.className = "banner";
    cookieBanner.setAttribute("role", "dialog");
    cookieBanner.setAttribute("aria-label", "Cookie consent");
    cookieBanner.innerHTML =
      '<span aria-hidden="true" style="font-size:1.3rem">&#127850;</span>' +
      "<div><strong>We use cookies</strong><p>This practice site stores only your theme preference. No tracking.</p></div>" +
      '<div style="display:flex;gap:8px;margin-left:auto">' +
      '<button type="button" class="btn btn-sm" id="cookie-reject" data-testid="cookie-reject" data-automation-id="cookie-reject">Reject</button>' +
      '<button type="button" class="btn btn-primary btn-sm" id="cookie-accept" data-testid="cookie-accept" data-automation-id="cookie-accept">Accept all</button></div>';
    document.body.appendChild(cookieBanner);
    on(qs("#cookie-accept"), "click", () => { cookieBanner.remove(); cookieBanner = null; window.toast("Cookies", "Accepted.", "success"); });
    on(qs("#cookie-reject"), "click", () => { cookieBanner.remove(); cookieBanner = null; window.toast("Cookies", "Rejected.", "info"); });
  });
})();
