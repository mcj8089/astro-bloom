import { ADS } from "../../config/ads.config.js";

/**
 * Thin façade over GameSDK.ads with a local mock fallback. The rest of the
 * game only talks to this service, so swapping networks never touches gameplay.
 */
export class AdService {
  constructor(sdk = null, config = ADS) {
    this.sdk = sdk;
    this.config = config;
    this.overlay = null;
    this.hooks = { onStart: null, onEnd: null };
    this.lastResult = null;
  }

  get enabled() {
    return Boolean(this.config.enabled);
  }

  get provider() {
    return this.config.provider || "none";
  }

  bindOverlay(overlay) {
    this.overlay = overlay || null;
    if (this.sdk && this.sdk.ads && this.sdk.ads.bindOverlay && this.overlay) {
      this.sdk.ads.bindOverlay({
        show: (options) => {
          if (this.hooks.onStart) this.hooks.onStart(options.placement);
          const promise = this.overlay.show(options);
          Promise.resolve(promise).then((ok) => {
            options.resolve(Boolean(ok));
            if (this.hooks.onEnd) this.hooks.onEnd(options.placement, ok);
          });
        }
      });
    }
  }

  setHooks(hooks) {
    this.hooks = { ...this.hooks, ...(hooks || {}) };
  }

  canShow(name) {
    if (!this.enabled) return false;
    if (this.sdk && this.sdk.ads) return this.sdk.ads.canShow(name);
    const placement = this.config.placements[name];
    return Boolean(placement && placement.enabled);
  }

  async showRewarded(name) {
    if (!this.enabled) return false;
    if (this.sdk && this.sdk.ads) {
      const ok = await this.sdk.ads.showRewarded(name);
      this.lastResult = ok;
      return ok;
    }
    return this._local(name, "rewarded");
  }

  async showInterstitial(name, ctx = {}) {
    if (!this.enabled) return false;
    if (this.sdk && this.sdk.ads) {
      const ok = await this.sdk.ads.showInterstitial(name, ctx);
      this.lastResult = ok;
      return ok;
    }
    return this._local(name, "interstitial");
  }

  _local(name, format) {
    return new Promise((resolve) => {
      if (!this.overlay) {
        resolve(false);
        return;
      }
      if (this.hooks.onStart) this.hooks.onStart(name);
      this.overlay.show({
        placement: name,
        format,
        duration: 1600,
        text: this.config.mockText,
        rewardText: this.config.rewardText,
        resolve: (ok) => {
          if (this.hooks.onEnd) this.hooks.onEnd(name, ok);
          resolve(Boolean(ok));
        }
      });
    });
  }
}

export default AdService;
