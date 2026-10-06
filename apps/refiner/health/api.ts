import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, truncate } from "../lib/client.ts";
import { classifyKeyAnswer, PROBE_PATH } from "../auth/api-key.ts";

/**
 * Is `api.refiner.io` serving? Calls the vendor's own verify endpoint and reads
 * its answer from the BODY. A schema-correct auth refusal (`No API key found in
 * headers`, `API key does not look valid`, `API key not valid or does not
 * exist`) proves the API is reachable, so it is a pass here; the credential's own
 * verdict belongs to the derived `auth:api-key` check.
 */
const api: HealthCheckDefinition = {
  key: "api",
  kind: "service",
  scope: "connection",
  credential: "signed",
  title: "Refiner API reachable",
  description:
    "Calls GET /v1/ and reads Refiner's own auth answer. Any schema-correct answer, including " +
    "its three key-refusal messages, proves the API is serving.",
  covers: ["*"],
  severity: "fatal",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
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
    const answer = classifyKeyAnswer(res.status, text);

    switch (answer.kind) {
      case "accepted":
        return { state: "ok", message: `${API_BASE} accepted this connection's key`, latencyMs };
      case "key-missing":
      case "key-malformed":
      case "key-unknown":
        return {
          state: "ok",
          message: `${API_BASE} answered ${res.status} "${answer.detail}" — the vendor is ` +
            "reachable (that is Refiner's own auth answer), but this connection's credential is " +
            "the problem. The derived auth:api-key check reports it; reconnect to fix it.",
          latencyMs,
        };
      case "rate-limited":
        return {
          state: "degraded",
          message: `${API_BASE} answered 429 — reachable, but this key is being rate-limited`,
          latencyMs,
        };
      default:
        break;
    }

    if (res.status >= 500) {
      return { state: "down", message: `Refiner answered ${res.status}`, latencyMs };
    }
    if (/<html/i.test(text)) {
      return {
        state: "degraded",
        message: `something answered for ${API_BASE} with HTML — most likely a proxy rather ` +
          "than the API",
        latencyMs,
      };
    }
    return {
      state: "unknown",
      message: `Refiner answered ${res.status}${
        text.trim() ? ` with ${truncate(text.trim(), 160)}` : " with no body"
      }, which is neither the documented success shape nor one of its key refusals`,
      latencyMs,
    };
  },
};

export default api;
