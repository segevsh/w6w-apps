/**
 * Is this connection's regional API host answering?
 *
 * `kind: "dependency"`, `scope: "connection"`, `credential: "none"` — an unsigned
 * probe spends nobody's credential. It calls `GET /active?token=w6w-health-probe`
 * on the region's host with a deliberately bogus token.
 *
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06 on all three
 * hosts: a bogus token is refused by the APPLICATION with a plain-text
 * `Invalid API key. Please check your API key and try again. (requestId: …)`
 * and a `Server: browserless` header, whereas a request with no token at all is
 * refused by the edge (openresty) with an HTML 401 — which would prove only that
 * the load balancer is up. So the verdict is read from the BODY: the vendor's own
 * sentence passes; an HTML page does not. A 5xx is `down`; transport failure
 * surfaces as the hook throwing. Credential validity is the derived `auth:*`
 * check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { HOSTS, regionFromConnection } from "../lib/client.ts";

export const PROBE_TOKEN = "w6w-health-probe";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Regional API reachable",
  description: "Unauthenticated GET /active on this connection's regional host with a bogus " +
    "token. Browserless's plain-text `Invalid API key` refusal passes — it proves the " +
    "application itself is answering, which the edge's HTML 401 would not.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const host = HOSTS[regionFromConnection(ctx.connection)];
    const res = await ctx.fetch(`https://${host}/active?token=${PROBE_TOKEN}`);
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from ${host}`, ttlSeconds: 120 };
    }
    if (res.status === 204 || (res.ok && text === "")) {
      return { state: "ok", message: `${host} is serving`, ttlSeconds: 120 };
    }
    if (res.status === 401 && /^invalid api key/i.test(text.trim())) {
      return { state: "ok", message: `${host} is serving (HTTP 401)`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `${host} answered HTTP ${res.status} with a body that is not Browserless's refusal`,
    };
  },
};

export default api;
