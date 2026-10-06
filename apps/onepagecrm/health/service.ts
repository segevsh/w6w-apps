import type { HealthCheckDefinition } from "@w6w/types";
import { API_HOST } from "../lib/client.ts";

/**
 * Is OnePageCRM up? — the vendor's own uptime probe.
 *
 * OnePageCRM has no Statuspage/Instatus feed. https://developer.onepagecrm.com/status/ is a
 * custom page whose script loads `https://app.onepagecrm.com/status_check/<timestamp>.png` into
 * an `Image`: **a 1x1 PNG means "Up and running"**, a loaded image of any other size means "Down
 * for maintenance" (the app answered, but not normally), and a load error means "Unreachable".
 * (The page also embeds a Pingdom public report, which is HTML and not machine-readable.)
 *
 * This check reproduces exactly that logic, server-side: read the PNG's IHDR width (bytes 16-19,
 * big-endian). Facts verified 2026-10-06:
 *
 *   - `GET /status_check/` and `/status_check` are HTTP 404 HTML — only the `<anything>.png` form
 *     exists, which is why the vendor appends `Date.now()`.
 *   - `GET /status_check/1700000000000.png` -> 200 `image/png`, 1x1, `no-store`-style headers.
 *
 * It is an app-level probe of the application host, which also serves the API (`/api/v3`), so it
 * is the closest thing to an API status statement the vendor publishes — but it is not API-specific,
 * and the `api` check covers the API layer itself. No `network.allow` widening is needed: the host
 * is the API host already on the app's allowlist.
 */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width from a PNG's IHDR chunk, or `undefined` when the bytes are not a PNG. */
export function pngWidth(bytes: Uint8Array): number | undefined {
  if (bytes.length < 24) return undefined;
  for (let i = 0; i < PNG_MAGIC.length; i++) if (bytes[i] !== PNG_MAGIC[i]) return undefined;
  return ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "OnePageCRM platform status",
  description: `The vendor's own probe (developer.onepagecrm.com/status): the 1x1 PNG at ` +
    `https://${API_HOST}/status_check/<timestamp>.png. 1x1 = up; any other image = maintenance; ` +
    "no image = unreachable. Unauthenticated and unsigned.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${API_HOST}/status_check/${Date.now()}.png`);
    if (res.status >= 500) {
      return { state: "down", message: `status probe returned HTTP ${res.status}`, ttlSeconds: 60 };
    }
    if (!res.ok) {
      return { state: "unknown", message: `status probe returned HTTP ${res.status}` };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const width = pngWidth(bytes);
    if (width === undefined) {
      return {
        state: "degraded",
        message: "status probe answered with something other than the 1x1 PNG (maintenance?)",
        ttlSeconds: 60,
      };
    }
    if (width === 1) return { state: "ok", message: "Up and running", ttlSeconds: 60 };
    return {
      state: "degraded",
      message: "OnePageCRM answered, but not normally: the status image is not 1x1 (maintenance)",
      ttlSeconds: 60,
    };
  },
};

export default service;
