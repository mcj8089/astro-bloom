/**
 * DOMAIN LOCK
 * The game is licensed for local development and pipygames.com only.
 * Any other host finishes loading, shows a branded countdown, then redirects
 * to `redirectUrl` after exactly `redirectDelayMs` (3000 ms).
 */
export const DOMAINS = {
  enabled: true,
  allowedHosts: [
    "localhost",
    "127.0.0.1",
    "::1",
    "pipygames.com",
    "www.pipygames.com"
  ],
  redirectUrl: "https://pipygames.com",
  redirectDelayMs: 3000,
  /** The downloadable single-file build may be opened from disk for QA. */
  allowFileProtocol: true,
  allowIframe: true,
  debug: false
};

export default DOMAINS;
