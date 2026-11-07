const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./dom-fixture.cjs')();
let integration,THREE,createRacer;
test.before(async()=>{
 ({integration}=await import('../src/runtime.js'));THREE=await import('../src/three.js');({createRacer}=await import('../assets/racer-testable.js'));
 await integration.load();integration.openGarage=function(){this.opened=true;};integration.closeGarage=function(){this.opened=false;};
});
function setup(){
 fixture.store.clear();
 const sim=createRacer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,1,.1,1000),gridFloor:{speed:.05}});
 const api=integration.api;let time=0;
 const run=seconds=>{for(let i=0;i<seconds*120;i++){time+=1/120;sim.update(1/120,time);}};
 return {sim,api,run};
}
test('both user GLBs parse into drawable geometry; four player vehicles use distinct cached models',()=>{
 assert.deepEqual(integration.library.status,['ready','ready','ready','ready']);
 for(const id of [0,1,2,3]){
  const car=integration.createVehicle(id);let meshes=0;car.traverse(n=>{if(n.isMesh&&n.geometry.attributes.position.count>0)meshes++;});
  assert.ok(meshes>=4);assert.equal(car.userData.vehicleId,id);assert.equal(integration.createVehicle(id),car);
 }
 assert.equal(integration.cache.size,4);
});
test('original entry transitions into driving; steering, boost and pause work through the same simulation',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);assert.equal(api.snapshot().state,'running');
 const before=api.snapshot();api.debug.setInput(-1);run(.5);api.debug.setInput(0);assert.ok(api.snapshot().x<before.x);
 api.boost();run(.8);assert.ok(api.snapshot().speed>before.speed);assert.ok(api.snapshot().boost>0);
 api.pause();const paused=api.snapshot();run(1);assert.equal(api.snapshot().distance,paused.distance);assert.equal(api.snapshot().score,paused.score);
 api.resume();run(.2);assert.ok(api.snapshot().score>paused.score);
});
test('all four free trials switch actual model without any persisted score or selection',()=>{
 const {api,run}=setup();const before=[...fixture.store];
 for(const id of [0,1,2,3]){
  api.trial(id);run(id===0?4.8:.3);assert.equal(api.snapshot().selected,id);assert.equal(api.getCar(),integration.cache.get(id));
  api.debug.finish();assert.equal(api.snapshot().state,'over');assert.deepEqual([...fixture.store],before);
 }
 api.exit();run(1);assert.equal(api.snapshot().selected,0);assert.equal(api.snapshot().trial,false);assert.deepEqual([...fixture.store],before);
});
test('a real traffic collision ends the run and banks normal score only once',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);
 const state=api.snapshot(),traffic=api.debug.traffic[0];traffic.active=true;traffic.z=-.5;traffic.lane=state.x-state.roadCenter;
 run(.03);assert.equal(api.snapshot().state,'over');assert.ok(api.snapshot().total>0);
 const total=api.snapshot().total;api.debug.finish();assert.equal(api.snapshot().total,total);
 const saved=[...fixture.store];assert.ok(saved.every(([key])=>key.startsWith('nfs-sunset-next-v1-')));
});
test('unlock threshold and saved selection survive a new game instance',()=>{
 const {api}=setup();assert.equal(api.select(3),false);
 fixture.store.set('nfs-sunset-next-v1-total','40000');
 createRacer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,1,.1,1000),gridFloor:{speed:.05}});
 const next=integration.api;assert.equal(next.select(3),true);assert.equal(next.snapshot().total,40000);assert.equal(next.getCar().userData.vehicleId,3);
 assert.equal(integration.cache.size,4);
 createRacer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,1,.1,1000),gridFloor:{speed:.05}});
 assert.equal(integration.api.snapshot().selected,3);assert.equal(integration.api.snapshot().total,40000);
});

test('retry clears score, collision and boost state without banking the previous run twice',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);api.boost();run(.2);api.debug.finish();
 const bank=api.snapshot().total;api.debug.retry();
 assert.equal(api.snapshot().state,'running');assert.equal(api.snapshot().score,0);
 assert.equal(api.snapshot().boostLeft,0);assert.equal(api.snapshot().total,bank);
 assert.ok(api.debug.traffic.every(car=>!car.active));run(.15);assert.ok(api.snapshot().score>0);
});

test('actual tail mesh vertices are finite and stay on the trail layer while the road stays on world layer',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);
 for(let i=0;i<30;i++){run(1/60);integration.frame(1/60,i/60);}
 assert.ok(integration.trails.length>0);
 for(const ribbon of integration.trails.meshes){assert.equal(ribbon.layers.mask,4);assert.ok([...ribbon.geometry.attributes.position.array].every(Number.isFinite));}
 api.getCar().traverse(n=>assert.equal(n.layers.mask,2));
 api.pause();const length=integration.trails.length;integration.frame(.5,1);assert.equal(integration.trails.length,length);
 api.debug.finish();api.exit();integration.frame(.1,2);assert.equal(integration.trails.length,0);
});

test('garage builds four cards and reuses one preview renderer and four objects for 25 visits (GPU mocked)',async()=>{
 const {api}=setup(),{Garage}=await import('../src/garage.js');let created=0,rendered=0;
 const garage=new Garage(integration.library,api,()=>{created++;return {domElement:new fixture.Node('canvas'),setSize(){},setClearColor(){},render(scene){assert.equal(scene.children.length,1);rendered++;}};});
 let originals;
 for(let visit=0;visit<25;visit++){
  garage.open();assert.equal(fixture.ids.get('integrated-vehicles').children.length,4);assert.equal(garage.cache.size,4);
  if(!originals)originals=[...garage.cache.values()];else assert.deepEqual([...garage.cache.values()],originals);
  garage.close();assert.equal(garage.panel.hidden,true);
 }
 assert.equal(created,1);assert.equal(rendered,100);assert.equal(garage.renders,100);
});

