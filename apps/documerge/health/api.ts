import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, truncate } from "../lib/client.ts";
import { classifyTokenAnswer, PROBE_PATH } from "../auth/api-token.ts";

/**
 * Is `app.documerge.ai` serving the API? An UNSIGNED `GET /api/documents`: the schema-correct
 * Laravel refusal `{"message":"Unauthenticated."}` (401) proves the API is reachable, so it is
 * a pass here. Whether THIS connection's token is good is the derived `auth:api-token` check.
 */
const api: HealthCheckDefinition = {
  key: "api",
  kind: "dependency",
  scope: "app",
  credential: "none",
  title: "DocuMerge API reachable",
  description:
    "Calls GET /api/documents without a token and reads DocuMerge's own answer. The documented " +
    '401 "Unauthenticated." body proves the API is serving.',
  covers: ["*"],
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return {
        state: "down",
        message: `could not reach ${API_BASE}: ${String(err)}`,
        latencyMs: Date.now() - started,
      };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");
    const answer = classifyTokenAnswer(res.status, text);

    if (answer.kind === "accepted" || answer.kind === "unauthenticated") {
      return {
        state: "ok",
        message: `${API_BASE} answered ${res.status} with its documented body — the API is serving`,
        latencyMs,
      };
    }
    if (answer.kind === "rate-limited") {
      return { state: "degraded", message: `${API_BASE} answered 429 — rate-limited`, latencyMs };
    }
    if (res.status >= 500) {
      return { state: "down", message: `DocuMerge answered ${res.status}`, latencyMs };
    }
    if (/<html/i.test(text)) {
      return {
        state: "degraded",
        message: `something answered for ${API_BASE} with HTML — most likely a proxy, not the API`,
        latencyMs,
      };
    }
    return {
      state: "unknown",
      message: `DocuMerge answered ${res.status}${
        text.trim() ? ` with ${truncate(text.trim(), 160)}` : " with no body"
      }, which is neither the documented success shape nor its auth refusal`,
      latencyMs,
    };
  },
};

export default api;
