const $ = (q) => document.querySelector(q);
const names = { horse: '여우 경마', roulette: '룬 추첨', blackjack: '카드 대결', mines: '마석 찾기' };
let key = 'horse';
let round = 0;
let win = 0;
let lose = 0;
function setText(q, text) { const el = $(q); if (el) el.textContent = text; }
function paint() {
  setText('#pvpGameName', names[key] || names.horse);
  setText('#pvpMoney', '웹 테스트');
  setText('#pvpScore', `PLAYER ${win} : ${lose} NATSUMI`);
  setText('#pvpMessage', `${names[key] || names.horse} 준비 완료`);
  const scene = $('#pvpScene');
  if (scene) scene.innerHTML = '<div class="rune-circle"><span>🦊</span><span>✨</span><span>🌙</span><span>🍃</span></div>';
  const choices = $('#pvpChoices');
  if (choices) choices.innerHTML = ['A','B','C','D'].map(v => `<button type="button">${v}</button>`).join('');
}
function reset() { round = 0; win = 0; lose = 0; $('#pvpStartBtn').disabled = false; $('#pvpRoundBtn').disabled = true; paint(); }
function start() { reset(); $('#pvpStartBtn').disabled = true; $('#pvpRoundBtn').disabled = false; setText('#pvpMessage', '시작!'); }
function play() {
  round += 1;
  if (Math.random() > 0.5) win += 1; else lose += 1;
  setText('#pvpMessage', `라운드 ${round} · ${win}:${lose}`);
  if (round >= 5 || win >= 3 || lose >= 3) { $('#pvpStartBtn').disabled = false; $('#pvpRoundBtn').disabled = true; }
  paint();
}
function init() {
  const user = $('#pvpUser');
  if (user) user.innerHTML = '<b>WEB ARCADE</b><small>테스트 모드</small>';
  document.querySelectorAll('[data-game]').forEach(btn => btn.addEventListener('click', () => { key = btn.dataset.game || 'horse'; reset(); }));
  $('#pvpStartBtn')?.addEventListener('click', start);
  $('#pvpRoundBtn')?.addEventListener('click', play);
  $('#pvpResetBtn')?.addEventListener('click', reset);
  paint();
}
init();
