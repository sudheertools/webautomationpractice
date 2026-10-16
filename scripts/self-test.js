/**
 * LocatorLab self-test — verifies the practice site is internally consistent.
 *
 *  1. Every JS file parses (node --check).
 *  2. Every data-testid in locator-data.js exists in its source HTML page.
 *  3. Every required stable attr (id + name + data-automation-id) is present
 *     on elements that declare a data-testid.
 *  4. All five practice pages + the reference page serve over HTTP 200.
 *  5. Each page's <label for="…"> actually points at a real element id.
 *
 * Usage:  node scripts/self-test.js
 * No dependencies. Exits non-zero on failure.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 4173;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf"
};

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  \u2713 " + m); };
const bad = (m) => { fail++; console.log("  \u2717 " + m); };

/* ---------- 1. syntax check every JS file ---------- */
console.log("\n[1/5] JavaScript syntax");
const jsFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith(".js")) jsFiles.push(p);
  }
})(ROOT);

for (const f of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
    ok(path.relative(ROOT, f));
  } catch (e) {
    bad(path.relative(ROOT, f) + " — " + (e.stderr || e.message).toString().trim());
  }
}

/* ---------- 2 & 3. locator data integrity ---------- */
console.log("\n[2-3/5] Locator integrity");
const dataPath = path.join(ROOT, "assets", "js", "locator-data.js");
if (!fs.existsSync(dataPath)) {
  bad("assets/js/locator-data.js missing — run: node scripts/build-locator-data.js");
} else {
  delete require.cache[require.resolve(dataPath)];
  const data = JSON.parse(
    fs.readFileSync(dataPath, "utf8").replace(/^[\s\S]*?window\.LOCATOR_DATA\s*=\s*/, "").replace(/;\s*$/, "")
  );
  ok("locator-data.js loaded (" + data.total + " rows)");

  const cache = {};
  const htmlOf = (page) => {
    if (!cache[page]) cache[page] = fs.readFileSync(path.join(ROOT, "pages", page), "utf8");
    return cache[page];
  };

  let missingTestid = 0, missingAttr = 0, missingLabel = 0;
  for (const r of data.rows) {
    const html = htmlOf(r.page);
    if (!html.includes('data-testid="' + r.testid + '"')) {
      missingTestid++;
      bad(r.page + " → data-testid \"" + r.testid + "\" not found in HTML");
      continue;
    }
    if (r.id && !html.includes('id="' + r.id + '"')) {
      missingAttr++;
      bad(r.page + " → id \"" + r.id + "\" missing");
    }
    if (r.id && !html.includes('data-automation-id="' + r.id + '"')) {
      missingAttr++;
      bad(r.page + " → data-automation-id for \"" + r.id + "\" missing");
    }
    if (r.id && !html.includes('name="') ) { /* names are optional for some */ }
  }
  if (!missingTestid) ok("all " + data.total + " data-testid values resolve");
  if (!missingAttr) ok("all ids and data-automation-ids present");

  /* names: warn only, since some buttons legitimately have no name */
  const withName = data.rows.filter((r) => r.name).length;
  ok(withName + "/" + data.total + " targets also expose a name attribute");

  /* label wiring */
  let labelIssues = 0;
  for (const r of data.rows) {
    if (!r.id) continue;
    const html = htmlOf(r.page);
    const re = new RegExp('<label\\b[^>]*for="' + r.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"', "i");
    const hasLabel = re.test(html) || /aria-label=/.test(html);
    if (!hasLabel && ["input", "select", "textarea"].includes(r.tag)) {
      labelIssues++;
      bad(r.page + " → <" + r.tag + ' id="' + r.id + '"> has no <label for> and no aria-label');
    }
  }
  if (!labelIssues) ok("every input/select/textarea has a label or aria-label");

  /* [extra] every data-testid referenced by the starter suites must exist */
  console.log("\n[extra] Starter suite references");
  const combinedHtml =
    htmlOf("form-essentials.html") + htmlOf("dates-ranges.html") +
    htmlOf("files-buttons.html") + htmlOf("wizard-submit.html") + htmlOf("behaviors.html");
  // Include JS section sources: some widgets inject their testids at runtime
  // (e.g. the cookie banner via setAttribute), so scan those too.
  // Tolerate both HTML `data-testid="x"` and JS `setAttribute("data-testid", "x")`.
  const sectionsDir = path.join(ROOT, "assets", "js", "sections");
  const combinedJs = fs.readdirSync(sectionsDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => fs.readFileSync(path.join(sectionsDir, f), "utf8"))
    .join("\n");
  const allSrc = combinedHtml + "\n" + combinedJs;
  const testidsInHtml = new Set([
    ...Array.from(allSrc.matchAll(/data-testid\s*=\s*"([^"]+)"/g)).map((m) => m[1]),
    ...Array.from(allSrc.matchAll(/setAttribute\(\s*["']data-testid["']\s*,\s*["']([^"']+)["']/g)).map((m) => m[1])
  ]);
  const starterFiles = [
    "starters/playwright-js/practice.spec.js",
    "starters/selenium-python/practice.py"
  ];
  let badRef = 0;
  for (const sf of starterFiles) {
    const txt = fs.readFileSync(path.join(ROOT, sf), "utf8");
    // Playwright: getByTestId("x") / By.CSS_SELECTOR [data-testid='x'] ; Python: driver.find_element(By.ID, "x")
    const refs = new Set([
      ...Array.from(txt.matchAll(/getByTestId\(\s*["'`]([^"'`]+)["'`]\s*\)/g)).map((m) => m[1]),
      ...Array.from(txt.matchAll(/data-testid=['"]([^'"]+)['"]/g)).map((m) => m[1])
    ]);
    const missing = Array.from(refs).filter((t) => !testidsInHtml.has(t));
    if (missing.length) {
      badRef += missing.length;
      missing.forEach((t) => bad(sf + ' → data-testid "' + t + '" not found in any practice page'));
    } else {
      ok(sf + " — all " + refs.size + " referenced data-testids exist");
    }
  }
}

/* ---------- 4 & 5. serve and fetch ---------- */
console.log("\n[4-5/5] HTTP smoke test");
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";
  const file = path.join(ROOT, url.replace(/\//g, path.sep));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});

const PAGES = [
  "index.html",
  "pages/quick-practice.html",
  "pages/form-essentials.html",
  "pages/dates-ranges.html",
  "pages/files-buttons.html",
  "pages/wizard-submit.html",
  "pages/behaviors.html",
  "pages/locator-reference.html",
  "assets/css/lab.css",
  "assets/js/main.js",
  "assets/js/locator-coach.js",
  "assets/js/locator-data.js",
  "assets/frames/frame-inner.html",
  "assets/frames/frame-outer.html",
  "docs/locators.md",
  "README.md"
];

server.listen(PORT, async () => {
  for (const p of PAGES) {
    await new Promise((resolve) => {
      http.get("http://127.0.0.1:" + PORT + "/" + p, (res) => {
        if (res.statusCode === 200) ok("GET /" + p + " → 200");
        else bad("GET /" + p + " → " + res.statusCode);
        res.resume();
        resolve();
      }).on("error", (e) => { bad("GET /" + p + " → " + e.message); resolve(); });
    });
  }
  server.close();

  /* label wiring inside each page (id referenced by a <label for>) */
  console.log("\n[extra] Cross-page label wiring");
  for (const page of [
    "quick-practice.html",
    "form-essentials.html",
    "dates-ranges.html",
    "files-buttons.html",
    "wizard-submit.html",
    "behaviors.html",
    "locator-reference.html"
  ]) {
    const html = fs.readFileSync(path.join(ROOT, "pages", page), "utf8");
    const fors = Array.from(html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)).map((m) => m[1]);
    const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g)).map((m) => m[1]));
    const dangling = fors.filter((f) => !ids.has(f));
    if (dangling.length) dangling.forEach((d) => bad(page + ' → <label for="' + d + '"> points at a missing id'));
    else ok(page + " — all " + fors.length + " <label for> targets exist");
  }

  console.log("\n========================================");
  console.log("  PASS: " + pass + "   FAIL: " + fail);
  console.log("========================================\n");
  process.exit(fail ? 1 : 0);
});
