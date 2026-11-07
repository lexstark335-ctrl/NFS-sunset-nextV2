const test=require('node:test'),assert=require('node:assert/strict');
let Career,CAREER_KEY;
test.before(async()=>({Career,CAREER_KEY}=await import('../src/career.js')));
function memory(raw=null){const data=new Map();if(raw!==null)data.set(CAREER_KEY,raw);return {data,writes:0,getItem(k){return data.get(k)??null;},setItem(k,v){this.writes++;data.set(k,v);}};}

test('career counts only positive formal driving increments, independent of score or car',()=>{
 const storage=memory(),c=new Career({storage,now:()=>0});
 for(const state of ['off','intro','paused','over','exit'])c.advance(100,state,false);
 c.advance(100,'running',true);
 for(const bad of [-1,0,NaN,Infinity,'12'])c.advance(bad,'running',false);
 assert.equal(c.totalMeters,0);
 c.advance(10,'running',false);c.advance(25.5,'running',false);assert.equal(c.totalMeters,35.5);
 c.checkpoint();assert.equal(new Career({storage}).totalMeters,35.5);
});

test('career coalesces writes and flushes only unsaved distance',()=>{
 let clock=0;const storage=memory(),c=new Career({storage,now:()=>clock});
 for(let i=0;i<599;i++){clock+=1000/120;c.advance(1,'running',false);}
 assert.equal(storage.writes,0);clock=5001;c.advance(1,'running',false);assert.equal(storage.writes,1);
 c.checkpoint();assert.equal(storage.writes,1);
 c.advance(3,'running',false);c.checkpoint();assert.equal(storage.writes,2);
 assert.equal(new Career({storage}).totalMeters,603);
});

test('missing, malformed and unsupported career saves start at zero without rewriting other keys',()=>{
 for(const raw of [null,'broken','null','[]','{}','{"version":2,"totalMeters":50}','{"version":1,"totalMeters":-1}','{"version":1,"totalMeters":"50"}','{"version":1,"totalMeters":1e999}']){
  const storage=memory(raw);storage.data.set('roku-neon-integrated-v1-total','9000');
  const c=new Career({storage});assert.equal(c.totalMeters,0);assert.equal(storage.writes,0);
  c.advance(20,'running',false);c.checkpoint();assert.equal(storage.data.get('roku-neon-integrated-v1-total'),'9000');
 }
});

test('blocked storage keeps in-memory mileage and recovers on a later successful save',()=>{
 let blocked=true;const storage={getItem(){throw Error('blocked');},setItem(){if(blocked)throw Error('blocked');}};
 const c=new Career({storage,now:()=>0});assert.equal(c.storageAvailable,false);
 assert.doesNotThrow(()=>{c.advance(42,'running',false);c.checkpoint();});assert.equal(c.totalMeters,42);assert.equal(c.dirty,true);
 blocked=false;c.checkpoint();assert.equal(c.storageAvailable,true);assert.equal(c.dirty,false);
});

test('distance integration is identical at 30, 60 and 144 Hz',()=>{
 for(const fps of [30,60,144]){const c=new Career({storage:memory(),now:()=>0});for(let i=0;i<fps*10;i++)c.advance(60/fps,'running',false);assert.ok(Math.abs(c.totalMeters-600)<1e-8);}
});
