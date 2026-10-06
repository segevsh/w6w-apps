/**
 * Is `actionnetwork.org/api/v2` answering? An unsigned reachability probe of the API Entry Point.
 *
 * Measured 2026-10-06: `GET https://actionnetwork.org/api/v2/` with no key answers 200
 * `application/hal+json` carrying `vendor_name: "Action Network"`, `osdi_version: "1.1.1"`,
 * `max_page_size: 25` and an `osdi:people` link. An unknown path or a missing key on any other
 * route answers a JSON `{"error": …}`, so an HTML body is never mistaken for the API. The AEP
 * accepts any key (or none), so it says nothing about a credential; that is `auth:api-key`'s job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

interface Aep {
  vendor_name?: string;
  osdi_version?: string;
  _links?: Record<string, unknown>;
}

const api: HealthCheckDefinition = {
  key: "api",
  title: "API reachability",
  description:
    "Unauthenticated GET of the public API entry point (/api/v2/). A 200 HAL document naming Action Network and linking osdi:people is the healthy answer; credential validity is the `auth:api-key` check's job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "degraded",
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${API_URL}/`, { headers: { accept: "application/hal+json" } });
    } catch (e) {
      return { state: "down", message: `could not reach actionnetwork.org: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: Aep | null = null;
    try {
      body = raw ? JSON.parse(raw) as Aep : null;
    } catch { /* a non-JSON body is itself the finding */ }

    if (res.ok) {
      const shaped = /action network/i.test(body?.vendor_name ?? "") &&
        Boolean(body?._links?.["osdi:people"]);
      return shaped
        ? {
          state: "ok",
          message: `API entry point answered (OSDI ${body?.osdi_version ?? "?"})`,
          ttlSeconds: 60,
        }
        : {
          state: "degraded",
          message: `${res.status} from the API entry point, but not the documented AEP document`,
        };
    }
    if (res.status >= 500) return { state: "down", message: `API returned ${res.status}` };
    return { state: "degraded", message: `API entry point returned an unexpected ${res.status}` };
  },
};

export default api;
