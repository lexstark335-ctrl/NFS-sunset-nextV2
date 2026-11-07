/** 分别验证根路径和新 Pages 子路径；HTTP 200 不等同于浏览器画面验收。 */
const {spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const paths=['','PLAY.html','boot.js','recovery.css','assets/sceneApp-7cpBE01P.js','assets/three-BJx-OGLx.js','assets/translation-adapter.js','assets/index-BWe1F7s7.css','fonts/pixel-zh.woff2','fonts/pixel-zh.ttf','assets/models/ignition-car.glb','assets/models/police-car.glb','audio/boost.mp3','vendor/nes-core.min.css',...fs.readdirSync(path.join(root,'src')).map(name=>'src/'+name),...fs.readdirSync(path.join(root,'assets/crt')).map(name=>'assets/crt/'+name)];
function check(mount){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['serve.cjs','0',mount],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
 const deadline=setTimeout(()=>{child.kill();reject(Error('服务启动超时'));},15000);
 child.stderr.on('data',data=>process.stderr.write(data));
 child.stdout.once('data',async data=>{
  try{
   const base=data.toString().match(/http:\/\/127\.0\.0\.1:\d+\/\S*/)[0];
   const responses=await Promise.all(paths.map(async file=>{
    const r=await fetch(base+file,{method:file?'HEAD':'GET',signal:AbortSignal.timeout(4000)});
    if(r.status!==200)throw Error(file+' HTTP '+r.status);
    if(!file&&!(await r.text()).includes('integrated-career'))throw Error('入口内容不匹配');
    return r.status;
   }));
   if(mount!=='/'){
    const redirect=await fetch(base.slice(0,-1),{redirect:'manual',signal:AbortSignal.timeout(4000)});
    if(redirect.status!==301||redirect.headers.get('location')!==mount)throw Error('项目子路径重定向错误');
    const original=await fetch(new URL('/NFS-sunset/',base),{signal:AbortSignal.timeout(4000)});
    if(original.status!==404)throw Error('预览器不应冒充原站路径');
   }
   resolve({mount,resources:responses.length,response:200});
  }catch(error){reject(error);}
  finally{clearTimeout(deadline);child.kill();}
 });
 child.on('error',error=>{clearTimeout(deadline);reject(error);});
 child.on('exit',code=>{if(code&&code!==0){clearTimeout(deadline);reject(Error('预览器退出：'+code));}});
});}
(async()=>{
 const mounts=[];for(const mount of ['/','/NFS-sunset-next/'])mounts.push(await check(mount));
 console.log(JSON.stringify({status:'verified',resources:paths.length,mounts,method:'启动实际 serve.cjs，GET 入口、HEAD 全部运行资源，并检查子路径重定向',scope:'同一执行环境 HTTP 服务；不是浏览器渲染或线上 Pages 验收'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
