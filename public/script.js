let state = {
  config: null,
  shop: null,
  profile: null,
  tab: "titles",
  arcadeTab: "bag",
  demo: false,
  me: null,
  game: "slot",
  bag: null,
  mole: null
};

const $ = (query) => document.querySelector(query);
const fmt = (value) => Number(value || 0).toLocaleString("ko-KR");
const storeKey = "natsumi-game-demo";
const themeKey = "natsumi-game-theme";

const gameDefs = {
  slot: { name: "픽셀 슬롯", icon: "slot", desc: "세 칸을 맞춰 금전을 노리는 클래식 아케이드 게임.", api: "/api/games/slot" },
  fishbun: { name: "붕어빵 뽑기", icon: "bun", desc: "따끈한 붕어빵 기계에서 달콤한 보상을 뽑아요.", api: "/api/games/fishbun" },
  mine: { name: "비밀 광산", icon: "mine", desc: "칸을 열어 보석을 찾는 픽셀 광산 탐험.", api: "/api/games/mine" },
  mole: { name: "두더지 속도전", icon: "mole", desc: "8초 동안 튀어나오는 두더지를 최대한 빠르게 잡아요.", api: "/api/games/mole" },
  fishing: { name: "나츠미 낚시터", icon: "fish", desc: "물결을 기다렸다가 희귀 물고기와 보상을 낚아요.", api: "/api/games/fishing" },
  anime: { name: "애니굿즈 가챠", icon: "gacha", desc: "봇의 애니굿즈 뽑기 감성을 웹 아케이드로 가져왔어요.", api: "/api/games/anime-gacha" }
};

const demoShop = {
  titles: [
    ["rookie_fox", "초보 여우", "처음 시작한 나츠미 플레이어", 50000, "N"],
    ["daily_guardian", "출석 수호자", "꾸준히 출석하는 성실한 유저", 65000, "DAY"],
    ["coin_collector", "동전 수집가", "작은 금전도 놓치지 않는 유저", 80000, "COIN"]
  ].map(([key, name, description, price, emoji]) => ({ key, name, description, price, emoji })),
  badges: [
    ["first_step", "첫 발자국", "나츠미 게임에 입문한 증표", 50000, "1ST"],
    ["sparkle", "반짝임", "프로필에 빛을 더하는 배지", 90000, "SPK"],
    ["supporter", "서포터", "후원자를 위한 전용 표시", 1000000, "SUP"]
  ].map(([key, name, description, price, emoji]) => ({ key, name, description, price, emoji }))
};

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
      discordRedirectUri: serverConfig.discordRedirectUri || ""
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
  if (!all[userId]) all[userId] = { money: 300000, titles: ["rookie_fox"], badges: ["first_step"], activeTitle: "rookie_fox", anime: {}, fish: {} };
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

function authUrl() {
  return `${state.config.apiBase || ""}/auth/discord`;
}

function goLogin() {
  window.location.assign(authUrl());
}

function requireLogin() {
  if (state.me) return true;
  goLogin();
  return false;
}

