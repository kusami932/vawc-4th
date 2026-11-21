> **STATUS: INTERMEDIATE CHECKPOINT 4 — NOT "HE complete", NOT the final P4 deliverable.**
> The code for HE-02, HE-04, HE-05, HE-06, HE-07, HE-08 and HE-09 is written and passes 351 stubbed-DOM checks, but the planned real-browser test suite (`tests/browser-test.mjs`) was **not written or run**, and the docs below were only partly updated. See CHECKPOINT.md for the exact unfinished list.

## Checkpoint 4 results (executed in this session)
| Layer | Command | Result |
|---|---|---|
| Automated, stubbed DOM (not a browser) | `node tests/smoke-test.js` | **180 / 180** (174 functional + 6 dataset acceptance) |
| Automated, stubbed DOM (not a browser) | `node tests/he-test.js` | **171 / 171** — HE-02 43, HE-04 27, HE-05 13, HE-06 9, HE-07 21, HE-08 15, HE-09 23, STATIC 10, REGRESSION 10 |
| Combined | both files | **351 / 351** |
| Mutation checks (ad hoc, script not packaged) | 30 deliberate code/CSS mutations | all 30 caught; 1 initially survived (weak masthead check), the test was tightened and then caught it; 2 were caught by a crash rather than an assertion |
| Browser, ad hoc (Chrome 153 via Playwright; **not saved as a test file**) | route sweep of 10 routes; screenshots at 1280 px (results, comparison, occupations, apply) and 390 px (results, comparison with larger text), visually inspected; page height and horizontal overflow measured | no console errors on the sweep; no horizontal overflow on the 6 captures; the page-height bug above was found and fixed |

STATIC checks read the stylesheet/source text (font sizes, focus rule, cursor, computed WCAG contrast for 25 colour pairs); they are not behavior tests.

### NOT executed (pending manual or browser checks)
Keyboard Enter-to-submit in a real browser; Tab order and visible focus; real checkbox-vs-title clicks; Back/Forward across results/details/apply; scroll restoration; the A–D task flows end to end; larger text at desktop and tablet widths (only one 390 px capture was viewed); 320 px and 768 px layouts; screen-reader announcements; GitHub Pages deployment.

# Validation record — intermediate checkpoint 3
Nothing here was run in a real browser. A stubbed DOM in Node is not a browser.

