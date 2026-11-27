import { DOMAINS } from "../../config/domains.config.js";

function normalize(host) {
  return String(host || "").toLowerCase().replace(/\.$/, "");
}

export function hostMatches(host, pattern) {
  const h = normalize(host);
  let p = normalize(pattern);
  if (!h || !p) return false;
  if (p.startsWith("*.")) p = p.slice(2);
  return h === p || h.endsWith("." + p);
}

/**
 * Domain licence guard. Allowed hosts run normally; every other host sees a
 * branded splash for exactly 3 seconds and is then redirected to pipygames.com.
 */
export class DomainGuard {
  constructor({ sdk = null, config = DOMAINS, ui = null } = {}) {
    this.sdk = sdk || (typeof window !== "undefined" ? window.GameSDK : null);
    this.config = config;
    this.ui = ui;
    this.result = null;
    this._timer = null;
  }

  inspect() {
    const protocol = location.protocol;
    const host = location.hostname;
    if (!this.config || !this.config.enabled) {
      this.result = { allowed: true, host, protocol, reason: "disabled" };
      return this.result;
    }
    if (protocol === "file:" && this.config.allowFileProtocol) {
      this.result = { allowed: true, host, protocol, reason: "file-allowed" };
      return this.result;
    }
    if (protocol === "file:" && !this.config.allowFileProtocol) {
      this.result = { allowed: false, host, protocol, reason: "file-blocked" };
      return this.result;
    }
    const allowed = (this.config.allowedHosts || []).some((pattern) =>
      hostMatches(host, pattern)
    );
    this.result = { allowed, host, protocol, reason: allowed ? "ok" : "host-not-allowed" };
    return this.result;
  }

  guard(callbacks = {}) {
    const result = this.inspect();
    if (result.allowed) return false;
    const host = "pipygames.com";
    const url = this.config.redirectUrl || "https://pipygames.com";
    const delay = Math.max(0, Number(this.config.redirectDelayMs) || 3000);
    if (callbacks.show) {
      callbacks.show({ host, url, delay, currentHost: result.host });
    }
    const started = Date.now();
    if (this.sdk && this.sdk.track) {
      this.sdk.track("domain_lock", { host: result.host, delay });
    }
    this._timer = window.setInterval(() => {
      const left = Math.max(0, delay - (Date.now() - started));
      if (callbacks.update) callbacks.update(left, delay);
      if (left <= 0) {
        window.clearInterval(this._timer);
        this.redirect(url);
      }
    }, 100);
    window.setTimeout(() => this.redirect(url), delay + 300);
    return true;
  }

  redirect(url) {
    if (!url) return;
    try {
      if (window.top && window.top !== window.self && !this.config.allowIframe) {
        window.top.location.href = url;
        return;
      }
    } catch (e) {
      /* cross-origin iframe */
    }
    location.replace(url);
  }
}

export default DomainGuard;
