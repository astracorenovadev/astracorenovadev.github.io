// Convert legacy inline violet accents into presentation overrides; source HTML stays intact.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(process.env.ACN_TOOL_DIR||path.resolve(root,'../tooling/site-qa'),'package.json'));
const {chromium}=require('playwright'), browser=await chromium.launch({channel:'chrome',headless:true});
const blocks=new Set();
try {
 const page=await browser.newPage();
 for(const file of ['index.html','apps.html','models.html','astrabudget.html','astraworld.html','hydrascan.html']) {
  await page.goto('http://127.0.0.1:4181/'+file,{waitUntil:'domcontentloaded'});
  const rules=await page.evaluate(()=>{
   const convert=value=>value.replace(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/g,(full,r,g,b,a)=>{
    if(+b>+g*1.15&&+r>+g*1.15&&+b>+r*.9) return `rgba(212, 168, 75, ${a??1})`;
    return full;
   }).replace(/#(?:7a22ff|a855f7|9333ea|be28ff)\b/gi,'#d4a84b');
   const walk=list=>[...list].flatMap(rule=>{
    if(rule.type===CSSRule.STYLE_RULE){
     const declarations=[...rule.style].flatMap(name=>{const value=rule.style.getPropertyValue(name),mapped=convert(value);return value===mapped?[]:[`${name}:${mapped}!important`];});
     return declarations.length?[`${rule.selectorText}{${declarations.join(';')}}`]:[];
    }
    if(rule.type===CSSRule.MEDIA_RULE){const child=walk(rule.cssRules);return child.length?[`@media ${rule.conditionText}{${child.join('\n')}}`]:[];}
    return [];
   });
   return [...document.styleSheets].filter(sheet=>sheet.ownerNode?.tagName==='STYLE').flatMap(sheet=>walk(sheet.cssRules));
  });
  rules.forEach(rule=>blocks.add(rule));
 }
 await writeFile(path.join(root,'site-style/legacy-gold.css'),'/* Generated from original styles: color overrides only. Original files and legal content stay unchanged. */\n'+[...blocks].join('\n')+'\n');
 console.log(`${blocks.size} legacy color rules converted`);
} finally {await browser.close();}
