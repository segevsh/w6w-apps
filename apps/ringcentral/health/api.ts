import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Is the RingCentral Platform API answering at all?
 *
 * RingCentral publishes no machine-readable status feed (`health/service.ts`),
 * so reachability of the API host itself is the only out-of-band signal that
 * exists. Annotation, and why each axis is set the way it is:
 *
 *   - `kind: "dependency"`, not `"service"` — a narrower, honestly weaker claim
 *     than "the vendor has declared itself healthy". Filing it as `service`
 *     would overstate what one unsigned request from one host can know.
 *   - `scope: "app"` — `platform.ringcentral.com` is one shared host with no
 *     per-tenant subdomain, so the answer is identical for every Connection.
 *   - `credential: "none"` — `sign` must not run, and a probe that spends the
 *     very credential it is meant to monitor is a bad trade at any interval.
 *   - No `network.allow` — `platform.ringcentral.com` is already the app's own
 *     egress host; there is nothing to widen to.
 *
 * ## `GET /restapi`, unauthenticated, is designed to be public
 *
 * Unlike a typical API where an unsigned probe is *rejected* and the rejection
 * is the evidence (see `tidycal/health/api.ts`), RingCentral's API-discovery
 * root is documented as needing no auth at all (`operationId: readAPIVersions`,
 * no `security` override narrowing the global scheme, `x-throttling-group:
 * "NoThrottling"`) and answers a fixed, checkable shape. Measured live on
 * 2026-08-15:
 *
 *     GET https://platform.ringcentral.com/restapi
 *     200 application/json;charset=utf-8
 *     {"uri":"https://platform.ringcentral.com/restapi",
 *      "apiVersions":[{"uri":"…/restapi/v1.0","versionString":"1.0.60",
 *                      "releaseDate":"2024-09-05T00:00:00.000Z","uriString":"v1.0"}],
 *      "serverVersion":"26.3.1.10210249","serverRevision":"6b1ddbc8"}
 *
 * A 200 with no `apiVersions` entry, a non-JSON body, or a 5xx means the
 * platform itself is the problem. A transport failure surfaces as the hook
 * throwing.
 */
export const PROBE_URL = `${API_BASE}/restapi`;

interface ApiVersionsBody {
  apiVersions?: Array<{ versionString?: string; uriString?: string }>;
  serverVersion?: string;
}

const api: HealthCheckDefinition = {
  key: "api",
  title: "RingCentral API reachable",
  description:
    "Unauthenticated GET https://platform.ringcentral.com/restapi — a documented, public " +
    "API-discovery endpoint. A 200 carrying at least one apiVersions entry proves the platform " +
    "is serving. Credential validity is the derived auth:* checks' job.",
  kind: "dependency",
  scope: "app",
  credential: "none",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(PROBE_URL, { headers: { accept: "application/json" } });
    const text = await res.text();

    if (res.status >= 500) {
      return { state: "down", message: `platform.ringcentral.com returned HTTP ${res.status}` };
    }

    let body: ApiVersionsBody | null = null;
    try {
      body = JSON.parse(text) as ApiVersionsBody;
    } catch {
      return {
        state: "down",
        message: `platform.ringcentral.com/restapi returned a non-JSON body (HTTP ${res.status})`,
      };
    }

    if (res.ok && (body.apiVersions?.length ?? 0) > 0) {
      return {
        state: "ok",
        message: body.serverVersion ? `server ${body.serverVersion}` : undefined,
        ttlSeconds: 60,
      };
    }
    if (res.ok) {
      return {
        state: "down",
        message: "platform.ringcentral.com/restapi answered 200 with no apiVersions — the API " +
          "discovery endpoint no longer looks like RingCentral's",
      };
    }
    return { state: "unknown", message: `unexpected HTTP ${res.status} from an unsigned /restapi` };
  },
};

export default api;
