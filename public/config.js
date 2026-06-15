(() => {
  const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "45.13.236.245" ||
    location.port === "25772";
  const isWorker = location.hostname.endsWith(".workers.dev");
  const gameOrigin = isLocal || isWorker
    ? location.origin
    : "https://natsumi-game-proxy.necoharuki.workers.dev";

  window.NATSUMI_CONFIG = {
    API_BASE: gameOrigin,
    API_FALLBACK_BASE: gameOrigin,
    DASHBOARD_URL: "https://natsumi-dashboard-proxy.necoharuki.workers.dev/",
    DEFAULT_GUILD_ID: "",
    DONATION_URL: "https://qr.kakaopay.com/Fa7OA44AL",
    DONATION_ACCOUNT: "KakaoPay",
    DONATION_BANK_ACCOUNT: "IBK 08706196201017",
  };
})();
