window.NATSUMI_CONFIG = {
  API_BASE: location.hostname === "localhost" || location.hostname === "45.13.236.245" || location.port === "25772"
    ? location.origin
    : "http://natsumi-game.kro.kr",
  API_FALLBACK_BASE: "http://natsumi-game.kro.kr",
  DEFAULT_GUILD_ID: "",
  DONATION_URL: "https://qr.kakaopay.com/Fa7OA44AL",
  DONATION_ACCOUNT: "카카오페이 송금",
  DONATION_BANK_ACCOUNT: "IBK기업은행 08706196201017"
};
