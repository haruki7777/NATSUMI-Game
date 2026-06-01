const $ = (q) => document.querySelector(q);
const gameNames = {
  horse: '여우 경마',
  roulette: '운명의 룬렛',
  blackjack: '달빛 블랙잭',
  mines: '마석 지뢰찾기',
};

let currentGame = 'horse';
let currentSession = null;
let verified = false;

async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-natsumi-bot': 'yuzuha' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || '요청에 실패했어.');
    error.data = data;
    throw error;
  }
  return data;
}

function setText(q, text) {
  const el = $(q);
  if (el) el.textContent = text;
}

function logLine(text) {
  const log = $('#pvpLog');
  if (!log) return;
  const p = document.createElement('p');
  p.textContent = text;
  log.prepend(p);
}

function renderScene(session) {
  const scene = $('#pvpScene');
  if (!scene) return;
  const state = session?.state || {};
  if (currentGame === 'horse') {
    const names = ['여우', '별빛', '달그림자', '혜성'];
    const track = state.track || [0, 0, 0, 0];
    scene.innerHTML = `<div class="race-track">${track.map((pos, i) => `<div class="race-lane"><span class="runner" style="transform:translateX(${Math.min(86, pos)}%)">${i === 0 ? 'F' : i === 1 ? 'S' : i === 2 ? 'M' : 'C'}</span><b>${names[i]}</b></div>`).join('')}</div>`;
    return;
  }
  if (currentGame === 'roulette') {
    scene.innerHTML = `<div class="rune-circle"><span>SUN</span><span>MOON</span><span>FOX</span><span>STAR</span></div>`;
    return;
  }
  if (currentGame === 'blackjack') {
    const player = state.player?.length ? state.player.join(' ') : 'READY';
    const dealer = state.dealer?.length ? state.dealer.join(' ') : 'HIDDEN';
    scene.innerHTML = `<div class="card-table"><div class="big-card">${player}</div><div class="big-card bot">${dealer}</div></div>`;
    return;
  }
  const opened = new Set(state.opened || []);
  scene.innerHTML = `<div class="mine-board">${Array.from({ length: 25 }, (_, i) => `<button type="button" data-cell="${i}" ${opened.has(i) ? 'disabled' : ''}>${opened.has(i) ? 'OK' : '?'}</button>`).join('')}</div>`;
  scene.querySelectorAll('[data-cell]').forEach((btn) => btn.addEventListener('click', () => sendAction({ cell: Number(btn.dataset.cell) })));
}

function renderChoices(session) {
  const box = $('#pvpChoices');
  if (!box) return;
  if (!currentSession || session?.status === 'finished') {
    box.innerHTML = '';
    return;
  }
  if (currentGame === 'horse') {
    box.innerHTML = ['여우', '별빛', '달그림자', '혜성'].map((name, i) => `<button type="button" data-runner="${i}">${name} 부스트</button>`).join('');
    box.querySelectorAll('[data-runner]').forEach((btn) => btn.addEventListener('click', () => sendAction({ runner: Number(btn.dataset.runner) })));
    return;
  }
  if (currentGame === 'roulette') {
    box.innerHTML = ['sun', 'moon', 'fox', 'star'].map((rune) => `<button type="button" data-rune="${rune}">${rune.toUpperCase()}</button>`).join('');
    box.querySelectorAll('[data-rune]').forEach((btn) => btn.addEventListener('click', () => sendAction({ rune: btn.dataset.rune })));
    return;
  }
  if (currentGame === 'blackjack') {
    box.innerHTML = `<button type="button" data-move="hit">카드 뽑기</button><button type="button" data-move="stand">멈추기</button>`;
    box.querySelectorAll('[data-move]').forEach((btn) => btn.addEventListener('click', () => sendAction({ move: btn.dataset.move })));
    return;
  }
  box.innerHTML = '<span class="market-note">보드에서 안전한 칸을 직접 눌러줘.</span>';
}

