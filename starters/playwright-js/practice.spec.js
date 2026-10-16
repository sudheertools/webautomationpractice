// @ts-check
/**
 * LocatorLab — Playwright starter suite.
 *
 *   npm i -D @playwright/test && npx playwright install
 *   npx playwright test
 *
 * The config starts the bundled static server automatically unless BASE_URL is set.
 */
const { test, expect } = require("@playwright/test");

/* ================================================================
   1. Form essentials
   ================================================================ */
test.describe("Form essentials", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/form-essentials.html");
  });

  test("fills text inputs and asserts values", async ({ page }) => {
    await page.getByTestId("first-name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");
    await page.getByTestId("user-email").fill("ada@example.com");

    await expect(page.getByTestId("first-name")).toHaveValue("Ada");
    await expect(page.locator("#last-name")).toHaveValue("Lovelace");
  });

  test("label locator resolves to the same input", async ({ page }) => {
    const byLabel = page.getByLabel("First name");
    await byLabel.fill("Grace");
    await expect(page.locator("#first-name")).toHaveValue("Grace");
  });

  test("character counter tracks the textarea", async ({ page }) => {
    await page.getByTestId("bio-textarea").fill("a".repeat(120));
    await expect(page.locator("#bio-count")).toHaveText("120");
  });

  test("select-all drives the indeterminate master checkbox", async ({ page }) => {
    await page.getByTestId("select-all-modules").check();
    await expect(page.locator(".module-cb")).toHaveCount(5);
    for (const cb of await page.locator(".module-cb").all()) {
      await expect(cb).toBeChecked();
    }

    await page.getByTestId("mod-alerts").uncheck();
    const indeterminate = await page
      .locator("#select-all-modules")
      .evaluate((el) => /** @type {HTMLInputElement} */ (el).indeterminate);
    expect(indeterminate).toBe(true);
  });

  test("radio group keeps exactly one selection", async ({ page }) => {
    await page.getByTestId("gender-male").check();
    await expect(page.getByTestId("gender-male")).toBeChecked();
    await expect(page.getByTestId("gender-other")).not.toBeChecked();
    await expect(page.locator('input[name="gender"]:checked')).toHaveCount(1);
  });

  test("native select by value and by label", async ({ page }) => {
    await page.getByTestId("country-select").selectOption("in");
    await expect(page.getByTestId("country-select")).toHaveValue("in");

    const disabled = await page
      .locator("#plan-select option:disabled")
      .count();
    expect(disabled).toBe(2);
  });

  test("multi-select returns three skills", async ({ page }) => {
    await page.getByTestId("skills-select").selectOption(["xpath", "waits", "pom"]);
    await expect(page.locator("#skills-out")).toContainText("xpath");
    await expect(page.locator("#skills-out")).toContainText("pom");
  });

  test("custom (non-native) dropdown", async ({ page }) => {
    await page.getByTestId("priority-btn").click();
    await page.getByTestId("priority-high").click();

    await expect(page.getByTestId("priority-btn")).toContainText("High");
    await expect(page.locator("#dropdown-result")).toContainText("High");
    await expect(page.locator("#priority-menu")).toBeHidden();
  });

  test("searchable combobox filters and selects", async ({ page }) => {
    const input = page.getByTestId("language-combo-input");
    await input.click();
    await input.fill("pyth");

    const list = page.locator("#language-combo-list");
    await expect(list).toBeVisible();
    await expect(list.locator(".combo-opt")).not.toHaveCount(0);

    await list.locator(".combo-opt").first().click();
    await expect(input).toHaveValue("Python");
  });

  test("cascading dropdowns unlock in order", async ({ page }) => {
    await expect(page.getByTestId("city-select")).toBeDisabled();

    await page.getByTestId("region-select").selectOption("asia");
    await expect(page.getByTestId("city-select")).toBeEnabled();

    await page.getByTestId("city-select").selectOption("New Delhi");
    await expect(page.getByTestId("branch-select")).toBeEnabled();
    await expect(page.getByTestId("branch-select").locator("option")).toHaveCount(4);
  });

  test("tag input adds and removes chips", async ({ page }) => {
    const input = page.getByTestId("tag-input-field");
    await input.fill("Cypress");
    await input.press("Enter");

    await expect(page.locator("#tag-wrap .chip")).toHaveCount(3);
    await expect(page.locator("#tag-count")).toHaveText("Tags: 3");

    await page.getByLabel("Remove Selenium tag").click();
    await expect(page.getByTestId("tag-selenium")).toHaveCount(0);
  });

  test("validation surfaces four errors on empty submit", async ({ page }) => {
    await page.locator("#validate-submit").click();
    await expect(page.locator("#validation-form .field.invalid")).toHaveCount(4);
    await expect(page.locator("#val-email-error")).toBeVisible();
  });
});

