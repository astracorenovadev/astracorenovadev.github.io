/* Presentation/accessibility only: original text, translations, links and application data stay intact. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),bar=document.querySelector('.lbar');
 if(bar){const size=()=>document.documentElement.style.setProperty('--language-height',`${bar.getBoundingClientRect().height}px`);size();new ResizeObserver(size).observe(bar);}
 if(!reduced.matches)document.documentElement.classList.add('apps-animate');
 const selectedLanguage=()=>document.querySelectorAll('.lb').forEach(button=>{const label=button.textContent.trim().toLowerCase(),code=label==='ua'?'uk':label,active=code===document.documentElement.lang;button.classList.toggle('on',active);button.setAttribute('aria-pressed',active);});
 document.querySelectorAll('.lb').forEach(button=>button.addEventListener('click',selectedLanguage));selectedLanguage();
 reduced.addEventListener('change',()=>{if(reduced.matches)document.documentElement.classList.remove('apps-animate');});
 const menu=document.getElementById('mobileMenu'),toggle=document.getElementById('hamburger');
 if(menu&&toggle){
  toggle.setAttribute('aria-label','Menu');toggle.setAttribute('aria-controls','mobileMenu');toggle.setAttribute('aria-expanded','false');
  const sync=()=>toggle.setAttribute('aria-expanded',menu.classList.contains('open'));
  toggle.addEventListener('click',sync);menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',sync));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('open')){if(typeof closeMenu==='function')closeMenu();sync();toggle.focus();}});
 }
})();
