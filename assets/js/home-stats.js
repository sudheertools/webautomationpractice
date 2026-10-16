/* Home page — visitor stats loader.
 * Reads the public, secret-free JSON that the scheduled GitHub Action
 * (scripts/fetch-traffic.js) refreshes hourly from the owner-only traffic API.
 * Falls back to "—" plus an explanatory note if the file is missing. */
(function () {
  "use strict";

  var URL = "docs/visitor-stats.json";
  var tiles = document.getElementById("visitor-stats");
  var meta = document.getElementById("visitor-meta");
  if (!tiles) return;

  function fmt(n) {
    return typeof n === "number" && isFinite(n) ? n.toLocaleString() : "—";
  }

  function setStat(key, value) {
    var el = tiles.querySelector('[data-stat="' + key + '"]');
    if (el) el.textContent = fmt(value);
  }

  function fail(msg) {
    if (meta) meta.textContent = msg;
  }

  function apply(data) {
    if (!data || typeof data !== "object") {
      fail("Visitor stats unavailable right now.");
      return;
    }
    setStat("views", data.views && data.views.count);
    setStat("unique-views", data.views && data.views.uniques);
    setStat("clones", data.clones && data.clones.count);
    setStat("stars", data.stars);

    if (meta) {
      var when = data.generatedAt ? new Date(data.generatedAt) : null;
      var stamp = when && !isNaN(when)
        ? "Updated " + when.toLocaleString(undefined, {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "";
      meta.textContent = (stamp + " · rolling 14-day window · GitHub traffic only.")
        .replace(/^\s·\s/, "");
    }
  }

  fetch(URL, { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(apply)
    .catch(function () {
      fail("Visitor stats load once the first stats run completes.");
    });
})();
