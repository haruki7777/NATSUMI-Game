import 'dotenv/config';
import express from 'express';
import mongoose, { Schema, model } from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const DEFAULT_GUILD_ID = process.env.DEFAULT_GUILD_ID || '';
const DONATION_URL = process.env.DONATION_URL || '';

const calculateXP = (level) => level * level * 100;

const LevelSystem = model('LevelSystem', new Schema({ GuildID: String, UserID: String, xp: { type: Number, default: 0 }, level: { type: Number, default: 1 } }));
const Money = model('도박', new Schema({ userid: String, money: Number, date: Number }));
const Attendance = model('출석체크', new Schema({ userid: String, count: Number, date: Number }));

const Title = model('GameTitle', new Schema({ key: { type: String, unique: true }, name: String, description: String, price: Number, emoji: String }));
const Badge = model('GameBadge', new Schema({ key: { type: String, unique: true }, name: String, description: String, price: Number, emoji: String }));
const Inventory = model('GameInventory', new Schema({ userId: { type: String, index: true }, titles: [String], badges: [String], activeTitle: String }));

async function seedShop() {
  const titles = [
    { key: 'rookie_fox', name: '초보 여우', description: '아직은 귀엽게 봐줄 수 있는 신입.', price: 500, emoji: '🦊' },
    { key: 'daily_guardian', name: '출석 수호자', description: '출석 버튼을 지키는 성실한 녀석.', price: 1200, emoji: '📅' },
    { key: 'coin_collector', name: '동전 수집가', description: '작은 금전도 놓치지 않는 타입.', price: 1800, emoji: '🪙' },
    { key: 'night_gamer', name: '새벽의 지배자', description: '잠은 포기하고 랭크를 얻었다.', price: 2500, emoji: '🌙' },
    { key: 'rank_hunter', name: '랭크 사냥꾼', description: 'XP 냄새를 맡고 달려드는 사람.', price: 3000, emoji: '🎯' },
    { key: 'fox_master', name: '여우 조련사', description: '나츠미한테 살아남은 전설의 유저.', price: 3500, emoji: '🦊' },
    { key: 'lucky_tail', name: '행운의 꼬리', description: '이상하게 운이 따라붙는 녀석.', price: 4200, emoji: '🍀' },
    { key: 'mvp', name: 'MVP', description: '오늘의 주인공. 인정하기 싫지만 좀 멋짐.', price: 5000, emoji: '🏆' },
    { key: 'combo_star', name: '콤보 스타', description: '한 번 흐름 타면 멈추지 않는 별.', price: 5600, emoji: '🌟' },
    { key: 'boss_slayer', name: '보스 슬레이어', description: '강한 상대일수록 눈이 반짝인다.', price: 6200, emoji: '⚔️' },
    { key: 'guild_ace', name: '길드 에이스', description: '서버에서 은근히 존재감 있는 사람.', price: 7000, emoji: '🛡️' },
    { key: 'coin_whale', name: '금전왕', description: '주머니가 묵직한 수상한 사람.', price: 8000, emoji: '💰' },
    { key: 'chat_legend', name: '채팅 전설', description: '말이 많지만 이상하게 재밌다.', price: 8800, emoji: '💬' },
    { key: 'flame_heart', name: '불꽃 심장', description: '지는 건 싫어하는 뜨거운 타입.', price: 9400, emoji: '🔥' },
    { key: 'crystal_mind', name: '크리스탈 두뇌', description: '운보다 계산으로 이기는 사람.', price: 10200, emoji: '💎' },
    { key: 'shadow_runner', name: '그림자 질주자', description: '조용히 강해지는 은근한 실력자.', price: 11000, emoji: '🥷' },
    { key: 'sunrise_hero', name: '여명의 용사', description: '아침부터 랭크를 챙기는 무서운 사람.', price: 12500, emoji: '🌅' },
    { key: 'natsumi_favorite', name: '나츠미의 관심대상', description: '딱히 좋아하는 건 아니고, 그냥 보이는 거야.', price: 14000, emoji: '😼' },
    { key: 'mythic_player', name: '신화급 플레이어', description: '슬슬 서버 기록에 이름이 남을 수준.', price: 17000, emoji: '🐉' },
    { key: 'eternal_champion', name: '영원의 챔피언', description: '비싸다. 그래서 더 폼 난다.', price: 22000, emoji: '👑' }
  ];

  const badges = [
    { key: 'first_step', name: '첫 발자국', description: '나츠미 게임 사이트 입문자.', price: 300, emoji: '🐾' },
    { key: 'tiny_coin', name: '작은 동전', description: '시작은 작지만 반짝임은 진짜.', price: 500, emoji: '🪙' },
    { key: 'daily_soul', name: '출석혼', description: '출석을 꽤 진심으로 하는 편.', price: 900, emoji: '📅' },
    { key: 'sparkle', name: '반짝임', description: '프로필에 가벼운 광채를 더함.', price: 1100, emoji: '✨' },
    { key: 'fox_paw', name: '여우 발바닥', description: '도장처럼 찍히는 귀여운 흔적.', price: 1300, emoji: '🐾' },
    { key: 'hot_streak', name: '연승 불꽃', description: '기세가 오를 때 어울리는 뱃지.', price: 1700, emoji: '🔥' },
    { key: 'rank_spark', name: '랭크 스파크', description: '랭크 카드에 반짝임을 더함.', price: 2200, emoji: '⚡' },
    { key: 'moon_mark', name: '달빛 표식', description: '새벽 접속자에게 어울리는 감성.', price: 2600, emoji: '🌙' },
    { key: 'lucky_clover', name: '행운 클로버', description: '운빨도 실력이라고 우기는 사람용.', price: 3000, emoji: '🍀' },
    { key: 'gold_pouch', name: '황금 주머니', description: '금전 보유자 느낌을 내는 뱃지.', price: 3600, emoji: '👝' },
    { key: 'pink_heart', name: '핑크 하트', description: '귀여움으로 모든 걸 해결한다.', price: 4000, emoji: '💗' },
    { key: 'blue_star', name: '푸른 별', description: '차분하지만 확실히 눈에 띈다.', price: 4600, emoji: '🔷' },
    { key: 'crown_bit', name: '작은 왕관', description: '왕관은 작아도 자존심은 큼.', price: 5200, emoji: '👑' },
    { key: 'diamond_chip', name: '다이아 조각', description: '비싼 척하기 좋은 반짝이.', price: 6000, emoji: '💎' },
    { key: 'sword_mark', name: '검의 문장', description: '전투력 있어 보이고 싶은 날에.', price: 6800, emoji: '🗡️' },
    { key: 'shield_mark', name: '방패 문장', description: '믿음직한 유저처럼 보이게 해줌.', price: 7200, emoji: '🛡️' },
    { key: 'dragon_scale', name: '용의 비늘', description: '신화급 분위기를 살짝 얹는다.', price: 8500, emoji: '🐉' },
    { key: 'galaxy_core', name: '은하 코어', description: '프로필을 우주급으로 꾸미는 장식.', price: 10000, emoji: '🌌' },
    { key: 'supporter', name: '서포터', description: '후원자를 위한 표시용 뱃지.', price: 0, emoji: '💖' },
    { key: 'legend_stamp', name: '전설 인증', description: '비싸지만 이름값은 하는 최상급 뱃지.', price: 15000, emoji: '🏅' }
  ];

  await Promise.all(titles.map((item) => Title.updateOne({ key: item.key }, { $set: item }, { upsert: true })));
  await Promise.all(badges.map((item) => Badge.updateOne({ key: item.key }, { $set: item }, { upsert: true })));
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function getProfile(guildId, userId) {
  const [levelData, moneyData, attendanceData, inv, titles, badges] = await Promise.all([
    LevelSystem.findOne({ GuildID: guildId, UserID: userId }).lean(),
    Money.findOne({ userid: userId }).lean(),
    Attendance.findOne({ userid: userId }).lean(),
    Inventory.findOne({ userId }).lean(),
    Title.find().lean(),
    Badge.find().lean()
  ]);
  const level = toInt(levelData?.level, 1);
  const xp = toInt(levelData?.xp, 0);
  const needed = calculateXP(level);
  const ownedTitleMap = new Set(inv?.titles || []);
  const ownedBadgeMap = new Set(inv?.badges || []);
  return {
    guildId,
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

app.get('/api/config', (req, res) => {
  res.json({ siteTitle: process.env.SITE_TITLE || 'NATSUMI Game', defaultGuildId: DEFAULT_GUILD_ID, donationEnabled: Boolean(DONATION_URL), donationUrl: DONATION_URL });
});

app.get('/api/shop', async (req, res) => {
  const [titles, badges] = await Promise.all([Title.find().sort({ price: 1 }).lean(), Badge.find().sort({ price: 1 }).lean()]);
  res.json({ titles, badges });
});

app.get('/api/profile/:guildId/:userId', async (req, res) => {
  res.json(await getProfile(req.params.guildId, req.params.userId));
});

app.post('/api/buy', async (req, res) => {
  const { userId, itemType, key } = req.body;
  if (!userId || !['title', 'badge'].includes(itemType) || !key) return res.status(400).json({ error: 'userId, itemType, key가 필요해.' });

  const Item = itemType === 'title' ? Title : Badge;
  const item = await Item.findOne({ key }).lean();
  if (!item) return res.status(404).json({ error: '상점 아이템을 찾지 못했어.' });

  const moneyData = await Money.findOne({ userid: userId });
  const currentMoney = toInt(moneyData?.money, 0);
  if (currentMoney < item.price) return res.status(400).json({ error: `금전 부족! 필요 ${item.price}, 보유 ${currentMoney}` });

  const field = itemType === 'title' ? 'titles' : 'badges';
  const inv = await Inventory.findOne({ userId });
  if (inv?.[field]?.includes(key)) return res.status(400).json({ error: '이미 가지고 있는 아이템이야.' });

  await Money.updateOne({ userid: userId }, { $inc: { money: -item.price }, $set: { date: Date.now() } }, { upsert: true });
  await Inventory.updateOne({ userId }, { $addToSet: { [field]: key }, ...(itemType === 'title' ? { $setOnInsert: { activeTitle: key } } : {}) }, { upsert: true });
  res.json({ ok: true, message: `${item.emoji} ${item.name} 구매 완료!` });
});

app.post('/api/title/select', async (req, res) => {
  const { userId, key } = req.body;
  const inv = await Inventory.findOne({ userId });
  if (!inv?.titles?.includes(key)) return res.status(400).json({ error: '보유하지 않은 칭호야.' });
  await Inventory.updateOne({ userId }, { $set: { activeTitle: key } });
  res.json({ ok: true });
});

app.get('/rank-card/:guildId/:userId', async (req, res) => {
  const p = await getProfile(req.params.guildId, req.params.userId);
  const active = p.ownedTitles.find((t) => t.key === p.activeTitle);
  const badges = p.ownedBadges.slice(0, 5).map((b) => b.emoji).join(' ');
  res.type('html').send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>NATSUMI Rank Card</title></head><body class="card-only"><section class="rank-card"><div class="rank-glow"></div><div><p class="eyebrow">${active ? `${active.emoji} ${active.name}` : '🦊 NATSUMI PLAYER'}</p><h1>${p.userId}</h1><p>${badges || '뱃지 없음'} · 출석 ${p.attendance}회 · ${p.money.toLocaleString()} 금전</p></div><div class="level-badge">Lv.${p.level}</div><div class="progress"><span style="width:${p.progress}%"></span></div><p>${p.xp.toLocaleString()} / ${p.needed.toLocaleString()} XP (${p.progress}%)</p></section></body></html>`);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '서버에서 문제가 생겼어.' });
});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await seedShop();
  app.listen(PORT, () => console.log(`NATSUMI Game running on ${PORT}`));
}).catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  process.exit(1);
});
