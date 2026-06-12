const $ = (q) => document.querySelector(q);
const params = new URLSearchParams(location.search);

const gameNames = {
  horse: '여우 경마',
  roulette: '러시안 룰렛',
  blackjack: '달빛 블랙잭',
  mines: '마석 지뢰찾기',
};

let currentGame = params.get('game') || 'horse';
let currentSession = null;
let currentRoom = null;
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

function setMessage(text, tone = '') {
  const el = $('#pvpMessage');
  if (!el) return;
  el.textContent = text;
  el.dataset.tone = tone;
}

function renderRoom(room) {
  currentRoom = room || currentRoom;
  const text = currentRoom
    ? `${currentRoom.mode === 'quick' ? '빠른매칭' : currentRoom.mode === 'bot' ? '봇전' : '비공개 방'} ${currentRoom.roomCode} | 참가 ${currentRoom.players?.length || 0}명 + 봇 ${currentRoom.bots || 0}`
    : '방을 만들거나 빠른매칭을 시작해줘.';
  setText('#pvpRoom', text);
}

function renderScene(session) {
  const scene = $('#pvpScene');
  if (!scene) return;
  const state = session?.state || {};
  if (currentGame === 'horse') {
    const names = ['유즈하', '별꼬리', '달그림자', '혜성'];
    const track = state.track || [0, 0, 0, 0];
    scene.innerHTML = `<div class="race-track">${track.map((pos, i) => `<div class="race-lane"><span class="runner" style="transform:translateX(${Math.min(86, pos)}%)">${['🦊', '⭐', '🌙', '☄️'][i]}</span><b>${names[i]}</b></div>`).join('')}</div>`;
    return;
  }
  if (currentGame === 'roulette') {
    scene.innerHTML = '<div class="rune-circle gun-circle"><span>1</span><span>2</span><span>3</span><span>4</span><b>🔫</b></div>';
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
    box.innerHTML = ['유즈하', '별꼬리', '달그림자', '혜성'].map((name, i) => `<button type="button" data-runner="${i}">${name} 밀어주기</button>`).join('');
    box.querySelectorAll('[data-runner]').forEach((btn) => btn.addEventListener('click', () => sendAction({ runner: Number(btn.dataset.runner) })));
    return;
  }
  if (currentGame === 'roulette') {
    box.innerHTML = '<button type="button" data-rune="fox">한 발 쏘기</button><button type="button" data-rune="pass">넘기기</button>';
    box.querySelectorAll('[data-rune]').forEach((btn) => btn.addEventListener('click', () => sendAction({ rune: btn.dataset.rune })));
    return;
  }
  if (currentGame === 'blackjack') {
    box.innerHTML = '<button type="button" data-move="hit">카드 뽑기</button><button type="button" data-move="stand">멈추기</button>';
    box.querySelectorAll('[data-move]').forEach((btn) => btn.addEventListener('click', () => sendAction({ move: btn.dataset.move })));
    return;
  }
  box.innerHTML = '<span class="market-note">보드에서 안전한 칸을 직접 눌러줘.</span>';
}

function renderSession(session) {
  currentSession = session || currentSession;
  setText('#pvpGameName', gameNames[currentGame] || 'PVP');
  setText('#pvpScore', `PLAYER ${currentSession?.wins || 0} : ${currentSession?.losses || 0} YUZUHA`);
  setMessage(currentSession?.message || `${gameNames[currentGame]} 준비 완료`);
  renderScene(currentSession);
  renderChoices(currentSession);
  if (currentSession?.status === 'finished') logLine(currentSession.message || '게임 종료');
}

async function refreshProfile() {
  try {
    const profile = await api('/api/profile/me');
    setText('#pvpMoney', `게임머니 ${Number(profile.money || 0).toLocaleString()} | Lv.${profile.level || 1}`);
    $('#pvpUser').innerHTML = `<b>${profile.displayName || 'PLAYER'}</b><small>Yuzuha web arcade</small>`;
  } catch {
    $('#pvpUser').innerHTML = '<a class="primary-link" href="/auth/discord">Discord 로그인</a>';
  }
}

