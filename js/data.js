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
     links      optional: explicit contiguous groups of unit names for spaces
                that connect but aren't consecutive full floors,
                e.g. [["P17", "E18"]] for a slab-cut connection, or
                [["P11-A", "P11-B", "P11-C"]] for partials that combine
                into an entire floor

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
      { unit: "E10", floor: 10, rsf: 10392, ask: 150, condition: null, available: "Immediate", status: "Available", notes: "Landlord can provide a new turn-key installation" },
      { unit: "E9", floor: 9, rsf: 10392, ask: 150, condition: "Prebuilt", available: "TBD", status: "Available", notes: "Planned prebuilt for 10/1/2026 delivery" },
      { unit: "E7", floor: 7, rsf: 10392, ask: 140, condition: null, available: "Immediate", status: "Lease Out", notes: "" },
      { unit: "E6", floor: 6, rsf: 10392, ask: 130, condition: "Prebuilt", available: "09/2026", status: "Available", notes: "New prebuilt: 11 offices, 3 conference rooms, open area for 30" }
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
  },
  {
    id: "2-grand-central",
    name: "2 Grand Central",
    address: "2 Grand Central Tower — 140 East 45th Street (between Third & Lexington)",
    submarket: "East Side",
    lat: 40.75279, lng: -73.97331,
    spaces: [
      { unit: "P44", floor: 44, rsf: 5733, ask: 120, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Prebuilt" },
      { unit: "E37", floor: 37, rsf: 16400, ask: 93, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "LL will demolish; will consider dividing to 11,106 RSF" },
      { unit: "E36", floor: 36, rsf: 16400, ask: 93, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "LL will demolish; existing stair connects 35–36" },
      { unit: "E35", floor: 35, rsf: 16750, ask: 93, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished; extra ceiling height" },
      { unit: "P23", floor: 23, rsf: 6803, ask: 82, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Recently upgraded" },
      { unit: "P22", floor: 22, rsf: 5381, ask: 82, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Recently upgraded and partially furnished" },
      { unit: "P18", floor: 18, rsf: 7476, ask: 85, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Planned prebuilt" },
      { unit: "P15", floor: 15, rsf: 5047, ask: 77, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Recently upgraded" },
      { unit: "E12", floor: 12, rsf: 16000, ask: 78, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "LL is planning to modify/upgrade" },
      { unit: "P11", floor: 11, rsf: 6942, ask: 74, condition: "2nd Gen", available: "01/2027", status: "Available", notes: "Recently built and partially furnished; LL will modify" },
      { unit: "E9", floor: 9, rsf: 16050, ask: 72, condition: "2nd Gen", available: "12/2026", status: "Available", notes: "LL will modify or demolish" },
      { unit: "E8", floor: 8, rsf: 16050, ask: 72, condition: "2nd Gen", available: "12/2026", status: "Available", notes: "LL will modify or demolish" },
      { unit: "E7", floor: 7, rsf: 16050, ask: 72, condition: "2nd Gen", available: "12/2026", status: "Lease Out", notes: "LL will modify or demolish" },
      { unit: "P4", floor: 4, rsf: 4778, ask: 72, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Pending prebuilt" },
      { unit: "P3", floor: 3, rsf: 2959, ask: 67, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Built; LL will modify" }
    ]
  },
  {
    id: "530-fifth",
    name: "530 Fifth Avenue",
    address: "530 Fifth Avenue (between 44th & 45th St)",
    submarket: "Grand Central",
    lat: 40.75494, lng: -73.98090,
    spaces: [
      { unit: "E23", floor: 23, rsf: 7859, ask: 95, condition: "2nd Gen", available: "09/2026", status: "Available", notes: "Office-intensive built space; landlord will modify/refresh" },
      { unit: "E15", floor: 15, rsf: 22559, ask: 84, condition: "Whiteboxed", available: "Immediate", status: "Lease Out", notes: "Whiteboxed; LL will turnkey; will divide" },
      { unit: "P11", floor: 11, rsf: 17464, ask: 77, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Nicely white boxed; LL will turnkey" }
    ]
  },
  {
    id: "33-w60",
    name: "33 West 60th Street",
    address: "33 West 60th Street (between Broadway & Columbus Ave)",
    submarket: "Columbus Circle",
    lat: 40.76932, lng: -73.98289,
    spaces: [
      { unit: "E10", floor: 10, rsf: 11070, ask: 45, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Built floor; landlord will modify/upgrade" },
      { unit: "E8", floor: 8, rsf: 11933, ask: 45, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Built floor; landlord will modify/upgrade" },
      { unit: "E5", floor: 5, rsf: 11933, ask: 42, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Whitebox floor; LL will turnkey or provide TI allowance" }
    ]
  },
  {
    id: "630-third",
    name: "630 Third Avenue",
    address: "630 Third Avenue (SWC East 41st St & Third Ave)",
    submarket: "Grand Central",
    lat: 40.75026, lng: -73.97465,
    spaces: [
      { unit: "P22", floor: 22, rsf: 5915, ask: 85, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built unit; LL can modify" },
      { unit: "P18-A", floor: 18, rsf: 10602, ask: 83, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Whitebox; divisible from 5,316 RSF; LL will build; planned 10K RSF prebuilt" },
      { unit: "P18-B", floor: 18, rsf: 10602, ask: 83, condition: "2nd Gen", available: "09/2026", status: "Available", notes: "Second generation; divisible from 5,286 RSF; LL will build; planned 10K RSF prebuilt" },
      { unit: "P16", floor: 16, rsf: 5937, ask: 83, condition: "Prebuilt", available: "09/2026", status: "Available", notes: "Planned prebuilt; expecting to deliver September 2026" },
      { unit: "E10", floor: 10, rsf: 15943, ask: 75, condition: "Prebuilt", available: "09/2026", status: "Available", notes: "Planned prebuilt; expecting to deliver September 2026" },
      { unit: "E9", floor: 9, rsf: 15970, ask: 73, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Whitebox; LL can build" },
      { unit: "E8", floor: 8, rsf: 15984, ask: 73, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Whitebox; LL can build" },
      { unit: "P7-A", floor: 7, rsf: 5665, ask: 70, condition: "Prebuilt", available: "09/2026", status: "Available", notes: "Planned prebuilt; expecting to deliver September 2026" },
      { unit: "P7-B", floor: 7, rsf: 1791, ask: 70, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Whitebox; LL can build" },
      { unit: "P6", floor: 6, rsf: 3296, ask: 68, condition: "Prebuilt", available: "09/2026", status: "Lease Out", notes: "Planned prebuilt; expecting to deliver September 2026" },
      { unit: "P5", floor: 5, rsf: 5724, ask: 66, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Second generation, to be demolished; LL will build" },
      { unit: "E3", floor: 3, rsf: 15852, ask: 65, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Second generation" },
      { unit: "P2", floor: 2, rsf: 8918, ask: 65, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Second generation; furnished" }
    ]
  },
  {
    id: "685-third",
    name: "685 Third Avenue",
    address: "685 Third Avenue (NEC East 43rd St & Third Ave)",
    submarket: "Grand Central",
    lat: 40.75151, lng: -73.97315,
    spaces: [
      { unit: "P18", floor: 18, rsf: 5783, ask: 78, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Built with one conference room, 4 offices, pantry and open area" },
      { unit: "E15", floor: 15, rsf: 22939, ask: 80, condition: "2nd Gen", available: "Q2 2027", status: "Available", notes: "Space can be refreshed or rebuilt" },
      { unit: "E14", floor: 14, rsf: 25279, ask: 80, condition: "2nd Gen", available: "Q2 2027", status: "Available", notes: "Space can be refreshed or rebuilt" },
      { unit: "E13", floor: 13, rsf: 24628, ask: 80, condition: "2nd Gen", available: "Q2 2027", status: "Available", notes: "Space can be refreshed or rebuilt" },
      { unit: "E8", floor: 8, rsf: 29243, ask: 70, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Currently divided into two units — 14,358 RSF and 14,885 RSF" }
    ]
  },
  {
    id: "600-madison",
    name: "600 Madison Avenue",
    address: "600 Madison Avenue (between E 57th & 58th St)",
    submarket: "Plaza District",
    lat: 40.76263, lng: -73.97244,
    spaces: [
      { unit: "E19", floor: 19, rsf: 9830, ask: 155, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built/furnished space with two expansive terraces overlooking Central Park" },
      { unit: "E10", floor: 10, rsf: 20849, ask: 110, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished; terrace" },
      { unit: "E9", floor: 9, rsf: 22194, ask: 105, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished" },
      { unit: "E8", floor: 8, rsf: 22194, ask: 105, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished; terrace" },
      { unit: "E7", floor: 7, rsf: 16454, ask: 105, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished; extra ceiling height" },
      { unit: "E6", floor: 6, rsf: 22849, ask: 97, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished" },
      { unit: "E5", floor: 5, rsf: 22849, ask: 97, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished" },
      { unit: "E3", floor: 3, rsf: 22903, ask: 97, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built/furnished space that can be refreshed or demolished" }
    ]
  },
  {
    id: "225-233-pas",
    name: "225-233 Park Avenue South",
    address: "225-233 Park Avenue South (between E 18th & 19th St)",
    submarket: "Union Square",
    lat: 40.73831, lng: -73.98832,
    spaces: [
      { unit: "E19", floor: 19, rsf: 22871, ask: 150, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished; commercial kitchen; outdoor space" },
      { unit: "E18", floor: 18, rsf: 29410, ask: 150, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished" },
      { unit: "E17", floor: 17, rsf: 29410, ask: 150, condition: "Raw", available: "Immediate", status: "Available", notes: "Demolished" },
      { unit: "E11", floor: 11, rsf: 41816, ask: 120, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Needs to be demolished" },
      { unit: "E10", floor: 10, rsf: 42987, ask: 120, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Needs to be demolished" },
      { unit: "E9", floor: 9, rsf: 42745, ask: 115, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Needs to be demolished; commercial kitchen" },
      { unit: "E8", floor: 8, rsf: 42897, ask: 115, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "White boxed" },
      { unit: "E7", floor: 7, rsf: 42483, ask: 115, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Needs to be demolished" },
      { unit: "E6", floor: 6, rsf: 42642, ask: 115, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Needs to be demolished" },
      { unit: "E5", floor: 5, rsf: 42927, ask: 105, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Needs to be demolished" },
      { unit: "E4", floor: 4, rsf: 42554, ask: 105, condition: "Raw", available: "Immediate", status: "Lease Out", notes: "Demolished" }
    ]
  }
,
  {
    id: "1500-broadway",
    name: "1500 Broadway",
    address: "1500 Broadway (between W 43rd & 44th St)",
    submarket: "Times Square",
    lat: 40.75683, lng: -73.98603,
    links: [["P11-A", "P11-B", "P11-C"]],
    spaces: [
      { unit: "E32", floor: 32, rsf: 12850, ask: 71, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "High-end existing full-floor installation: 5 offices, 1 training room, 3 conference rooms, 1 meeting room, 4 phone rooms, open area for 69 workstations and pantry. Abundant natural light, glass-fronted offices. LL will modify and upgrade" },
      { unit: "P23", floor: 23, rsf: 4414, ask: 65, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with 5 offices, 1 conference room, open area for 11 workstations and pantry. Partially furnished; LL can modify and upgrade" },
      { unit: "P22-A", floor: 22, rsf: 6247, ask: 65, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with 10 offices, 2 conference rooms, open area and pantry. LL can modify as needed" },
      { unit: "P22-B", floor: 22, rsf: 3049, ask: 65, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with 5 offices, 1 conference room, open area for 6 workstations and pantry. Furnished, glass-fronted offices; LL can modify and upgrade" },
      { unit: "E21", floor: 21, rsf: 12850, ask: 65, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built and furnished existing full-floor installation: 25 offices, 2 conference rooms, open area for 33 workstations and pantry. Glass-fronted offices; LL will modify and upgrade" },
      { unit: "P20", floor: 20, rsf: 2929, ask: 63, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with 3 offices, 1 conference room, open area for 4+ workstations and pantry. LL will modify and upgrade or demolish and turnkey to its high-end building standard" },
      { unit: "P14-A", floor: 14, rsf: 7830, ask: 62, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Brand new prebuilt: 4 offices, 2 conference rooms, wellness room, pantry and open area for 32+" },
      { unit: "P14-B", floor: 14, rsf: 7912, ask: 62, condition: "2nd Gen", available: "02/2027", status: "Available", notes: "Nicely built unit with 3 offices, 2 conference rooms, 2 meeting rooms, pantry and open area for 30" },
      { unit: "P12", floor: 12, rsf: 7573, ask: 62, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Brand new prebuilt: 4 offices, 2 conference rooms, wellness room, pantry and open area for 32+" },
      { unit: "P11-A", floor: 11, rsf: 7231, ask: 60, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with 6 offices, 2 conference rooms, open area and pantry. Partially furnished. LL will modify and upgrade or demolish and turnkey. Entire 11th floor (15,742 RSF) can be made available" },
      { unit: "P11-B", floor: 11, rsf: 5315, ask: 60, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation with 6 offices, 1 conference room, 2 meeting rooms, open area for 15 workstations and pantry. LL will modify and upgrade or demolish and turnkey. Entire 11th floor (15,742 RSF) can be made available" },
      { unit: "P11-C", floor: 11, rsf: 3196, ask: 60, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation. LL will modify and upgrade or demolish and turnkey. Entire 11th floor (15,742 RSF) can be made available" },
      { unit: "P8", floor: 8, rsf: 3758, ask: 60, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing installation. LL will modify and upgrade or turnkey to its high-end building standard" }
    ]
  },
  {
    id: "780-third",
    name: "780 Third Avenue",
    address: "780 Third Avenue (between E 48th & 49th St)",
    submarket: "East Side",
    lat: 40.75655, lng: -73.97166,
    spaces: [
      { unit: "P42", floor: 42, rsf: 6707, ask: 120, condition: "Prebuilt", available: "03/2027", status: "Available", notes: "LL to prebuild upon possession; LL will turnkey" },
      { unit: "P28", floor: 28, rsf: 4148, ask: 98, condition: "2nd Gen", available: "09/2026", status: "Available", notes: "LL will modify" },
      { unit: "P25", floor: 25, rsf: 3545, ask: 98, condition: "2nd Gen", available: "12/2026", status: "Available", notes: "LL will modify" },
      { unit: "P22", floor: 22, rsf: 6038, ask: 98, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Prebuilt: 7 offices, 3 phone rooms, conference room, lounge and open area" },
      { unit: "P19", floor: 19, rsf: 3333, ask: 89, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "LL will modify" },
      { unit: "P14", floor: 14, rsf: 2706, ask: 89, condition: "2nd Gen", available: "01/2027", status: "Lease Out", notes: "Recently refreshed space" },
      { unit: "P11", floor: 11, rsf: 1427, ask: 95, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Prebuilt underway" }
    ]
  },
  {
    id: "575-lex",
    name: "575 Lexington Avenue",
    address: "575 Lexington Avenue (between E 51st & 52nd St)",
    submarket: "Plaza District",
    lat: 40.75790, lng: -73.97108,
    spaces: [
      { unit: "E33", floor: 33, rsf: 9811, ask: 84, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built" },
      { unit: "P28", floor: 28, rsf: 5326, ask: 87, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing units that LL will demo, combine and build" },
      { unit: "E26", floor: 26, rsf: 9850, ask: 85, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Brand new prebuilt" },
      { unit: "P24", floor: 24, rsf: 4382, ask: 82, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "North side; nicely built" },
      { unit: "E20", floor: 20, rsf: 14565, ask: 78, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Whitebox floor with terrace on the south side" },
      { unit: "E19", floor: 19, rsf: 15226, ask: 78, condition: "Whiteboxed", available: "Immediate", status: "Available", notes: "Whitebox" },
      { unit: "E15", floor: 15, rsf: 22281, ask: 74, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built and furnished" },
      { unit: "E8", floor: 8, rsf: 35865, ask: 68, condition: "Raw", available: "Immediate", status: "Available", notes: "Raw" }
    ]
  },
  {
    id: "5-bryant-park",
    name: "5 Bryant Park",
    address: "5 Bryant Park — 1065 Sixth Avenue (NWC of West 40th St)",
    submarket: "Bryant Park",
    lat: 40.75325, lng: -73.98524,
    spaces: [
      { unit: "E34", floor: 34, rsf: 7558, ask: 130, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "Nicely built floor with 1 conference room, 1 meeting room, 1 office, open area for 50 and pantry" },
      { unit: "E33", floor: 33, rsf: 7558, ask: 130, condition: "2nd Gen", available: "10/2026", status: "Available", notes: "Nicely built floor with 7 offices, 2 conference rooms, open area for 30 and pantry; delivers 10/1/2026" },
      { unit: "E32", floor: 32, rsf: 7405, ask: 130, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; landlord can turnkey or provide a TI allowance" },
      { unit: "E31", floor: 31, rsf: 7405, ask: 130, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built-out space currently connected with 30 by an interconnecting stair; floor can be leased individually or together. LL will modify or turnkey or provide a TI allowance" },
      { unit: "E30", floor: 30, rsf: 7405, ask: 130, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Nicely built-out space currently connected with 31 by an interconnecting stair; floor can be leased individually or together. LL will modify or turnkey or provide a TI allowance" },
      { unit: "E18", floor: 18, rsf: 23228, ask: 115, condition: "Raw", available: "Immediate", status: "Lease Out", notes: "Demolished" },
      { unit: "E7", floor: 7, rsf: 34032, ask: 89, condition: "Prebuilt", available: "Immediate", status: "Lease Out", notes: "Partial prebuilt" }
    ]
  },
  {
    id: "260-madison",
    name: "260 Madison Avenue",
    address: "260 Madison Avenue (between E 38th & 39th St)",
    submarket: "Grand Central",
    lat: 40.74963, lng: -73.98175,
    spaces: [
      { unit: "E14", floor: 14, rsf: 23760, ask: 86, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; landlord will build or provide cash allowance" },
      { unit: "E12", floor: 12, rsf: 26549, ask: 84, condition: "2nd Gen", available: "Immediate", status: "Lease Out", notes: "To be demolished; landlord will build or provide cash allowance" },
      { unit: "E11", floor: 11, rsf: 26549, ask: 84, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; landlord will build or provide cash allowance" },
      { unit: "P10", floor: 10, rsf: 5902, ask: 82, condition: "Prebuilt", available: "Immediate", status: "Available", notes: "Planned prebuilt set to deliver by end of year" },
      { unit: "E7", floor: 7, rsf: 36293, ask: 80, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; landlord will build or provide cash allowance" }
    ]
  },
  {
    id: "31-w27",
    name: "31 West 27th Street",
    address: "31 West 27th Street (between Broadway & Sixth Ave)",
    submarket: "Chelsea",
    lat: 40.74542, lng: -73.98874,
    spaces: [
      { unit: "P11", floor: 11, rsf: 5636, ask: 82, condition: "Prebuilt", available: "08/2026", status: "Available", notes: "North side; pending prebuilt to feature 2 conference rooms, 3 offices, phone room/wellness room and open area for 21" },
      { unit: "P9", floor: 9, rsf: 6826, ask: 78, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Existing built unit" },
      { unit: "E8", floor: 8, rsf: 11578, ask: 79, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; LL can build to suit or provide TI" },
      { unit: "E7", floor: 7, rsf: 11578, ask: 79, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; LL can build to suit or provide TI; open to dividing this floor into a 2-tenant scenario" },
      { unit: "E4", floor: 4, rsf: 11578, ask: 69, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Recently built" }
    ]
  },
  {
    id: "1411-broadway",
    name: "1411 Broadway",
    address: "1411 Broadway (between W 39th & 40th St)",
    submarket: "Times Square South",
    lat: 40.75341, lng: -73.98722,
    spaces: [
      { unit: "E37", floor: 37, rsf: 25261, ask: 95, condition: "2nd Gen", available: "05/2027", status: "Lease Out", notes: "To be demolished and whiteboxed; LL will demo and provide TI or build" },
      { unit: "E36", floor: 36, rsf: 25261, ask: 95, condition: "2nd Gen", available: "05/2027", status: "Lease Out", notes: "To be demolished and whiteboxed; LL will demo and provide TI or build" },
      { unit: "E30", floor: 30, rsf: 25261, ask: 85, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished and whiteboxed; LL will demo and provide TI or build" },
      { unit: "P29", floor: 29, rsf: 6962, ask: 85, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "Built unit with 1 conference room, 13 offices, open area for 4, pantry and private restroom/shower" },
      { unit: "E23", floor: 23, rsf: 25261, ask: 80, condition: "2nd Gen", available: "01/2027", status: "Available", notes: "To be demolished and whiteboxed; LL will demo and provide TI or build" },
      { unit: "E15", floor: 15, rsf: 25261, ask: 78, condition: "2nd Gen", available: "05/2027", status: "Available", notes: "To be demolished and whiteboxed; LL will demo and provide TI or build" },
      { unit: "P12", floor: 12, rsf: 14611, ask: 74, condition: "Prebuilt", available: "10/2026", status: "Lease Out", notes: "Recently prebuilt unit with 2 conference rooms, 2 meeting rooms, 3 offices, 3 phone rooms, open area for 80 and pantry" }
    ]
  },
  {
    id: "530-seventh",
    name: "530 Seventh Avenue",
    address: "530 Seventh Avenue (between W 38th & 39th St)",
    submarket: "Garment District",
    lat: 40.75277, lng: -73.98867,
    spaces: [
      { unit: "E4", floor: 4, rsf: 18500, ask: 65, condition: "2nd Gen", available: "TBD", status: "Available", notes: "Availability to be arranged; to be demolished and landlord will turnkey" },
      { unit: "E3", floor: 3, rsf: 18500, ask: 65, condition: "2nd Gen", available: "TBD", status: "Available", notes: "Availability to be arranged; to be demolished and landlord will turnkey" }
    ]
  },
  {
    id: "1177-aofa",
    name: "1177 Avenue of the Americas",
    address: "1177 Avenue of the Americas (between W 45th & 46th St)",
    submarket: "Rockefeller Center",
    lat: 40.75717, lng: -73.98195,
    spaces: [
      { unit: "E37", floor: 37, rsf: 15301, ask: 125, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished" },
      { unit: "E32", floor: 32, rsf: 15301, ask: 120, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished" },
      { unit: "E31", floor: 31, rsf: 24828, ask: 120, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished" },
      { unit: "E15", floor: 15, rsf: 24764, ask: 100, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished" },
      { unit: "E12", floor: 12, rsf: 24764, ask: 95, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; can be combined with 10 and 11 for a 74K RSF block" },
      { unit: "E11", floor: 11, rsf: 24772, ask: 95, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; can be combined with 10 and 12 for a 74K RSF block" },
      { unit: "E10", floor: 10, rsf: 24788, ask: 95, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished; can be combined with 11 and 12 for a 74K RSF block" },
      { unit: "E6", floor: 6, rsf: 33807, ask: 90, condition: "2nd Gen", available: "Immediate", status: "Available", notes: "To be demolished" },
      { unit: "P4", floor: 4, rsf: 12710, ask: 85, condition: "2nd Gen", available: "Q3 2026", status: "Available", notes: "Built space coming back Q3 2026; landlord will modify/upgrade as needed" }
    ]
  }
];