## 1. Executed automated checks (Node 22, no browser)
Commands: `node --check app.js`, `node --check data.js`, `node --check tests/smoke-test.js`, `node tests/smoke-test.js`, and `python3 tools/build-data.py` followed by a byte comparison of `data.js`.
Final run of `node tests/smoke-test.js`:
```
FUNCTIONAL: 174 passed, 0 failed (of 174)
DATASET-ACCEPTANCE: 6 passed, 0 failed (of 6)
TOTAL: 180 passed, 0 failed (of 180)
```
One consistent set of totals applies to this package: 180 checks = 174 functional + 6 dataset-acceptance. (Earlier packages reported "29" and "43": both were counts from the same earlier run, 29 excluding 14 route-render checks and 43 including them. They are superseded and not comparable to 180.)
Functional checks cover, with expectations written by hand (not produced by calling the function under test):
- A controlled six-job fixture (`tests/fixture-data.js`, distances from simple latitude arithmetic): radius 0/5/10/25/50/75 mi, blank and unsupported locations, minimum pay on range upper end (hourly and annual), unknown-pay inclusion, strict daytime/evening and unknown schedules, employment type, posted-within 1/7/30 days, occupation/education/source/arrangement filters, keyword matching, combined filters, and recent / pay / Best match ordering including ties and input-order independence.
- Real dataset integrity: unique IDs; provider↔program↔occupation references; jobs' occupation references; every location supported; required display fields; recognized enumerations; numeric pay, cost, coordinate, and date values; no duplicate jobs or descriptions; original records unchanged and new IDs contiguous; genuine unknown pay (J02, J16, J34, J54) and unknown schedule (J02, J17, J20, J22, J34, J67) preserved.
- Variety and richness (types, schedules, pay forms, radius inside/outside, mismatch kinds, several plausible admin candidates across employers/occupations/cities, Richmond providers with and without admin-related programs).
- Scenarios on the real data: nearby-city sets at 25 and 75 miles, receptionist search, an "administrative assistant" search narrowed step by step with expected sets, Best match order, property checks that Best match follows the documented rule with no identity boost, pay/recent sort properties, provider and program filters, occupation→program sets for eight occupations, empty results for occupations with no programs, no-result searches and recovery.
- Stubbed-DOM UI: 24 route renders (including missing records), every occupation/provider/program/job/apply route renders, apply pages show each job's own application method and "no application" text, unknown pay/schedule shows "Not provided", occupation→training chip and counts, draft-only removal of the chip, fresh-session neutrality, no task-specific placeholders, evaluator reset touches only the revised key, evaluator page not referenced by participant files, storage key separation, no clock/randomness, no hard-coded record IDs or benchmark wording in app.js.
- Dataset acceptance (the six targets, counting unique usable records): occupations 40 (≥40), groups 11 (≥10), providers 16 (≥16), Richmond providers 7 (≥6), programs 28 (≥24), jobs 80 (≥80).
Mutation checks (executed ad hoc in a scratch copy; not scripted in the repository): each fault below was injected and the suite failed as shown — M1 move J11 out of Richmond: 4; M2 boost O01 in Best match: 4; M3 drop O04 from P13: 2; M4 move T10 out of Richmond: 3; M5 unknown pay sorted first: 3; M6 radius ignores distance: 12; M7 duplicate job ID: 13; M8 fill unknown pay on J16: 1; M9 fill unknown schedule on J02: 2; M10 alter baseline J05: 2; M11 schedule filter admits unknown: 4; M12 occupation chip not carried to training: 5.
Substantive corrections made during this pass:
1. A hand-derived expectation (HR assistant jobs J21/J22 in an "administrative assistant" search) disagreed with the first generated data. The data was wrong (the "administrative" keyword was omitted for O01/O02/O03/O06 jobs); the generator was fixed, the expectation was kept.
2. The earlier expectation that occupation O04 links to 2 programs was updated to 4 (P02, P04, P13, P19) because P13 and P19 were deliberately authored as bookkeeping/payroll-relevant; the new list was hand-checked against the authored relationships, not copied from output.
3. Self-review found two weak tests (an `&& true` and a `>= 0` comparison) and an incorrect claim in a test name ("all programs listed" on a fresh page, which actually shows none until a search); all were replaced with specific assertions.
4. The first mutation run showed three "0 failures" that were caused by `sed` patterns not matching, and one real gap (no assertion that unknown pay stays unknown); the patterns were fixed and the missing tests added.
5. Code review found a pass-1 regression: the occupation-group filter placeholder read "Program title"; it now reads "Group name" (and "Occupation title or keyword" for name search), with a test.

## 2. Static / code review only (not executed)
Form submission and selection retention on unchanged versus changed job searches (the stub cannot submit forms); job-title button and Compare-checkbox independence; text-size control; the About text; CSS for the scrollable occupation list; the pending-change/applied-summary markup (unchanged from the baseline).

## 3. Actual browser checks
None performed.

## 4. Pending manual checks (real browser; expected outcomes)
1. Open `index.html` via a local server. Home loads with empty forms and no evaluation link in the menu or footer.
2. Occupations: the group view lists 11 groups; the list scrolls inside its panel; directory view lists 40 occupations alphabetically; selecting any occupation shows duties and skills; no horizontal page scroll at ~375 px width.
3. Select "Warehouse Associate" → Explore training: a removable occupation chip and one program (Warehouse Safety and Forklift). Remove the chip: the page says changes are not applied; Search programs then lists all 28 programs.
4. Select "Insurance Claims Processor" → Explore training: an explained empty result and a link to search organizations.
5. Providers: search with location "Richmond": 7 providers. Open one, then a program, and use the provider↔program links both ways.
6. Jobs: enter location "Richmond, VA", leave all else blank, Search: 68 jobs; the sort note reads correctly; changing sort reorders (Highest listed pay puts "Not provided" last).
7. Enter keyword "administrative assistant" with location Richmond: 9 jobs. Adding Full-time, minimum $19/h with unknown pay unchecked, and Daytime reduces to 6; confirm results do not change until Search is pressed.
8. Tick two jobs, open Compare: aligned fields, "Not provided" shown for missing pay or schedule. Re-run an unchanged search: selections stay. Run a search that excludes one: a notice appears.
9. Click a job title: details open; the Compare checkbox works independently; keyboard focus ring visible.
10. For one account-based and one external job (for example J12 and J11), open How to apply: each states its own method, labels the destination simulated, and says nothing was submitted.
11. Posted filter "Last 24 hours" returns only jobs posted 1 day ago (J03, J18, J43, J51, J57, J67).
12. Browser Back/Forward across results and details; refresh on a `#route`; direct-open `#job/J80`; GitHub Pages deployment of a copy in a new repository.
13. `evaluator/index.html`: Reset clears only the revised key; the baseline key is untouched when both sites share an origin.
No usability improvement is claimed or measured.
