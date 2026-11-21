/* Run: node tests/he-test.js
   Behavior checks for HE-02, HE-04, HE-05, HE-06, HE-07, HE-08, HE-09 and original-site regressions.
   Runs app.js against a STUBBED DOM in Node. This is NOT a browser: keyboard focus, real clicks, CSS layout,
   Back/Forward and text enlargement are checked separately in tests/browser-test.mjs.
   Categories: HE-xx = behavior checks; STATIC = reads source/CSS text (not behavior); REGRESSION = earlier behavior.
   Expected values are hand-derived from the controlled fixture (tests/fixture-data.js) or the authored data. */
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const FIX = path.join(__dirname, 'fixture-data.js');
const KEY = 'vawc-p4-revised-v1';

function mk(dataFile, store = {}) {
  const L = {}, cls = {}; let html = '', hash = '', announced = [];
  const el = () => ({set innerHTML(v) {html = v;}, get innerHTML() {return html;}, textContent: '', focus() {}, scrollIntoView() {}, setAttribute() {}, removeAttribute() {}, scrollTop: 0, classList: {toggle() {}, contains() {return false;}}, open: false, showModal() {}});
  const doc = {querySelector: () => el(), addEventListener: (t, f) => {L[t] = f;}, body: {classList: {toggle() {}, contains: () => false}}, documentElement: {classList: {toggle: (c, f) => {cls[c] = !!f;}, contains: c => !!cls[c]}}};
  const loc = {get hash() {return hash;}, set hash(v) {hash = v.startsWith('#') ? v : '#' + v; L.hashchange && L.hashchange();}};
  const win = {VAWC_DATA: null, addEventListener: (t, f) => {L[t] = f;}, scrollTo() {}};
  const ctx = {window: win, document: doc, location: loc, localStorage: {getItem: k => store[k] || null, setItem: (k, v) => {store[k] = v;}}, setTimeout: f => f(), console};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(dataFile || path.join(ROOT, 'data.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), ctx);
  const T = ctx.window.VAWC_TEST;
  return {
    store, cls, T, get html() {return html;}, loc, win: ctx.window,
    S: () => T.state,
    go(h) {loc.hash = h; return html;},
    render() {T.render(); return html;},
    click(ds) {L.click({target: {closest: () => ({dataset: ds, tagName: 'BUTTON', id: '', closest: () => null})}});},
    clickNothing() {L.click({target: {closest: () => null}});},
    change(target) {L.change({target});},
    input(target) {L.input({target});},
    submit(form) {L.submit({target: {closest: () => null, dataset: {}, ...form}, preventDefault() {}});}
  };
}
const R = [];
const ok = (cat, name, cond) => R.push({cat, name, pass: !!cond});
const eq = (cat, name, got, want) => {const p = JSON.stringify(got) === JSON.stringify(want); R.push({cat, name: p ? name : `${name} — got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`, pass: p});};
const sid = a => a.map(x => x.id).sort();
const snap = x => JSON.stringify(x);
const has = (h, t) => h.includes(t) || h.includes(t.replace(/&/g, '&amp;')) || h.includes(t.replace(/'/g, '&#39;'));
const rows = h => [...h.matchAll(/<th scope="row" role="rowheader">([^<]*)<\/th>/g)].map(m => m[1]);
const rowHtml = (h, label) => {const m = h.match(new RegExp('<th scope="row" role="rowheader">' + label + '</th>(.*?)</tr>')); return m ? m[1] : '';};
const fresh = () => {const a = mk(FIX); return a;};
const sd = (a, kind, patch) => {a.T.setDraft(kind, patch); return a.T.applyDraft(kind);};   // set + apply

// ================= HE-02: draft vs applied, update, validation, recovery =================
{
  const a = fresh(), T = a.T;
  eq('HE-02', 'fresh: nothing applied; results screen asks for a search', [a.S().jobApplied, has(a.go('results'), 'Start a job search')], [null, true]);
  const r = sd(a, 'jobs', {q: 'alpha'});
  eq('HE-02', 'Update applies the draft: applied keyword is alpha and results are F1,F2,F3,F6', [r.ok, r.changed, a.S().jobApplied.q, sid(T.filterJobs(a.S().jobApplied))], [true, true, 'alpha', ['F1', 'F2', 'F3', 'F6']]);
  let h = a.go('results');
  ok('HE-02', 'after applying: "Search up to date", 4 matching jobs, no pending pill', has(h, 'Search up to date') && has(h, '4 matching jobs') && !has(h, 'Changes not applied'));
  const before = snap(a.S().jobApplied);
  T.setDraft('jobs', {q: 'beta'});
  h = a.go('results');
  eq('HE-02', 'editing the draft leaves the applied search untouched', [snap(a.S().jobApplied), T.isPending('jobs')], [before, true]);
  ok('HE-02', 'pending: "Changes not applied" message appears; results count still reflects the applied search (4)', has(h, 'Changes not applied') && has(h, 'Choose Update results to apply them') && has(h, '4 matching jobs'));
  ok('HE-02', 'pending: the form shows the draft value (beta) while the "Applied" summary still shows alpha', has(h, 'name="q" value="beta"') && /Applied:<\/strong> alpha/.test(h));
  T.resetDraft('jobs');
  h = a.go('results');
  eq('HE-02', 'Reset criteria clears the draft only: draft equals defaults, applied unchanged, still 4 results', [snap(a.S().jobs), snap(a.S().jobApplied), has(h, '4 matching jobs'), has(h, 'Changes not applied')], [snap(T.defaults.jobs), before, true, true]);
  // removing an inherited occupation condition is a draft edit
  const b = fresh(); sd(b, 'jobs', {occupation: 'X2'});
  eq('HE-02', 'precondition: occupation X2 applied gives F4,F5', sid(b.T.filterJobs(b.S().jobApplied)), ['F4', 'F5']);
  b.go('results'); b.click({action: 'remove-job-occupation'});
  h = b.render();
  eq('HE-02', 'removing the occupation condition changes the draft only; results still 2 with a pending message', [b.S().jobs.occupation, b.S().jobApplied.occupation, has(h, '2 matching jobs'), has(h, 'Changes not applied')], ['', 'X2', true, true]);
  b.T.applyDraft('jobs');
  eq('HE-02', 'Update after removal applies it: all six jobs', sid(b.T.filterJobs(b.S().jobApplied)), ['F1', 'F2', 'F3', 'F4', 'F5', 'F6']);
}
{ // validation
  const a = fresh(), T = a.T; sd(a, 'jobs', {q: 'alpha'});
  const keep = snap(a.S().jobApplied);
  T.setDraft('jobs', {city: 'Atlantis'});
  const r = T.applyDraft('jobs');
  eq('HE-02', 'unsupported location is rejected; applied search unchanged; field named', [r.ok, r.error.field, snap(a.S().jobApplied)], [false, 'city', keep]);
  ok('HE-02', 'error text names the value, explains the correction, and says results did not change', has(r.error.text, 'Atlantis') && has(r.error.text, 'not a supported location') && has(r.error.text, 'Choose a city') && has(r.error.text, 'previous results have not changed'));
  const h = a.go('results');
  ok('HE-02', 'form re-renders with the typed value preserved, aria-invalid, and the message in an alert region', has(h, 'value="Atlantis"') && has(h, 'aria-invalid="true"') && /role="alert">[^<]*not a supported location/.test(h));
  eq('HE-02', 'draft value is preserved in state after the failed update', a.S().jobs.city, 'Atlantis');
  T.clearError();
  for (const bad of ['-5', 'abc', '12abc', '1e999']) {T.setDraft('jobs', {city: '', pay: bad}); const e = T.applyDraft('jobs'); eq('HE-02', `minimum pay "${bad}" is rejected as invalid on field pay`, [e.ok, e.error && e.error.field], [false, 'pay']);}
  for (const good of ['', '0', '19', '19.5']) {T.setDraft('jobs', {city: '', pay: good}); eq('HE-02', `minimum pay "${good}" is accepted`, T.applyDraft('jobs').ok, true);}
  T.clearError();
  T.setDraft('programs', {cost: '-1'}); const pe = T.applyDraft('programs');
  eq('HE-02', 'programs: negative maximum cost rejected; nothing applied', [pe.ok, pe.error.field, a.S().programApplied], [false, 'cost', null]);
  T.setDraft('providers', {city: 'Atlantis'}); const ve = T.applyDraft('providers');
  eq('HE-02', 'providers: unsupported location rejected; nothing applied', [ve.ok, ve.error.field, a.S().providerApplied], [false, 'city', null]);
  T.clearError();
}
{ // empty results and recovery
  const a = fresh(), T = a.T;
  sd(a, 'jobs', {type: 'Part-time', schedule: 'Daytime'});
  eq('HE-02', 'precondition: Part-time + Daytime has no match', T.filterJobs(a.S().jobApplied).length, 0);
  eq('HE-02', 'recovery hints: removing Part-time gives 3 (F1,F2,F5), removing Daytime gives 1 (F3); sorted by count; labels stated', T.relaxHints('jobs', a.S().jobApplied).map(x => [x.label, x.count]), [['Part-time', 3], ['Schedule: Daytime only', 1]]);
  const h = a.go('results');
  ok('HE-02', 'empty results: explanation, hints, and the full search form are all still shown', has(h, 'No jobs match these criteria') && has(h, 'Conditions you could remove') && has(h, 'Remove from form') && has(h, 'id="jobs-form"') && has(h, 'id="update-results"') && has(h, '0 matching jobs') && !has(h, 'class="job-card'));
  a.click({action: 'drop-criterion', kind: 'jobs', patch: JSON.stringify({type: ''})});
  eq('HE-02', 'a recovery hint edits the draft only; results unchanged until Update', [a.S().jobs.type, a.S().jobApplied.type, has(a.render(), 'Changes not applied')], ['', 'Part-time', true]);
  T.applyDraft('jobs');
  eq('HE-02', 'applying after the hint recovers 3 results', T.filterJobs(a.S().jobApplied).length, 3);
  const c = fresh(); sd(c, 'programs', {format: 'Online'});
  ok('HE-02', 'programs: empty result keeps the form and offers recovery (removing Online gives 1 program)', has(c.go('programs'), 'No programs match these criteria') && has(c.html, 'id="programs-form"') && has(c.html, '1</strong> matching program<'));
}
{ // canonical comparison of draft and applied
  const a = fresh(), T = a.T;
  const r = sd(a, 'jobs', {city: 'basetown'});
  eq('HE-02', 'alias "basetown" is applied as canonical "Basetown, VA"', a.S().jobApplied.city, 'Basetown, VA');
  T.setDraft('jobs', {city: 'Basetown'});
  eq('HE-02', 'typing another alias of the same place is not a pending change', T.isPending('jobs'), false);
  const b = fresh(); sd(b, 'jobs', {q: 'alpha'}); b.T.setDraft('jobs', {radius: '75'});
  eq('HE-02', 'radius without a location has no effect, so it is not a pending change', [b.T.isPending('jobs'), b.T.applyDraft('jobs').changed], [false, false]);
  const u = fresh(); sd(u, 'jobs', {q: 'alpha'});
  eq('HE-02', 'reapplying unchanged criteria reports changed:false', u.T.applyDraft('jobs').changed, false);
}
{ // form structure: keyboard submission uses the visible Update action
  const a = fresh(); sd(a, 'jobs', {q: 'alpha'});
  const h = a.go('results');
  const f = h.slice(h.indexOf('<form id="jobs-form"'), h.indexOf('</form>', h.indexOf('<form id="jobs-form"')));
  const buttons = [...f.matchAll(/<button\b([^>]*)>/g)].map(m => m[1]);
  const submitters = buttons.filter(x => !/type="button"/.test(x));
  eq('HE-02', 'results form: exactly one submit button (id update-results); every other button is type=button, so Enter can only trigger Update', [buttons.length >= 3, submitters.length, /id="update-results"/.test(submitters[0] || '')], [true, 1, true]);
  ok('HE-02', 'keyword and location are in the always-visible main row, not inside a closed details element', f.indexOf('name="q"') < f.indexOf('<details') && f.indexOf('name="city"') < f.indexOf('<details'));
  ok('HE-02', 'secondary options sit in three labeled disclosure groups (employment/pay/schedule; date/occupation; education/source/arrangement)', ['Employment type, pay & schedule', 'Date posted & occupation', 'Education, source & work arrangement'].every(t => f.includes('<summary>' + t)));
  ok('HE-02', 'results form on the results screen has no secondary action styled as a second primary', !/class="button" data-action/.test(f));
  const g = mk(); g.go('providers'); sd(g, 'providers', {}); const ph = g.go('providers');
  const pf = ph.slice(ph.indexOf('<form id="providers-form"'), ph.indexOf('</form>', ph.indexOf('<form id="providers-form"')));
  eq('HE-02', 'providers form: one submit button, others type=button', [...pf.matchAll(/<button\b([^>]*)>/g)].filter(m => !/type="button"/.test(m[1])).length, 1);
  // homepage entry point preserved
  const hm = mk().go('home');
  ok('HE-02', 'homepage search entry point preserved: form, both fields, Search jobs, Detailed job search link', has(hm, '<form id="home-search"') && has(hm, 'id="home-q"') && has(hm, 'id="home-city"') && has(hm, 'Search jobs') && has(hm, 'href="#jobs"'));
  const e = mk(FIX); e.go('home');
  e.submit({id: 'home-search', elements: {'home-q': {value: 'alpha'}, 'home-city': {value: 'Basetown'}}});
  eq('HE-02', 'homepage submit applies keyword+location only (other criteria neutral) and opens results', [e.S().jobApplied.q, e.S().jobApplied.city, e.S().jobApplied.type, e.S().jobApplied.pay, e.S().jobApplied.schedule, e.loc.hash], ['alpha', 'Basetown, VA', '', '', '', '#results']);
  const k = snap(e.S().jobApplied); e.go('home');
  e.submit({id: 'home-search', elements: {'home-q': {value: 'x'}, 'home-city': {value: 'Atlantis'}}});
  eq('HE-02', 'homepage submit with an unsupported location keeps the previous search and stays on Home', [snap(e.S().jobApplied), e.loc.hash], [k, '#home']);
  ok('HE-02', 'homepage error is announced with the correction', has(e.T.lastAnnounce, 'not a supported location'));
}

// ================= HE-04: navigation and comparison context =================
{
  const a = fresh(), T = a.T; sd(a, 'jobs', {});
  T.toggleCompare('F3', true); T.toggleCompare('F5', true);
  const applied = snap(a.S().jobApplied), sel = snap(a.S().selected);
  for (const route of ['job/F3', 'apply/F3', 'results', 'job/F5', 'apply/F5', 'results']) a.go(route);
  eq('HE-04', 'opening job details and application info and returning keeps applied criteria and both selections', [snap(a.S().jobApplied), snap(a.S().selected)], [applied, sel]);
  T.setDraft('jobs', {q: 'beta'});
  a.go('job/F3'); a.go('results');
  eq('HE-04', 'unapplied draft survives navigation and stays unapplied (documented behavior)', [a.S().jobs.q, a.S().jobApplied.q, T.isPending('jobs'), has(a.html, 'Changes not applied')], ['beta', '', true, true]);
  eq('HE-04', 'draft edits do not remove comparison selections', a.S().selected, ['F3', 'F5']);
  T.setDraft('jobs', {q: ''});
  eq('HE-04', 'reapplying unchanged criteria keeps selections', [T.applyDraft('jobs').changed, a.S().selected], [false, ['F3', 'F5']]);
  const store = a.store, b = mk(FIX, store);
  eq('HE-04', 'after a reload (new page load, same storage) applied search, draft and selections are restored', [snap(b.S().jobApplied), snap(b.S().selected), b.S().jobs.q], [applied, sel, '']);
}
{ // excluded selections follow the existing policy and are explained
  const a = fresh(), T = a.T; sd(a, 'jobs', {}); T.toggleCompare('F3', true); T.toggleCompare('F5', true);
  const r = sd(a, 'jobs', {schedule: 'Daytime'});
  eq('HE-04', 'applying Daytime removes F3 (Evening) but keeps F5; comparison closed because only one remains', [r.removed, a.S().selected, a.S().compare], [['F3'], ['F5'], false]);
  const h = a.go('results');
  ok('HE-04', 'removal is explained naming the job and employer', has(h, 'Removed from your comparison because they no longer match this search: Alpha Role at Fixture Co F3.'));
  eq('HE-04', 'applying a search that still includes both selections keeps both and the comparison view', (() => {const b = fresh(); sd(b, 'jobs', {}); b.T.toggleCompare('F1', true); b.T.toggleCompare('F2', true); b.click({action: 'compare'}); sd(b, 'jobs', {q: 'alpha'}); return [b.S().selected, b.S().compare, b.S().note];})(), [['F1', 'F2'], true, '']);
  eq('HE-04', 'when both selections drop out the note names both', (() => {const b = fresh(); sd(b, 'jobs', {}); b.T.toggleCompare('F1', true); b.T.toggleCompare('F4', true); sd(b, 'jobs', {q: 'zeta'}); return [b.S().selected, b.S().note];})(), [[], 'Removed from your comparison because they no longer match this search: Alpha Role at Fixture Co F1; Beta Role at Fixture Co F4.']);
  const c = fresh(); sd(c, 'jobs', {}); c.T.toggleCompare('F1', true); c.T.toggleCompare('F2', true);
  const third = c.T.toggleCompare('F3', true);
  eq('HE-04', 'a third selection is refused with an explanation and the selection is unchanged', [third.ok, c.S().selected, c.T.error.text], [false, ['F1', 'F2'], 'You can compare two jobs at a time. Remove one selected job before adding another.']);
  c.T.clearError();
}
{ // back/return links
  const a = fresh(), T = a.T; sd(a, 'jobs', {}); T.toggleCompare('F1', true); T.toggleCompare('F2', true);
  let h = a.go('job/F1');
  ok('HE-04', 'job page: Back to job search results link, no comparison link while comparison view is not open', has(h, 'href="#results">← Back to job search results') && !has(h, 'Back to comparison'));
  a.go('results'); a.click({action: 'compare'}); h = a.go('job/F1');
  ok('HE-04', 'job page reached from an open comparison also offers Back to comparison', has(h, 'Back to comparison'));
  h = a.go('apply/F1');
  ok('HE-04', 'apply page: Back to job details, Back to job search results and Back to comparison', has(h, 'href="#job/F1">← Back to job details') && has(h, 'Back to job search results') && has(h, 'Back to comparison'));
  const b = fresh(); h = b.go('apply/F1');
  ok('HE-04', 'with no search applied, apply page returns to Find jobs instead of a results page that does not exist', has(h, '← Find jobs') && !has(h, '← Back to job search results'));
}
{ // searches do not overwrite one another
  const a = fresh(), T = a.T;
  sd(a, 'jobs', {q: 'alpha', type: 'Full-time'});
  sd(a, 'providers', {q: 'fixture'});
  const jobsBefore = snap(a.S().jobApplied), provBefore = snap(a.S().providerApplied);
  T.relatedTraining('X1');
  eq('HE-04', 'occupation → training sets the programs search only; jobs and providers searches untouched', [a.S().programApplied.occupation, snap(a.S().jobApplied), snap(a.S().providerApplied)], ['X1', jobsBefore, provBefore]);
  T.providerPrograms('Y1');
  eq('HE-04', 'provider → programs keeps the earlier occupation condition and says so', [a.S().programApplied.provider, a.S().programApplied.occupation, has(a.S().ctx.programs.text, 'Occupation: Alpha Role')], ['Y1', 'X1', true]);
  T.ctxFresh('programs');
  eq('HE-04', '"Search with only the new condition" clears the inherited occupation', [a.S().programApplied.provider, a.S().programApplied.occupation], ['Y1', '']);
  T.relatedJobs('X2');
  eq('HE-04', 'occupation → jobs keeps unrelated applied conditions (keyword, Full-time) and sets occupation X2; says what was kept', [a.S().jobApplied.q, a.S().jobApplied.type, a.S().jobApplied.occupation, has(a.S().ctx.jobs.text, 'Kept from your previous search: Keyword “alpha”; Full-time')], ['alpha', 'Full-time', 'X2', true]);
  eq('HE-04', 'that combination is empty and the recovery hints are occupation (3: F1,F2,F6) then keyword (2: F4,F5)', T.relaxHints('jobs', a.S().jobApplied).map(x => [x.label, x.count]), [['Occupation: Beta Role', 3], ['Keyword “alpha”', 2]]);
  ok('HE-04', 'the contextual note is rendered with a button to search with only the new condition', has(a.go('results'), 'Search with only the new condition'));
  T.ctxFresh('jobs');
  eq('HE-04', 'search with only the new condition: keyword and type cleared, occupation kept', [a.S().jobApplied.q, a.S().jobApplied.type, a.S().jobApplied.occupation], ['', '', 'X2']);
  eq('HE-04', 'providers search was never touched by any of those links', snap(a.S().providerApplied), provBefore);
  const b = fresh(); sd(b, 'jobs', {}); b.T.setDraft('jobs', {q: 'zzz'}); b.T.relatedJobs('X1');
  ok('HE-04', 'a contextual link that replaces unapplied form edits says so', has(b.S().ctx.jobs.text, 'Unapplied edits in the form were not carried over.'));
}
{ // selection survives sorting and details tab switching (details-vs-compare independence)
  const a = fresh(), T = a.T; sd(a, 'jobs', {}); T.toggleCompare('F1', true); T.toggleCompare('F2', true);
  a.click({action: 'compare'});
  eq('HE-04', 'compare opens the comparison view', a.S().compare, true);
  a.click({action: 'select-job', id: 'F5'});
  eq('HE-04', 'choosing a job title while comparing shows its details and keeps both selections', [a.S().detail, a.S().compare, a.S().selected], ['F5', false, ['F1', 'F2']]);
  a.click({action: 'compare'});
  eq('HE-04', 'returning to Compare shows the same two jobs', [a.S().compare, a.S().selected], [true, ['F1', 'F2']]);
  a.change({id: 'sort', value: 'pay'});
  eq('HE-04', 'changing sort keeps selections and applied search', [a.S().sort, a.S().selected], ['pay', ['F1', 'F2']]);
}

// ================= HE-05: interaction affordances =================
{
  const a = fresh(); sd(a, 'jobs', {});
  const h = a.go('results');
  const cards = h.split('<article class="job-card').slice(1).map(c => c.split('</article>')[0]);
  eq('HE-05', 'six job cards rendered; with a blank keyword the first (shown) job is the most recent, F6 (posted 0 days ago)', [cards.length, a.S().detail], [6, 'F6']);
  ok('HE-05', 'each card: checkbox with an accessible name containing job title and employer', cards.every((c, i) => /<input type="checkbox" data-compare-id="F\d"[^>]*aria-label="Compare [^"]+ at Fixture Co F\d"/.test(c)));
  ok('HE-05', 'each card: title is a button (link-styled) with data-action=select-job; detail button also named for the job', cards.every(c => /<h3 id="jt-F\d"><button type="button" class="link-button title-button" data-action="select-job"/.test(c) && /View job details<span class="sr-only"> for [^<]+ at Fixture Co F\d<\/span>/.test(c)));
  ok('HE-05', 'the card itself is not interactive: no data-action/onclick/role/tabindex on the article', cards.every(c => !/^[^>]*(data-action|onclick|role=|tabindex)/.test(c)));
  ok('HE-05', 'no interactive element nested inside another (no <a> in a card; checkbox is not inside a button)', cards.every(c => !/<a /.test(c) && !/<button[^>]*>(?:(?!<\/button>).)*<input/.test(c)));
  a.clickNothing();
  eq('HE-05', 'a click that lands on no link/button (e.g. a checkbox or card background) does not open a job', a.S().detail, 'F6');
  a.change({dataset: {compareId: 'F3'}, checked: true});
  eq('HE-05', 'ticking the checkbox selects for comparison without changing the job shown in details', [a.S().selected, a.S().detail], [['F3'], 'F6']);
  a.change({dataset: {compareId: 'F3'}, checked: false});
  eq('HE-05', 'unticking removes it again', a.S().selected, []);
  a.change({dataset: {compareId: 'F1'}, checked: true}); a.change({dataset: {compareId: 'F2'}, checked: true});
  const t = {dataset: {compareId: 'F4'}, checked: true}; a.change(t);
  ok('HE-05', 'a third tick is undone, explained in the page and announced', t.checked === false && a.S().selected.length === 2 && has(a.html, 'You can compare two jobs at a time') && has(a.T.lastAnnounce, 'You can compare two jobs at a time'));
  a.T.clearError();
  const sh = a.S().detail;
  a.click({action: 'select-job', id: 'F4'});
  eq('HE-05', 'the title button opens the job in the details panel', [sh, a.S().detail], ['F6', 'F4']);
  ok('HE-05', 'the shown job is marked with text, not colour alone', has(a.render(), 'Shown in details') && has(a.html, 'aria-current="true"'));
  // other result cards
  const r = mk(); sd(r, 'providers', {}); sd(r, 'programs', {});
  const ph = r.go('providers'), gh = r.go('programs');
  ok('HE-05', 'provider cards: title is a real link to the provider; no whole-card handler; actions are links/buttons', /<h3><a href="#provider\/T\d\d">/.test(ph) && !/<article class="list-card"[^>]*(onclick|data-action|role=)/.test(ph) && has(ph, 'View provider details') && has(ph, 'View programs from this provider'));
  ok('HE-05', 'program cards: title is a real link to the program; actions are links', /<h3><a href="#program\/P\d\d">/.test(gh) && has(gh, 'View program details') && has(gh, 'View provider'));
}

// ================= HE-06: application methods and prototype boundaries =================
{
  const a = mk(), D = a.win.VAWC_DATA, T = a.T;
  const bad = [], seen = {};
  for (const j of D.jobs) {
    const h = a.go('apply/' + j.id), acct = j.applyMethod === 'account';
    const buttons = [...h.matchAll(/<button type="button" class="button[^"]*"[^>]*>([^<]*)<\/button>/g)].map(m => m[1]);
    const issues = [];
    if (!has(h, acct ? 'Virginia Workforce Connection account (simulated)' : 'Employer’s own application site (simulated)')) issues.push('method');
    if (!has(h, 'Employer’s general website') || !has(h, 'Not provided. It is separate from the application destination.')) issues.push('general website not separated');
    if (!has(h, 'Application destination') || !has(h, 'simulated')) issues.push('destination/simulated');
    if (!has(h, 'No application has been submitted') || !has(h, 'Prototype boundary')) issues.push('boundary');
    if (/https?:\/\/|www\.|mailto:/i.test(h.replace(/href="#[^"]*"/g, ''))) issues.push('real URL');
    if (/<form|<input|type="password"|type="email"|name="resume"/i.test(h)) issues.push('data entry');
    if (/submitted successfully|application (was )?(sent|received)|thank you|you have applied/i.test(h)) issues.push('claims submission');
    if (!buttons.length || !buttons.every(t => /not available/.test(t))) issues.push('button without "not available": ' + buttons.join('|'));
    if (acct && !(has(h, 'Sign in (not available in this prototype)') && has(h, 'Create an account (not available in this prototype)'))) issues.push('account buttons');
    if (!acct && !has(h, 'Open employer application page (simulated; not available)')) issues.push('employer button');
    if (!has(h, `href="#job/${j.id}">← Back to job details`)) issues.push('back to job');
    if (issues.length) bad.push(j.id + ':' + issues.join(','));
    seen[j.applyMethod] = (seen[j.applyMethod] || 0) + 1;
  }
  eq('HE-06', 'all 80 application pages: method named; employer website kept separate from destination; simulated; nothing submitted; no real URL; no data entry; every action says "not available"; route back to the job', bad, []);
  ok('HE-06', 'both application methods occur in the data (so both paths were exercised)', seen.account > 0 && seen.external > 0);
  const acct = D.jobs.find(j => j.applyMethod === 'account'), ext = D.jobs.find(j => j.applyMethod === 'external');
  const ha = a.go('apply/' + acct.id), he = a.go('apply/' + ext.id);
  ok('HE-06', 'account-based page explains an account is needed and the application is made inside it', has(ha, 'normally starts by signing in to, or creating, a Virginia Workforce Connection account') && has(ha, 'not on an employer’s website'));
  ok('HE-06', 'employer-site page explains the step leaves this service and that the employer page is not shown, with no address', has(he, 'normally means leaving this service for the employer’s own application page') && has(he, 'no web address is given because this is a fictional employer'));
  a.go('job/' + acct.id);
  ok('HE-06', 'job details also state the application method and that account steps are unavailable', has(a.html, 'Application method') && has(a.html, 'Account steps are not available in this prototype'));
  a.go('job/' + ext.id);
  ok('HE-06', 'job details for an employer-site job say the prototype shows no page or address', has(a.html, 'does not show that page or give a web address'));
  a.click({action: 'unavailable', name: 'Employer application page (simulated)'});
  ok('HE-06', 'the non-functional action opens a notice saying it is not implemented, that nothing changed, and offering a way back', has(a.html, 'not implemented in this prototype') && has(a.html, 'Your searches, selections and criteria are unchanged') && has(a.html, 'returns you to'));
  const aj = D.jobs.find(j => j.applyMethod === 'external' && j.source === 'Job board'), ej = D.jobs.find(j => j.applyMethod === 'external' && j.source === 'Employer');
  ok('HE-06', 'listing source is explained differently for job-board and employer postings', has(a.go('apply/' + aj.id), 'comes from a job board, so confirm where the application is actually received') && has(a.go('apply/' + ej.id), 'posted by the employer itself'));
  eq('HE-06', 'no application destination or employer website string appears in the data (nothing to invent from)', Object.keys(D.jobs[0]).filter(k => /url|website|link|href/i.test(k)), []);
}

// ================= HE-07: geographic scope =================
{
  const a = mk(), D = a.win.VAWC_DATA, T = a.T;
  const L = Object.fromEntries(D.locations.map(l => [l.label, l]));
  const hav = (p, q) => {const r = x => x * Math.PI / 180; const h = Math.sin(r(q.lat - p.lat) / 2) ** 2 + Math.cos(r(p.lat)) * Math.cos(r(q.lat)) * Math.sin(r(q.lon - p.lon) / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(h));};
  const chooseArea = v => {a.go('occupations'); a.input({id: 'occ-area-input', value: v}); a.submit({id: 'occ-area'});};
  chooseArea('Chesterfield');
  eq('HE-07', 'choosing an occupation area stores it as applied (canonical label)', [a.S().occArea, a.S().occApplied], ['Chesterfield, VA', 'Chesterfield, VA']);
  let h = a.go('occupations');
  ok('HE-07', 'occupations page shows the applied area, says information is general, and says where the area is used', has(h, 'Applied area: Chesterfield, VA') && has(h, 'Duties, skills and preparation are general and do not change with area') && has(h, 'job search center') && has(h, 'delivery city for training programs'));
  a.click({action: 'occ-jobs', id: 'O01'});
  eq('HE-07', 'Find related jobs uses the chosen area as the job-search center with the documented 25-mile radius', [a.S().jobApplied.city, a.S().jobApplied.occupation, a.S().jobApplied.radius, a.loc.hash], ['Chesterfield, VA', 'O01', '25', '#results']);
  eq('HE-07', 'O01 jobs within 25 straight-line miles of Chesterfield: Richmond (11.9), Henrico (15.8), Chesterfield, Mechanicsville (17.6); not Charlottesville (69.6) or Norfolk (76.4)', sid(T.filterJobs(a.S().jobApplied)), ['J01', 'J02', 'J04', 'J11', 'J12', 'J13', 'J14']);
  eq('HE-07', 'cross-check with an independently written haversine over the same coordinates', sid(D.jobs.filter(j => j.occupationId === 'O01' && hav(L['Chesterfield, VA'], L[j.city]) <= 25)), ['J01', 'J02', 'J04', 'J11', 'J12', 'J13', 'J14']);
  h = a.go('results');
  ok('HE-07', 'the geographic condition is visible in the Applied summary and in the contextual note, and the location field holds it so it can be changed', has(h, 'Chesterfield, VA — 25 miles (straight-line)') && has(a.S().ctx.jobs.text, 'near Chesterfield, VA') && has(h, 'name="city" value="Chesterfield, VA"'));
  chooseArea('Henrico');
  a.click({action: 'occ-training', id: 'O01'});
  eq('HE-07', 'Explore training uses the chosen area as the delivery location (exact city): O01 programs delivered in Henrico are P03 and P08', [a.S().programApplied.city, sid(T.filterPrograms(a.S().programApplied))], ['Henrico, VA', ['P03', 'P08']]);
  ok('HE-07', 'the programs page labels the location as the training (delivery) location', has(a.go('programs'), 'Training location: Henrico, VA'));
  chooseArea('Virginia');
  a.click({action: 'occ-training', id: 'O01'});
  eq('HE-07', 'area "Virginia" means no location condition: nine O01 programs statewide', [a.S().programApplied.city, sid(T.filterPrograms(a.S().programApplied)).length], ['', 9]);
  ok('HE-07', 'applied summary says All Virginia', has(a.go('programs'), 'Training location: All Virginia'));
  const keep = a.S().occApplied;
  chooseArea('Atlantis');
  eq('HE-07', 'an unsupported area is refused, the previous area stays applied, and an explanation is announced', [a.S().occApplied, has(a.T.lastAnnounce, 'not a supported location')], [keep, true]);
  a.T.clearError();
  chooseArea('Roanoke'); a.click({action: 'occ-jobs', id: 'O01'});
  eq('HE-07', 'an area with no matching jobs gives an explained empty result with recovery (O01 jobs near Roanoke: none)', [T.filterJobs(a.S().jobApplied).length, has(a.render(), 'No jobs match these criteria')], [0, true]);
  const hints = T.relaxHints('jobs', a.S().jobApplied).map(x => x.label);
  ok('HE-07', 'recovery offers dropping the location (the area-derived condition)', hints.some(t => /Roanoke, VA/.test(t)));
  // general occupation information claims no regional facts
  const occPages = D.occupations.map(o => a.go('occupation/' + o.id));
  eq('HE-07', 'occupation profiles contain no wage, demand, or growth figures and mark the content as general', [occPages.filter(p => /\$\s?\d|median|projected|growth rate|openings per/i.test(p)).length, occPages.every(p => has(p, 'General occupational information'))], [0, true]);
  // provider location vs program delivery location
  const g = mk(); sd(g, 'programs', {});
  const gh = g.go('programs');
  const p08 = gh.split('<article class="list-card"').find(c => c.includes('Business Communication and Records')), p01 = gh.split('<article class="list-card"').find(c => c.includes('Office Software Fundamentals'));
  ok('HE-07', 'P08 card (Richmond provider, delivered in Henrico) shows both locations and flags the difference; P01 (same city) does not', has(p08, 'Provider location:</strong> Richmond, VA') && has(p08, 'Training location:</strong> Henrico, VA') && has(p08, 'differs from the provider’s location') && has(p01, 'Training location:</strong> Richmond, VA') && !has(p01, 'differs from'));
  ok('HE-07', 'P08 detail page labels both and explains the difference; provider page marks it as not the provider’s location', has(g.go('program/P08'), 'Provider location') && has(g.html, 'Training location (where it is delivered)') && has(g.html, 'which is not the provider’s location (Richmond, VA)') && has(g.go('provider/T05'), 'delivered in Henrico, VA (not the provider’s location)'));
  ok('HE-07', 'filter labels name their meaning: job location + radius center, provider location, training location', has(g.go('jobs'), 'Job location: city or ZIP code') && has(g.html, 'Radius around that center') && has(g.go('providers'), 'Provider location (where the organization is based)') && has(g.go('programs'), 'Training location (where the program is delivered)'));
  ok('HE-07', 'radius help states it is straight-line, approximate, not driving distance, and used only with a location', has(g.go('jobs'), 'Used only when a location is entered. Straight-line miles between approximate city centers; not driving distance.'));
  ok('HE-07', 'training location help says exact city match (no radius) instead of implying a radius', has(g.go('programs'), 'Matches the city exactly (no radius)') && has(g.go('providers'), 'Matches the city exactly (no radius)'));
  ok('HE-07', 'home and locations dialog describe straight-line approximation, not commuting distance', has(mk().go('home'), 'not driving distance') && (() => {const m = mk(); m.go('home'); m.click({dialog: 'locations'}); return has(m.html, 'not driving or commuting distance') && has(m.html, 'approximate city centers');})());
  eq('HE-07', 'an exact-city provider search has an effect: Henrico providers are T02 and T11', sid(T.filterProviders({...T.defaults.providers, city: 'Henrico'})), ['T02', 'T11']);
}

// ================= HE-08: consistency, hierarchy, text size =================
{
  const a = mk(), D = a.win.VAWC_DATA;
  sd(a, 'jobs', {q: 'office', city: 'Richmond'}); sd(a, 'providers', {}); sd(a, 'programs', {});
  a.T.toggleCompare(a.T.sortJobs(a.T.filterJobs(a.S().jobApplied), a.S().jobApplied, 'relevance')[0].id, true);
  const pages = ['home', 'occupations', 'occupation/O01', 'training', 'providers', 'provider/T01', 'programs', 'program/P01', 'jobs', 'results', 'job/J01', 'apply/J01', 'nosuch'];
  const bad1 = [], bad2 = [];
  for (const p of pages) {
    const h = a.go(p), lv = [...h.matchAll(/<h([1-6])\b/g)].map(m => +m[1]);
    if (lv.filter(x => x === 1).length !== 1 || lv[0] !== 1) bad1.push(p + ' h1 count');
    if (lv.some((x, i) => i > 0 && x > lv[i - 1] + 1)) bad2.push(p + ' ' + lv.join(''));
  }
  eq('HE-08', 'every page has exactly one h1, first in the page', bad1, []);
  eq('HE-08', 'heading levels never skip downward (h1→h2→h3) on any page', bad2, []);
  ok('HE-08', 'toggles expose their selected state with aria-pressed; tab-like navigation uses aria-current', (() => {const h = a.go('results'); const o = a.go('occupations'); const j = a.go('jobs'); return /<button type="button" data-action="details-tab" aria-pressed="(true|false)">/.test(h) && /data-action="occ-mode" data-mode="group" aria-pressed="true"/.test(o) && /<a href="#jobs" aria-current="page">Job search<\/a>/.test(j);})());
  ok('HE-08', 'training tabs mark the current page with aria-current', has(a.go('providers'), 'href="#providers" aria-current="page"') && has(a.go('programs'), 'href="#programs" aria-current="page"'));
  const labels = {'results': ['Update results', 'Reset criteria'], 'providers': ['Update results', 'Reset criteria'], 'programs': ['Update results', 'Reset criteria']};
  eq('HE-08', 'the same action has the same label on every search form (Update results after a first search; Reset criteria)', Object.entries(labels).filter(([p, ls]) => !ls.every(l => has(a.go(p), '>' + l + '<'))).map(([p]) => p), []);
  const fr = mk(); fr.go('providers'); fr.go('programs');
  ok('HE-08', 'first-search labels are specific (Search providers / Search programs / Search jobs)', has(fr.go('providers'), '>Search providers<') && has(fr.go('programs'), '>Search programs<') && has(fr.go('jobs'), '>Search jobs<'));
  const labelBad = [];
  for (const p of ['results', 'job/J01', 'apply/J01']) {const h = a.go(p); if (/Back to results|Return to results|Go back|>Back</.test(h)) labelBad.push(p);}
  eq('HE-08', 'return links use one wording ("Back to job search results"); no variants', labelBad, []);
  ok('HE-08', 'detail destination uses one wording on every card ("View job details", with the job named for screen readers)', (a.go('results').match(/>View job details</g) || []).length === (a.html.match(/class="job-card/g) || []).length);
  const sheet = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  ok('STATIC', 'no task-specific emphasis: no .primary-link rule and no selectors on record IDs in the stylesheet or script', !/primary-link/.test(sheet) && !/primary-link/.test(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8')) && !/\.(J|O|T|P)\d\d\b/.test(sheet));
}
{ // text-size state and restoration
  const a = mk(FIX); const T = a.T;
  eq('HE-08', 'default text size: state false and no large-text class', [a.S().ui.large, !!a.cls['large-text']], [false, false]);
  a.click({dialog: 'accessibility'});
  ok('HE-08', 'control reports the actual state: "Text size: Default"; Restore is pressed, Larger is not', has(a.html, 'Text size: Default') && has(a.html, 'data-action="text-large" aria-pressed="false"') && has(a.html, 'data-action="text-default" aria-pressed="true"'));
  a.click({action: 'text-large'});
  eq('HE-08', 'choosing larger text sets state, applies the class on the root element, persists, and announces', [a.S().ui.large, a.cls['large-text'], JSON.parse(a.store[KEY]).ui.large, has(T.lastAnnounce, 'larger')], [true, true, true, true]);
  a.click({dialog: 'accessibility'});
  ok('HE-08', 'reopening the control shows "Text size: Larger" with Larger pressed', has(a.html, 'Text size: Larger') && has(a.html, 'data-action="text-large" aria-pressed="true"') && has(a.html, 'data-action="text-default" aria-pressed="false"'));
  const b = mk(FIX, a.store);
  eq('HE-08', 'the larger setting is restored on the next page load', [b.S().ui.large, b.cls['large-text']], [true, true]);
  b.click({action: 'text-default'});
  eq('HE-08', 'Restore default text size clears the state and the class, persists, announces', [b.S().ui.large, b.cls['large-text'], JSON.parse(b.store[KEY]).ui.large, has(b.T.lastAnnounce, 'default')], [false, false, false, true]);
  eq('HE-08', 'the setting is stored only under the revised-prototype key', Object.keys(a.store), [KEY]);
}
{ // static CSS checks and independently computed contrast
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  ok('STATIC', 'every font-size is relative (no px), so text enlargement reaches all text', !/font-size:\s*[\d.]+px/.test(css));
  ok('STATIC', 'html.large-text raises the root size to 125%', /html\.large-text\{font-size:125%\}/.test(css));
  const mast = [...css.matchAll(/\.masthead\{([^}]*)\}/g)].map(m => m[1]);
  ok('STATIC', 'masthead height is a minimum in every rule that sets it, so enlarged text cannot be clipped', mast.length >= 2 && mast.every(b => /(^|;)min-height:/.test(b) && !/(^|;)height:/.test(b)));
  ok('STATIC', 'visible keyboard focus: 3px outline rule exists for buttons, links, fields and summaries', /button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible[^{]*\{outline:3px solid/.test(css));
  ok('STATIC', 'cards are not styled as clickable (cursor:default on cards); title buttons have hover states', /\.list-card,\.job-card\{[^}]*cursor:default/.test(css) && /\.title-button:hover/.test(css) && /\.button:hover/.test(css) && /\.link-button:hover/.test(css) && !/\.(job|list)-card[^{]*\{[^}]*cursor:pointer/.test(css) && !/\.(job|list)-card:hover/.test(css));
  ok('STATIC', 'toggles, tabs and primary/secondary buttons have separate style rules', /\.segmented/.test(css) && /\.method-tabs/.test(css) && /\.button\.secondary/.test(css) && /\.button\.text/.test(css));
  ok('STATIC', 'comparison collapses to stacked rows on narrow screens', /@media\(max-width:760px\)[\s\S]*\.comparison td::before\{content:attr\(data-job\)/.test(css));
  const lum = hex => {const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];};
  const ratio = (a, b) => {const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);};
  const pairs = [['primary button text', '#ffffff', '#0758b6', 4.5], ['primary button hover', '#ffffff', '#06458d', 4.5], ['link', '#064e9b', '#ffffff', 4.5], ['link on pale surface', '#064e9b', '#f1f4f7', 4.5], ['navy heading on white', '#103f75', '#ffffff', 4.5], ['muted text on white', '#526273', '#ffffff', 4.5], ['muted text on surface', '#526273', '#f1f4f7', 4.5], ['utility nav text', '#ffffff', '#4e5961', 4.5], ['utility nav selected', '#ffffff', '#33434f', 4.5], ['selected toggle', '#ffffff', '#103f75', 4.5], ['up-to-date pill', '#1a6138', '#e2f2e7', 4.5], ['pending pill', '#6d4200', '#ffe9b0', 4.5], ['boundary notice', '#4d3300', '#fff6dd', 4.5], ['error text', '#8a1b1b', '#fff2f1', 4.5], ['missing-info text on white', '#6b4e12', '#ffffff', 4.5], ['missing-info on striped row', '#6b4e12', '#fafcfe', 4.5], ['table row header', '#33495b', '#f3f6f9', 4.5], ['stacked row header', '#33495b', '#e9eef3', 4.5], ['cell note', '#41566a', '#ffffff', 4.5], ['fact label', '#4a6073', '#f6f9fc', 4.5], ['placeholder', '#657380', '#ffffff', 4.5], ['focus ring on white', '#b45f00', '#ffffff', 3], ['focus ring on surface', '#b45f00', '#f1f4f7', 3], ['focus ring on utility nav (white)', '#ffffff', '#4e5961', 3], ['field border', '#7f98ad', '#ffffff', 3]];
  const lowRatio = pairs.filter(([, f, b, min]) => ratio(f, b) < min).map(([n, f, b]) => `${n} ${ratio(f, b).toFixed(2)}`);
  eq('STATIC', `independently computed WCAG contrast for ${pairs.length} role colour pairs meets 4.5:1 (text) or 3:1 (focus/borders)`, lowRatio, []);
  ok('STATIC', 'the colours tested are the ones used in the stylesheet', pairs.every(([, f, b]) => [f, b].every(c => c === '#ffffff' || css.toLowerCase().includes(c) || css.toLowerCase().includes('#' + c.slice(1, 2) + c.slice(3, 4) + c.slice(5, 6)))));
}

// ================= HE-09: comparison and uncertainty =================
{
  const a = fresh(), T = a.T; sd(a, 'jobs', {}); T.toggleCompare('F2', true); T.toggleCompare('F4', true); a.click({action: 'compare'});
  let h = a.go('results');
  eq('HE-09', 'comparison rows are aligned and ordered: employer, source, location, type, pay, schedule, qualifications, application method, to confirm, next step', rows(h), ['Employer', 'Listing source', 'Location', 'Employment type', 'Pay', 'Schedule', 'Qualifications', 'Application method', 'To confirm', 'Next step']);
  const pay = rowHtml(h, 'Pay'), sch = rowHtml(h, 'Schedule');
  ok('HE-09', 'range pay shows range and period ($40,000–$44,000/year) with the hourly equivalent computed by hand: 40000÷2080=19.23, 44000÷2080=21.15', has(pay, '$40,000–$44,000/year') && has(pay, 'about $19.23–$21.15/hour equivalent (annual pay ÷ 2,080 hours)') && has(pay, 'Listed range; the rate actually offered is not specified.'));
  ok('HE-09', 'unknown pay stays "Not provided" (marked missing) with an explanation; not a number', /<td[^>]*class="missing">Not provided<small class="cell-note">The listing gives no pay information\.<\/small><\/td>/.test(pay));
  ok('HE-09', 'unknown schedule stays "Not provided" and is explicitly not treated as daytime or evening; the known schedule has no note', /class="missing">Not provided<small class="cell-note">Not treated as daytime or evening\./.test(sch) && has(sch, '>Daytime</td>'));
  ok('HE-09', 'no minimum pay applied → no "Against your minimum pay" row', !has(h, 'Against your minimum pay'));
  ok('HE-09', 'no automatic best-choice / recommendation / score language in the comparison or results', !/best choice|recommended|top pick|winner|score|ranked first|our pick/i.test(h));
  ok('HE-09', 'comparison offers Remove from comparison for each job and a route to each job and application', (h.match(/data-action="remove-compare"/g) || []).length >= 4 && has(h, 'href="#job/F2"') && has(h, 'href="#apply/F4"'));
  sd(a, 'jobs', {pay: '19'});
  h = a.go('results');
  eq('HE-09', 'with a minimum pay applied a row is added before "To confirm"', rows(h).slice(-3), ['Against your minimum pay', 'To confirm', 'Next step']);
  const m = rowHtml(h, 'Against your minimum pay');
  ok('HE-09', 'against the $19/h minimum: F2 (19.23–21.15/h) is whole-range; F4 (no pay) cannot be checked', has(m, 'The whole listed range is at or above your minimum pay; the rate offered still needs confirming.') && has(m, 'Pay not provided: cannot be checked against your minimum pay.'));
  // remove / replace
  a.click({action: 'remove-compare', id: 'F4'});
  eq('HE-09', 'removing a compared job leaves one selection and closes the comparison', [a.S().selected, a.S().compare], [['F2'], false]);
  T.toggleCompare('F1', true); a.click({action: 'compare'});
  eq('HE-09', 'a replacement can be added and compared', [a.S().selected, a.S().compare], [['F2', 'F1'], true]);
  ok('HE-09', 'comparison return path: results list stays on the page next to the comparison (same screen)', has(a.render(), 'Job listings') && has(a.html, 'Compare selected jobs'));
}
{ // pay threshold semantics, independent hand values
  const T = fresh().T, F = Object.fromEntries(mk(FIX).win.VAWC_DATA.jobs.map(j => [j.id, j]));
  const pm = (id, c) => T.payMatch(F[id], c);
  eq('HE-09', 'F3 pays 18–19/h: minimum $19 is met only at the top of the range → kind "upper", not "whole range"', [pm('F3', {pay: '19', unit: 'hour'}).kind, /whole/.test(pm('F3', {pay: '19', unit: 'hour'}).text)], ['upper', false]);
  ok('HE-09', 'the upper-bound message says the rate offered may be lower', has(pm('F3', {pay: '19', unit: 'hour'}).text, 'only at the top of the listed range; the rate offered may be lower'));
  eq('HE-09', 'F3 against $20/h is below', pm('F3', {pay: '20', unit: 'hour'}).kind, 'below');
  eq('HE-09', 'F1 pays exactly 20/h: minimum $19 → full; F6 pays exactly 19 → full (equal counts as meeting)', [pm('F1', {pay: '19', unit: 'hour'}).kind, pm('F6', {pay: '19', unit: 'hour'}).kind], ['full', 'full']);
  eq('HE-09', 'F2 ($40,000–$44,000/yr = 19.23–21.15/h) against $19/h → full range; against $20/h → upper only; against $22/h → below', [pm('F2', {pay: '19', unit: 'hour'}).kind, pm('F2', {pay: '20', unit: 'hour'}).kind, pm('F2', {pay: '22', unit: 'hour'}).kind], ['full', 'upper', 'below']);
  eq('HE-09', 'minimum entered per year is converted: $40,000/yr (=19.23/h) → F3 (top 19) below; F2 (bottom 19.23) full', [pm('F3', {pay: '40000', unit: 'year'}).kind, pm('F2', {pay: '40000', unit: 'year'}).kind], ['below', 'full']);
  eq('HE-09', 'unknown pay (F4) is never counted as meeting any minimum', pm('F4', {pay: '1', unit: 'hour'}).kind, 'unknown');
  eq('HE-09', 'no minimum applied → no pay judgement at all (pay and daytime stay optional)', [pm('F1', {pay: '', unit: 'hour'}), pm('F1', null)], [null, null]);
  eq('HE-09', 'hourly-equivalent wording only for annual pay, with range', [T.hourlyEquivalent(F.F1), T.hourlyEquivalent(F.F4), T.hourlyEquivalent(F.F2)], ['', '', 'about $19.23–$21.15/hour equivalent (annual pay ÷ 2,080 hours)']);
  const a = fresh(); sd(a, 'jobs', {pay: '19'});
  const h = a.go('results'), c3 = h.split('<article class="job-card').find(c => c.includes('data-compare-id="F3"')), c4 = h.split('<article class="job-card').find(c => c.includes('data-compare-id="F4"'));
  ok('HE-09', 'result cards under a $19 minimum: F3 is labelled "only at the top of the listed range", F4 "cannot be checked"; neither is labelled as meeting it', has(c3, 'match-upper') && !/whole listed range/.test(c3) && has(c4, 'match-unknown') && has(c4, 'cannot be checked') && has(c4, 'Not provided'));
  const f = fresh(); sd(f, 'jobs', {q: 'alpha'});
  eq('HE-09', 'a keyword-only search leaves pay and schedule optional (empty) and the summary says Any', [f.S().jobApplied.pay, f.S().jobApplied.schedule, has(f.go('results'), 'Minimum pay: Any') && has(f.html, 'Schedule: Any')], ['', '', true]);
}

// ================= REGRESSION: original-site entries, routes, storage =================
{
  const a = mk();
  const homeNames = ['Create a résumé', 'Find a candidate', 'Post a job opening', 'Employer incentives', 'Training for employers', 'Workforce Innovation and Opportunity Act (WIOA)', 'Virginia labor market information', 'Community profiles', 'Labor force data', 'Labor market publications', 'Labor market services', 'Unemployment insurance (VEC)', 'Virginia workforce centers', 'State workforce board', 'Local workforce boards', 'Helmets to Hardhats', 'Transition assistance', 'Troops to Teachers', 'Veteran services at Virginia Works', 'Virginia veterans network'];
  const names = h => [...h.matchAll(/data-unavailable="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
  eq('REGRESSION', 'home page keeps all 20 peripheral entries from the earlier build', names(a.go('home')).sort(), homeNames.slice().sort());
  eq('REGRESSION', 'training page keeps its 7 peripheral entries', names(a.go('training')).sort(), ['Financial assistance', 'Scholarships', 'ETPL-approved programs', 'Online learning resources', 'Program Finder', 'Education profile information', 'Program completion statistics'].sort());
  eq('REGRESSION', 'Find jobs keeps its 6 peripheral entries (original labels)', names(a.go('jobs')).sort(), ['Employer search', 'Skills & résumé matching', 'Search by education', 'Search by job number', 'Other job sites', 'Jobs outside Virginia'].sort());
  eq('REGRESSION', 'occupations keep the 4 alternative search methods', names(a.go('occupations')).sort(), ['By education program', 'By military specialty', 'By occupation code', 'By license'].sort());
  eq('REGRESSION', 'providers keep Ownership and WIOA eligibility', names(a.go('providers')).sort(), ['Ownership', 'WIOA eligibility']);
  eq('REGRESSION', 'removing the occupation filter box did not drop occupation-detail actions: both related buttons present', ['Explore training', 'Find related jobs'].filter(t => !has(a.go('occupation/O01'), t)), []);
  a.go('jobs'); a.click({unavailable: 'Employer search'});
  ok('REGRESSION', 'a peripheral entry opens a "not implemented" notice with a return path and unchanged state', has(a.html, 'not implemented in this prototype') && has(a.html, 'Go to Home instead') && has(a.html, 'unchanged'));
  eq('REGRESSION', 'baseline storage key is never written', Object.keys(a.store).filter(k => k !== KEY), []);
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok('REGRESSION', 'index.html declares a favicon (no /favicon.ico request) and still has no evaluator link', /rel="icon"/.test(idx) && !/evaluator/i.test(idx));
  ok('REGRESSION', 'static files use relative paths only', !/(src|href)="\/(?!\/)/.test(idx) && !/https?:\/\//.test(idx.replace(/xmlns='http:\/\/www\.w3\.org\/2000\/svg'/g, '')));
}

// ================= report =================
let bad = 0;
for (const r of R) if (!r.pass) {bad++; console.log('FAIL [' + r.cat + '] ' + r.name);}
const cats = [...new Set(R.map(r => r.cat))];
for (const c of cats) {const x = R.filter(r => r.cat === c); console.log(`${c}: ${x.filter(r => r.pass).length} passed, ${x.filter(r => !r.pass).length} failed (of ${x.length})`);}
console.log(`TOTAL: ${R.filter(r => r.pass).length} passed, ${bad} failed (of ${R.length})`);
process.exitCode = bad ? 1 : 0;
