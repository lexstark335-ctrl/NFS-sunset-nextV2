const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const digest=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
test('standalone embeds both exact GLBs and all runtime ESM imports resolve internally',()=>{
 const html=read('PLAY.html');
 const imports=JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]).imports;
 const assets=JSON.parse(html.match(/window\.NEON_ASSET_URLS=(.*?)<\/script>/s)[1]);
 for(const name of ['ignition-car.glb','police-car.glb']){
  const bytes=Buffer.from(assets[name].split(',')[1],'base64');assert.equal(bytes.readUInt32LE(0),0x46546c67);
  assert.equal(digest(bytes),digest(fs.readFileSync(path.join(root,'assets/models',name))));
 }
 const modules=Object.entries(imports);assert.equal(modules.filter(([name])=>/three-BJx/.test(name)).length,1);
 for(const [name,data] of modules){
  const code=Buffer.from(data.split(',')[1],'base64').toString();
  for(const m of code.matchAll(/(?:\b(?:import|export)\s*(?:\{[^}]*\}|\*\s+as\s+\w+)\s*from\s*|\bimport\s*\()(['"])([^'"]+)\1/g))assert.ok(imports[m[2]],name+' unresolved '+m[2]);
 }
 assert.equal((html.match(/<link rel="stylesheet"/g)||[]).length,0);assert.equal((html.match(/<script[^>]+src=/g)||[]).length,0);
 assert.ok(!html.includes('<iframe'));assert.ok(imports['integrated/boot.js']);
});
test('local directory imports and CSS assets exist; old player/backend hooks are removed',()=>{
 const modules=['boot.js','assets/sceneApp-7cpBE01P.js',...fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js')).map(f=>'src/'+f)];
 for(const file of modules)for(const m of read(file).matchAll(/(?:\bfrom\s*|\bimport\s*\()(['"])(\.{1,2}\/[^'"]+)\1/g))assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),m[2])),file+' missing '+m[2]);
 for(const file of ['assets/index-BWe1F7s7.css','recovery.css','vendor/nes-core.min.css']){
  for(const m of read(file).matchAll(/url\((['"]?)([^'"()]+)\1\)/g)){
   if(/^(?:data:|#|%23)/.test(m[2]))continue;
   assert.ok(fs.existsSync(path.resolve(root,path.dirname(file),m[2])),'missing '+m[2]);
  }
 }
 const scene=read('assets/sceneApp-7cpBE01P.js');
 for(const absent of ['window.__rokuUI','setupAudio(){','window.loadMusicURL','synthwave-racer-','originalOnMouseMove'])assert.ok(!scene.includes(absent),absent);
 assert.ok(scene.includes('Ao.visible=false;ps.visible=false;fs.visible=false'));
 assert.ok(scene.includes('integration.createVehicle(o)'));
 assert.ok(scene.includes('integration.frame(t/1e3,e)'));
});

test('entry, module, model and stylesheet URLs stay under the independent Pages project path',()=>{
 const base='https://lexstark335-ctrl.github.io/NFS-sunset-next/';
 const check=(ref,file)=>{
  if(/^(?:data:|#|%23)/.test(ref))return;
  const resolved=new URL(ref,new URL(file,base));
  assert.equal(resolved.origin,new URL(base).origin,ref);
  assert.ok(resolved.pathname.startsWith('/NFS-sunset-next/'),file+' escapes project: '+ref);
  assert.ok(fs.existsSync(path.join(root,decodeURIComponent(resolved.pathname.slice('/NFS-sunset-next/'.length)))),file+' missing '+ref);
 };
 for(const m of read('index.html').matchAll(/\b(?:src|href)="([^"]+)"/g))check(m[1],'index.html');
 for(const file of ['boot.js','assets/sceneApp-7cpBE01P.js',...fs.readdirSync(path.join(root,'src')).map(f=>'src/'+f)]){
  for(const m of read(file).matchAll(/(?:\bfrom\s*|\bimport\s*\()(['"])([^'"]+)\1/g))check(m[2],file);
 }
 for(const file of ['assets/index-BWe1F7s7.css','recovery.css','vendor/nes-core.min.css'])
  for(const m of read(file).matchAll(/url\((['"]?)([^'"()]+)\1\)/g))check(m[2],file);
 for(const model of ['ignition-car.glb','police-car.glb'])check('../assets/models/'+model,'src/models.js');
 assert.equal(fs.existsSync(path.join(root,'CNAME')),false);
});
