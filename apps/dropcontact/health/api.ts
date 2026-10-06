/**
 * Is the Dropcontact API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `POST /v1/enrich/all` with an empty
 * contact. **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no token the
 * host answers `401 {"error":true,"reason":"No api key received. Please set 'X-Access-Token'
 * header with your api key as value.","success":false}`, which proves the application itself is
 * serving (and nothing is enqueued or charged, because the call is refused first). The verdict
 * is read from the body, not the status, so a 401 from an unrelated proxy is `unknown`. A 5xx
 * (or the documented 524 timeout) is `down`. Credential validity is the derived `auth:*` check.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, ENRICH_PATH, parseEnvelope } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated POST /v1/enrich/all. Dropcontact's JSON `No api key received` " +
    "refusal passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${ENRICH_PATH}`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ data: [{}] }),
    });
    const body = parseEnvelope(await res.text().catch(() => ""));
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from api.dropcontact.com`,
        ttlSeconds: 120,
      };
    }
    if (
      res.status === 401 && body.error === true && body.success === false &&
      /api key/i.test(body.reason ?? "")
    ) {
      return {
        state: "ok",
        message: "api.dropcontact.com is serving (HTTP 401 refusal)",
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `api.dropcontact.com answered HTTP ${res.status} with a body that is not Dropcontact's refusal`,
    };
  },
};

export default api;
