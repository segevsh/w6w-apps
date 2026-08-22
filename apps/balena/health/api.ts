import type { HealthCheckDefinition } from "@w6w/types";

const PING = "https://api.balena-cloud.com/ping";

/**
 * `GET /ping` — balena answers `OK`, unauthenticated.
 *
 * ## A liveness probe that needs no credential is unusual and worth using
 *
 * Most APIs in this pack force a choice: probe with a credential and be unable
 * to tell an outage from a revoked key, or trust a vendor status page that a
 * human updates minutes late. balena publishes an unauthenticated endpoint
 * that answers `OK` in plain text, so this check reads the API *itself* and
 * still cannot be confused by a credential problem.
 *
 * That makes it the more truthful of this app's two service checks: the
 * Statuspage says what balena has noticed, and this says whether the API is
 * answering right now.
 *
 * ## It does not speak for the VPN
 *
 * `/ping` is the API. The supervisor actions travel over Cloudlink, which can
 * be down while this is perfectly healthy — `health/service.ts` is what
 * reports that, and the two together are the whole picture.
 *
 * ## The response is text, not JSON
 *
 * Two bytes: `OK`. A check parsing it as JSON fails on a healthy API, which is
 * the sort of thing worth encoding once.
 */
const check: HealthCheckDefinition = {
  key: "api",
  kind: "dependency",
  scope: "app",
  credential: "none",
  title: "balena API reachable",
  description:
    "Probes balena's UNAUTHENTICATED `/ping`, which answers the plain text `OK` — so this reads " +
    "the API itself and still cannot be confused by a credential problem. It does not speak for " +
    "Cloudlink, which the supervisor actions need.",
  covers: ["dependency"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: { allow: ["api.balena-cloud.com"] },

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(PING, { headers: { accept: "*/*" } });
    } catch (err) {
      return { state: "down", message: `could not reach api.balena-cloud.com: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    // Two bytes of text. Parsing it as JSON fails on a healthy API.
    const body = (await res.text().catch(() => "")).trim();

    if (res.status >= 500) {
      return { state: "down", message: `the API answered ${res.status}`, latencyMs };
    }
    if (!res.ok) {
      return { state: "degraded", message: `the API answered ${res.status}`, latencyMs };
    }
    if (!/^OK$/i.test(body)) {
      return {
        state: "degraded",
        message: `/ping answered ${res.status} with ${JSON.stringify(body.slice(0, 40))} rather ` +
          "than `OK` — something is answering for the API that is not the API, most likely a " +
          "proxy or captive portal",
        latencyMs,
      };
    }

    return { state: "ok", message: `the API answered OK in ${latencyMs}ms`, latencyMs };
  },
};

export default check;
