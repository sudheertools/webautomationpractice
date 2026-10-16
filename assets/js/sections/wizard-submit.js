/* Wizard & Submit — section behaviors */
(function () {
  "use strict";
  const { qs, qsa, on, debounce } = window.lab;

  /* ============================================================
     1. Registration form
     ============================================================ */
  const regForm = qs("#register-form");
  if (regForm) {
    const RULES = {
      required: (v) => v.trim() !== "",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      phone: (v) => /^\d{10}$/.test(v.replace(/\D/g, "")),
      password: (v) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)
    };

    const fieldOf = (el) => el.closest(".field");

    const validateOne = (el, force) => {
      const wrap = fieldOf(el);
      if (!wrap) return true;
      let ok = true;
      if (el.id === "reg-password") ok = RULES.password(el.value);
      else if (el.id === "reg-email") ok = RULES.email(el.value);
      else if (el.id === "reg-phone") ok = RULES.phone(el.value);
      else ok = RULES.required(el.value);

      const touched = wrap.dataset.touched === "1";
      if (force || touched) {
        wrap.classList.toggle("invalid", !ok);
        wrap.classList.toggle("valid", ok && el.value.trim() !== "");
        el.setAttribute("aria-invalid", String(!ok));
      }
      return ok;
    };

    const all = qsa("#reg-name, #reg-email, #reg-phone, #reg-dob, #reg-country, #reg-password", regForm);

    all.forEach((el) => {
      on(el, "blur", () => { fieldOf(el).dataset.touched = "1"; validateOne(el, true); });
      on(el, "input", debounce(() => {
        if (fieldOf(el).dataset.touched === "1") validateOne(el, true);
      }, 200));
      on(el, "change", () => {
        fieldOf(el).dataset.touched = "1";
        validateOne(el, true);
      });
    });

    /* password show/hide + strength */
    const pw = qs("#reg-password"), pwBar = qs("#reg-pw-bar"), pwText = qs("#reg-pw-text");
    const pwToggle = qs("#reg-pw-toggle");
    const scoreOf = (v) => {
      let s = 0;
      if (v.length >= 8) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      return s;
    };
    const LABELS = ["—", "Weak", "Fair", "Good", "Strong"];
    const COLORS = ["var(--err)", "var(--err)", "var(--warn)", "var(--info)", "var(--ok)"];

    if (pw && pwBar) {
      const syncPw = () => {
        const s = scoreOf(pw.value);
        pwBar.style.width = (s / 4) * 100 + "%";
        pwBar.style.background = COLORS[s];
        pwText.textContent = "Password strength: " + (pw.value ? LABELS[s] : "—");
      };
      on(pw, "input", debounce(syncPw, 120));
      syncPw();
    }
    if (pwToggle && pw) {
      on(pwToggle, "click", () => {
        const showing = pw.type === "text";
        pw.type = showing ? "password" : "text";
        pwToggle.setAttribute("aria-pressed", String(!showing));
        pwToggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    }

    /* terms link must not navigate */
    const termsLink = qs("#reg-terms-link");
    if (termsLink) on(termsLink, "click", (e) => {
      e.preventDefault();
      window.toast("Terms", "This is a demo link — no navigation.", "info");
    });

    /* reset clears validation state */
    on(regForm, "reset", () => {
      qsa(".field", regForm).forEach((f) => {
        f.classList.remove("invalid", "valid");
        delete f.dataset.touched;
      });
      qs("#reg-result").hidden = true;
      setTimeout(syncPw, 0);
    });

    on(regForm, "submit", (e) => {
      e.preventDefault();
      let ok = true, firstBad = null;
      all.forEach((el) => {
        fieldOf(el).dataset.touched = "1";
        if (!validateOne(el, true)) { ok = false; if (!firstBad) firstBad = el; }
      });

      const terms = qs("#reg-terms");
      const termsWrap = terms.closest(".field");
      if (!terms.checked) {
        termsWrap.classList.add("invalid");
        ok = false;
        if (!firstBad) firstBad = terms;
      } else termsWrap.classList.remove("invalid");

      if (!ok) {
        qs("#reg-result").hidden = true;
        window.toast("Check the form", "Some fields still need attention.", "warning");
        if (firstBad) firstBad.focus();
        return;
      }

      const btn = qs("#reg-submit");
      btn.classList.add("btn-loading");
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");

      setTimeout(() => {
        btn.classList.remove("btn-loading");
        btn.disabled = false;
        btn.removeAttribute("aria-busy");

        const email = qs("#reg-email").value.trim().toLowerCase();
        const result = qs("#reg-result");
        const isTaken = ["taken@example.com", "admin@admin.com"].includes(email);
        result.hidden = false;
        qs("#reg-result-ok").hidden = isTaken;
        qs("#reg-result-err").hidden = !isTaken;

        if (!isTaken) {
          const id = "ACC-" + String(Math.floor(100000 + Math.random() * 900000));
          qs("#reg-account-id").textContent = id;
          window.toast("Account created", "id " + id, "success");
          document.dispatchEvent(new CustomEvent("lab:register", { detail: { id: id, email: email } }));
        } else {
          window.toast("Already registered", "That email is taken.", "error");
          document.dispatchEvent(new CustomEvent("lab:register", { detail: { error: "duplicate", email: email } }));
        }
      }, 1600);
    });
  }

  /* ============================================================
     2. Standalone password playground
     ============================================================ */
  const pwField = qs("#pw-field");
  if (pwField) {
    const meter = qs("#pw-meter"), verdict = qs("#pw-verdict"), toggle = qs("#pw-toggle");
    const LABELS = ["Start typing…", "Weak", "Fair", "Good", "Strong"];
    const scoreOf = (v) => {
      let s = 0;
      if (v.length >= 8) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      return s;
    };
    const sync = () => {
      const s = scoreOf(pwField.value);
      meter.style.width = (s / 4) * 100 + "%";
      meter.setAttribute("data-score", String(s));
      verdict.querySelector("strong").textContent = "Score: " + s + " / 4";
      verdict.querySelector("p").textContent = LABELS[s];
      verdict.className = "alert " + (s >= 3 ? "alert-success" : s >= 2 ? "alert-warning" : "alert-info");
    };
    on(pwField, "input", debounce(sync, 100));
    on(toggle, "click", () => {
      const showing = pwField.type === "text";
      pwField.type = showing ? "password" : "text";
      toggle.setAttribute("aria-pressed", String(!showing));
      toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
    sync();
  }

  /* ============================================================
     3. OTP row
     ============================================================ */
  const otpRow = qs("#otp-row");
  if (otpRow) {
    const boxes = qsa("input", otpRow);
    const mirror = qs("#otp-value");
    const status = qs("#otp-status");
    const DEMO = "482913";
    const sync = () => {
      mirror.value = boxes.map((b) => b.value).join("");
    };

    boxes.forEach((b, i) => {
      on(b, "input", () => {
        b.value = b.value.replace(/\D/g, "").slice(0, 1);
        if (b.value && i < boxes.length - 1) boxes[i + 1].focus();
        sync();
      });
      on(b, "keydown", (e) => {
        if (e.key === "Backspace" && !b.value && i > 0) {
          boxes[i - 1].focus();
          boxes[i - 1].value = "";
          sync();
        }
        if (e.key === "ArrowLeft" && i > 0) boxes[i - 1].focus();
        if (e.key === "ArrowRight" && i < boxes.length - 1) boxes[i + 1].focus();
      });
      on(b, "paste", (e) => {
        const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "").slice(0, 6);
        if (!text) return;
        e.preventDefault();
        boxes.forEach((x, j) => { x.value = text[j] || ""; });
        (boxes[Math.min(text.length, 5)]).focus();
        sync();
      });
    });

    const clear = () => { boxes.forEach((b) => { b.value = ""; }); sync(); boxes[0].focus(); };
    on(qs("#otp-clear"), "click", () => {
      clear();
      status.innerHTML = 'Demo code: <code class="inline-code">482913</code>';
    });

    on(qs("#otp-resend"), "click", () => {
      clear();
      status.innerHTML = 'A new code was sent. Demo code: <code class="inline-code">' + DEMO + "</code>";
      window.toast("Code resent", "Check your inbox (demo).", "info");
    });

    on(qs("#otp-verify"), "click", () => {
      sync();
      if (mirror.value.length !== 6) {
        status.textContent = "Please enter all 6 digits.";
        status.style.color = "var(--err)";
        return;
      }
      if (mirror.value === DEMO) {
        status.textContent = "Code verified! Redirecting…";
        status.style.color = "var(--ok)";
        window.toast("Verified", "OTP accepted.", "success");
        document.dispatchEvent(new CustomEvent("lab:otp", { detail: { ok: true } }));
      } else {
        status.textContent = "Incorrect code. Try again.";
        status.style.color = "var(--err)";
        window.toast("Wrong code", "The demo code is 482913.", "error");
      }
    });

    boxes[0].focus();
  }

  /* ============================================================
     4. Multi-step wizard
     ============================================================ */
  const wizForm = qs("#wizard-form");
  if (wizForm) {
    const RULES = {
      required: (v) => v.trim() !== "",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      phone: (v) => /^\d{10}$/.test(v.replace(/\D/g, "")),
      digits: (v) => /^\d{6}$/.test(v.trim()),
      digits16: (v) => /^\d{16}$/.test(v.replace(/\s/g, "")),
      expiry: (v) => v !== "",
      cvv: (v) => /^\d{3,4}$/.test(v.trim())
    };

    let step = 1;
    const TOTAL = 4;
    const panels = qsa(".wiz-panel", wizForm);
    const nextBtn = qs("#wiz-next"), backBtn = qs("#wiz-back"), placeBtn = qs("#wiz-place");
    const statusEl = qs("#wiz-status");
    const doneEl = qs("#wiz-done");

    const stepFields = (n) =>
      qsa('[data-panel="' + n + '"] [data-wv] input, [data-panel="' + n + '"] [data-wv] select', wizForm);

    const validateStep = (n, force) => {
      let ok = true, firstBad = null;
      stepFields(n).forEach((el) => {
        const wrap = el.closest(".field");
        if (wrap.hidden) return;
        const rule = wrap.getAttribute("data-wv");
        const good = RULES[rule] ? RULES[rule](el.value) : true;
        if (force || wrap.dataset.touched === "1") {
          wrap.classList.toggle("invalid", !good);
          wrap.classList.toggle("valid", good && el.value.trim() !== "");
        }
        if (!good) { ok = false; if (!firstBad) firstBad = el; }
      });
      if (firstBad) firstBad.focus();
      return ok;
    };

    stepFields(1).forEach((el) => {
      on(el, "blur", () => { el.closest(".field").dataset.touched = "1"; validateStep(1, false); });
      on(el, "input", debounce(() => validateStep(step, false), 220));
    });

    /* payment method toggles the card fields */
    const cardField = qs("#wiz-card-field"), expiryField = qs("#wiz-expiry-field"), cvvField = qs("#wiz-cvv-field");
    const syncMethod = () => {
      const m = qs('input[name="wizMethod"]:checked', wizForm).value;
      const isCard = m === "card";
      [cardField, expiryField, cvvField].forEach((f) => {
        f.hidden = !isCard;
        f.querySelectorAll("input").forEach((i) => { i.required = isCard; });
      });
    };
    qsa('input[name="wizMethod"]', wizForm).forEach((r) => on(r, "change", syncMethod));

    /* card number formatting */
    const card = qs("#wiz-card");
    if (card) {
      on(card, "input", () => {
        const d = card.value.replace(/\D/g, "").slice(0, 16);
        card.value = d.replace(/(\d{4})(?=\d)/g, "$1 ");
      });
    }

    const show = (n) => {
      step = n;
      panels.forEach((p) => { p.hidden = Number(p.getAttribute("data-panel")) !== n; });
      qsa(".wstep", qs("#wiz-steps")).forEach((s) => {
        const i = Number(s.getAttribute("data-step"));
        s.classList.toggle("active", i === n);
        s.classList.toggle("done", i < n);
      });
      backBtn.disabled = n === 1;
      nextBtn.hidden = n === TOTAL;
      placeBtn.hidden = n !== TOTAL;
      if (statusEl) statusEl.textContent = "Step " + n + " of " + TOTAL;
      document.dispatchEvent(new CustomEvent("lab:wizard", { detail: { step: n } }));
    };

    const money = (n) => "$" + n.toLocaleString("en-US");

    const buildReview = () => {
      const name = [qs("#wiz-first").value, qs("#wiz-last").value].join(" ").trim();
      const address = [qs("#wiz-street").value, qs("#wiz-city").value,
        qs("#wiz-state").value, qs("#wiz-zip").value].filter(Boolean).join(", ");
      const method = qs('input[name="wizMethod"]:checked', wizForm);
      const methodLabel = method.parentElement.querySelector("strong").textContent;
      const total = 1499;
      qs('[data-review="name"]').textContent = name;
      qs('[data-review="email"]').textContent = qs("#wiz-email").value;
      qs('[data-review="phone"]').textContent = qs("#wiz-phone").value;
      qs('[data-review="address"]').textContent = address;
      qs('[data-review="payment"]').textContent = methodLabel + " \u2022 " +
        (method.value === "card" ? "card ending " + qs("#wiz-card").value.replace(/\s/g, "").slice(-4) : "no card needed");
      qs('[data-review="total"]').textContent = money(total);
    };

    on(nextBtn, "click", () => {
      if (!validateStep(step, true)) {
        window.toast("Step " + step + " incomplete", "Fix the highlighted fields.", "warning");
        return;
      }
      if (step === TOTAL - 1) buildReview();
      show(step + 1);
    });

    on(backBtn, "click", () => show(Math.max(1, step - 1)));

    on(placeBtn, "click", () => {
      const confirm = qs("#wiz-confirm");
      const wrap = confirm.closest(".field") || confirm.parentElement;
      if (!confirm.checked) {
        wrap.classList.add("invalid");
        confirm.focus();
        window.toast("Confirm first", "Tick the confirmation checkbox.", "warning");
        return;
      }
      wrap.classList.remove("invalid");

      placeBtn.classList.add("btn-loading");
      placeBtn.disabled = true;
      setTimeout(() => {
        placeBtn.classList.remove("btn-loading");
        placeBtn.disabled = false;
        const id = "ORD-" + String(Math.floor(10000 + Math.random() * 90000));
        qs("#wiz-order-id").textContent = id;
        wizForm.hidden = true;
        qs("#wiz-steps").hidden = true;
        doneEl.hidden = false;
        window.toast("Order placed", id, "success");
        document.dispatchEvent(new CustomEvent("lab:order", { detail: { id: id } }));
      }, 1800);
    });

    on(qs("#wiz-restart"), "click", () => {
      wizForm.reset();
      wizForm.hidden = false;
      qs("#wiz-steps").hidden = false;
      doneEl.hidden = true;
      qsa(".field", wizForm).forEach((f) => {
        f.classList.remove("invalid", "valid");
        delete f.dataset.touched;
      });
      syncMethod();
      show(1);
    });

    syncMethod();
    show(1);
  }
})();
