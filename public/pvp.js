const $ = (q) => document.querySelector(q);
const fmt = (v) => Number(v || 0).toLocaleString('ko-KR');

const games = {
  horse: { name: '여우 경마', api: '/api/games/pvp/horse', icon: '🏇', choices: ['번개여우', '분홍혜성', '달빛갈기', '장난꼬리'], desc: '선택한 여우가 트랙을 달려.' },
  rune: { name: '운명의 룬 추첨', api: '/api/games/pvp/rune', icon: '✨', choices: ['불꽃 룬', '달빛 룬', '숲 룬', '별꼬리 룬'], desc: '빛나는 룬의 흐름을 읽어.' },
  blackjack: { name: '달빛 블랙잭', api: '/api/games/pvp/blackjack', icon: '🂡', choices: ['히트', '스탠드', '여우감', '달빛방어'], desc: '21에 가까운 쪽이 이겨.' },
  mines: { name: '마석 찾기', api: '/api/games/pvp/mines', icon: '◇', choices: ['왼쪽 칸', '가운데 칸', '오른쪽 칸', '여우귀 감지'], desc: '마석 광산에서 안전한 칸을 골라.' },
};

const state = { apiBase: '', me: null, profile: null, game: 'horse', running: false, round: 0, playerWins: 0, botWins: 0, selectedChoice: '' };

function apiBase() { return (window.NATSUMI_CONFIG?.API_BASE || '').replace(/\/$/, ''); }
async function api(url, options = {}) {
  const res = await fetch(`${state.apiBase}${url}`, { credentials: 'include', headers: { 'content-type': 'application/json' }, ...options });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}
function msg(text, tone = '') { const el = $('#pvpMessage'); el.textContent = text; el.dataset.tone = tone; }
function log(text) { const el = $('#pvpLog'); const p = document.createElement('p'); p.textContent = text; el.prepend(p); while (el.children.length > 8) el.lastElementChild.remove(); }
function userBox() { $('#pvpUser').innerHTML = state.me ? `<b>${state.me.globalName || state.me.username}</b><small>로그인 완료</small>` : `<a class="primary-link" href="${state.apiBase}/auth/discord/game">Discord 로그인</a>`; }
function hud() { $('#pvpGameName').textContent = games[state.game].name; $('#pvpMoney').textContent = `금전 ${fmt(state.profile?.money || 0)}`; $('#pvpScore').textContent = `PLAYER ${state.playerWins} : ${state.botWins} NATSUMI`; }
function scene() {
  if (state.game === 'horse') return `<div class="race-track">${games.horse.choices.map((n, i) => `<div class="race-lane"><span class="runner runner-${i}">🦊</span><b>${n}</b></div>`).join('')}</div>`;
  if (state.game === 'rune') return `<div class="rune-circle"><span>🔥</span><span>🌙</span><span>🍃</span><span>✨</span></div>`;
  if (state.game === 'blackjack') return `<div class="card-table"><div class="big-card">21</div><div class="big-card bot">?</div></div>`;
  return `<div class="mine-board">${Array.from({ length: 9 }, (_, i) => `<span>${i % 2 ? '◇' : '◆'}</span>`).join('')}</div>`;
}
function choices() {
  const list = games[state.game].choices;
  state.selectedChoice = list[0];
  $('#pvpChoices').innerHTML = list.map((c, i) => `<button data-choice="${c}" class="${i === 0 ? 'active' : ''}" type="button">${c}</button>`).join('');
  document.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => { document.querySelectorAll('[data-choice]').forEach((x) => x.classList.remove('active')); b.classList.add('active'); state.selectedChoice = b.dataset.choice; }));
}
function render() { $('#pvpScene').className = `pvp-scene scene-${state.game}`; $('#pvpScene').innerHTML = scene(); choices(); hud(); msg(`${games[state.game].icon} ${games[state.game].desc}`); }
function reset(needRender = true) { state.running = false; state.round = 0; state.playerWins = 0; state.botWins = 0; $('#pvpStartBtn').disabled = false; $('#pvpRoundBtn').disabled = true; $('#pvpBet').disabled = false; if (needRender) render(); }
function select(key) { state.game = key; reset(false); document.querySelectorAll('[data-game]').forEach((b) => b.classList.toggle('active', b.dataset.game === key)); render(); }
async function start() { if (!state.me) return location.assign(`${state.apiBase}/auth/discord/game`); reset(false); state.running = true; $('#pvpStartBtn').disabled = true; $('#pvpRoundBtn').disabled = false; $('#pvpBet').disabled = true; msg('대결 시작! 먼저 3승하면 끝이야.', 'ready'); log(`${games[state.game].name} 시작`); hud(); }
async function round() {
  if (!state.running) return;
  $('#pvpRoundBtn').disabled = true;
  const bet = Math.max(100, Math.floor(Number($('#pvpBet').value || 1000)));
  try {
    const data = await api(games[state.game].api, { method: 'POST', body: JSON.stringify({ bet, choice: state.selectedChoice, round: state.round + 1 }) });
    state.round += 1;
    if (data.won) state.playerWins += 1; else state.botWins += 1;
    if (data.money !== undefined) state.profile = { ...(state.profile || {}), money: data.money };
    msg(`${data.result} · ${data.detail || ''} · 금전 ${Number(data.delta) >= 0 ? '+' : ''}${fmt(data.delta)}`, data.won ? 'win' : 'lose');
    log(`R${state.round}: ${data.result}`);
    $('#pvpScene').classList.remove('scene-win', 'scene-lose'); void $('#pvpScene').offsetWidth; $('#pvpScene').classList.add(data.won ? 'scene-win' : 'scene-lose');
    if (state.playerWins >= 3 || state.botWins >= 3 || state.round >= 5) { state.running = false; $('#pvpStartBtn').disabled = false; $('#pvpBet').disabled = false; msg(`${state.playerWins > state.botWins ? '최종 승리!' : '최종 패배...'} ${state.playerWins}:${state.botWins}`, state.playerWins > state.botWins ? 'win' : 'lose'); }
    else $('#pvpRoundBtn').disabled = false;
  } catch (e) { msg(e.message, 'lose'); $('#pvpRoundBtn').disabled = false; }
  hud();
}
async function init() {
  state.apiBase = apiBase();
  document.querySelectorAll('[data-game]').forEach((b) => b.addEventListener('click', () => select(b.dataset.game)));
  $('#pvpStartBtn').addEventListener('click', start); $('#pvpRoundBtn').addEventListener('click', round); $('#pvpResetBtn').addEventListener('click', () => reset(true));
  try { const me = await api('/api/me'); state.me = me.user || null; } catch { state.me = null; }
  userBox();
  if (state.me) { try { state.profile = await api('/api/profile/me'); } catch { state.profile = { money: 0 }; } }
  render();
}
init().catch((e) => msg(`초기화 실패: ${e.message}`, 'lose'));
