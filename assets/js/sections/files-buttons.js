/* Files & Buttons — section behaviors */
(function () {
  "use strict";
  const { qs, qsa, on } = window.lab;

  const fmtSize = (b) => {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
  };

  /* ================= single upload ================= */
  const resumeInput = qs("#resume-input");
  if (resumeInput) {
    const zone = qs("#resume-zone");
    const row = qs("#resume-file");
    const nameEl = qs("#resume-filename");
    const sizeEl = qs("#resume-filesize");

    on(zone, "click", (e) => {
      if (e.target.closest("label")) return;
      resumeInput.click();
    });
    on(zone, "dragover", (e) => { e.preventDefault(); zone.classList.add("drag"); });
    on(zone, "dragleave", () => zone.classList.remove("drag"));
    on(zone, "drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag");
      if (e.dataTransfer.files.length) {
        resumeInput.files = e.dataTransfer.files;
        resumeInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    on(resumeInput, "change", () => {
      const f = resumeInput.files[0];
      if (!f) { row.hidden = true; return; }
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      if (!isPdf) {
        row.hidden = false;
        nameEl.textContent = "Rejected: PDFs only (" + f.name + ")";
        sizeEl.textContent = "";
        resumeInput.value = "";
        window.toast("Wrong file type", "Only PDF files are accepted here.", "error");
        return;
      }
      row.hidden = false;
      nameEl.textContent = f.name;
      sizeEl.textContent = fmtSize(f.size);
      zone.classList.add("drag");
      zone.querySelector("p").innerHTML = "<b>Ready to upload</b>";
      document.dispatchEvent(new CustomEvent("lab:upload", { detail: { id: "resume", file: f.name } }));
    });

    on(qs("#resume-remove"), "click", () => {
      resumeInput.value = "";
      row.hidden = true;
      zone.classList.remove("drag");
      zone.querySelector("p").textContent = "Drop your resume here, or";
    });
  }

  /* ================= multi upload ================= */
  const galleryInput = qs("#gallery-input");
  if (galleryInput) {
    const list = qs("#gallery-list");
    const empty = qs("#gallery-empty");
    const count = qs("#gallery-count");
    const MAX = 5;

    const render = () => {
      const files = Array.from(galleryInput.files);
      qsa(".file-row", list).forEach((r) => r.remove());
      empty.hidden = files.length > 0;
      files.forEach((f, i) => {
        const row = document.createElement("div");
        row.className = "file-row";
        row.setAttribute("data-testid", "gallery-row-" + (i + 1));
        row.setAttribute("data-automation-id", "gallery-row-" + (i + 1));
        row.innerHTML = '<span aria-hidden="true">&#128444;</span><span class="nm"></span><span class="sz"></span>';
        row.querySelector(".nm").textContent = f.name;
        row.querySelector(".sz").textContent = fmtSize(f.size);
        list.appendChild(row);
      });
      count.textContent = files.length + (files.length === 1 ? " file selected" : " files selected");
      document.dispatchEvent(new CustomEvent("lab:upload", { detail: { id: "gallery", count: files.length } }));
    };

    on(galleryInput, "change", () => {
      if (galleryInput.files.length > MAX) {
        window.toast("Too many files", "Maximum " + MAX + " files allowed.", "warning");
      }
      render();
    });
    on(qs("#gallery-clear"), "click", () => {
      galleryInput.value = "";
      render();
    });
    render();
  }

  /* ================= drag & drop zone ================= */
  const dndZone = qs("#dnd-zone");
  if (dndZone) {
    const dndInput = qs("#dnd-input");
    const status = qs("#dnd-status");

    const show = (files) => {
      if (!files.length) { status.textContent = "Waiting for a file\u2026"; return; }
      const names = Array.from(files).map((f) => f.name + " (" + fmtSize(f.size) + ")");
      status.innerHTML = "<b>" + files.length + " file(s) received</b><br>" + names.join("<br>");
    };

    on(dndZone, "click", (e) => {
      if (e.target !== dndZone && !e.target.closest("div")) return;
      dndInput.click();
    });
    on(dndZone, "keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dndInput.click(); }
    });
    on(dndInput, "change", () => show(dndInput.files));

    on(dndZone, "dragover", (e) => { e.preventDefault(); dndZone.classList.add("drag"); });
    on(dndZone, "dragenter", () => dndZone.classList.add("drag"));
    on(dndZone, "dragleave", (e) => {
      if (!dndZone.contains(e.relatedTarget)) dndZone.classList.remove("drag");
    });
    on(dndZone, "drop", (e) => {
      e.preventDefault();
      dndZone.classList.remove("drag");
      if (e.dataTransfer.files.length) {
        dndInput.files = e.dataTransfer.files;
        show(e.dataTransfer.files);
        document.dispatchEvent(new CustomEvent("lab:upload", { detail: { id: "dnd", count: e.dataTransfer.files.length } }));
      }
    });
  }

  /* ================= downloads ================= */
  const USERS = [
    { id: 1, name: "Jane Doe", role: "Admin", status: "active" },
    { id: 2, name: "John Smith", role: "Editor", status: "active" },
    { id: 3, name: "Maria Lopez", role: "Viewer", status: "inactive" },
    { id: 4, name: "Sam Chen", role: "Editor", status: "pending" },
    { id: 5, name: "Aisha Khan", role: "Admin", status: "active" }
  ];

  const dlStatus = qs("#dl-status");
  const triggerDownload = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.setAttribute("data-testid", "generated-download");
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (dlStatus) dlStatus.textContent = "Downloaded " + filename + " (" + fmtSize(blob.size) + ").";
    document.dispatchEvent(new CustomEvent("lab:download", { detail: { filename: filename, size: blob.size } }));
  };

  const dlText = qs("#dl-text");
  if (dlText) {
    on(dlText, "click", () => {
      triggerDownload("report.txt",
        "LocatorLab Automation Report\n" +
        "============================\n" +
        "Run ID: LL-2026-0001\n" +
        "Date: " + new Date().toISOString().slice(0, 10) + "\n" +
        "Total tests: 42\n" +
        "Passed: 42\n" +
        "Failed: 0\n" +
        "RESULT: PASS\n");
    });
    on(qs("#dl-json"), "click", () => {
      triggerDownload("data.json",
        JSON.stringify({ generatedBy: "LocatorLab", users: USERS, total: USERS.length }, null, 2),
        "application/json");
    });
    on(qs("#dl-csv"), "click", () => {
      const head = "id,name,role,status";
      const rows = USERS.map((u) => [u.id, u.name, u.role, u.status].join(","));
      triggerDownload("users.csv", [head].concat(rows).join("\n") + "\n", "text/csv");
    });
  }

  /* ================= button interactions ================= */
  const countBtn = qs("#btn-count"), countEl = qs("#click-count"), clickOut = qs("#click-out");
  if (countBtn) {
    let n = 0;
    on(countBtn, "click", () => {
      n++;
      countEl.textContent = String(n);
      if (clickOut) clickOut.textContent = "Single click #" + n;
    });
    on(qs("#btn-dbl"), "dblclick", () => {
      if (clickOut) clickOut.textContent = "Detected a double-click!";
      window.toast("Double-click", "dblclick() / double_click() received.", "info");
    });
    on(qs("#btn-ctx"), "contextmenu", (e) => {
      e.preventDefault();
      if (clickOut) clickOut.textContent = "Right-click (contextmenu) detected.";
      window.toast("Context menu", "Right-click handler fired.", "info");
    });
    on(qs("#btn-primary"), "click", () => window.toast("Primary", "You clicked the primary action.", "success"));
    on(qs("#btn-secondary"), "click", () => window.toast("Secondary", "You clicked the secondary action.", "info"));
    on(qs("#btn-danger"), "click", () => window.toast("Careful", "This would delete something in a real app.", "warning"));
    on(qs("#btn-ghost"), "click", () => window.toast("Ghost", "Ghost buttons are easy to miss with bad locators.", "info"));
    on(qs("#btn-icon"), "click", () => window.toast("Refresh", "List refreshed.", "success"));
    on(qs("#btn-icon-settings"), "click", () => window.toast("Settings", "Opened by aria-label.", "info"));
    on(qs("#btn-icon-close"), "click", () => window.toast("Close", "Panel would close here.", "info"));
    on(qs("#link-button"), "click", (e) => {
      e.preventDefault();
      window.toast("Link button", "This is an <a> tag — use link text or role=link.", "info");
    });
    on(qs("#fake-link-btn"), "click", () => window.toast("Button", "This is a real <button>.", "info"));

    /* split button */
    const splitToggle = qs("#split-toggle");
    if (splitToggle) {
      on(splitToggle, "click", () => {
        const open = splitToggle.getAttribute("aria-expanded") === "true";
        splitToggle.setAttribute("aria-expanded", String(!open));
        window.toast("Split menu", open ? "Menu closed." : "Menu would open here.", "info");
      });
      on(qs("#split-main"), "click", () => window.toast("Saved", "Default save action ran.", "success"));
    }

    /* async button states */
    const slow = qs("#btn-slow"), slowStatus = qs("#slow-status");
    if (slow) {
      on(slow, "click", () => {
        slow.classList.add("btn-loading");
        slow.setAttribute("aria-busy", "true");
        slow.disabled = true;
        slowStatus.textContent = "Saving\u2026";
        setTimeout(() => {
          slow.classList.remove("btn-loading");
          slow.removeAttribute("aria-busy");
          slow.disabled = false;
          slowStatus.textContent = "Saved.";
          window.toast("Saved", "The loading state finished after 2 seconds.", "success");
        }, 2000);
      });
    }
    const disAfter = qs("#btn-disable-after");
    if (disAfter) {
      on(disAfter, "click", () => {
        disAfter.disabled = true;
        window.toast("Disabled", "The button disabled itself after one click.", "warning");
      });
    }

    /* aria-pressed toggles */
    qsa("#tg-dark, #tg-bell, #tg-beta").forEach((b) => {
      on(b, "click", () => {
        if (b.disabled) return;
        const next = b.getAttribute("aria-pressed") !== "true";
        b.setAttribute("aria-pressed", String(next));
      });
    });

    /* view toggle group */
    const viewOut = qs("#view-out");
    qsa("#view-toggle [data-view]").forEach((b) => {
      on(b, "click", () => {
        qsa("#view-toggle [data-view]").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        if (viewOut) viewOut.textContent = "Current view: " + b.getAttribute("data-view");
      });
    });
  }
})();
