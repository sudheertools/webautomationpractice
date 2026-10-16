/* Interactions & Waits — section behaviors */
(function () {
  "use strict";
  const { qs, qsa, on } = window.lab;

  /* ================= Tabs ================= */
  const tabList = qs("#tab-list");
  if (tabList) {
    const tabs = qsa(".tab", tabList);
    const panels = qsa(".tab-panel");

    const activate = (name) => {
      tabs.forEach((t) => {
        const on_ = t.getAttribute("data-tab") === name;
        t.setAttribute("aria-selected", String(on_));
        if (on_) t.setAttribute("tabindex", "0");
        else t.setAttribute("tabindex", "-1");
      });
      panels.forEach((p) => { p.hidden = p.getAttribute("data-panel") !== name; });
      document.dispatchEvent(new CustomEvent("lab:tab", { detail: { tab: name } }));
    };

    tabs.forEach((t) => {
      if (t.disabled) return;
      on(t, "click", () => activate(t.getAttribute("data-tab")));
      on(t, "keydown", (e) => {
        const i = tabs.indexOf(t);
        let j = null;
        if (e.key === "ArrowRight") j = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
        if (j === null) return;
        e.preventDefault();
        while (tabs[j].disabled) j = (j + 1) % tabs.length;
        tabs[j].focus();
        activate(tabs[j].getAttribute("data-tab"));
      });
    });
    activate("overview");
  }

  /* ================= Accordion ================= */
  qsa(".acc-trigger").forEach((btn) => {
    on(btn, "click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      qsa(".acc-trigger").forEach((other) => {
        if (other === btn) return;
        other.setAttribute("aria-expanded", "false");
        const op = document.getElementById(other.getAttribute("aria-controls"));
        if (op) op.hidden = true;
      });
      btn.setAttribute("aria-expanded", String(!open));
      if (panel) panel.hidden = open;
    });
  });

  /* ================= Modal ================= */
  const backdrop = qs("#modal-backdrop");
  if (backdrop) {
    const dlgOut = qs("#dialog-out");
    let lastFocus = null;

    const openModal = () => {
      lastFocus = document.activeElement;
      backdrop.classList.add("open");
      document.body.style.overflow = "hidden";
      setTimeout(() => qs("#modal-email").focus(), 60);
      document.dispatchEvent(new CustomEvent("lab:modal", { detail: { open: true } }));
    };
    const closeModal = () => {
      backdrop.classList.remove("open");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
      document.dispatchEvent(new CustomEvent("lab:modal", { detail: { open: false } }));
    };

    on(qs("#open-modal"), "click", openModal);
    on(qs("#open-modal-confirm"), "click", () => {
      openModal();
      qs("#modal-title").textContent = "Delete this project?";
      qs("#modal-send").textContent = "Delete";
      qs("#modal-send").classList.remove("btn-primary");
      qs("#modal-send").classList.add("btn-danger");
    });
    on(qs("#modal-x"), "click", closeModal);
    on(qs("#modal-cancel"), "click", closeModal);
    on(backdrop, "click", (e) => { if (e.target === backdrop) closeModal(); });

    on(qs("#modal-send"), "click", () => {
      const email = qs("#modal-email").value.trim();
      const role = qs("#modal-role").value;
      if (!email) {
        window.toast("Email required", "Enter a teammate email first.", "warning");
        return;
      }
      closeModal();
      window.toast("Invite sent", email + " invited as " + role + ".", "success");
      if (dlgOut) dlgOut.textContent = "Modal submitted for " + email + ".";
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && backdrop.classList.contains("open")) closeModal();
    });

    /* focus trap */
    backdrop.addEventListener("keydown", (e) => {
      if (e.key !== "Tab" || !backdrop.classList.contains("open")) return;
      const f = qsa('a[href],button:not([disabled]),input,select,textarea', backdrop)
        .filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ================= Native JS dialogs ================= */
  const dlgOut = qs("#dialog-out");
  on(qs("#js-alert"), "click", () => {
    window.alert("This is a native window.alert().");
    if (dlgOut) dlgOut.textContent = "alert() shown and dismissed.";
  });
  on(qs("#js-confirm"), "click", () => {
    const ok = window.confirm("Do you want to continue?");
    if (dlgOut) dlgOut.textContent = ok ? "confirm() → confirmed" : "confirm() → dismissed";
  });
  on(qs("#js-prompt"), "click", () => {
    const v = window.prompt("Enter a reference code:", "LL-001");
    if (dlgOut) {
      dlgOut.textContent = v === null ? "prompt() → dismissed" : 'prompt() → "' + v + '"';
    }
  });

  /* ================= Toast buttons ================= */
  const TOASTS = {
    "toast-success": ["Saved", "Your changes were saved successfully.", "success"],
    "toast-error": ["Payment failed", "Your card was declined. Try another.", "error"],
    "toast-warning": ["Storage almost full", "You have used 92% of your quota.", "warning"],
    "toast-info": ["Heads up", "A new version of LocatorLab is available.", "info"]
  };
  Object.keys(TOASTS).forEach((id) => {
    const b = qs("#" + id);
    if (b) on(b, "click", () => window.toast.apply(null, TOASTS[id]));
  });

  /* ================= Data table ================= */
  const tbody = qs("#table-body");
  if (tbody) {
    const ROWS = [
      { id: 1, name: "Aisha Khan", email: "aisha@test.com", role: "Admin", status: "active" },
      { id: 2, name: "Ben Carter", email: "ben@test.com", role: "Editor", status: "active" },
      { id: 3, name: "Chloe Nguyen", email: "chloe@test.com", role: "Viewer", status: "inactive" },
      { id: 4, name: "Diego Alvarez", email: "diego@test.com", role: "Editor", status: "pending" },
      { id: 5, name: "Emma Watson", email: "emma@test.com", role: "Admin", status: "active" },
      { id: 6, name: "Farah Ali", email: "farah@test.com", role: "Viewer", status: "active" },
      { id: 7, name: "George Ivanov", email: "george@test.com", role: "Editor", status: "inactive" },
      { id: 8, name: "Hana Suzuki", email: "hana@test.com", role: "Viewer", status: "active" },
      { id: 9, name: "Ivan Petrov", email: "ivan@test.com", role: "Admin", status: "pending" },
      { id: 10, name: "Julia Rossi", email: "julia@test.com", role: "Editor", status: "active" },
      { id: 11, name: "Kwame Mensah", email: "kwame@test.com", role: "Viewer", status: "active" },
      { id: 12, name: "Lena Fischer", email: "lena@test.com", role: "Admin", status: "inactive" },
      { id: 13, name: "Mateo Silva", email: "mateo@test.com", role: "Editor", status: "active" },
      { id: 14, name: "Nadia Rahman", email: "nadia@test.com", role: "Viewer", status: "pending" },
      { id: 15, name: "Omar Haddad", email: "omar@test.com", role: "Admin", status: "active" },
      { id: 16, name: "Priya Sharma", email: "priya@test.com", role: "Editor", status: "active" },
      { id: 17, name: "Quentin Blake", email: "quentin@test.com", role: "Viewer", status: "inactive" },
      { id: 18, name: "Rosa Martinez", email: "rosa@test.com", role: "Admin", status: "active" },
      { id: 19, name: "Samir Patel", email: "samir@test.com", role: "Editor", status: "pending" },
      { id: 20, name: "Tara Okafor", email: "tara@test.com", role: "Viewer", status: "active" }
    ];

    let sortKey = "id", sortDir = 1, page = 1, size = 10, query = "", role = "";
    const info = qs("#table-info"), pager = qs("#table-pager");

    const filtered = () => {
      let out = ROWS.slice();
      if (query) {
        const q = query.toLowerCase();
        out = out.filter((r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q));
      }
      if (role) out = out.filter((r) => r.role === role);
      out.sort((a, b) => {
        const x = a[sortKey], y = b[sortKey];
        if (typeof x === "number") return (x - y) * sortDir;
        return String(x).localeCompare(String(y)) * sortDir;
      });
      return out;
    };

    const render = () => {
      const data = filtered();
      const pages = Math.max(1, Math.ceil(data.length / size));
      if (page > pages) page = pages;
      const start = (page - 1) * size;
      const slice = data.slice(start, start + size);

      tbody.innerHTML = slice.map((r) =>
        '<tr data-testid="row-' + r.id + '" data-automation-id="row-' + r.id + '">' +
          '<td>' + r.id + "</td>" +
          "<td>" + r.name + "</td>" +
          '<td class="mono xsmall">' + r.email + "</td>" +
          "<td>" + r.role + "</td>" +
          '<td><span class="status-dot st-' + r.status + '">' + r.status + "</span></td>" +
        "</tr>"
      ).join("") || '<tr><td colspan="5"><div class="empty-state">No matching rows.</div></td></tr>';

      info.textContent = data.length === 0
        ? "Showing 0 entries"
        : "Showing " + (start + 1) + " to " + Math.min(start + size, data.length) +
          " of " + data.length + " entries" +
          (query || role ? " (filtered from " + ROWS.length + ")" : "");

      pager.innerHTML = "";
      const mk = (label, p, cur, disabled) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = label;
        b.setAttribute("data-testid", "page-" + p);
        if (cur) b.setAttribute("aria-current", "true");
        if (disabled) b.disabled = true;
        on(b, "click", () => { page = p; render(); });
        pager.appendChild(b);
      };
      mk("‹", Math.max(1, page - 1), false, page === 1);
      for (let i = 1; i <= pages; i++) mk(String(i), i, i === page, false);
      mk("›", Math.min(pages, page + 1), false, page === pages);

      qsa("th.sortable").forEach((th) => {
        if (th.getAttribute("data-sort") === sortKey) {
          th.setAttribute("aria-sort", sortDir === 1 ? "ascending" : "descending");
          th.querySelector(".arrow").textContent = sortDir === 1 ? "↑" : "↓";
        } else {
          th.removeAttribute("aria-sort");
          th.querySelector(".arrow").textContent = "↕";
        }
      });
    };

    qsa("th.sortable").forEach((th) => {
      on(th, "click", () => {
        const k = th.getAttribute("data-sort");
        if (k === sortKey) sortDir = -sortDir;
        else { sortKey = k; sortDir = 1; }
        page = 1;
        render();
      });
    });

    on(qs("#table-search"), "input", window.lab.debounce((e) => {
      query = e.target.value.trim();
      page = 1;
      render();
    }, 160));

    on(qs("#table-size"), "change", (e) => { size = Number(e.target.value); page = 1; render(); });
    on(qs("#table-role"), "change", (e) => { role = e.target.value; page = 1; render(); });
    on(qs("#table-reset"), "click", () => {
      query = ""; role = ""; size = 10; sortKey = "id"; sortDir = 1; page = 1;
      qs("#table-search").value = "";
      qs("#table-size").value = "10";
      qs("#table-role").value = "";
      render();
    });

    render();
  }

  /* ================= Drag & drop ================= */
  const todoZone = qs("#todo-zone");
  if (todoZone) {
    const doneZone = qs("#done-zone");
    const status = qs("#drag-status");
    const ALL = todoZone.innerHTML;
    let dragEl = null;

    const sync = () => {
      const n = doneZone.querySelectorAll(".drag-item").length;
      status.textContent = n + (n === 1 ? " task completed" : " tasks completed");
      if (n === 0) doneZone.classList.remove("over");
    };

    todoZone.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".drag-item");
      if (!item) return;
      dragEl = item;
      item.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.id);
    });
    todoZone.addEventListener("dragend", () => {
      if (dragEl) dragEl.classList.remove("dragging");
      dragEl = null;
      doneZone.classList.remove("over");
    });

    [doneZone, todoZone].forEach((zone) => {
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (zone === doneZone) doneZone.classList.add("over");
      });
      zone.addEventListener("dragleave", (e) => {
        if (zone === doneZone && !zone.contains(e.relatedTarget)) doneZone.classList.remove("over");
      });
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        doneZone.classList.remove("over");
        if (!dragEl) return;
        const target = e.target.closest(".drag-item");
        if (zone === todoZone && target && target !== dragEl) {
          const items = Array.from(todoZone.children);
          if (items.indexOf(dragEl) < items.indexOf(target)) todoZone.insertBefore(dragEl, target.nextSibling);
          else todoZone.insertBefore(dragEl, target);
        } else {
          const grip = dragEl.querySelector(".grip");
          if (grip) grip.textContent = "✓";
          zone.appendChild(dragEl);
        }
        dragEl.classList.remove("dragging");
        dragEl = null;
        sync();
      });
    });

    /* keyboard / button fallback */
    on(qs("#drag-move-all"), "click", () => {
      qsa(".drag-item", todoZone).forEach((item) => {
        const grip = item.querySelector(".grip");
        if (grip) grip.textContent = "✓";
        doneZone.appendChild(item);
      });
      sync();
    });
    on(qs("#drag-reset"), "click", () => {
      todoZone.innerHTML = ALL;
      sync();
      /* rebind draggable children are the same nodes recreated — listeners are on the zone so OK */
    });

    sync();
  }

  /* ================= Dynamic content ================= */
  const delayLoad = qs("#delay-load");
  if (delayLoad) {
    const out = qs("#delay-out"), sel = qs("#delay-select");
    on(delayLoad, "click", () => {
      const secs = Number(sel.value);
      out.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 10px"></div>Loading ' + secs + "s&hellip;</div>";
      setTimeout(() => {
        out.innerHTML =
          '<div class="alert alert-success" style="margin:0"><span aria-hidden="true">&#10003;</span>' +
          "<div><strong>Content loaded after " + secs + "s</strong>" +
          "<p>id=<code class=\"inline-code\">delayed-card</code> — it is now in the DOM and visible.</p></div></div>" +
          '<div class="card" id="delayed-card" data-testid="delayed-card" data-automation-id="delayed-card" style="margin:12px 0 0">' +
          "<h4>Delayed card</h4><p class=\"small muted\">You waited correctly instead of using sleep().</p></div>";
      }, secs * 1000);
    });

    const target = qs("#tg-target");
    const savedHTML = target ? target.outerHTML : "";
    on(qs("#tg-show"), "click", () => {
      if (!target.isConnected) {
        qs("#dynamic").querySelector("fieldset:last-of-type").insertAdjacentHTML("beforeend", savedHTML);
      } else target.hidden = false;
    });
    on(qs("#tg-hide"), "click", () => { if (target.isConnected) target.hidden = true; });
    on(qs("#tg-remove"), "click", () => { if (target.isConnected) target.remove(); });
    on(qs("#tg-readd"), "click", () => {
      if (!target.isConnected) {
        qs("#dynamic").querySelector("fieldset:last-of-type").insertAdjacentHTML("beforeend", savedHTML);
      }
    });

    /* flaky element */
    const flaky = qs("#flaky-btn"), flakyStatus = qs("#flaky-status");
    let flakyOn = true;
    setInterval(() => {
      flakyOn = !flakyOn;
      flaky.hidden = !flakyOn;
      flakyStatus.textContent = flakyOn ? "Visible" : "Hidden (removed from view)";
    }, 2000);
    on(flaky, "click", () => {
      flakyStatus.textContent = "Clicked!";
      window.toast("Got it", "You caught the flaky button.", "success");
    });

    /* changing text */
    const STATES = ["Loading\u2026", "Fetching\u2026", "Almost ready\u2026", "Ready"];
    const cycleText = qs("#cycle-text"), cycleBtn = qs("#cycle-btn");
    let ci = 0;
    const cycle = setInterval(() => {
      ci = (ci + 1) % STATES.length;
      cycleText.textContent = STATES[ci];
      cycleBtn.disabled = STATES[ci] !== "Ready";
      if (ci === 3) clearInterval(cycle);
    }, 1500);
    on(cycleBtn, "click", () => {
      cycleText.textContent = "Completed!";
      window.toast("Continued", "You waited for the exact text.", "success");
    });

    /* progress */
    const progBar = qs("#prog-bar"), progLabel = qs("#prog-label"), progSpinner = qs("#prog-spinner");
    on(qs("#prog-start"), "click", () => {
      let p = 0;
      progSpinner.hidden = false;
      progLabel.textContent = "0%";
      const t = setInterval(() => {
        p = Math.min(100, p + 5);
        progBar.style.width = p + "%";
        progLabel.textContent = p + "%";
        if (p >= 100) {
          clearInterval(t);
          progSpinner.hidden = true;
          window.toast("Download complete", "100% reached.", "success");
        }
      }, 110);
    });
  }

  /* ================= Infinite scroll ================= */
  const infList = qs("#inf-list");
  if (infList) {
    let count = 0;
    const addBatch = (n) => {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        count++;
        const d = document.createElement("div");
        d.className = "inf-item";
        d.id = "inf-item-" + count;
        d.setAttribute("data-testid", "inf-item-" + count);
        d.setAttribute("data-automation-id", "inf-item-" + count);
        d.innerHTML = '<span class="num">' + count + "</span><span>Row content block " + count +
          " — loaded on demand</span>";
        frag.appendChild(d);
      }
      infList.appendChild(frag);
      qs("#inf-status").textContent = "Loaded " + count + " items";
    };
    addBatch(10);

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && count < 50) addBatch(10);
      }, { root: infList, threshold: 0.1 });
      io.observe(qs("#inf-sentinel"));
    }
  }

  /* ================= Shadow DOM ================= */
  const host = qs("#shadow-host");
  if (host) {
    const sr = host.attachShadow({ mode: "open" });
    sr.innerHTML =
      '<style>' +
      "div{font-family:system-ui,sans-serif}" +
      "input,button{font:inherit;padding:8px 12px;border:1px solid #c9cee0;border-radius:7px}" +
      "button{background:#4f46e5;color:#fff;border:none;cursor:pointer;margin-left:6px}" +
      "#shadow-msg{margin-top:12px;font-size:13px;color:#059669;font-weight:600;min-height:16px}" +
      "label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}" +
      "</style>" +
      '<label for="shadow-input">Shadow input</label>' +
      '<input type="text" id="shadow-input" name="shadowMsg" placeholder="Type inside shadow…">' +
      '<button type="button" id="shadow-submit">Submit</button>' +
      '<p id="shadow-msg"></p>';
    sr.getElementById("shadow-submit").addEventListener("click", () => {
      const v = sr.getElementById("shadow-input").value;
      sr.getElementById("shadow-msg").textContent = v ? "You typed: " + v : "Input is empty.";
    });
  }

  const host2 = qs("#shadow-host-2");
  if (host2) {
    const outer = host2.attachShadow({ mode: "open" });
    outer.innerHTML =
      '<style>.wrap{padding:10px;border:1px dashed #c9cee0;border-radius:8px}' +
      "input,button{font:inherit;padding:8px 12px;border:1px solid #c9cee0;border-radius:7px}" +
      "button{background:#0891b2;color:#fff;border:none;cursor:pointer;margin-left:6px}" +
      "#inner-msg{margin-top:10px;font-size:13px;color:#0891b2;font-weight:600;min-height:16px}" +
      "label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}</style>" +
      '<div class="wrap"><div id="level1">Level 1' +
      '<div id="inner-mount"></div></div></div>';

    const level1 = outer.getElementById("level1");
    const inner = level1.attachShadow({ mode: "open" });
    inner.innerHTML =
      '<label for="shadow-input-2">Nested shadow input</label>' +
      '<input type="text" id="shadow-input-2" name="shadowDeep" placeholder="Two levels deep…">' +
      '<button type="button" id="shadow-submit-2">Submit</button>' +
      '<p id="inner-msg"></p>';
    inner.getElementById("shadow-submit-2").addEventListener("click", () => {
      const v = inner.getElementById("shadow-input-2").value;
      inner.getElementById("inner-msg").textContent = v ? "Depth 2 says: " + v : "Empty at depth 2.";
    });
  }

  /* ================= Windows, auth, cookies ================= */
  const windowOut = qs("#window-out");
  on(qs("#open-popup"), "click", () => {
    const w = window.open(
      "data:text/html;charset=utf-8," + encodeURIComponent(
        "<!doctype html><html><head><meta charset=utf-8><title>LocatorLab Popup</title>" +
        "<style>body{font-family:system-ui;background:#0a0c14;color:#e7eaf6;padding:34px}" +
        "h1{font-size:20px}code{color:#818cf8}</style></head><body>" +
        "<h1>Popup window</h1><p>You switched window handles to get here.</p>" +
        "<p>Input: <input id=popup-input placeholder='type here'></p>" +
        "<p id=popup-msg></p></body></html>"
      ),
      "ll-popup", "width=520,height=420"
    );
    if (windowOut) windowOut.textContent = w
      ? "Popup opened — switch to the new handle."
      : "Popup was blocked by the browser.";
  });

  on(qs("#open-tab"), "click", () => {
    window.open("../index.html", "_blank");
    if (windowOut) windowOut.textContent = "New tab opened with the home page.";
  });

  /* cookie banner */
  const banner = document.createElement("div");
  banner.className = "banner";
  banner.id = "cookie-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-label", "Cookie consent");
  banner.setAttribute("data-testid", "cookie-banner");
  banner.setAttribute("data-automation-id", "cookie-banner");
  banner.hidden = true;
  banner.innerHTML =
    '<span aria-hidden="true" style="font-size:1.3rem">&#127850;</span>' +
    "<div><strong>We use cookies</strong><p>This practice site stores only your theme preference. No tracking.</p></div>" +
    '<div class="row" style="gap:8px">' +
    '<button type="button" class="btn btn-sm" id="cookie-reject" data-testid="cookie-reject" data-automation-id="cookie-reject">Reject</button>' +
    '<button type="button" class="btn btn-primary btn-sm" id="cookie-accept" data-testid="cookie-accept" data-automation-id="cookie-accept">Accept all</button>' +
    "</div>";
  document.body.appendChild(banner);

  on(qs("#open-cookie"), "click", () => { banner.hidden = false; });
  on(qs("#cookie-accept"), "click", () => {
    banner.hidden = true;
    window.toast("Cookies accepted", "Preference stored for this session.", "success");
    window.lab.store.set("cookies", "accepted");
  });
  on(qs("#cookie-reject"), "click", () => {
    banner.hidden = true;
    window.toast("Cookies rejected", "Only essential storage remains.", "info");
    window.lab.store.set("cookies", "rejected");
  });

  /* simulated basic auth */
  on(qs("#open-auth"), "click", () => {
    const p = qs("#auth-panel");
    p.hidden = !p.hidden;
    if (!p.hidden) qs("#auth-user").focus();
  });
  on(qs("#auth-submit"), "click", () => {
    const u = qs("#auth-user").value.trim();
    const pw = qs("#auth-pass").value;
    const ok = u === "admin" && pw === "admin";
    qs("#auth-ok").hidden = !ok;
    qs("#auth-fail").hidden = ok;
    if (windowOut) windowOut.textContent = ok ? "Authenticated." : "401 Unauthorized.";
  });
})();
