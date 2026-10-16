/* ============================================================
   LocatorLab — shared shell (theme, nav, toasts, helpers)
   ============================================================ */
(function () {
  "use strict";

  /* ---------- theme ---------- */
  const ROOT = document.documentElement;
  const THEME_KEY = "locatorlab-theme";

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function storeTheme(v) {
    try { localStorage.setItem(THEME_KEY, v); } catch (e) { /* private mode */ }
  }

  function applyTheme(t) {
    ROOT.setAttribute("data-theme", t);
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      const on = t === "light";
      btn.setAttribute("aria-pressed", String(on));
      const lbl = btn.querySelector("[data-theme-label]");
      if (lbl) lbl.textContent = on ? "Light" : "Dark";
      const ico = btn.querySelector("[data-theme-icon]");
      if (ico) ico.textContent = on ? "\u2600\uFE0E" : "\u263D";
    });
    document.dispatchEvent(new CustomEvent("lab:theme", { detail: t }));
  }

  applyTheme(getStoredTheme() || "dark");

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    const next = ROOT.getAttribute("data-theme") === "dark" ? "light" : "dark";
    storeTheme(next);
    applyTheme(next);
    toast("Theme switched", "Now using " + next + " mode. Useful for testing theme-dependent selectors.", "info");
  });

  /* ---------- sidebar ---------- */
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const burger = document.getElementById("burger");

  function closeNav() {
    sidebar && sidebar.classList.remove("open");
    scrim && scrim.classList.remove("open");
  }
  burger && burger.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    scrim && scrim.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  scrim && scrim.addEventListener("click", closeNav);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });

  /* ---------- active nav link ---------- */
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav a").forEach((a) => {
    const target = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
    if (target && target === here) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });

  /* ---------- toast ---------- */
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }

  const ICONS = { success: "\u2713", error: "\u2715", warning: "\u26A0", info: "\u2139" };

  function toast(title, msg, type) {
    type = type || "info";
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.innerHTML =
      '<span aria-hidden="true">' + (ICONS[type] || ICONS.info) + "</span>" +
      "<div><strong></strong><p></p></div>" +
      '<button class="t-close" aria-label="Dismiss">&times;</button>';
    el.querySelector("strong").textContent = title;
    el.querySelector("p").textContent = msg || "";
    const kill = () => {
      if (!el.isConnected) return;
      el.classList.add("out");
      setTimeout(() => el.remove(), 260);
    };
    el.querySelector(".t-close").addEventListener("click", kill);
    host.appendChild(el);
    setTimeout(kill, 5200);
    return el;
  }
  window.toast = toast;

  /* ---------- clipboard ---------- */
  function copyText(text, btn) {
    const done = () => {
      if (!btn) return;
      const old = btn.textContent;
      btn.textContent = "Copied";
      btn.classList.add("done");
      setTimeout(() => { btn.textContent = old; btn.classList.remove("done"); }, 1400);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();

    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0;top:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (err) { toast("Copy failed", "Select the text manually.", "warning"); }
      ta.remove();
    }
  }
  window.labCopy = copyText;

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    const src = b.getAttribute("data-copy");
    let text = "";
    if (src === "next-preceding") {
      const pre = b.parentElement.querySelector("pre");
      text = pre ? pre.innerText : "";
    } else if (src) {
      const el = document.querySelector(src);
      text = el ? (el.value !== undefined && el.tagName !== "PRE" ? el.value : el.innerText) : "";
    } else {
      const wrap = b.closest("[data-copy-root]");
      const el = wrap && (wrap.querySelector("code") || wrap.querySelector("pre"));
      text = el ? (el.innerText || el.value || "") : "";
    }
    if (text) copyText(text.trim(), b.classList.contains("copy-btn") ? b : null);
  });

  /* ---------- generic helpers ---------- */
  window.lab = {
    qs: (s, r) => (r || document).querySelector(s),
    qsa: (s, r) => Array.from((r || document).querySelectorAll(s)),
    on: (el, ev, fn, o) => el && el.addEventListener(ev, fn, o),
    all: (sel, fn) => document.querySelectorAll(sel).forEach(fn),
    debounce(fn, ms) {
      let t;
      return function () {
        const a = arguments, c = this;
        clearTimeout(t);
        t = setTimeout(() => fn.apply(c, a), ms || 180);
      };
    },
    store: {
      get(k, d) {
        try { const v = localStorage.getItem("ll:" + k); return v == null ? d : JSON.parse(v); }
        catch (e) { return d; }
      },
      set(k, v) { try { localStorage.setItem("ll:" + k, JSON.stringify(v)); } catch (e) {} },
      del(k) { try { localStorage.removeItem("ll:" + k); } catch (e) {} }
    }
  };

  /* ---------- little widgets used across pages ---------- */
  document.addEventListener("click", (e) => {
    /* dropdown menus */
    const mb = e.target.closest("[data-menu-btn]");
    document.querySelectorAll(".menu.open").forEach((m) => {
      if (!mb || m.previousElementSibling !== mb) m.classList.remove("open");
    });
    if (mb) {
      const menu = mb.nextElementSibling;
      const open = menu.classList.toggle("open");
      mb.setAttribute("aria-expanded", String(open));
      return;
    }
    const mi = e.target.closest(".menu-item");
    if (mi) {
      const menu = mi.closest(".menu");
      menu.classList.remove("open");
      const btn = menu.previousElementSibling;
      btn.setAttribute("aria-expanded", "false");
      const label = btn.querySelector("[data-menu-label]");
      if (label) label.textContent = mi.textContent.trim();
      menu.querySelectorAll(".menu-item").forEach((x) => x.setAttribute("aria-checked", "false"));
      mi.setAttribute("aria-checked", "true");
      document.dispatchEvent(new CustomEvent("lab:menu", { detail: { value: mi.dataset.value, item: mi } }));
      return;
    }
    /* combobox close */
    document.querySelectorAll(".combo.open").forEach((c) => {
      if (!e.target.closest(".combo")) {
        c.classList.remove("open");
        const i = c.querySelector(".combo-input");
        if (i) i.setAttribute("aria-expanded", "false");
      }
    });
  });

  /* dropdown menu: keep in sync when opened via keyboard */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".menu.open,.combo.open").forEach((el) => el.classList.remove("open"));
    }
  });

  /* ---------- footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- section entry animation (subtle) ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.style.opacity = "1"; en.target.style.transform = "none"; io.unobserve(en.target); }
      }),
      { threshold: 0.06 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.cssText = "opacity:0;transform:translateY(14px);transition:opacity .45s ease,transform .45s ease";
      io.observe(el);
    });
  }
})();
