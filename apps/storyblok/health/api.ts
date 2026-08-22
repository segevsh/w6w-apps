import type { HealthCheckDefinition } from "@w6w/types";
import {
  credentialKindOf,
  DELIVERY_HOSTS,
  describeError,
  MANAGEMENT_HOSTS,
  regionOf,
  spaceIdOf,
} from "../lib/client.ts";

/**
 * Is the API this connection uses answering, in the region this space lives in?
 *
 * ## Which API depends on the credential, and so does the probe
 *
 * A delivery connection is checked against `/v2/cdn/spaces/me`; a management
 * one against its space. Probing the wrong one would report an outage for an
 * API this connection never calls.
 *
 * ## Signed, because Storyblok has no unauthenticated endpoint
 *
 * Every path needs the credential, so this cannot fully separate "Storyblok is
 * down" from "the token was revoked". What it can do is name the third
 * possibility, which is the one people miss: **the space is in another
 * region**. A US space's token against the EU host returns exactly the same
 * bare `Unauthorized` as a wrong token, and no amount of re-issuing the token
 * fixes it.
 *
 * ## For a delivery connection, this also reports the cache version
 *
 * `/cdn/spaces/me` returns the space's `version`, which is the `cv` every
 * other delivery call should carry. Checking health and learning the number
 * that makes the next hour of requests twenty times cheaper is the same
 * request.
 */
const check: HealthCheckDefinition = {
  key: "api",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  title: "Storyblok API reachable",
  description:
    "Probes whichever API this connection uses — delivery or management — in the region its " +
    "space lives in. Signed, since Storyblok has no unauthenticated endpoint, so it names the " +
    "WRONG-REGION case, which returns the same bare `Unauthorized` as a wrong token.",
  covers: ["dependency", "credential"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: {
    allow: [
      "api.storyblok.com",
      "api-us.storyblok.com",
      "api-ca.storyblok.com",
      "api-ap.storyblok.com",
      "mapi.storyblok.com",
      "app.storyblokchina.cn",
    ],
  },

  async check(_input, ctx) {
    const kind = credentialKindOf(ctx.connection);
    const region = regionOf(ctx.connection);
    const spaceId = spaceIdOf(ctx.connection);

    const url = kind === "management"
      ? `${MANAGEMENT_HOSTS[region] ?? MANAGEMENT_HOSTS.eu}/v1/spaces/${
        encodeURIComponent(spaceId)
      }`
      : `${DELIVERY_HOSTS[region] ?? DELIVERY_HOSTS.eu}/v2/cdn/spaces/me`;

    if (kind === "management" && !spaceId) {
      return {
        state: "unknown",
        message: "this connection records no space id, so there is nothing to probe — reconnect " +
          "to set one",
      };
    }

    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${new URL(url).host}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");

    if (res.status === 401 || res.status === 403) {
      return {
        state: "down",
        message: `${describeError(res.status, text, kind)}. This connection is set to the ` +
          `${region} region — if the space lives elsewhere, the response is identical to a ` +
          "revoked token",
        latencyMs,
      };
    }
    if (res.status === 429) {
      return {
        state: "degraded",
        message: describeError(429, text, kind),
        latencyMs,
      };
    }
    if (!res.ok) {
      return {
        state: res.status >= 500 ? "down" : "degraded",
        message: describeError(res.status, text, kind),
        latencyMs,
      };
    }

    // For a delivery connection this response also carries the cache version.
    let detail = "";
    try {
      const body = JSON.parse(text) as { space?: { name?: string; version?: number } };
      const name = body?.space?.name;
      const version = body?.space?.version;
      detail = name ? ` — ${name}` : "";
      if (kind === "delivery" && version) {
        detail += `, cache version ${version}`;
      }
    } catch { /* a 200 is the answer either way */ }

    return {
      state: "ok",
      message: `the ${kind} API answered from ${region}${detail}`,
      latencyMs,
    };
  },
};

export default check;
