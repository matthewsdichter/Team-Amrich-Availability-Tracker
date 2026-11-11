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
- **PDF reports** — tick the box on any space or contiguous block (or hit
  "Select all shown" after a search) and click **Report** to build a
  client-ready survey. See below.
- **Status editing on the site** — click **Edit** and every space gets a
  status dropdown: **Available**, **Lease Out**, or **Leased**. Lease-outs
  stay visible but flagged and drop out of searches, blocks and reports;
  leased space disappears from the site entirely. Changes commit
  themselves back to the repo, so the whole team sees them. See
  [Editing status from the site](#editing-status-from-the-site).
- **Light & dark mode** — follows the system preference.

## Generating a report

Filter to what the tenant needs — say 10,000–15,000 SF, Prebuilt — then
pick the spaces worth sending. Each row in the results list has a
checkbox; "Select all shown" takes everything the current filter
surfaced, contiguous blocks included. **Report** opens a preview where
you can set a title and a "Prepared for" line, and **Download PDF** hands
that sheet to the browser's print dialog — choose *Save as PDF* as the
destination.

The report groups the selection by building, leads with contiguous blocks,
and prints the search criteria and totals up top so the client can see
what was screened for. Notes:

- Selections survive filter changes, so you can search 10–15K, pick a few,
  widen to 25K, and keep adding. **Clear** resets the filters and the
  selection together.
- Lease-out floors are shown in the list for context but can't be
  selected — they never belong in a client report.
- Total RSF counts each floor once even when it was picked both on its own
  and inside a block, so overlapping block picks don't inflate the number.

There is no PDF library involved — the report is real HTML with a print
stylesheet (`@media print` in `css/styles.css`), which keeps the text
selectable and searchable in the finished PDF and keeps page breaks from
splitting a building across two pages.

## Updating the data

When you change `js/data.js`, also bump the `?v=` version string on the
`css/styles.css`, `js/data.js`, `js/status.js`, and `js/app.js` tags in
`index.html`.
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


## Editing status from the site

`data.js` holds the inventory; `js/status.js` holds nothing but status
changes made from the site, keyed by `"<building id>|<unit>"`. The app
applies the overrides over `data.js` at load, so search, the contiguous-block
engine, map markers, the header stats and the PDF report all respect them
without anything else needing to know.

- **Lease Out** — the space stays on the site with a flag, and drops out of
  search results, contiguous blocks and client reports (same treatment the
  `status: "Lease Out"` field has always had).
- **Leased** — the space disappears from the site. Nothing is deleted: the
  row is still in `data.js` and reappears the moment you set it back, which
  you do by clicking **Edit** (leased space is shown struck through while
  editing) and choosing **Available**.

Because a leased space is hidden rather than removed, a mistake costs one
click to undo.

### Giving an editor publish access

The site is static, so saving a change means committing `js/status.js` back
to this repo. Each person who edits needs a GitHub token, entered once:

1. Go to [fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
2. Repository access → **Only select repositories** → this repo.
3. Repository permissions → **Contents: Read and write**. Nothing else.
4. Set an expiry, generate, then click **Edit** on the site and paste it in.

The token is kept in that browser's local storage and is sent only to
`api.github.com`. Anyone who can use that computer can read it out of
devtools, so don't do this on a shared machine, and revoke the token on
GitHub if it gets loose. Everyone else — clients included — can use the site
normally; without a token the Edit button only offers the setup dialog.

### What to expect when you save

Edits show on your screen immediately and are batched into one commit about
a second later, so a run of changes is a single entry in the history, pushed
straight to `main` under the token owner's name. GitHub Pages then rebuilds,
so teammates see the change about a minute later on their next load.

If a save fails — expired token, no signal — the chip in the toolbar says so
and the edit is held in the browser until you click it to retry; your work
is not lost. Two people editing at once merge rather than overwrite: each
save re-reads the file and lays only its own changes on top.

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
