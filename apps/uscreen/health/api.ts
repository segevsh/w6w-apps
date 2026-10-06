/**
 * Is the Publisher API answering?
 *
 * `credential: "none"` — `sign` does not run. An unsigned `GET /email_topics` answers
 * `401 {"message":"Missing private API key"}` (measured 2026-10-06). That proves DNS, TLS and
 * the application's auth layer ran, so a JSON object carrying a string `message` is a PASS;
 * the verdict comes from the body, not the status code. An HTML page or edge shell is a real
 * failure, and 5xx is down. Credential validity is the derived `auth:api-key` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, errorText } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "Publisher API reachable",
  description: "Unauthenticated GET /publisher_api/v1/email_topics. A 401 carrying Uscreen's " +
    'JSON `{"message": …}` passes — it proves the API and its auth layer are answering.',
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/email_topics`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    if (errorText(payload) !== undefined || Array.isArray(payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Uscreen envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
