import { Router } from 'express';
import mongoose, { Schema, model } from 'mongoose';

const router = Router();
const HeartVerification = mongoose.models.HeartVerification || model('HeartVerification', new Schema({ userId: { type: String, index: true, unique: true }, status: { type: String, default: 'pending' }, checkedAt: { type: Date, default: Date.now }, source: { type: String, default: 'manual' } }));
const heartUrl = () => process.env.HANDIRI_HEART_URL || process.env.HEART_URL || 'https://c11.kr/natsumi';
const getUserId = (req) => req.session?.discordUser?.id || req.body?.userId || req.query?.userId || '';

export async function heartGate(req, res, next) {
  if (String(process.env.HEART_GATE_ENABLED || 'true') === 'false') return next();
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Discord 로그인 또는 userId가 필요해.', heartRequired: true, heartUrl: heartUrl() });
  const row = await HeartVerification.findOne({ userId }).lean();
  if (row?.status === 'verified') return next();
  return res.status(403).json({ error: '한디리 하트를 눌러야 게임에 참여할 수 있어.', heartRequired: true, heartUrl: heartUrl(), status: row?.status || 'none' });
}

router.get('/status', async (req, res) => {
  const userId = getUserId(req);
  const row = userId ? await HeartVerification.findOne({ userId }).lean() : null;
  res.json({ verified: row?.status === 'verified', status: row?.status || (userId ? 'none' : 'guest'), heartUrl: heartUrl() });
});

router.post('/claim', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(400).json({ error: 'Discord 로그인 또는 userId가 필요해.' });
  await HeartVerification.updateOne({ userId }, { $set: { status: 'pending', checkedAt: new Date(), source: 'claim' } }, { upsert: true });
  res.json({ ok: true, status: 'pending', message: '하트 인증 신청 완료! 운영자가 확인하면 게임 참여가 열려.' });
});

router.post('/admin/approve', async (req, res) => {
  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  if (!process.env.ADMIN_KEY || adminKey !== process.env.ADMIN_KEY) return res.status(401).json({ error: '관리자 키가 필요해.' });
  if (!req.body?.userId) return res.status(400).json({ error: 'userId가 필요해.' });
  await HeartVerification.updateOne({ userId: req.body.userId }, { $set: { status: 'verified', checkedAt: new Date(), source: 'admin' } }, { upsert: true });
  res.json({ ok: true, userId: req.body.userId, status: 'verified' });
});

export default router;
