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
  mole: null,
  session: null
};

const $ = (query) => document.querySelector(query);
const fmt = (value) => Number(value || 0).toLocaleString("ko-KR");
const storeKey = "natsumi-game-demo";
const themeKey = "natsumi-game-theme";

function mountPetalRain() {
  if (document.querySelector(".petal-rain")) return;
  const layer = document.createElement("div");
  layer.className = "petal-rain";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = Array.from({ length: 10 }).map((_, index) => {
    const x = 4 + Math.random() * 92;
    const drift = -90 + Math.random() * 180;
    const delay = -Math.random() * 12;
    const dur = 11 + Math.random() * 8;
    const size = 10 + Math.random() * 11;
    const spin = 260 + Math.random() * 360;
    const opacity = 0.46 + Math.random() * 0.36;
    return `<span style="--x:${x}vw;--drift:${drift}px;--delay:${delay}s;--dur:${dur}s;--size:${size}px;--spin:${spin}deg;--petal-opacity:${opacity}" data-petal="${index}"></span>`;
  }).join("");
  document.body.appendChild(layer);
}

const gameDefs = {
  slot: { name: "픽셀 슬롯", icon: "slot", desc: "세 릴을 직접 멈춰 같은 문양을 노리는 아케이드 슬롯.", api: "/api/games/slot" },
  fishbun: { name: "붕어빵 뽑기", icon: "bun", desc: "진열대에서 하나를 고르면 따끈한 보상이 나와요.", api: "/api/games/fishbun" },
  mine: { name: "비밀 광산", icon: "mine", desc: "광산 타일 하나를 직접 골라 보석을 캐는 게임.", api: "/api/games/mine" },
  mole: { name: "두더지 속도전", icon: "mole", desc: "8초 동안 튀어나오는 두더지를 최대한 빠르게 잡아요.", api: "/api/games/mole" },
  fishing: { name: "나츠미 낚시터", icon: "fish", desc: "찌가 초록 구간에 들어왔을 때 낚아 올려요.", api: "/api/games/fishing" },
  anime: { name: "애니굿즈 가챠", icon: "gacha", desc: "레버를 세 번 돌려 캡슐을 뽑는 웹 가챠.", api: "/api/games/anime-gacha" }
};

const fallbackSupportTiers = [
  { key: "sprout", name: "새싹 후원자", min: 5000, title: "따뜻한 새싹 후원자", badge: "후원 새싹", money: 150000, emoji: "🌱" },
  { key: "heart", name: "하트 후원자", min: 10000, title: "분홍빛 하트 후원자", badge: "프리미엄 하트", money: 400000, emoji: "💗" },
  { key: "star", name: "별빛 후원자", min: 30000, title: "별빛 후원자", badge: "별빛 후원 배지", money: 1500000, emoji: "✨" },
  { key: "legend", name: "전설 후원자", min: 50000, title: "전설의 나츠미 후원자", badge: "전설 후원 인증", money: 3500000, emoji: "👑" }
];

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
    apiFallbackBase: (config.API_FALLBACK_BASE || "").replace(/\/$/, ""),
    defaultGuildId: config.DEFAULT_GUILD_ID || "",
    donationUrl: config.DONATION_URL || "",
    donationAccount: config.DONATION_ACCOUNT || "",
    donationBankAccount: config.DONATION_BANK_ACCOUNT || "IBK기업은행 08706196201017",
    donationEnabled: Boolean(config.DONATION_URL),
    discordLoginEnabled: false,
    supportTiers: fallbackSupportTiers
  };
}

async function loadServerConfig(baseConfig) {
  const bases = [...new Set([baseConfig.apiBase, baseConfig.apiFallbackBase].filter(Boolean))];
  let lastError = null;
  for (const apiBase of bases) {
  try {
    const res = await fetch(`${apiBase}/api/config`, { credentials: "include" });
    if (!res.ok) {
      lastError = new Error(`config ${res.status}`);
      continue;
    }
    const serverConfig = await res.json();
    return {
      ...baseConfig,
      apiBase,
      defaultGuildId: serverConfig.defaultGuildId || baseConfig.defaultGuildId,
      donationUrl: serverConfig.donationUrl || baseConfig.donationUrl,
      donationAccount: serverConfig.donationAccount || baseConfig.donationAccount,
      donationBankAccount: serverConfig.donationBankAccount || baseConfig.donationBankAccount,
      donationEnabled: Boolean(serverConfig.donationEnabled || baseConfig.donationUrl),
      discordLoginEnabled: Boolean(serverConfig.discordLoginEnabled),
      publicBaseUrl: serverConfig.publicBaseUrl || "",
      discordRedirectUri: serverConfig.discordRedirectUri || "",
      supportTiers: Array.isArray(serverConfig.supportTiers) ? serverConfig.supportTiers : baseConfig.supportTiers
    };
  } catch (error) {
    lastError = error;
  }
  }
  if (baseConfig.apiFallbackBase) return { ...baseConfig, apiBase: baseConfig.apiFallbackBase, apiConfigError: lastError?.message || "fallback" };
  return baseConfig;
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
  return `${state.config.apiBase || ""}/auth/discord/game`;
}