test('career uses actual road movement, excludes entry/pause/over and includes boost movement',()=>{
 const {sim,api,run}=setup();sim.enter();run(4);assert.equal(api.snapshot().state,'intro');assert.equal(integration.career.totalMeters,0);
 run(.8);const first=api.snapshot(),meters=integration.career.totalMeters;assert.ok(meters>0);
 run(.15);let state=api.snapshot();assert.ok(Math.abs((integration.career.totalMeters-meters)-(state.distance-first.distance))<1e-8);
 api.pause();const paused=integration.career.totalMeters;run(1);assert.equal(integration.career.totalMeters,paused);
 api.resume();const distance=api.snapshot().distance,normalSpeed=api.snapshot().speed;api.boost();run(.5);state=api.snapshot();
 assert.ok(state.speed>normalSpeed);assert.ok(Math.abs((integration.career.totalMeters-paused)-(state.distance-distance))<1e-8);
 api.debug.finish();const ended=integration.career.totalMeters;run(2);assert.equal(integration.career.totalMeters,ended);
 assert.equal(JSON.parse(fixture.store.get('nfs-sunset-next-v1-career')).totalMeters,ended);
});

test('retry adds only the next distance, free trial never changes saved career, and another instance restores it',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);api.debug.finish();
 const before=integration.career.totalMeters;api.debug.retry();assert.equal(integration.career.totalMeters,before);
 const distance=api.snapshot().distance;run(.2);const after=integration.career.totalMeters;
 assert.ok(Math.abs(after-before-(api.snapshot().distance-distance))<1e-8);api.debug.finish();
 const persisted=fixture.store.get('nfs-sunset-next-v1-career');
 for(const id of [0,1,2,3]){api.trial(id);run(.1);api.debug.finish();assert.equal(integration.career.totalMeters,after);assert.equal(fixture.store.get('nfs-sunset-next-v1-career'),persisted);}
 createRacer({scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(75,1,.1,1000),gridFloor:{speed:.05}});
 assert.equal(integration.career.totalMeters,after);
});

test('game-over home button returns through original camera transition, saves once, and allows re-entry',()=>{
 const {sim,api,run}=setup();integration.wireUI();sim.enter();run(4.8);
 const initial=api.snapshot(),traffic=api.debug.traffic[0];traffic.active=true;traffic.z=-.5;traffic.lane=initial.x-initial.roadCenter;
 run(.03);assert.equal(api.snapshot().state,'over');integration.frame(0,0);
 const home=fixture.ids.get('racer-home-btn');assert.equal(home.hidden,false);
 const total=api.snapshot().total,meters=integration.career.totalMeters;
 home.onclick();home.onclick();assert.equal(api.snapshot().state,'exit');assert.equal(home.hidden,true);
 assert.equal(document.body.classList.contains('racer-active'),false);assert.ok(fixture.ids.get('racer-overlay').classList.contains('is-hidden'));
 run(1);assert.equal(api.snapshot().state,'off');assert.equal(api.snapshot().total,total);assert.equal(integration.career.totalMeters,meters);
 sim.enter();run(4.8);assert.equal(api.snapshot().state,'running');assert.ok(integration.career.totalMeters>meters);assert.equal(api.snapshot().boostLeft,0);
});

test('new site stores do not read or overwrite original website progress',()=>{
 const {sim,api,run}=setup();const originals=[['roku-neon-integrated-v1-total','40000'],['roku-neon-integrated-v1-hiscore','15000'],['roku-neon-integrated-v1-car','3']];
 for(const [k,v]of originals)fixture.store.set(k,v);
 assert.equal(api.snapshot().total,0);assert.equal(api.snapshot().selected,0);assert.equal(integration.career.totalMeters,0);
 sim.enter();run(4.8);api.debug.finish();for(const [k,v]of originals)assert.equal(fixture.store.get(k),v);
});

test('career panel opens from home, formats mileage and restores focus; background/pagehide checkpoint progress',()=>{
 const {sim,api,run}=setup();integration.wireUI();const button=fixture.ids.get('menu-career');button.focus();
 integration.career.totalMeters=12345;button.onclick();assert.equal(fixture.ids.get('integrated-career').hidden,false);
 assert.equal(fixture.ids.get('career-distance').textContent,'12.35');assert.equal(document.body.classList.contains('racer-career-open'),true);
 fixture.ids.get('career-back').onclick();assert.equal(fixture.ids.get('integrated-career').hidden,true);assert.equal(document.activeElement,button);
 sim.enter();run(4.8);document.hidden=true;fixture.dispatch('visibilitychange',{});document.hidden=false;
 assert.equal(JSON.parse(fixture.store.get('nfs-sunset-next-v1-career')).totalMeters,integration.career.totalMeters);
 run(.1);fixture.dispatch('window:pagehide',{persisted:true});assert.equal(JSON.parse(fixture.store.get('nfs-sunset-next-v1-career')).totalMeters,integration.career.totalMeters);
 api.exit();run(1);
});

test('focused home button Enter cannot trigger retry, while steering still works after clicking start',()=>{
 const {sim,api,run}=setup();sim.enter();run(4.8);api.debug.finish();
 const target={closest:selector=>selector==='button,input,select,a'?{}:null};
 fixture.dispatch('keydown',{key:'Enter',target,preventDefault(){}});assert.equal(api.snapshot().state,'over');
 api.debug.retry();const before=api.snapshot().x;
 fixture.dispatch('keydown',{key:'ArrowLeft',target,preventDefault(){}});run(.1);fixture.dispatch('keyup',{key:'ArrowLeft'});assert.ok(api.snapshot().x<before);
});
