let state = { config: null, shop: null, profile: null, tab: "titles", demo: false, me: null, game: "slot" };
const $ = (query) => document.querySelector(query);
const fmt = (value) => Number(value || 0).toLocaleString("ko-KR");
const storeKey = "natsumi-game-demo";

const gameDefs = {
  slot: { name: "슬롯머신", icon: "777", desc: "같은 그림을 맞춰 금전을 노려보세요.", api: "/api/games/slot" },
  fishbun: { name: "붕어빵 뽑기", icon: "BUN", desc: "달콤한 붕어빵 속에서 금전을 찾는 게임이에요.", api: "/api/games/fishbun" },
  mine: { name: "비밀 광산", icon: "GEM", desc: "위험한 광산에서 보석을 캐 보세요.", api: "/api/games/mine" },
  mole: { name: "두더지 잡기", icon: "HIT", desc: "점수를 따라 보상이 정산되는 미니게임이에요.", api: "/api/games/mole" },
  fishing: { name: "낚시", icon: "FISH", desc: "물고기와 희귀 아이템을 낚아 금전을 벌어요.", api: "/api/games/fishing" }
};

const cleanTitles = [
  ["rookie_fox", "초보 여우", "처음 시작한 나츠미 플레이어", 50000, "N"],
  ["daily_guardian", "출석 수호자", "꾸준히 출석하는 성실한 유저", 65000, "DAY"],
  ["coin_collector", "동전 수집가", "작은 금전도 놓치지 않는 유저", 80000, "COIN"],
  ["night_gamer", "야행성 게이머", "밤에도 게임을 즐기는 유저", 95000, "MOON"],
  ["rank_hunter", "랭크 사냥꾼", "XP와 레벨을 노리는 유저", 110000, "RANK"],
  ["fox_master", "여우 조련사", "나츠미와 잘 어울리는 유저", 130000, "FOX"],
  ["lucky_tail", "행운의 꼬리", "이상하게 운이 따라붙는 유저", 150000, "LUCK"],
  ["mvp", "MVP", "오늘의 주인공", 180000, "MVP"],
  ["combo_star", "콤보 스타", "흐름을 놓치지 않는 유저", 210000, "STAR"],
  ["eternal_champion", "영원한 챔피언", "최상위권에 어울리는 칭호", 1300000, "TOP"]
].map(([key, name, description, price, emoji]) => ({ key, name, description, price, emoji }));

const cleanBadges = [
  ["first_step", "첫 발자국", "나츠미 게임에 입문한 증표", 50000, "1ST"],
  ["tiny_coin", "작은 동전", "시작을 기념하는 배지", 60000, "COIN"],
  ["daily_soul", "출석혼", "출석을 사랑하는 유저의 배지", 75000, "DAY"],
  ["sparkle", "반짝임", "프로필에 빛을 더하는 배지", 90000, "SPK"],
  ["fox_paw", "여우 발바닥", "귀여운 흔적을 남기는 배지", 110000, "PAW"],
  ["hot_streak", "연승 불꽃", "기세가 살아 있는 배지", 135000, "FIRE"],
  ["rank_spark", "랭크 스파크", "랭크카드에 어울리는 배지", 160000, "RANK"],
  ["moon_mark", "달빛 표식", "밤 접속자에게 어울리는 감성", 190000, "MOON"],
  ["supporter", "서포터", "후원자를 위한 전용 표시", 1000000, "SUP"],
  ["legend_stamp", "전설 인증", "이름값이 확실한 최상급 배지", 1250000, "LEG"]
].map(([key, name, description, price, emoji]) => ({ key, name, description, price, emoji }));

const demoShop = { titles: cleanTitles, badges: cleanBadges };

function getConfig() {
  const config = window.NATSUMI_CONFIG || {};
  return {
    apiBase: (config.API_BASE || "").replace(/\/$/, ""),
    defaultGuildId: config.DEFAULT_GUILD_ID || "",
    donationUrl: config.DONATION_URL || "",
    donationAccount: config.DONATION_ACCOUNT || "",
    donationEnabled: Boolean(config.DONATION_URL),
    discordLoginEnabled: false
  };
}

