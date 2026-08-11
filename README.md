# Team Amrich Availability Tracker

A lightweight web app for tracking Team Amrich's commercial space availabilities —
building, floor/suite, size, asking rent, possession, condition, status, and notes —
with search, filtering, sorting, summary stats, and CSV import/export.

No build step, no server, no dependencies: plain HTML, CSS, and JavaScript.
Data is stored in your browser via `localStorage`.

## Features

- **Add / edit / delete listings** — building, floor/suite, RSF, asking rent
  ($/SF/yr), lease type (direct or sublease), possession, condition, status,
  listing broker, and free-form notes.
- **Status tracking** — Available, Negotiating, Lease Out, Leased, Off Market,
  shown as a colored dot with a text label.
- **Summary tiles** — active availability count, total available RSF, average
  asking rent across active listings, and deals leased this year.
- **Search & filters** — free-text search across building, suite, broker, and
  notes, plus status and lease-type filters. Click any column header to sort.
- **CSV export / import** — export the full list for sharing or Excel, and
  import it back (or bulk-load listings from a spreadsheet saved as CSV with
  matching column headers).
- **Light & dark mode** — follows your system preference automatically.

## Running it

Open `index.html` in a browser — that's it.

To serve it locally instead:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Hosting on GitHub Pages

1. In this repository's settings, go to **Pages**.
2. Under **Build and deployment**, set the source to **Deploy from a branch**
   and pick the branch containing this code (root folder).
3. The tracker will be live at
   `https://<username>.github.io/Team-Amrich-Availability-Tracker/`.

## Notes on data

Listings are saved in the browser's `localStorage`, so they persist across
visits on the same browser/device but are **not synced** between devices or
teammates. To share the current list, use **Export CSV**; a teammate can use
**Import CSV** to load it.

## CSV format

Exports (and imports) use these columns:

```
Building, Floor/Suite, RSF, Asking Rent ($/SF/yr), Lease Type, Possession,
Condition, Status, Broker, Notes, Updated
```

Only `Building` is required on import; unrecognized statuses default to
`Available`, and lease types other than `Sublease` default to `Direct`.
