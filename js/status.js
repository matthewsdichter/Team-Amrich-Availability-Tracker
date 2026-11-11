/* ============================================================================
   Team Amrich — status overrides
   ============================================================================
   Written by the tracker's edit mode. `data.js` stays the source of truth for
   inventory; this file carries only status, keyed by "<building id>|<unit>".
   "Lease Out" is shown but flagged; "Leased" is hidden everywhere. Remove an
   entry to put the space back to whatever data.js says.
   ========================================================================= */

window.STATUS_OVERRIDES = {
  "updated": "2026-10-05T12:00:00.000Z",
  "spaces": {
    "499-park|E6": "Leased",
    "11-bryant-park|E15": "Leased",
    "11-bryant-park|E7": "Leased",
    "41-45-w25|E3": "Lease Out",
    "450-park|E6": "Leased"
  }
};
