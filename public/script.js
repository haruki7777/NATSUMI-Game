let state={config:null,shop:null,profile:null,tab:'titles',demo:false};
const $=(q)=>document.querySelector(q);
const fmt=(n)=>Number(n||0).toLocaleString('ko-KR');
const storeKey='natsumi-game-demo';

const titleNames=['초보 여우','출석 수호자','동전 수집가','새벽의 지배자','랭크 사냥꾼','여우 조련사','행운의 꼬리','MVP','콤보 스타','보스 슬레이어','길드 에이스','금전왕','채팅 전설','불꽃 심장','크리스탈 두뇌','그림자 질주자','여명의 용사','나츠미의 관심대상','신화급 플레이어','영원의 챔피언'];
const badgeNames=['첫 발자국','작은 동전','출석혼','반짝임','여우 발바닥','연승 불꽃','랭크 스파크','달빛 표식','행운 클로버','황금 주머니','핑크 하트','푸른 별','작은 왕관','다이아 조각','검의 문장','방패 문장','용의 비늘','은하 코어','서포터','전설 인증'];
const titleEmoji=['🦊','📅','🪙','🌙','🎯','🦊','🍀','🏆','🌟','⚔️','🛡️','💰','💬','🔥','💎','🥷','🌅','😼','🐉','👑'];
const badgeEmoji=['🐾','🪙','📅','✨','🐾','🔥','⚡','🌙','🍀','👝','💗','🔷','👑','💎','🗡️','🛡️','🐉','🌌','💖','🏅'];
const demoShop={
  titles:titleNames.map((name,i)=>({key:'title_'+i,name,description:`${name} 칭호야. 폼 나게 달아봐.`,price:i===0?500:(i+1)*900,emoji:titleEmoji[i]})),
  badges:badgeNames.map((name,i)=>({key:'badge_'+i,name,description:`${name} 프로필 뱃지야.`,price:i===18?0:(i+1)*500,emoji:badgeEmoji[i]}))
};

demoShop.titles[7].key='mvp';
demoShop.badges[18].key='supporter';

function getConfig(){const c=window.NATSUMI_CONFIG||{};return{apiBase:(c.API_BASE||'').replace(/\/$/,''),defaultGuildId:c.DEFAULT_GUILD_ID||'',donationUrl:c.DONATION_URL||'',donationEnabled:Boolean(c.DONATION_URL)}}
function readAll(){try{return JSON.parse(localStorage.getItem(storeKey)||'{}')}catch{return {}}}
function writeAll(v){localStorage.setItem(storeKey,JSON.stringify(v))}
function getInv(userId){const all=readAll();if(!all[userId]) all[userId]={money:30000,titles:['title_0'],badges:['badge_0'],activeTitle:'title_0'};writeAll(all);return all[userId]}
function saveInv(userId,inv){const all=readAll();all[userId]=inv;writeAll(all)}

async function api(url,options){if(!state.config?.apiBase) throw new Error('NO_API');const res=await fetch(`${state.config.apiBase}${url}`,{headers:{'content-type':'application/json'},...options});const data=await res.json();if(!res.ok) throw new Error(data.error||'요청 실패');return data}
function rankUrl(guildId,userId){return state.config.apiBase?`${state.config.apiBase}/rank-card/${guildId}/${userId}`:'#profile'}
function demoProfile(guildId,userId){const inv=getInv(userId);const level=12,xp=4750,needed=level*level*100;return{guildId,userId,level,xp,needed,progress:Math.round((xp/needed)*1000)/10,money:inv.money,attendance:27,activeTitle:inv.activeTitle,ownedTitles:demoShop.titles.filter(t=>inv.titles.includes(t.key)),ownedBadges:demoShop.badges.filter(b=>inv.badges.includes(b.key))}}

