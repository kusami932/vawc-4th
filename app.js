/* Virginia Works prototype — revised P4 build.
   One shared model: each search kind (jobs, providers, programs) has a DRAFT (what the form shows) and an
   APPLIED copy (what the results show). Only applyDraft() copies draft -> applied. Nothing else does.
   All data are fictional demonstration records (see data.js). */
(() => {
  'use strict';
  const D = window.VAWC_DATA, KEY = 'vawc-p4-revised-v1';
  const clone = x => JSON.parse(JSON.stringify(x));
  const defaults = {
    jobs: {q:'',city:'',radius:'25',type:'',pay:'',unit:'hour',unknown:true,schedule:'',days:'',occupation:'',education:'',source:'',work:''},
    providers: {q:'',city:'',type:''},
    programs: {q:'',city:'',provider:'',occupation:'',qualification:'',cost:'',schedule:'',format:''}
  };
  const APPLIED = {jobs:'jobApplied', providers:'providerApplied', programs:'programApplied'};

  /* ---------- state ---------- */
  let S = {
    jobs:clone(defaults.jobs), jobApplied:null, providers:clone(defaults.providers), providerApplied:null,
    programs:clone(defaults.programs), programApplied:null,
    selected:[], detail:'', compare:false, sort:'relevance', note:'',
    occMode:'group', occQuery:'', occSelected:'', occArea:'Virginia', occApplied:'Virginia',
    ctx:{jobs:null, providers:null, programs:null},   // note shown after a contextual link (what was set, what was kept)
    ui:{open:{}, large:false},                         // disclosure open/closed and text-size state
    pos:{results:{page:0, list:0}}                     // scroll position of the results screen
  };
  try {const old = JSON.parse(localStorage.getItem(KEY)); if (old) S = {...S, ...old};} catch (_) {}
  S.ctx = {jobs:null, providers:null, programs:null, ...(S.ctx || {})};
  S.ui = {open:{}, large:false, ...(S.ui || {})}; S.ui.open = S.ui.open || {};
  S.pos = {results:{page:0, list:0}, ...(S.pos || {})};
  let ERR = null;          // {scope, field, text}: the current validation or compare message; never saved
  let lastAnnounce = '';
  const save = () => {try {localStorage.setItem(KEY, JSON.stringify(S));} catch (_) {}};

  /* ---------- small helpers ---------- */
  const $ = s => document.querySelector(s);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const norm = x => String(x ?? '').toLowerCase().trim();
  const find = (kind, id) => D[kind].find(x => x.id === id);
  const list = x => `<ul>${x.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`;
  const link = (route, text, cls = '') => `<a href="#${route}"${cls ? ` class="${cls}"` : ''}>${esc(text)}</a>`;
  const button = (text, action, extra = '', cls = 'secondary') => `<button type="button" class="button ${cls}" data-action="${action}" ${extra}>${esc(text)}</button>`;
  const unavailable = text => `<button type="button" class="link-button" data-unavailable="${esc(text)}">${esc(text)}</button>`;
  const rootEl = () => document.documentElement || document.body;
  const announce = text => {lastAnnounce = text; $('#announcer').textContent = ''; setTimeout(() => {$('#announcer').textContent = text;}, 30);};
  const isOpen = (id, def = false) => S.ui.open[id] !== undefined ? S.ui.open[id] : def;
  const money = n => '$' + Number(n).toLocaleString('en-US');
  const money2 = n => '$' + Number(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});

  /* ---------- locations (one place defines what a location means) ---------- */
  const locate = text => D.locations.find(x => [x.label, ...x.aliases].some(v => norm(v) === norm(text)));
  const allArea = text => !norm(text) || ['virginia', 'va', 'all virginia'].includes(norm(text));
  const validArea = text => allArea(text) || !!locate(text);
  const areaLabel = text => allArea(text) ? 'All Virginia' : locate(text)?.label || text;
  const canonCity = text => allArea(text) ? '' : (locate(text)?.label || String(text).trim());
  function distance(a, b) {const rad = v => v * Math.PI / 180; const dlat = rad(b.lat - a.lat), dlon = rad(b.lon - a.lon); const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlon / 2) ** 2; return 3958.8 * 2 * Math.asin(Math.sqrt(h));}
  // radius === null: the record must be in exactly that city. Otherwise: straight-line miles between approximate city centers.
  const cityMatch = (city, query, radius = null) => {if (allArea(query)) return true; const a = locate(city), b = locate(query); return !!a && !!b && (radius === null ? a.id === b.id : distance(a, b) <= Number(radius));};
  const dataList = () => `<datalist id="cities">${D.locations.map(x => `<option value="${esc(x.label)}"></option>`).join('')}<option value="Virginia"></option></datalist>`;
  const locationHelp = `<button type="button" class="link-button" data-dialog="locations">See supported locations</button>`;

  /* ---------- filtering, pay, sorting ---------- */
  const termsMatch = (text, q) => norm(q).split(/\s+/).filter(Boolean).every(t => norm(text).includes(t));
  const hourly = (amount, unit) => unit === 'year' ? amount / 2080 : amount;       // annual pay / 2,080 hours; used only to compare and sort
  function filterJobs(c) {return D.jobs.filter(j => termsMatch([j.title, j.employer, ...j.keywords].join(' '), c.q) && cityMatch(j.city, c.city, c.radius) && (!c.type || j.type === c.type) && (!c.schedule || j.schedule === c.schedule) && (!c.occupation || j.occupationId === c.occupation) && (!c.education || j.education === c.education) && (!c.source || j.source === c.source) && (!c.work || j.workArrangement === c.work) && (!c.days || j.postedDays <= Number(c.days)) && (j.payMin === null ? c.unknown : !c.pay || hourly(j.payMax ?? j.payMin, j.payUnit) >= hourly(Number(c.pay), c.unit)));}
  const filterProviders = c => D.providers.filter(p => termsMatch(p.name, c.q) && cityMatch(p.city, c.city) && (!c.type || p.type === c.type));
  const filterPrograms = c => D.programs.filter(p => termsMatch(p.title, c.q) && cityMatch(p.city, c.city) && (!c.provider || p.providerId === c.provider) && (!c.occupation || (p.occupationIds || []).includes(c.occupation)) && (!c.qualification || p.qualification === c.qualification) && (!c.cost || p.cost <= Number(c.cost)) && (!c.schedule || p.schedule === c.schedule) && (!c.format || p.format === c.format));
  const FILTER = {jobs:filterJobs, providers:filterProviders, programs:filterPrograms};

  const unitWord = u => u === 'year' ? 'year' : 'hour';
  const pay = j => j.payMin === null ? 'Not provided' : `${money(j.payMin)}${j.payMax !== j.payMin ? '–' + money(j.payMax) : ''}/${unitWord(j.payUnit)}`;
  const isRange = j => j.payMin !== null && j.payMin !== j.payMax;
  const hourlyEquivalent = j => j.payMin === null || j.payUnit !== 'year' ? '' : `about ${money2(hourly(j.payMin, 'year'))}${isRange(j) ? '–' + money2(hourly(j.payMax, 'year')) : ''}/hour equivalent (annual pay ÷ 2,080 hours)`;
  const payNote = j => j.payMin === null ? 'The listing gives no pay information.' : isRange(j) ? 'Listed range; the rate actually offered is not specified.' : '';
  const scheduleText = j => j.schedule || 'Not provided';
  const applyBase = j => j.applyMethod === 'account' ? 'Virginia Workforce Connection account' : 'Employer’s own application site';
  // How a job's pay relates to the minimum the user applied. Only used when a minimum pay has been applied.
  function payMatch(j, c) {
    if (!c || c.pay === '' || c.pay == null) return null;
    if (j.payMin === null) return {kind:'unknown', text:'Pay not provided: cannot be checked against your minimum pay.'};
    const min = hourly(Number(c.pay), c.unit), lo = hourly(j.payMin, j.payUnit), hi = hourly(j.payMax, j.payUnit);
    if (lo >= min) return {kind:'full', text:isRange(j) ? 'The whole listed range is at or above your minimum pay; the rate offered still needs confirming.' : 'The listed pay is at or above your minimum pay.'};
    if (hi >= min) return {kind:'upper', text:'Reaches your minimum pay only at the top of the listed range; the rate offered may be lower.'};
    return {kind:'below', text:'Below your minimum pay.'};
  }
  function sortJobs(rows, c, mode) {
    const q = norm(c && c.q), terms = q.split(/\s+/).filter(Boolean);
    const occ = j => norm(find('occupations', j.occupationId)?.title);
    const score = j => {if (!terms.length) return 0; const t = norm(j.title), kw = j.keywords.map(norm), e = norm(j.employer), o = occ(j); let s = t.includes(q) ? 3 : 0; terms.forEach(x => {if (t.includes(x)) s += 4; if (o.includes(x)) s += 2; if (kw.includes(x)) s += 2; if (e.includes(x)) s += 1;}); return s;};
    const rate = j => j.payMin === null ? null : hourly(j.payMax ?? j.payMin, j.payUnit);
    const tie = (a, b) => a.postedDays - b.postedDays || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    const f = mode === 'pay' ? (a, b) => {const x = rate(a), y = rate(b); return (x === null) - (y === null) || (y ?? 0) - (x ?? 0) || tie(a, b);} : mode === 'recent' ? tie : (a, b) => score(b) - score(a) || tie(a, b);
    return rows.slice().sort(f);
  }
  const sortNote = 'Best match ranks by keyword matches (title, occupation, related keywords, employer); with no keyword it falls back to most recent. Ties: most recent, then title A–Z. Highest listed pay compares the upper end of a range as an hourly equivalent (annual ÷ 2,080); listings without pay are placed last.';

  /* ---------- conditions: one description of every criterion, used for summaries, “kept” notes and recovery hints ---------- */
  const F = {
    jobs:[
      {f:['q'], on:c => c.q !== '', label:c => `Keyword “${c.q}”`, patch:{q:''}},
      {f:['city', 'radius'], on:c => c.city !== '', label:c => `${areaLabel(c.city)}, ${Number(c.radius) ? c.radius + ' miles' : 'exact city'} (straight-line)`, patch:{city:''}},
      {f:['type'], on:c => c.type !== '', label:c => c.type, patch:{type:''}},
      {f:['pay', 'unit'], on:c => c.pay !== '', label:c => `Minimum pay ${money(c.pay)}/${unitWord(c.unit)}`, patch:{pay:''}},
      {f:['unknown'], on:c => c.unknown === false, label:() => 'Listings without pay excluded', patch:{unknown:true}},
      {f:['schedule'], on:c => c.schedule !== '', label:c => `Schedule: ${c.schedule} only`, patch:{schedule:''}},
      {f:['days'], on:c => c.days !== '', label:c => `Posted in the last ${c.days === '1' ? '24 hours' : c.days + ' days'}`, patch:{days:''}},
      {f:['occupation'], on:c => c.occupation !== '', label:c => `Occupation: ${find('occupations', c.occupation)?.title}`, patch:{occupation:''}},
      {f:['education'], on:c => c.education !== '', label:c => `Education: ${c.education}`, patch:{education:''}},
      {f:['source'], on:c => c.source !== '', label:c => `Source: ${c.source}`, patch:{source:''}},
      {f:['work'], on:c => c.work !== '', label:c => c.work, patch:{work:''}}
    ],
    providers:[
      {f:['q'], on:c => c.q !== '', label:c => `Name “${c.q}”`, patch:{q:''}},
      {f:['city'], on:c => c.city !== '', label:c => `Provider location: ${areaLabel(c.city)}`, patch:{city:''}},
      {f:['type'], on:c => c.type !== '', label:c => `Type: ${c.type}`, patch:{type:''}}
    ],
    programs:[
      {f:['q'], on:c => c.q !== '', label:c => `Title “${c.q}”`, patch:{q:''}},
      {f:['city'], on:c => c.city !== '', label:c => `Training location: ${areaLabel(c.city)}`, patch:{city:''}},
      {f:['provider'], on:c => c.provider !== '', label:c => `Provider: ${find('providers', c.provider)?.name}`, patch:{provider:''}},
      {f:['occupation'], on:c => c.occupation !== '', label:c => `Occupation: ${find('occupations', c.occupation)?.title}`, patch:{occupation:''}},
      {f:['qualification'], on:c => c.qualification !== '', label:c => c.qualification, patch:{qualification:''}},
      {f:['cost'], on:c => c.cost !== '', label:c => `Maximum cost ${money(c.cost)}`, patch:{cost:''}},
      {f:['schedule'], on:c => c.schedule !== '', label:c => `${c.schedule} classes`, patch:{schedule:''}},
      {f:['format'], on:c => c.format !== '', label:c => c.format, patch:{format:''}}
    ]
  };
  // Conditions that, if removed on their own, would give at least one result. Used when a search is empty.
  function relaxHints(kind, a) {
    return F[kind].filter(d => d.on(a)).map(d => ({label:d.label(a), patch:d.patch, count:FILTER[kind]({...a, ...d.patch}).length})).filter(h => h.count > 0).sort((x, y) => y.count - x.count);
  }

  /* ---------- draft / applied ---------- */
  // Applied criteria are stored in a canonical form so that “richmond” and “Richmond, VA” count as the same search.
  function canon(kind, c) {
    const o = clone(c); o.q = String(o.q ?? '').trim(); o.city = canonCity(o.city);
    if (kind === 'jobs') {if (!o.city) o.radius = defaults.jobs.radius; o.pay = String(o.pay ?? '').trim();}
    if (kind === 'programs') o.cost = String(o.cost ?? '').trim();
    return o;
  }
  const isPending = kind => {const a = S[APPLIED[kind]]; return !a || !same(canon(kind, S[kind]), a);};
  const setDraft = (kind, patch) => {Object.assign(S[kind], patch); save();};
  const resetDraft = kind => {S[kind] = clone(defaults[kind]); ERR = null; save();};   // draft only: results, selections and sort are untouched
  function validateDraft(kind) {
    const c = S[kind];
    if (!validArea(c.city)) return {field:'city', text:`“${String(c.city).trim()}” is not a supported location. Choose a city from the suggestions, enter a listed ZIP code, or enter Virginia (or leave the field blank) to search all Virginia. Your previous results have not changed.`};
    if (kind === 'jobs' && String(c.pay).trim() !== '' && (!Number.isFinite(Number(c.pay)) || Number(c.pay) < 0)) return {field:'pay', text:'Minimum pay must be a number that is zero or more. Correct it or leave it blank. Your previous results have not changed.'};
    if (kind === 'programs' && String(c.cost).trim() !== '' && (!Number.isFinite(Number(c.cost)) || Number(c.cost) < 0)) return {field:'cost', text:'Maximum cost must be a number that is zero or more. Correct it or leave it blank. Your previous results have not changed.'};
    return null;
  }
  const jobLabel = id => {const j = find('jobs', id); return j ? `${j.title} at ${j.employer}` : id;};
  // The only function that copies draft -> applied. Invalid input returns early and leaves the applied search intact.
  function applyDraft(kind) {
    const err = validateDraft(kind);
    if (err) {ERR = {scope:kind, ...err}; return {ok:false, error:err};}
    ERR = null;
    const key = APPLIED[kind], next = canon(kind, S[kind]), changed = !S[key] || !same(S[key], next);
    S[kind] = clone(next); S[key] = clone(next);
    let removed = [];
    if (changed) {
      S.ctx[kind] = null;
      if (kind === 'jobs') {
        const ok = new Set(filterJobs(next).map(j => j.id));
        removed = S.selected.filter(i => !ok.has(i));
        S.selected = S.selected.filter(i => ok.has(i));
        S.note = removed.length ? `Removed from your comparison because they no longer match this search: ${removed.map(jobLabel).join('; ')}.` : '';
        if (S.selected.length !== 2) S.compare = false;
        S.pos.results = {page:0, list:0};
      }
    }
    save();
    return {ok:true, changed, removed};
  }
  // A contextual link sets only the conditions it names. Every other applied condition is kept, and the note says which.
  // Unapplied edits in the form are not carried: the link starts a new search from the last applied search.
  function startContext(kind, patch, text) {
    const base = S[APPLIED[kind]] ? clone(S[APPLIED[kind]]) : clone(defaults[kind]);
    const kept = F[kind].filter(d => d.on(base) && !d.f.some(k => k in patch)).map(d => d.label(base));
    const discarded = !same(canon(kind, S[kind]), canon(kind, base));
    S[kind] = {...base, ...patch};
    const r = applyDraft(kind);
    if (!r.ok) {S[kind] = {...clone(defaults[kind]), ...patch}; applyDraft(kind);}
    S.ctx[kind] = {text:text + (kept.length ? ` Kept from your previous search: ${kept.join('; ')}.` : '') + (discarded ? ' Unapplied edits in the form were not carried over.' : ''), patch, kept:kept.length};
    save();
    return r;
  }
  const areaCity = () => allArea(S.occApplied) ? '' : locate(S.occApplied).label;
  function relatedJobs(occId) {
    const o = find('occupations', occId), city = areaCity();
    return startContext('jobs', {occupation:occId, city}, `Jobs for ${o.title}${city ? ' near ' + city : ' in all Virginia'}, using the area you chose on Explore occupations.`);
  }
  function relatedTraining(occId) {
    const o = find('occupations', occId), city = areaCity();
    return startContext('programs', {occupation:occId, city}, `Training programs linked to ${o.title} in the sample data${city ? ', delivered in ' + city : ' (any location)'}, using the area you chose on Explore occupations.`);
  }
  const providerPrograms = id => startContext('programs', {provider:id}, `Programs listed for ${find('providers', id).name}.`);
  function ctxFresh(kind) {
    const c = S.ctx[kind]; if (!c) return;
    S[kind] = {...clone(defaults[kind]), ...c.patch}; applyDraft(kind);
    S.ctx[kind] = {text:'New search with only the condition you chose. Earlier conditions were cleared.', patch:c.patch, kept:0}; save();
  }

  /* ---------- comparison selection ---------- */
  function toggleCompare(id, want) {
    const has = S.selected.includes(id); want = want === undefined ? !has : want;
    if (want && !has) {
      if (S.selected.length >= 2) {ERR = {scope:'compare', text:'You can compare two jobs at a time. Remove one selected job before adding another.'}; return {ok:false};}
      S.selected = [...S.selected, id];
    }
    if (!want && has) S.selected = S.selected.filter(x => x !== id);
    if (S.selected.length !== 2) S.compare = false;
    S.note = ''; ERR = null; save(); return {ok:true};
  }

  /* ---------- summaries and status ---------- */
  const status = (summary, pending) => `<div class="status-box"><div class="status-summary"><strong>Applied:</strong> ${summary}</div><span class="status-pill ${pending ? 'pending' : ''}">${pending ? 'Changes not applied' : 'Search up to date'}</span></div>`;
  function draftText(kind) {const applied = S[APPLIED[kind]]; return !applied ? 'No search has been run yet. Search applies all criteria.' : isPending(kind) ? 'Changes not applied. Choose Update results to apply them; the results shown still reflect your last applied search.' : 'Search up to date. The criteria above match the results shown.';}
  const draftStatus = kind => `<p class="draft-status" id="draft-status" aria-live="polite">${draftText(kind)}</p>`;
  const jobSummary = c => `${esc(c.q || 'Any keyword')} · ${esc(areaLabel(c.city))}${allArea(c.city) ? '' : ` — ${Number(c.radius) ? esc(c.radius) + ' miles (straight-line)' : 'exact city'}`} · ${esc(c.type || 'Any employment type')}<br>Minimum pay: ${c.pay ? money(c.pay) + '/' + unitWord(c.unit) : 'Any'} · ${c.unknown ? 'Pay not listed included' : 'Pay not listed excluded'} · Schedule: ${esc(c.schedule || 'Any')}${c.schedule ? ' (listings without a schedule excluded)' : ''}${c.occupation ? ` · ${esc(find('occupations', c.occupation).title)}` : ''}${c.days ? ` · Last ${c.days === '1' ? '24 hours' : esc(c.days) + ' days'}` : ''}${c.education ? ' · ' + esc(c.education) : ''}${c.source ? ' · ' + esc(c.source) : ''}${c.work ? ' · ' + esc(c.work) : ''}`;
  const providerSummary = c => `Name: ${esc(c.q || 'Any')} · Provider location: ${esc(areaLabel(c.city))} · Type: ${esc(c.type || 'Any')}`;
  const programSummary = c => `Title: ${esc(c.q || 'Any')} · Training location: ${esc(areaLabel(c.city))} · Provider: ${esc(find('providers', c.provider)?.name || 'Any')}${c.occupation ? ' · Occupation: ' + esc(find('occupations', c.occupation)?.title) : ''} · Qualification: ${esc(c.qualification || 'Any')}${c.cost ? ' · Maximum cost: ' + money(c.cost) : ''}${c.schedule ? ' · ' + esc(c.schedule) : ''}${c.format ? ' · ' + esc(c.format) : ''}`;
  const ctxNote = kind => {const c = S.ctx[kind]; return c ? `<div class="notice context-note" role="status"><p>${esc(c.text)}</p>${c.kept ? `<button type="button" class="button text small" data-action="ctx-fresh" data-kind="${kind}">Search with only the new condition</button>` : ''}</div>` : '';};

  /* ---------- form building blocks ---------- */
  const bad = name => ERR && ERR.field === name;
  const input = (name, label, value = '', placeholder = '', help = '', attrs = '') => `<div class="field"><label for="${name}">${esc(label)}</label><input id="${name}" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${bad(name) ? 'aria-invalid="true" aria-describedby="form-error"' : ''} ${attrs}>${help ? `<small>${esc(help)}</small>` : ''}</div>`;
  const options = (values, current) => values.map(v => {const [val, txt] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(val)}" ${String(val) === String(current) ? 'selected' : ''}>${esc(txt)}</option>`;}).join('');
  const select = (name, label, values, current, help = '') => `<div class="field"><label for="${name}">${esc(label)}</label><select id="${name}" name="${name}">${options(values, current)}</select>${help ? `<small>${esc(help)}</small>` : ''}</div>`;
  const check = (name, label, value) => `<label class="check"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}>${esc(label)}</label>`;
  const errorBox = scope => `<div id="form-error" class="error" role="alert">${ERR && ERR.scope === scope ? esc(ERR.text) : ''}</div>`;
  const group = (id, title, count, body, def = false) => `<details class="disclosure" data-disc="${id}" ${isOpen(id, def) ? 'open' : ''}><summary>${title}${count ? ` <span class="filter-count">${count} set</span>` : ''}</summary><div class="disclosure-content">${body}</div></details>`;
  const chip = (label, value, extra = '') => `<div class="provider-chip"><span><strong>${label}:</strong> ${esc(value)}</span><span class="chip-actions">${extra}</span></div>`;

  /* ---------- pages: shared pieces ---------- */
  const crumbs = items => `<nav class="breadcrumb" aria-label="Breadcrumb">${link('home', 'Home')}${items.map(x => `<span aria-hidden="true">/</span>${Array.isArray(x) ? link(x[0], x[1]) : `<span aria-current="page">${esc(x)}</span>`}`).join('')}</nav>`;
  const heading = (title, sub = '', items = []) => `${crumbs(items.length ? items : [title])}<h1>${esc(title)}</h1>${sub ? `<p class="intro">${esc(sub)}</p>` : ''}`;
  const empty = (title, text) => `<div class="empty"><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;
  const missing = () => `${heading('Page not found')}${empty('This page is not available', 'Return Home and choose a service.')}${link('home', 'Return Home', 'button')}`;
  const unavailableNotice = name => {const h = $('#main h1')?.textContent || 'the page you were on'; modal(name, `<p>This service is not implemented in this prototype.</p><p>Closing this message returns you to <strong>${esc(h)}</strong>. Your searches, selections and criteria are unchanged.</p><p>${link('home', 'Go to Home instead')}</p>`);};
  let opener = null;
  const modal = (title, body) => {opener = document.activeElement || null; $('#dialog-content').innerHTML = `<h2>${esc(title)}</h2>${body}`; if (!$('#dialog').open) $('#dialog').showModal();};

  /* ---------- Home ---------- */
  function home() {return `<section class="hero"><h1>Find jobs</h1><form id="home-search" class="home-search" novalidate>${input('home-q', 'Job title or keyword', '', 'Job title or keyword')}${input('home-city', 'City or ZIP code', '', 'City or ZIP code', '', 'list="cities"')}<button class="button">Search jobs</button></form><p id="home-error" class="error" role="alert"></p><p class="small muted hero-note">Jobs are found within 25 miles of the location you enter (straight-line distance between approximate city centers, not driving distance). Leave the location blank to search all Virginia. ${locationHelp}</p>${link('jobs', 'Detailed job search', 'hero-more')}</section><section class="welcome"><h2>New to VAWC?</h2><button class="link-button intro-link" data-dialog="intro">★ Explore Virginia Workforce Connection</button></section><div class="home-grid"><section class="home-group"><h2>Job Services</h2><h3>For job seekers</h3>${link('jobs', 'Find a job')}${unavailable('Create a résumé')}<h3>For employers</h3>${unavailable('Find a candidate')}${unavailable('Post a job opening')}${unavailable('Employer incentives')}</section><section class="home-group"><h2>Training & Education</h2>${link('programs', 'Training programs')}${link('providers', 'Training providers')}${link('training', 'View all training & education')}${unavailable('Training for employers')}${unavailable('Workforce Innovation and Opportunity Act (WIOA)')}</section><section class="home-group"><h2>Careers & Labor Market</h2>${link('occupations', 'Explore occupations')}${unavailable('Virginia labor market information')}${unavailable('Community profiles')}${unavailable('Labor force data')}${unavailable('Labor market publications')}${unavailable('Labor market services')}</section><section class="home-group"><h2>Workforce Resources</h2>${unavailable('Unemployment insurance (VEC)')}${unavailable('Virginia workforce centers')}${unavailable('State workforce board')}${unavailable('Local workforce boards')}</section><section class="home-group"><h2>Veterans Services</h2>${unavailable('Helmets to Hardhats')}${unavailable('Transition assistance')}${unavailable('Troops to Teachers')}${unavailable('Veteran services at Virginia Works')}${unavailable('Virginia veterans network')}</section></div>${dataList()}`;}

  /* ---------- Occupations ---------- */
  const areaNote = () => `<p class="small muted area-note">Related jobs and training use the area <strong>${esc(areaLabel(S.occApplied))}</strong>.</p>`;
  function occContent(o, full = false) {return `<span class="badge">Occupation</span><h2>${esc(o.title)}</h2><p class="small muted general-note">General occupational information. Duties, skills and preparation are the same in every area; this prototype holds no regional wage or demand data.</p><p>${esc(o.summary)}</p><h3>Typical work</h3>${list(o.duties)}<h3>Relevant skills</h3>${list(o.skills)}${full ? `<h3>Typical preparation</h3><p>${esc(o.qualifications)}</p>` : link('occupation/' + o.id, 'View full occupation profile')}<div class="actions" style="margin-top:22px">${button('Explore training', 'occ-training', `data-id="${o.id}"`)}${button('Find related jobs', 'occ-jobs', `data-id="${o.id}"`)}</div>${areaNote()}`;}
  function occupations() {
    const matches = D.occupations.filter(o => S.occMode === 'group' ? termsMatch(o.group, S.occQuery) : termsMatch(o.title, S.occQuery));
    const groups = [...new Set(matches.map(o => o.group))];
    const selected = matches.find(o => o.id === S.occSelected);
    const modeBtn = ([id, label]) => `<button type="button" data-action="occ-mode" data-mode="${id}" aria-pressed="${S.occMode === id}">${label}</button>`;
    return `${heading('Explore occupations', 'Select an occupation to review its work activities and skills.', ['Explore occupations'])}<div class="segmented" role="group" aria-label="Occupation list view">${[['name', 'Search by occupation name'], ['group', 'Browse occupation groups'], ['directory', 'Occupation directory']].map(modeBtn).join('')}</div><details class="disclosure" data-disc="occ-methods"${isOpen('occ-methods') ? ' open' : ''}><summary>Other search methods</summary><div class="disclosure-content actions">${['By education program', 'By military specialty', 'By occupation code', 'By license'].map(unavailable).join('')}</div></details><form id="occ-area" class="location-row" novalidate>${input('occ-area-input', 'Area for related jobs and training', S.occArea, 'City or ZIP code', 'Used when you choose Find related jobs or Explore training. It does not change the occupation information.', 'list="cities"')}<button class="button secondary" id="occ-area-submit">Update area</button><div class="applied-area"><strong>Applied area: ${esc(areaLabel(S.occApplied))}</strong><br><span id="occ-area-status">${S.occArea === S.occApplied ? 'Area up to date' : 'Changes not applied'}</span></div><div class="error" id="occ-error" role="alert">${ERR && ERR.scope === 'occ' ? esc(ERR.text) : ''}</div><p class="small muted area-scope">Duties, skills and preparation are general and do not change with area. The area sets the job search center (within 25 miles, straight-line) and the delivery city for training programs. ${locationHelp}</p></form><div class="two-cols"><section class="panel"><h2 class="panel-title">${S.occMode === 'group' ? 'Occupation groups' : 'Occupations'}</h2>${S.occMode !== 'directory' ? `<form id="occ-filter" class="occupation-filter actions" novalidate>${input('occ-q', S.occMode === 'group' ? 'Filter groups by name' : 'Occupation name', S.occQuery, S.occMode === 'group' ? 'Group name' : 'Occupation title or keyword')}<button class="button small secondary">${S.occMode === 'group' ? 'Filter groups' : 'Search'}</button></form>` : ''}<div class="occupation-list">${matches.length ? (S.occMode === 'group' ? groups.map(g => `<details class="occupation-group" open><summary>${esc(g)}</summary>${matches.filter(o => o.group === g).map(o => `<button type="button" data-action="occ-select" data-id="${o.id}" class="${selected?.id === o.id ? 'active' : ''}" aria-pressed="${selected?.id === o.id}">${esc(o.title)}</button>`).join('')}</details>`).join('') : `<div class="occupation-group">${[...matches].sort((a, b) => a.title.localeCompare(b.title)).map(o => `<button type="button" data-action="occ-select" data-id="${o.id}" class="${selected?.id === o.id ? 'active' : ''}" aria-pressed="${selected?.id === o.id}">${esc(o.title)}</button>`).join('')}</div>`) : empty('No occupations found', 'Try a broader term or browse all occupation groups.')}<div class="actions" style="padding:12px">${button('View all occupations', 'occ-all', '', 'text')}</div></div></section><section class="panel"><h2 class="panel-title">Selected occupation</h2><div class="occupation-preview">${selected ? occContent(selected) : `<p>Select an occupation from the list to review its duties and skills.</p>`}</div></section></div>${dataList()}`;
  }
  function occupationDetail(id) {const o = find('occupations', id); if (!o) return missing(); return `${heading(o.title, '', [['occupations', 'Explore occupations'], 'Occupation profile'])}<div class="panel"><div class="panel-body prose">${occContent(o, true)}</div></div><p class="footer-links">${link('occupations', 'Back to explore occupations')}</p>`;}

  /* ---------- Training ---------- */
  function training() {return `${heading('Training & Education', 'Choose what you want to find.')}<div class="two-cols training-tiles"><section class="panel"><h2 class="panel-title">Training providers & schools</h2><div class="panel-body"><p class="muted">Organizations</p><p>Find schools and organizations that offer training.</p><div class="actions">${link('providers', 'Find providers', 'button')}</div></div></section><section class="panel"><h2 class="panel-title">Training programs</h2><div class="panel-body"><p class="muted">Courses and training</p><p>Find courses that build skills or prepare you for a qualification.</p><div class="actions">${link('programs', 'Find programs', 'button')}</div></div></section></div><div class="three-cols" style="margin-top:24px">${[['Funding & support', ['Financial assistance', 'Scholarships', 'ETPL-approved programs']], ['Learning resources', ['Online learning resources', 'Program Finder']], ['Education data', ['Education profile information', 'Program completion statistics']]].map(([title, links]) => `<section class="panel"><h2 class="panel-title">${title}</h2><div class="panel-body"><ul class="resource-list">${links.map(t => `<li>${unavailable(t)}</li>`).join('')}</ul></div></section>`).join('')}</div><p class="footer-links">${link('home', 'Return to Home')}</p>`;}
  const trainingTabs = active => `<nav class="method-tabs" aria-label="Training search type">${link('providers', 'Providers & schools', '')}${link('programs', 'Training programs', '')}</nav>`.replace(new RegExp(`(href="#${active}")`), '$1 aria-current="page"');
  function recovery(kind, noun) {
    const a = S[APPLIED[kind]], hints = relaxHints(kind, a), one = {jobs:'job', providers:'provider', programs:'program'}[kind];
    return `<div class="empty recovery"><h2>No ${noun} match these criteria</h2><p>Nothing matches every condition in the applied search. Change the criteria above, then choose Update results.</p>${hints.length ? `<h3>Conditions you could remove</h3><ul class="hint-list">${hints.map(h => `<li><span>${esc(h.label)} — <strong>${h.count}</strong> matching ${h.count === 1 ? one : one + 's'}</span> <button type="button" class="button text small" data-action="drop-criterion" data-kind="${kind}" data-patch="${esc(JSON.stringify(h.patch))}">Remove from form</button></li>`).join('')}</ul><p class="small muted">Removing a condition only changes the form. Results do not change until you choose Update results.</p>` : `<p>Removing any single condition still gives no matches. Try Reset criteria, then Update results.</p>`}</div>`;
  }
  const submitLabel = (kind, first) => S[APPLIED[kind]] ? 'Update results' : first;
  const resetHelp = '<p class="small muted reset-help">Reset criteria clears the fields above only. Results stay as they are until you choose Update results.</p>';
  function providerCard(p) {return `<article class="list-card"><span class="badge">Organization</span><h3>${link('provider/' + p.id, p.name)}</h3><p><strong>Provider location:</strong> ${esc(p.city)} · <strong>Type:</strong> ${esc(p.type)}</p><p>${esc(p.description)}</p><div class="actions">${link('provider/' + p.id, 'View provider details', 'button')}${button('View programs from this provider', 'provider-programs', `data-id="${p.id}" data-fk="pp-${p.id}"`)}</div></article>`;}
  function providers() {
    const c = S.providers, a = S.providerApplied, rows = a ? filterProviders(a) : [];
    return `${heading('Find training providers & schools', 'Search for organizations that offer training.', [['training', 'Training & Education'], 'Providers'])}${trainingTabs('providers')}<form id="providers-form" data-kind="providers" class="form-box" novalidate><h2 class="form-title">Search criteria</h2>${errorBox('providers')}<div class="form-row">${input('q', 'Provider name (optional)', c.q, 'Provider name', 'Searches organization names only. Leave blank to browse.')}${input('city', 'Provider location (where the organization is based)', c.city, 'City or ZIP code', 'Matches the city exactly (no radius). Leave blank to search all Virginia.', 'list="cities"')}</div><p class="small muted loc-help">${locationHelp}</p><div class="form-row">${select('type', 'Provider type', [['', 'Any provider type'], ...new Set(D.providers.map(p => p.type))], c.type)}</div><details class="disclosure" data-disc="prov-more"${isOpen('prov-more') ? ' open' : ''}><summary>Ownership & eligibility filters</summary><div class="disclosure-content"><p>Additional provider filters</p><div class="actions">${unavailable('Ownership')}${unavailable('WIOA eligibility')}</div></div></details><div class="form-actions"><button class="button" id="update-results">${submitLabel('providers', 'Search providers')}</button>${button('Reset criteria', 'reset', 'data-kind="providers"', 'text')}</div>${resetHelp}${draftStatus('providers')}</form>${a ? `${status(providerSummary(a), isPending('providers'))}<h2>Provider results <span class="small muted">${rows.length} organization${rows.length === 1 ? '' : 's'}</span></h2>${rows.length ? rows.map(providerCard).join('') : recovery('providers', 'providers')}` : empty('Find a training organization', 'Choose any criteria above, then search to browse providers.')}<p class="footer-links">${link('training', 'Back to Training & Education')}</p>${dataList()}`;
  }
  function providerDetail(id) {
    const p = find('providers', id); if (!p) return missing();
    return `${heading(p.name, '', [['training', 'Training & Education'], ['providers', 'Providers'], p.name])}<section class="panel"><h2 class="panel-title">Training provider & school</h2><div class="panel-body"><span class="badge">Organization</span><p style="margin-top:15px">${esc(p.description)}</p><dl class="facts"><div><dt>Provider location</dt><dd>${esc(p.city)}</dd></div><div><dt>Provider type</dt><dd>${esc(p.type)}</dd></div></dl><h3>Listed training</h3><ul>${p.programIds.map(pid => {const g = find('programs', pid); return `<li>${link('program/' + pid, g.title)} — delivered in ${esc(g.city)}${g.city !== p.city ? ' (not the provider’s location)' : ''}</li>`;}).join('')}</ul><p>Each program lists its own training location, format, cost and schedule, and these can differ from the provider’s location. Contact the provider to confirm current availability and enrollment dates.</p><div class="actions">${button('View programs from this provider', 'provider-programs', `data-id="${p.id}"`, '')}${button('Contact provider', 'unavailable', 'data-name="Provider contact"')}</div></div></section><p class="footer-links">${link('providers', 'Back to provider results')}</p>`;
  }
  function programCard(p) {const provider = find('providers', p.providerId), differs = provider.city !== p.city; return `<article class="list-card"><span class="badge">Training program</span><h3>${link('program/' + p.id, p.title)}</h3><p><strong>Provider:</strong> ${esc(provider.name)} · <strong>Provider location:</strong> ${esc(provider.city)}</p><p><strong>Training location:</strong> ${esc(p.city)}${differs ? ' <span class="loc-diff">differs from the provider’s location</span>' : ''} · ${esc(p.format)} · ${esc(p.schedule)}</p><p>${esc(p.description)}</p><p><strong>Current enrollment:</strong> ${esc(p.availability)}</p><div class="actions">${link('program/' + p.id, 'View program details', 'button')}${link('provider/' + p.providerId, 'View provider', 'button secondary')}</div></article>`;}
  function programs() {
    const c = S.programs, a = S.programApplied, rows = a ? filterPrograms(a) : [];
    const n = [c.cost, c.schedule, c.format].filter(Boolean).length;
    return `${heading('Find training programs', 'Search for courses and training offered by providers.', [['training', 'Training & Education'], 'Programs'])}${trainingTabs('programs')}${ctxNote('programs')}<form id="programs-form" data-kind="programs" class="form-box" novalidate><h2 class="form-title">Search criteria</h2>${errorBox('programs')}${c.occupation ? `<div class="provider-chip"><span><strong>Occupation:</strong> ${esc(find('occupations', c.occupation)?.title)}</span><span class="chip-actions">${link('occupation/' + c.occupation, 'Back to occupation profile')}${button('Remove occupation condition', 'remove-occupation', 'data-fk="rm-occ"', 'text')}</span></div><p class="small muted">You are searching training programs (courses), not organizations. Programs shown are linked to this occupation in the sample data; being listed does not confirm that a course is open for enrollment. ${link('providers', 'Search organizations instead')}</p>` : ''}${c.provider ? chip('Provider', find('providers', c.provider)?.name, button('Remove provider filter', 'remove-provider', 'data-fk="rm-prov"', 'text')) : ''}<div class="form-row">${input('q', 'Program title (optional)', c.q, 'Program title', 'Searches program names only. Leave blank to browse.')}${input('city', 'Training location (where the program is delivered)', c.city, 'City or ZIP code', 'Matches the city exactly (no radius). May differ from the provider’s location. Leave blank for all Virginia.', 'list="cities"')}</div><p class="small muted loc-help">${locationHelp}</p><div class="form-row">${select('qualification', 'Qualification', [['', 'Any qualification'], ...new Set(D.programs.map(p => p.qualification))], c.qualification)}</div>${group('prog-more', 'Cost, schedule & format', n, `<div class="form-row three">${input('cost', 'Maximum total cost', c.cost, 'Any cost', 'US dollars', `type="number" min="0" step="1"`)}${select('schedule', 'Class schedule', [['', 'Any schedule'], 'Daytime', 'Evening', 'Weekend'], c.schedule)}${select('format', 'Program format', [['', 'Any format'], 'In person', 'Online', 'Hybrid'], c.format)}</div>`)}<div class="form-actions"><button class="button" id="update-results">${submitLabel('programs', 'Search programs')}</button>${button('Reset criteria', 'reset', 'data-kind="programs"', 'text')}</div>${resetHelp}${draftStatus('programs')}</form>${a ? `${status(programSummary(a), isPending('programs'))}<h2>Program results <span class="small muted">${rows.length} program${rows.length === 1 ? '' : 's'}</span></h2>${rows.length ? rows.map(programCard).join('') : recovery('programs', 'programs')}` : empty('Find a course or training program', 'Enter a program title or leave it blank, then search.')}<p class="footer-links">${link('training', 'Back to Training & Education')}</p>${dataList()}`;
  }
  function programDetail(id) {
    const p = find('programs', id); if (!p) return missing();
    const pv = find('providers', p.providerId), differs = pv.city !== p.city;
    return `${heading(p.title, '', [['training', 'Training & Education'], ['programs', 'Programs'], p.title])}<section class="panel"><h2 class="panel-title">Training program</h2><div class="panel-body"><p>${esc(p.description)}</p><dl class="facts">${[['Provider', pv.name], ['Provider location', pv.city], ['Training location (where it is delivered)', p.city], ['Qualification', p.qualification], ['Listed total cost', money(p.cost)], ['Class schedule', p.schedule], ['Format', p.format]].map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${differs ? `<p class="notice">This program is delivered in ${esc(p.city)}, which is not the provider’s location (${esc(pv.city)}).</p>` : ''}<h3>Skills covered</h3>${list(p.skills)}<div class="notice"><strong>Current enrollment: ${esc(p.availability)}</strong><p style="margin:8px 0 0">Confirm the next course dates, available places, total fees, and admission requirements before enrolling.</p></div><div class="actions">${link('provider/' + p.providerId, 'View training provider', 'button')}${button('Contact provider', 'unavailable', 'data-name="Provider contact"')}</div></div></section><p class="footer-links">${link('programs', 'Back to program results')}</p>`;
  }

  /* ---------- Jobs: one form, used on Find jobs and on the results screen ---------- */
  function jobForm(where) {
    const c = S.jobs, onResults = where === 'results';
    const nPrefs = [c.type, c.pay, c.schedule].filter(Boolean).length + (c.unknown === false ? 1 : 0);
    const prefs = `<div class="form-row stack-fields">${select('type', 'Employment type', [['', 'Any type'], 'Full-time', 'Part-time'], c.type)}<div class="form-row pair">${input('pay', 'Minimum pay', c.pay, 'Any', '', 'type="number" min="0" step="0.01" inputmode="decimal"')}${select('unit', 'Pay period', [['hour', '$ per hour'], ['year', '$ per year']], c.unit)}</div>${select('schedule', 'Work schedule', [['', 'Any schedule'], 'Daytime', 'Evening'], c.schedule, 'Strict filter: a listing that does not state a schedule is left out when you choose Daytime or Evening.')}</div>${check('unknown', 'Include listings that do not state pay', c.unknown)}<p class="small muted">Checked: those listings stay in the results marked “Not provided” and are never counted as meeting a minimum pay. Unchecked: they are left out. A pay range matches a minimum when its upper end reaches it; the rate offered must still be confirmed. Annual and hourly pay are compared using 2,080 hours per year.</p>`;
    const posted = `<div class="form-row stack-fields">${select('days', 'Date posted', [['', 'Any date'], ['1', 'Last 24 hours'], ['7', 'Last 7 days'], ['30', 'Last 30 days']], c.days, 'Counted from the prototype’s fixed reference date.')}${select('occupation', 'Occupation', [['', 'Any occupation'], ...D.occupations.map(o => [o.id, o.title])], c.occupation)}</div>`;
    const more = `<div class="form-row stack-fields">${select('education', 'Education requirement', [['', 'Any education'], 'High school', 'Associate degree', 'Bachelor degree'], c.education, 'Filters listings by the education they ask for.')}${select('source', 'Listing source', [['', 'Any source'], 'Employer', 'Job board'], c.source)}${select('work', 'Work arrangement', [['', 'Any arrangement'], 'On-site', 'Hybrid', 'Remote'], c.work)}</div>`;
    const main = `<div class="form-row ${onResults ? 'four' : 'three'}">${input('q', 'Job title or keyword', c.q, 'Job title or keyword', 'Searches job titles, employers, and related keywords.')}${input('city', 'Job location: city or ZIP code', c.city, 'City or ZIP code', 'Center of the job search. Leave blank for all Virginia.', 'list="cities"')}${select('radius', 'Radius around that center', [['0', 'Exact city'], ['5', '5 miles'], ['10', '10 miles'], ['25', '25 miles'], ['50', '50 miles'], ['75', '75 miles'], ['100', '100 miles']], c.radius, 'Used only when a location is entered. Straight-line miles between approximate city centers; not driving distance.')}${onResults ? `<div class="field submit-field"><button class="button" id="update-results">Update results</button></div>` : ''}</div><p class="small muted loc-help">${locationHelp}</p>`;
    return `<form id="jobs-form" data-kind="jobs" class="form-box ${onResults ? 'on-results' : ''}" novalidate><h2 class="form-title">${onResults ? 'Refine search' : 'Search criteria'}</h2>${errorBox('jobs')}${c.occupation ? chip('Occupation', find('occupations', c.occupation)?.title, link('occupation/' + c.occupation, 'Back to occupation profile') + button('Remove occupation condition', 'remove-job-occupation', 'data-fk="rm-jocc"', 'text')) : ''}${main}<h3 class="section-title">Additional filters</h3><div class="disclosure-grid">${group('jobs-prefs', 'Employment type, pay & schedule', nPrefs, prefs, !onResults)}${group('jobs-posted', 'Date posted & occupation', [c.days, c.occupation].filter(Boolean).length, posted)}${group('jobs-more', 'Education, source & work arrangement', [c.education, c.source, c.work].filter(Boolean).length, more)}</div><div class="form-actions">${onResults ? '' : `<button class="button" id="update-results">Search jobs</button>`}${button('Reset criteria', 'reset', 'data-kind="jobs"', 'text')}${!onResults && S.jobApplied ? link('results', 'Return to current results') : ''}</div>${resetHelp}${draftStatus('jobs')}</form>`;
  }
  function jobs() {
    return `${heading('Find jobs', 'Start with a role and location. Other filters are optional.', ['Find jobs'])}<nav class="method-tabs" aria-label="Job search methods"><a href="#jobs" aria-current="page">Job search</a><button type="button" data-unavailable="Employer search">Employer search</button><button type="button" data-unavailable="Skills & résumé matching">Skills & résumé matching</button></nav><details class="disclosure" data-disc="job-methods"${isOpen('job-methods') ? ' open' : ''}><summary>Other search methods</summary><div class="disclosure-content actions">${unavailable('Search by education')}${unavailable('Search by job number')}</div></details>${ctxNote('jobs')}${jobForm('page')}${S.jobApplied ? status(jobSummary(S.jobApplied), isPending('jobs')) : ''}<div class="actions">${unavailable('Other job sites')}${unavailable('Jobs outside Virginia')}${link('home', 'Return to Home')}</div>${dataList()}`;
  }

  /* ---------- Job cards, details, comparison ---------- */
  function jobCard(j) {
    const shown = S.detail === j.id, m = payMatch(j, S.jobApplied), inCmp = S.selected.includes(j.id);
    return `<article class="job-card ${shown ? 'is-shown' : ''}" aria-labelledby="jt-${j.id}"><div class="card-top"><label class="check"><input type="checkbox" data-compare-id="${j.id}" ${inCmp ? 'checked' : ''} aria-label="Compare ${esc(j.title)} at ${esc(j.employer)}">Compare</label>${shown ? '<span class="card-flag">Shown in details</span>' : ''}</div><h3 id="jt-${j.id}"><button type="button" class="link-button title-button" data-action="select-job" data-id="${j.id}" data-fk="t-${j.id}" ${shown ? 'aria-current="true"' : ''}>${esc(j.title)}</button></h3><p class="card-meta">${esc(j.employer)}</p><p class="card-meta">${esc(j.city)} · ${esc(j.type)} · ${esc(j.source)}</p><p class="card-pay"><strong>${esc(pay(j))}</strong>${j.payMin !== null && isRange(j) ? ' <span class="small muted">(range)</span>' : ''}${j.payUnit === 'year' && j.payMin !== null ? `<br><span class="small muted">${esc(hourlyEquivalent(j))}</span>` : ''}</p>${m ? `<p class="match-note match-${m.kind}">${esc(m.text)}</p>` : ''}<p class="card-meta">Schedule: ${esc(scheduleText(j))}</p><p class="card-meta">Application: ${esc(applyBase(j))}</p><button type="button" class="button secondary small" data-action="select-job" data-id="${j.id}" data-fk="v-${j.id}">View job details<span class="sr-only"> for ${esc(j.title)} at ${esc(j.employer)}</span></button></article>`;
  }
  function confirmJob(j) {return [j.payMin === null ? 'Pay is not provided.' : j.payMin !== j.payMax ? 'Confirm the offered rate within the listed range.' : 'Confirm the stated pay.', !j.schedule ? 'Work schedule is not provided.' : 'Confirm the exact work hours.', 'Confirm current vacancy availability with the employer.'].join(' ');}
  const compareControl = j => {
    const inCmp = S.selected.includes(j.id), full = S.selected.length >= 2;
    return `<div class="compare-control"><span id="cc-${j.id}">${inCmp ? `In your comparison (${S.selected.length} of 2 selected).` : full ? 'Two jobs are already selected. Remove one to add this job.' : `${S.selected.length} of 2 jobs selected.`}</span> ${inCmp ? button('Remove from comparison', 'remove-compare', `data-id="${j.id}" data-fk="cc-rm-${j.id}"`, 'secondary small') : button('Add to comparison', 'add-compare', `data-id="${j.id}" data-fk="cc-add-${j.id}" ${full ? 'disabled' : ''} aria-describedby="cc-${j.id}"`, 'secondary small')}</div>`;
  };
  function applyText(j) {
    const who = esc(j.employer);
    return j.applyMethod === 'account'
      ? `Application method: a Virginia Workforce Connection account. You would normally sign in to, or create, an account and prepare the application there for ${esc(j.title)} at ${who}. Account steps are not available in this prototype.`
      : `Application method: ${who}’s own application site. You would normally leave this service for the employer’s application page, which may have its own account or upload steps. This prototype does not show that page or give a web address for this fictional employer.`;
  }
  function jobDetailContent(j) {
    const m = payMatch(j, S.jobApplied);
    return `<div class="detail-top"><div><span class="badge">Job opening</span><h2>${esc(j.title)}</h2><p class="detail-employer">${esc(j.employer)}</p><p class="small muted">${esc(j.city)} · Posted ${j.postedDays} day${j.postedDays === 1 ? '' : 's'} ago · Listing reference ${esc(j.id)}</p></div>${link('apply/' + j.id, 'How to apply', 'button')}</div><dl class="facts">${[['Pay', pay(j)], ['Employment', j.type], ['Schedule', scheduleText(j)], ['Work arrangement', j.workArrangement], ['Location', j.city], ['Listing source', j.source], ['Application method', applyBase(j)]].map(([k, v]) => `<div><dt>${k}</dt><dd class="${v === 'Not provided' ? 'missing' : ''}">${esc(v)}</dd></div>`).join('')}</dl>${j.payMin !== null ? `<p class="small muted pay-explain">${esc([payNote(j), hourlyEquivalent(j) ? 'Hourly equivalent: ' + hourlyEquivalent(j) + '.' : ''].filter(Boolean).join(' '))}</p>` : '<p class="small muted pay-explain">Pay is not provided. It is not treated as meeting any minimum pay.</p>'}${j.schedule ? '' : '<p class="small muted pay-explain">Schedule is not provided. It is not treated as daytime or evening.</p>'}${m ? `<p class="match-note match-${m.kind}">${esc(m.text)}</p>` : ''}${compareControl(j)}<div class="prose"><h3>Job description</h3><p>${esc(j.description)}</p><h3>Key duties</h3>${list(j.duties)}<h3>Qualifications</h3><p>${esc(j.qualifications)}</p><h3>Information to confirm</h3><p>${esc(confirmJob(j))}</p><h3>How to apply</h3><p>${applyText(j)}</p><div class="actions">${link('apply/' + j.id, 'How to apply', 'button')}${button('Employer information', 'unavailable', 'data-name="Employer information"', 'text')}</div></div>`;
  }
  const missingCell = v => v === 'Not provided';
  function comparison() {
    const js = S.selected.map(id => find('jobs', id)).filter(Boolean);
    if (js.length !== 2) return empty('Select two jobs to compare', 'Use the Compare checkboxes in the results list, then choose Compare selected.');
    const a = S.jobApplied, cell = (text, note = '') => ({text, note});
    const rows = [
      ['Employer', j => cell(j.employer)],
      ['Listing source', j => cell(j.source)],
      ['Location', j => cell(j.city)],
      ['Employment type', j => cell(j.type)],
      ['Pay', j => cell(pay(j), [payNote(j), hourlyEquivalent(j)].filter(Boolean).join(' '))],
      ['Schedule', j => cell(scheduleText(j), j.schedule ? '' : 'Not treated as daytime or evening.')],
      ['Qualifications', j => cell(j.qualifications)],
      ['Application method', j => cell(applyBase(j))]
    ];
    if (a && a.pay !== '') rows.push(['Against your minimum pay', j => cell(payMatch(j, a).text)]);
    rows.push(['To confirm', j => cell(confirmJob(j))]);
    return `<h2>Compare selected jobs</h2><p class="small muted">Review the same criteria for both openings. Information a listing does not give is shown as “Not provided”; it is never filled in or counted as meeting a preference.</p><div class="comparison-scroll" tabindex="0" role="region" aria-label="Job comparison table"><table class="comparison" role="table"><thead><tr role="row"><th scope="col" role="columnheader">Criteria</th>${js.map(j => `<th scope="col" role="columnheader">${esc(j.title)}<span class="th-sub">${esc(j.employer)}</span>${button('Remove from comparison', 'remove-compare', `data-id="${j.id}" data-fk="tbl-rm-${j.id}" aria-label="Remove ${esc(j.title)} at ${esc(j.employer)} from comparison"`, 'secondary small')}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, fn]) => `<tr role="row"><th scope="row" role="rowheader">${label}</th>${js.map(j => {const c = fn(j); return `<td role="cell" data-job="${esc(j.title)} (${esc(j.employer)})" class="${missingCell(c.text) ? 'missing' : ''}">${esc(c.text)}${c.note ? `<small class="cell-note">${esc(c.note)}</small>` : ''}</td>`;}).join('')}</tr>`).join('')}<tr role="row"><th scope="row" role="rowheader">Next step</th>${js.map(j => `<td role="cell" data-job="${esc(j.title)} (${esc(j.employer)})"><span class="cell-links">${link('job/' + j.id, 'View job details')}${link('apply/' + j.id, 'How to apply')}</span></td>`).join('')}</tr></tbody></table></div><p class="small muted">Hourly equivalent = annual pay ÷ 2,080 hours; it is used only to compare and sort. A range means the rate actually offered is not specified. To replace a job, remove it here, then tick another job in the list.</p>`;
  }
  function results() {
    if (!S.jobApplied) return `${heading('Job search results')}${empty('Start a job search', 'Choose a role, location, or other preferences to see matching openings.')}<p class="footer-links">${link('jobs', 'Find jobs', 'button')}</p>`;
    const rows = sortJobs(filterJobs(S.jobApplied), S.jobApplied, S.sort);
    if (!rows.some(j => j.id === S.detail)) S.detail = rows[0]?.id || '';
    const j = find('jobs', S.detail), n = S.selected.length;
    const sel = S.selected.map(id => find('jobs', id)).filter(Boolean);
    return `${heading('Job search results', '', [['jobs', 'Find jobs'], 'Job search results'])}${status(jobSummary(S.jobApplied), isPending('jobs'))}${S.note ? `<p class="notice removal-notice" role="status">${esc(S.note)}</p>` : ''}${ctxNote('jobs')}${jobForm('results')}<div class="search-tools"><label for="sort"><strong>Sort:</strong></label><select id="sort">${options([['relevance', 'Best match'], ['recent', 'Most recent'], ['pay', 'Highest listed pay (unknown last)']], S.sort)}</select>${link('jobs', 'All search methods')}<span class="count" id="result-count">${rows.length} matching job${rows.length === 1 ? '' : 's'}</span></div><div id="compare-error" class="error" role="alert">${ERR && ERR.scope === 'compare' ? esc(ERR.text) : ''}</div><details class="disclosure" data-disc="how-handled"${isOpen('how-handled') ? ' open' : ''}><summary>How results are ordered and how missing information is handled</summary><div class="disclosure-content"><p class="small">${esc(sortNote)}</p><p class="small">Pay: a range meets a minimum when its upper end does, which is not a guarantee of that pay. Listings with no pay are included or excluded only by the “Include listings that do not state pay” option and are never counted as meeting a minimum. Schedule: Daytime and Evening are strict filters; listings with no schedule are left out when one is chosen and are never assumed to be daytime.</p></div></details>${rows.length ? `<div class="result-layout"><section class="panel"><h2 class="panel-title">Job listings</h2><div class="job-list">${rows.map(jobCard).join('')}</div><div class="selection-bar"><div><strong>${n} of 2 jobs selected</strong>${sel.length ? `<ul class="selected-list">${sel.map(s => `<li>${esc(s.title)} — ${esc(s.employer)} <button type="button" class="link-button" data-action="remove-compare" data-id="${s.id}" data-fk="sb-rm-${s.id}" aria-label="Remove ${esc(s.title)} at ${esc(s.employer)} from comparison">Remove</button></li>`).join('')}</ul>` : ''}</div>${button('Compare selected (' + n + ')', 'compare', n !== 2 ? 'disabled' : '', 'small')}</div></section><section class="detail-panel"><div class="segmented" role="group" aria-label="Result view"><button type="button" data-action="details-tab" aria-pressed="${!S.compare}">Job details</button><button type="button" data-action="compare" aria-pressed="${S.compare}" ${n !== 2 ? 'disabled' : ''}>Compare (${n})</button></div><div class="detail-content" id="result-detail">${S.compare ? comparison() : jobDetailContent(j)}</div></section></div>` : recovery('jobs', 'jobs')}${dataList()}`;
  }
  function backLinks(id, here) {
    const out = [];
    if (here === 'apply') out.push(link('job/' + id, '← Back to job details'));
    out.push(S.jobApplied ? link('results', '← Back to job search results') : link('jobs', '← Find jobs'));
    if (S.jobApplied && S.compare && S.selected.length === 2) out.push(link('results', '← Back to comparison'));
    return `<p class="footer-links back-links">${out.join(' ')}</p>`;
  }
  function jobPage(id) {
    const j = find('jobs', id); if (!j) return missing();
    return `${heading('Job details', '', [['jobs', 'Find jobs'], ['results', 'Job search results'], j.title])}<div id="compare-error" class="error" role="alert">${ERR && ERR.scope === 'compare' ? esc(ERR.text) : ''}</div><section class="panel"><div class="panel-body">${jobDetailContent(j)}</div></section>${backLinks(id, 'job')}`;
  }
  function applyPage(id) {
    const j = find('jobs', id); if (!j) return missing();
    const acct = j.applyMethod === 'account';
    const dest = acct ? 'Virginia Workforce Connection account area (simulated; not available in this prototype)' : `${j.employer}’s own application page (simulated; no web address is given because this is a fictional employer)`;
    return `${heading('Application next step', '', [['jobs', 'Find jobs'], ['results', 'Job search results'], ['job/' + id, 'Job details'], 'Application next step'])}<section class="application-card"><h2 class="panel-title">${acct ? 'This opening uses a Virginia Workforce Connection account' : 'Application instructions (simulated destination)'}</h2><div class="panel-body"><p class="notice boundary"><strong>Prototype boundary:</strong> this page only displays instructions for a demonstration listing. Nothing you do here is sent anywhere. No application has been submitted. Account creation and application submission are not implemented in this prototype.</p><span class="badge">${esc(j.employer)}</span><h2>${esc(j.title)}</h2><p>${esc(j.city)} · ${esc(j.type)} · Listing reference ${esc(j.id)} (demonstration ID)</p><dl class="facts"><div><dt>Application method</dt><dd>${acct ? 'Virginia Workforce Connection account (simulated)' : 'Employer’s own application site (simulated)'}</dd></div><div><dt>Application destination</dt><dd>${esc(dest)}</dd></div><div><dt>Employer’s general website</dt><dd>Not provided. It is separate from the application destination.</dd></div><div><dt>Listing source</dt><dd>${esc(j.source)}</dd></div></dl><h3>What the next step would normally involve</h3><p>${acct ? 'Applying normally starts by signing in to, or creating, a Virginia Workforce Connection account. The application is then prepared and submitted inside that account, not on an employer’s website.' : 'Applying normally means leaving this service for the employer’s own application page, which may have its own account, résumé upload or screening questions. Those steps are not shown here.'}</p><p>${j.source === 'Employer' ? 'This listing was posted by the employer itself.' : 'This listing comes from a job board, so confirm where the application is actually received.'}</p><h3>What this listing asks for</h3><ul><li>Qualifications: ${esc(j.qualifications)}</li><li>Education requirement: ${esc(j.education)}</li><li>Work arrangement: ${esc(j.workArrangement)}</li><li>To confirm before applying: ${esc(confirmJob(j))}</li></ul><div class="actions">${acct ? `${button('Sign in (not available in this prototype)', 'unavailable', 'data-name="Account sign-in"', 'secondary')}${button('Create an account (not available in this prototype)', 'unavailable', 'data-name="Account registration"', 'secondary')}` : button('Open employer application page (simulated; not available)', 'unavailable', 'data-name="Employer application page (simulated)"', 'secondary')}</div></div></section>${backLinks(id, 'apply')}`;
  }

  /* ---------- rendering, focus and scroll ---------- */
  let lastRoute = '';
  const narrow = () => !!(window.matchMedia && window.matchMedia('(max-width: 760px)').matches);
  function focusKey(el) {
    if (!el || !el.getAttribute) return '';
    try {
      if (el.id) return '#' + el.id;
      const fk = el.getAttribute('data-fk'); if (fk) return `[data-fk="${fk}"]`;
      if (el.getAttribute('data-compare-id')) return `[data-compare-id="${el.getAttribute('data-compare-id')}"]`;
      const n = el.getAttribute('name'); if (n) return `[name="${n}"]`;
    } catch (_) {}
    return '';
  }
  function render(focus = true, opts = {}) {
    const route = location.hash.slice(1) || 'home';
    if (route === 'main') {location.hash = lastRoute || 'home'; $('#main').focus(); return;}
    const [page, id] = route.split('/');
    const fk = focus ? '' : (opts.focus || focusKey(document.activeElement));
    const keepList = route === lastRoute ? (opts.resetList ? 0 : $('.job-list')?.scrollTop || 0) : null;
    const funcs = {home, occupations, occupation:() => occupationDetail(id), training, providers, provider:() => providerDetail(id), programs, program:() => programDetail(id), jobs, results, job:() => jobPage(id), apply:() => applyPage(id)};
    $('#main').innerHTML = (funcs[page] || missing)();
    document.title = ($('#main h1')?.textContent || 'Virginia Works') + ' · Virginia Works';
    document.querySelector('.utility-nav a').setAttribute('aria-current', page === 'home' ? 'page' : 'false');
    save();
    if (route === 'results' && route !== lastRoute) {window.scrollTo(0, S.pos.results.page | 0); const l = $('.job-list'); if (l) l.scrollTop = S.pos.results.list | 0;}
    else if (keepList !== null && $('.job-list')) $('.job-list').scrollTop = keepList;
    if (focus) {$('#main').focus({preventScroll:true}); if (route !== lastRoute && route !== 'results') window.scrollTo(0, 0);}
    else if (fk) {try {const t = document.querySelector(fk); if (t && t.focus) t.focus({preventScroll:true});} catch (_) {}}
    lastRoute = route;
  }
  const go = route => {if (location.hash === '#' + route) render(); else location.hash = route;};
  const focusEl = sel => {try {const t = document.querySelector(sel); if (t && t.focus) t.focus({preventScroll:true});} catch (_) {}};

  /* ---------- events ---------- */
  function readForm(form, kind) {
    const fd = new FormData(form);
    Object.keys(defaults[kind]).forEach(k => {if (k === 'unknown') S[kind][k] = fd.has(k); else if (form.elements.namedItem(k)) S[kind][k] = String(fd.get(k) || '');});
    save();
  }
  function showError(field) {announce(ERR.text); render(false, {focus:field ? '#' + field : ''}); if (field) focusEl('#' + field);}
  document.addEventListener('input', e => {
    const form = e.target.closest && e.target.closest('form[data-kind]');
    if (form) {
      readForm(form, form.dataset.kind);
      if (ERR && ERR.field === e.target.name) {ERR = null; const eb = $('#form-error'); if (eb) eb.textContent = ''; e.target.removeAttribute && e.target.removeAttribute('aria-invalid');}
      if ($('#draft-status')) $('#draft-status').textContent = draftText(form.dataset.kind);
      const pill = $('#main .status-pill'); if (pill) {pill.classList.toggle('pending', isPending(form.dataset.kind)); pill.textContent = isPending(form.dataset.kind) ? 'Changes not applied' : 'Search up to date';}
    }
    if (e.target.id === 'occ-area-input') {S.occArea = e.target.value; save(); $('#occ-area-status').textContent = S.occArea === S.occApplied ? 'Area up to date' : 'Changes not applied';}
  });
  document.addEventListener('change', e => {
    if (e.target.dataset && e.target.dataset.compareId) {
      const id = e.target.dataset.compareId, r = toggleCompare(id, e.target.checked);
      if (!r.ok) {e.target.checked = false; render(false); announce(ERR.text); return;}
      render(false); announce(`${S.selected.length} of 2 jobs selected.`);
    }
    if (e.target.id === 'sort') {S.sort = e.target.value; save(); render(false);}
  });
  document.addEventListener('submit', e => {
    const form = e.target; if (form.closest && form.closest('dialog')) return; e.preventDefault();
    if (form.id === 'home-search') {
      const q = form.elements['home-q'].value, city = form.elements['home-city'].value;
      if (!validArea(city)) {ERR = {scope:'home', field:'home-city', text:`“${String(city).trim()}” is not a supported location. Choose a city from the suggestions, enter a listed ZIP code, or leave it blank to search all Virginia.`}; const he = $('#home-error'); if (he) he.textContent = ERR.text; announce(ERR.text); focusEl('#home-city'); return;}
      ERR = null; S.jobs = {...clone(defaults.jobs), q, city}; applyDraft('jobs'); save(); go('results'); return;
    }
    if (form.dataset && form.dataset.kind) {
      const kind = form.dataset.kind; readForm(form, kind);
      const r = applyDraft(kind);
      if (!r.ok) {showError(r.error.field); return;}
      if (kind === 'jobs') {
        const n = filterJobs(S.jobApplied).length, msg = `Results updated: ${n} matching job${n === 1 ? '' : 's'}.`;
        if (location.hash === '#results') render(false, {focus:'#update-results', resetList:r.changed}); else go('results');
        announce(r.changed ? msg : `No change: the criteria are the same as the applied search. ${n} matching job${n === 1 ? '' : 's'}.`);
      }
      else {render(false, {focus:'#update-results'}); announce(r.changed ? 'Results updated.' : 'No change: the criteria are the same as the applied search.');}
      return;
    }
    if (form.id === 'occ-filter') {S.occQuery = form.elements['occ-q'].value; S.occSelected = ''; render(false); announce('Occupation list updated.');}
    if (form.id === 'occ-area') {
      if (!validArea(S.occArea)) {ERR = {scope:'occ', field:'occ-area-input', text:`“${String(S.occArea).trim()}” is not a supported location. Choose a city from the suggestions, enter a listed ZIP code, or enter Virginia.`}; render(false); announce(ERR.text); focusEl('#occ-area-input'); return;}
      ERR = null; S.occArea = allArea(S.occArea) ? 'Virginia' : locate(S.occArea).label; S.occApplied = S.occArea; save(); render(false); announce(`Area for related jobs and training: ${areaLabel(S.occApplied)}. Occupation information does not change with area.`);
    }
  });
  const contents = () => ({
    help:['Help Center', '<p>Search jobs using a role and location. Use training searches to find either organizations or courses, and explore occupations to review duties and skills.</p><p>Editing a field changes the form only. The results and the “Applied” summary keep showing your last search until you choose Search or Update results.</p>'],
    intro:['Welcome to Virginia Workforce Connection', '<p>Explore career information, find training providers and courses, and review job openings.</p><p>Choose a service from the homepage or the Menu. You can return Home at any time.</p>'],
    signin:['Sign In', '<p>Account sign-in is not implemented in this prototype. You can explore occupations, training, and job openings without signing in.</p>'],
    alerts:['System alerts', '<p>There are no current system alerts.</p>'],
    accessibility:['Accessibility', `<p>Use Tab to move between controls and Enter or Space to activate them. The comparison table can be scrolled horizontally on narrow screens.</p><p id="ts-status" role="status">Text size: ${S.ui.large ? 'Larger' : 'Default'}</p><div class="actions"><button type="button" class="button secondary" data-action="text-large" aria-pressed="${!!S.ui.large}">Use larger text</button><button type="button" class="button secondary" data-action="text-default" aria-pressed="${!S.ui.large}">Restore default text size</button></div>`],
    about:['About this prototype', '<p>This student redesign of Virginia Workforce Connection is a design prototype. All organizations, courses, and job openings shown here are illustrative and are not current real-world listings. Posting ages are measured from a fixed reference date (November 20, 2026), so they do not change from day to day.</p><p>Distances are straight-line miles between approximate city centers, not driving or commuting distances.</p>'],
    privacy:['Privacy', '<p>Search preferences and selected jobs are stored in this browser. This prototype does not accept applications or collect account information.</p>'],
    locations:['Supported locations', `<p>Enter one of these cities (suggestions appear as you type), a ZIP code listed here, or Virginia / a blank field for all Virginia. Other places are not recognized.</p><table class="loc-table"><thead><tr><th scope="col">City</th><th scope="col">Listed ZIP codes</th></tr></thead><tbody>${D.locations.map(l => `<tr><th scope="row">${esc(l.label)}</th><td>${esc(l.aliases.filter(a => /^\d+$/.test(a)).join(', ') || '—')}</td></tr>`).join('')}</tbody></table><p class="small muted">Job radius uses straight-line distance between approximate city centers. It is not driving or commuting distance, and it is not measured from street addresses.</p>`]
  });
  const applyTextSize = () => rootEl().classList.toggle('large-text', !!S.ui.large);
  document.addEventListener('click', e => {
    const el = e.target.closest('button,a'); if (!el) return;
    if (el.closest('dialog') && el.tagName === 'A') $('#dialog').close();
    if (el.id === 'menu-button') {modal('Services', `<nav class="menu-links">${link('home', 'Home')}${link('occupations', 'Explore occupations')}${link('training', 'Training & Education')}${link('providers', 'Training providers & schools')}${link('programs', 'Training programs')}${link('jobs', 'Find jobs')}</nav>`); return;}
    if (el.dataset.unavailable) {unavailableNotice(el.dataset.unavailable); return;}
    if (el.dataset.dialog) {modal(...contents()[el.dataset.dialog]); return;}
    const a = el.dataset.action, id = el.dataset.id; if (!a) return;
    if (a === 'unavailable') unavailableNotice(el.dataset.name);
    else if (a === 'text-large' || a === 'text-default') {
      S.ui.large = a === 'text-large'; applyTextSize(); save();
      const t = $('#ts-status'); if (t) t.textContent = 'Text size: ' + (S.ui.large ? 'Larger' : 'Default');
      document.querySelectorAll && document.querySelectorAll('[data-action="text-large"]').forEach(b => b.setAttribute('aria-pressed', String(!!S.ui.large)));
      document.querySelectorAll && document.querySelectorAll('[data-action="text-default"]').forEach(b => b.setAttribute('aria-pressed', String(!S.ui.large)));
      announce('Text size: ' + (S.ui.large ? 'larger' : 'default'));
    }
    else if (a === 'reset') {resetDraft(el.dataset.kind); render(false); announce('Criteria reset in the form. Results are unchanged until you choose Update results.');}
    else if (a === 'drop-criterion') {setDraft(el.dataset.kind, JSON.parse(el.dataset.patch)); render(false, {focus:'#update-results'}); announce('Condition removed from the form. Choose Update results to apply the change.');}
    else if (a === 'occ-mode') {S.occMode = el.dataset.mode; S.occQuery = ''; S.occSelected = ''; render(false);}
    else if (a === 'occ-all') {S.occMode = 'group'; S.occQuery = ''; render(false);}
    else if (a === 'occ-select') {S.occSelected = id; render(false); announce(find('occupations', id).title + ' selected.');}
    else if (a === 'occ-training') {relatedTraining(id); go('programs');}
    else if (a === 'occ-jobs') {relatedJobs(id); go('results');}
    else if (a === 'provider-programs') {providerPrograms(id); go('programs');}
    else if (a === 'ctx-fresh') {ctxFresh(el.dataset.kind); render(false, {focus:'#update-results'}); announce('New search applied with only the new condition.');}
    else if (a === 'remove-provider') {setDraft('programs', {provider:''}); render(false, {focus:'#update-results'}); announce('Provider filter removed from the form. Choose Update results to apply the change.');}
    else if (a === 'remove-occupation') {setDraft('programs', {occupation:''}); render(false, {focus:'#update-results'}); announce('Occupation condition removed from the form. Choose Update results to apply the change.');}
    else if (a === 'remove-job-occupation') {setDraft('jobs', {occupation:''}); render(false, {focus:'#update-results'}); announce('Occupation condition removed from the form. Choose Update results to apply the change.');}
    else if (a === 'select-job') {S.detail = id; S.compare = false; save(); render(false); const d = $('#result-detail'); if (d) {d.setAttribute('tabindex', '-1'); d.focus({preventScroll:true}); if (narrow() && d.scrollIntoView) d.scrollIntoView({block:'start'});} announce('Job details updated.');}
    else if (a === 'compare' && S.selected.length === 2) {S.compare = true; save(); render(false); const d = $('#result-detail'); if (d) {d.setAttribute('tabindex', '-1'); d.focus({preventScroll:true}); if (narrow() && d.scrollIntoView) d.scrollIntoView({block:'start'});} announce('Comparison of two jobs displayed.');}
    else if (a === 'details-tab') {S.compare = false; save(); render(false);}
    else if (a === 'add-compare' || a === 'remove-compare') {
      const r = toggleCompare(id, a === 'add-compare');
      render(false); announce(r.ok ? (a === 'add-compare' ? `Added to comparison. ${S.selected.length} of 2 jobs selected.` : `Removed from comparison. ${S.selected.length} of 2 jobs selected.${S.selected.length === 1 ? ' Select another job to compare.' : ''}`) : ERR.text);
    }
    save();
  });
  document.addEventListener('toggle', e => {const d = e.target; if (d && d.dataset && d.dataset.disc) {S.ui.open[d.dataset.disc] = !!d.open; save();}}, true);
  document.addEventListener('scroll', e => {
    if (lastRoute !== 'results') return;
    const t = e.target;
    if (t === document || t === document.documentElement || t === document.body) S.pos.results.page = window.scrollY | 0;
    else if (t && t.classList && t.classList.contains('job-list')) S.pos.results.list = t.scrollTop | 0;
  }, true);
  const dlg = $('#dialog'); if (dlg && dlg.addEventListener) dlg.addEventListener('close', () => {if (opener && opener.isConnected && opener.focus) opener.focus({preventScroll:true}); opener = null;});
  window.addEventListener('hashchange', () => render());
  window.VAWC_TEST = {
    sortJobs, filterJobs, filterPrograms, filterProviders, locate, cityMatch, defaults, confirmJob,
    get state() {return S;}, get error() {return ERR;}, get lastAnnounce() {return lastAnnounce;},
    setDraft, resetDraft, applyDraft, isPending, validateDraft, canon, toggleCompare, relaxHints, payMatch, pay, hourlyEquivalent, relatedJobs, relatedTraining, providerPrograms, ctxFresh,
    render:() => render(false), clearError:() => {ERR = null;}
  };
  applyTextSize();
  render();
})();