async function loadServerConfig(baseConfig) {
  try {
    const res = await fetch(`${baseConfig.apiBase || ""}/api/config`, { credentials: "include" });
    if (!res.ok) return baseConfig;
    const serverConfig = await res.json();
    return {
      ...baseConfig,
      defaultGuildId: serverConfig.defaultGuildId || baseConfig.defaultGuildId,
      donationUrl: serverConfig.donationUrl || baseConfig.donationUrl,
      donationAccount: serverConfig.donationAccount || baseConfig.donationAccount,
      donationEnabled: Boolean(serverConfig.donationEnabled || baseConfig.donationUrl),
      discordLoginEnabled: Boolean(serverConfig.discordLoginEnabled),
      publicBaseUrl: serverConfig.publicBaseUrl || "",
      discordRedirectUri: serverConfig.discordRedirectUri || "",
    };
  } catch {
    return baseConfig;
  }
}

function readAll() {
  try { return JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch { return {}; }
}

function writeAll(value) {
  localStorage.setItem(storeKey, JSON.stringify(value));
}

function getInv(userId) {
  const all = readAll();
  if (!all[userId]) all[userId] = { money: 300000, titles: ["rookie_fox"], badges: ["first_step"], activeTitle: "rookie_fox" };
  writeAll(all);
  return all[userId];
}

function saveInv(userId, inv) {
  const all = readAll();
  all[userId] = inv;
  writeAll(all);
}

async function api(url, options = {}) {
  const res = await fetch(`${state.config.apiBase}${url}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || "요청 실패");
  return data;
}

function currentUserId() {
  return state.me?.id || "demo-user";
}

function rankUrl(guildId, userId) {
  return state.config.apiBase ? `${state.config.apiBase}/rank-card/${guildId}/${userId}` : "#rankView";
}

function normalizeShop(shop) {
  if (!shop?.titles?.length) return demoShop;
  return shop;
}

function demoProfile(guildId, userId) {
  const inv = getInv(userId);
  const level = 12;
  const xp = 4750;
  const needed = level * level * 100;
  return {
    guildId,
    userId,
    level,
    xp,
    needed,
    progress: Math.round((xp / needed) * 1000) / 10,
    money: inv.money,
    attendance: 27,
    activeTitle: inv.activeTitle,
    ownedTitles: demoShop.titles.filter((item) => inv.titles.includes(item.key)),
    ownedBadges: demoShop.badges.filter((item) => inv.badges.includes(item.key))
  };
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  $(`#${name}View`)?.classList.add("active-view");
  document.querySelectorAll(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
}

function itemCard(item, type) {
  return `<article class="item">
    <div class="emoji">${item.emoji}</div>
    <h3>${item.name}</h3>
    <small>${item.description}</small>
    <p><b>${fmt(item.price)}</b> 금전</p>
    <button data-buy="${type}" data-key="${item.key}" type="button">구매하기</button>
  </article>`;
}

function renderShop() {
  if (!state.shop) return;
  const list = state.tab === "titles" ? state.shop.titles : state.shop.badges;
  $("#shopArea").innerHTML = list.map((item) => itemCard(item, state.tab === "titles" ? "title" : "badge")).join("");
  document.querySelectorAll("[data-buy]").forEach((button) => button.addEventListener("click", buyItem));
}

function renderGames() {
  const area = $("#gameList");
  if (!area) return;
  area.innerHTML = Object.entries(gameDefs).map(([key, game]) => `<button class="game-choice ${state.game === key ? "active" : ""}" data-game="${key}" type="button">
    <span class="game-icon">${game.icon}</span>
    <span><b>${game.name}</b><br><small>${game.desc}</small></span>
  </button>`).join("");
  document.querySelectorAll("[data-game]").forEach((button) => button.addEventListener("click", () => selectGame(button.dataset.game)));
  selectGame(state.game);
}

function selectGame(key) {
  state.game = key;
  const game = gameDefs[key];
  document.querySelectorAll("[data-game]").forEach((button) => button.classList.toggle("active", button.dataset.game === key));
  $("#gameArt").textContent = game.icon;
  $("#gameTitle").textContent = game.name;
  $("#gameDesc").textContent = game.desc;
  $("#betInput").style.display = key === "fishing" ? "none" : "block";
}

function renderProfile() {
  const profile = state.profile;
  if (!profile) return;
  const active = profile.ownedTitles.find((item) => item.key === profile.activeTitle);
  const titleOptions = profile.ownedTitles.length
    ? profile.ownedTitles.map((item) => `<button class="tab" data-title="${item.key}" type="button">${item.emoji} ${item.name}</button>`).join("")
    : "<p>보유 칭호 없음</p>";
  const badges = profile.ownedBadges.length ? profile.ownedBadges.map((item) => `<span title="${item.name}">${item.emoji}</span>`).join(" ") : "배지 없음";
  $("#profileArea").className = "rank-card";
  $("#profileArea").innerHTML = `<div class="rank-glow"></div>
    <div>
      <p class="eyebrow">${active ? `${active.emoji} ${active.name}` : "NATSUMI PLAYER"} ${state.demo ? " DEMO" : ""}</p>
      <h1>${state.me?.globalName || state.me?.username || profile.userId}</h1>
      <p>${badges}</p>
    </div>
    <div class="level-badge">Lv.${profile.level}</div>
    <div class="stats">
      <div class="stat"><span>경험치</span><b>${fmt(profile.xp)} / ${fmt(profile.needed)}</b></div>
      <div class="stat"><span>금전</span><b>${fmt(profile.money)}</b></div>
      <div class="stat"><span>출석</span><b>${fmt(profile.attendance)}일</b></div>
    </div>
    <div class="progress"><span style="width:${profile.progress}%"></span></div>
    <p>진행률 ${profile.progress}% · <a target="_blank" rel="noreferrer" href="${rankUrl(profile.guildId, profile.userId)}">랭크카드 열기</a></p>
    <h3>활성 칭호 선택</h3>
    <div class="shop-tabs">${titleOptions}</div>`;
  $("#rankCardLink").href = rankUrl(profile.guildId, profile.userId);
  document.querySelectorAll("[data-title]").forEach((button) => button.addEventListener("click", selectTitle));
}

async function loadMe() {
  try {
    const me = await api("/api/me");
    state.me = me.user || null;
  } catch {
    state.me = null;
  }
  if (state.me) {
    $("#loginName").textContent = `${state.me.globalName || state.me.username}님`;
    $("#loginBtn").classList.add("hidden");
    $("#logoutBtn").classList.remove("hidden");
  } else {
    $("#loginName").textContent = "게스트 모드";
    $("#loginBtn").classList.remove("hidden");
    $("#logoutBtn").classList.add("hidden");
  }
}

async function loadProfile() {
  const guildId = state.config.defaultGuildId || "demo-guild";
  const userId = currentUserId();
  try {
    state.profile = await api(`/api/profile/${guildId}/${userId}`);
    state.demo = false;
  } catch {
    state.profile = demoProfile(guildId, userId);
    state.demo = true;
  }
  renderProfile();
  renderShop();
}

async function buyItem(event) {
  const userId = currentUserId();
  const itemType = event.currentTarget.dataset.buy;
  const key = event.currentTarget.dataset.key;
  try {
    const data = await api("/api/buy", { method: "POST", body: JSON.stringify({ userId, itemType, key }) });
    alert(data.message || "구매 완료!");
    await loadProfile();
  } catch {
    const list = itemType === "title" ? demoShop.titles : demoShop.badges;
    const item = list.find((entry) => entry.key === key);
    const inv = getInv(userId);
    const field = itemType === "title" ? "titles" : "badges";
    if (inv[field].includes(key)) return alert("이미 가지고 있는 아이템이에요.");
    if (inv.money < item.price) return alert(`금전 부족! 필요 ${fmt(item.price)}, 보유 ${fmt(inv.money)}`);
    inv.money -= item.price;
    inv[field].push(key);
    if (itemType === "title" && !inv.activeTitle) inv.activeTitle = key;
    saveInv(userId, inv);
    alert(`${item.name} 구매 완료!`);
    await loadProfile();
  }
}

async function selectTitle(event) {
  const userId = currentUserId();
  const key = event.currentTarget.dataset.title;
  try {
    await api("/api/title/select", { method: "POST", body: JSON.stringify({ userId, key }) });
  } catch {
    const inv = getInv(userId);
    if (!inv.titles.includes(key)) return alert("보유하지 않은 칭호예요.");
    inv.activeTitle = key;
    saveInv(userId, inv);
  }
  await loadProfile();
}

async function playGame() {
  const key = state.game;
  const game = gameDefs[key];
  const userId = currentUserId();
  const bet = Number($("#betInput").value || 1000);
  $("#gameResult").textContent = "나츠미가 결과를 계산하는 중...";
  try {
    const data = await api(game.api, { method: "POST", body: JSON.stringify({ userId, bet, score: key === "mole" ? Math.floor(Math.random() * 80) + 20 : undefined, difficulty: "medium" }) });
    $("#gameResult").textContent = formatGameResult(data);
    await loadProfile();
  } catch {
    const inv = getInv(userId);
    const delta = demoGameDelta(key, bet);
    inv.money = Math.max(0, inv.money + delta);
    saveInv(userId, inv);
    $("#gameResult").textContent = `${game.name} 데모 결과\n변동 금전: ${delta >= 0 ? "+" : ""}${fmt(delta)}\n현재 금전: ${fmt(inv.money)}`;
    await loadProfile();
  }
}

function formatGameResult(data) {
  if (data.reels) return `${data.reels.join(" | ")}\n결과: ${data.result}\n변동 금전: ${data.delta >= 0 ? "+" : ""}${fmt(data.delta)}\n현재 금전: ${fmt(data.money)}`;
  return `${data.item || data.game}\n변동 금전: ${data.delta >= 0 ? "+" : ""}${fmt(data.delta)}\n현재 금전: ${fmt(data.money)}`;
}

function demoGameDelta(key, bet) {
  if (key === "fishing") return 800;
  if (key === "mole") return 12000;
  const roll = Math.random();
  if (roll > .75) return Math.floor(bet * 3);
  if (roll > .45) return Math.floor(bet * 1.2);
  return -bet;
}

async function logout() {
  try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch {}
  location.reload();
}

async function applySupportRequest() {
  const result = $("#supportResult");
  const name = $("#supportName")?.value?.trim() || "";
  const amount = Number($("#supportAmount")?.value || 0);
  const memo = $("#supportMemo")?.value?.trim() || "";

  if (!name || !amount) {
    result.textContent = "입금자명과 후원 금액을 적어줘.";
    return;
  }

  result.textContent = "후원 인증 요청을 저장하는 중...";
  try {
    const data = await api("/api/support/apply", {
      method: "POST",
      body: JSON.stringify({ name, amount, memo })
    });
    result.textContent = data.message || "후원 인증 요청을 저장했어.";
  } catch {
    const rows = JSON.parse(localStorage.getItem("natsumi-support-requests") || "[]");
    rows.unshift({ name, amount, memo, createdAt: new Date().toISOString() });
    localStorage.setItem("natsumi-support-requests", JSON.stringify(rows.slice(0, 20)));
    result.textContent = "서버 저장은 실패했지만 이 브라우저에 임시 저장했어. 잠시 뒤 다시 시도해줘.";
  }

  if (state.config.donationUrl) window.open(state.config.donationUrl, "_blank", "noopener,noreferrer");
}

async function init() {
  state.config = await loadServerConfig(getConfig());
  if (state.config.donationEnabled) {
    $("#donateLink").href = state.config.donationUrl;
    $("#donateLink").classList.remove("hidden");
  }
  if (!state.config.discordLoginEnabled) {
    $("#loginBtn").title = "Discord 개발자 포털의 OAuth2 Redirect URL과 서버 환경변수가 필요해요.";
  }
  await loadMe();
  try {
    state.shop = normalizeShop(await api("/api/shop"));
  } catch {
    state.shop = demoShop;
    state.demo = true;
  }
  renderShop();
  renderGames();
  await loadProfile();
  $("#loadBtn").addEventListener("click", loadProfile);
  $("#playGameBtn").addEventListener("click", playGame);
  $("#supportApplyBtn")?.addEventListener("click", applySupportRequest);
  $("#logoutBtn").addEventListener("click", logout);
  document.querySelectorAll(".nav-btn").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
  document.querySelectorAll(".tab[data-tab]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".tab[data-tab]").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    state.tab = button.dataset.tab;
    renderShop();
  }));
}

init().catch((error) => {
  console.error(error);
  alert(`초기화 실패: ${error.message}`);
});
