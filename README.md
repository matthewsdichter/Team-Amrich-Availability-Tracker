# Team Amrich Availability Tracker

A map-first tool for understanding the scope of Team Amrich's agency
availabilities across the portfolio. Built for the daily call that starts
"I need 10,000 feet of built space" — type a size range, pick a condition,
and see every option, including **contiguous multi-floor blocks the tool
assembles automatically**.

Plain HTML/CSS/JS with Leaflet vendored in — no build step, no server.
Host it on GitHub Pages or open `index.html` directly (the map tiles are
the only thing loaded from the internet).

## Features

- **Size + condition search** — enter a min/max SF range and toggle
  condition buckets (Whiteboxed/Raw, 2nd Gen, Prebuilt), plus an
  "Immediate only" switch for tenants who can't wait.
- **Contiguous-block engine** — consecutive available full floors are
  automatically combined and offered as single opportunities. A
  15,000–25,000 SF search knows to suggest E6–E7 at 499 Park (22,478 RSF)
  even though neither floor matches alone. Explicitly connected spaces
  (e.g. the P17/E18 slab cut at 11 Bryant Park) are handled via the
  `links` field. Lease-out floors break a block — E15 at 11 Bryant splits
  the run so only E9–E14 is offered.
- **Block pricing intelligence** — blended $/SF across a block's floors,
  with support for block-deal pricing that differs from single-floor asks
  (e.g. $95 for block users on E2–E6 at 410 Tenth vs. $92–$98 by floor).
- **Map view** — every building is a marker showing how many of its
  spaces/blocks match the current search; non-matching buildings dim.
  Click a marker to jump to the building's card; click a card to fly the
  map to the building.
- **List view** — the results panel groups matches by building, blocks
  first, with asking rent, condition, timing, notes, and lease-out flags.
- **Portfolio stats** — buildings, available spaces, total available RSF,
  and the single largest contiguous block across the portfolio.
- **Light & dark mode** — follows the system preference.

## Updating the data

When you change `js/data.js`, also bump the `?v=` version string on the
`css/styles.css`, `js/data.js`, and `js/app.js` tags in `index.html`.
GitHub Pages and browsers cache those files, so without a new version
string the live site keeps serving the old data.

`js/data.js` is the single source of truth and is written to scale to the
full 50+ building agency portfolio. Each building is one object with its
coordinates and a list of spaces; the schema is documented at the top of
the file. The app derives everything else — search, markers, and
contiguous blocks — automatically.

Conventions:

- `unit` — `E7` is an entire 7th floor, `P4` a partial. Consecutive
  **entire** floors are treated as contiguous automatically.
- `links` — declares connections that aren't consecutive entire floors
  (internal stairs, slab cuts), e.g. `[["P17", "E18"]]`.
- `status: "Lease Out"` — keeps the floor visible (flagged) but removes
  it from search results and block assembly.
- `ask: null` / `available: "TBD"` — supported everywhere and surfaced
  as TBD in results.
- `condition: null` — unknown; shown as "Condition TBD" and excluded
  only when a condition filter is active.
- `blockAsk` — building-level block-deal pricing applied when a block
  falls entirely inside the stated floor range.

## Running it

Open `index.html`, or serve locally:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Hosting on GitHub Pages

Settings → Pages → Deploy from a branch → select the branch, root folder.
The tracker will be live at
`https://<username>.github.io/Team-Amrich-Availability-Tracker/`.
