/* Team Amrich Availability Tracker
   Search (size range + condition), Leaflet map, and contiguous-block engine
   over the dataset in js/data.js. */
(function () {
  "use strict";

  // ---------- Condition buckets ----------
  // The filter exposes three buckets; Whiteboxed and Raw share one.
  var BUCKETS = {
    "wb-raw": ["Whiteboxed", "Raw"],
    "2nd-gen": ["2nd Gen"],
    "prebuilt": ["Prebuilt"]
  };

  var state = {
    minSf: null,
    maxSf: null,
    conditions: [],   // active bucket keys
    immediateOnly: false
  };

  // ---------- Formatting ----------

  function fmtInt(n) { return Number(n || 0).toLocaleString("en-US"); }

  function fmtCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/0$/, "").replace(/\.$/, "") + "M";
    if (n >= 10000) return Math.round(n / 1000) + "K";
    return fmtInt(n);
  }

  function fmtAsk(ask) {
    return ask == null ? "Ask TBD" : "$" + fmtInt(ask) + "/SF";
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ---------- Predicates ----------

  function isFullFloor(space) { return space.unit.charAt(0) === "E"; }
  function isActive(space) { return space.status === "Available"; }
  function isImmediate(space) { return String(space.available).toLowerCase() === "immediate"; }

  function conditionMatches(space) {
    if (!state.conditions.length) return true;
    if (space.condition == null) return false; // unknown condition can't satisfy a condition filter
    return state.conditions.some(function (key) {
      return BUCKETS[key].indexOf(space.condition) !== -1;
    });
  }

  function sizeMatches(rsf) {
    if (state.minSf != null && rsf < state.minSf) return false;
    if (state.maxSf != null && rsf > state.maxSf) return false;
    return true;
  }

  function hasSizeFilter() { return state.minSf != null || state.maxSf != null; }
  function hasAnyFilter() { return hasSizeFilter() || state.conditions.length > 0 || state.immediateOnly; }

  function spaceMatchesFilters(space) {
    if (!isActive(space)) return false;
    if (!conditionMatches(space)) return false;
    if (state.immediateOnly && !isImmediate(space)) return false;
    return sizeMatches(space.rsf);
  }

  // A block member must satisfy every non-size filter for the block to count.
  function memberOk(space) {
    if (!isActive(space)) return false;
    if (!conditionMatches(space)) return false;
    if (state.immediateOnly && !isImmediate(space)) return false;
    return true;
  }

  // ---------- Contiguous-block engine ----------
  // Consecutive full floors in a building are contiguous. Explicit `links`
  // add connections that aren't consecutive full floors (e.g. a slab cut
  // between a partial floor and the floor above).

  function blockAskFor(building, spaces) {
    // If the building has a block-deal ask covering every floor in the run, use it.
    var ba = building.blockAsk;
    if (ba && spaces.every(function (s) { return s.floor >= ba.from && s.floor <= ba.to; })) {
      return { ask: ba.ask, label: "$" + fmtInt(ba.ask) + "/SF (block)", note: ba.note };
    }
    var asks = spaces.map(function (s) { return s.ask; });
    if (asks.some(function (a) { return a == null; })) {
      var known = asks.filter(function (a) { return a != null; });
      return { ask: null, label: known.length ? "Ask partly TBD" : "Ask TBD", note: null };
    }
    var totalRsf = spaces.reduce(function (t, s) { return t + s.rsf; }, 0);
    var blended = spaces.reduce(function (t, s) { return t + s.ask * s.rsf; }, 0) / totalRsf;
    return { ask: blended, label: "$" + Math.round(blended) + "/SF blended", note: null };
  }

  function blockAvailability(spaces) {
    var vals = spaces.map(function (s) { return String(s.available); });
    if (vals.some(function (v) { return v.toLowerCase() === "tbd"; })) return "Timing TBD on some floors";
    var later = vals.filter(function (v) { return v.toLowerCase() !== "immediate"; });
    if (!later.length) return "Immediate";
    var uniq = later.filter(function (v, i) { return later.indexOf(v) === i; });
    return "From " + uniq.join(" / ");
  }

  function makeBlock(building, spaces) {
    var sorted = spaces.slice().sort(function (a, b) { return a.floor - b.floor; });
    var rsf = sorted.reduce(function (t, s) { return t + s.rsf; }, 0);
    return {
      building: building,
      spaces: sorted,
      units: sorted.map(function (s) { return s.unit; }),
      rsf: rsf,
      askInfo: blockAskFor(building, sorted),
      available: blockAvailability(sorted),
      label: sorted[0].unit + "–" + sorted[sorted.length - 1].unit
    };
  }

  // All contiguous runs of length >= 2 whose members pass `filter`.
  function enumerateBlocks(building, filter) {
    var blocks = [];
    var full = building.spaces.filter(function (s) { return isFullFloor(s) && filter(s); })
      .sort(function (a, b) { return a.floor - b.floor; });

    // Split into consecutive runs, then enumerate every sub-run of length >= 2.
    var runs = [];
    var run = [];
    full.forEach(function (s) {
      if (run.length && s.floor === run[run.length - 1].floor + 1) run.push(s);
      else { if (run.length) runs.push(run); run = [s]; }
    });
    if (run.length) runs.push(run);

    runs.forEach(function (r) {
      for (var i = 0; i < r.length; i++) {
        for (var j = i + 1; j < r.length; j++) {
          blocks.push(makeBlock(building, r.slice(i, j + 1)));
        }
      }
    });

    // Explicitly linked units (e.g. P17+E18 slab cut).
    (building.links || []).forEach(function (pair) {
      var members = pair.map(function (unit) {
        return building.spaces.find(function (s) { return s.unit === unit; });
      });
      if (members.every(function (s) { return s && filter(s); })) {
        var b = makeBlock(building, members);
        b.linked = true;
        blocks.push(b);
      }
    });

    return blocks;
  }

  // Maximal contiguous runs (for the default view / header stat).
  function maximalBlocks(building, filter) {
    var all = enumerateBlocks(building, filter);
    return all.filter(function (b) {
      return !all.some(function (other) {
        if (other === b) return false;
        return b.units.every(function (u) { return other.units.indexOf(u) !== -1; });
      });
    });
  }

  // ---------- Search ----------

  function buildingResults(building) {
    var singles = building.spaces.filter(spaceMatchesFilters);
    var blocks = [];
    if (hasSizeFilter()) {
      blocks = enumerateBlocks(building, memberOk).filter(function (b) { return sizeMatches(b.rsf); });
      blocks.sort(function (a, b) { return a.rsf - b.rsf; });
    }
    return { building: building, singles: singles, blocks: blocks, count: singles.length + blocks.length };
  }

  // ---------- Header stats ----------

  function renderStats() {
    var buildings = BUILDINGS.length;
    var spaces = 0, rsf = 0, largest = null;
    BUILDINGS.forEach(function (b) {
      b.spaces.forEach(function (s) {
        if (isActive(s)) { spaces++; rsf += s.rsf; }
      });
      maximalBlocks(b, isActive).forEach(function (blk) {
        if (!largest || blk.rsf > largest.rsf) largest = blk;
      });
    });
    document.getElementById("stat-buildings").textContent = fmtInt(buildings);
    document.getElementById("stat-spaces").textContent = fmtInt(spaces);
    document.getElementById("stat-rsf").textContent = fmtCompact(rsf);
    document.getElementById("stat-block").textContent = largest ? fmtCompact(largest.rsf) : "–";
    var tile = document.getElementById("stat-block").parentElement;
    if (largest) tile.title = largest.building.name + " " + largest.label + " — " + fmtInt(largest.rsf) + " RSF";
  }

  // ---------- Results panel ----------

  function statusBadge(space) {
    var cls = space.status === "Available" ? "st-available" : "st-lease-out";
    return "<span class=\"status-badge " + cls + "\"><span class=\"dot\"></span>" + escapeHtml(space.status) + "</span>";
  }

  function singleRow(space) {
    var leaseOut = space.status !== "Available";
    return "<div class=\"match-row" + (leaseOut ? " lease-out" : "") + "\">" +
      "<span class=\"match-unit\">" + escapeHtml(space.unit) + "</span>" +
      "<div class=\"match-detail\">" +
        "<div class=\"match-line-1\">" +
          "<span class=\"match-rsf\">" + fmtInt(space.rsf) + " RSF</span>" +
          "<span class=\"match-ask\">" + fmtAsk(space.ask) + (space.askLab ? " · $" + fmtInt(space.askLab) + " NNN lab" : "") + "</span>" +
          "<span class=\"match-cond\">" + escapeHtml(space.condition || "Condition TBD") + "</span>" +
          "<span class=\"match-avail\">" + escapeHtml(space.available) + "</span>" +
          (leaseOut ? statusBadge(space) : "") +
        "</div>" +
        (space.notes ? "<div class=\"match-notes\">" + escapeHtml(space.notes) + "</div>" : "") +
      "</div>" +
    "</div>";
  }

  function blockRow(block) {
    var conds = block.spaces.map(function (s) { return s.condition || "TBD"; });
    var uniqConds = conds.filter(function (c, i) { return conds.indexOf(c) === i; });
    // Linked units can share a floor (partials that combine into an entire
    // floor), so count distinct floors rather than members.
    var floors = block.spaces.map(function (s) { return s.floor; })
      .filter(function (f, i, a) { return a.indexOf(f) === i; }).length;
    var partLabel = floors > 1
      ? floors + " floors"
      : block.spaces.length + " units on one floor";
    return "<div class=\"match-row block-row\">" +
      "<span class=\"match-unit\">" + escapeHtml(block.label) + "</span>" +
      "<div class=\"match-detail\">" +
        "<div class=\"match-line-1\">" +
          "<span class=\"block-tag\">" + (block.linked ? "Connected" : "Contiguous") + " · " + partLabel + "</span>" +
          "<span class=\"match-rsf\">" + fmtInt(block.rsf) + " RSF</span>" +
          "<span class=\"match-ask\">" + escapeHtml(block.askInfo.label) + "</span>" +
          "<span class=\"match-cond\">" + escapeHtml(uniqConds.join(" + ")) + "</span>" +
          "<span class=\"match-avail\">" + escapeHtml(block.available) + "</span>" +
        "</div>" +
        (block.askInfo.note ? "<div class=\"match-notes\">" + escapeHtml(block.askInfo.note) + "</div>" : "") +
      "</div>" +
    "</div>";
  }

  function renderResults(results) {
    var container = document.getElementById("results");
    var filtering = hasAnyFilter();
    var shown = filtering ? results.filter(function (r) { return r.count > 0; }) : results;

    if (!shown.length) {
      container.innerHTML = "<div class=\"empty-results\"><p><strong>No spaces match.</strong></p>" +
        "<p>Try widening the size range or removing a condition filter.<br>" +
        "Contiguous multi-floor blocks are searched automatically.</p></div>";
      return;
    }

    container.innerHTML = shown.map(function (r) {
      var b = r.building;
      var rows = "";

      // Contiguous blocks first — they're the suggestion the size search exists for.
      rows += r.blocks.map(blockRow).join("");

      if (filtering) {
        rows += r.singles.map(singleRow).join("");
      } else {
        // Default view: full inventory, top floor first, lease-outs included.
        rows += b.spaces.slice().sort(function (x, y) { return y.floor - x.floor; }).map(singleRow).join("");
      }

      var activeSpaces = b.spaces.filter(isActive);
      var totalRsf = activeSpaces.reduce(function (t, s) { return t + s.rsf; }, 0);
      var maxBlocks = maximalBlocks(b, isActive);
      var tally = activeSpaces.length + " space" + (activeSpaces.length === 1 ? "" : "s") +
        " · " + fmtInt(totalRsf) + " RSF available";
      if (maxBlocks.length) {
        tally += " · Contiguous: " + maxBlocks.map(function (blk) {
          return blk.label + " (" + fmtInt(blk.rsf) + " RSF)";
        }).join(", ");
      }

      return "<div class=\"bldg-card\" id=\"card-" + b.id + "\">" +
        "<div class=\"bldg-head\" data-bldg=\"" + b.id + "\">" +
          "<h2 class=\"bldg-name\">" + escapeHtml(b.name) + "</h2>" +
          "<div class=\"bldg-meta\">" + escapeHtml(b.address) + " · " + escapeHtml(b.submarket) + "</div>" +
          "<div class=\"bldg-tally\">" + tally + "</div>" +
        "</div>" +
        "<div class=\"match-list\">" + rows + "</div>" +
      "</div>";
    }).join("");
  }

  function renderSummary(results) {
    var el = document.getElementById("result-summary");
    if (!hasAnyFilter()) {
      el.textContent = "Showing full inventory";
      return;
    }
    var singles = 0, blocks = 0, bldgs = 0;
    results.forEach(function (r) {
      if (r.count > 0) bldgs++;
      singles += r.singles.length;
      blocks += r.blocks.length;
    });
    var parts = [];
    if (singles) parts.push(singles + " space" + (singles === 1 ? "" : "s"));
    if (blocks) parts.push(blocks + " contiguous option" + (blocks === 1 ? "" : "s"));
    el.textContent = parts.length
      ? parts.join(" + ") + " in " + bldgs + " building" + (bldgs === 1 ? "" : "s")
      : "No matches";
  }

  // ---------- Map ----------

  var map = L.map("map", { scrollWheelZoom: true, zoomSnap: 0.5 });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
  }).addTo(map);

  var markers = {};

  function markerIcon(count, isMatch) {
    var size = isMatch ? 34 : 26;
    return L.divIcon({
      className: "",
      html: "<div class=\"marker-pin" + (isMatch ? "" : " no-match") + "\">" + count + "</div>",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  function popupHtml(result) {
    var b = result.building;
    var filtering = hasAnyFilter();
    var items = [];
    result.blocks.slice(0, 3).forEach(function (blk) {
      items.push("<div><strong>" + escapeHtml(blk.label) + "</strong> · " + fmtInt(blk.rsf) +
        " RSF · " + escapeHtml(blk.askInfo.label) + " · contiguous</div>");
    });
    var singles = filtering ? result.singles : b.spaces.filter(isActive);
    singles.slice(0, 4).forEach(function (s) {
      items.push("<div><strong>" + escapeHtml(s.unit) + "</strong> · " + fmtInt(s.rsf) +
        " RSF · " + fmtAsk(s.ask) + " · " + escapeHtml(s.condition || "Condition TBD") + "</div>");
    });
    var more = (result.blocks.length - Math.min(result.blocks.length, 3)) +
               (singles.length - Math.min(singles.length, 4));
    return "<div class=\"popup-name\">" + escapeHtml(b.name) + "</div>" +
      "<div class=\"popup-meta\">" + escapeHtml(b.submarket) + "</div>" +
      "<div class=\"popup-rows\">" + items.join("") + "</div>" +
      (more > 0 ? "<div class=\"popup-more\">+ " + more + " more — see list</div>" : "");
  }

  function initMarkers() {
    BUILDINGS.forEach(function (b) {
      var m = L.marker([b.lat, b.lng], { icon: markerIcon(0, true), title: b.name }).addTo(map);
      m.on("click", function () {
        var card = document.getElementById("card-" + b.id);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      markers[b.id] = m;
    });
    var bounds = L.latLngBounds(BUILDINGS.map(function (b) { return [b.lat, b.lng]; }));
    map.fitBounds(bounds, { padding: [40, 40] });
  }

  function updateMarkers(results) {
    var filtering = hasAnyFilter();
    results.forEach(function (r) {
      var m = markers[r.building.id];
      var activeCount = r.building.spaces.filter(isActive).length;
      var count = filtering ? r.count : activeCount;
      var isMatch = !filtering || r.count > 0;
      m.setIcon(markerIcon(count, isMatch));
      m.bindPopup(popupHtml(r));
      m.setZIndexOffset(isMatch ? 500 : 0);
    });
  }

  // ---------- Wiring ----------

  function run() {
    var results = BUILDINGS.map(buildingResults);
    renderResults(results);
    renderSummary(results);
    updateMarkers(results);
  }

  function parseSf(value) {
    var n = Number(String(value).replace(/[^0-9.]/g, ""));
    return value.trim() === "" || isNaN(n) || n <= 0 ? null : n;
  }

  ["min-sf", "max-sf"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", function (e) {
      state[id === "min-sf" ? "minSf" : "maxSf"] = parseSf(e.target.value);
      run();
    });
  });

  document.querySelectorAll(".chip[data-condition]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var key = chip.dataset.condition;
      var idx = state.conditions.indexOf(key);
      if (idx === -1) state.conditions.push(key);
      else state.conditions.splice(idx, 1);
      chip.classList.toggle("active", idx === -1);
      run();
    });
  });

  document.getElementById("immediate-only").addEventListener("change", function (e) {
    state.immediateOnly = e.target.checked;
    run();
  });

  document.getElementById("btn-clear").addEventListener("click", function () {
    state.minSf = state.maxSf = null;
    state.conditions = [];
    state.immediateOnly = false;
    document.getElementById("min-sf").value = "";
    document.getElementById("max-sf").value = "";
    document.getElementById("immediate-only").checked = false;
    document.querySelectorAll(".chip.active").forEach(function (c) { c.classList.remove("active"); });
    run();
  });

  // ---------- Mobile list/map toggle ----------
  // Below 860px only one pane shows at a time; the floating toggle flips them.
  // Leaflet can't measure a hidden container, so re-measure on every switch.

  var split = document.getElementById("split");
  var mapEverShown = false;

  function isMobile() {
    return window.matchMedia("(max-width: 860px)").matches;
  }

  function setMobileView(view) {
    split.dataset.view = view;
    document.querySelectorAll(".mobile-toggle button").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    if (view === "map") {
      map.invalidateSize();
      if (!mapEverShown) {
        mapEverShown = true;
        var bounds = L.latLngBounds(BUILDINGS.map(function (b) { return [b.lat, b.lng]; }));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }

  document.querySelectorAll(".mobile-toggle button").forEach(function (btn) {
    btn.addEventListener("click", function () { setMobileView(btn.dataset.view); });
  });

  window.addEventListener("resize", function () {
    if (!isMobile()) map.invalidateSize();
  });

  // Clicking a building card header pans the map to it (switching to the
  // map pane first on mobile).
  document.getElementById("results").addEventListener("click", function (e) {
    var head = e.target.closest(".bldg-head");
    if (!head) return;
    var b = BUILDINGS.find(function (x) { return x.id === head.dataset.bldg; });
    if (!b) return;
    if (isMobile()) setMobileView("map");
    map.setView([b.lat, b.lng], Math.max(map.getZoom(), 15), { animate: true });
    markers[b.id].openPopup();
  });

  // ---------- Init ----------

  initMarkers();
  renderStats();
  run();
})();