function itemCard(item,type){const userId=$('#userId').value.trim();return `<article class="item"><div class="emoji">${item.emoji}</div><h3>${item.name}</h3><small>${item.description}</small><p><b>${fmt(item.price)}</b> 금전</p><button data-buy="${type}" data-key="${item.key}" ${!userId?'disabled':''}>구매하기</button></article>`}
function renderShop(){if(!state.shop)return;const list=state.tab==='titles'?state.shop.titles:state.shop.badges;$('#shopArea').innerHTML=list.map(x=>itemCard(x,state.tab==='titles'?'title':'badge')).join('');document.querySelectorAll('[data-buy]').forEach(btn=>btn.addEventListener('click',buyItem))}
function renderProfile(){const p=state.profile;if(!p)return;const active=p.ownedTitles.find(t=>t.key===p.activeTitle);const titleOptions=p.ownedTitles.length?p.ownedTitles.map(t=>`<button class="tab" data-title="${t.key}">${t.emoji} ${t.name}</button>`).join(''):'<p>보유 칭호 없음</p>';const badges=p.ownedBadges.length?p.ownedBadges.map(b=>`<span title="${b.name}">${b.emoji}</span>`).join(' '):'뱃지 없음';$('#profileArea').className='rank-card';$('#profileArea').innerHTML=`<div class="rank-glow"></div><div><p class="eyebrow">${active?`${active.emoji} ${active.name}`:'🦊 NATSUMI PLAYER'} ${state.demo?'· DEMO':''}</p><h1>${p.userId}</h1><p>${badges}</p></div><div class="level-badge">Lv.${p.level}</div><div class="stats"><div class="stat"><span>영력</span><b>${fmt(p.xp)} / ${fmt(p.needed)}</b></div><div class="stat"><span>금전</span><b>${fmt(p.money)}</b></div><div class="stat"><span>출석</span><b>${fmt(p.attendance)}회</b></div></div><div class="progress"><span style="width:${p.progress}%"></span></div><p>진행률 ${p.progress}% · <a target="_blank" href="${rankUrl(p.guildId,p.userId)}">웹 랭크카드 열기</a></p><h3>활성 칭호 선택</h3><div class="shop-tabs">${titleOptions}</div>`;document.querySelectorAll('[data-title]').forEach(btn=>btn.addEventListener('click',selectTitle))}
async function loadProfile(){const guildId=$('#guildId').value.trim()||state.config.defaultGuildId||'demo-guild';const userId=$('#userId').value.trim();if(!userId){alert('유저 ID를 넣어줘. GitHub Pages 데모에서는 아무 숫자나 넣어도 돼.');return}try{state.profile=await api(`/api/profile/${guildId}/${userId}`);state.demo=false}catch{state.profile=demoProfile(guildId,userId);state.demo=true}renderProfile();renderShop()}
async function buyItem(e){const userId=$('#userId').value.trim();if(!userId){alert('먼저 유저 ID를 넣어줘.');return}const itemType=e.currentTarget.dataset.buy,key=e.currentTarget.dataset.key;try{const data=await api('/api/buy',{method:'POST',body:JSON.stringify({userId,itemType,key})});alert(data.message);await loadProfile()}catch{const list=itemType==='title'?demoShop.titles:demoShop.badges;const item=list.find(x=>x.key===key);const inv=getInv(userId);const field=itemType==='title'?'titles':'badges';if(inv[field].includes(key)){alert('이미 가지고 있는 아이템이야.');return}if(inv.money<item.price){alert(`금전 부족! 필요 ${fmt(item.price)}, 보유 ${fmt(inv.money)}`);return}inv.money-=item.price;inv[field].push(key);if(itemType==='title'&&!inv.activeTitle)inv.activeTitle=key;saveInv(userId,inv);alert(`${item.emoji} ${item.name} 데모 구매 완료!`);await loadProfile()}}
async function selectTitle(e){const userId=$('#userId').value.trim(),key=e.currentTarget.dataset.title;try{await api('/api/title/select',{method:'POST',body:JSON.stringify({userId,key})})}catch{const inv=getInv(userId);if(!inv.titles.includes(key)){alert('보유하지 않은 칭호야.');return}inv.activeTitle=key;saveInv(userId,inv)}await loadProfile()}
async function init(){state.config=getConfig();if(state.config.defaultGuildId)$('#guildId').value=state.config.defaultGuildId;if(state.config.donationEnabled){$('#donateLink').href=state.config.donationUrl;$('#donateLink').classList.remove('hidden')}try{state.shop=await api('/api/shop')}catch{state.shop=demoShop;state.demo=true}renderShop();$('#loadBtn').addEventListener('click',loadProfile);document.querySelectorAll('.tab[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.tab[data-tab]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.tab=btn.dataset.tab;renderShop()}));$('#flipBtn').addEventListener('click',()=>{$('#flipResult').textContent=Math.random()>0.5?'🦊 앞면! 나츠미 승!':'🌙 뒷면! 하루키 승!'})}
init().catch(err=>{console.error(err);alert('초기화 실패: '+err.message)});
