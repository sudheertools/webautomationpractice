#!/usr/bin/env node
/**
 * Fetches repo traffic from the GitHub API and writes a public, secret-free
 * data file the site reads (docs/visitor-stats.json).
 *
 * The traffic endpoints are owner-only, so this needs a token with `repo`
 * scope (or an fine-grained PAT with "Administration: read" + "Metadata: read").
 * The token is read from the STATS_TOKEN env var and is never written to disk.
 *
 * Local run:
 *   STATS_TOKEN=<token> node scripts/fetch-traffic.js
 *
 * In CI it runs via .github/workflows/visitor-stats.yml, which reads the token
 * from the STATS_TOKEN Actions secret.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const OWNER = process.env.GH_OWNER || "sudheertools";
const REPO = process.env.GH_REPO || "webautomationpractice";
const TOKEN = process.env.STATS_TOKEN;
const OUT = path.join(__dirname, "..", "docs", "visitor-stats.json");

function get(url, token) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/vnd.github+json",
          "User-Agent": "visitor-stats-script",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error("bad JSON from " + url + ": " + body));
            }
          } else {
            reject(new Error("HTTP " + res.statusCode + " from " + url + ": " + body));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout: " + url)));
  });
}

(async () => {
  const base = "https://api.github.com/repos/" + OWNER + "/" + REPO;
  const fallback = {
    generatedAt: new Date().toISOString(),
    repo: OWNER + "/" + REPO,
    views: { count: 0, uniques: 0 },
    clones: { count: 0, uniques: 0 },
    stars: 0,
    forks: 0,
    source: "fallback",
  };

  if (!TOKEN) {
    console.error("STATS_TOKEN not set — writing zeroed fallback.");
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(fallback, null, 2) + "\n");
    process.exit(0);
  }

  try {
    const [views, clones, repo] = await Promise.all([
      get(base + "/traffic/views", TOKEN),
      get(base + "/traffic/clones", TOKEN),
      get(base, TOKEN),
    ]);

    const data = {
      generatedAt: new Date().toISOString(),
      repo: OWNER + "/" + REPO,
      views: { count: views.count || 0, uniques: views.uniques || 0 },
      clones: { count: clones.count || 0, uniques: clones.uniques || 0 },
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      source: "github-traffic-api",
    };

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
    console.log("Wrote", path.relative(process.cwd(), OUT), "→", JSON.stringify(data));
  } catch (err) {
    console.error("Traffic fetch failed, writing zeroed fallback:", err.message);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(fallback, null, 2) + "\n");
    process.exit(0); // don't fail the workflow on a transient API error
  }
})();
