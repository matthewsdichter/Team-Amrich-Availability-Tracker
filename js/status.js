/* ============================================================================
   Team Amrich — status overrides
   ============================================================================
   Written by the tracker's edit mode: change a space's status on the site and
   the page commits this file back to the repo through the GitHub API. Hand
   editing is fine too — keep the shape below.

   `data.js` stays the source of truth for inventory (floors, RSF, asking
   rents, notes). This file carries nothing but status, keyed by
   "<building id>|<unit>":

     "Lease Out"  shown on the site but flagged, and kept out of search
                  results, contiguous blocks and client reports
     "Leased"     hidden everywhere (visible only while editing, so it can be
                  put back)

   A space that comes back to market just loses its entry here and returns to
   whatever `data.js` says.
   ========================================================================= */

window.STATUS_OVERRIDES = {
  "updated": null,
  "spaces": {}
};