function goLogin() {
  window.location.assign(authUrl());
}

function requireLogin() {
  if (state.me) return true;
  goLogin();
  return false;
}

function displayNameFor(profile = state.profile) {
  return state.me?.globalName || state.me?.username || profile?.displayName || `NATSUMI-${String(profile?.userId || "0000").slice(-4)}`;
}

function avatarUrl() {
  if (!state.me?.id) return "";
  if (state.me.avatar) return `https://cdn.discordapp.com/avatars/${state.me.id}/${state.me.avatar}.png?size=128`;
  let fallback = 0;
  try {
    fallback = Number(BigInt(state.me.id) >> 22n) % 6;
  } catch {
    fallback = 0;
  }
  return `https://cdn.discordapp.com/embed/avatars/${fallback}.png`;
}

function rankUrl(guildId, userId) {
  const name = encodeURIComponent(displayNameFor({ userId }));
  return state.config.apiBase ? `${state.config.apiBase}/rank-card/${guildId}/${userId}?name=${name}` : "#rankView";
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
  $(`#${name}View`)?.classList.add("active-view");
  document.querySelectorAll(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  if (name === "inventory") loadBag();
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
  stage.querySelector(".pixel-result")?.remove();
  const body = lines.map((line) => `<p>${line}</p>`).join("");
  stage.insertAdjacentHTML("beforeend", `<div class="pixel-result result-${tone}"><strong>${title}</strong>${body}</div>`);
}

function setHint(text) {
  const hint = $("#gameHint");
  if (hint) hint.textContent = text;
}

function itemCard(item, type) {
  const iconType = type === "title" ? "sword" : item.key?.includes("support") ? "heart" : "gem";
  const owned = type === "title"
    ? state.profile?.ownedTitles?.some((ownedItem) => ownedItem.key === item.key)
    : state.profile?.ownedBadges?.some((ownedItem) => ownedItem.key === item.key);
  return `<article class="item pixel-shop-item">
    <div class="shop-vending-window">${pixelIcon(iconType)}<span class="emoji">${item.emoji}</span></div>
    <h3>${item.name}</h3>
    <small>${item.description}</small>
    <p><b>${fmt(item.price)}</b> 금전</p>
    <button data-buy="${type}" data-key="${item.key}" type="button" ${owned ? "disabled" : ""}>${owned ? "이미 보유중" : "구매하기"}</button>
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
  state.session = null;
  const game = gameDefs[key];
  document.querySelectorAll("[data-game]").forEach((button) => button.classList.toggle("active", button.dataset.game === key));
  renderGameStage(key);
  $("#gameTitle").textContent = game.name;
  $("#gameDesc").textContent = game.desc;
  $("#betInput").style.display = ["fishing", "anime", "mole"].includes(key) ? "none" : "block";
  $("#playGameBtn").textContent = key === "slot" ? "코인 넣기" : key === "mole" ? "속도전 시작" : key === "anime" ? "가챠 시작" : "게임 입장";
}

function renderGameStage(key, active = false) {
  const stage = $("#gameStage");
  if (!stage) return;
  stage.className = `game-stage pixel-stage stage-${key} ${active ? "is-playing" : ""}`;
  if (key === "slot") {
    stage.innerHTML = `<div class="pixel-cabinet slot-cabinet">${pixelIcon("slot")}<div class="reel-row">
      <button class="reel" data-stop-reel="0" type="button">N</button>
      <button class="reel" data-stop-reel="1" type="button">A</button>
      <button class="reel" data-stop-reel="2" type="button">T</button>
    </div><div class="arcade-help">코인을 넣고 릴 3개를 직접 멈춰!</div></div>`;
  } else if (key === "fishing") {
    stage.innerHTML = `<div class="fishing-scene"><div class="water"></div><div class="fish-lane"><span class="pixel-fish-swim"><i></i><b></b><em></em></span><span class="pixel-fish-swim fish-two"><i></i><b></b><em></em></span><span class="pixel-shell"></span><span class="pixel-bubbles"></span></div><button class="bobber" id="catchFishBtn" type="button">CAST</button><div class="fishing-progress"><span id="reelProgress"></span></div><div class="timing-bar"><span id="timingNeedle"></span><em></em></div><div class="arcade-help" id="fishingHelp">찌가 초록 구간에 들어오면 버튼을 눌러!</div></div>`;
  } else if (key === "mine") {
    stage.innerHTML = `<div class="mine-grid">${Array.from({ length: 9 }, (_, i) => `<button class="mine-cell" data-mine="${i}" type="button">${active ? "?" : "LOCK"}</button>`).join("")}</div><div class="arcade-help">입장 후 광산 타일 하나를 골라!</div>`;
  } else if (key === "mole") {
    stage.innerHTML = `<div class="mole-hud"><b id="moleTimer">8.0</b><span id="moleScore">0 HIT</span></div><div class="mole-grid">${Array.from({ length: 9 }, (_, i) => `<button class="mole-cell" data-mole="${i}" type="button"><span class="mole-dirt"></span><span class="mole-sprite"></span><span class="hit-pop">HIT!</span></button>`).join("")}</div><div class="arcade-help">두더지가 올라오는 구멍을 바로 눌러!</div>`;
  } else if (key === "anime") {
    stage.innerHTML = `<div class="gacha-machine">${pixelIcon("gacha")}<div class="capsule">CAPSULE</div><button id="gachaLever" class="gacha-lever" type="button">LEVER 0/3</button><div class="pixel-lightbar"></div><div class="arcade-help">레버를 세 번 돌려 캡슐을 열어!</div></div>`;
  } else {
    stage.innerHTML = `<div class="bun-machine">${pixelIcon("bun")}<div class="bun-window">HOT</div><div class="bun-tray">${Array.from({ length: 4 }, (_, i) => `<button class="bun-pick" data-bun="${i}" type="button">BUN</button>`).join("")}</div><div class="arcade-help">진열대에서 붕어빵 하나를 골라!</div></div>`;
  }
}
function setPlaying(playing) {
  const button = $("#playGameBtn");
  if (!button) return;
  button.disabled = playing;
  if (playing) button.textContent = "플레이 중";
  else button.textContent = state.game === "slot" ? "코인 넣기" : state.game === "mole" ? "속도전 시작" : state.game === "anime" ? "가챠 시작" : "게임 입장";
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
  const avatar = avatarUrl();
  const titleOptions = profile.ownedTitles.length
    ? profile.ownedTitles.map((item) => `<button class="tab" data-title="${item.key}" type="button">${item.emoji} ${item.name}</button>`).join("")
    : "<p>보유 칭호 없음</p>";
  const badges = profile.ownedBadges.length ? profile.ownedBadges.map((item) => `<span title="${item.name}">${item.emoji}</span>`).join(" ") : "배지 없음";
  $("#profileArea").className = "rank-card";
  $("#profileArea").innerHTML = `<div class="rank-glow"></div>
    <div class="pixel-rank-grid"></div>
    <div class="discord-profile-chip">
      ${avatar ? `<img src="${avatar}" alt="Discord 프로필" />` : ""}
      <span>Discord Profile</span>
    </div>
    <div><p class="eyebrow">${active ? `${active.emoji} ${active.name}` : "NATSUMI PLAYER"} ${state.demo ? " DEMO" : ""}</p>
      <h1>${displayNameFor(profile)}</h1><p>${badges}</p></div>
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
  const area = $("#inventoryArea");
  if (!area) return;
  if (!state.me) {
    area.textContent = "로그인 후 가방과 도감을 볼 수 있어요.";
    return;
  }
  const bag = state.bag || { anime: [], fishing: [], collection: { anime: [], fishing: [] } };
  if (state.arcadeTab === "collection") {
    const anime = bag.collection?.anime || [];
    const fish = bag.collection?.fishing || [];
    area.innerHTML = `<div class="pixel-list"><b>도감 수집률</b><p>애니굿즈 ${anime.length}종 · 낚시 ${fish.length}종</p>${[...anime, ...fish].slice(0, 24).map((name) => `<span>${name}</span>`).join("") || "<small>아직 수집 기록이 없어요.</small>"}</div>`;
    return;
  }
  const animeRows = (bag.anime || []).slice(0, 18).map((item) => `<span>${item.name} x${item.count}</span>`).join("");
  const fishRows = (bag.fishing || []).filter((item) => item.count > 0).map((item) => `<span>${item.name} x${item.count}</span>`).join("");
  area.innerHTML = `<div class="pixel-list"><b>가방</b>${animeRows || fishRows ? `${animeRows}${fishRows}` : "<small>아직 가방이 비어 있어요.</small>"}</div>`;
}

function renderSupportTiers() {
  const area = $("#supportTierList");
  if (!area) return;
  const tiers = state.config.supportTiers?.length ? state.config.supportTiers : fallbackSupportTiers;
  area.innerHTML = tiers.map((tier) => `<button class="support-tier" data-support-amount="${tier.min}" type="button">
    <span class="tier-gif">${pixelIcon(tier.key === "legend" ? "gacha" : tier.key === "star" ? "slot" : "bun")}</span>
    <b>${tier.emoji} ${tier.name}</b>
    <small>${fmt(tier.min)}원 이상</small>
    <em>${tier.title} · ${tier.badge} · ${fmt(tier.money)} 금전</em>
  </button>`).join("");
  document.querySelectorAll("[data-support-amount]").forEach((button) => button.addEventListener("click", () => {
    $("#supportAmount").value = button.dataset.supportAmount;
    document.querySelectorAll("[data-support-amount]").forEach((tier) => tier.classList.remove("active"));
    button.classList.add("active");
  }));
}

async function buyItem(event) {
  if (!requireLogin()) return;
  if (event.currentTarget.disabled) return;
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
  setPlaying(true);
  renderGameStage(key, true);
  if (key === "slot") return startSlotGame();
  if (key === "mine") return startMineGame();
  if (key === "fishbun") return startBunGame();
  if (key === "fishing") return startFishingGame();
  if (key === "anime") return startGachaGame();
}

async function finishGame(apiPath, body = {}) {
  try {
    const data = await api(apiPath, { method: "POST", body: JSON.stringify(body) });
    showGameResult(data);
    await loadProfile();
  } catch (error) {
    showPixelResult({ title: "ERROR", lines: [error.message], tone: "bad" });
  } finally {
    state.session = null;
    setPlaying(false);
  }
}

function startSlotGame() {
  const bet = Number($("#betInput").value || 1000);
  const symbols = ["N", "A", "T", "★", "7", "♥"];
  const reels = [...document.querySelectorAll("[data-stop-reel]")];
  let stopped = 0;
  let finishing = false;
  setHint("릴을 하나씩 눌러 멈춰줘.");
  const timers = reels.map((reel) => setInterval(() => {
    if (reel.dataset.stopped) return;
    reel.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    reel.classList.add("spin");
  }, 90));
  reels.forEach((reel, index) => reel.addEventListener("click", () => {
    if (reel.dataset.stopped || finishing) return;
    reel.dataset.stopped = "1";
    reel.classList.remove("spin");
    clearInterval(timers[index]);
    stopped += 1;
    if (stopped === reels.length) {
      finishing = true;
      timers.forEach(clearInterval);
      setHint("릴 정지 완료. 결과 정산 중...");
      finishGame("/api/games/slot", { bet, stopped: reels.map((item) => item.textContent) });
    }
  }));
}

function startMineGame() {
  const bet = Number($("#betInput").value || 1000);
  setHint("광산 타일 하나를 골라.");
  document.querySelectorAll("[data-mine]").forEach((cell) => cell.addEventListener("click", () => {
    if (state.session === "done") return;
    state.session = "done";
    cell.textContent = "PICK";
    cell.classList.add("picked");
    finishGame("/api/games/mine", { bet, tile: cell.dataset.mine });
  }));
}

function startBunGame() {
  const bet = Number($("#betInput").value || 1000);
  setHint("붕어빵 하나를 직접 골라.");
  document.querySelectorAll("[data-bun]").forEach((bun) => bun.addEventListener("click", () => {
    if (state.session === "done") return;
    state.session = "done";
    bun.textContent = "OPEN";
    bun.classList.add("picked");
    finishGame("/api/games/fishbun", { bet, bun: bun.dataset.bun });
  }));
}

function startFishingGame() {
  setHint("1차: 초록 구간에서 찌를 던져. 빨간 구간은 놓치거나 잡동사니가 나와.");
  const button = $("#catchFishBtn");
  const needle = $("#timingNeedle");
  const progress = $("#reelProgress");
  const help = $("#fishingHelp");
  const stage = $("#gameStage");
  let pos = 0;
  let dir = 1;
  const timer = setInterval(() => {
    pos += dir * 4;
    if (pos >= 100 || pos <= 0) dir *= -1;
    needle.style.left = `${pos}%`;
  }, 35);
  button.textContent = "CATCH";
  button.addEventListener("click", () => {
    clearInterval(timer);
    const sweet = pos > 42 && pos < 58;
    if (!sweet) {
      stage?.classList.add("fish-missed");
      button.textContent = "MISS";
      if (help) help.textContent = "빨간 구간! 찌를 놓쳤거나 이상한 게 걸렸어...";
      finishGame("/api/games/fishing", { timing: Math.round(pos), perfect: false, struggleClicks: 0 });
      return;
    }
    stage?.classList.add("fish-hooked");
    setHint("2차: 물고기가 걸렸어. 제한 시간 안에 버튼을 연타해서 끌어올려!");
    if (help) help.textContent = "물고기가 버틴다! REEL 버튼을 빠르게 눌러!";
    button.textContent = "REEL 0/10";
    let clicks = 0;
    let finished = false;
    const finishReel = (caught) => {
      if (finished) return;
      finished = true;
      clearTimeout(limit);
      button.disabled = true;
      button.textContent = caught ? "CAUGHT" : "ESCAPED";
      stage?.classList.toggle("fish-caught", caught);
      finishGame("/api/games/fishing", { timing: Math.round(pos), perfect: caught, struggleClicks: clicks });
    };
    const limit = setTimeout(() => finishReel(false), 3200);
    button.addEventListener("click", () => {
      if (finished) return;
      clicks += 1;
      if (progress) progress.style.width = `${Math.min(100, clicks * 10)}%`;
      button.textContent = `REEL ${clicks}/10`;
      if (clicks >= 10) finishReel(true);
    });
  }, { once: true });
}
function startGachaGame() {
  setHint("레버를 세 번 돌려 캡슐을 열어.");
  const lever = $("#gachaLever");
  const capsule = document.querySelector(".capsule");
  let pulls = 0;
  lever.addEventListener("click", () => {
    pulls += 1;
    lever.textContent = `LEVER ${pulls}/3`;
    capsule.classList.add("capsule-roll");
    setTimeout(() => capsule.classList.remove("capsule-roll"), 260);
    if (pulls >= 3) {
      lever.disabled = true;
      finishGame("/api/games/anime-gacha", { rollCount: 1 });
    }
  });
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
    cells.forEach((cell) => {
      cell.classList.remove("active", "bonked");
    });
    active = Math.floor(Math.random() * cells.length);
    cells[active].classList.add("active");
  };
  const hit = (event) => {
    const idx = Number(event.currentTarget.dataset.mole);
    if (idx !== active) return;
    score += 1;
    $("#moleScore").textContent = `${score} HIT`;
    event.currentTarget.classList.add("bonked");
    event.currentTarget.classList.remove("active");
    setTimeout(setActive, 120);
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
    await finishGame("/api/games/mole", { score, difficulty: "medium" });
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
    result.innerHTML = `<b>${data.tier?.emoji || ""} ${data.tier?.name || "후원 접수"}</b><br>${data.message || "후원 인증 요청을 저장했어."}<br><small>${data.ownerNotified ? "운영자 DM 알림 전송 완료" : "운영자 확인 대기"} · 가짜 후원은 실패 처리 후 서포트 안내가 표시돼.</small>`;
  } catch (error) {
    result.innerHTML = `<b>후원 확인 실패</b><br>${error.message}<br><small>입금했는데 실패로 보이면 서포트에서 관리자에게 문의해줘.</small>`;
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
  mountPetalRain();
  initTheme();
  state.config = await loadServerConfig(getConfig());
  bindUiEvents();
  $("#loginBtn").href = authUrl();
  renderSupportTiers();
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
    $("#profileArea").textContent = "Discord 로그인 후 레벨, 경험치, 금전, 랭크카드를 불러올 수 있어요.";
    renderBag();
  }
}

init().catch((error) => {
  console.error(error);
  alert(`초기화 실패: ${error.message}`);
});
