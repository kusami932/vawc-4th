/* Controlled test fixture: six jobs on one meridian so distances are simple arithmetic
   (1 degree of latitude = 69.09 miles; 0.05° = 3.5 mi, 0.2° = 13.8 mi, 0.4° = 27.6 mi, 0.8° = 55.3 mi). */
const J=(id,title,city,occ,type,lo,hi,unit,sch,days,kw,extra)=>Object.assign({id,title,employer:'Fixture Co '+id,city,occupationId:occ,type,payMin:lo,payMax:hi,payUnit:unit,schedule:sch,qualifications:'Fixture qualifications.',description:'Fixture description.',duties:['a','b','c'],postedDays:days,workArrangement:'On-site',education:'High school',source:'Employer',applyMethod:'external',keywords:kw},extra||{});
window.VAWC_DATA={meta:{referenceDate:'2026-01-01',note:'Controlled test fixture'},
occupations:[{id:'X1',title:'Alpha Role',group:'Group One',summary:'s',duties:['a','b','c'],skills:['a','b','c'],qualifications:'q',keywords:['alpha']},{id:'X2',title:'Beta Role',group:'Group Two',summary:'s',duties:['a','b','c'],skills:['a','b','c'],qualifications:'q',keywords:['beta']}],
providers:[{id:'Y1',name:'Fixture Provider',city:'Basetown, VA',type:'Training center',description:'d',programIds:['Z1']}],
programs:[{id:'Z1',occupationIds:['X1'],title:'Fixture Program',providerId:'Y1',city:'Basetown, VA',qualification:'Certificate of completion',cost:100,schedule:'Daytime',format:'In person',description:'d',skills:['a'],availability:'x',keywords:['fixture']}],
jobs:[
 J('F1','Alpha Role','Basetown, VA','X1','Full-time',20,20,'hour','Daytime',1,['alpha','role']),
 J('F2','Alpha Role','Nearby, VA','X1','Full-time',40000,44000,'year','Daytime',5,['alpha']),
 J('F3','Alpha Role','Midville, VA','X1','Part-time',18,19,'hour','Evening',10,['alpha']),
 J('F4','Beta Role','Farton, VA','X2','Full-time',null,null,'hour',null,20,['beta']),
 J('F5','Beta Role','Distantville, VA','X2','Full-time',30,30,'hour','Daytime',40,['beta'],{education:'Associate degree',source:'Job board',workArrangement:'Remote'}),
 J('F6','Zeta Task','Basetown, VA','X1','Full-time',19,19,'hour',null,0,['alpha'])],
locations:[{id:'base',label:'Basetown, VA',aliases:['Basetown'],lat:37,lon:-77},{id:'near',label:'Nearby, VA',aliases:['Nearby'],lat:37.05,lon:-77},{id:'mid',label:'Midville, VA',aliases:[],lat:37.2,lon:-77},{id:'far',label:'Farton, VA',aliases:[],lat:37.4,lon:-77},{id:'dist',label:'Distantville, VA',aliases:[],lat:37.8,lon:-77}]};
