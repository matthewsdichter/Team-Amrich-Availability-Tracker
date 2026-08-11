/* Team Amrich Availability Tracker — vanilla JS, localStorage persistence. */
(function () {
  "use strict";

  var STORAGE_KEY = "team-amrich-availabilities";

  var STATUSES = ["Available", "Negotiating", "Lease Out", "Leased", "Off Market"];
  var ACTIVE_STATUSES = ["Available", "Negotiating", "Lease Out"];

  var CSV_COLUMNS = [
    { key: "building", label: "Building" },
    { key: "suite", label: "Floor/Suite" },
    { key: "rsf", label: "RSF" },
    { key: "rent", label: "Asking Rent ($/SF/yr)" },
    { key: "leaseType", label: "Lease Type" },
    { key: "possession", label: "Possession" },
    { key: "condition", label: "Condition" },
    { key: "status", label: "Status" },
    { key: "broker", label: "Broker" },
    { key: "notes", label: "Notes" },
    { key: "updated", label: "Updated" }
  ];

  var SAMPLE_DATA = [
    { building: "555 Madison Avenue", suite: "Entire 12th Floor", rsf: 12400, rent: 78, leaseType: "Direct", possession: "Immediate", condition: "White Box", status: "Available", broker: "M. Dichter", notes: "Full floor identity, new installation by landlord considered." },
    { building: "555 Madison Avenue", suite: "Suite 810", rsf: 4150, rent: 72, leaseType: "Direct", possession: "Immediate", condition: "Prebuilt", status: "Negotiating", broker: "M. Dichter", notes: "LOI out; 7-year term discussed." },
    { building: "410 Park Avenue", suite: "Suite 1520", rsf: 6800, rent: 95, leaseType: "Sublease", possession: "Q1 2027", condition: "Built", status: "Available", broker: "M. Dichter", notes: "Furnished sublease through 2031, term-coterminous only." },
    { building: "1180 Sixth Avenue", suite: "Entire 21st Floor", rsf: 15750, rent: 62, leaseType: "Direct", possession: "Arranged", condition: "Raw", status: "Lease Out", broker: "M. Dichter", notes: "Lease out for signature; backup offers welcome." },
    { building: "230 Park Avenue South", suite: "Suite 400", rsf: 9200, rent: 68, leaseType: "Direct", possession: "Immediate", condition: "As-Is", status: "Leased", broker: "M. Dichter", notes: "Signed June 2026 — 10-year term." }
  ];

  var state = {
    items: [],
    search: "",
    filterStatus: "",
    filterType: "",
    sortKey: "building",
    sortDir: 1,
    editingId: null
  };

  // ---------- Persistence ----------

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state.items = raw ? JSON.parse(raw) : [];
    } catch (e) {
      state.items = [];
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  function makeId() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- Formatting ----------

  function fmtInt(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  function fmtRent(n) {
    if (n === "" || n == null || isNaN(n)) return "–";
    return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtCompact(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return fmtInt(n);
  }

  function fmtDate(iso) {
    if (!iso) return "–";
    var d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function statusClass(status) {
    return "status-" + String(status || "").toLowerCase().replace(/\s+/g, "-");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ---------- Filtering / sorting ----------

  function visibleItems() {
    var q = state.search.trim().toLowerCase();
    var items = state.items.filter(function (it) {
      if (state.filterStatus && it.status !== state.filterStatus) return false;
      if (state.filterType && it.leaseType !== state.filterType) return false;
      if (!q) return true;
      return ["building", "suite", "broker", "notes", "possession", "condition", "status"]
        .some(function (k) { return String(it[k] || "").toLowerCase().indexOf(q) !== -1; });
    });

    var key = state.sortKey, dir = state.sortDir;
    items.sort(function (a, b) {
      var av = a[key], bv = b[key];
      if (key === "rsf" || key === "rent") {
        av = av === "" || av == null ? -Infinity : Number(av);
        bv = bv === "" || bv == null ? -Infinity : Number(bv);
        return (av - bv) * dir;
      }
      return String(av || "").localeCompare(String(bv || ""), "en", { sensitivity: "base" }) * dir;
    });
    return items;
  }

  // ---------- Rendering ----------

  function renderStats() {
    var active = state.items.filter(function (it) { return ACTIVE_STATUSES.indexOf(it.status) !== -1; });
    var totalRsf = active.reduce(function (s, it) { return s + (Number(it.rsf) || 0); }, 0);
    var rents = active.map(function (it) { return Number(it.rent); }).filter(function (n) { return !isNaN(n) && n > 0; });
    var avgRent = rents.length ? rents.reduce(function (s, n) { return s + n; }, 0) / rents.length : null;
    var year = new Date().getFullYear();
    var leased = state.items.filter(function (it) {
      return it.status === "Leased" && it.updated && new Date(it.updated).getFullYear() === year;
    }).length;

    document.getElementById("stat-count").textContent = fmtInt(active.length);
    document.getElementById("stat-rsf").textContent = fmtCompact(totalRsf);
    document.getElementById("stat-rent").textContent = avgRent == null ? "–" : "$" + avgRent.toFixed(2);
    document.getElementById("stat-leased").textContent = fmtInt(leased);
  }

  function renderTable() {
    var items = visibleItems();
    var body = document.getElementById("table-body");
    var empty = document.getElementById("empty-state");
    var table = document.getElementById("avail-table");

    document.querySelectorAll(".avail-table th.sortable").forEach(function (th) {
      th.classList.remove("sorted-asc", "sorted-desc");
      if (th.dataset.sort === state.sortKey) {
        th.classList.add(state.sortDir === 1 ? "sorted-asc" : "sorted-desc");
      }
    });

    if (state.items.length === 0) {
      table.hidden = true;
      empty.hidden = false;
      document.getElementById("filter-count").textContent = "";
      return;
    }
    table.hidden = false;
    empty.hidden = true;

    body.innerHTML = items.map(function (it) {
      return "<tr data-id=\"" + it.id + "\">" +
        "<td class=\"building-cell wrap\">" + escapeHtml(it.building) +
          (it.notes ? "<div class=\"notes-cell\">" + escapeHtml(it.notes) + "</div>" : "") + "</td>" +
        "<td>" + escapeHtml(it.suite) + "</td>" +
        "<td class=\"num\">" + fmtInt(it.rsf) + "</td>" +
        "<td class=\"num\">" + fmtRent(it.rent) + "</td>" +
        "<td>" + escapeHtml(it.leaseType) + "</td>" +
        "<td>" + escapeHtml(it.possession || "–") + "</td>" +
        "<td>" + escapeHtml(it.condition || "–") + "</td>" +
        "<td><span class=\"status-badge " + statusClass(it.status) + "\"><span class=\"dot\"></span>" + escapeHtml(it.status) + "</span></td>" +
        "<td>" + escapeHtml(it.broker || "–") + "</td>" +
        "<td>" + fmtDate(it.updated) + "</td>" +
        "<td class=\"actions-cell\">" +
          "<button type=\"button\" class=\"btn-icon\" data-action=\"edit\" title=\"Edit\" aria-label=\"Edit\">✎</button>" +
          "<button type=\"button\" class=\"btn-icon danger\" data-action=\"delete\" title=\"Delete\" aria-label=\"Delete\">✕</button>" +
        "</td>" +
      "</tr>";
    }).join("");

    var count = document.getElementById("filter-count");
    count.textContent = items.length === state.items.length
      ? state.items.length + " listing" + (state.items.length === 1 ? "" : "s")
      : items.length + " of " + state.items.length + " listings";
  }

  function render() {
    renderStats();
    renderTable();
  }

  // ---------- Modal ----------

  var modal = document.getElementById("modal");
  var form = document.getElementById("avail-form");

  function openModal(item) {
    state.editingId = item ? item.id : null;
    document.getElementById("modal-title").textContent = item ? "Edit availability" : "Add availability";
    form.reset();
    if (item) {
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name && item[el.name] != null) el.value = item[el.name];
      });
    }
    modal.showModal();
    form.elements.building.focus();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var data = {
      building: form.elements.building.value.trim(),
      suite: form.elements.suite.value.trim(),
      rsf: Number(form.elements.rsf.value) || 0,
      rent: form.elements.rent.value === "" ? "" : Number(form.elements.rent.value),
      leaseType: form.elements.leaseType.value,
      possession: form.elements.possession.value.trim(),
      condition: form.elements.condition.value,
      status: form.elements.status.value,
      broker: form.elements.broker.value.trim(),
      notes: form.elements.notes.value.trim(),
      updated: new Date().toISOString()
    };

    if (state.editingId) {
      var idx = state.items.findIndex(function (it) { return it.id === state.editingId; });
      if (idx !== -1) {
        data.id = state.editingId;
        state.items[idx] = data;
      }
    } else {
      data.id = makeId();
      state.items.push(data);
    }
    save();
    render();
    modal.close();
  });

  document.getElementById("btn-cancel").addEventListener("click", function () {
    modal.close();
  });

  // ---------- CSV export / import ----------

  function csvEscape(v) {
    var s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return "\"" + s.replace(/"/g, "\"\"") + "\"";
    return s;
  }

  function exportCsv() {
    var rows = [CSV_COLUMNS.map(function (c) { return csvEscape(c.label); }).join(",")];
    state.items.forEach(function (it) {
      rows.push(CSV_COLUMNS.map(function (c) { return csvEscape(it[c.key]); }).join(","));
    });
    var blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "team-amrich-availabilities.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var cell = "";
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === "\"") {
          if (text[i + 1] === "\"") { cell += "\""; i++; }
          else inQuotes = false;
        } else cell += ch;
      } else if (ch === "\"") {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell); cell = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        rows.push(row); row = [];
      } else {
        cell += ch;
      }
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ""; }); });
  }

  function importCsv(text) {
    var rows = parseCsv(text);
    if (rows.length < 2) {
      alert("No data rows found in that CSV.");
      return;
    }
    var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    var colIndex = {};
    CSV_COLUMNS.forEach(function (c) {
      var i = header.indexOf(c.label.toLowerCase());
      if (i === -1 && c.key === "suite") i = header.indexOf("suite");
      if (i === -1 && c.key === "rent") i = header.indexOf("asking rent");
      colIndex[c.key] = i;
    });
    if (colIndex.building === -1) {
      alert("CSV must include a \"Building\" column. Export a CSV from this app to see the expected format.");
      return;
    }

    var imported = 0;
    rows.slice(1).forEach(function (r) {
      function get(key) {
        var i = colIndex[key];
        return i === -1 || r[i] == null ? "" : r[i].trim();
      }
      var building = get("building");
      if (!building) return;
      var status = get("status");
      if (STATUSES.indexOf(status) === -1) status = "Available";
      state.items.push({
        id: makeId(),
        building: building,
        suite: get("suite"),
        rsf: Number(String(get("rsf")).replace(/[^0-9.]/g, "")) || 0,
        rent: get("rent") === "" ? "" : Number(String(get("rent")).replace(/[^0-9.]/g, "")) || "",
        leaseType: get("leaseType") === "Sublease" ? "Sublease" : "Direct",
        possession: get("possession"),
        condition: get("condition"),
        status: status,
        broker: get("broker"),
        notes: get("notes"),
        updated: get("updated") && !isNaN(Date.parse(get("updated"))) ? new Date(get("updated")).toISOString() : new Date().toISOString()
      });
      imported++;
    });
    save();
    render();
    alert("Imported " + imported + " listing" + (imported === 1 ? "" : "s") + ".");
  }

  // ---------- Events ----------

  document.getElementById("btn-add").addEventListener("click", function () { openModal(null); });

  document.getElementById("btn-export").addEventListener("click", exportCsv);

  document.getElementById("btn-import").addEventListener("click", function () {
    document.getElementById("import-file").click();
  });

  document.getElementById("import-file").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { importCsv(String(reader.result)); };
    reader.readAsText(file);
    e.target.value = "";
  });

  document.getElementById("btn-sample").addEventListener("click", function () {
    var now = new Date().toISOString();
    state.items = SAMPLE_DATA.map(function (it) {
      var copy = Object.assign({}, it);
      copy.id = makeId();
      copy.updated = now;
      return copy;
    });
    save();
    render();
  });

  document.getElementById("table-body").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var id = btn.closest("tr").dataset.id;
    var item = state.items.find(function (it) { return it.id === id; });
    if (!item) return;
    if (btn.dataset.action === "edit") {
      openModal(item);
    } else if (btn.dataset.action === "delete") {
      if (confirm("Delete " + item.building + (item.suite ? ", " + item.suite : "") + "?")) {
        state.items = state.items.filter(function (it) { return it.id !== id; });
        save();
        render();
      }
    }
  });

  document.getElementById("search").addEventListener("input", function (e) {
    state.search = e.target.value;
    renderTable();
  });

  document.getElementById("filter-status").addEventListener("change", function (e) {
    state.filterStatus = e.target.value;
    renderTable();
  });

  document.getElementById("filter-type").addEventListener("change", function (e) {
    state.filterType = e.target.value;
    renderTable();
  });

  document.querySelectorAll(".avail-table th.sortable").forEach(function (th) {
    th.addEventListener("click", function () {
      var key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = -state.sortDir;
      } else {
        state.sortKey = key;
        state.sortDir = 1;
      }
      renderTable();
    });
  });

  // ---------- Init ----------

  load();
  render();
})();