function rankUrl(guildId, userId) {
  return state.config.apiBase ? `${state.config.apiBase}/rank-card/${guildId}/${userId}` : "#rankView";
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  $(`#${name}View`)?.classList.add("active-view");
  document.querySelectorAll(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeMenu() {
  document.querySelector("#drawerMenu")?.classList.remove("open");
  document.querySelector("#menuBackdrop")?.classList.remove("open");
  document.body.classList.remove("menu-open");
  document.querySelector("#menuToggle")?.setAttribute("aria-expanded", "false");
  document.querySelector("#drawerMenu")?.setAttribute("aria-hidden", "true");
}

function pixelIcon(type) {
  return `<span class="pixel-icon pixel-${type}" aria-hidden="true"><i></i><b></b><em></em></span>`;
}

function showPixelResult({ title, lines = [], tone = "normal" }) {
  const stage = $("#gameStage");
  if (!stage) return;
  const body = lines.map((line) => `<p>${line}</p>`).join("");
  stage.insertAdjacentHTML("beforeend", `<div class="pixel-result result-${tone}"><strong>${title}</strong>${body}</div>`);
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
    ${pixelIcon(game.icon)}
    <span><b>${game.name}</b><br><small>${game.desc}</small></span>
  </button>`).join("");
  document.querySelectorAll("[data-game]").forEach((button) => button.addEventListener("click", () => selectGame(button.dataset.game)));
  selectGame(state.game);
}

function selectGame(key) {
  state.game = key;
  const game = gameDefs[key];
  document.querySelectorAll("[data-game]").forEach((button) => button.classList.toggle("active", button.dataset.game === key));
  renderGameStage(key);
  $("#gameTitle").textContent = game.name;
  $("#gameDesc").textContent = game.desc;
  $("#betInput").style.display = ["fishing", "anime", "mole"].includes(key) ? "none" : "block";
  $("#playGameBtn").textContent = key === "mole" ? "속도전 시작" : key === "anime" ? "1회 뽑기" : "게임 시작";
}

function renderGameStage(key, active = false) {
  const stage = $("#gameStage");
  if (!stage) return;
  stage.className = `game-stage pixel-stage stage-${key} ${active ? "is-playing" : ""}`;
  if (key === "slot") {
    stage.innerHTML = `<div class="pixel-cabinet">${pixelIcon("slot")}<div class="reel-row">
      <div class="reel ${active ? "spin" : ""}">N</div><div class="reel ${active ? "spin" : ""}">A</div><div class="reel ${active ? "spin" : ""}">T</div>
    </div></div>`;
  } else if (key === "fishing") {
    stage.innerHTML = `<div class="water"></div><div class="fish-shadow">FISH</div><div class="bobber ${active ? "fish-caught" : ""}">HOOK</div><div class="pixel-ripple"></div>`;
  } else if (key === "mine") {
    stage.innerHTML = `<div class="mine-grid">${Array.from({ length: 9 }, (_, i) => `<button class="mine-cell" type="button">${active && i === 4 ? "GEM" : "?"}</button>`).join("")}</div>`;
  } else if (key === "mole") {
    stage.innerHTML = `<div class="mole-hud"><b id="moleTimer">8.0</b><span id="moleScore">0 HIT</span></div><div class="mole-grid">${Array.from({ length: 9 }, (_, i) => `<button class="mole-cell" data-mole="${i}" type="button"></button>`).join("")}</div>`;
  } else if (key === "anime") {
    stage.innerHTML = `<div class="gacha-machine">${pixelIcon("gacha")}<div class="capsule ${active ? "capsule-roll" : ""}">CAPSULE</div><div class="pixel-lightbar"></div></div>`;
  } else {
    stage.innerHTML = `<div class="bun-machine">${pixelIcon("bun")}<div class="bun-window">${active ? "HOT" : "BUN"}</div></div>`;
  }
}

function setPlaying(playing) {
  const button = $("#playGameBtn");
  if (!button) return;
  button.disabled = playing;
  button.textContent = playing ? "진행 중..." : state.game === "mole" ? "속도전 시작" : state.game === "anime" ? "1회 뽑기" : "게임 시작";
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
    <div><p class="eyebrow">${active ? `${active.emoji} ${active.name}` : "NATSUMI PLAYER"} ${state.demo ? " DEMO" : ""}</p>
      <h1>${state.me?.globalName || state.me?.username || profile.userId}</h1><p>${badges}</p></div>
    <div class="level-badge">Lv.${profile.level}</div>
    <div class="stats">
      <div class="stat"><span>경험치</span><b>${fmt(profile.xp)} / ${fmt(profile.needed)}</b></div>
      <div class="stat"><span>금전</span><b>${fmt(profile.money)}</b></div>
      <div class="stat"><span>출석</span><b>${fmt(profile.attendance)}일</b></div>
    </div>
    <div class="progress"><span style="width:${profile.progress}%"></span></div>
    <p>진행률 ${profile.progress}% · <a target="_blank" rel="noreferrer" href="${rankUrl(profile.guildId, profile.userId)}">랭크카드 열기</a></p>
    <h3>활성 칭호 선택</h3><div class="shop-tabs">${titleOptions}</div>`;
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
    $("#loadBtn")?.classList.add("hidden");
  } else {
    $("#loginName").textContent = "게스트 모드";
    $("#loginBtn").classList.remove("hidden");
    $("#logoutBtn").classList.add("hidden");
    $("#loadBtn")?.classList.remove("hidden");
  }
}

async function loadProfile() {
  if (!requireLogin()) return;
  try {
    state.profile = await api("/api/profile/me");
    state.demo = false;
  } catch {
    const guildId = state.config.defaultGuildId || "demo-guild";
    state.profile = demoProfile(guildId, currentUserId());
    state.demo = true;
  }
  renderProfile();
  renderShop();
  await loadBag();
}

async function loadBag() {
  if (!state.me) {
    renderBag();
    return;
  }
  try {
    state.bag = await api("/api/bag/me");
  } catch {
    state.bag = null;
  }
  renderBag();
}

function renderBag() {
  const area = $("#arcadeInventory");
  if (!area) return;
  if (!state.me) {
    area.textContent = "로그인 후 가방과 도감을 볼 수 있어요.";
    return;
  }
  const bag = state.bag || { anime: [], fishing: [], collection: { anime: [], fishing: [] } };
  if (state.arcadeTab === "collection") {
    const anime = bag.collection?.anime || [];
    const fish = bag.collection?.fishing || [];
    area.innerHTML = `<div class="pixel-list"><b>도감 수집률</b><p>애니굿즈 ${anime.length}종 · 낚시 ${fish.length}종</p>${[...anime, ...fish].slice(0, 18).map((name) => `<span>${name}</span>`).join("") || "<small>아직 수집 기록이 없어요.</small>"}</div>`;
    return;
  }
  const animeRows = (bag.anime || []).slice(0, 12).map((item) => `<span>${item.name} x${item.count}</span>`).join("");
  const fishRows = (bag.fishing || []).filter((item) => item.count > 0).map((item) => `<span>${item.name} x${item.count}</span>`).join("");
  area.innerHTML = `<div class="pixel-list"><b>가방</b>${animeRows || fishRows ? `${animeRows}${fishRows}` : "<small>아직 가방이 비어 있어요.</small>"}</div>`;
}

async function buyItem(event) {
  if (!requireLogin()) return;
  const userId = currentUserId();
  const itemType = event.currentTarget.dataset.buy;
  const key = event.currentTarget.dataset.key;
  try {
    const data = await api("/api/buy", { method: "POST", body: JSON.stringify({ userId, itemType, key }) });
    showPixelResult({ title: "SHOP OK", lines: [data.message || "구매 완료"] });
    await loadProfile();
  } catch (error) {
    showPixelResult({ title: "SHOP FAIL", lines: [error.message], tone: "bad" });
  }
}

async function selectTitle(event) {
  if (!requireLogin()) return;
  const key = event.currentTarget.dataset.title;
  try {
    await api("/api/title/select", { method: "POST", body: JSON.stringify({ key }) });
    await loadProfile();
  } catch (error) {
    showPixelResult({ title: "TITLE FAIL", lines: [error.message], tone: "bad" });
  }
}

async function playGame() {
  if (!requireLogin()) return;
  if (state.game === "mole") return startMoleGame();
  const key = state.game;
  const game = gameDefs[key];
  const bet = Number($("#betInput").value || 1000);
  setPlaying(true);
  renderGameStage(key, true);
  try {
    await new Promise((resolve) => setTimeout(resolve, 700));
    const data = await api(game.api, { method: "POST", body: JSON.stringify({ bet, rollCount: key === "anime" ? 1 : undefined }) });
    renderGameStage(key, false);
    showGameResult(data);
    await loadProfile();
  } catch (error) {
    renderGameStage(key, false);
    showPixelResult({ title: "ERROR", lines: [error.message], tone: "bad" });
  } finally {
    setPlaying(false);
  }
}

function showGameResult(data) {
  const delta = Number(data.delta || 0);
  const tone = delta >= 0 ? "good" : "bad";
  const lines = [];
  if (data.reels) lines.push(data.reels.join(" / "));
  if (data.item) lines.push(data.item);
  if (data.results) lines.push(...data.results.slice(0, 5).map((item) => `[${item.category}] ${item.name}`));
  if (data.score !== undefined) lines.push(`점수 ${data.score}`);
  lines.push(`금전 ${delta >= 0 ? "+" : ""}${fmt(delta)}`);
  if (data.money !== undefined) lines.push(`현재 ${fmt(data.money)}`);
  showPixelResult({ title: data.result || data.game || "RESULT", lines, tone });
}

function startMoleGame() {
  if (state.mole?.running) return;
  setPlaying(true);
  renderGameStage("mole", true);
  const cells = [...document.querySelectorAll(".mole-cell")];
  let score = 0;
  let timeLeft = 8000;
  let active = -1;
  state.mole = { running: true };
  const setActive = () => {
    cells.forEach((cell) => cell.classList.remove("active"));
    active = Math.floor(Math.random() * cells.length);
    cells[active].classList.add("active");
    cells[active].textContent = "HIT";
  };
  const hit = (event) => {
    const idx = Number(event.currentTarget.dataset.mole);
    if (idx !== active) return;
    score += 1;
    $("#moleScore").textContent = `${score} HIT`;
    setActive();
  };
  cells.forEach((cell) => cell.addEventListener("click", hit));
  setActive();
  const speed = setInterval(setActive, 540);
  const clock = setInterval(() => {
    timeLeft -= 100;
    $("#moleTimer").textContent = (timeLeft / 1000).toFixed(1);
  }, 100);
  setTimeout(async () => {
    clearInterval(speed);
    clearInterval(clock);
    cells.forEach((cell) => cell.removeEventListener("click", hit));
    state.mole = null;
    try {
      const data = await api("/api/games/mole", { method: "POST", body: JSON.stringify({ score, difficulty: "medium" }) });
      showGameResult(data);
      await loadProfile();
    } catch (error) {
      showPixelResult({ title: "MOLE FAIL", lines: [error.message], tone: "bad" });
    } finally {
      setPlaying(false);
    }
  }, 8000);
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
    const data = await api("/api/support/apply", { method: "POST", body: JSON.stringify({ name, amount, memo }) });
    result.textContent = data.message || "후원 인증 요청을 저장했어.";
  } catch (error) {
    result.textContent = error.message;
  }
  if (state.config.donationUrl) window.open(state.config.donationUrl, "_blank", "noopener,noreferrer");
}

function applyTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = normalized;
  localStorage.setItem(themeKey, normalized);
  const button = $("#themeToggle");
  if (button) {
    button.textContent = normalized === "light" ? "다크 모드" : "화이트 모드";
    button.setAttribute("aria-pressed", String(normalized === "light"));
  }
}

function initTheme() {
  const saved = localStorage.getItem(themeKey);
  const preferred = window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
  applyTheme(saved || preferred);
  $("#themeToggle")?.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
  });
}

function bindUiEvents() {
  if (window.__natsumiUiBound) return;
  window.__natsumiUiBound = true;
  $("#loadBtn")?.addEventListener("click", loadProfile);
  $("#playGameBtn")?.addEventListener("click", playGame);
  $("#supportApplyBtn")?.addEventListener("click", applySupportRequest);
  $("#logoutBtn")?.addEventListener("click", logout);
  $("#loginBtn")?.addEventListener("click", (event) => {
    event.preventDefault();
    goLogin();
  });
  document.querySelectorAll(".nav-btn").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showView(button.dataset.view);
    closeMenu();
  }, { capture: true }));
  document.querySelectorAll(".tab[data-tab]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".tab[data-tab]").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    state.tab = button.dataset.tab;
    renderShop();
  }));
  document.querySelectorAll("[data-arcade-tab]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-arcade-tab]").forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");
    state.arcadeTab = button.dataset.arcadeTab;
    renderBag();
  }));
}

async function init() {
  initTheme();
  state.config = await loadServerConfig(getConfig());
  bindUiEvents();
  $("#loginBtn").href = authUrl();
  if (state.config.donationEnabled) {
    $("#donateLink").href = state.config.donationUrl;
    $("#donateLink").classList.remove("hidden");
  }
  await loadMe();
  try {
    state.shop = await api("/api/shop");
  } catch {
    state.shop = demoShop;
    state.demo = true;
  }
  renderShop();
  renderGames();
  if (state.me) {
    await loadProfile();
  } else {
    $("#profileArea").className = "empty";
    $("#profileArea").textContent = "Discord 로그인 후 내 레벨, 경험치, 금전, 랭크카드를 불러올 수 있어요.";
    renderBag();
  }
}

init().catch((error) => {
  console.error(error);
  alert(`초기화 실패: ${error.message}`);
});
