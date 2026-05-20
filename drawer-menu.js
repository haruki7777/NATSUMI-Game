(function(){
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    const body=document.body;
    const petals=document.querySelector('#arcadePetals');
    if(petals&&!petals.children.length){
      for(let i=0;i<10;i++){
        const petal=document.createElement('span');
        petal.style.setProperty('--x',`${4+Math.random()*92}vw`);
        petal.style.setProperty('--drift',`${-90+Math.random()*180}px`);
        petal.style.setProperty('--delay',`${-Math.random()*12}s`);
        petal.style.setProperty('--dur',`${11+Math.random()*8}s`);
        petal.style.setProperty('--size',`${10+Math.random()*12}px`);
        petal.style.setProperty('--spin',`${260+Math.random()*420}deg`);
        petal.style.setProperty('--petal-opacity',`${0.46+Math.random()*0.38}`);
        petals.appendChild(petal);
      }
    }
    const menu=document.querySelector('#drawerMenu');
    const openBtn=document.querySelector('#menuToggle');
    const closeBtn=document.querySelector('#menuClose');
    const backdrop=document.querySelector('#menuBackdrop');
    if(!menu||!openBtn||!backdrop)return;
    const open=()=>{menu.classList.add('open');backdrop.classList.add('open');body.classList.add('menu-open');openBtn.setAttribute('aria-expanded','true');menu.setAttribute('aria-hidden','false')};
    const close=()=>{menu.classList.remove('open');backdrop.classList.remove('open');body.classList.remove('menu-open');openBtn.setAttribute('aria-expanded','false');menu.setAttribute('aria-hidden','true')};
    openBtn.addEventListener('click',open);
    closeBtn?.addEventListener('click',close);
    backdrop.addEventListener('click',close);
    menu.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>setTimeout(close,80)));
    window.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  });
})();
