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

  // Report selection. Keyed by building + units so a pick survives re-renders
  // and filter changes; the space objects are re-resolved from BUILDINGS at
  // report time rather than held onto here.
  var selection = {};   // key -> { buildingId: string, units: [string] }
  var lastResults = []; // most recent search results, for "select all shown"

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

  // ---------- Status overrides ----------
  // `data.js` is the source of truth for inventory; `status.js` carries only
  // status changes made from the site. Overrides are applied onto BUILDINGS at
  // boot, so everything downstream — search, stats, blocks, markers, report —
  // sees the corrected status without knowing this layer exists.
  //
  // Editing writes status.js back to the repo through the GitHub contents API,
  // which is why a token is needed to edit but never to read.

  var STATUS_REPO = {
    owner: "matthewsdichter",
    repo: "Team-Amrich-Availability-Tracker",
    branch: "main",
    path: "js/status.js"
  };

  var STATUSES = ["Available", "Lease Out", "Leased"];
  var TOKEN_KEY = "ta-tracker-gh-token";
  var PENDING_KEY = "ta-tracker-pending-status";

  var overrides = {};      // key -> status, as last read from status.js
  var pending = {};        // key -> status (null = drop the override), not yet committed
  var editing = false;
  var saveTimer = null;

  function spaceKey(buildingId, unit) { return buildingId + "|" + unit; }

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }

  function getToken() { return lsGet(TOKEN_KEY) || ""; }
  function pendingCount() { return Object.keys(pending).length; }

  function findBuilding(id) {
    return BUILDINGS.find(function (b) { return b.id === id; });
  }

  // Remember what data.js shipped, so clearing an override restores it.
  function captureBaseStatus() {
    BUILDINGS.forEach(function (b) {
      b.spaces.forEach(function (s) { s.baseStatus = s.status; });
    });
  }

  function applyOverrides() {
    BUILDINGS.forEach(function (b) {
      b.spaces.forEach(function (s) {
        var key = spaceKey(b.id, s.unit);
        var val = Object.prototype.hasOwnProperty.call(pending, key) ? pending[key] : overrides[key];
        s.status = val || s.baseStatus;
      });
    });
  }

  // A space that is no longer available has no business in a client report.
  function dropSelectionsFor(buildingId, unit) {
    Object.keys(selection).forEach(function (k) {
      var sel = selection[k];
      if (sel.buildingId === buildingId && sel.units.indexOf(unit) !== -1) delete selection[k];
    });
  }

  function setStatus(buildingId, unit, status) {
    var building = findBuilding(buildingId);
    var space = building && building.spaces.find(function (s) { return s.unit === unit; });
    if (!space || STATUSES.indexOf(status) === -1) return;

    pending[spaceKey(buildingId, unit)] = status === space.baseStatus ? null : status;
    lsSet(PENDING_KEY, JSON.stringify(pending));
    applyOverrides();
    if (status !== "Available") dropSelectionsFor(buildingId, unit);
    scheduleSave();
    refreshView();

    // The re-render replaces the dropdown that was just used; put focus back
    // on its replacement so keyboard use doesn't get thrown off the row.
    var again = document.querySelector('.status-pick[data-bldg="' + buildingId +
      '"][data-unit="' + unit + '"]');
    if (again) again.focus();
  }

  // ---------- Overrides: file format ----------

  var STATUS_HEADER = [
    "/* ============================================================================",
    "   Team Amrich — status overrides",
    "   ============================================================================",
    "   Written by the tracker's edit mode. `data.js` stays the source of truth for",
    "   inventory; this file carries only status, keyed by \"<building id>|<unit>\".",
    "   \"Lease Out\" is shown but flagged; \"Leased\" is hidden everywhere. Remove an",
    "   entry to put the space back to whatever data.js says.",
    "   ========================================================================= */",
    "",
    ""
  ].join("\n");

  function serializeOverrides(map) {
    var payload = { updated: new Date().toISOString(), spaces: map };
    return STATUS_HEADER + "window.STATUS_OVERRIDES = " + JSON.stringify(payload, null, 2) + ";\n";
  }

  // The header comment is full of "=" rules, so anchor on the assignment.
  function parseOverridesFile(text) {
    var at = text.indexOf("window.STATUS_OVERRIDES");
    var eq = at === -1 ? -1 : text.indexOf("=", at);
    if (eq === -1) throw new Error("status.js is not in the expected shape");
    var obj = JSON.parse(text.slice(eq + 1).trim().replace(/;$/, ""));
    return (obj && obj.spaces) || {};
  }

  function utf8ToBase64(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return window.btoa(bin);
  }

  function base64ToUtf8(b64) {
    var bin = window.atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------- Overrides: GitHub read/write ----------

  function ghHeaders(token) {
    return {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function ghUrl() {
    return "https://api.github.com/repos/" + STATUS_REPO.owner + "/" + STATUS_REPO.repo +
      "/contents/" + STATUS_REPO.path;
  }

  function ghError(res, body) {
    var detail = (body && body.message) || res.statusText || ("HTTP " + res.status);
    if (res.status === 401) return new Error("GitHub rejected the token — it may have expired.");
    if (res.status === 403) return new Error("Token can't write here — it needs Contents: Read and write on this repo.");
    if (res.status === 404) return new Error("Repo or file not visible to this token — check the token's repository access.");
    if (res.status === 409 || res.status === 422) {
      var err = new Error("Someone else saved first — retrying.");
      err.conflict = true;
      return err;
    }
    return new Error(detail);
  }

  function ghJsonError(res) {
    return res.json().catch(function () { return {}; }).then(function (body) { throw ghError(res, body); });
  }

  function ghFetchFile(token) {
    var url = ghUrl() + "?ref=" + encodeURIComponent(STATUS_REPO.branch) + "&t=" + Date.now();
    return fetch(url, { headers: ghHeaders(token), cache: "no-store" }).then(function (res) {
      if (res.status === 404) return { sha: null, spaces: {} };   // first write creates it
      if (!res.ok) return ghJsonError(res);
      return res.json().then(function (body) {
        return { sha: body.sha, spaces: parseOverridesFile(base64ToUtf8(body.content)) };
      });
    });
  }

  function ghPutFile(token, text, sha, message) {
    return fetch(ghUrl(), {
      method: "PUT",
      headers: ghHeaders(token),
      body: JSON.stringify({
        message: message,
        content: utf8ToBase64(text),
        branch: STATUS_REPO.branch,
        sha: sha || undefined
      })
    }).then(function (res) {
      if (!res.ok) return ghJsonError(res);
      return res.json();
    });
  }

  function commitMessage(batch) {
    var parts = Object.keys(batch).map(function (k) {
      var bits = k.split("|");
      var b = findBuilding(bits[0]);
      return (b ? b.name : bits[0]) + " " + bits[1] + " → " + (batch[k] || "Available");
    });
    var head = parts.slice(0, 3).join("; ");
    if (parts.length > 3) head += " (+" + (parts.length - 3) + " more)";
    return "Status update: " + head;
  }

  // Re-read before writing and lay this batch over what's there, so two people
  // editing at once merge instead of clobbering each other.
  function commitBatch(token, batch, attempt) {
    return ghFetchFile(token).then(function (file) {
      var merged = {};
      Object.keys(file.spaces).forEach(function (k) { merged[k] = file.spaces[k]; });
      Object.keys(batch).forEach(function (k) {
        if (batch[k] == null) delete merged[k];
        else merged[k] = batch[k];
      });
      return ghPutFile(token, serializeOverrides(merged), file.sha, commitMessage(batch))
        .then(function () { return merged; })
        .catch(function (err) {
          if (err.conflict && attempt < 2) return commitBatch(token, batch, attempt + 1);
          throw err;
        });
    });
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    setSaveState("pending");
    saveTimer = setTimeout(saveNow, 1200);   // batch a burst of edits into one commit
  }

  function saveNow() {
    saveTimer = null;
    if (!pendingCount()) { setSaveState("idle"); return; }

    var token = getToken();
    if (!token) { setSaveState("error", "add a token to publish"); return; }

    var batch = {};
    Object.keys(pending).forEach(function (k) { batch[k] = pending[k]; });
    setSaveState("saving");

    commitBatch(token, batch, 0).then(function (merged) {
      overrides = merged;
      // Keep anything changed again while the request was in flight.
      Object.keys(batch).forEach(function (k) {
        if (pending[k] === batch[k]) delete pending[k];
      });
      if (pendingCount()) lsSet(PENDING_KEY, JSON.stringify(pending));
      else lsDel(PENDING_KEY);
      applyOverrides();
      refreshView();
      if (pendingCount()) scheduleSave();
      else setSaveState("saved");
    }).catch(function (err) {
      setSaveState("error", err.message || String(err));
    });
  }

  // ---------- Overrides: load ----------

  function adoptOverrides(source) {
    overrides = (source && source.spaces) || {};
    applyOverrides();
  }

  function loadOverrides() {
    var saved = lsGet(PENDING_KEY);
    if (saved) {
      try { pending = JSON.parse(saved) || {}; } catch (e) { pending = {}; }
    }
    adoptOverrides(window.STATUS_OVERRIDES);
  }

  // The script tag may be served from cache, which would show an editor stale
  // data right after they committed. Re-pull past the cache on load.
  function refreshOverrides() {
    if (location.protocol === "file:") return;
    var s = document.createElement("script");
    s.src = "js/status.js?t=" + Date.now();
    s.onload = function () {
      adoptOverrides(window.STATUS_OVERRIDES);
      refreshView();
      s.remove();
    };
    s.onerror = function () { s.remove(); };
    document.head.appendChild(s);
  }

  // ---------- Edit mode ----------

  function setEditing(on) {
    editing = on;
    document.body.classList.toggle("editing", on);
    document.getElementById("btn-edit").classList.toggle("active", on);
    document.getElementById("btn-edit").textContent = on ? "Done editing" : "Edit";
    refreshView();
    if (pendingCount()) scheduleSave();
  }

  function setSaveState(state, msg) {
    var el = document.getElementById("save-state");
    var n = pendingCount();
    var text = "";
    if (state === "pending") text = n + " unsaved change" + (n === 1 ? "" : "s");
    else if (state === "saving") text = "Publishing…";
    else if (state === "saved") text = "Published ✓";
    else if (state === "error") text = "Not published — " + (msg || "unknown error") + " · Retry";
    el.textContent = text;
    el.hidden = !text;
    el.className = "save-state save-" + state;
    el.title = state === "error" ? "Click to try again" : "";
  }

  function statusControl(building, space) {
    var opts = STATUSES.map(function (s) {
      return "<option value=\"" + escapeHtml(s) + "\"" + (s === space.status ? " selected" : "") + ">" +
        escapeHtml(s) + "</option>";
    }).join("");
    return "<select class=\"status-pick\" data-bldg=\"" + escapeHtml(building.id) + "\"" +
      " data-unit=\"" + escapeHtml(space.unit) + "\"" +
      " aria-label=\"Status for " + escapeHtml(building.name) + " " + escapeHtml(space.unit) + "\">" +
      opts + "</select>";
  }

  // ---------- Report selection ----------

  function selKey(buildingId, units) { return buildingId + "|" + units.join("+"); }

  function isSelected(key) { return Object.prototype.hasOwnProperty.call(selection, key); }

  function selectionCount() { return Object.keys(selection).length; }

  function toggleSelection(key, buildingId, units, on) {
    if (on) selection[key] = { buildingId: buildingId, units: units };
    else delete selection[key];
  }

  function selectBox(key, buildingId, units) {
    return "<label class=\"sel-wrap\" title=\"Include in report\">" +
      "<input type=\"checkbox\" class=\"sel-box\"" +
        " data-key=\"" + escapeHtml(key) + "\"" +
        " data-bldg=\"" + escapeHtml(buildingId) + "\"" +
        " data-units=\"" + escapeHtml(units.join("+")) + "\"" +
        (isSelected(key) ? " checked" : "") + ">" +
    "</label>";
  }

  // ---------- Predicates ----------

  function isFullFloor(space) { return space.unit.charAt(0) === "E"; }
  function isActive(space) { return space.status === "Available"; }
  function isLeased(space) { return space.status === "Leased"; }
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
    var cls = space.status === "Available" ? "st-available"
            : space.status === "Leased" ? "st-leased" : "st-lease-out";
    return "<span class=\"status-badge " + cls + "\"><span class=\"dot\"></span>" + escapeHtml(space.status) + "</span>";
  }

  function singleRow(space, building) {
    var flagged = space.status !== "Available";
    // Flagged floors are shown for context but never go into a client report.
    var box = flagged ? "<span class=\"sel-wrap sel-none\"></span>"
                      : selectBox(selKey(building.id, [space.unit]), building.id, [space.unit]);
    var rowCls = flagged ? (isLeased(space) ? " leased" : " lease-out") : "";
    return "<div class=\"match-row" + rowCls + "\">" +
      box +
      "<span class=\"match-unit\">" + escapeHtml(space.unit) + "</span>" +
      "<div class=\"match-detail\">" +
        "<div class=\"match-line-1\">" +
          "<span class=\"match-rsf\">" + fmtInt(space.rsf) + " RSF</span>" +
          "<span class=\"match-ask\">" + fmtAsk(space.ask) + (space.askLab ? " · $" + fmtInt(space.askLab) + " NNN lab" : "") + "</span>" +
          "<span class=\"match-cond\">" + escapeHtml(space.condition || "Condition TBD") + "</span>" +
          "<span class=\"match-avail\">" + escapeHtml(space.available) + "</span>" +
          (flagged ? statusBadge(space) : "") +
        "</div>" +
        (space.notes ? "<div class=\"match-notes\">" + escapeHtml(space.notes) + "</div>" : "") +
      "</div>" +
      (editing ? statusControl(building, space) : "") +
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
      selectBox(selKey(block.building.id, block.units), block.building.id, block.units) +
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

      function toRow(s) { return singleRow(s, b); }
      if (filtering) {
        rows += r.singles.map(toRow).join("");
      } else {
        // Default view: full inventory, top floor first, lease-outs included.
        // Leased space is gone from the site; editing brings it back so it
        // can be restored.
        rows += b.spaces.slice()
          .filter(function (s) { return editing || !isLeased(s); })
          .sort(function (x, y) { return y.floor - x.floor; }).map(toRow).join("");
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

  // ---------- Report builder ----------
  // Selected rows are grouped by building (in portfolio order) and rendered
  // into a paper-sized sheet. "Download PDF" hands that sheet to the browser's
  // print pipeline, where Save as PDF produces the file.

  function resolveSelection() {
    // Re-resolve stored keys against BUILDINGS, dropping anything stale (a unit
    // renamed or removed in data.js since it was picked).
    var byBuilding = [];
    BUILDINGS.forEach(function (b) {
      var items = [];
      Object.keys(selection).forEach(function (key) {
        var sel = selection[key];
        if (sel.buildingId !== b.id) return;
        var spaces = sel.units.map(function (u) {
          return b.spaces.find(function (sp) { return sp.unit === u; });
        });
        if (!spaces.every(Boolean)) return;
        if (spaces.length === 1) items.push({ type: "space", space: spaces[0], rsf: spaces[0].rsf });
        else {
          var blk = makeBlock(b, spaces);
          items.push({ type: "block", block: blk, rsf: blk.rsf });
        }
      });
      if (!items.length) return;
      // Blocks first, then single floors top-down — how a survey reads.
      items.sort(function (x, y) {
        if (x.type !== y.type) return x.type === "block" ? -1 : 1;
        if (x.type === "block") return y.rsf - x.rsf;
        return y.space.floor - x.space.floor;
      });
      byBuilding.push({ building: b, items: items });
    });
    return byBuilding;
  }

  function criteriaText() {
    var parts = [];
    if (state.minSf != null || state.maxSf != null) {
      if (state.minSf != null && state.maxSf != null) {
        parts.push(fmtInt(state.minSf) + "–" + fmtInt(state.maxSf) + " SF");
      } else if (state.minSf != null) {
        parts.push(fmtInt(state.minSf) + " SF and up");
      } else {
        parts.push("Up to " + fmtInt(state.maxSf) + " SF");
      }
    }
    if (state.conditions.length) {
      var labels = { "wb-raw": "Whiteboxed / Raw", "2nd-gen": "2nd Gen", "prebuilt": "Prebuilt" };
      parts.push(state.conditions.map(function (k) { return labels[k]; }).join(" or "));
    }
    if (state.immediateOnly) parts.push("Immediate occupancy");
    return parts.length ? parts.join("  ·  ") : "No size or condition filter applied";
  }

  function reportRow(item) {
    var cells;
    if (item.type === "space") {
      var sp = item.space;
      cells = [
        escapeHtml(sp.unit),
        fmtInt(sp.rsf),
        fmtAsk(sp.ask) + (sp.askLab ? " · $" + fmtInt(sp.askLab) + " NNN lab" : ""),
        escapeHtml(sp.condition || "TBD"),
        escapeHtml(sp.available),
        escapeHtml(sp.notes || "—")
      ];
    } else {
      var blk = item.block;
      var conds = blk.spaces.map(function (x) { return x.condition || "TBD"; });
      var floors = blk.spaces.map(function (x) { return x.floor; })
        .filter(function (f, i, a) { return a.indexOf(f) === i; }).length;
      var tag = (blk.linked ? "Connected" : "Contiguous") + " · " +
        (floors > 1 ? floors + " floors" : blk.spaces.length + " units on one floor");
      cells = [
        escapeHtml(blk.label),
        fmtInt(blk.rsf),
        escapeHtml(blk.askInfo.label),
        escapeHtml(conds.filter(function (c, i) { return conds.indexOf(c) === i; }).join(" + ")),
        escapeHtml(blk.available),
        tag + (blk.askInfo.note ? " — " + escapeHtml(blk.askInfo.note) : "")
      ];
    }
    return "<tr" + (item.type === "block" ? " class=\"rpt-block\"" : "") + ">" +
      cells.map(function (c, i) {
        return "<td class=\"rpt-c" + i + "\">" + c + "</td>";
      }).join("") + "</tr>";
  }

  function renderReport() {
    var groups = resolveSelection();
    var sheet = document.getElementById("report-sheet");

    if (!groups.length) {
      sheet.innerHTML = "<div class=\"rpt-empty\">Nothing selected yet. " +
        "Tick the box next to any space or contiguous block to add it.</div>";
      return;
    }

    // Total RSF counts each floor once, even if it was picked both on its own
    // and as part of a block.
    var seen = {}, totalRsf = 0, floorCount = 0;
    groups.forEach(function (g) {
      g.items.forEach(function (item) {
        var spaces = item.type === "space" ? [item.space] : item.block.spaces;
        spaces.forEach(function (sp) {
          var k = g.building.id + "|" + sp.unit;
          if (seen[k]) return;
          seen[k] = true;
          totalRsf += sp.rsf;
          floorCount++;
        });
      });
    });

    var title = document.getElementById("report-title").value.trim() || "Availability Report";
    var preparedFor = document.getElementById("report-for").value.trim();
    var today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    var head =
      "<header class=\"rpt-head\">" +
        "<div class=\"rpt-date\">" + escapeHtml(today) + "</div>" +
      "</header>" +
      "<h1 class=\"rpt-title\">" + escapeHtml(title) + "</h1>" +
      (preparedFor ? "<div class=\"rpt-for\">Prepared for " + escapeHtml(preparedFor) + "</div>" : "") +
      "<div class=\"rpt-criteria\"><span>Search criteria</span>" + escapeHtml(criteriaText()) + "</div>" +
      "<div class=\"rpt-totals\">" +
        "<div><span class=\"rpt-total-v\">" + groups.length + "</span>" +
          "<span class=\"rpt-total-l\">Building" + (groups.length === 1 ? "" : "s") + "</span></div>" +
        "<div><span class=\"rpt-total-v\">" + floorCount + "</span>" +
          "<span class=\"rpt-total-l\">Space" + (floorCount === 1 ? "" : "s") + "</span></div>" +
        "<div><span class=\"rpt-total-v\">" + fmtInt(totalRsf) + "</span>" +
          "<span class=\"rpt-total-l\">Total RSF</span></div>" +
      "</div>";

    var body = groups.map(function (g) {
      var b = g.building;
      return "<section class=\"rpt-bldg\">" +
        "<h2 class=\"rpt-bldg-name\">" + escapeHtml(b.name) + "</h2>" +
        "<div class=\"rpt-bldg-meta\">" + escapeHtml(b.address) + "  ·  " + escapeHtml(b.submarket) + "</div>" +
        "<table class=\"rpt-table\">" +
          "<thead><tr>" +
            "<th class=\"rpt-c0\">Floor</th><th class=\"rpt-c1\">RSF</th>" +
            "<th class=\"rpt-c2\">Asking rent</th><th class=\"rpt-c3\">Condition</th>" +
            "<th class=\"rpt-c4\">Available</th><th class=\"rpt-c5\">Notes</th>" +
          "</tr></thead>" +
          "<tbody>" + g.items.map(reportRow).join("") + "</tbody>" +
        "</table>" +
      "</section>";
    }).join("");

    var foot = "<footer class=\"rpt-foot\">" +
      "Information contained herein has been obtained from sources deemed reliable but is not guaranteed. " +
      "Asking rents and availability are subject to change without notice." +
    "</footer>";

    sheet.innerHTML = head + body + foot;
  }

  function openReport() {
    renderReport();
    var modal = document.getElementById("report-modal");
    modal.hidden = false;
    document.body.classList.add("modal-open");
    document.getElementById("report-title").focus();
  }

  function closeReport() {
    document.getElementById("report-modal").hidden = true;
    document.body.classList.remove("modal-open");
  }

  function renderReportBar() {
    var n = selectionCount();
    document.getElementById("sel-count").textContent = n;
    document.getElementById("btn-report").disabled = n === 0;
  }

  // ---------- Wiring ----------

  function run() {
    var results = BUILDINGS.map(buildingResults);
    lastResults = results;
    renderResults(results);
    renderSummary(results);
    updateMarkers(results);
    renderReportBar();
  }

  function refreshView() {
    renderStats();
    run();
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

  // Checkbox toggles. Rows are re-rendered on every search, so selection lives
  // in `selection` and the boxes are re-checked from it, not the other way round.
  document.getElementById("results").addEventListener("change", function (e) {
    var pick = e.target.closest(".status-pick");
    if (pick) {
      setStatus(pick.dataset.bldg, pick.dataset.unit, pick.value);
      return;
    }
    var box = e.target.closest(".sel-box");
    if (!box) return;
    toggleSelection(box.dataset.key, box.dataset.bldg, box.dataset.units.split("+"), box.checked);
    renderReportBar();
  });

  document.getElementById("btn-select-all").addEventListener("click", function () {
    // "Shown" means what the current filter surfaces: matched singles and
    // contiguous options when filtering, otherwise every available space.
    var filtering = hasAnyFilter();
    lastResults.forEach(function (r) {
      if (filtering && r.count === 0) return;
      r.blocks.forEach(function (blk) {
        toggleSelection(selKey(r.building.id, blk.units), r.building.id, blk.units, true);
      });
      var singles = filtering ? r.singles : r.building.spaces.filter(isActive);
      singles.forEach(function (sp) {
        toggleSelection(selKey(r.building.id, [sp.unit]), r.building.id, [sp.unit], true);
      });
    });
    run();
  });

  document.getElementById("btn-report").addEventListener("click", openReport);
  document.getElementById("btn-report-close").addEventListener("click", closeReport);

  document.getElementById("report-modal").addEventListener("click", function (e) {
    if (e.target.dataset.close) closeReport();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !document.getElementById("report-modal").hidden) closeReport();
  });

  ["report-title", "report-for"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", renderReport);
  });

  document.getElementById("btn-report-print").addEventListener("click", function () {
    // The print stylesheet hides the app and pages the sheet; the browser's
    // "Save as PDF" destination writes the file.
    window.print();
  });

  document.getElementById("btn-clear").addEventListener("click", function () {
    state.minSf = state.maxSf = null;
    state.conditions = [];
    state.immediateOnly = false;
    document.getElementById("min-sf").value = "";
    document.getElementById("max-sf").value = "";
    document.getElementById("immediate-only").checked = false;
    document.querySelectorAll(".chip.active").forEach(function (c) { c.classList.remove("active"); });
    selection = {};
    run();
  });

  // ---------- Edit mode wiring ----------

  function openToken() {
    document.getElementById("token-input").value = getToken();
    document.getElementById("token-modal").hidden = false;
    document.body.classList.add("modal-open");
    document.getElementById("token-input").focus();
  }

  function closeToken() {
    document.getElementById("token-modal").hidden = true;
    document.body.classList.remove("modal-open");
  }

  document.getElementById("btn-edit").addEventListener("click", function () {
    // Editing publishes to the repo, so there's nothing to enter without a token.
    if (!editing && !getToken()) { openToken(); return; }
    setEditing(!editing);
  });

  document.getElementById("save-state").addEventListener("click", function () {
    if (this.classList.contains("save-error")) {
      if (!getToken()) openToken();
      else saveNow();
    }
  });

  document.getElementById("btn-token-save").addEventListener("click", function () {
    var val = document.getElementById("token-input").value.trim();
    if (!val) return;
    lsSet(TOKEN_KEY, val);
    closeToken();
    setEditing(true);
    if (pendingCount()) saveNow();
  });

  document.getElementById("btn-token-forget").addEventListener("click", function () {
    lsDel(TOKEN_KEY);
    document.getElementById("token-input").value = "";
    closeToken();
    if (editing) setEditing(false);
  });

  document.getElementById("btn-token-cancel").addEventListener("click", closeToken);

  document.getElementById("token-modal").addEventListener("click", function (e) {
    if (e.target.dataset.tclose) closeToken();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !document.getElementById("token-modal").hidden) closeToken();
  });

  // Edits live in localStorage until they reach GitHub, but a closed tab is
  // still a surprise worth warning about.
  window.addEventListener("beforeunload", function (e) {
    if (!pendingCount()) return;
    e.preventDefault();
    e.returnValue = "";
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

  captureBaseStatus();
  loadOverrides();
  initMarkers();
  renderStats();
  run();

  // Edits from a previous visit that never reached GitHub.
  if (pendingCount()) {
    if (getToken()) scheduleSave();
    else setSaveState("error", "add a token to publish");
  }
  refreshOverrides();
})();
