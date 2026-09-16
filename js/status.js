/* ============================================================================
   Team Amrich — status overrides
   ============================================================================
   Written by the tracker's edit mode. `data.js` stays the source of truth for
   inventory; this file carries only status, keyed by "<building id>|<unit>".
   "Lease Out" is shown but flagged; "Leased" is hidden everywhere. Remove an
   entry to put the space back to whatever data.js says.
   ========================================================================= */

window.STATUS_OVERRIDES = {
  "updated": "2026-09-11T17:45:55.953Z",
  "spaces": {
    "499-park|E6": "Lease Out",
    "11-bryant-park|E15": "Leased",
    "41-45-w25|E3": "Lease Out"
  }
};
