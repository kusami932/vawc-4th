/* Run: node tests/smoke-test.js
   Runs app.js and data.js against a STUBBED DOM in Node. This is not a browser test.
   Categories: FUNCTIONAL (behavior and integrity) and DATASET-ACCEPTANCE (the six agreed data targets).
   Expected values are hand-derived from the authored fixtures/geometry, not produced by calling the function under test. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const ROOT=path.join(__dirname,'..');
function mk(dataFile){
  const L={},store={};let html='',hash='';
  const el=()=>({set innerHTML(v){html=v},get innerHTML(){return html},textContent:'',focus(){},scrollIntoView(){},setAttribute(){},scrollTop:0,classList:{toggle(){},contains(){return false}},open:false,showModal(){}});
  const doc={querySelector:()=>el(),addEventListener:(t,f)=>{L[t]=f},body:{classList:{toggle(){},contains:()=>false}}};
  const loc={get hash(){return hash},set hash(v){hash=v.startsWith('#')?v:'#'+v;L.hashchange&&L.hashchange()}};
  const win={VAWC_DATA:null,addEventListener:(t,f)=>{L[t]=f},scrollTo(){}};
  const ctx={window:win,document:doc,location:loc,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},setTimeout:f=>f(),console};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(dataFile||path.join(ROOT,'data.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),ctx);
  return {store,get html(){return html},loc,win:ctx.window,
    go(h){loc.hash=h;return html},
    click(ds){L.click({target:{closest:()=>({dataset:ds,tagName:'BUTTON',id:'',closest:()=>null})}})}};
}
const R=[];
const ok=(cat,name,cond)=>R.push({cat,name,pass:!!cond});
const eq=(cat,name,got,want)=>{const p=JSON.stringify(got)===JSON.stringify(want);R.push({cat,name:p?name:`${name} — got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`,pass:p})};
const F='FUNCTIONAL',DS='DATASET-ACCEPTANCE';
const sid=a=>a.map(x=>x.id).sort(), oid=a=>a.map(x=>x.id);
const has=(h,t)=>h.includes(t)||h.includes(t.replace(/'/g,'&#39;'))||h.includes(t.replace(/&/g,'&amp;'));
const rate=j=>j.payMin===null?null:(j.payUnit==='year'?j.payMax/2080:j.payMax);   // independent re-statement of the pay rule

// ===== 1. Controlled fixture: algorithm checks with hand-derived expectations =====
{const a=mk(path.join(__dirname,'fixture-data.js')),T=a.win.VAWC_TEST,d=T.defaults.jobs;
 const fj=o=>sid(T.filterJobs({...d,...o}));
 eq(F,'fixture radius 0 mi from Basetown',fj({city:'Basetown, VA',radius:'0'}),['F1','F6']);
 eq(F,'fixture radius 5 mi (Nearby is 3.5 mi)',fj({city:'Basetown, VA',radius:'5'}),['F1','F2','F6']);
 eq(F,'fixture radius 10 mi (Midville is 13.8 mi, excluded)',fj({city:'Basetown, VA',radius:'10'}),['F1','F2','F6']);
 eq(F,'fixture radius 25 mi adds Midville',fj({city:'Basetown, VA',radius:'25'}),['F1','F2','F3','F6']);
 eq(F,'fixture radius 50 mi adds Farton (27.6 mi)',fj({city:'Basetown, VA',radius:'50'}),['F1','F2','F3','F4','F6']);
 eq(F,'fixture radius 75 mi adds Distantville (55.3 mi)',fj({city:'Basetown, VA',radius:'75'}),['F1','F2','F3','F4','F5','F6']);
 eq(F,'fixture blank location ignores radius',fj({radius:'0'}),['F1','F2','F3','F4','F5','F6']);
 eq(F,'fixture unsupported location matches nothing',fj({city:'Nowhere, ZZ'}),[]);
 eq(F,'fixture min $19/h, unknown pay excluded: range upper end counts (F3 18–19 passes)',fj({pay:'19',unit:'hour',unknown:false}),['F1','F2','F3','F5','F6']);
 eq(F,'fixture min $19/h, unknown pay included adds F4',fj({pay:'19',unit:'hour',unknown:true}),['F1','F2','F3','F4','F5','F6']);
 eq(F,'fixture min $40,000/yr compares annualized (19.23/h): F3 and F6 at 19/h fail',fj({pay:'40000',unit:'year',unknown:false}),['F1','F2','F5']);
 eq(F,'fixture min $25/h',fj({pay:'25',unit:'hour',unknown:false}),['F5']);
 eq(F,'fixture unknown pay excluded even with no minimum when box unchecked',fj({unknown:false}),['F1','F2','F3','F5','F6']);
 eq(F,'fixture Daytime filter is strict: unknown schedules excluded',fj({schedule:'Daytime'}),['F1','F2','F5']);
 eq(F,'fixture Evening filter',fj({schedule:'Evening'}),['F3']);
 eq(F,'fixture Part-time',fj({type:'Part-time'}),['F3']);
 eq(F,'fixture Full-time',fj({type:'Full-time'}),['F1','F2','F4','F5','F6']);
 eq(F,'fixture posted within 1 day',fj({days:'1'}),['F1','F6']);
 eq(F,'fixture posted within 7 days',fj({days:'7'}),['F1','F2','F6']);
 eq(F,'fixture posted within 30 days',fj({days:'30'}),['F1','F2','F3','F4','F6']);
 eq(F,'fixture occupation filter X2',fj({occupation:'X2'}),['F4','F5']);
 eq(F,'fixture education filter',fj({education:'Associate degree'}),['F5']);
 eq(F,'fixture source filter',fj({source:'Job board'}),['F5']);
 eq(F,'fixture work-arrangement filter',fj({work:'Remote'}),['F5']);
 eq(F,'fixture keyword matches title and keywords',fj({q:'alpha'}),['F1','F2','F3','F6']);
 eq(F,'fixture multi-word keyword requires every word',fj({q:'alpha beta'}),[]);
 eq(F,'fixture keyword with no match gives an empty result',fj({q:'zzz'}),[]);
 eq(F,'fixture combined filters (Full-time, Daytime, min $19/h, unknown excluded, 75 mi)',fj({city:'Basetown, VA',radius:'75',type:'Full-time',schedule:'Daytime',pay:'19',unknown:false}),['F1','F2','F5']);
 const all=T.filterJobs(d);
 eq(F,'fixture most recent sort',oid(T.sortJobs(all,{q:''},'recent')),['F6','F1','F2','F3','F4','F5']);
 eq(F,'fixture pay sort: upper end hourly, equal pay ties by recency, unknown last',oid(T.sortJobs(all,{q:''},'pay')),['F5','F2','F1','F6','F3','F4']);
 eq(F,'fixture blank query best match falls back to most recent',oid(T.sortJobs(all,{q:''},'relevance')),['F6','F1','F2','F3','F4','F5']);
 eq(F,"fixture best match 'alpha' (title+phrase+occupation+keyword = 11; F6 keyword+occupation only = 4)",oid(T.sortJobs(T.filterJobs({...d,q:'alpha'}),{q:'alpha'},'relevance')),['F1','F2','F3','F6']);
 eq(F,"fixture best match 'role' (F1 also has exact keyword: 11; others 9; ties by recency)",oid(T.sortJobs(T.filterJobs({...d,q:'role'}),{q:'role'},'relevance')),['F1','F2','F3','F4','F5']);
 eq(F,'fixture sorting independent of input order',oid(T.sortJobs(all.slice().reverse(),{q:''},'pay')),oid(T.sortJobs(all,{q:''},'pay')));
}

// ===== 2. Real dataset: loading, integrity, usability =====
const A=mk(),T=A.win.VAWC_TEST,D=A.win.VAWC_DATA,dd=T.defaults.jobs;
const dup=a=>a.filter((x,i)=>a.indexOf(x)!==i);
for(const k of ['occupations','providers','programs','jobs'])eq(F,'unique IDs: '+k,dup(D[k].map(x=>x.id)),[]);
const occIds=new Set(D.occupations.map(o=>o.id)),provIds=new Set(D.providers.map(p=>p.id)),progIds=new Set(D.programs.map(p=>p.id));
const known=c=>D.locations.some(l=>[l.label,...l.aliases].includes(c));
eq(F,'every program has a valid provider that lists it',D.programs.filter(p=>!provIds.has(p.providerId)||!D.providers.find(t=>t.id===p.providerId).programIds.includes(p.id)).map(p=>p.id),[]);
eq(F,'every provider programId exists and points back to that provider',D.providers.flatMap(t=>t.programIds.filter(i=>!D.programs.some(p=>p.id===i&&p.providerId===t.id)).map(i=>t.id+'>'+i)),[]);
eq(F,'every program occupationId exists and each program links 1–4 occupations',D.programs.filter(p=>!p.occupationIds.length||p.occupationIds.length>4||!p.occupationIds.every(i=>occIds.has(i))).map(p=>p.id),[]);
eq(F,'every job occupationId exists',D.jobs.filter(j=>!occIds.has(j.occupationId)).map(j=>j.id),[]);
eq(F,'every job/provider/program city is a supported location',[...D.jobs,...D.providers,...D.programs].filter(x=>!known(x.city)).map(x=>x.id),[]);
eq(F,'no program is linked to all admin-type occupations indiscriminately (max 4 occupation links)',D.programs.filter(p=>p.occupationIds.length>4).map(p=>p.id),[]);
const nonEmpty=v=>typeof v==='string'&&v.trim().length>0;
eq(F,'jobs: required display fields present',D.jobs.filter(j=>!['title','employer','city','qualifications','description'].every(f=>nonEmpty(j[f]))||j.duties.length<3||j.keywords.length<3).map(j=>j.id),[]);
eq(F,'jobs: recognized enumerations',D.jobs.filter(j=>!['Full-time','Part-time'].includes(j.type)||!['hour','year'].includes(j.payUnit)||![null,'Daytime','Evening'].includes(j.schedule)||!['On-site','Hybrid','Remote'].includes(j.workArrangement)||!['High school','Associate degree','Bachelor degree'].includes(j.education)||!['Employer','Job board'].includes(j.source)||!['account','external'].includes(j.applyMethod)).map(j=>j.id),[]);
eq(F,'jobs: pay values are both null or numeric with min<=max and plausible magnitude',D.jobs.filter(j=>!((j.payMin===null&&j.payMax===null)||(Number.isFinite(j.payMin)&&Number.isFinite(j.payMax)&&j.payMin<=j.payMax&&(j.payUnit==='hour'?j.payMin>=7&&j.payMax<=100:j.payMin>=15000&&j.payMax<=250000)))).map(j=>j.id),[]);
eq(F,'jobs: postedDays are integers 0–60',D.jobs.filter(j=>!Number.isInteger(j.postedDays)||j.postedDays<0||j.postedDays>60).map(j=>j.id),[]);
eq(F,'jobs: no duplicate title+employer+city or description',[...dup(D.jobs.map(j=>[j.title,j.employer,j.city].join('|'))),...dup(D.jobs.map(j=>j.description))],[]);
eq(F,'jobs: employers are labelled as examples (fictional)',D.jobs.filter(j=>!j.employer.startsWith('Example ')).map(j=>j.id),[]);
eq(F,'occupations: duties/skills/summary/qualifications present; unique titles',[...D.occupations.filter(o=>o.duties.length<3||o.skills.length<3||!nonEmpty(o.summary)||!nonEmpty(o.qualifications)||o.keywords.length<2).map(o=>o.id),...dup(D.occupations.map(o=>o.title))],[]);
eq(F,'programs: required fields, numeric cost, recognized schedule/format',D.programs.filter(p=>!nonEmpty(p.title)||!nonEmpty(p.description)||!Number.isFinite(p.cost)||p.cost<=0||!['Daytime','Evening','Weekend'].includes(p.schedule)||!['In person','Online','Hybrid'].includes(p.format)||p.skills.length<1).map(p=>p.id),[]);
eq(F,'providers: description and type present; every provider has at least one program',D.providers.filter(p=>!nonEmpty(p.description)||!nonEmpty(p.type)||!p.programIds.length).map(p=>p.id),[]);
eq(F,'locations: numeric coordinates; every alias/label unique',[...D.locations.filter(l=>!Number.isFinite(l.lat)||!Number.isFinite(l.lon)).map(l=>l.id),...dup(D.locations.flatMap(l=>[l.label,...l.aliases].map(s=>s.toLowerCase())))],[]);
const grp={};D.occupations.forEach(o=>{grp[o.group]=(grp[o.group]||0)+1});
eq(F,'every occupation group has at least 3 occupations',Object.entries(grp).filter(([,n])=>n<3).map(([g])=>g),[]);
ok(F,'Office and Administrative Support group offers several occupations (>=6)',grp['Office and Administrative Support']>=6);
ok(F,'provider location differs from program location for at least one program (P08, P28)',D.programs.some(p=>p.city!==D.providers.find(t=>t.id===p.providerId).city));
// genuine missing information is preserved as unknown (hand-listed from the authored fixtures; baseline J02 is missing both)
eq(F,'jobs with no pay listed stay unknown (payMin/payMax null)',sid(D.jobs.filter(j=>j.payMin===null||j.payMax===null)),['J02','J16','J34','J54']);
eq(F,'jobs with no schedule listed stay unknown (null)',sid(D.jobs.filter(j=>j.schedule===null)),['J02','J17','J20','J22','J34','J67']);
eq(F,'unknown-pay and unknown-schedule listings say so in their description',D.jobs.filter(j=>(j.payMin===null&&!/pay[^.]*not provided/i.test(j.description+' '))&&!/left for the employer to confirm/.test(j.description)||(j.schedule===null&&!/schedule[^.]*(not provided|require confirmation)/i.test(j.description))).map(j=>j.id),[]);
// original (intermediate-2) records are preserved unchanged; only P28 was appended to T04's programIds
{const B=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/base-intermediate-2.json'),'utf8'));
 for(const k of ['occupations','programs','jobs','locations'])eq(F,`baseline ${k} records are unchanged`,B[k].filter(b=>JSON.stringify(D[k].find(x=>x.id===b.id))!==JSON.stringify(b)).map(b=>b.id),[]);
 eq(F,'baseline providers unchanged except appended programIds (T04 gains P28)',B.providers.filter(b=>{const c=D.providers.find(x=>x.id===b.id);return JSON.stringify({...c,programIds:0})!==JSON.stringify({...b,programIds:0})||!b.programIds.every(i=>c.programIds.includes(i))}).map(b=>b.id),[]);
 eq(F,'IDs of baseline records are preserved and new IDs are contiguous (O07–O40, T05–T16, P07–P28, J11–J80)',[D.occupations.map(o=>o.id).slice(6).join()===Array.from({length:34},(_,i)=>'O'+String(i+7).padStart(2,'0')).join(),D.providers.map(o=>o.id).slice(4).join()===Array.from({length:12},(_,i)=>'T'+String(i+5).padStart(2,'0')).join(),D.programs.map(o=>o.id).slice(6).join()===Array.from({length:22},(_,i)=>'P'+String(i+7).padStart(2,'0')).join(),D.jobs.map(o=>o.id).slice(10).join()===Array.from({length:70},(_,i)=>'J'+String(i+11).padStart(2,'0')).join()],[true,true,true,true]);}
// variety (realism) — independent predicates
const ADMIN=['O01','O02','O03','O06','O07','O08','O09'];
const RICH25=['Richmond, VA','Henrico, VA','Chesterfield, VA','Petersburg, VA','Mechanicsville, VA','Hopewell, VA','Colonial Heights, VA']; // hand-estimated straight-line miles from Richmond: 0, 7, 12, 22, 6, 18, 21
ok(F,'variety: full-time and part-time jobs',new Set(D.jobs.map(j=>j.type)).size===2);
ok(F,'variety: daytime, evening, and unknown schedules',new Set(D.jobs.map(j=>j.schedule)).size===3);
ok(F,'variety: hourly, annual, range, single-value, and unknown pay',D.jobs.some(j=>j.payUnit==='hour'&&j.payMin!==null)&&D.jobs.some(j=>j.payUnit==='year'&&j.payMin!==null)&&D.jobs.some(j=>j.payMin!==null&&j.payMin<j.payMax)&&D.jobs.some(j=>j.payMin!==null&&j.payMin===j.payMax)&&D.jobs.filter(j=>j.payMin===null).length>=3);
ok(F,'variety: at least 5 jobs whose pay tops out below $19/h',D.jobs.filter(j=>rate(j)!==null&&rate(j)<19).length>=5);
ok(F,'variety: at least 5 Hybrid jobs and at least 1 Remote job',D.jobs.filter(j=>j.workArrangement==='Hybrid').length>=5&&D.jobs.some(j=>j.workArrangement==='Remote'));
ok(F,'variety: both application methods and both listing sources are well represented',['account','external'].every(m=>D.jobs.filter(j=>j.applyMethod===m).length>=20)&&['Employer','Job board'].every(s=>D.jobs.filter(j=>j.source===s).length>=10));
ok(F,'variety: posting ages span same-day to beyond 30 days',D.jobs.some(j=>j.postedDays<=1)&&D.jobs.some(j=>j.postedDays>30));
ok(F,'variety: at least 25 jobs inside and 8 outside a 25-mile Richmond radius (hand city table)',D.jobs.filter(j=>RICH25.includes(j.city)).length>=25&&D.jobs.filter(j=>!RICH25.includes(j.city)).length>=8);
const adminIn=D.jobs.filter(j=>ADMIN.includes(j.occupationId)&&RICH25.includes(j.city));
const cand=adminIn.filter(j=>j.type==='Full-time'&&j.schedule==='Daytime'&&rate(j)!==null&&rate(j)>=19);
ok(F,'richness: at least 6 plausible full-time daytime >=$19/h admin jobs near Richmond',cand.length>=6);
ok(F,'richness: those candidates span >=4 employers, >=3 occupations, >=3 cities',new Set(cand.map(j=>j.employer)).size>=4&&new Set(cand.map(j=>j.occupationId)).size>=3&&new Set(cand.map(j=>j.city)).size>=3);
ok(F,'richness: near-Richmond admin jobs include part-time, evening, unknown-schedule, unknown-pay, and below-$19 mismatches',adminIn.some(j=>j.type==='Part-time')&&adminIn.some(j=>j.schedule==='Evening')&&adminIn.some(j=>j.schedule===null)&&adminIn.some(j=>j.payMin===null)&&adminIn.some(j=>rate(j)!==null&&rate(j)<19));
const adminProv=id=>D.programs.some(p=>p.providerId===id&&p.occupationIds.some(o=>ADMIN.includes(o)));
const richProv=D.providers.filter(p=>p.city==='Richmond, VA');
ok(F,'richness: at least 3 Richmond providers with admin-related programs and 2 without',richProv.filter(p=>adminProv(p.id)).length>=3&&richProv.filter(p=>!adminProv(p.id)).length>=2);
// no benchmark special-casing / nondeterminism in code
const appSrc=fs.readFileSync(path.join(ROOT,'app.js'),'utf8'),dataSrc=fs.readFileSync(path.join(ROOT,'data.js'),'utf8');
ok(F,'app.js hard-codes no record IDs or the benchmark phrasing',!/['"](O\d\d|J\d\d|T\d\d|P\d\d)['"]/.test(appSrc)&&!/administrative assistant/i.test(appSrc));
ok(F,'no clock or randomness in app.js or data.js (deterministic fixtures)',!/Math\.random|new Date|Date\.now/.test(appSrc+dataSrc));
eq(F,'neutral default search criteria',T.defaults.jobs,{q:'',city:'',radius:'25',type:'',pay:'',unit:'hour',unknown:true,schedule:'',days:'',occupation:'',education:'',source:'',work:''});

// ===== 3. Real dataset: search / filter / sort scenarios (hand-derived) =====
const rj=o=>sid(T.filterJobs({...dd,...o}));
const inCities=o=>[...new Set(T.filterJobs({...dd,...o}).map(j=>j.city))].sort();
eq(F,'Richmond 25 mi: cities with jobs are the 7 hand-estimated nearby cities',inCities({city:'Richmond, VA',radius:'25'}),[...RICH25].sort());
eq(F,'Richmond 75 mi adds Williamsburg (46), Fredericksburg (53), Newport News (61), Charlottesville (66); not Norfolk (79) or Roanoke (141)',inCities({city:'Richmond, VA',radius:'75'}),[...RICH25,'Williamsburg, VA','Fredericksburg, VA','Newport News, VA','Charlottesville, VA'].sort());
eq(F,"'receptionist' near Richmond",rj({q:'receptionist',city:'Richmond, VA'}),['J05','J18','J19','J20']);
eq(F,"'administrative assistant' statewide (OA jobs titled/tagged both words)",rj({q:'administrative assistant'}),['J01','J04','J08','J10','J11','J12','J13','J14','J21','J22']);
eq(F,"'administrative assistant' within 25 mi of Richmond (Norfolk J08 drops out)",rj({q:'administrative assistant',city:'Richmond, VA'}),['J01','J04','J10','J11','J12','J13','J14','J21','J22']);
eq(F,'… full-time only (part-time J14 drops out)',rj({q:'administrative assistant',city:'Richmond, VA',type:'Full-time'}),['J01','J04','J10','J11','J12','J13','J21','J22']);
eq(F,'… with minimum $19/h, unknown excluded (J13 pays $18)',rj({q:'administrative assistant',city:'Richmond, VA',type:'Full-time',pay:'19',unknown:false}),['J01','J04','J10','J11','J12','J21','J22']);
eq(F,'… plus strict Daytime (J22 has no schedule listed)',rj({q:'administrative assistant',city:'Richmond, VA',type:'Full-time',pay:'19',unknown:false,schedule:'Daytime'}),['J01','J04','J10','J11','J12','J21']);
eq(F,"best match for 'administrative assistant' (J01/J14/J11/J12/J13 score 19 and tie by recency, then ID)",oid(T.sortJobs(T.filterJobs({...dd,q:'administrative assistant'}),{q:'administrative assistant'},'relevance')),['J01','J14','J11','J12','J13','J04','J08','J10','J21','J22']);
eq(F,'Administrative Assistant is not pinned: blank-query best match equals most recent order',oid(T.sortJobs(D.jobs,{q:''},'relevance')),oid(T.sortJobs(D.jobs,{q:''},'recent')));
{const o=oid(T.sortJobs(D.jobs,{q:''},'recent')),by=Object.fromEntries(D.jobs.map(j=>[j.id,j]));
 ok(F,'recent sort: non-decreasing postedDays, ties by title then ID (adjacent-pair property)',o.every((id,i)=>i===0||(by[o[i-1]].postedDays<by[id].postedDays||(by[o[i-1]].postedDays===by[id].postedDays&&(by[o[i-1]].title.localeCompare(by[id].title)<0||(by[o[i-1]].title===by[id].title&&o[i-1]<id))))));
 const p=oid(T.sortJobs(D.jobs,{q:''},'pay'));
 ok(F,'pay sort: non-increasing hourly upper end, unknown pay last, ties by recency (adjacent-pair property)',p.every((id,i)=>{if(i===0)return true;const a=by[p[i-1]],b=by[id],ra=rate(a),rb=rate(b);if(ra===null)return rb===null;if(rb===null)return true;return ra>rb||(ra===rb&&a.postedDays<=b.postedDays)}));
 ok(F,'pay sort puts every unknown-pay job after every known-pay job',(()=>{const f=p.findIndex(id=>rate(by[id])===null);return f===-1||p.slice(f).every(id=>rate(by[id])===null)})());
 eq(F,'sorting deterministic regardless of input order (real data)',oid(T.sortJobs(D.jobs.slice().reverse(),{q:'office'},'relevance')),oid(T.sortJobs(D.jobs,{q:'office'},'relevance')));
}
{// independent restatement of the documented Best match rule (DATA-NOTES.md); checks adjacent pairs, never calls sortJobs to derive the expectation
 const occT=Object.fromEntries(D.occupations.map(o=>[o.id,o.title.toLowerCase()]));
 const score=(j,q)=>{const ts=q.toLowerCase().split(/\s+/).filter(Boolean);let s=j.title.toLowerCase().includes(q.toLowerCase())?3:0;for(const t of ts){if(j.title.toLowerCase().includes(t))s+=4;if(occT[j.occupationId].includes(t))s+=2;if(j.keywords.map(k=>k.toLowerCase()).includes(t))s+=2;if(j.employer.toLowerCase().includes(t))s+=1}return s};
 for(const q of ['administrative','office','assistant','clerk','customer service','medical']){
  const rows=T.sortJobs(T.filterJobs({...dd,q}),{q},'relevance');
  ok(F,`best match for '${q}' (${rows.length} jobs): scores non-increasing; equal scores ordered by recency, title, ID; no record boosted by identity`,rows.length>0&&rows.every((j,i)=>{if(!i)return true;const p=rows[i-1],a=score(p,q),b=score(j,q);return a>b||(a===b&&(p.postedDays<j.postedDays||(p.postedDays===j.postedDays&&(p.title.localeCompare(j.title)<0||(p.title===j.title&&p.id<j.id)))))}));}
}
eq(F,'posted within 7 days: every returned job qualifies and none excluded qualifies',[...rj({days:'7'})].sort().join()===D.jobs.filter(j=>j.postedDays<=7).map(j=>j.id).sort().join(),true);
eq(F,'jobs posted more than 30 days ago exist and are excluded by "Last 30 days"',[D.jobs.some(j=>j.postedDays>30),rj({days:'30'}).some(id=>D.jobs.find(j=>j.id===id).postedDays>30)],[true,false]);
eq(F,'no-result searches: nonsense keyword, and receptionists within 25 mi of Roanoke',[rj({q:'zzzz'}),rj({q:'receptionist',city:'Roanoke, VA',radius:'25'})],[[],[]]);
eq(F,'recovery: dropping the location restores the four receptionist jobs',rj({q:'receptionist'}),['J05','J18','J19','J20']);
// providers and programs
const rp=o=>sid(T.filterProviders({...T.defaults.providers,...o})),rg=o=>sid(T.filterPrograms({...T.defaults.programs,...o}));
eq(F,'providers in Richmond',rp({city:'Richmond, VA'}),['T01','T05','T06','T07','T08','T09','T10']);
eq(F,'providers in Henrico',rp({city:'Henrico, VA'}),['T02','T11']);
eq(F,"providers of type 'Career school'",rp({type:'Career school'}),['T02','T03','T05','T07','T11','T14','T15','T16']);
eq(F,"provider keyword 'business'",rp({q:'business'}),['T05','T11']);
eq(F,'programs delivered in Richmond (P08 is a Henrico satellite of a Richmond provider)',rg({city:'Richmond, VA'}),['P01','P02','P07','P09','P10','P11','P12','P13','P14','P15','P16','P17','P18']);
eq(F,'programs delivered in Henrico',rg({city:'Henrico, VA'}),['P03','P04','P08','P19']);
eq(F,'weekend programs',rg({schedule:'Weekend'}),['P03','P18','P23']);
eq(F,'online programs',rg({format:'Online'}),['P06','P28']);
eq(F,'programs costing $300 or less',rg({cost:'300'}),['P02','P11','P12','P13','P22','P28']);
eq(F,'programs by provider T08',rg({provider:'T08'}),['P14','P15','P16']);
// occupation -> programs relationships (hand-listed from authored occupationIds)
const O2P={O01:['P01','P02','P03','P06','P07','P08','P12','P22','P24'],O04:['P02','P04','P13','P19'],O07:['P07','P24'],O10:['P11','P12','P22','P28'],O14:[],O19:['P27'],O22:['P17'],O25:['P15']};
for(const [o,want] of Object.entries(O2P))eq(F,`programs linked to ${o}`,rg({occupation:o}),want);
ok(F,'some occupations have no linked program (empty-result path is reachable): O14, O16, O29, O38, O39, O40',['O14','O16','O29','O38','O39','O40'].every(o=>rg({occupation:o}).length===0));

// ===== 4. UI routes (stubbed DOM) =====
const U=mk();
for(const [rt,txt] of [['home','Find jobs'],['occupations','Explore occupations'],['occupation/O01','Administrative Assistant'],['occupation/O40','Groundskeeper'],['training','Training &amp; Education'],['providers','Find training providers'],['provider/T01','Richmond Learning Center'],['provider/T16','Blue Ridge Care Training'],['programs','Find training programs'],['program/P01','Office Software Fundamentals'],['program/P28','Online Customer Support Foundations'],['jobs','Search criteria'],['results','Job search results'],['job/J01','Job details'],['job/J80','Groundskeeper'],['apply/J01','Prototype boundary'],['apply/J11','Employer’s own application site'],['apply/J12','Virginia Workforce Connection account'],['nosuch','Page not found'],['job/J999','Page not found'],['provider/T99','Page not found'],['program/P99','Page not found'],['occupation/O99','Page not found'],['apply/J999','Page not found']])
  ok(F,`route #${rt} renders expected content`,has(U.go(rt),txt));
eq(F,'every occupation route renders its title',D.occupations.filter(o=>!has(U.go('occupation/'+o.id),o.title)).map(o=>o.id),[]);
eq(F,'every provider route renders its name and lists each of its programs',D.providers.filter(p=>{const h=U.go('provider/'+p.id);return !has(h,p.name)||!p.programIds.every(i=>has(h,D.programs.find(x=>x.id===i).title))}).map(p=>p.id),[]);
eq(F,'every program route renders its title and its provider name',D.programs.filter(p=>{const h=U.go('program/'+p.id);return !has(h,p.title)||!has(h,D.providers.find(t=>t.id===p.providerId).name)}).map(p=>p.id),[]);
eq(F,'every job route renders its title and employer; unknown pay/schedule display as Not provided',D.jobs.filter(j=>{const h=U.go('job/'+j.id);return !has(h,j.title)||!has(h,j.employer)||((j.payMin===null||j.schedule===null)&&!h.includes('Not provided'))}).map(j=>j.id),[]);
eq(F,"every apply route states the job's own application method and that nothing was submitted",D.jobs.filter(j=>{const h=U.go('apply/'+j.id);return !has(h,j.applyMethod==='account'?'Virginia Workforce Connection account':'Employer’s own application site')||!/No application/.test(h)}).map(j=>j.id),[]);
U.go('occupations');ok(F,'occupation group view lists all occupations',D.occupations.every(o=>has(U.html,o.title)));
eq(F,'every job is reachable by searching its own title (statewide)',D.jobs.filter(j=>!T.filterJobs({...dd,q:j.title}).some(x=>x.id===j.id)).map(j=>j.id),[]);
eq(F,'every program and provider is reachable by searching its own title/name',[...D.programs.filter(p=>!T.filterPrograms({...T.defaults.programs,q:p.title}).some(x=>x.id===p.id)).map(p=>p.id),...D.providers.filter(p=>!T.filterProviders({...T.defaults.providers,q:p.name}).some(x=>x.id===p.id)).map(p=>p.id)],[]);
eq(F,'storage key is separate from the baseline key',Object.keys(U.store).filter(k=>k!=='vawc-p4-revised-v1'),[]);
// fresh session neutrality
{const f=mk();f.go('jobs');const j=f.html;f.go('programs');const pr=f.html;f.go('providers');
 const st=JSON.parse(f.store['vawc-p4-revised-v1']);
 eq(F,'fresh session: saved draft criteria equal neutral defaults, nothing applied',[st.jobs,st.jobApplied,st.programs.occupation,st.selected],[T.defaults.jobs,null,'',[]]);
 ok(F,'fresh session: programs page shows no inherited occupation condition',!pr.includes('Occupation:</strong>'));
 ok(F,'participant screens contain no answer-like placeholders or task wording',![j,pr,f.html].some(h=>/placeholder="(e\.g\.|administrative)/i.test(h)||/benchmark|BT1|task [A-D]/i.test(h)));
 f.go('occupations');ok(F,'occupation filter placeholder is sensible (regression from pass 1)',f.html.includes('placeholder="Group name"')&&!f.html.includes('placeholder="Program title"'));}
// occupation -> training context
const titlesOf=ids=>ids.map(i=>D.programs.find(p=>p.id===i).title);
for(const [o,want] of [['O04',O2P.O04],['O22',O2P.O22],['O07',O2P.O07]]){
  const a=mk();a.go('occupation/'+o);a.click({action:'occ-training',id:o});const h=a.html,cards=(h.match(/View program details/g)||[]).length;
  ok(F,`occupation ${o} → training: removable occupation chip, ${want.length} linked programs, expected titles only`,a.loc.hash==='#programs'&&h.includes('Occupation:</strong>')&&h.includes('Remove occupation condition')&&cards===want.length&&titlesOf(want).every(t=>has(h,t))&&D.programs.filter(p=>!want.includes(p.id)).every(p=>!has(h,'>'+p.title+'<')));
  ok(F,`occupation ${o}: location not silently set (applied summary shows All Virginia)`,h.includes('Training location: All Virginia'));
}
{const a=mk();a.go('programs');a.click({action:'occ-training',id:'O14'});const h=a.html;
 ok(F,'occupation with no linked programs shows an explained empty result, chip, and a recovery link to organizations',h.includes('No programs match these criteria')&&h.includes('Occupation:</strong>')&&h.includes('Search organizations instead'));
 a.click({action:'remove-occupation'});ok(F,'removing the occupation changes the draft only; applied results stay until Search',a.html.includes('Changes not applied')&&!a.html.includes('Remove occupation condition')&&a.html.includes('No programs match these criteria'));}
{const a=mk();a.go('programs');const none=(a.html.match(/View program details/g)||[]).length===0&&!a.html.includes('Applied:');
 ok(F,'direct visit to training programs: no occupation chip and no applied search until the user searches',!a.html.includes('Occupation:</strong>')&&none);
 eq(F,'a blank search (neutral criteria) matches every record: 28 programs, 16 providers, 80 jobs',[T.filterPrograms(T.defaults.programs).length,T.filterProviders(T.defaults.providers).length,T.filterJobs(T.defaults.jobs).length],[28,16,80]);
 const r=mk();r.go('results');ok(F,'fresh results page prompts for a search instead of showing prefilled results',r.html.includes('Start a job search')&&!r.html.includes('Applied:'));}
// evaluator page separation and reset
const ls={'vawc-p4-v1':'baseline','vawc-p4-revised-v1':'revised'};
{const cx={window:{},document:{getElementById:()=>null},localStorage:{removeItem:k=>{delete ls[k]}}};vm.createContext(cx);vm.runInContext(fs.readFileSync(path.join(ROOT,'evaluator/evaluator.js'),'utf8'),cx);cx.window.resetRevisedStorage();}
ok(F,'evaluator reset removes only the revised key',!('vawc-p4-revised-v1' in ls)&&ls['vawc-p4-v1']==='baseline');
ok(F,'participant files do not link to the evaluator page',!/evaluator/i.test(fs.readFileSync(path.join(ROOT,'index.html'),'utf8'))&&!/evaluator/i.test(appSrc));

// ===== 5. DATASET ACCEPTANCE: the six agreed targets, counting unique usable records =====
const usable={
 occupations:D.occupations.filter(o=>nonEmpty(o.title)&&o.duties.length>=3&&o.skills.length>=3&&nonEmpty(o.summary)),
 providers:D.providers.filter(p=>nonEmpty(p.name)&&known(p.city)&&p.programIds.length>0&&p.programIds.every(i=>progIds.has(i))),
 programs:D.programs.filter(p=>nonEmpty(p.title)&&provIds.has(p.providerId)&&p.occupationIds.length&&p.occupationIds.every(i=>occIds.has(i))),
 jobs:D.jobs.filter(j=>nonEmpty(j.title)&&nonEmpty(j.employer)&&occIds.has(j.occupationId)&&known(j.city)&&nonEmpty(j.qualifications)&&nonEmpty(j.description))};
const uniq=(a,f)=>new Set(a.map(f)).size;
ok(DS,`occupations: ${uniq(usable.occupations,o=>o.title)} unique usable (target >= 40)`,uniq(usable.occupations,o=>o.title)>=40);
ok(DS,`occupation groups: ${new Set(usable.occupations.map(o=>o.group)).size} (target >= 10)`,new Set(usable.occupations.map(o=>o.group)).size>=10);
ok(DS,`providers: ${uniq(usable.providers,p=>p.name)} unique usable (target >= 16)`,uniq(usable.providers,p=>p.name)>=16);
ok(DS,`Richmond providers: ${usable.providers.filter(p=>p.city==='Richmond, VA').length} (target >= 6)`,usable.providers.filter(p=>p.city==='Richmond, VA').length>=6);
ok(DS,`programs: ${uniq(usable.programs,p=>p.providerId+p.title)} unique usable (target >= 24)`,uniq(usable.programs,p=>p.providerId+p.title)>=24);
ok(DS,`jobs: ${uniq(usable.jobs,j=>[j.title,j.employer,j.city].join('|'))} unique usable (target >= 80)`,uniq(usable.jobs,j=>[j.title,j.employer,j.city].join('|'))>=80);

// ===== report =====
let bad=0;
for(const r of R){if(!r.pass){bad++;console.log('FAIL ['+r.cat+'] '+r.name)}}
for(const c of [F,DS]){const x=R.filter(r=>r.cat===c);console.log(`${c}: ${x.filter(r=>r.pass).length} passed, ${x.filter(r=>!r.pass).length} failed (of ${x.length})`)}
console.log(`TOTAL: ${R.filter(r=>r.pass).length} passed, ${bad} failed (of ${R.length})`);
process.exitCode=bad?1:0;
