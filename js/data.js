/* ============================================================================
   Team Amrich — Availability data
   ============================================================================
   This file is the source of truth. To add a building, append an object to
   BUILDINGS following the schema below; the app derives everything else
   (search, map markers, contiguous blocks) automatically.

   Building schema:
     id         unique slug (used internally)
     name       display name
     address    street address (for the card)
     submarket  e.g. "Plaza District"
     lat, lng   coordinates for the map marker
     blockAsk   optional: { from, to, ask, note } — a special $/SF that applies
                to multi-floor (block) deals spanning floors from..to
     links      optional: explicit contiguous pairs of unit names for spaces
                that connect but aren't consecutive full floors,
                e.g. [["P17", "E18"]] for a slab-cut connection

   Space schema (one per unit):
     unit       "E7" = entire 7th floor, "P4" = partial 4th floor
     floor      numeric floor (drives contiguity: consecutive full floors
                in the same building are treated as contiguous)
     rsf        rentable square feet
     ask        asking rent $/SF/yr, or null for TBD
     askLab     optional second asking rent (e.g. lab/life-science pricing)
     condition  "Whiteboxed" | "Raw" | "2nd Gen" | "Prebuilt" | null (unknown)
                (Whiteboxed and Raw are one bucket in the condition filter)
     available  "Immediate", "MM/YYYY", "Q1 2027", or "TBD"
     status     "Available" | "Lease Out"  (Lease Out floors are shown but
                excluded from search matches and contiguous blocks)
     notes      free text shown on the card
   ========================================================================= */

