/**
 * Is 2Chat's API reachable? — an unsigned probe of the API itself.
 *
 * 2Chat publishes no status page: `status.2chat.co` does not resolve, and no other status
 * surface is linked from the site, the docs or the vendor's agent skills (searched 2026-10-06).
 * So the only honest "is the vendor up" signal is the API's own front door.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — "is the platform answering", a different question from "is this key
 *     live" (the derived `auth:api-key` check) and "is there quota left" (`quota`).
 *   - `scope: "app"` and `credential: "none"` (the defaults for this kind) — no Connection, no
 *     `sign`, so it reports before anyone has connected and costs nobody a credit.
 *   - The probe is `GET /open/info` with NO key. The gateway answers a schema-correct refusal:
 *     `403 {"detail":"Not authenticated"}` (measured 2026-10-06). That body — not the status code —
 *     is what proves the gateway and auth layer are alive, so it is a PASS: reachability is proven
 *     even though the call is "denied". A wrong-key probe answers `401 {"detail":"Invalid API
 *     Key"}`, the same family.
 *   - A 5xx, or a refusal in no recognisable shape (a CDN error page), is `down`: the API's own
 *     front door is not behaving. A transport failure is `down` too — the host is the API host,
 *     not a third-party status page, so being unable to reach it is the signal. Anything else is
 *     `unknown`, never a guess.
 *   - `severity` defaults to `degraded` for this kind, so a vendor wobble never hard-fails a
 *     target on its own.
 *
 * `api.p.2chat.io` is already on the app's `network.allow`; this check adds no host.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

const service: HealthCheckDefinition = {
  key: "service",
  title: "2Chat API reachability",
  description:
    "Unsigned GET /open/info. A schema-correct 'Not authenticated' / 'Invalid API Key' refusal proves the API gateway is up. 2Chat publishes no status page.",
  kind: "service",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/info`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach api.p.2chat.io: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    let body: { detail?: unknown; error?: unknown; error_message?: unknown } | undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = undefined;
    }
    const refusal = typeof body?.detail === "string" ||
      typeof body?.error_message === "string";

    if (res.status >= 500) {
      return { state: "down", message: `2Chat API answered ${res.status}`, ttlSeconds: 60 };
    }
    if ((res.status === 401 || res.status === 403) && refusal) {
      return { state: "ok", ttlSeconds: 60 };
    }
    if (res.status === 200) {
      // An unsigned call must never succeed; a 200 here is a shell or a proxy, not the API.
      return { state: "unknown", message: "unsigned probe unexpectedly returned 200" };
    }
    return {
      state: "unknown",
      message: `unsigned probe returned ${res.status} without a recognisable error body`,
    };
  },
};

export default service;
