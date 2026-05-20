import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import mongoose, { Schema, model } from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = process.env.PORT || 3000;
const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || '';
const DONATION_URL = process.env.DONATION_URL || '';
const DONATION_ACCOUNT = process.env.DONATION_ACCOUNT || '';
const DONATION_BANK_ACCOUNT = process.env.DONATION_BANK_ACCOUNT || 'IBK기업은행 08706196201017';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.TOKEN || '';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${PUBLIC_BASE_URL}/auth/discord/callback`;
const OWNER_USER_ID = process.env.OWNER_USER_ID || process.env.NATSUMI_OWNER_ID || '1293232804745838733';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://natsumidashboard.kro.kr/';
const SITE_URL = process.env.SITE_URL || PUBLIC_BASE_URL;
const KOREANBOTS_TOKEN = process.env.KOREANBOTS_TOKEN || '';
const KOREANBOTS_BOT_ID = process.env.KOREANBOTS_BOT_ID || '';
const DEVELOPER_NOTICE_CHANNEL_ID = process.env.DEVELOPER_NOTICE_CHANNEL_ID || '1371675674393448528';
const DISCORD_ADMINISTRATOR = 0x8n;
const DISCORD_MANAGE_GUILD = 0x20n;
const calculateXP = (level) => level * level * 100;
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
async function sendOwnerSupportDm(row, tier) {
  if (!DISCORD_BOT_TOKEN || !OWNER_USER_ID || !row || !tier) return false;
  try {
    const headers = { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
    const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient_id: OWNER_USER_ID }),
    });
    if (!dmRes.ok) return false;
    const channel = await dmRes.json();
    const adminUrl = `${PUBLIC_BASE_URL}/support-admin?request=${encodeURIComponent(String(row._id))}`;
    const lines = [
      `후원 인증 요청이 들어왔어.`,
      `신청자: ${row.username || row.userId || 'guest'}`,
      `입금자명: ${row.name}`,
      `금액: ${Number(row.amount || 0).toLocaleString('ko-KR')}원`,
      `등급: ${tier.name}`,
      row.memo ? `메모: ${row.memo}` : '',
      `카카오페이 또는 IBK 입금 내역을 확인한 뒤 승인/반려해줘.`,
    ].filter(Boolean).join('\n');
    const msgRes = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: lines,
        components: [{
          type: 1,
          components: [
            { type: 2, style: 5, label: '승인/반려 페이지 열기', url: adminUrl },
            { type: 2, style: 5, label: '게임 사이트 열기', url: PUBLIC_BASE_URL },
          ],
        }],
      }),
    });
    return msgRes.ok;
  } catch (error) {
    console.warn('[support dm] owner notification failed:', error.message);
    return false;
  }
}

app.use(express.json());
app.use((req, res, next) => {
  const allowed = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || `${DASHBOARD_URL},${SITE_URL}`)
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const origin = req.headers.origin?.replace(/\/$/, '');
  res.setHeader('Access-Control-Allow-Origin', origin && allowed.includes(origin) ? req.headers.origin : (allowed[0] || '*'));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-natsumi-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 14, sameSite: PUBLIC_BASE_URL.startsWith('https://') ? 'none' : 'lax', secure: PUBLIC_BASE_URL.startsWith('https://') }
}));
app.use(express.static(path.join(__dirname, 'public')));

const LevelSystem = model('LevelSystem', new Schema({ GuildID: String, UserID: String, xp: { type: Number, default: 0 }, level: { type: Number, default: 1 } }));
const Money = model('도박', new Schema({ userid: String, money: Number, date: Number }));
const Attendance = model('출석체크', new Schema({ userid: String, count: Number, date: Number }));
const FishingInventory = model('FishingInventory', new Schema({ userId: { type: String, required: true, unique: true }, goldenFish: { type: Number, default: 0 }, decentGoldenFish: { type: Number, default: 0 }, mediumFish: { type: Number, default: 0 }, regularFish: { type: Number, default: 0 }, curiousItem: { type: Number, default: 0 }, adultItem: { type: Number, default: 0 }, lastFishingTime: { type: Date, default: 0 } }));
const Title = model('GameTitle', new Schema({ key: { type: String, unique: true }, name: String, description: String, price: Number, emoji: String }));
const Badge = model('GameBadge', new Schema({ key: { type: String, unique: true }, name: String, description: String, price: Number, emoji: String }));
const Inventory = model('GameInventory', new Schema({ userId: { type: String, index: true }, titles: [String], badges: [String], activeTitle: String }));
const SupportRequest = model('GameSupportRequest', new Schema({
  userId: { type: String, index: true },
  username: String,
  name: String,
  amount: Number,
  memo: String,
  tierKey: String,
  tierName: String,
  rewards: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now },
  processedAt: Date,
}));
const DashboardSettings = model('DashboardSettings', new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  disabledCommands: { type: [String], default: [] },
  features: {
    welcome: { type: Boolean, default: false },
    notice: { type: Boolean, default: true },
    ticket: { type: Boolean, default: true },
    tts: { type: Boolean, default: false },
    ai: { type: Boolean, default: true },
    shop: { type: Boolean, default: true },
    emojiUpscale: { type: Boolean, default: false },
    level: { type: Boolean, default: false },
  },
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: String,
    leaveChannelId: String,
    cleanupOnLeave: { type: Boolean, default: true },
    message: String,
    aiPrompt: String,
    templates: { type: [Schema.Types.Mixed], default: [] },
  },
  notice: { enabled: { type: Boolean, default: true }, channelId: String, message: String },
  tts: { enabled: { type: Boolean, default: false }, categoryId: String, textChannelId: String, voiceChannelId: String, voice: String },
  emojiUpscale: { enabled: { type: Boolean, default: false }, channelId: String, webhookName: String },
}, { timestamps: true }));
const DashboardNotice = model('DashboardNotice', new Schema({
  guildId: String,
  authorId: String,
  authorName: String,
  message: String,
  status: { type: String, default: 'draft', index: true },
  createdAt: { type: Date, default: Date.now },
}));
const DashboardQuestion = model('DashboardQuestion', new Schema({
  guildId: String,
  userId: String,
  username: String,
  question: String,
  answer: String,
  answeredBy: String,
  status: { type: String, default: 'open', index: true },
  createdAt: { type: Date, default: Date.now },
  answeredAt: Date,
}));
const DeveloperAnnouncement = model('DeveloperAnnouncement', new Schema({
  authorId: String,
  authorName: String,
  title: String,
  message: String,
  channelId: String,
  status: { type: String, default: 'stored', index: true },
  webhookId: String,
  discordMessageId: String,
  error: String,
  createdAt: { type: Date, default: Date.now },
}));
const AnimeInventory = model('AnimeInventory', new Schema({
  userId: { type: String, required: true, unique: true },
  items: { type: Map, of: Number, default: {} }
}));
const Collection = model('Collection', new Schema({
  userId: { type: String, required: true, unique: true },
  animeItems: { type: [String], default: [] },
  fishingItems: { type: [String], default: [] }
}));

const animeGoods = {
  GOLDEN: ['황금 여우 피규어', '전설의 마법봉', '한정판 별빛 망토', '프리미엄 나츠미 포스터'],
  JACKPOT: ['레어 아크릴 스탠드', '빛나는 캐릭터 카드', '한정 배지 세트', '사인 포토카드'],
  MEDIUM: ['귀여운 키링', '미니 쿠션', '스티커 팩', '캔배지'],
  NORMAL: ['랜덤 엽서', '작은 포스터', '종이 책갈피', '말랑 피규어'],
  FAIL: ['빈 캡슐', '구겨진 교환권', '먼지 낀 박스', '다음 기회 쿠폰']
};
const animeRates = [['GOLDEN', 1], ['JACKPOT', 6], ['MEDIUM', 22], ['NORMAL', 62], ['FAIL', 100]];
const supportTiers = [
  { key: 'sprout', name: '새싹 후원자', min: 5000, title: '따뜻한 새싹 후원자', badge: '후원 새싹', money: 150000, emoji: '🌱' },
  { key: 'heart', name: '하트 후원자', min: 10000, title: '분홍빛 하트 후원자', badge: '프리미엄 하트', money: 400000, emoji: '💗' },
  { key: 'star', name: '별빛 후원자', min: 30000, title: '별빛 후원자', badge: '별빛 후원 배지', money: 1500000, emoji: '✨' },
  { key: 'legend', name: '전설 후원자', min: 50000, title: '전설의 나츠미 후원자', badge: '전설 후원 인증', money: 3500000, emoji: '👑' }
];

const titleItems = [
  ['rookie_fox','초보 여우','아직은 귀엽게 봐줄 수 있는 신입.',50000,'🦊'],['daily_guardian','출석 수호자','출석 버튼을 지키는 성실한 녀석.',65000,'📅'],['coin_collector','동전 수집가','작은 금전도 놓치지 않는 타입.',80000,'🪙'],['night_gamer','새벽의 지배자','잠은 포기하고 랭크를 얻었다.',95000,'🌙'],['rank_hunter','랭크 사냥꾼','XP 냄새를 맡고 달려드는 사람.',110000,'🎯'],['fox_master','여우 조련사','나츠미한테 살아남은 전설의 유저.',130000,'🦊'],['lucky_tail','행운의 꼬리','이상하게 운이 따라붙는 녀석.',150000,'🍀'],['mvp','MVP','오늘의 주인공. 인정하기 싫지만 좀 멋짐.',180000,'🏆'],['combo_star','콤보 스타','한 번 흐름 타면 멈추지 않는 별.',210000,'🌟'],['boss_slayer','보스 슬레이어','강한 상대일수록 눈이 반짝인다.',240000,'⚔️'],['guild_ace','길드 에이스','서버에서 은근히 존재감 있는 사람.',280000,'🛡️'],['coin_whale','금전왕','주머니가 묵직한 수상한 사람.',330000,'💰'],['chat_legend','채팅 전설','말이 많지만 이상하게 재밌다.',390000,'💬'],['flame_heart','불꽃 심장','지는 건 싫어하는 뜨거운 타입.',460000,'🔥'],['crystal_mind','크리스탈 두뇌','운보다 계산으로 이기는 사람.',540000,'💎'],['shadow_runner','그림자 질주자','조용히 강해지는 은근한 실력자.',630000,'🥷'],['sunrise_hero','여명의 용사','아침부터 랭크를 챙기는 무서운 사람.',740000,'🌅'],['natsumi_favorite','나츠미의 관심대상','딱히 좋아하는 건 아니고, 그냥 보이는 거야.',880000,'😼'],['mythic_player','신화급 플레이어','슬슬 서버 기록에 이름이 남을 수준.',1050000,'🐉'],['eternal_champion','영원의 챔피언','비싸다. 그래서 더 폼 난다.',1300000,'👑']
].map(([key,name,description,price,emoji]) => ({ key, name, description, price, emoji }));
const badgeItems = [
  ['first_step','첫 발자국','나츠미 게임 사이트 입문자.',50000,'🐾'],['tiny_coin','작은 동전','시작은 작지만 반짝임은 진짜.',60000,'🪙'],['daily_soul','출석혼','출석을 꽤 진심으로 하는 편.',75000,'📅'],['sparkle','반짝임','프로필에 가벼운 광채를 더함.',90000,'✨'],['fox_paw','여우 발바닥','도장처럼 찍히는 귀여운 흔적.',110000,'🐾'],['hot_streak','연승 불꽃','기세가 오를 때 어울리는 뱃지.',135000,'🔥'],['rank_spark','랭크 스파크','랭크 카드에 반짝임을 더함.',160000,'⚡'],['moon_mark','달빛 표식','새벽 접속자에게 어울리는 감성.',190000,'🌙'],['lucky_clover','행운 클로버','운빨도 실력이라고 우기는 사람용.',225000,'🍀'],['gold_pouch','황금 주머니','금전 보유자 느낌을 내는 뱃지.',265000,'👝'],['pink_heart','핑크 하트','귀여움으로 모든 걸 해결한다.',310000,'💗'],['blue_star','푸른 별','차분하지만 확실히 눈에 띈다.',360000,'🔷'],['crown_bit','작은 왕관','왕관은 작아도 자존심은 큼.',420000,'👑'],['diamond_chip','다이아 조각','비싼 척하기 좋은 반짝이.',490000,'💎'],['sword_mark','검의 문장','전투력 있어 보이고 싶은 날에.',570000,'🗡️'],['shield_mark','방패 문장','믿음직한 유저처럼 보이게 해줌.',660000,'🛡️'],['dragon_scale','용의 비늘','신화급 분위기를 살짝 얹는다.',770000,'🐉'],['galaxy_core','은하 코어','프로필을 우주급으로 꾸미는 장식.',900000,'🌌'],['supporter','서포터','후원자를 위한 표시용 뱃지.',1000000,'💖'],['legend_stamp','전설 인증','비싸지만 이름값은 하는 최상급 뱃지.',1250000,'🏅']
].map(([key,name,description,price,emoji]) => ({ key, name, description, price, emoji }));

async function seedShop() { await Promise.all(titleItems.map((item) => Title.updateOne({ key: item.key }, { $set: item }, { upsert: true }))); await Promise.all(badgeItems.map((item) => Badge.updateOne({ key: item.key }, { $set: item }, { upsert: true }))); }
function toInt(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clampBet(value) { return Math.max(100, Math.min(1_000_000, Math.floor(toInt(value, 100)))); }
function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
function currentUserId(req) { return req.session?.discordUser?.id || req.body?.userId || req.params?.userId || ''; }
async function ensureMoney(userId) { let data = await Money.findOne({ userid: userId }); if (!data) data = await Money.create({ userid: userId, money: 0, date: Date.now() }); return data; }
async function addMoney(userId, delta) { await Money.updateOne({ userid: userId }, { $inc: { money: delta }, $set: { date: Date.now() } }, { upsert: true }); return ensureMoney(userId); }
function getSupportTier(amount) { return [...supportTiers].reverse().find((tier) => amount >= tier.min) || null; }
function supportRewards(tier) { return tier ? { title: `support_${tier.key}_title`, badge: `support_${tier.key}_badge`, money: tier.money } : {}; }
async function grantSupportRewards(userId, tier) {
  if (!userId || !tier) return null;
  const rewards = supportRewards(tier);
  await Title.updateOne({ key: rewards.title }, { $set: { key: rewards.title, name: tier.title, description: `${tier.name} 전용 후원 칭호`, price: tier.min * 100, emoji: tier.emoji } }, { upsert: true });
  await Badge.updateOne({ key: rewards.badge }, { $set: { key: rewards.badge, name: tier.badge, description: `${tier.name} 전용 후원 배지`, price: tier.min * 80, emoji: tier.emoji } }, { upsert: true });
  await Inventory.updateOne({ userId }, { $addToSet: { titles: rewards.title, badges: rewards.badge }, $set: { activeTitle: rewards.title } }, { upsert: true });
  await addMoney(userId, rewards.money);
  return rewards;
}
function rollAnimeGood() { const chance = Math.random() * 100; const category = animeRates.find(([, limit]) => chance < limit)?.[0] || 'FAIL'; return { category, name: pick(animeGoods[category]) }; }
async function saveAnimeGoods(userId, results) { let inv = await AnimeInventory.findOne({ userId }); if (!inv) inv = new AnimeInventory({ userId, items: {} }); for (const item of results) { if (item.category === 'FAIL') continue; inv.items.set(item.name, (inv.items.get(item.name) || 0) + 1); } await inv.save(); const names = results.filter((item) => item.category !== 'FAIL').map((item) => item.name); if (names.length) await Collection.updateOne({ userId }, { $addToSet: { animeItems: { $each: names } } }, { upsert: true }); return inv; }
async function saveFishingCollection(userId, item) { if (item) await Collection.updateOne({ userId }, { $addToSet: { fishingItems: item } }, { upsert: true }); }
function requireLogin(req, res, next) {
  if (req.session?.discordUser?.id) return next();
  return res.status(401).json({ error: 'Discord login required.' });
}
function isOwner(req) {
  return Boolean(OWNER_USER_ID && req.session?.discordUser?.id === OWNER_USER_ID);
}
function isGuildAdmin(row) {
  try {
    const permissions = BigInt(row.permissions || 0);
    return (permissions & DISCORD_ADMINISTRATOR) === DISCORD_ADMINISTRATOR
      || (permissions & DISCORD_MANAGE_GUILD) === DISCORD_MANAGE_GUILD;
  } catch {
    return false;
  }
}
async function fetchUserGuilds(req) {
  const token = req.session?.discordAccessToken;
  if (!token) return [];
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}
async function userCanManageGuild(req, guildId) {
  if (isOwner(req)) return true;
  const guilds = await fetchUserGuilds(req);
  return guilds.some((guild) => guild.id === guildId && isGuildAdmin(guild));
}
async function requireGuildAdmin(req, res, next) {
  if (await userCanManageGuild(req, req.params.guildId)) return next();
  return res.status(403).json({ error: 'Only server administrators can change this setting.' });
}
async function fetchBotGuildChannels(guildId) {
  if (!DISCORD_BOT_TOKEN) return [];
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) return [];
  const channels = await res.json();
  return channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    parentId: channel.parent_id || null,
    type: channel.type === 0 ? 'text' : channel.type === 2 ? 'voice' : channel.type === 4 ? 'category' : 'other',
  })).filter((channel) => channel.type !== 'other');
}
async function fetchKoreanbotsStats() {
  if (!KOREANBOTS_BOT_ID) return { servers: null, votes: null };
  try {
    const res = await fetch(`https://koreanbots.dev/api/v2/bots/${KOREANBOTS_BOT_ID}`, {
      headers: KOREANBOTS_TOKEN ? { Authorization: KOREANBOTS_TOKEN } : {},
    });
    if (!res.ok) return { servers: null, votes: null };
    const data = await res.json();
    const bot = data?.data || data;
    return {
      servers: bot?.servers ?? bot?.server_count ?? null,
      votes: bot?.votes ?? bot?.vote_count ?? null,
    };
  } catch {
    return { servers: null, votes: null };
  }
}
async function fetchBotGuildCount() {
  if (!DISCORD_BOT_TOKEN) return { servers: null, ok: false };
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (!res.ok) return { servers: null, ok: false };
    const guilds = await res.json();
    return { servers: Array.isArray(guilds) ? guilds.length : null, ok: true };
  } catch {
    return { servers: null, ok: false };
  }
}
function formatUptime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}
async function sendDeveloperAnnouncement(row) {
  if (!DISCORD_BOT_TOKEN || !DEVELOPER_NOTICE_CHANNEL_ID) {
    return { ok: false, error: 'Discord bot token or channel id missing.' };
  }
  const headers = { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
  const payload = {
    username: '나츠미 공지',
    avatar_url: `${PUBLIC_BASE_URL}/favicon.ico`,
    embeds: [{
      title: `📢 ${row.title || '나츠미 지원서버 공지'}`,
      description: row.message,
      color: 0xff6d92,
      footer: { text: 'NATSUMI Developer Notice' },
      timestamp: new Date(row.createdAt || Date.now()).toISOString(),
    }],
  };

  try {
    const hooksRes = await fetch(`https://discord.com/api/v10/channels/${DEVELOPER_NOTICE_CHANNEL_ID}/webhooks`, { headers });
    const hooks = hooksRes.ok ? await hooksRes.json() : [];
    let hook = Array.isArray(hooks) ? hooks.find((item) => item.name === 'Natsumi Developer Notice') : null;
    if (!hook) {
      const createRes = await fetch(`https://discord.com/api/v10/channels/${DEVELOPER_NOTICE_CHANNEL_ID}/webhooks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Natsumi Developer Notice' }),
      });
      if (createRes.ok) hook = await createRes.json();
    }
    if (hook?.id && hook?.token) {
      const sendRes = await fetch(`https://discord.com/api/v10/webhooks/${hook.id}/${hook.token}?wait=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (sendRes.ok) {
        const message = await sendRes.json();
        return { ok: true, webhookId: hook.id, discordMessageId: message.id };
      }
    }

    const fallbackRes = await fetch(`https://discord.com/api/v10/channels/${DEVELOPER_NOTICE_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ embeds: payload.embeds }),
    });
    if (!fallbackRes.ok) return { ok: false, error: `Discord ${fallbackRes.status}` };
    const message = await fallbackRes.json();
    return { ok: true, discordMessageId: message.id };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
async function getProfile(guildId, userId) {
  const levelQuery = guildId && guildId !== 'demo-guild'
    ? { GuildID: guildId, UserID: userId }
    : { UserID: userId };
  const [levelData, moneyData, attendanceData, inv, titles, badges] = await Promise.all([
    LevelSystem.findOne(levelQuery).sort({ level: -1, xp: -1 }).lean(),
    Money.findOne({ userid: userId }).lean(),
    Attendance.findOne({ userid: userId }).lean(),
    Inventory.findOne({ userId }).lean(),
    Title.find().lean(),
    Badge.find().lean()
  ]);
  const resolvedGuildId = guildId && guildId !== 'demo-guild' ? guildId : (levelData?.GuildID || DEFAULT_GUILD_ID || 'global');
  const level = toInt(levelData?.level, 1);
  const xp = toInt(levelData?.xp, 0);
  const needed = calculateXP(level);
  const ownedTitleMap = new Set(inv?.titles || []);
  const ownedBadgeMap = new Set(inv?.badges || []);
  return {
    guildId: resolvedGuildId,
    userId,
    level,
    xp,
    needed,
    progress: needed ? Math.min(100, Math.round((xp / needed) * 1000) / 10) : 0,
    money: toInt(moneyData?.money, 0),
    attendance: toInt(attendanceData?.count, 0),
    activeTitle: inv?.activeTitle || '',
    ownedTitles: titles.filter((t) => ownedTitleMap.has(t.key)),
    ownedBadges: badges.filter((b) => ownedBadgeMap.has(b.key))
  };
}

function startDiscordAuth(req, res, returnTo, redirectUri) {
  if (!DISCORD_CLIENT_ID) return res.status(500).send('DISCORD_CLIENT_ID가 필요해.');
  const state = Math.random().toString(36).slice(2);
  req.session.oauthState = state;
  req.session.oauthReturnTo = returnTo || '/';
  req.session.oauthRedirectUri = redirectUri;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });
  return res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}
async function finishDiscordAuth(req, res, redirectUri) {
  try {
    const expectedRedirectUri = req.session.oauthRedirectUri || redirectUri;
    if (!req.query.code || req.query.state !== req.session.oauthState) return res.status(400).send('OAuth state가 맞지 않아.');
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(req.query.code),
        redirect_uri: expectedRedirectUri,
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) return res.status(400).json(token);
    const userRes = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: `Bearer ${token.access_token}` } });
    const user = await userRes.json();
    req.session.discordAccessToken = token.access_token;
    req.session.discordUser = { id: user.id, username: user.username, globalName: user.global_name, avatar: user.avatar };
    const returnTo = req.session.oauthReturnTo || '/';
    delete req.session.oauthReturnTo;
    delete req.session.oauthRedirectUri;
    return res.redirect(returnTo);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Discord 로그인 실패');
  }
}
app.get('/auth/discord', (req, res) => startDiscordAuth(req, res, typeof req.query.returnTo === 'string' ? req.query.returnTo : '/', DISCORD_REDIRECT_URI));
app.get('/auth/discord/callback', (req, res) => finishDiscordAuth(req, res, DISCORD_REDIRECT_URI));
app.get('/auth/discord/dashboard', (req, res) => startDiscordAuth(req, res, DASHBOARD_URL, `${PUBLIC_BASE_URL}/auth/discord/dashboard/callback`));
app.get('/auth/discord/dashboard/callback', (req, res) => finishDiscordAuth(req, res, `${PUBLIC_BASE_URL}/auth/discord/dashboard/callback`));
app.get('/auth/discord/game', (req, res) => startDiscordAuth(req, res, SITE_URL, `${PUBLIC_BASE_URL}/auth/discord/game/callback`));
app.get('/auth/discord/game/callback', (req, res) => finishDiscordAuth(req, res, `${PUBLIC_BASE_URL}/auth/discord/game/callback`));
app.post('/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', (req, res) => res.json({ user: req.session?.discordUser || null }));
app.get('/api/config', (req, res) => res.json({
  siteTitle: process.env.SITE_TITLE || 'NATSUMI Game',
  defaultGuildId: DEFAULT_GUILD_ID,
  donationEnabled: Boolean(DONATION_URL),
  donationUrl: DONATION_URL,
  donationAccount: DONATION_ACCOUNT,
  donationBankAccount: DONATION_BANK_ACCOUNT,
  supportTiers,
  discordLoginEnabled: Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET),
  publicBaseUrl: PUBLIC_BASE_URL,
  discordRedirectUri: DISCORD_REDIRECT_URI,
  dashboardUrl: DASHBOARD_URL,
  gameCenterUrl: SITE_URL,
}));
app.get('/api/stats', async (req, res) => {
  const [koreanbots, botGuilds] = await Promise.all([
    fetchKoreanbotsStats(),
    fetchBotGuildCount(),
  ]);
  const discordServers = botGuilds.servers;
  const servers = discordServers ?? koreanbots.servers;
  res.json({
    servers,
    votes: koreanbots.votes,
    botServers: discordServers,
    koreanbotsServers: koreanbots.servers,
    discord: { servers: discordServers, ok: botGuilds.ok },
    koreanbots,
  });
});
app.get('/api/status', async (req, res) => {
  const [koreanbots, discord] = await Promise.all([fetchKoreanbotsStats(), fetchBotGuildCount()]);
  const uptimeSeconds = Math.floor(process.uptime());
  res.json({
    ok: true,
    api: 'ok',
    uptimeSeconds,
    uptimeText: formatUptime(uptimeSeconds),
    botServers: discord.servers,
    votes: koreanbots.votes,
    discordApiOk: discord.ok,
    mongodbOk: mongoose.connection.readyState === 1,
    checkedAt: new Date().toISOString(),
    discord,
    koreanbots,
  });
});
app.get('/api/dashboard/session', (req, res) => res.json({ user: req.session?.discordUser || null, isOwner: isOwner(req) }));
app.get('/api/developer-announcements', async (req, res) => {
  const rows = await DeveloperAnnouncement.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ announcements: rows.map((row) => ({
    id: row._id,
    title: row.title,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
  })) });
});
app.post('/api/developer-announcements', requireLogin, async (req, res) => {
  if (!isOwner(req)) return res.status(403).json({ error: 'Only the developer can post announcements.' });
  const title = String(req.body?.title || '나츠미 지원서버 공지').trim().slice(0, 120);
  const message = String(req.body?.message || '').trim().slice(0, 1800);
  if (!message) return res.status(400).json({ error: '공지 내용이 비어 있어.' });
  const row = await DeveloperAnnouncement.create({
    authorId: req.session.discordUser.id,
    authorName: req.session.discordUser.globalName || req.session.discordUser.username,
    title,
    message,
    channelId: DEVELOPER_NOTICE_CHANNEL_ID,
    status: 'stored',
  });
  const sent = await sendDeveloperAnnouncement(row);
  row.status = sent.ok ? 'sent' : 'stored';
  row.webhookId = sent.webhookId;
  row.discordMessageId = sent.discordMessageId;
  row.error = sent.error;
  await row.save();
  res.json({ ok: true, announcement: row, sent: sent.ok, error: sent.ok ? undefined : sent.error });
});
app.get('/api/dashboard/guilds', requireLogin, async (req, res) => {
  const userGuilds = await fetchUserGuilds(req);
  const manageable = userGuilds.filter(isGuildAdmin);
  const guilds = await Promise.all(manageable.map(async (guild) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : '',
    manageable: true,
    channels: await fetchBotGuildChannels(guild.id),
  })));
  res.json({ guilds });
});
app.get('/api/dashboard/guilds/:guildId/settings', requireLogin, requireGuildAdmin, async (req, res) => {
  const settings = await DashboardSettings.findOneAndUpdate(
    { guildId: req.params.guildId },
    { $setOnInsert: { guildId: req.params.guildId } },
    { upsert: true, new: true }
  ).lean();
  res.json({ settings });
});
app.patch('/api/dashboard/guilds/:guildId/settings', requireLogin, requireGuildAdmin, async (req, res) => {
  const next = req.body?.settings || {};
  const settings = await DashboardSettings.findOneAndUpdate(
    { guildId: req.params.guildId },
    { $set: { ...next, guildId: req.params.guildId } },
    { upsert: true, new: true }
  ).lean();
  res.json({ ok: true, settings });
});
app.post('/api/dashboard/guilds/:guildId/notice', requireLogin, requireGuildAdmin, async (req, res) => {
  const message = String(req.body?.notice?.message || '').trim().slice(0, 1800);
  if (!message) return res.status(400).json({ error: '공지 내용이 비어 있어.' });
  const row = await DashboardNotice.create({
    guildId: req.params.guildId,
    authorId: req.session.discordUser.id,
    authorName: req.session.discordUser.globalName || req.session.discordUser.username,
    message,
    status: isOwner(req) ? 'approved' : 'pending',
  });
  res.json({ ok: true, notice: row, needsDeveloperReview: row.status === 'pending' });
});
app.get('/api/dashboard/guilds/:guildId/questions', requireLogin, requireGuildAdmin, async (req, res) => {
  const rows = await DashboardQuestion.find({ guildId: req.params.guildId }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ questions: rows });
});
app.post('/api/dashboard/guilds/:guildId/questions', requireLogin, async (req, res) => {
  const question = String(req.body?.question || '').trim().slice(0, 1000);
  if (!question) return res.status(400).json({ error: '질문 내용이 비어 있어.' });
  const row = await DashboardQuestion.create({
    guildId: req.params.guildId,
    userId: req.session.discordUser.id,
    username: req.session.discordUser.globalName || req.session.discordUser.username,
    question,
  });
  res.json({ ok: true, question: row });
});
app.post('/api/dashboard/guilds/:guildId/questions/:id/answer', requireLogin, async (req, res) => {
  if (!isOwner(req)) return res.status(403).json({ error: '개발자만 답변할 수 있어.' });
  const answer = String(req.body?.answer || '').trim().slice(0, 1800);
  if (!answer) return res.status(400).json({ error: '답변 내용이 비어 있어.' });
  const row = await DashboardQuestion.findOneAndUpdate(
    { _id: req.params.id, guildId: req.params.guildId },
    { $set: { answer, answeredBy: req.session.discordUser.id, answeredAt: new Date(), status: 'answered' } },
    { new: true }
  ).lean();
  res.json({ ok: true, question: row });
});
app.get('/api/shop', async (req, res) => { const [titles, badges] = await Promise.all([Title.find().sort({ price: 1 }).lean(), Badge.find().sort({ price: 1 }).lean()]); res.json({ titles, badges }); });
app.get('/api/profile/me', async (req, res) => { if (!req.session?.discordUser?.id) return res.status(401).json({ error: 'Discord 로그인이 필요해.' }); res.json(await getProfile(DEFAULT_GUILD_ID, req.session.discordUser.id)); });
app.get('/api/profile/:guildId/:userId', async (req, res) => res.json(await getProfile(req.params.guildId, req.params.userId)));
app.get('/api/bag/me', async (req, res) => {
  const userId = req.session?.discordUser?.id;
  if (!userId) return res.status(401).json({ error: 'Discord 로그인이 필요해.' });
  const [animeInv, fishInv, collection] = await Promise.all([
    AnimeInventory.findOne({ userId }).lean(),
    FishingInventory.findOne({ userId }).lean(),
    Collection.findOne({ userId }).lean()
  ]);
  const anime = animeInv?.items ? Object.entries(animeInv.items).map(([name, count]) => ({ name, count })) : [];
  const fishing = [
    ['goldenFish', '황금 물고기'],
    ['decentGoldenFish', '괜찮은 황금 물고기'],
    ['mediumFish', '중형 물고기'],
    ['regularFish', '일반 물고기'],
    ['curiousItem', '수상한 꾸러미'],
    ['adultItem', '비밀 상자']
  ].map(([key, name]) => ({ key, name, count: Number(fishInv?.[key] || 0) }));
  res.json({ anime, fishing, collection: { anime: collection?.animeItems || [], fishing: collection?.fishingItems || [] } });
});
app.get('/api/balance/:userId', async (req, res) => { const data = await ensureMoney(req.params.userId); res.json({ userId: req.params.userId, money: toInt(data.money, 0) }); });
app.get('/api/leaderboard', async (req, res) => { const rows = await Money.find().sort({ money: -1 }).limit(20).lean(); res.json({ users: rows.map((r, i) => ({ rank: i + 1, userId: r.userid, money: toInt(r.money, 0) })) }); });
app.get('/support-admin', (req, res) => {
  const requestId = escapeHtml(req.query.request || '');
  res.type('html').send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/game-enhance.css"><title>NATSUMI Support Admin</title></head><body><main class="layout"><section class="view active-view"><div class="section-head"><p class="eyebrow">SUPPORT ADMIN</p><h2>후원 확인</h2></div><p>운영자 디스코드 계정으로 로그인한 뒤 승인 또는 반려를 누르면 지급 처리돼.</p><div id="supportAdminList" class="pixel-list">불러오는 중...</div></section></main><script>
const focusId=${JSON.stringify(requestId)};
async function api(url,opt={}){const res=await fetch(url,{credentials:'include',headers:{'content-type':'application/json'},...opt});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'요청 실패');return data;}
async function act(id,kind){await api('/api/support/requests/'+id+'/'+kind,{method:'POST',body:'{}'});await load();}
async function load(){try{const data=await api('/api/support/requests');const rows=(data.requests||[]).filter(r=>!focusId||String(r._id)===focusId||r.status==='pending');document.querySelector('#supportAdminList').innerHTML=rows.map(r=>'<article class="support-card"><b>'+r.name+' · '+Number(r.amount||0).toLocaleString('ko-KR')+'원</b><p>'+r.tierName+' · '+r.status+' · '+(r.username||r.userId||'guest')+'</p><p>'+(r.memo||'메모 없음')+'</p><button onclick="act(\\''+r._id+'\\',\\'approve\\')">승인</button> <button onclick="act(\\''+r._id+'\\',\\'reject\\')">반려</button></article>').join('')||'대기 중인 요청이 없어.';}catch(e){document.querySelector('#supportAdminList').innerHTML='<p>'+e.message+'</p><a class="primary-link" href="/auth/discord">Discord 로그인</a>';}}
load();
</script></body></html>`);
});
app.get(['/terms', '/privacy', '/refund', '/data-policy'], (req, res) => {
  const pages = {
    '/terms': ['이용약관', ['나츠미 게임센터와 대시보드는 Discord 계정 기반 서버 관리와 게임 기능을 제공합니다.', '서비스 악용, 허위 후원 인증, 타인 정보 도용은 이용 제한 대상입니다.']],
    '/privacy': ['개인정보 처리방침', ['Discord 로그인 시 사용자 ID, 이름, 아바타, 관리 가능한 서버 목록 확인 권한을 사용합니다.', '서버 설정, 랭크, 금전, 상점, 질문답변, 후원 요청 데이터는 기능 제공과 운영 확인을 위해 저장됩니다.']],
    '/refund': ['환불정책', ['후원은 선입금 후 운영자 확인 방식입니다.', '선입금되어 보상 지급 절차가 시작되었거나 지급된 결과는 환불할 수 없습니다.', '허위 인증 또는 금액 불일치는 실패 처리되며 관리자 문의가 필요합니다.']],
    '/data-policy': ['데이터정책', ['랭크, 경험치, 금전, 칭호, 배지, 서버 설정은 MongoDB에 저장됩니다.', '불필요한 데이터는 운영자 확인 후 정리할 수 있으며 장애 복구를 위한 백업이 존재할 수 있습니다.']],
  };
  const [title, body] = pages[req.path] || pages['/terms'];
  res.type('html').send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/game-enhance.css"><title>NATSUMI ${escapeHtml(title)}</title></head><body><main class="layout"><section class="view active-view policy-view"><p class="eyebrow">NATSUMI POLICY</p><h1>${escapeHtml(title)}</h1>${body.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}<p><a class="primary-link" href="/">게임센터로 돌아가기</a> <a class="primary-link" href="${DASHBOARD_URL}">대시보드 바로가기</a></p></section></main></body></html>`);
});
app.post('/api/buy', async (req, res) => { const userId = currentUserId(req); const { itemType, key } = req.body; if (!userId || !['title', 'badge'].includes(itemType) || !key) return res.status(400).json({ error: '로그인 또는 userId, itemType, key가 필요해.' }); const Item = itemType === 'title' ? Title : Badge; const item = await Item.findOne({ key }).lean(); if (!item) return res.status(404).json({ error: '상점 아이템을 찾지 못했어.' }); const moneyData = await ensureMoney(userId); const currentMoney = toInt(moneyData.money, 0); if (currentMoney < item.price) return res.status(400).json({ error: `금전 부족! 필요 ${item.price}, 보유 ${currentMoney}` }); const field = itemType === 'title' ? 'titles' : 'badges'; const inv = await Inventory.findOne({ userId }); if (inv?.[field]?.includes(key)) return res.status(400).json({ error: '이미 가지고 있는 아이템이야.' }); await addMoney(userId, -item.price); await Inventory.updateOne({ userId }, { $addToSet: { [field]: key }, ...(itemType === 'title' ? { $setOnInsert: { activeTitle: key } } : {}) }, { upsert: true }); res.json({ ok: true, message: `${item.emoji} ${item.name} 구매 완료!` }); });
app.post('/api/title/select', async (req, res) => { const userId = currentUserId(req); const { key } = req.body; const inv = await Inventory.findOne({ userId }); if (!inv?.titles?.includes(key)) return res.status(400).json({ error: '보유하지 않은 칭호야.' }); await Inventory.updateOne({ userId }, { $set: { activeTitle: key } }); res.json({ ok: true }); });
app.post('/api/support/apply', async (req, res) => {
  const userId = currentUserId(req) || 'guest';
  const name = String(req.body?.name || '').trim().slice(0, 80);
  const amount = Math.max(0, Math.floor(toInt(req.body?.amount, 0)));
  const memo = String(req.body?.memo || '').trim().slice(0, 500);

  if (!name) return res.status(400).json({ error: '입금자명 또는 닉네임을 적어줘.' });
  if (!amount) return res.status(400).json({ error: '후원 금액을 적어줘.' });
  const tier = getSupportTier(amount);
  if (!tier) return res.status(400).json({ error: '후원 자판기는 5,000원 이상부터 등급을 계산해.' });
  const rewards = supportRewards(tier);

  const row = await SupportRequest.create({
    userId,
    username: req.session?.discordUser?.globalName || req.session?.discordUser?.username || '',
    name,
    amount,
    memo,
    tierKey: tier.key,
    tierName: tier.name,
    rewards,
  });

  const ownerNotified = await sendOwnerSupportDm(row, tier);
  res.json({
    ok: true,
    id: row._id,
    status: 'pending',
    tier,
    rewards,
    ownerNotified,
    message: `${tier.emoji} ${tier.name} 등급으로 접수했어. 실제 입금 확인 뒤 자동 지급돼. 확인 실패면 서포트로 안내할게.`,
    donationUrl: DONATION_URL,
    donationAccount: DONATION_ACCOUNT,
    donationBankAccount: DONATION_BANK_ACCOUNT,
  });
});
app.get('/api/support/requests', async (req, res) => {
  if (!OWNER_USER_ID || req.session?.discordUser?.id !== OWNER_USER_ID) return res.status(403).json({ error: '운영자만 확인할 수 있어.' });
  const rows = await SupportRequest.find().sort({ createdAt: -1 }).limit(50).lean();
  res.json({ requests: rows });
});
app.post('/api/support/requests/:id/approve', async (req, res) => {
  if (!OWNER_USER_ID || req.session?.discordUser?.id !== OWNER_USER_ID) return res.status(403).json({ error: '운영자만 승인할 수 있어.' });
  const row = await SupportRequest.findById(req.params.id);
  if (!row) return res.status(404).json({ error: '후원 요청을 찾지 못했어.' });
  if (row.status === 'approved') return res.json({ ok: true, status: row.status, message: '이미 지급된 후원이야.' });
  const tier = supportTiers.find((item) => item.key === row.tierKey) || getSupportTier(row.amount);
  if (!tier || row.userId === 'guest') return res.status(400).json({ error: '로그인된 후원자만 자동 지급할 수 있어. 서포트에서 수동 확인해줘.' });
  const rewards = await grantSupportRewards(row.userId, tier);
  row.status = 'approved';
  row.tierKey = tier.key;
  row.tierName = tier.name;
  row.rewards = rewards;
  row.processedAt = new Date();
  await row.save();
  res.json({ ok: true, status: row.status, tier, rewards, message: `${tier.name} 지급 완료` });
});
app.post('/api/support/requests/:id/reject', async (req, res) => {
  if (!OWNER_USER_ID || req.session?.discordUser?.id !== OWNER_USER_ID) return res.status(403).json({ error: '운영자만 반려할 수 있어.' });
  const row = await SupportRequest.findByIdAndUpdate(req.params.id, { $set: { status: 'rejected', processedAt: new Date() } }, { new: true });
  if (!row) return res.status(404).json({ error: '후원 요청을 찾지 못했어.' });
  res.json({ ok: true, status: row.status, message: '입금 확인 실패. 관리자에게 문의해줘.' });
});

app.post('/api/games/slot', async (req, res) => { const userId = currentUserId(req); const bet = clampBet(req.body.bet); if (!userId) return res.status(400).json({ error: '로그인이 필요해.' }); const money = await ensureMoney(userId); if (toInt(money.money, 0) < bet) return res.status(400).json({ error: '금전 부족!' }); const emojis = ['🍒','🍋','🍇','🔔','💎','7️⃣','🍀','🍎','🍐','🍊']; const reels = [pick(emojis), pick(emojis), pick(emojis)]; let delta = -bet, result = '꽝'; if (reels[0] === reels[1] && reels[1] === reels[2]) { delta = reels[0] === '7️⃣' ? bet * 20 : bet * 10; result = reels[0] === '7️⃣' ? '슈퍼 잭팟' : '잭팟'; } else if (new Set(reels).size === 2) { delta = Math.floor(bet * 1.5); result = '당첨'; } const after = await addMoney(userId, delta); res.json({ game: 'slot', reels, result, delta, money: toInt(after.money, 0) }); });
app.post('/api/games/fishbun', async (req, res) => { const userId = currentUserId(req); const bet = clampBet(req.body.bet); if (!userId) return res.status(400).json({ error: '로그인이 필요해.' }); const money = await ensureMoney(userId); if (toInt(money.money, 0) < bet) return res.status(400).json({ error: '금전 부족!' }); const chance = Math.random() * 100; let item = '🔥 시꺼멓게 탄 붕어빵', delta = -bet, rarity = 'fail'; if (chance <= 0.5) { item = '✨ 전설의 황금 잉어빵'; delta = bet * (10 + Math.floor(Math.random() * 10)); rarity = 'legend'; } else if (chance <= 15.5) { item = '🍯 슈크림 대왕 붕어빵'; delta = Math.floor(bet * (1.5 + Math.random() * 4.5)); rarity = 'rare'; } else if (chance <= 40.5) { item = '🐟 클래식 팥 붕어빵'; delta = Math.floor(bet * (0.9 + Math.random() * 0.9)); rarity = 'normal'; } const after = await addMoney(userId, delta); res.json({ game: 'fishbun', item, rarity, delta, money: toInt(after.money, 0) }); });
app.post('/api/games/mine', async (req, res) => { const userId = currentUserId(req); const bet = clampBet(req.body.bet); if (!userId) return res.status(400).json({ error: '로그인이 필요해.' }); const money = await ensureMoney(userId); if (toInt(money.money, 0) < bet) return res.status(400).json({ error: '금전 부족!' }); const roll = Math.random(); let item = '🪨 평범한 돌멩이', delta = -bet; if (roll < 0.03) { item = '💎 전설의 다이아 광맥'; delta = bet * 12; } else if (roll < 0.18) { item = '🥇 황금 광맥'; delta = bet * 3; } else if (roll < 0.48) { item = '🪙 은빛 광석'; delta = Math.floor(bet * 1.2); } const after = await addMoney(userId, delta); res.json({ game: 'mine', item, delta, money: toInt(after.money, 0) }); });
app.post('/api/games/mole', async (req, res) => { const userId = currentUserId(req); const { difficulty = 'easy', score = 0 } = req.body; if (!userId) return res.status(400).json({ error: '로그인이 필요해.' }); const configs = { safety: 25, easy: 100, medium: 400, hard: 1600 }; const safeScore = Math.max(0, Math.min(500, toInt(score, 0))); const reward = safeScore * (configs[difficulty] || configs.easy); const after = await addMoney(userId, reward); res.json({ game: 'mole', difficulty, score: safeScore, delta: reward, money: toInt(after.money, 0) }); });
app.post('/api/games/fishing', async (req, res) => { const userId = currentUserId(req); if (!userId) return res.status(400).json({ error: '로그인이 필요해.' }); await ensureMoney(userId); let inv = await FishingInventory.findOne({ userId }); if (!inv) inv = await FishingInventory.create({ userId }); const timing = toInt(req.body?.timing, 0); const perfect = Boolean(req.body?.perfect); const struggleClicks = Math.max(0, Math.min(30, toInt(req.body?.struggleClicks, 0))); const badItems = ['끊어진 낚싯줄', '젖은 양말', '빈 깡통', '미끼만 사라진 찌', '축축한 나뭇가지']; const dudItems = ['놓친 물고기 그림자', '반짝이는 빈 조개', '살짝 무거운 물풀']; const chance = Math.random() * 100; let item = pick(badItems), field = '', reward = 0, result = '놓침'; if (!perfect || struggleClicks < 10) { if (chance < 45) { item = '찌를 놓쳤어'; result = '놓침'; reward = 0; } else { item = pick(badItems); field = 'curiousItem'; result = '잡동사니'; reward = 50; } } else if (chance <= 2) { item = '황금 물고기'; field = 'goldenFish'; reward = 100000; result = '대성공'; } else if (chance <= 6) { item = '괜찮은 황금 물고기'; field = 'decentGoldenFish'; reward = 20000; result = '희귀'; } else if (chance <= 26) { item = '중형 물고기'; field = 'mediumFish'; reward = 3000; result = '성공'; } else if (chance <= 66) { item = '일반 물고기'; field = 'regularFish'; reward = 800; result = '성공'; } else if (chance <= 84) { item = pick(dudItems); result = '아쉽다'; reward = 80; } else { item = '수상한 잡동사니'; field = 'curiousItem'; reward = 300; result = '잡동사니'; } if (field) { inv[field] += 1; await inv.save(); } await saveFishingCollection(userId, item); const after = await addMoney(userId, reward); res.json({ game: 'fishing', result, item, timing, struggleClicks, delta: reward, inventory: inv, money: toInt(after.money, 0) }); });
app.post('/api/games/anime-gacha', async (req, res) => { const userId = currentUserId(req); if (!userId) return res.status(400).json({ error: '로그인이 필요해.' }); const rollCount = Math.max(1, Math.min(10, toInt(req.body?.rollCount, 1))); const cost = 5000 * rollCount; const money = await ensureMoney(userId); if (toInt(money.money, 0) < cost) return res.status(400).json({ error: '금전이 부족해.' }); const results = Array.from({ length: rollCount }, rollAnimeGood); await saveAnimeGoods(userId, results); const best = results.find((item) => item.category === 'GOLDEN') || results.find((item) => item.category === 'JACKPOT') || results[0]; const bonus = results.reduce((sum, item) => sum + ({ GOLDEN: 50000, JACKPOT: 15000, MEDIUM: 4000, NORMAL: 800, FAIL: 0 }[item.category] || 0), 0); const delta = bonus - cost; const after = await addMoney(userId, delta); res.json({ game: 'anime-gacha', result: best.category, item: best.name, results, delta, money: toInt(after.money, 0) }); });
app.get('/rank-card/:guildId/:userId', async (req, res) => { const p = await getProfile(req.params.guildId, req.params.userId); const active = p.ownedTitles.find((t) => t.key === p.activeTitle); const badges = p.ownedBadges.slice(0, 8).map((b) => `${b.emoji} ${b.name}`).join(' · '); const displayName = escapeHtml(req.query.name || req.query.username || p.displayName || `NATSUMI-${String(p.userId).slice(-4)}`); const title = escapeHtml(active ? `${active.emoji} ${active.name}` : '🦊 NATSUMI PLAYER'); const badgeText = escapeHtml(badges || '뱃지 없음'); res.type('html').send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/game-enhance.css"><title>NATSUMI Rank Card</title></head><body class="card-only"><section class="rank-card web-rank-card"><div class="rank-glow"></div><div class="pixel-rank-grid"></div><div><p class="eyebrow">${title}</p><h1>${displayName}</h1><p>${badgeText} · 출석 ${p.attendance}회 · ${p.money.toLocaleString()} 금전</p></div><div class="level-badge">Lv.${p.level}</div><div class="stats"><div class="stat"><span>XP</span><b>${p.xp.toLocaleString()} / ${p.needed.toLocaleString()}</b></div><div class="stat"><span>ID</span><b>${escapeHtml(String(p.userId).slice(-6))}</b></div></div><div class="progress"><span style="width:${p.progress}%"></span></div><p>진행률 ${p.progress}%</p></section></body></html>`); });
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: '서버에서 문제가 생겼어.' }); });
mongoose.connect(process.env.MONGO_URI).then(async () => { await seedShop(); app.listen(PORT, () => console.log(`NATSUMI Game running on ${PORT}`)); }).catch((err) => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