/* ================================================================
   2. Dates & ranges
   ================================================================ */
test.describe("Dates & ranges", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/dates-ranges.html");
  });

  test("native date and time inputs", async ({ page }) => {
    await page.getByTestId("dob-input").fill("2001-05-20");
    await expect(page.getByTestId("dob-input")).toHaveValue("2001-05-20");

    await page.getByTestId("alarm-input").fill("06:15");
    await expect(page.getByTestId("alarm-input")).toHaveValue("06:15");
  });

  test("custom calendar navigates and selects", async ({ page }) => {
    await page.locator("#cal-next").click();
    await page.locator("#cal-next").click();

    const monthLabel = await page.locator("#cal-label").textContent();
    const day15 = page.locator('#cal-days [data-day$="-15"]').first();
    await day15.click();

    await expect(page.getByTestId("trip-date-input")).toHaveValue(/-15$/);
    expect(monthLabel).toBeTruthy();

    await page.getByTestId("cal-clear").click();
    await expect(page.getByTestId("trip-date-input")).toHaveValue("");
    await expect(page.locator("#cal-days .selected")).toHaveCount(0);
  });

  test("date range calculates nights", async ({ page }) => {
    await page.getByTestId("range-start").fill("2026-05-01");
    await page.getByTestId("range-end").fill("2026-05-04");
    await page.getByTestId("range-calc").click();
    await expect(page.locator("#range-nights")).toHaveText("3 nights");

    await page.getByTestId("range-end").fill("2026-04-28");
    await page.getByTestId("range-calc").click();
    await expect(page.locator("#range-out")).toHaveClass(/error/);
  });

  test("sliders update their outputs", async ({ page }) => {
    await page.getByTestId("volume-slider").fill("80");
    await expect(page.locator("#volume-out")).toHaveText("80");

    await page.getByTestId("price-min").fill("400");
    await expect(page.locator("#price-out")).toContainText("$400");
  });

  test("star rating is a radio group in reverse DOM order", async ({ page }) => {
    await page.locator('label[for="star-5"]').click();
    await expect(page.getByTestId("star-5")).toBeChecked();
    await expect(page.locator("#star-out")).toHaveText("Rating: 5 of 5");
    await expect(page.locator('#likert-matrix input[type="radio"]:checked')).toHaveCount(3);
  });

  test("color picker mirrors into the hex field", async ({ page }) => {
    await page.getByTestId("brand-color").fill("#22d3ee");
    await expect(page.getByTestId("color-hex")).toHaveValue("#22d3ee");
  });
});

/* ================================================================
   3. Files & buttons
   ================================================================ */