var BUILDINGS = [
  {
    id: "499-park",
    name: "499 Park Avenue",
    address: "499 Park Avenue (at E 59th St)",
    submarket: "Plaza District",
    lat: 40.76289, lng: -73.96872,
    spaces: [
      { unit: "E7", floor: 7, rsf: 11303, ask: 104, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "" },
      { unit: "E6", floor: 6, rsf: 11175, ask: 103, condition: "Prebuilt", available: "10/2026", status: "Available", notes: "" }
    ]
  },
  {
    id: "11-bryant-park",
    name: "11 Bryant Park",
    address: "Eleven Bryant Park Plaza — 114 West 41st Street",
    submarket: "Bryant Park",
    lat: 40.75447, lng: -73.98561,
    links: [["P17", "E18"]],
    spaces: [
      { unit: "E22", floor: 22, rsf: 16174, ask: 105, condition: null, available: "Immediate", status: "Available", notes: "High-end duplex opportunity with increased ceiling heights and an internal staircase (E21/E22)" },
      { unit: "E21", floor: 21, rsf: 16174, ask: 105, condition: null, available: "Immediate", status: "Available", notes: "High-end duplex opportunity with increased ceiling heights and an internal staircase (E21/E22)" },
      { unit: "E18", floor: 18, rsf: 16172, ask: 78, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with a slab cut connecting E18/P17" },
      { unit: "P17", floor: 17, rsf: 7356, ask: 78, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with a slab cut connecting E18/P17" },
      { unit: "E15", floor: 15, rsf: 16183, ask: 76, condition: "Prebuilt", available: "Immediate", status: "Lease Out", notes: "Full floor prebuilt space" },
      { unit: "E14", floor: 14, rsf: 16183, ask: 76, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Demolished and currently being whiteboxed" },
      { unit: "E13", floor: 13, rsf: 16183, ask: 74, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Full floor prebuilt space" },
      { unit: "E12", floor: 12, rsf: 16183, ask: 74, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Full floor prebuilt space" },
      { unit: "E11", floor: 11, rsf: 15769, ask: 69, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Full floor prebuilt space" },
      { unit: "E10", floor: 10, rsf: 15918, ask: 69, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Full floor prebuilt space" },
      { unit: "E9", floor: 9, rsf: 15931, ask: 69, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Full floor prebuilt space" },
      { unit: "E7", floor: 7, rsf: 15931, ask: 66, condition: "Prebuilt", available: "Immediate", status: "Lease Out", notes: "Full floor prebuilt space" }
    ]
  },
  {
    id: "730-third",
    name: "730 Third Avenue",
    address: "730 Third Avenue (at E 45th St)",
    submarket: "Grand Central",
    lat: 40.75288, lng: -73.97194,
    spaces: [
      { unit: "E24", floor: 24, rsf: 8424, ask: 88, condition: "Raw", available: "Immediate", status: "Available", notes: "" },
      { unit: "E11", floor: 11, rsf: 30922, ask: null, condition: "2nd Gen", available: "TBD", status: "Available", notes: "" },
      { unit: "E10", floor: 10, rsf: 39999, ask: null, condition: "2nd Gen", available: "TBD", status: "Available", notes: "" }
    ]
  },
  {
    id: "450-park",
    name: "450 Park Avenue",
    address: "450 Park Avenue (at E 57th St)",
    submarket: "Plaza District",
    lat: 40.76154, lng: -73.97095,
    spaces: [
      { unit: "E9", floor: 9, rsf: 10392, ask: 150, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "" },
      { unit: "E6", floor: 6, rsf: 10392, ask: 130, condition: "Prebuilt", available: "11/2026", status: "Available", notes: "" },
      { unit: "E4", floor: 4, rsf: 10392, ask: null, condition: "2nd Gen", available: "TBD", status: "Available", notes: "" }
    ]
  },
  {
    id: "410-tenth",
    name: "410 Tenth Avenue",
    address: "410 Tenth Avenue (at W 33rd St)",
    submarket: "Hudson Yards",
    lat: 40.75459, lng: -73.99946,
    blockAsk: { from: 2, to: 6, ask: 95, note: "$95/SF for block users on E2–E6" },
    spaces: [
      { unit: "E8", floor: 8, rsf: 37885, ask: null, condition: "2nd Gen", available: "TBD", status: "Available", notes: "" },
      { unit: "E7", floor: 7, rsf: 37885, ask: null, condition: "2nd Gen", available: "TBD", status: "Available", notes: "" },
      { unit: "E6", floor: 6, rsf: 37885, ask: 98, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Single-floor ask $98; $95 for block users" },
      { unit: "E5", floor: 5, rsf: 37885, ask: 95, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Single-floor ask $95; $95 for block users" },
      { unit: "E4", floor: 4, rsf: 37885, ask: 95, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Single-floor ask $95; $95 for block users" },
      { unit: "E3", floor: 3, rsf: 37885, ask: 92, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Single-floor ask $92; $95 for block users" },
      { unit: "E2", floor: 2, rsf: 37885, ask: 92, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Single-floor ask $92; $95 for block users" }
    ]
  },
  {
    id: "95-spring",
    name: "95 Spring Street",
    address: "95 Spring Street (at Broadway)",
    submarket: "SoHo",
    lat: 40.72324, lng: -73.99850,
    spaces: [
      { unit: "E7", floor: 7, rsf: 3968, ask: 205, condition: "Raw", available: "Q1 2027", status: "Available", notes: "Private rooftop terrace" },
      { unit: "E6", floor: 6, rsf: 8600, ask: 205, condition: "Raw", available: "Q1 2027", status: "Available", notes: "" },
      { unit: "E5", floor: 5, rsf: 10558, ask: 205, condition: "Raw", available: "Q1 2027", status: "Available", notes: "" },
      { unit: "E4", floor: 4, rsf: 10349, ask: 180, condition: "Raw", available: "Q1 2027", status: "Available", notes: "" },
      { unit: "E3", floor: 3, rsf: 9829, ask: 180, condition: "Raw", available: "Q1 2027", status: "Available", notes: "" }
    ]
  },
  {
    id: "1370-aofa",
    name: "1370 Avenue of the Americas",
    address: "1370 Avenue of the Americas (SEC W 56th St)",
    submarket: "Plaza District",
    lat: 40.76340, lng: -73.97770,
    spaces: [
      { unit: "P12", floor: 12, rsf: 6558, ask: 82, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Pending prebuilt space" },
      { unit: "E11", floor: 11, rsf: 11046, ask: 76, condition: "Raw", available: "Immediate", status: "Available", notes: "Raw space; LL will turnkey or provide TI" },
      { unit: "P10", floor: 10, rsf: 4842, ask: 69, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Prebuilt: 1 conference room, 2 offices, 2 phone rooms, open area for 22" },
      { unit: "E7", floor: 7, rsf: 11046, ask: 69, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing showroom installation; LL will modify or demolish and turnkey" },
      { unit: "P4-A", floor: 4, rsf: 4418, ask: 69, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Built showroom space; LL will modify and build out" },
      { unit: "P4-B", floor: 4, rsf: 5169, ask: 69, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Built showroom space; LL will modify and build out" },
      { unit: "P3", floor: 3, rsf: 4401, ask: 76, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Pending prebuilt space" }
    ]
  },
  {
    id: "345-pas",
    name: "345 Park Avenue South",
    address: "345 Park Avenue South (between E 25th & 26th St)",
    submarket: "Gramercy Park",
    lat: 40.74209, lng: -73.98485,
    spaces: [
      { unit: "E7", floor: 7, rsf: 27447, ask: 126, askLab: 140, condition: null, available: "Immediate", status: "Available", notes: "Lab/life science asking $140 NNN" },
      { unit: "P6", floor: 6, rsf: 11588, ask: 124, askLab: 140, condition: null, available: "Immediate", status: "Available", notes: "Lab/life science asking $140 NNN" }
    ]
  },
  {
    id: "41-45-w25",
    name: "41-45 West 25th Street",
    address: "41-45 West 25th Street",
    submarket: "Flatiron",
    lat: 40.74399, lng: -73.99078,
    spaces: [
      { unit: "E7", floor: 7, rsf: 5416, ask: 65, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "" },
      { unit: "E3", floor: 3, rsf: 5416, ask: 60, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "" }
    ]
  }
];
