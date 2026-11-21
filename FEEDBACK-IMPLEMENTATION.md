> **STATUS: INTERMEDIATE CHECKPOINT 4 — NOT "HE complete", NOT the final P4 deliverable.**
> The code for HE-02, HE-04, HE-05, HE-06, HE-07, HE-08 and HE-09 is written and passes 351 stubbed-DOM checks, but the planned real-browser test suite (`tests/browser-test.mjs`) was **not written or run**, and the docs below were only partly updated. See CHECKPOINT.md for the exact unfinished list.

## Checkpoint 4 status by HE item (four-part split)
| Item | 1. Implemented behavior | 2. Automated checks (stubbed DOM) | 3. Browser checks | 4. Remaining |
|---|---|---|---|---|
| HE-02 | Yes (see CHANGELOG) | 43 | none saved; form renders in Chrome | Enter-key submit, focus after update, mobile form layout |
| HE-04 | Yes | 27 | none | Back/Forward, scroll restoration |
| HE-05 | Yes | 13 | none (visual review of cards only) | real checkbox clicks, hover/focus appearance |
| HE-06 | Yes | 9 (covers all 80 jobs) | apply page viewed once | notice dialog return-focus |
| HE-07 | Yes | 21 | occupations page viewed once | none known beyond the manual list |
| HE-08 | Yes | 15 + 10 static | one 390 px larger-text capture | larger text at other widths |
| HE-09 | Yes | 23 | comparison viewed at 1280 px and 390 px | none known beyond the manual list |
None of these is marked "complete": complete requires the browser layer.

# Requirement status (intermediate checkpoint 3)
IC = implemented and checked by the executed stubbed-DOM suite; IB = implemented, real-browser check pending; PART = partly done; NO = not implemented. No HE item below is complete.
| Item | Source | Status | Detail |
|---|---|---|---|
| Dataset expansion (six targets) | INSTRUCTOR | IC for counts, integrity, relationships, variety; IB for how it feels in the interface | 40/11/16/7/28/80 met. Job duties for new jobs are inherited from the occupation (limitation). |
| Meaningful sorting | INSTRUCTOR/AUDIT | IC + IB | Best match / recent / pay verified on fixture and real data. |
| Reference-date handling | INSTRUCTOR | IC (no clock use) + IB | Displayed ages are fixed relative to 2026-11-20. |
| HE-01 occupation→training | HE | IC (programs side; 8 occupations' links checked) + IB | No organization-side occupation condition yet. |
| HE-02 edit search on results screen | HE | NO | Next planned phase. |
| HE-03 remove task guidance | HE | IC (placeholders, fresh state) + IB | Peripheral-entry styling not audited. |
| HE-04 navigation/comparison context | HE | PART | Selection retention (static review only). Back-to-results naming, list position, Back/Forward, replace-selected UX: not done/unverified. |
| HE-05 job-card behavior | HE | PART | Title opens details (static review). Whole-card affordance undecided. |
| HE-06 application clarity | HE | IC for method text on all 80 jobs + PART | Per-job instructions beyond method (account vs external) are not individually authored. |
| HE-07 geographic scope | HE | NO | Distance approximation documented in DATA-NOTES. |
| HE-08 consistency/hierarchy | HE | PART | Text-size control; occupation list scroll. |
| HE-09 evidence-aware comparison | HE | PART | Baseline "Not provided" and upper-end/2,080-hour rules exercised on more data; unified field renderer and application-method row not done. |
| Original-site mapping & restoration | INSTRUCTOR/AUDIT | PART | Mapping documented; no options restored beyond the baseline. |
| Evaluator materials separated | HE-03/AUDIT | IC (reset) + IB | |
