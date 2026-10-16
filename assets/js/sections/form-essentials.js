/* Form Essentials — section behaviors */
(function () {
  "use strict";
  const { qs, qsa, on, debounce } = window.lab;

  /* ---- bio character counter ---- */
  const bio = qs("#bio-textarea"), bioCount = qs("#bio-count");
  if (bio && bioCount) {
    on(bio, "input", () => {
      bioCount.textContent = String(bio.value.length);
      const cc = bioCount.parentElement;
      cc.classList.toggle("over", bio.value.length >= 120);
    });
  }

  /* ---- quantity stepper ---- */
  const qty = qs("#quantity-input");
  if (qty) {
    const step = (d) => {
      const min = Number(qty.min || 0), max = Number(qty.max || 999);
      let v = Number(qty.value || 0) + d;
      v = Math.max(min, Math.min(max, v));
      qty.value = String(v);
      qty.dispatchEvent(new Event("change", { bubbles: true }));
    };
    on(qs("#qty-minus"), "click", () => step(-1));
    on(qs("#qty-plus"), "click", () => step(1));
  }

  /* ---- auto-filled + slow fields ---- */
  const auto = qs("#auto-field");
  if (auto) {
    setTimeout(() => {
      auto.value = "populated-by-script";
      auto.dispatchEvent(new Event("input", { bubbles: true }));
    }, 400);
  }
  const slow = qs("#slow-field");
  if (slow) {
    setTimeout(() => {
      slow.value = "arrived-after-2s";
      slow.placeholder = "";
      slow.dispatchEvent(new Event("input", { bubbles: true }));
    }, 2000);
  }

  /* ---- reveal hidden field ---- */
  const toggleHidden = qs("#toggle-hidden"), hiddenWrap = qs("#hidden-field-wrap");
  if (toggleHidden && hiddenWrap) {
    on(toggleHidden, "change", () => { hiddenWrap.hidden = !toggleHidden.checked; });
  }

  /* ---- validation demo ---- */
  const vform = qs("#validation-form");
  if (vform) {
    const RULES = {
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      username: (v) => /^[A-Za-z0-9_]{3,15}$/.test(v.trim()),
      password: (v) => v.length >= 8,
      digits: (v) => /^\d{6}$/.test(v.trim())
    };

    const checkField = (input, showValid) => {
      const wrap = input.closest(".field");
      const key = wrap.getAttribute("data-validate");
      const ok = RULES[key](input.value);
      wrap.classList.toggle("invalid", !ok);
      wrap.classList.toggle("valid", ok && showValid && input.value !== "");
      input.setAttribute("aria-invalid", String(!ok));
      if (!ok) input.setAttribute("aria-describedby", input.id + "-error");
      else input.removeAttribute("aria-describedby");
      return ok;
    };

    qsa("[data-validate] input", vform).forEach((inp) => {
      on(inp, "blur", () => checkField(inp, true));
      on(inp, "input", debounce(() => {
        const wrap = inp.closest(".field");
        if (wrap.classList.contains("invalid") || wrap.classList.contains("valid")) checkField(inp, true);
      }, 220));
    });

    on(vform, "submit", (e) => {
      e.preventDefault();
      let ok = true, firstBad = null;
      qsa("[data-validate] input", vform).forEach((inp) => {
        const good = checkField(inp, true);
        if (!good) { ok = false; if (!firstBad) firstBad = inp; }
      });
      const status = qs("#validation-status");
      if (ok) {
        status.textContent = "All 4 fields are valid.";
        status.style.color = "var(--ok)";
        window.toast("Form valid", "Every field passed its rule.", "success");
      } else {
        const n = vform.querySelectorAll(".field.invalid").length;
        status.textContent = n + " field(s) need attention.";
        status.style.color = "var(--err)";
        if (firstBad) firstBad.focus();
      }
    });

    on(qs("#validate-reset"), "click", () => {
      qsa(".field", vform).forEach((f) => f.classList.remove("invalid", "valid"));
      qs("#validation-status").textContent = "";
    });
  }

  /* ---- framework checkbox count ---- */
  const fws = qsa(".framework-cb"), fwOut = qs("#framework-count");
  const syncFw = () => {
    if (!fwOut) return;
    const n = fws.filter((c) => c.checked).length;
    fwOut.textContent = "Selected: " + n;
  };
  fws.forEach((c) => on(c, "change", syncFw));
  syncFw();

  /* ---- select-all + indeterminate ---- */
  const master = qs("#select-all-modules");
  const modules = qsa(".module-cb");
  if (master && modules.length) {
    const syncMaster = () => {
      const n = modules.filter((m) => m.checked).length;
      master.checked = n === modules.length;
      master.indeterminate = n > 0 && n < modules.length;
      master.setAttribute("aria-checked", master.indeterminate ? "mixed" : String(master.checked));
    };
    on(master, "change", () => {
      modules.forEach((m) => { m.checked = master.checked; });
      master.indeterminate = false;
    });
    modules.forEach((m) => on(m, "change", syncMaster));
    syncMaster();
  }

  /* ---- gender radio out ---- */
  const gOut = qs("#gender-out");
  qsa('input[name="gender"]').forEach((r) => {
    on(r, "change", () => { if (gOut) gOut.textContent = "Selected: " + r.value; });
  });

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

  /* ---- custom dropdown result (main.js emits lab:menu) ---- */
  const dropResult = qs("#dropdown-result");
  document.addEventListener("lab:menu", (e) => {
    const { value, item } = e.detail;
    if (item.id.indexOf("priority") === -1) return;
    if (!dropResult) return;
    const label = item.textContent.trim();
    dropResult.className = "alert alert-success";
    dropResult.innerHTML =
      '<span aria-hidden="true">&#10003;</span><div><strong>Priority set to ' + label +
      "</strong><p>data-value=<code>" + value + "</code> — the app would now re-order the queue.</p></div>";
  });

  /* ---- searchable combobox ---- */
  const LANGS = [
    "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Go", "Rust",
    "Ruby", "PHP", "Kotlin", "Swift", "Scala", "Dart", "Elixir", "Haskell",
    "Perl", "R", "MATLAB", "Objective-C", "Groovy", "Lua", "Julia", "Zig"
  ];
  const combo = qs("#language-combo");
  if (combo) {
    const input = qs("#language-combo-input", combo);
    const list = qs("#language-combo-list", combo);
    let active = -1, results = [];

    const render = (items) => {
      if (!items.length) {
        list.innerHTML = '<div class="combo-empty">No matches</div>';
        return;
      }
      list.innerHTML = items
        .map((lang) => {
          const i = lang.toLowerCase();
          const q = input.value.trim().toLowerCase();
          let marked = lang;
          if (q) {
            const at = i.indexOf(q);
            if (at > -1) {
              marked = lang.slice(0, at) + "<mark>" + lang.slice(at, at + q.length) + "</mark>" + lang.slice(at + q.length);
            }
          }
          return '<div class="combo-opt" role="option" data-value="' + lang + '" aria-selected="false">' +
            "<span>" + marked + "</span></div>";
        })
        .join("");
    };

    const open = () => {
      combo.classList.add("open");
      input.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      combo.classList.remove("open");
      input.setAttribute("aria-expanded", "false");
      active = -1;
    };

    const filter = () => {
      const q = input.value.trim().toLowerCase();
      results = q ? LANGS.filter((l) => l.toLowerCase().includes(q)) : LANGS.slice();
      render(results);
      active = -1;
      open();
    };

    on(input, "focus", filter);
    on(input, "input", debounce(filter, 90));
    on(input, "keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!combo.classList.contains("open")) filter();
        const opts = qsa(".combo-opt", list);
        if (!opts.length) return;
        active = e.key === "ArrowDown"
          ? (active + 1) % opts.length
          : (active - 1 + opts.length) % opts.length;
        opts.forEach((o, i) => o.classList.toggle("active", i === active));
        opts[active].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opts = qsa(".combo-opt", list);
        if (active > -1 && opts[active]) opts[active].click();
        else if (opts.length) opts[0].click();
      } else if (e.key === "Escape") {
        close();
      }
    });

    on(list, "click", (e) => {
      const opt = e.target.closest(".combo-opt");
      if (!opt) return;
      input.value = opt.getAttribute("data-value");
      qsa(".combo-opt", list).forEach((o) => o.setAttribute("aria-selected", "false"));
      opt.setAttribute("aria-selected", "true");
      close();
      input.focus();
      document.dispatchEvent(new CustomEvent("lab:combo", { detail: { value: input.value } }));
    });
  }

  /* ---- cascading dropdowns ---- */
  const DATA = {
    asia: { "New Delhi": ["Connaught Place", "Cyber City", "Bandra Kurla"], Tokyo: ["Shibuya", "Shinjuku"], Singapore: ["Marina Bay", "Orchard"] },
    europe: { London: ["Canary Wharf", "Shoreditch"], Berlin: ["Mitte", "Kreuzberg"], Paris: ["La Défense", "Le Marais"] },
    americas: { "New York": ["Manhattan", "Brooklyn"], "São Paulo": ["Pinheiros", "Vila Madalena"], Toronto: ["Downtown", "Yorkville"] },
    africa: { Lagos: ["Victoria Island", "Lekki"], Nairobi: ["Westlands", "Kilimani"], CapeTown: ["Sea Point", "Woodstock"] }
  };
  const region = qs("#region-select"), city = qs("#city-select"), branch = qs("#branch-select");
  const cascadeStatus = qs("#cascade-status");
  if (region && city && branch) {
    const fill = (sel, pairs, placeholder) => {
      sel.innerHTML = '<option value="">' + placeholder + "</option>" +
        pairs.map((p) => '<option value="' + p[0] + '">' + p[1] + "</option>").join("");
    };

    on(region, "change", () => {
      const r = region.value;
      if (!r) {
        fill(city, [], "Select region first…");
        city.disabled = true;
        fill(branch, [], "Select city first…");
        branch.disabled = true;
        if (cascadeStatus) cascadeStatus.textContent = "Waiting for region…";
        return;
      }
      const cities = Object.keys(DATA[r]);
      fill(city, cities.map((c) => [c, c]), "Select a city…");
      city.disabled = false;
      fill(branch, [], "Select city first…");
      branch.disabled = true;
      if (cascadeStatus) cascadeStatus.textContent = "Region set — " + cities.length + " cities available.";
    });

    on(city, "change", () => {
      const r = region.value, c = city.value;
      if (!c) {
        fill(branch, [], "Select city first…");
        branch.disabled = true;
        return;
      }
      const streets = DATA[r][c] || [];
      fill(branch, streets.map((s) => [s, s]), "Select a branch…");
      branch.disabled = false;
      if (cascadeStatus) cascadeStatus.textContent = c + " selected — " + streets.length + " branches available.";
    });
  }

  /* ---- tag input ---- */
  const tagInput = qs("#tag-input-field"), tagWrap = qs("#tag-wrap"), tagCount = qs("#tag-count");
  if (tagInput && tagWrap) {
    const slug = (s) => "tag-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const sync = () => {
      const n = tagWrap.querySelectorAll(".chip").length;
      if (tagCount) tagCount.textContent = "Tags: " + n;
    };
    const addTag = (raw) => {
      const text = raw.trim().replace(/,+$/, "");
      if (!text) return;
      const exists = Array.from(tagWrap.querySelectorAll(".chip")).some(
        (c) => c.textContent.replace(/\s*×\s*$/, "").trim().toLowerCase() === text.toLowerCase()
      );
      if (exists) { window.toast("Duplicate tag", '"' + text + '" is already added.', "warning"); return; }
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.setAttribute("data-testid", slug(text));
      chip.setAttribute("data-automation-id", slug(text));
      chip.appendChild(document.createTextNode(text));
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "\u00d7";
      btn.setAttribute("aria-label", "Remove " + text + " tag");
      btn.setAttribute("data-tag-remove", text);
      chip.appendChild(btn);
      tagWrap.insertBefore(chip, tagInput);
      sync();
    };

    on(tagInput, "keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInput.value);
        tagInput.value = "";
      } else if (e.key === "Backspace" && tagInput.value === "") {
        const chips = tagWrap.querySelectorAll(".chip");
        if (chips.length) { chips[chips.length - 1].remove(); sync(); }
      }
    });

    on(tagWrap, "click", (e) => {
      const b = e.target.closest("[data-tag-remove]");
      if (!b) return;
      e.preventDefault();
      b.closest(".chip").remove();
      sync();
      tagInput.focus();
    });

    sync();
  }
})();
