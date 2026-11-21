# Data notes (intermediate checkpoint 3)

## Disclosure
Every organization, program, and vacancy is a **fictional demonstration record**. Employer names start with "Example"; providers and programs are described as samples. Nothing here is a verified or current real-world offering, and no contact details are included. The application's About dialog and footer say so.

## Actual counts (checked by `tests/smoke-test.js`)
| Item | Baseline (intermediate-2) | Now | Target |
|---|---:|---:|---:|
| Occupations | 6 | 40 | ≥ 40 |
| Occupation groups | 3 | 11 (smallest has 3 occupations; Office and Administrative Support has 9) | ≥ 10 |
| Training providers | 4 | 16 | ≥ 16 |
| Providers in Richmond | 1 | 7 | ≥ 6 |
| Programs | 6 | 28 | ≥ 24 |
| Jobs | 10 | 80 | ≥ 80 |
| Supported locations | 6 | 13 | — |
The targets are agreed engineering targets for this prototype, not course requirements or claims about the original site's database.

## Schema (unchanged; new records use the same fields as the originals)
- occupation: id, title, group, summary, duties[3], skills[3], qualifications, keywords[]
- provider: id, name, city, type, description, programIds[] (derived from programs.providerId by the generator)
- program: id, title, providerId, **city (delivery location, may differ from the provider's city)**, occupationIds[], qualification, cost, schedule (Daytime/Evening/Weekend), format (In person/Hybrid/Online), description, skills[], availability, keywords[]
- job: id, title, employer, city, occupationId, type, payMin/payMax/payUnit (null = unknown), schedule (null = unknown), qualifications, description, duties[], postedDays, workArrangement, education, source, applyMethod (account/external), keywords[]
- location: id, label, aliases[] (name and a few ZIP codes), lat, lon
- meta: referenceDate, note

## Fixture generation
`tools/build-data.py` merges `tools/base-intermediate-2.json` (the original records, untouched) with the new records, which are authored as compact tables inside the script, and writes `data.js`. It uses no randomness and no clock; running it again produces a byte-identical `data.js` (checked). The site itself needs no build step; `data.js` is committed output. IDs of original records are preserved; new IDs are contiguous (O07–O40, T05–T16, P07–P28, J11–J80). Original records are unchanged except that provider T04 gains program P28 (checked by tests).
Authoring decisions: (1) Job keywords are derived from the job title, the occupation title, a short per-group list, and a few per-occupation terms (for example, administrative support occupations O01, O02, O03, O06, O07, O08, O09 carry "administrative"; O10 and O11 do not). (2) **New jobs inherit their occupation's first three typical duties**; job-specific content lives in the description, qualifications, pay, location, and schedule. This is a known limitation. (3) Where pay or schedule is unknown, or pay is a range, the description says so; the value fields stay null or a range.

## Relationships
- Each program lists 1–4 occupationIds chosen for topical fit (for example, Warehouse Safety and Forklift → Warehouse Associate and Shipping and Receiving Clerk only). No program is linked to every administrative occupation.
- Occupations with no linked program (searching training from them gives an explained empty result): O14, O16, O29, O38, O39, O40. Occupation O37 (Assembler) has a program but no job. These gaps are deliberate.
- Richmond providers: T01, T05, T06, T07, T08, T09, T10. Five have programs linked to at least one administrative-type occupation (T01, T05, T06, T07, T09) with different degrees of fit; T08 (skilled trades) and T10 (logistics) do not. P08 (Henrico) and P28 (online) show a program location that differs from the provider's city.

## Jobs: what the 80 records contain
Full-time 68 / part-time 12. Daytime 59 / evening 15 / unknown 6. Pay: 76 jobs list pay (58 hourly, 18 annual; 72 are ranges and 4 are single values), 4 list none, and 17 have an upper end below $19/h. On-site 67 / hybrid 12 / remote 1. Account-based application 36 / external 44. Employer 58 / job-board 22. Posting ages 1–34 days (one older than 30). 68 jobs fall in the seven cities within about 25 straight-line miles of Richmond; 12 fall outside.
Unknown pay: J02, J16, J34, J54. Unknown schedule: J02, J17, J20, J22, J34, J67 (J02 is the original record missing both; none were filled in).
For the test suite's independent acceptance predicate (administrative-type occupation, full-time, daytime, upper pay end ≥ $19/h, near Richmond), 14 jobs qualify across 14 employers, 7 occupations, and 4 cities, and several qualify only through the **upper end** of a range (for example, J15 at $17–19/h, J26 at $18–20/h). That predicate exists only in the tests; the interface does not apply it, and no record or ranking rule is tailored to it.

## Search, filtering, and sorting rules (unchanged logic, now exercised on the larger data)
- Keyword: every word must appear in title, employer, or keywords. Filters are strict except as noted. Unknown pay is governed by the "include jobs with no pay listed" box; a minimum pay passes on the **upper end** of a range (not a guarantee of that pay); annual pay is divided by 2,080 hours. The schedule filter excludes unknown schedules.
- Best match: +3 if the whole query is in the title; per query word +4 title, +2 occupation title, +2 exact keyword, +1 employer. Ties: most recent, title A–Z, ID. A blank query scores 0 for everyone, so it falls back to most recent. Nothing is boosted by identity.
- Most recent: postedDays ascending (same tie-breaks). Highest listed pay: upper end as hourly equivalent, descending, unknown last.

## Geographic assumptions and approximations
City distances are straight-line (haversine, radius 3,958.8 mi) between **approximate city-center coordinates**, not addresses or travel distance, and a straight-line radius is not a drive time. Hand-estimated distances from Richmond used to write test expectations: Mechanicsville 6, Henrico 7, Chesterfield 12, Hopewell 18, Colonial Heights 21, Petersburg 22 (all within 25); Williamsburg 46, Fredericksburg 53, Newport News 61, Charlottesville 66, Norfolk 79, Roanoke 141. Only the 13 listed locations (and the ZIP codes listed as aliases) are supported; other input shows the existing validation message. ZIP aliases are limited and were not checked against an authoritative source. HE-07 (explaining what each location control affects) is not part of this pass.

## Reference-date handling
`meta.referenceDate` is 2026-11-20. `postedDays` values are fixed numbers measured from that date and displayed as days ago; the application never reads the clock, so "Last 24 hours / 7 days / 30 days" filters keep working as the calendar advances. The trade-off: the displayed ages do not change over time. The About dialog states the reference date.
