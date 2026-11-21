# CHECKPOINT — intermediate 4 (stopped at the user's request; not HE complete)

## What exists
Working code for HE-02, 04, 05, 06, 07, 08, 09 (see CHANGELOG). 351 stubbed-DOM checks pass (180 + 171).

## Unfinished (exact list)
1. `tests/browser-test.mjs` (Playwright + Chrome) was never written. Needed: A–D task flows; Enter-key submit on every search form; Back/Forward; keyboard-only operation and visible focus; checkbox vs title click independence; larger text at 1280, 768, 390 and 320 px with no overlap or hidden controls; horizontal-overflow check; console errors; favicon.
2. Docs only partly updated: README, ORIGINAL-SITE-MAPPING.md, DATA-NOTES.md (geography semantics) and the evaluator page text/manual-check list still describe checkpoint 3 apart from the status banners added here.
3. Original-site items still outstanding (unchanged, all show a "not implemented" notice): the 20 home entries, 7 training-page entries, Employer search, Skills & résumé matching, Search by education, Search by job number, Other job sites, Jobs outside Virginia, the four occupation search methods, Ownership and WIOA eligibility filters, Dashboard, Contact, Sign In. Full original-site parity is not claimed.
4. Known limit: radius and training location are approximations (straight-line between city centers; exact-city match for training).

## Next concrete step
Write `tests/browser-test.mjs`, run it against `python3 -m http.server`, fix what it finds, finish the docs, then rename the package `vawc-p4-he-complete.zip` only if all seven items pass in the browser.