function renderSession(session) {
  currentSession = session || currentSession;
  setText('#pvpGameName', gameNames[currentGame] || 'PVP');
  setText('#pvpScore', `PLAYER ${currentSession?.wins || 0} : ${currentSession?.losses || 0} YUZUHA`);
  setText('#pvpMessage', currentSession?.message || `${gameNames[currentGame]} 준비 완료`);
  renderScene(currentSession);
  renderChoices(currentSession);
  if (currentSession?.status === 'finished') logLine(currentSession.message || '게임 종료');
}

async function refreshProfile() {
  try {
    const profile = await api('/api/profile/me');
    setText('#pvpMoney', `게임머니 ${Number(profile.money || 0).toLocaleString()} · Lv.${profile.level || 1}`);
    $('#pvpUser').innerHTML = `<b>${profile.displayName || 'PLAYER'}</b><small>Yuzuha verified arcade</small>`;
  } catch {
    $('#pvpUser').innerHTML = '<a class="primary-link" href="/auth/discord">Discord 로그인</a>';
  }
}

async function refreshVerification() {
  try {
    const data = await api('/api/verification/status');
    verified = Boolean(data.bots?.yuzuha?.verified);
    $('#verifyPanel')?.classList.toggle('hidden', verified);
    setText('#verifyMessage', verified ? `인증됨: ${data.bots.yuzuha.emailMasked || 'OK'}` : '유즈하 인증이 필요해.');
  } catch {
    verified = false;
    $('#verifyPanel')?.classList.remove('hidden');
  }
}

async function startGame() {
  if (!verified) {
    setText('#pvpMessage', '먼저 유즈하 이메일 인증을 끝내줘.');
    $('#verifyPanel')?.classList.remove('hidden');
    return;
  }
  const data = await api('/api/pvp/start', { method: 'POST', body: JSON.stringify({ botKey: 'yuzuha', game: currentGame }) });
  renderSession(data.session);
  logLine(`${gameNames[currentGame]} 시작`);
}

async function sendAction(action) {
  if (!currentSession?.sessionId) return;
  const data = await api('/api/pvp/action', { method: 'POST', body: JSON.stringify({ botKey: 'yuzuha', sessionId: currentSession.sessionId, action }) });
  renderSession(data.session);
  if (data.profile) setText('#pvpMoney', `게임머니 ${Number(data.profile.money || 0).toLocaleString()} · Lv.${data.profile.level || 1}`);
}

async function sendVerification() {
  try {
    const email = $('#verifyEmail').value.trim();
    const data = await api('/api/verification/email/start', { method: 'POST', body: JSON.stringify({ botKey: 'yuzuha', email }) });
    setText('#verifyMessage', `${data.masked} 으로 인증번호를 보냈어.`);
  } catch (error) {
    setText('#verifyMessage', error.message);
  }
}

async function confirmVerification() {
  try {
    const code = $('#verifyCode').value.trim();
    await api('/api/verification/email/confirm', { method: 'POST', body: JSON.stringify({ botKey: 'yuzuha', code }) });
    await refreshVerification();
    setText('#pvpMessage', '인증 완료. 이제 PVP를 시작할 수 있어.');
  } catch (error) {
    setText('#verifyMessage', error.message);
  }
}

function bind() {
  document.querySelectorAll('[data-game]').forEach((btn) => btn.addEventListener('click', () => {
    currentGame = btn.dataset.game || 'horse';
    currentSession = null;
    document.querySelectorAll('[data-game]').forEach((item) => item.classList.toggle('active', item === btn));
    renderSession({ game: currentGame, wins: 0, losses: 0, state: {}, message: `${gameNames[currentGame]} 선택 완료` });
  }));
  $('#pvpStartBtn')?.addEventListener('click', startGame);
  $('#pvpResetBtn')?.addEventListener('click', () => { currentSession = null; renderSession({ game: currentGame, wins: 0, losses: 0, state: {}, message: '새 게임 준비 완료' }); });
  $('#sendVerifyBtn')?.addEventListener('click', sendVerification);
  $('#confirmVerifyBtn')?.addEventListener('click', confirmVerification);
}

async function init() {
  bind();
  await Promise.all([refreshProfile(), refreshVerification()]);
  renderSession({ game: currentGame, wins: 0, losses: 0, state: {}, message: '게임을 선택하고 시작해줘.' });
}

init();
