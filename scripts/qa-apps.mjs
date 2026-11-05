import{createRequire}from'node:module';import{mkdir,writeFile}from'node:fs/promises';import{createHash}from'node:crypto';import path from'node:path';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(path.join(process.env.ACN_TOOL_DIR||path.resolve(root,'../tooling/site-qa'),'package.json')),{chromium}=require('playwright'),out=path.join(root,'docs/review');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],results=[];const base='http://127.0.0.1:4181/';
try{
 for(const[label,width,height]of[['desktop',1440,1000],['phone',390,844]]){
  const c=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(`${label}: ${e.message}`));
  for(const file of['index.html','apps.html','models.html','astrabudget.html','astraworld.html','hydrascan.html']){
   const response=await p.goto(base+file,{waitUntil:'networkidle'});if(response.status()!==200)errors.push(`HTTP${response.status()} ${file}`);
   await p.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight){scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));scrollTo(0,0);});await p.waitForTimeout(100);
   const state=await p.evaluate(()=>({language:document.documentElement.lang,languages:[...document.querySelectorAll('.lb')].map(b=>b.textContent),overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src),menu:getComputedStyle(document.getElementById('mobileMenu')).display,visibleCanvas:[...document.querySelectorAll('canvas')].some(c=>c.getBoundingClientRect().width&&getComputedStyle(c).display!=='none')}));
   if(state.overflow||state.broken.length||state.menu!=='none'||state.visibleCanvas)errors.push(`${label}/${file}: ${JSON.stringify(state)}`);results.push({label,file,...state});
   if(['index.html','apps.html','astrabudget.html'].includes(file))await p.screenshot({path:path.join(out,`${label}-${file.replace('.html','')}.png`),fullPage:file==='apps.html'});
   if(width===390){await p.locator('#hamburger').click();if(!await p.locator('#mobileMenu').evaluate(el=>el.classList.contains('open')&&getComputedStyle(el).display==='flex'))errors.push(`Menu ${file}`);await p.keyboard.press('Escape');if(await p.locator('#mobileMenu').evaluate(el=>el.classList.contains('open')))errors.push(`Escape ${file}`);}
  }
  await c.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 for(const[file,hash,expected]of[['astrabudget.html','privacy-policy','panel-pp'],['astrabudget.html','terms-of-service','panel-tos'],['astraworld.html','privacy-policy','privacy-policy'],['astraworld.html','terms','terms'],['hydrascan.html','privacy-policy','privacy-policy'],['hydrascan.html','terms','terms']]){
  await p.goto('about:blank');
  const response=await p.goto(base+file+'#'+hash,{waitUntil:'networkidle'});if(response&&response.status()!==200)errors.push(`${file}#${hash}`);
  if(expected.startsWith('panel-')&&!await p.locator('#'+expected).evaluate(el=>el.classList.contains('active')))errors.push(`Wrong document panel ${file}#${hash}`);
  if(!expected.startsWith('panel-')&&!await p.locator('#'+expected).count())errors.push(`Missing policy anchor ${file}#${hash}`);
 }
 await p.goto('about:blank');await p.goto(base+'astrabudget.html#terms-of-service',{waitUntil:'networkidle'});await p.locator('#panel-tos').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(out,'phone-terms-link.png')});
 await p.locator('.lb').filter({hasText:/^UA$/}).click();if(await p.locator('html').getAttribute('lang')!=='uk')errors.push('Original UA translation failed');const ukrainianPDF=await p.locator('#pp-download').getAttribute('href');if(!ukrainianPDF.includes('pp-uk.pdf'))errors.push('UA PDF link failed');
 const manifest=JSON.parse(await(await import('node:fs/promises')).readFile(path.join(root,'docs/baseline/files.json'),'utf8'));
 for(const[file,hash]of Object.entries(manifest)){
  if(file.endsWith('.html')&&!file.startsWith('google'))continue;
  const response=await p.request.get(base+file),data=await response.body(),actual=createHash('sha256').update(data).digest('hex');if(response.status()!==200||actual!==hash)errors.push(`Served bytes changed ${file}`);results.push({servedFile:file,status:response.status(),sha256:actual,match:actual===hash});
 }
 await c.close();
}catch(error){errors.push(error.stack);}finally{await browser.close();}
await writeFile(path.join(out,'checks.json'),JSON.stringify({results,errors},null,2)+'\n');console.log(JSON.stringify({checked:results.length,errors},null,2));if(errors.length)process.exitCode=1;
