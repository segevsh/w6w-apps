/**
 * Is the Autotask REST API answering?
 *
 *   - `kind: "dependency"`, `scope: "app"` — it cannot know the tenant's zone, so it asks the
 *     un-numbered discovery host, which fronts the same service for every zone.
 *   - `credential: "none"` — `sign` must not run.
 *
 * **A schema-correct refusal is a PASS.** `GET /zoneInformation?user=` for a username Autotask
 * does not know answers `500 {"errors":["Zone information could not be determined"]}` (measured
 * 2026-10-06). That is the application answering in its own error envelope. The verdict comes
 * from the BODY: an `errors` array, or a `zoneName` document, passes; an HTML shell or a bare 5xx
 * from the edge is `down`. The status code alone would read this healthy 500 as an outage.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_PATH, DISCOVERY_HOST } from "../lib/client.ts";

export const PROBE_URL = `https://${DISCOVERY_HOST}${API_PATH}/zoneInformation?user=` +
  "w6w-health-probe%40example.invalid";

const api: HealthCheckDefinition = {
  key: "api",
  title: "REST API reachable",
  description: "Unauthenticated GET zoneInformation on webservices.autotask.net. Autotask's own " +
    '`{"errors": [...]}` envelope (even on a 500) proves the API tier is answering. ' +
    "Credential validity is the derived `auth:*` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [DISCOVERY_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text().catch(() => "");
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { state: "down", message: `non-JSON body (HTTP ${res.status})`, ttlSeconds: 120 };
    }
    const obj = payload as Record<string, unknown> | null;
    const isEnvelope = !!obj && typeof obj === "object" && Array.isArray(obj.errors);
    const isZone = !!obj && typeof obj === "object" && typeof obj.zoneName === "string";
    if (isEnvelope || isZone) {
      return { state: "ok", message: `HTTP ${res.status} — API is serving`, ttlSeconds: 120 };
    }
    if (res.status >= 500) {
      return { state: "down", message: `HTTP ${res.status} from the API`, ttlSeconds: 120 };
    }
    return { state: "unknown", message: `JSON body was not an Autotask response (${res.status})` };
  },
};

export default api;