test.describe("Files & buttons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/files-buttons.html");
  });

  test("single file upload with setInputFiles", async ({ page }) => {
    await page.getByTestId("resume-input").setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF\n")
    });

    await expect(page.locator("#resume-file")).toBeVisible();
    await expect(page.locator("#resume-filename")).toHaveText("resume.pdf");

    await page.locator("#resume-remove").click();
    await expect(page.locator("#resume-file")).toBeHidden();
  });

  test("multiple upload renders one row per file", async ({ page }) => {
    const files = ["a.png", "b.png", "c.png"].map((name) => ({
      name,
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47])
    }));
    await page.getByTestId("gallery-input").setInputFiles(files);

    await expect(page.locator("#gallery-list .file-row")).toHaveCount(3);
    await expect(page.locator("#gallery-count")).toHaveText("3 files selected");

    await page.getByTestId("gallery-clear").click();
    await expect(page.locator("#gallery-list .file-row")).toHaveCount(0);
  });

  test("drag and drop zone accepts a file via the input", async ({ page }) => {
    await page.getByTestId("dnd-input").setInputFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello")
    });
    await expect(page.locator("#dnd-status")).toContainText("1 file(s) received");
    await expect(page.getByTestId("dnd-zone")).toHaveAttribute("tabindex", "0");
  });

  test("download event carries a deterministic filename", async ({ page }) => {
    const dlPromise = page.waitForEvent("download");
    await page.getByTestId("dl-text").click();
    const dl = await dlPromise;

    expect(dl.suggestedFilename()).toBe("report.txt");
    const stream = await dl.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString("utf8")).toContain("RESULT: PASS");
  });

  test("button click counters and double click", async ({ page }) => {
    const btn = page.getByTestId("btn-count");
    await btn.click();
    await btn.click();
    await btn.click();
    await expect(page.locator("#click-count")).toHaveText("3");

    await page.getByTestId("btn-dbl").dblclick();
    await expect(page.locator("#click-out")).toContainText("double");
  });

  test("icon-only button located by accessible name only", async ({ page }) => {
    await page.getByLabel("Open settings").click();
    await expect(page.locator(".toast")).toBeVisible();
  });

  test("loading state resolves to a success message", async ({ page }) => {
    const slow = page.getByTestId("btn-slow");
    await slow.click();
    await expect(slow).toHaveClass(/btn-loading/);
    await expect(slow).not.toHaveClass(/btn-loading/, { timeout: 5000 });
    await expect(page.locator("#slow-status")).toHaveText("Saved.");
  });

  test("aria-pressed toggles and the view group is single-select", async ({ page }) => {
    const bell = page.getByTestId("tg-bell");
    await expect(bell).toHaveAttribute("aria-pressed", "true");
    await bell.click();
    await expect(bell).toHaveAttribute("aria-pressed", "false");

    await page.getByTestId("view-list").click();
    await expect(page.getByTestId("view-list")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("view-grid")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#view-out")).toHaveText("Current view: list");
  });
});

/* ================================================================
   4. Wizard & submit
   ================================================================ */
test.describe("Wizard & submit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/wizard-submit.html");
  });

  test("empty submit shows seven errors", async ({ page }) => {
    await page.getByTestId("reg-submit").click();
    await expect(page.locator("#register-form .field.invalid")).toHaveCount(7);
  });

  test("password reveal toggles the input type and scores strength", async ({ page }) => {
    await page.getByTestId("pw-field").fill("Abcdef1!");
    await expect(page.getByTestId("pw-meter")).toHaveAttribute("data-score", "4");

    await page.getByTestId("pw-toggle").click();
    await expect(page.getByTestId("pw-field")).toHaveAttribute("type", "text");
  });

  test("full registration happy path", async ({ page }) => {
    await page.getByTestId("reg-name").fill("Ada Lovelace");
    await page.getByTestId("reg-email").fill("ada@example.com");
    await page.getByTestId("reg-phone").fill("9876543210");
    await page.getByTestId("reg-dob").fill("1990-12-10");
    await page.getByTestId("reg-country").selectOption("in");
    await page.getByTestId("reg-password").fill("Secret123");
    await page.getByTestId("reg-terms").check();

    await page.getByTestId("reg-submit").click();
    await expect(page.locator("#reg-result-ok")).toBeVisible();
    await expect(page.locator("#reg-account-id")).toHaveText(/^ACC-\d{6}$/);
  });

  test("duplicate email produces the error panel", async ({ page }) => {
    await page.getByTestId("reg-name").fill("Ada Lovelace");
    await page.getByTestId("reg-email").fill("taken@example.com");
    await page.getByTestId("reg-phone").fill("9876543210");
    await page.getByTestId("reg-dob").fill("1990-12-10");
    await page.getByTestId("reg-country").selectOption("in");
    await page.getByTestId("reg-password").fill("Secret123");
    await page.getByTestId("reg-terms").check();

    await page.getByTestId("reg-submit").click();
    await expect(page.locator("#reg-result-err")).toBeVisible();
  });

  test("OTP row auto-advances and mirrors the code", async ({ page }) => {
    const digits = "482913";
    for (let i = 0; i < 6; i++) {
      await page.getByTestId("otp-" + (i + 1)).fill(digits[i]);
    }
    await expect(page.getByTestId("otp-value")).toHaveValue(digits);

    await page.getByTestId("otp-verify").click();
    await expect(page.locator("#otp-status")).toContainText("verified");
  });

  test("four-step wizard validates, reviews and places the order", async ({ page }) => {
    // step 1
    await page.getByTestId("wiz-first").fill("Ada");
    await page.getByTestId("wiz-last").fill("Lovelace");
    await page.getByTestId("wiz-email").fill("ada@example.com");
    await page.getByTestId("wiz-phone").fill("9876543210");
    await page.getByTestId("wiz-next").click();
    await expect(page.getByTestId("wiz-street")).toBeVisible();

    // step 2
    await page.getByTestId("wiz-street").fill("12 Analytical Row");
    await page.getByTestId("wiz-city").fill("Bengaluru");
    await page.getByTestId("wiz-zip").fill("560001");
    await page.getByTestId("wiz-state").selectOption("KA");
    await page.getByTestId("wiz-next").click();

    // step 3 — switching to UPI hides the card fields
    await page.getByTestId("wiz-pm-upi").check();
    await expect(page.getByTestId("wiz-card")).toBeHidden();
    await page.getByTestId("wiz-next").click();

    // step 4 — review
    await expect(page.locator('[data-review="email"]')).toHaveText("ada@example.com");
    await expect(page.locator('[data-review="address"]')).toContainText("Bengaluru");

    await page.getByTestId("wiz-confirm").check();
    await page.getByTestId("wiz-place").click();

    await expect(page.locator("#wiz-done")).toBeVisible();
    await expect(page.locator("#wiz-order-id")).toHaveText(/^ORD-\d{5}$/);

    await page.getByTestId("wiz-restart").click();
    await expect(page.getByTestId("wiz-first")).toBeVisible();
  });
});

