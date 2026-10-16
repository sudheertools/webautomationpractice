/* ============================================================
   LocatorCoach — on-page locator + code snippet overlay
   Hover an element -> chip. Click chip -> full panel with
   id / name / data-testid / CSS / XPath and copy-ready
   Selenium (Python, Java, C#) and Playwright (JS, Python) code.
   ============================================================ */
(function () {
  "use strict";

  const COACH_ATTRS = [
    "data-testid", "data-automation-id", "data-cy", "data-qa",
    "data-test", "data-loc", "id", "name"
  ];

  const INTERACTIVE = [
    "input", "select", "textarea", "button", "a", "label", "summary",
    "option", "details", "option", "[role=button]", "[role=tab]",
    "[role=checkbox]", "[role=menuitem]", "[role=option]", "[role=switch]",
    "[contenteditable=true]", "[data-coach]"
  ].join(",");

  /* ---------------- DOM scaffold ---------------- */
  const float = document.createElement("div");
  float.id = "coach-float";

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "coach-chip";
  chip.setAttribute("aria-label", "Open Locator Coach for this element");
  float.appendChild(chip);

  const outline = document.createElement("div");
  outline.className = "coach-outline";
  outline.setAttribute("data-dims", "");

  const panel = document.createElement("div");
  panel.className = "coach-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Locator Coach");
  panel.innerHTML =
    '<div class="coach-panel-head">' +
      '<span class="tag">Locator Coach</span>' +
      '<b data-elname>element</b>' +
      '<button type="button" class="x" aria-label="Close Locator Coach">&times;</button>' +
    "</div>" +
    '<div class="coach-tabs" role="tablist">' +
      '<button type="button" class="coach-tab" role="tab" data-tab="locators">Locators</button>' +
      '<button type="button" class="coach-tab" role="tab" data-tab="selenium">Selenium</button>' +
      '<button type="button" class="coach-tab" role="tab" data-tab="playwright">Playwright</button>' +
    "</div>" +
    '<div class="coach-body" data-body></div>';

  const hint = document.createElement("div");
  hint.className = "coach-hint";
  hint.innerHTML =
    '<span class="dot"></span>' +
    "<span>Locator Coach is <b>ON</b> &mdash; hover any control, then click its badge</span>" +
    '<kbd>Esc</kbd><span class="faint">close</span>';

  document.body.append(float, outline, panel, hint);

  /* ---------------- state ---------------- */
  let enabled = false;
  let current = null;
  let state = { tab: "locators", selenium: "python", playwright: "js" };

  const $ = (s) => panel.querySelector(s);
  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ---------------- helpers ---------------- */
  function labelFor(el) {
    try {
      if (el.labels && el.labels.length) {
        const t = (el.labels[0].innerText || el.labels[0].textContent || "").trim();
        if (t) return t.replace(/\s+/g, " ").replace(/\s*\*$/, "");
      }
    } catch (e) {}
    const aria = el.getAttribute("aria-label");
    if (aria) return aria.trim();
    const lb = el.closest("label");
    if (lb) {
      const t = (lb.innerText || "").trim().replace(/\s+/g, " ");
      if (t) return t.replace(/\s*\*$/, "");
    }
    return "";
  }

  function accName(el) {
    const aria = el.getAttribute("aria-label");
    if (aria) return aria.trim();
    const txt = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
    if (txt) return txt;
    const lb = labelFor(el);
    if (lb) return lb;
    const ph = el.getAttribute("placeholder");
    return ph ? ph.trim() : "";
  }

  function cssEsc(v) {
    if (window.CSS && CSS.escape) return CSS.escape(v);
    return String(v).replace(/([^\w-])/g, "\\$1");
  }

  function testAttr(el) {
    for (let i = 0; i < COACH_ATTRS.length; i++) {
      const a = COACH_ATTRS[i];
      if (a === "id" || a === "name") continue;
      const v = el.getAttribute(a);
      if (v) return { attr: a, value: v };
    }
    return null;
  }

  function cssPath(el) {
    if (el.id) return "#" + cssEsc(el.id);
    const t = testAttr(el);
    if (t) return "[" + t.attr + '="' + t.value + '"]';
    const tag = el.tagName.toLowerCase();
    const nm = el.getAttribute("name");
    if (nm && (tag === "input" || tag === "select" || tag === "textarea"))
      return tag + '[name="' + nm + '"]';
    const ph = el.getAttribute("placeholder");
    if (ph) return tag + '[placeholder="' + ph + '"]';

    const parts = [];
    let node = el;
    for (let d = 0; node && node.nodeType === 1 && d < 6; d++) {
      let s = node.tagName.toLowerCase();
      if (node.id) { parts.unshift("#" + cssEsc(node.id)); break; }
      const p = node.parentElement;
      if (p) {
        const same = Array.prototype.filter.call(p.children, (c) => c.tagName === node.tagName);
        if (same.length > 1) s += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
      }
      parts.unshift(s);
      node = p;
    }
    return parts.join(" > ");
  }

  function xpathFor(el) {
    if (el.id) return '//*[@id="' + el.id + '"]';
    const t = testAttr(el);
    if (t) return "//" + el.tagName.toLowerCase() + '[@' + t.attr + '="' + t.value + '"]';
    const nm = el.getAttribute("name");
    if (nm) return "//" + el.tagName.toLowerCase() + '[@name="' + nm + '"]';
    const lb = labelFor(el);
    if (lb) {
      const tag = el.tagName.toLowerCase();
      const q = lb.replace(/"/g, '\\"');
      return '//label[normalize-space()="' + q + '"]/following::' + tag + "[1]";
    }
    const ph = el.getAttribute("placeholder");
    if (ph) return "//" + el.tagName.toLowerCase() + '[@placeholder="' + ph.replace(/"/g, '\\"') + '"]';

    /* positional path */
    const segs = [];
    let node = el;
    for (let d = 0; node && node.nodeType === 1 && d < 6; d++) {
      let ix = 1;
      let sib = node.previousElementSibling;
      while (sib) {
        if (sib.tagName === node.tagName) ix++;
        sib = sib.previousElementSibling;
      }
      segs.unshift(node.tagName.toLowerCase() + "[" + ix + "]");
      node = node.parentElement;
    }
    return "//" + segs.join("/");
  }

  function bestStrategy(el) {
    const t = testAttr(el);
    if (t && t.attr === "data-testid") return { kind: "testid", value: t.value };
    if (el.id) return { kind: "id", value: el.id };
    if (t) return { kind: "attr", attr: t.attr, value: t.value };
    const nm = el.getAttribute("name");
    if (nm) return { kind: "name", value: nm };
    const lb = labelFor(el);
    if (lb) return { kind: "label", value: lb };
    return { kind: "css", value: cssPath(el) };
  }

  function actionOf(el) {
    const tag = el.tagName;
    const type = (el.getAttribute("type") || "").toLowerCase();

    if (tag === "SELECT") {
      const multi = el.hasAttribute("multiple");
      return {
        py: multi ? "select_by_value" : "select_by_visible_text",
        pyArg: multi ? '"Option A"' : '"Option text"',
        pyCall: multi ? 'select.select_by_value("Option A")' : 'select.select_by_visible_text("Option text")',
        javaCall: multi ? 'select.selectByValue("Option A");' : 'selectByVisibleText("Option text");',
        javaPre: "Select select = new Select(el);\n    ",
        csCall: multi ? 'select.SelectByValue("Option A");' : 'select.SelectByVisibleText("Option text");',
        csPre: "Select select = new Select(el);\n      ",
        pwJs: multi ? 'selectOption(["a", "b"])' : 'selectOption("label")',
        pwPy: multi ? 'select_option(["a", "b"])' : 'select_option("label")'
      };
    }
    if (tag === "A" || el.getAttribute("role") === "link")
      return simple("click()", "Click()", "click()", "click()");
    if (tag === "BUTTON" || type === "submit" || type === "button" || type === "reset")
      return simple("click()", "Click()", "click()", "click()");
    if (type === "checkbox" || el.getAttribute("role") === "checkbox")
      return simple("click()", "Click()", "check() / uncheck()", "check() / uncheck()");
    if (type === "radio")
      return simple("click()", "Click()", "check()", "check()");
    if (type === "range")
      return {
        py: "clear() + send_keys", pyArg: '"75"', pyCall: 'el.clear()\n    el.send_keys("75")',
        javaCall: 'el.clear();\n    el.sendKeys("75");', javaPre: "",
        csCall: 'el.Clear();\n      el.SendKeys("75");', csPre: "",
        pwJs: 'fill("75")', pwPy: 'fill("75")'
      };
    if (type === "file")
      return {
        py: "send_keys()", pyArg: 'C:\\path\\file.pdf', pyCall: 'el.send_keys("C:\\\\path\\\\file.pdf")',
        javaCall: 'el.sendKeys("C:\\\\path\\\\file.pdf");', javaPre: "",
        csCall: 'el.SendKeys(@"C:\\path\\file.pdf");', csPre: "",
        pwJs: 'setInputFiles("file.pdf")', pwPy: 'set_input_files("file.pdf")'
      };
    if (type === "date" || type === "time" || type === "datetime-local" || type === "month")
      return simple('send_keys("2026-01-15")', 'sendKeys("2026-01-15")', 'fill("2026-01-15")', 'fill("2026-01-15")');
    if (tag === "TEXTAREA")
      return simple("send_keys()", "sendKeys()", "fill()", "fill()");
    if (el.isContentEditable)
      return simple("send_keys()", "sendKeys()", "fill()", "fill()");
    if (tag === "INPUT") {
      if (type === "password" || type === "search" || type === "email" || type === "tel" || type === "url" || type === "number" || !type || type === "text")
        return simple("send_keys()", "sendKeys()", "fill()", "fill()");
      return simple("send_keys()", "sendKeys()", "fill()", "fill()");
    }
    if (tag === "IMG") return simple("click()", "Click()", "click()", "click()");
    return simple("click()", "Click()", "click()", "click()");
  }

  function simple(py, java, pwJs, pwPy) {
    return { py: py, pyArg: "", pyCall: py === "click()" ? "el.click()" : "el.send_keys(\"\")",
      javaCall: java === "Click()" ? "el.click();" : 'el.sendKeys("");',
      javaPre: "",
      csCall: java === "Click()" ? "el.Click();" : 'el.SendKeys("");',
      csPre: "", pwJs: pwJs, pwPy: pwPy };
  }

  /* ---------------- locator candidates ---------------- */
  function candidates(el) {
    const out = [];
    const tag = el.tagName.toLowerCase();
    const t = testAttr(el);
    const id = el.id;
    const nm = el.getAttribute("name");
    const lb = labelFor(el);
    const ph = el.getAttribute("placeholder");
    const aria = el.getAttribute("aria-label");
    const role = el.getAttribute("role");
    const name = accName(el);

    if (t && t.attr === "data-testid")
      out.push({ n: "data-testid", css: '[data-testid="' + t.value + '"]', xp: '//*[@data-testid="' + t.value + '"]', best: 1 });
    if (id)
      out.push({ n: "#id", css: "#" + cssEsc(id), xp: '//*[@id="' + id + '"]', best: out.length === 0 ? 1 : 0 });
    if (t && t.attr !== "data-testid")
      out.push({ n: t.attr, css: "[" + t.attr + '="' + t.value + '"]',
        xp: "//" + tag + "[@" + t.attr + '="' + t.value + '"]', best: out.length === 0 ? 1 : 0 });
    if (nm)
      out.push({ n: "name", css: tag + '[name="' + nm + '"]',
        xp: "//" + tag + '[@name="' + nm + '"]', best: out.length === 0 ? 1 : 0 });
    if (lb)
      out.push({ n: "label", css: tag + "[id]", xp: '//label[normalize-space()="' + lb.replace(/"/g, '\\"') + '"]/following::' + tag + "[1]",
        best: out.length === 0 ? 1 : 0, label: lb });
    if (aria && !lb)
      out.push({ n: "aria-label", css: tag + '[aria-label="' + aria + '"]',
        xp: '//*[@aria-label="' + aria + '"]', best: out.length === 0 ? 1 : 0 });
    if (ph)
      out.push({ n: "placeholder", css: tag + '[placeholder="' + ph + '"]',
        xp: "//" + tag + '[@placeholder="' + ph + '"]', best: out.length === 0 ? 1 : 0 });
    if (role && name && (role === "button" || role === "tab" || role === "link"))
      out.push({ n: "role+name", css: '[role="' + role + '"]', xp: '//*[@role="' + role + '" and normalize-space()="' + name + '"]',
        best: out.length === 0 ? 1 : 0, label: name });

    out.push({ n: "CSS", css: cssPath(el), xp: xpathFor(el), best: 0 });
    out.push({ n: "XPath", css: cssPath(el), xp: xpathFor(el), best: 0, xpathOnly: 1 });
    return out;
  }

  /* ---------------- code generators ---------------- */
  function selPython(el, c) {
    const a = actionOf(el);
    const head = "# pip install selenium\nfrom selenium.webdriver.common.by import By\nfrom selenium.webdriver.support.ui import Select\n\ndriver.get(\"" + location.href.split("#")[0] + "\")\n\n";
    let find, body;
    const n = c.n;
    if (n === "#id") find = 'el = driver.find_element(By.ID, "' + c.css.slice(1).replace(/\\/g, "") + '")';
    else if (n === "name") find = 'el = driver.find_element(By.NAME, "' + attrVal(c.css, "name") + '")';
    else if (n.indexOf("data-") === 0 || n.indexOf("aria") === 0 || n === "placeholder")
      find = 'el = driver.find_element(By.CSS_SELECTOR, "' + c.css + '")';
    else if (n === "label")
      find = 'el = driver.find_element(By.XPATH, "' + c.xp + '")';
    else if (n === "role+name")
      find = 'el = driver.find_element(By.XPATH, "' + c.xp + '")';
    else if (n === "CSS") find = 'el = driver.find_element(By.CSS_SELECTOR, "' + c.css + '")';
    else find = 'el = driver.find_element(By.XPATH, "' + c.xp + '")';

    if (el.tagName === "SELECT") body = "select = Select(el)\n    " + a.pyCall;
    else if (a.py === "click()") body = "el.click()";
    else if (a.py.indexOf("clear") === 0) body = a.pyCall;
    else body = "el.send_keys(\"" + (a.pyArg ? a.pyArg.replace(/"/g, "") : "Hello") + "\")";

    return head + find + "\n" + body;
  }

  function selJava(el, c) {
    const a = actionOf(el);
    const head = "// pom.xml -> org.seleniumhq.selenium:selenium-java\nimport org.openqa.selenium.By;\nimport org.openqa.selenium.WebElement;\nimport org.openqa.selenium.support.ui.Select;\n\n driver.get(\"" + location.href.split("#")[0] + "\");\n\n";
    let find;
    const n = c.n;
    if (n === "#id") find = 'WebElement el = driver.findElement(By.id("' + c.css.slice(1).replace(/\\/g, "") + '"));';
    else if (n === "name") find = 'WebElement el = driver.findElement(By.name("' + attrVal(c.css, "name") + '"));';
    else if (n === "label" || n === "role+name" || n === "XPath")
      find = 'WebElement el = driver.findElement(By.xpath("' + c.xp + '"));';
    else if (n === "CSS" || n.indexOf("data-") === 0 || n.indexOf("aria") === 0 || n === "placeholder")
      find = 'WebElement el = driver.findElement(By.cssSelector("' + c.css + '"));';
    else find = 'WebElement el = driver.findElement(By.cssSelector("' + c.css + '"));';

    let body;
    if (el.tagName === "SELECT") body = a.javaPre + a.javaCall;
    else if (a.javaCall === "Click();") body = "el.click();";
    else body = a.javaCall;
    return head + find + "\n    " + body;
  }

  function selCSharp(el, c) {
    const a = actionOf(el);
    const head = "// Install-Package Selenium.WebDriver\nusing OpenQA.Selenium;\nusing OpenQA.Selenium.Support.UI;\n\ndriver.Navigate().GoToUrl(\"" + location.href.split("#")[0] + "\");\n\n";
    let find;
    const n = c.n;
    if (n === "#id") find = 'var el = driver.FindElement(By.Id("' + c.css.slice(1).replace(/\\/g, "") + '"));';
    else if (n === "name") find = 'var el = driver.FindElement(By.Name("' + attrVal(c.css, "name") + '"));';
    else if (n === "label" || n === "role+name" || n === "XPath")
      find = 'var el = driver.FindElement(By.XPath("' + c.xp + '"));';
    else find = 'var el = driver.FindElement(By.CssSelector("' + c.css + '"));';

    let body;
    if (el.tagName === "SELECT") body = a.csPre + a.csCall;
    else if (a.csCall === "Click();") body = "el.Click();";
    else body = a.csCall;
    return head + find + "\n      " + body;
  }

  function pwJs(el, c) {
    const a = actionOf(el);
    const n = c.n;
    let base, act = a.pwJs;
    if (n === "data-testid") base = 'page.getByTestId("' + valOf(c.css) + '")';
    else if (n === "#id") base = 'page.locator("#' + valOf(c.css) + '")';
    else if (n === "label") base = 'page.getByLabel("' + c.label.replace(/"/g, "") + '")';
    else if (n === "role+name") {
      const role = el.tagName === "BUTTON" || el.getAttribute("role") === "button" ? "button"
        : el.tagName === "A" ? "link" : (el.getAttribute("role") || "button");
      base = 'page.getByRole("' + role + '", { name: "' + c.label.replace(/"/g, "") + '" })';
    }
    else if (n === "name") base = 'page.locator(\'' + valOf(c.css) + "')";
    else if (n === "placeholder") base = 'page.getByPlaceholder("' + ph(el) + '")';
    else if (n === "aria-label") base = 'page.locator(\'' + c.css + "')";
    else base = "page.locator('" + c.css + "')";

    if (act.indexOf("/") > -1) act = "click()";
    return "// npm i -D @playwright/test\nawait page.goto(\"" + location.href.split("#")[0] + "\");\n\nawait " + base + "." + act + ";";
  }

  function pwPython(el, c) {
    const js = pwJs(el, c);
    return js
      .replace(/\/\/ .*\n/, "# pip install playwright\n")
      .replace(/page\.goto\((.*?)\);/, "page.goto($1)")
      .replace(/getByTestId\((.*?)\)/g, "get_by_test_id($1)")
      .replace(/getByLabel\((.*?)\)/g, "get_by_label($1)")
      .replace(/getByRole\(([^,]+), \{ name: (.*?) \}\)/g, "get_by_role($1, name=$2)")
      .replace(/getByPlaceholder\((.*?)\)/g, "get_by_placeholder($1)")
      .replace(/\.selectOption\(/g, ".select_option(")
      .replace(/\.setInputFiles\(/g, ".set_input_files(")
      .replace(/\.uncheck\(\)/g, ".uncheck()")
      .replace(/\.check\(\)/g, ".check()")
      .replace(/\.fill\(/g, ".fill(")
      .replace(/\.click\(\);/g, ".click()")
      .replace(/\.fill\((.*?)\);/g, ".fill($1)");
  }

  function attrVal(css, name) {
    const m = css.match(new RegExp(name + '="([^"]*)"'));
    return m ? m[1] : css;
  }
  function valOf(css) {
    const m = css.match(/="([^"]*)"/);
    return m ? m[1] : css.replace(/^#/, "");
  }
  function ph(el) { return (el.getAttribute("placeholder") || "").replace(/"/g, ""); }

  /* ---------------- rendering ---------------- */
  function elName(el) {
    let s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    else if (el.getAttribute("name")) s += "[name=" + el.getAttribute("name") + "]";
    const t = testAttr(el);
    if (t) s += "[" + t.attr + "=" + t.value + "]";
    return s;
  }

  function render() {
    const el = current;
    if (!el) return;
    $("[data-elname]").textContent = elName(el);
    panel.querySelectorAll(".coach-tab").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.tab === state.tab));
    });

    const body = $("[data-body]");
    const cands = candidates(el);
    const best = cands.find((c) => c.best) || cands[0];
    let html = "";

    if (state.tab === "locators") {
      cands.forEach((c) => {
        const val = c.xpathOnly ? c.xp : (c.n === "label" || c.n === "role+name" ? c.xp : c.css);
        html +=
          '<div class="coach-loc' + (c.best ? " best" : "") + '">' +
            '<span class="lbl">' + esc(c.n) + (c.best ? " \u2605" : "") + "</span>" +
            "<code>" + esc(val) + "</code>" +
            '<button type="button" class="copy-btn" data-copy-value="' + esc(val) + '">copy</button>' +
          "</div>";
      });
      html += '<div class="coach-note">Selenium: <code class="inline-code">' +
        esc(best.n === "#id" ? 'By.id("' + best.css.slice(1).replace(/\\/g, "") + '")'
          : best.n === "name" ? 'By.name("' + attrVal(best.css, "name") + '")'
          : best.n === "CSS" ? 'By.css_selector("' + best.css + '")'
          : 'By.xpath("' + best.xp + '")') +
        "</code> &middot; Playwright: <code class=\"inline-code\">" + esc(pwSel(best)) + "</code></div>";
    }

    if (state.tab === "selenium") {
      html += langPills("selenium", [["python", "Python"], ["java", "Java"], ["csharp", "C#"]]);
      const code = state.selenium === "python" ? selPython(el, best)
        : state.selenium === "java" ? selJava(el, best) : selCSharp(el, best);
      html += snippet(code);
    }

    if (state.tab === "playwright") {
      html += langPills("playwright", [["js", "JavaScript"], ["python", "Python"]]);
      const code = state.playwright === "js" ? pwJs(el, best) : pwPython(el, best);
      html += snippet(code);
    }

    body.innerHTML = html;
    body.querySelectorAll("[data-copy-value]").forEach((b) => {
      b.addEventListener("click", () => {
        window.labCopy(b.getAttribute("data-copy-value"), b);
      });
    });
    body.querySelectorAll("[data-lang]").forEach((b) => {
      b.addEventListener("click", () => {
        state[b.dataset.group] = b.dataset.lang;
        render();
      });
    });
    body.querySelectorAll(".coach-snippet .copy-btn").forEach((b) => {
      b.addEventListener("click", () => {
        const pre = b.parentElement.querySelector("pre");
        window.labCopy(pre.innerText, b);
      });
    });
  }

  function pwSel(c) {
    if (c.n === "data-testid") return 'page.getByTestId("' + valOf(c.css) + '")';
    if (c.n === "#id") return 'page.locator("#' + valOf(c.css) + '")';
    if (c.n === "label") return 'page.getByLabel("' + (c.label || "") + '")';
    if (c.n === "name") return "page.locator('" + c.css + "')";
    return "page.locator('" + c.css + "')";
  }

  function langPills(group, opts) {
    let h = '<div class="row" style="gap:7px;margin-bottom:4px">';
    opts.forEach((o) => {
      const on = state[group] === o[0];
      h += '<button type="button" class="copy-btn' + (on ? " done" : "") +
        '" data-lang="' + o[0] + '" data-group="' + group + '" style="font-size:.72rem;padding:5px 11px;text-transform:none;letter-spacing:0">' +
        o[1] + "</button>";
    });
    return h + "</div>";
  }

  function snippet(code) {
    return '<div class="coach-snippet"><button type="button" class="copy-btn">copy</button><pre class="code">' +
      esc(code) + "</pre></div>";
  }

  /* ---------------- positioning ---------------- */
  function placeFloat(el) {
    const r = el.getBoundingClientRect();
    float.style.display = "block";
    float.style.visibility = "hidden";
    const w = float.offsetWidth || 160;
    const h = float.offsetHeight || 26;
    let left = r.left;
    let top = r.top - h - 8;
    if (top < 6) top = r.bottom + 8;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    if (left < 8) left = 8;
    float.style.left = Math.round(left + window.scrollX) + "px";
    float.style.top = Math.round(top + window.scrollY) + "px";
    float.style.visibility = "visible";
    float.classList.add("show");
  }

  function placeOutline(el) {
    const r = el.getBoundingClientRect();
    outline.style.left = Math.round(r.left - 3) + "px";
    outline.style.top = Math.round(r.top - 3) + "px";
    outline.style.width = Math.round(r.width + 6) + "px";
    outline.style.height = Math.round(r.height + 6) + "px";
    outline.setAttribute("data-dims", Math.round(r.width) + "\u00D7" + Math.round(r.height));
    outline.style.display = "block";
  }

  function placePanel(el) {
    panel.style.display = "flex";
    const r = el.getBoundingClientRect();
    const pw = panel.offsetWidth;
    const phh = panel.offsetHeight;
    let left = r.left;
    let top = r.bottom + 14;
    if (top + phh > window.innerHeight - 10) top = Math.max(10, r.top - phh - 14);
    if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
    if (left < 10) left = 10;
    panel.style.left = Math.round(left) + "px";
    panel.style.top = Math.round(Math.max(10, top)) + "px";
    panel.classList.add("open");
    document.body.classList.add("coach-panel-open");
  }

  function hideFloat() {
    float.classList.remove("show");
    outline.style.display = "none";
  }

  function closePanel() {
    panel.classList.remove("open");
    document.body.classList.remove("coach-panel-open");
    current = null;
    hideFloat();
  }

  /* ---------------- events ---------------- */
  function pick(e) {
    if (!enabled) return;
    if (e.target.closest(".coach-panel, .coach-hint, .toast, [data-coach-ignore]")) return;
    const el = e.target.closest(INTERACTIVE);
    if (!el || el === document.body || el.disabled) return;
    if (panel.classList.contains("open")) return;
    current = el;
    placeFloat(el);
    placeOutline(el);
  }

  document.addEventListener("mouseover", pick, true);

  document.addEventListener("mouseout", (e) => {
    if (!enabled || panel.classList.contains("open")) return;
    const to = e.relatedTarget;
    if (to && (float.contains(to) || (to.closest && to.closest(INTERACTIVE) === current))) return;
    if (to && to.closest && to.closest(".coach-panel")) return;
    hideFloat();
  });

  chip.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!current) return;
    render();
    placePanel(current);
    hideFloat();
  });

  panel.querySelector(".x").addEventListener("click", closePanel);

  panel.addEventListener("click", (e) => {
    const t = e.target.closest(".coach-tab");
    if (!t) return;
    state.tab = t.dataset.tab;
    render();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) {
      e.stopPropagation();
      closePanel();
    }
  });

  window.addEventListener("scroll", () => {
    if (panel.classList.contains("open") && current) placePanel(current);
    if (float.classList.contains("show") && current && !panel.classList.contains("open")) {
      placeFloat(current); placeOutline(current);
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (panel.classList.contains("open") && current) placePanel(current);
  });

  function setEnabled(on) {
    enabled = on;
    document.body.classList.toggle("coach-on", on);
    hint.classList.toggle("show", on);
    if (!on) closePanel(); else hideFloat();
    document.querySelectorAll("[data-coach-toggle]").forEach((b) => {
      b.setAttribute("aria-pressed", String(on));
      const l = b.querySelector("[data-coach-label]");
      if (l) l.textContent = on ? "Coach ON" : "Locator Coach";
    });
    try { localStorage.setItem("ll:coach", on ? "1" : "0"); } catch (err) {}
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-coach-toggle]");
    if (!b) return;
    e.preventDefault();
    setEnabled(!enabled);
    if (enabled) {
      toast("Locator Coach enabled",
        "Hover any control and click its badge for locators + Selenium & Playwright code.", "success");
    }
  });

  /* boot: restore preference */
  let boot = "0";
  try { boot = localStorage.getItem("ll:coach") || "0"; } catch (e) {}
  setEnabled(boot === "1");

  /* expose for self-tests */
  window.LocatorCoach = {
    isOn: () => enabled,
    set: setEnabled,
    inspect: (el) => ({ candidates: candidates(el), css: cssPath(el), xpath: xpathFor(el) }),
    code: (el) => ({
      seleniumPython: selPython(el, candidates(el).find((c) => c.best)),
      seleniumJava: selJava(el, candidates(el).find((c) => c.best)),
      playwrightJs: pwJs(el, candidates(el).find((c) => c.best))
    })
  };
})();
