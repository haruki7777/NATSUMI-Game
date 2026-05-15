let state={config:null,shop:null,profile:null,tab:'titles'};
const $=(q)=>document.querySelector(q);
const fmt=(n)=>Number(n||0).toLocaleString('ko-KR');

async function api(url,options){
  const res=await fetch(url,{headers:{'content-type':'application/json'},...options});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||'요청 실패');
  return data;
}

function itemCard(item,type){
  const userId=$('#userId').value.trim();
  return `<article class="item"><div class="emoji">${item.emoji}</div><h3>${item.name}</h3><small>${item.description}</small><p><b>${fmt(item.price)}</b> 금전</p><button data-buy="${type}" data-key="${item.key}" ${!userId?'disabled':''}>구매하기</button></article>`;
}

function renderShop(){
  if(!state.shop) return;
  const list=state.tab==='titles'?state.shop.titles:state.shop.badges;
  $('#shopArea').innerHTML=list.map((x)=>itemCard(x,state.tab==='titles'?'title':'badge')).join('');
  document.querySelectorAll('[data-buy]').forEach((btn)=>btn.addEventListener('click',buyItem));
}

function renderProfile(){
  const p=state.profile;
  if(!p) return;
  const active=p.ownedTitles.find((t)=>t.key===p.activeTitle);
  const titleOptions=p.ownedTitles.length?p.ownedTitles.map((t)=>`<button class="tab" data-title="${t.key}">${t.emoji} ${t.name}</button>`).join(''):'<p>보유 칭호 없음</p>';
  const badges=p.ownedBadges.length?p.ownedBadges.map((b)=>`<span title="${b.name}">${b.emoji}</span>`).join(' '):'뱃지 없음';
  $('#profileArea').className='rank-card';
  $('#profileArea').innerHTML=`<div class="rank-glow"></div><div><p class="eyebrow">${active?`${active.emoji} ${active.name}`:'🦊 NATSUMI PLAYER'}</p><h1>${p.userId}</h1><p>${badges}</p></div><div class="level-badge">Lv.${p.level}</div><div class="stats"><div class="stat"><span>영력</span><b>${fmt(p.xp)} / ${fmt(p.needed)}</b></div><div class="stat"><span>금전</span><b>${fmt(p.money)}</b></div><div class="stat"><span>출석</span><b>${fmt(p.attendance)}회</b></div></div><div class="progress"><span style="width:${p.progress}%"></span></div><p>진행률 ${p.progress}% · <a target="_blank" href="/rank-card/${p.guildId}/${p.userId}">웹 랭크카드 열기</a></p><h3>활성 칭호 선택</h3><div class="shop-tabs">${titleOptions}</div>`;
  document.querySelectorAll('[data-title]').forEach((btn)=>btn.addEventListener('click',selectTitle));
}

async function loadProfile(){
  const guildId=$('#guildId').value.trim()||state.config.defaultGuildId;
  const userId=$('#userId').value.trim();
  if(!guildId||!userId){alert('서버 ID랑 유저 ID를 넣어줘. 흥, 이건 내가 찍을 수 없어.');return;}
  state.profile=await api(`/api/profile/${guildId}/${userId}`);
  renderProfile();
  renderShop();
}

async function buyItem(e){
  const userId=$('#userId').value.trim();
  if(!userId){alert('먼저 유저 ID를 넣어줘.');return;}
  try{
    const data=await api('/api/buy',{method:'POST',body:JSON.stringify({userId,itemType:e.currentTarget.dataset.buy,key:e.currentTarget.dataset.key})});
    alert(data.message);
    await loadProfile();
  }catch(err){alert(err.message);}
}

async function selectTitle(e){
  const userId=$('#userId').value.trim();
  await api('/api/title/select',{method:'POST',body:JSON.stringify({userId,key:e.currentTarget.dataset.title})});
  await loadProfile();
}

async function init(){
  state.config=await api('/api/config');
  if(state.config.defaultGuildId) $('#guildId').value=state.config.defaultGuildId;
  if(state.config.donationEnabled){$('#donateLink').href=state.config.donationUrl;$('#donateLink').classList.remove('hidden');}
  state.shop=await api('/api/shop');
  renderShop();
  $('#loadBtn').addEventListener('click',loadProfile);
  document.querySelectorAll('.tab[data-tab]').forEach((btn)=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab[data-tab]').forEach((b)=>b.classList.remove('active'));btn.classList.add('active');state.tab=btn.dataset.tab;renderShop();}));
  $('#flipBtn').addEventListener('click',()=>{$('#flipResult').textContent=Math.random()>0.5?'🦊 앞면! 나츠미 승!':'🌙 뒷면! 하루키 승!';});
}
init().catch((err)=>{console.error(err);alert('초기화 실패: '+err.message);});