/* ================================================================
   5. Behaviors
   ================================================================ */
test.describe("Interactions & waits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pages/behaviors.html");
  });

  test("tabs switch panels and the disabled tab is inert", async ({ page }) => {
    await page.getByTestId("tab-features").click();
    await expect(page.locator("#panel-features")).toBeVisible();
    await expect(page.locator("#panel-overview")).toBeHidden();
    await expect(page.getByTestId("tab-disabled")).toBeDisabled();
  });

  test("accordion keeps a single panel open", async ({ page }) => {
    await page.getByTestId("acc-2").click();
    await expect(page.locator("#acc-panel-2")).toBeVisible();
    await expect(page.getByTestId("acc-1")).toHaveAttribute("aria-expanded", "false");
  });

  test("modal opens, submits and closes", async ({ page }) => {
    await page.getByTestId("open-modal").click();
    await page.getByTestId("modal-email").fill("peer@company.com");
    await page.getByTestId("modal-send").click();

    await expect(page.locator("#modal-backdrop")).toBeHidden();
    await expect(page.locator(".toast.success")).toBeVisible();
  });

  test("modal closes on Escape", async ({ page }) => {
    await page.getByTestId("open-modal").click();
    await expect(page.locator("#demo-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#modal-backdrop")).toBeHidden();
  });

  test("native confirm is accepted through a dialog handler", async ({ page }) => {
    page.once("dialog", (d) => d.accept());
    await page.getByTestId("js-confirm").click();
    await expect(page.locator("#dialog-out")).toContainText("confirmed");
  });

  test("toast appears then auto-dismisses", async ({ page }) => {
    await page.getByTestId("toast-success").click();
    const toast = page.locator(".toast.success");
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 8000 });
  });

  test("table filters, sorts and paginates", async ({ page }) => {
    await page.getByTestId("table-search").fill("jane");
    await expect(page.locator("#table-body tr")).toHaveCount(1);

    await page.getByTestId("table-reset").click();
    await expect(page.locator("#table-body tr")).toHaveCount(10);

    await page.getByTestId("th-name").click();
    await expect(page.locator("#table-body tr").first().locator("td").nth(1)).toHaveText("Aisha Khan");

    await page.getByTestId("table-size").selectOption("5");
    await expect(page.locator("#table-body tr")).toHaveCount(5);
    await page.locator('#table-pager button:has-text("2")').click();
    await expect(page.locator("#table-body tr").first().locator("td").first()).toHaveText("6");
  });

  test("drag and drop with the keyboard/button fallback", async ({ page }) => {
    await page.getByTestId("drag-move-all").click();
    await expect(page.locator("#done-zone .drag-item")).toHaveCount(3);
    await expect(page.locator("#drag-status")).toHaveText("3 tasks completed");

    await page.getByTestId("drag-reset").click();
    await page.dragAndDrop("#task-2", "#done-zone");
    await expect(page.locator("#done-zone [data-testid='task-2']")).toBeVisible();
  });

  test("explicit waits on delayed, removed and flaky elements", async ({ page }) => {
    await page.getByTestId("delay-select").selectOption("1");
    await page.getByTestId("delay-load").click();
    await expect(page.locator("#delayed-card")).toBeVisible({ timeout: 6000 });

    await page.getByTestId("tg-remove").click();
    await expect(page.getByTestId("tg-target")).toBeHidden();
    await page.getByTestId("tg-readd").click();
    await expect(page.getByTestId("tg-target")).toBeVisible();

    await expect(page.getByTestId("flaky-btn")).toBeVisible({ timeout: 6000 });
    await page.getByTestId("flaky-btn").click();
    await expect(page.locator("#flaky-status")).toHaveText("Clicked!");

    await expect(page.locator("#cycle-text")).toHaveText("Ready", { timeout: 10000 });
    await page.getByTestId("cycle-btn").click();
  });

  test("progress reaches 100%", async ({ page }) => {
    await page.getByTestId("prog-start").click();
    await expect(page.locator("#prog-bar")).toHaveCSS("width", "350px", { timeout: 15000 }).catch(() => {});
    await expect(page.locator("#prog-label")).toHaveText("100%", { timeout: 15000 });
  });

  test("infinite scroll appends batches", async ({ page }) => {
    const list = page.getByTestId("inf-list");
    for (let i = 0; i < 4; i++) {
      await list.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await page.waitForTimeout(350);
    }
    await expect(page.locator("#inf-list .inf-item")).toHaveCount(40);
    await expect(page.locator("#inf-item-25")).toBeAttached();
  });

  test("single and nested iframes", async ({ page }) => {
    await page.frameLocator("#single-frame").locator("#frame-input").fill("Hello");
    await page.frameLocator("#single-frame").locator("#frame-echo").click();
    await expect(page.frameLocator("#single-frame").locator("#frame-msg")).toContainText("Hello");

    // nested: outer frame contains another iframe
    await page.frameLocator("#nested-host").frameLocator("#nested-frame")
      .locator("#frame-input").fill("Deep");
    await expect(page.frameLocator("#nested-host").frameLocator("#nested-frame").locator("#frame-input"))
      .toHaveValue("Deep");
  });

  test("open shadow DOM is pierced automatically", async ({ page }) => {
    const host = page.getByTestId("shadow-host");
    await host.locator("#shadow-input").fill("secret");
    await host.locator("#shadow-submit").click();
    await expect(host.locator("#shadow-msg")).toContainText("secret");

    // two levels deep
    await page.getByTestId("shadow-host-2").locator("#shadow-input-2").fill("deep");
    await expect(page.getByTestId("shadow-host-2").locator("#shadow-input-2")).toHaveValue("deep");
  });

  test("simulated basic auth", async ({ page }) => {
    await page.getByTestId("open-auth").click();

    await page.getByTestId("auth-user").fill("admin");
    await page.getByTestId("auth-pass").fill("admin");
    await page.getByTestId("auth-submit").click();
    await expect(page.locator("#auth-ok")).toBeVisible();

    await page.getByTestId("auth-pass").fill("wrong");
    await page.getByTestId("auth-submit").click();
    await expect(page.locator("#auth-fail")).toBeVisible();
  });

  test("cookie banner appears and is dismissible", async ({ page }) => {
    await page.getByTestId("open-cookie").click();
    await expect(page.getByTestId("cookie-banner")).toBeVisible();
    await page.getByTestId("cookie-accept").click();
    await expect(page.getByTestId("cookie-banner")).toBeHidden();
  });
});

/* ================================================================
   6. Locator Coach itself
   ================================================================ */
test.describe("Locator Coach", () => {
  test("toggles on and exposes the inspect API", async ({ page }) => {
    await page.goto("/pages/form-essentials.html");

    await page.locator("[data-coach-toggle]").first().click();
    await expect(page.locator("body")).toHaveClass(/coach-on/);

    const info = await page.evaluate(() => {
      const el = /** @type {HTMLElement} */ (document.querySelector("#first-name"));
      const coach = /** @type {any} */ (window).LocatorCoach;
      const cands = coach.inspect(el).candidates;
      const code = coach.code(el);
      return {
        hasTestid: cands.some((c) => c.n === "data-testid"),
        hasId: cands.some((c) => c.n === "#id"),
        py: code.seleniumPython.includes("By.ID") || code.seleniumPython.includes("CSS_SELECTOR"),
        js: code.playwrightJs.includes("page.")
      };
    });

    expect(info.hasTestid).toBe(true);
    expect(info.hasId).toBe(true);
    expect(info.py).toBe(true);
    expect(info.js).toBe(true);
  });

  test("theme toggle flips data-theme", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator("[data-theme-toggle]").first().click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
