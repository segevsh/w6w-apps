/**
 * Is the Brandfetch API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /v2/viewer`.
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no
 * credential the endpoint answers `401 {"message":"Unauthorized","agentAccess":{…}}`,
 * which proves the application itself is serving. The verdict is read from the
 * body (`message` is `Unauthorized`), not from the status alone, so a 401 from an
 * unrelated proxy is `unknown`. A 5xx is `down`; transport failure surfaces as
 * the hook throwing. Credential validity is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v2/viewer. Brandfetch's JSON `Unauthorized` refusal passes: " +
    "it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/v2/viewer`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from api.brandfetch.io`,
        ttlSeconds: 120,
      };
    }
    if (res.ok || (res.status === 401 && /^unauthorized$/i.test(errorText(text)))) {
      return {
        state: "ok",
        message: `api.brandfetch.io is serving (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `api.brandfetch.io answered HTTP ${res.status} with a body that is not Brandfetch's refusal`,
    };
  },
};

export default api;
