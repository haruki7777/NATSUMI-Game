/* Interactive visual games for NATSUMI Arcade */
(function(){
  const $=q=>document.querySelector(q);
  const fmt=n=>Number(n||0).toLocaleString('ko-KR');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let active='slot';
  const defs={slot:{title:'슬롯머신',icon:'🎰',desc:'릴이 돌아가고 같은 그림을 맞추면 금전 획득!'},fishbun:{title:'붕어빵뽑기',icon:'🥞',desc:'기계에서 붕어빵을 뽑아 대박을 노려봐.'},mine:{title:'비밀 광산',icon:'⛏️',desc:'돌을 골라 광맥을 찾아 금전을 얻어.'},mole:{title:'두더지 잡기',icon:'🐹',desc:'튀어나오는 두더지를 빠르게 눌러 점수를 모아.'},fishing:{title:'낚시',icon:'🎣',desc:'연속 터치로 낚시찌를 끌어올려 물고기를 잡아!'}};
  function userId(){return window.state?.me?.id||'demo-user'}
  async function api(url,body){
    if(!window.state?.config?.apiBase) throw new Error('NO_API');
    const res=await fetch(`${window.state.config.apiBase}${url}`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});
    const data=await res.json();
    if(!res.ok) throw Object.assign(new Error(data.error||'요청 실패'),{data});
    return data;
  }
  function renderStage(key){
    active=key; const g=defs[key];
    $('#gameArt').textContent=g.icon; $('#gameTitle').textContent=g.title; $('#gameDesc').textContent=g.desc;
    let stage='';
    if(key==='slot') stage='<div class="game-stage"><div class="reel-row"><div class="reel">🍒</div><div class="reel">🍋</div><div class="reel">7️⃣</div></div></div>';
    if(key==='fishbun') stage='<div class="game-stage"><div class="bun-machine"><div class="bun-window">🥞</div><b>나츠미 붕어빵 기계</b><small>버튼을 누르면 반죽이 구워져!</small></div></div>';
    if(key==='mine') stage='<div class="game-stage"><div class="mine-grid">'+Array.from({length:9},(_,i)=>`<button class="mine-cell" data-mine="${i}">🪨</button>`).join('')+'</div></div>';
    if(key==='mole') stage='<div class="game-stage"><div class="mole-grid">'+Array.from({length:9},(_,i)=>`<button class="mole-cell" data-mole="${i}">🕳️</button>`).join('')+'</div></div><div class="game-meter"><span id="moleMeter"></span></div>';
    if(key==='fishing') stage='<div class="game-stage fish-stage"><div class="water"></div><div class="fish-shadow">🐟</div><div class="bobber" id="bobber">🎣</div></div><div class="game-meter"><span id="fishMeter"></span></div><p class="sub">낚시 시작 후 버튼을 연속 터치해서 게이지를 채워!</p>';
    const old=$('#visualStage'); if(old) old.remove();
    $('#gameDesc').insertAdjacentHTML('afterend',`<div id="visualStage">${stage}</div>`);
    $('#betInput').style.display=key==='fishing'?'none':'block';
    $('#gameResult').textContent='준비 완료. 게임 시작 버튼을 눌러!';
  }
  async function playReal(endpoint,body){return api(endpoint,body)}
  function demoDelta(key,bet,score=0){if(key==='fishing')return 800+Math.floor(Math.random()*3200);if(key==='mole')return score*400;const r=Math.random();if(r>.82)return Math.floor(bet*5);if(r>.48)return Math.floor(bet*1.4);return -bet;}
  async function playSlot(){const reels=[...document.querySelectorAll('.reel')];const icons=['🍒','🍋','🍇','🔔','💎','7️⃣','🍀','🍎'];reels.forEach(r=>r.classList.add('spin'));for(let i=0;i<16;i++){reels.forEach(r=>r.textContent=icons[Math.floor(Math.random()*icons.length)]);await sleep(80)}reels.forEach(r=>r.classList.remove('spin'));return runApi('slot');}
  async function playFishbun(){const box=$('.bun-window');for(const x of ['🥣','🔥','🥞','✨','🥞']){box.textContent=x;await sleep(260)}return runApi('fishbun');}
  async function playMine(){return new Promise(resolve=>{const cells=[...document.querySelectorAll('[data-mine]')];cells.forEach(c=>c.onclick=async()=>{cells.forEach(x=>x.disabled=true);c.textContent=['💎','🥇','🪙','🪨'][Math.floor(Math.random()*4)];resolve(await runApi('mine'));});$('#gameResult').textContent='돌 하나를 골라봐!';});}
  async function playMole(){let score=0,time=9000,idx=-1;const cells=[...document.querySelectorAll('[data-mole]')],meter=$('#moleMeter');$('#gameResult').textContent='두더지를 눌러 점수를 모아!';const timer=setInterval(()=>{cells.forEach(c=>{c.classList.remove('active');c.textContent='🕳️'});idx=Math.floor(Math.random()*9);cells[idx].classList.add('active');cells[idx].textContent='🐹';},650);cells.forEach((c,i)=>c.onclick=()=>{if(i===idx){score+=5;c.textContent='💥';c.classList.remove('active')}else score=Math.max(0,score-2);meter.style.width=Math.min(100,score)+'%';});await sleep(time);clearInterval(timer);cells.forEach(c=>c.disabled=true);return runApi('mole',{score,difficulty:'medium'});}
  async function playFishing(){let power=0;const meter=$('#fishMeter'),bobber=$('#bobber'),btn=$('#playGameBtn');$('#gameResult').textContent='연속 터치! 낚시찌를 끌어올려!';const old=btn.textContent;btn.textContent='연속 터치!';const add=()=>{power=Math.min(100,power+8);meter.style.width=power+'%';bobber.style.bottom=(34+power*.8)+'%';};btn.addEventListener('click',add);for(let i=0;i<35;i++){power=Math.max(0,power-1.8);meter.style.width=power+'%';bobber.style.bottom=(34+power*.8)+'%';await sleep(100);if(power>=100)break;}btn.removeEventListener('click',add);btn.textContent=old;if(power>=75){bobber.classList.add('fish-caught');bobber.textContent='🐟';await sleep(700);return runApi('fishing');}$('#gameResult').textContent='아앗... 물고기가 도망갔어! 더 빠르게 눌러야 해.';return null;}
  async function runApi(key,extra={}){const bet=Number($('#betInput').value||1000);const endpoint={slot:'/api/games/slot',fishbun:'/api/games/fishbun',mine:'/api/games/mine',mole:'/api/games/mole',fishing:'/api/games/fishing'}[key];try{const data=await playReal(endpoint,{bet,...extra});showResult(data);window.loadProfile&&window.loadProfile();return data;}catch(e){if(e.data?.heartRequired){$('#gameResult').innerHTML=`<div class="game-locked">${e.data.error}<br><a class="primary-link" target="_blank" href="${e.data.heartUrl}">한디리 하트 누르기</a></div>`;return null;}const delta=demoDelta(key,bet,extra.score);$('#gameResult').textContent=`${defs[key].icon} 데모 결과\n획득/변동 금전: ${delta>=0?'+':''}${fmt(delta)}`;return null;}}
  function showResult(d){if(!d)return;let text='';if(d.reels)text=`${d.reels.join(' | ')}\n결과: ${d.result}\n`;else text=`${d.item||d.game}\n`;text+=`획득/변동 금전: ${d.delta>=0?'+':''}${fmt(d.delta)}\n현재 금전: ${fmt(d.money)}`;$('#gameResult').textContent=text;}
  function boot(){const gl=$('#gameList'); if(!gl)return; gl.addEventListener('click',e=>{const b=e.target.closest('[data-game]');if(b)setTimeout(()=>renderStage(b.dataset.game),0);}); renderStage(active); const btn=$('#playGameBtn'); btn.onclick=async()=>{if(active==='slot')return playSlot();if(active==='fishbun')return playFishbun();if(active==='mine')return playMine();if(active==='mole')return playMole();if(active==='fishing')return playFishing();};}
  window.addEventListener('DOMContentLoaded',()=>setTimeout(boot,500));
})();
