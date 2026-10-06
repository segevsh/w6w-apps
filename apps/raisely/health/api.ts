/**
 * Is the Raisely API answering?
 *
 * An UNSIGNED `GET /v3/campaigns?private=true&limit=1` answers
 * `403 {"code":"forbidden","detail":"You are not authorized to do that", ...}` (measured
 * 2026-10-06) — a schema-correct auth refusal, which proves DNS, TLS and Raisely's own auth layer
 * ran, so it is a PASS. The verdict is taken from the BODY (a JSON object with a string `code`
 * and `detail`), not the status; an HTML shell or any other body is a failure. Credential
 * validity is the derived `auth:*` check's job; `credential: "none"` means `sign` never runs.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, parseError } from "../lib/client.ts";

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachable",
  description: "Unauthenticated GET api.raisely.com/v3/campaigns. Raisely's JSON `forbidden` / " +
    "`unauthorized` refusal passes — it proves the API and its auth layer are answering.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/campaigns?private=true&limit=1`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text();
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `endpoint returned a non-JSON body (HTTP ${res.status})` };
    }
    const { code, detail } = parseError(text);
    if ((code && detail) || (payload && typeof payload === "object" && "data" in payload)) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    return {
      state: "unknown",
      message: `JSON body was not a Raisely envelope (HTTP ${res.status})`,
    };
  },
};

export default api;