async function refreshVerification() {
  try {
    const data = await api('/api/verification/status');
    verified = Boolean(data.bots?.yuzuha?.verified || data.bots?.natsumi?.verified);
    $('#verifyPanel')?.classList.toggle('hidden', verified);
    setText('#verifyMessage', verified ? 'Discord 로그인 인증 완료' : 'Discord 로그인이 필요해.');
  } catch {
    verified = false;
    $('#verifyPanel')?.classList.remove('hidden');
    setText('#verifyMessage', 'Discord 로그인을 확인하지 못했어. 다시 로그인해줘.');
  }
}

async function createRoom(mode) {
  if (!verified) {
    setMessage('먼저 Discord 로그인을 완료해줘.', 'ready');
    $('#verifyPanel')?.classList.remove('hidden');
    return null;
  }
  const data = await api('/api/pvp/rooms', {
    method: 'POST',
    body: JSON.stringify({ botKey: 'yuzuha', game: currentGame, mode, guildId: params.get('guildId') || '' }),
  });
  renderRoom(data.room);
  setMessage(data.room.message || '방 준비 완료', data.room.canStart ? 'ready' : '');
  logLine(data.room.message || 'PVP 방을 만들었어.');
  if (mode === 'bot' || data.room.canStart) await startGame();
  return data.room;
}

async function startGame() {
  if (!verified) {
    setMessage('먼저 Discord 로그인을 완료해줘.', 'ready');
    $('#verifyPanel')?.classList.remove('hidden');
    return;
  }
  try {
    const data = await api('/api/pvp/start', {
      method: 'POST',
      body: JSON.stringify({ botKey: 'yuzuha', game: currentGame, roomId: currentRoom?.roomId || '' }),
    });
    renderSession(data.session);
    logLine(`${gameNames[currentGame]} 시작`);
  } catch (error) {
    if (error.data?.room) renderRoom(error.data.room);
    setMessage(error.message, error.data?.needsPlayers ? 'ready' : 'lose');
  }
}

async function sendAction(action) {
  if (!currentSession?.sessionId) return;
  const data = await api('/api/pvp/action', { method: 'POST', body: JSON.stringify({ botKey: 'yuzuha', sessionId: currentSession.sessionId, action }) });
  renderSession(data.session);
  if (data.profile) setText('#pvpMoney', `게임머니 ${Number(data.profile.money || 0).toLocaleString()} | Lv.${data.profile.level || 1}`);
}

async function sendVerification() {
  await refreshVerification();
}

async function confirmVerification() {
  await refreshVerification();
  if (verified) setMessage('Discord 로그인 인증 완료. 이제 PVP를 시작할 수 있어.', 'ready');
}

function selectGame(game) {
  currentGame = gameNames[game] ? game : 'horse';
  currentSession = null;
  currentRoom = null;
  document.querySelectorAll('[data-game]').forEach((item) => item.classList.toggle('active', item.dataset.game === currentGame));
  renderRoom(null);
  renderSession({ game: currentGame, wins: 0, losses: 0, state: {}, message: `${gameNames[currentGame]} 선택 완료` });
}

function bind() {
  document.querySelectorAll('[data-game]').forEach((btn) => btn.addEventListener('click', () => selectGame(btn.dataset.game || 'horse')));
  $('#privateRoomBtn')?.addEventListener('click', () => createRoom('private'));
  $('#quickMatchBtn')?.addEventListener('click', () => createRoom('quick'));
  $('#botMatchBtn')?.addEventListener('click', () => createRoom('bot'));
  $('#pvpStartBtn')?.addEventListener('click', startGame);
  $('#pvpResetBtn')?.addEventListener('click', () => { currentSession = null; renderSession({ game: currentGame, wins: 0, losses: 0, state: {}, message: '새 게임 준비 완료' }); });
  $('#sendVerifyBtn')?.addEventListener('click', sendVerification);
  $('#confirmVerifyBtn')?.addEventListener('click', confirmVerification);
}

async function init() {
  bind();
  selectGame(currentGame);
  await Promise.all([refreshProfile(), refreshVerification()]);
  const mode = params.get('mode');
  if (['private', 'quick', 'bot'].includes(mode)) await createRoom(mode);
}

init();
