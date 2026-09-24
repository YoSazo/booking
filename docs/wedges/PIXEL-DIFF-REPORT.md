# Existing wedge screenshot comparison

Compared `origin/main` at `7b3b22c4` with `wedge-framework` on September 24, 2026. Both were served by the same browser harness in Chromium 1.27.1 at 390 × 844 CSS pixels, device scale 1, with the same account, saved property, report, date and viewport. DM Sans was loaded and the header was allowed to settle before each screenshot. Each pixel was marked changed when any RGB channel differed by more than 8. The screenshots and red difference images are in `artifacts/wedges/pixel-diff/` (local artifacts, excluded from Git).

| Product | Landing | Reports | Editor | Preview |
|---|---:|---:|---:|---:|
| Claims | 0 / 329,160 | 0 / 329,160 | 0 / 329,160 | 0 / 329,160 |
| Inspect | 0 / 329,160 | 0 / 329,160 | 0 / 329,160 | 0 / 329,160 |
| Incident | 0 / 329,160 | 0 / 329,160 | 0 / 329,160 | 0 / 329,160 |

An initial run found Incident's editor had lost “Detail heading” and “Talk through this detail.” These labels now live in its manifest, and the final comparison above has zero changed pixels in all twelve states.

Run `node scripts/compare-wedges.js /path/to/clean-main-worktree` from `guest-lodge-backend` to reproduce the report. This is a fixed-viewport browser comparison of four states; it does not replace a device review of scroll positions, native sheets or camera transitions.

## Rerun after the business-name fix (September 24, 2026)

A bare `header` CSS rule also matched the business name inside the report
preview: on the web it was pinned over the site bar (covering the Marketel
wordmark and Account), and in the app it was hidden. Site chrome is now
`body > header`. The rerun against `main` at `7b3b22c4`:

| Product | Landing | Reports | Editor | Preview |
|---|---:|---:|---:|---:|
| Claims | 93 px (0.03%) | 0 | 0 | 40,617 px (12.3%) |
| Inspect | 0 | 0 | 4 px | 50,082 px (15.2%) |
| Incident | 0 | 0 | 0 | 46,858 px (14.2%) |

The preview changes are the fix: the bar is intact and the business name sits
at the top of the report card, which moves the card's content down. The 93
pixels on the Claims landing are the typing demo's caret caught one letter
apart, and the 4 on Inspect's editor are the same kind of timing noise.
