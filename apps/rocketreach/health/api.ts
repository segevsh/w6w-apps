/**
 * Is the RocketReach API answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned `GET /account/`.
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06: with no key the
 * endpoint answers `401 {"detail":"Anonymous requests are not allowed. Please use
 * the test API key.","error_code":"authentication_failed"}`, which proves the
 * application itself is serving. The verdict reads the body (`error_code`), not
 * the status alone, so a 401 from an unrelated proxy is `unknown`. A 5xx is
 * `down`; transport failure surfaces as the hook throwing. Credential validity
 * is the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorCode } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /account/. RocketReach's JSON `authentication_failed` " +
    "refusal passes: it proves the application is answering.",
  kind: "dependency",
  scope: "connection",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/account/`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return {
        state: "down",
        message: `HTTP ${res.status} from api.rocketreach.co`,
        ttlSeconds: 120,
      };
    }
    if (res.ok || (res.status === 401 && errorCode(text) === "authentication_failed")) {
      return {
        state: "ok",
        message: `api.rocketreach.co is serving (HTTP ${res.status})`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `api.rocketreach.co answered HTTP ${res.status} with a body that is not RocketReach's refusal`,
    };
  },
};

export default api;
