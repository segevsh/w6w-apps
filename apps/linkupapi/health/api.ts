import type { HealthCheckDefinition } from "@w6w/types";
import { API_HOST, parseEnvelope } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description:
    "Unauthenticated GET /v2/credits. LinkupAPI's JSON INVALID_API_KEY refusal passes: " +
    "it proves the application is answering.",
  kind: "dependency",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${API_HOST}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    const raw = await res.text().catch(() => "");
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from ${API_HOST}`, ttlSeconds: 120 };
    }
    const env = parseEnvelope(raw);
    if (env?.success === false && env.error?.code === "INVALID_API_KEY") {
      return {
        state: "ok",
        message: `${API_HOST} is serving (HTTP ${res.status} INVALID_API_KEY)`,
        ttlSeconds: 120,
      };
    }
    return {
      state: "unknown",
      message:
        `${API_HOST} answered HTTP ${res.status} with a body that is not LinkupAPI's refusal`,
    };
  },
};

export default api;
