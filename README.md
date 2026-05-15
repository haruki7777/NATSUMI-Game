# 🦊 NATSUMI Game

나츠미 디스코드 봇의 게임 데이터를 웹사이트에서 볼 수 있게 만든 게임 포털입니다.

## 들어간 기능

- 출석현황 보기
- 랭크 / XP / 금전 보기
- 웹 랭크카드 페이지
- 칭호 상점
- 프로필 뱃지 상점
- 보유 칭호 선택
- 후원 버튼 연결
- 간단한 동전 뒤집기 미니게임

## 기존 봇과 연동 방식

이 사이트는 `natsumi-bot-24-7`에서 쓰는 MongoDB 컬렉션을 그대로 읽습니다.

기존 봇 데이터 구조:

- `LevelSystem`: `GuildID`, `UserID`, `xp`, `level`
- `도박`: `userid`, `money`, `date`
- `출석체크`: `userid`, `count`, `date`

그래서 봇과 같은 `MONGO_URI`를 넣으면 바로 같은 데이터를 사용합니다.

## 설치

```bash
npm install
cp .env.example .env
npm start
```

## .env 설정

```env
PORT=3000
MONGO_URI=봇에서 쓰는 MongoDB 주소
DEFAULT_GUILD_ID=기본으로 보여줄 디스코드 서버 ID
DONATION_URL=후원 받을 실제 주소
SITE_TITLE=NATSUMI Game
```

`DONATION_URL`을 비워두면 후원 버튼은 숨겨집니다.

## 사용 방법

사이트 접속 후 서버 ID와 디스코드 유저 ID를 입력하면 프로필을 불러옵니다.

웹 랭크카드는 아래 주소로 접근할 수 있습니다.

```txt
/rank-card/서버ID/유저ID
```

예시:

```txt
https://너의도메인/rank-card/123456789012345678/987654321098765432
```

## 봇 랭크카드에서 웹 랭크카드 링크 쓰기

`commands/general/rank.js`에서 응답 content 또는 embed에 아래 링크를 추가하면 됩니다.

```js
const webRankUrl = `${process.env.GAME_SITE_URL}/rank-card/${guildId}/${target.id}`;
```

그리고 봇 `.env`에 추가:

```env
GAME_SITE_URL=https://너의게임사이트도메인
```

## 주의

현재 구매 API는 `userId`만 받는 MVP 버전입니다. 실제 공개 서비스로 열 경우 Discord OAuth 로그인과 관리자 검증을 붙이는 것이 좋습니다.

다음 단계 추천:

1. Discord OAuth 로그인 추가
2. 구매 내역 로그 추가
3. 미니게임 보상 DB 연동
4. 관리자 페이지 추가
5. 후원자 뱃지 자동 지급 처리
