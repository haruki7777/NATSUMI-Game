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
    { key: 'mvp', name: 'MVP', description: '오늘의 주인공. 인정하기 싫지만 좀 멋짐.', price: 5000, emoji: '🏆' },
    { key: 'fox_master', name: '여우 조련사', description: '나츠미한테 살아남은 전설의 유저.', price: 3500, emoji: '🦊' },
    { key: 'night_gamer', name: '새벽의 지배자', description: '잠은 포기하고 랭크를 얻었다.', price: 2500, emoji: '🌙' },
    { key: 'coin_whale', name: '금전왕', description: '주머니가 묵직한 수상한 사람.', price: 8000, emoji: '💰' }
  ];
  const badges = [
    { key: 'first_step', name: '첫 발자국', description: '나츠미 게임 사이트 입문자.', price: 700, emoji: '🐾' },
    { key: 'daily_soul', name: '출석혼', description: '출석을 꽤 진심으로 하는 편.', price: 1500, emoji: '📅' },
    { key: 'rank_spark', name: '랭크 스파크', description: '랭크 카드에 반짝임을 더함.', price: 2200, emoji: '✨' },
    { key: 'supporter', name: '서포터', description: '후원자를 위한 표시용 뱃지.', price: 0, emoji: '💖' }
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
