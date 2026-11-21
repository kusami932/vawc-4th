> **STATUS: INTERMEDIATE CHECKPOINT 4 — NOT "HE complete", NOT the final P4 deliverable.**
> The code for HE-02, HE-04, HE-05, HE-06, HE-07, HE-08 and HE-09 is written and passes 351 stubbed-DOM checks, but the planned real-browser test suite (`tests/browser-test.mjs`) was **not written or run**, and the docs below were only partly updated. See CHECKPOINT.md for the exact unfinished list.

## Checkpoint 4 (this package) — HE implementation pass, stopped early at the user's request
- `app.js` rewritten as readable multi-line code around one draft/applied model (`setDraft` / `applyDraft` / `resetDraft` / `startContext`). Only `applyDraft` copies draft to applied.
- HE-02: the full search form (keyword and location always visible; three labeled disclosure groups) is on the results screen; "Update results" validates and applies; errors keep input; empty results keep the form and list removable conditions with counts; Reset and removing an inherited occupation change the draft only.
- HE-04: applied criteria, draft, selections and scroll position survive details/apply/Back; unchanged reapply keeps selections; newly excluded selections are removed with a named note; contextual links keep unrelated conditions and say so; jobs, providers and programs searches are separate.
- HE-05: titles are link-styled buttons, "View job details" is a secondary button, checkboxes are independent, cards are not styled as clickable.
- HE-06: per-job application page separates method, destination and the employer's general website, labels every action "not available", never claims submission, shows no URL.
- HE-07: occupation area now sets the related-jobs search center and the training delivery city; occupation content is labeled general; provider vs training location shown separately; radius/exact-city help text added.
- HE-08: stylesheet rewritten in rem with separate tab / toggle / primary / secondary / text-action styles, neutral status colours, `html.large-text` (125%) with a state-reporting control that persists and restores default.
- HE-09: aligned comparison rows, "Not provided" labels, hourly-equivalent explanation, minimum-pay match note that distinguishes whole-range from upper-bound-only; Remove from comparison; narrow screens stack the comparison.
- Fixes found in real Chrome: hidden screen-reader text stretched the page to ~8,900px (fixed); blank cell in the facts grid (fixed); favicon 404 (fixed with an inline icon).
- Baseline peripheral labels "Search by education" / "Search by job number" kept (a mid-pass rename was reverted).
- Tests: `tests/he-test.js` added (171 checks). `tests/smoke-test.js` unchanged (180).

# Changelog (baseline 4c66e53c437a87f4bd3e850cc4f3005cd7bbfecb)
HE = ICA8 evaluator feedback (tracking labels, not P2/P3 Finding IDs). INSTRUCTOR = later feedback about omitted functionality and task difficulty. AUDIT = source-code or comparison-document finding.
## Pass 1 — partial revision (snapshot: vawc-p4-partial-revision.zip)
C-01 HE-01 occupation→programs search with removable occupation chip. C-02 HE-03 removed bold task-leading links, answer-like placeholders, the participant-facing evaluation link, and P3 wording in About. C-03 HE-04 (partial) unchanged re-search keeps selections; a changed search removes only non-matching ones with a notice. C-04 HE-05 (partial) job title opens details. C-05 HE-06 (partial) application page shows method, simulated destination, boundary. C-06 HE-08 (partial) text-size state + restore. C-08 AUDIT storage key separated.
## Pass 2 — intermediate-2
C-07 AUDIT + INSTRUCTOR: "Relevance" kept array order → documented Best match scoring, stable tie-breaks, pay sort with unknown last, sort explanation. C-09 evaluator materials restored separately. C-10 tests expanded. (Intermediate-2 snapshot remains available as vawc-p4-intermediate-2.zip.)
## Pass 3 — intermediate-3 (this package)
| ID | Source | Change |
|---|---|---|
| C-11 | INSTRUCTOR | Dataset expanded from 6/4/6/10 to 40 occupations (11 groups), 16 providers (7 in Richmond), 28 programs, 80 jobs, plus 7 new supported locations. Original records and IDs unchanged (T04 gains P28). |
| C-12 | INSTRUCTOR | Realistic alternatives: several admin-type occupations and jobs with differing pay forms, schedules (including unknown), types, arrangements, application methods, qualifications, and distances; relevant and irrelevant Richmond providers; program location can differ from provider location. Unknown pay/schedule are preserved as unknown. |
| C-13 | INSTRUCTOR | Fixtures are generated deterministically by `tools/build-data.py` (committed output `data.js`); `meta.referenceDate` documents the recency basis; About text states it. |
| C-14 | AUDIT | Fixed pass-1 regression: occupation-group filter placeholder read "Program title". |
| C-15 | AUDIT | Occupation list scrolls inside its panel (`max-height`), so 40 occupations do not stretch the page. |
| C-16 | AUDIT | Test suite rewritten: controlled fixture with hand-derived expectations, integrity/variety/scenario checks, UI route sweeps, six dataset-acceptance checks, one consistent total (180). |
| C-17 | AUDIT | Evaluator page version updated; DATA-NOTES, VALIDATION, FEEDBACK-IMPLEMENTATION, CHECKPOINT, ORIGINAL-SITE-MAPPING updated. |
No search, filter, sort, comparison, or navigation logic was changed in this pass; the larger data is exercised through the existing logic. No HE item was completed by this pass.
