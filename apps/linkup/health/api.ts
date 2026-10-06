/**
 * Is the Linkup API host answering?
 *
 * `kind: "dependency"`, `credential: "none"` — an unsigned probe spends nobody's credential. It
 * calls `GET /v1/credits/balance` with no key.
 *
 * **A schema-correct auth error is a PASS.** Measured 2026-10-06: the call answers
 * `401 {"statusCode":401,"error":{"code":"UNAUTHORIZED",...}}` from the application (Express,
 * behind Google's load balancer). That proves the API is serving, so the verdict is read from the
 * BODY's `error.code`, not the status. A 5xx is `down`; a 401 whose body is not Linkup's shape
 * is `unknown`; transport failure surfaces as the hook throwing. Credential validity is the
 * derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorCode } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET /v1/credits/balance. Linkup's JSON `UNAUTHORIZED` refusal " +
    "passes: it proves the application is answering.",
  kind: "dependency",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/v1/credits/balance`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from api.linkup.so`, ttlSeconds: 120 };
    }
    if (res.status === 401 && errorCode(text) === "UNAUTHORIZED") {
      return { state: "ok", message: "api.linkup.so is serving (HTTP 401)", ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `api.linkup.so answered HTTP ${res.status} with a body that is not Linkup's refusal`,
    };
  },
};

export default api;
