const $ = (query) => document.querySelector(query);
const fmt = (value) => Number(value || 0).toLocaleString('ko-KR');

const state = {
  apiBase: '',
  me: null,
  profile: null,
  running: false,
  round: 1,
  playerWins: 0,
  botWins: 0,
  entryFee: 1000,
  locked: false,
};

const cards = [
  { name: '홍염 7', color: 'red', rune: 'flame', icon: '🔥', base: 72, effect: '불꽃 룬' },
  { name: '청월 4', color: 'blue', rune: 'moon', icon: '🌙', base: 58, effect: '달빛 룬' },
  { name: '숲여우 스킵', color: 'green', rune: 'leaf', icon: '🍃', base: 64, effect: '숲 룬' },
  { name: '황금 2', color: 'yellow', rune: 'coin', icon: '🪙', base: 50, effect: '황금 룬' },
  { name: '여우불 와일드', color: 'wild', rune: 'foxfire', icon: '🦊', base: 82, effect: '와일드 룬' },
  { name: '분홍 +2', color: 'pink', rune: 'heart', icon: '💗', base: 66, effect: '하트 룬' },
  { name: '별꼬리 리버스', color: 'purple', rune: 'star', icon: '✨', base: 76, effect: '별꼬리 룬' },
];

function getConfig() {
  const config = window.NATSUMI_CONFIG || {};
  return (config.API_BASE || '').replace(/\/$/, '');
}

async function api(url, options = {}) {
  const res = await fetch(`${state.apiBase}${url}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function setMessage(text, tone = '') {
  const box = $('#battleMessage');
  if (!box) return;
  box.textContent = text;
  box.dataset.tone = tone;
}

function renderUser() {
  const userBox = $('#onoUser');
  if (!userBox) return;
  if (state.me) {
    userBox.innerHTML = `<b>${state.me.globalName || state.me.username}</b><small>로그인 완료</small>`;
  } else {
    userBox.innerHTML = `<a class="primary-link" href="${state.apiBase}/auth/discord/game">Discord 로그인</a>`;
  }
}

function renderHud() {
  $('#onoRound').textContent = `ROUND ${state.round} / 5`;
  $('#onoScore').textContent = `PLAYER ${state.playerWins} : ${state.botWins} NATSUMI`;
  $('#onoMoney').textContent = `금전 ${fmt(state.profile?.money || 0)}`;
}

function cardPower(card) {
  const luck = Math.floor(Math.random() * 34);
  const bonus = card.color === 'wild' ? 16 : card.rune === 'star' ? 10 : card.rune === 'coin' ? 7 : 0;
  return card.base + luck + bonus;
}

function cardHtml(card, index) {
  return `<button class="ono-card card-${card.color}" data-card-index="${index}" type="button"><span>${card.icon}</span><b>${card.name}</b><small>${card.effect}</small></button>`;
}

function drawHand() {
  const hand = Array.from({ length: 5 }, () => pick(cards));
  $('#onoHand').innerHTML = hand.map(cardHtml).join('');
  document.querySelectorAll('[data-card-index]').forEach((button) => button.addEventListener('click', () => playRound(hand[Number(button.dataset.cardIndex)])));
  $('#playerPlayed').className = 'ono-card back';
  $('#playerPlayed').textContent = '?';
  $('#botPlayed').className = 'ono-card back';
  $('#botPlayed').textContent = '?';
  $('#playerPower').textContent = '카드를 골라줘';
  $('#botPower').textContent = '나츠미가 노려보는 중';
  state.locked = false;
}

async function startGame() {
  if (!state.me) {
    location.assign(`${state.apiBase}/auth/discord/game`);
    return;
  }
  state.entryFee = Math.max(100, Math.floor(Number($('#onoBet').value || 1000)));
  state.running = true;
  state.round = 1;
  state.playerWins = 0;
  state.botWins = 0;
  $('#startOnoBtn').disabled = true;
  $('#onoBet').disabled = true;
  setMessage('여우별 카드가 펼쳐졌어. 이겨봐, 뭐… 기대는 안 하지만! 😤', 'ready');
  renderHud();
  drawHand();
}

async function playRound(playerCard) {
  if (!state.running || state.locked) return;
  state.locked = true;
  document.querySelectorAll('[data-card-index]').forEach((button) => { button.disabled = true; });
  const botCard = pick(cards);
  const player = cardPower(playerCard);
  const bot = cardPower(botCard);
  $('#playerPlayed').className = `ono-card card-${playerCard.color} played`;
  $('#playerPlayed').innerHTML = `<span>${playerCard.icon}</span><b>${playerCard.name}</b>`;
  $('#botPlayed').className = `ono-card card-${botCard.color} played`;
  $('#botPlayed').innerHTML = `<span>${botCard.icon}</span><b>${botCard.name}</b>`;
  $('#playerPower').textContent = `마력 ${player}`;
  $('#botPower').textContent = `마력 ${bot}`;
  if (player >= bot) {
    state.playerWins += 1;
    setMessage(`이번 라운드는 네 승리! ${playerCard.name} ${player} > ${botCard.name} ${bot}`, 'win');
  } else {
    state.botWins += 1;
    setMessage(`나츠미 승리! ${playerCard.name} ${player} < ${botCard.name} ${bot}`, 'lose');
  }
  renderHud();
  if (state.playerWins >= 3 || state.botWins >= 3 || state.round >= 5) {
    await finishGame();
    return;
  }
  state.round += 1;
  setTimeout(() => {
    renderHud();
    setMessage('다음 라운드야. 손패를 다시 골라봐!');
    drawHand();
  }, 850);
}

async function finishGame() {
  setMessage('결과 정산 중... 여우 금고를 열고 있어.', 'ready');
  try {
    const data = await api('/api/games/ono', {
      method: 'POST',
      body: JSON.stringify({ bet: state.entryFee, rounds: state.round, playerWins: state.playerWins, botWins: state.botWins }),
    });
    state.profile = { ...(state.profile || {}), money: data.money };
    const delta = Number(data.delta || 0);
    setMessage(`${data.result || '오노 결과'} · 금전 ${delta >= 0 ? '+' : ''}${fmt(delta)} · 현재 ${fmt(data.money)}`, delta >= 0 ? 'win' : 'lose');
  } catch (error) {
    setMessage(error.message, 'lose');
  } finally {
    state.running = false;
    $('#startOnoBtn').disabled = false;
    $('#onoBet').disabled = false;
    $('#onoHand').innerHTML = '';
    renderHud();
  }
}

async function init() {
  state.apiBase = getConfig();
  $('#startOnoBtn').addEventListener('click', startGame);
  try {
    const me = await api('/api/me');
    state.me = me.user || null;
  } catch {
    state.me = null;
  }
  renderUser();
  if (state.me) {
    try { state.profile = await api('/api/profile/me'); } catch { state.profile = { money: 0 }; }
  }
  renderHud();
  setMessage('오노 전용 페이지 준비 완료! 로그인하고 여우별 카드판으로 들어와.');
}

init().catch((error) => {
  console.error(error);
  setMessage(`초기화 실패: ${error.message}`, 'lose');
});
