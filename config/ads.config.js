/**
 * AD SDK PRESET
 * -----------------
 * Ads are fully wired through the shared GameSDK. To go live:
 *   1. set `enabled: true`;
 *   2. pick a provider ("poki" | "crazygames" | "custom" | "mock");
 *   3. paste the placement ids from your ad account;
 *   4. flip the channel switch for that network.
 * No gameplay code changes are required.
 */
export const ADS = {
  enabled: false,              // ship disabled until an account is connected
  provider: "mock",            // none | mock | poki | crazygames | custom
  testMode: true,
  debug: false,

  /** Master channel switches, editable per deployment. */
  channels: {
    poki: false,
    crazygames: false,
    googleAdMob: false,
    appLovin: false,
    custom: true
  },

  global: {
    pauseGameDuringAd: true,
    muteAudioDuringAd: true,
    fillTimeoutMs: 9000,
    simulateMs: 1600,
    /** global frequency guard */
    minIntervalMs: 30000,
    maxPerSession: 12
  },

  placements: {
    // rewarded video — revive once per run
    revive: {
      format: "rewarded",
      id: "",
      enabled: true,
      labelKey: "ads.revive",
      maxPerRun: 1,
      cooldownMs: 0,
      sdk: ""
    },
    // rewarded video — double the stardust on the results screen
    doubleStardust: {
      format: "rewarded",
      id: "",
      enabled: true,
      labelKey: "ads.double",
      maxPerRun: 1,
      cooldownMs: 0,
      sdk: ""
    },
    // interstitial after a cleared level
    stageClear: {
      format: "interstitial",
      id: "",
      enabled: true,
      labelKey: "ads.stageClear",
      everyNLevels: 3,
      cooldownMs: 45000,
      sdk: ""
    },
    // interstitial on game over (kept off by default)
    gameOver: {
      format: "interstitial",
      id: "",
      enabled: false,
      labelKey: "ads.gameOver",
      everyNPlays: 2,
      cooldownMs: 60000,
      sdk: ""
    }
  },

  providerConfig: {
    poki: { sdkUrl: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js", gameId: "" },
    crazygames: { sdkUrl: "https://sdk.crazygames.com/crazygames-sdk-v3.js" },
    googleAdMob: { appId: "", bannerId: "", interstitialId: "", rewardedId: "" },
    appLovin: { sdkKey: "", rewardedId: "", interstitialId: "" },
    custom: { scriptUrl: "", adapterGlobal: "GameAdAdapter" }
  },

  /** Copy shown by the local mock overlay. */
  mockText: "Sponsored bloom · demo placement",
  rewardText: "Reward granted"
};

export default ADS;
