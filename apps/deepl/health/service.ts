/**
 * Is DeepL up? — read from the JSON status feed behind DeepL's own status
 * page, the only structured, machine-readable surface the vendor exposes.
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "service"` — a different question from "is this credential
 *     live" (the derived `auth:*` check) or "is there quota left" (`quota`).
 *   - `scope: "app"` (the default for this kind) — the answer is identical
 *     for every Connection, so the host runs it once and shares the result.
 *   - `credential: "none"` (also the default) — no Connection is supplied
 *     and `sign` never runs, so this reports even before anyone has
 *     connected.
 *
 * DeepL's official status page, https://api-status.deepl.com/ (linked from
 * DeepL's own Help Center article "DeepL status page"), publishes status two
 * ways: an RSS feed at `/rss`, and the JSON document its own single-page app
 * fetches from `/api/status` to render the page. This check uses the JSON
 * endpoint, not the `feed:` (RSS) mechanism this pack's other Apps use
 * (Mistral), for a reason specific to DeepL: DeepL's RSS entries carry only
 * free-text incident prose with no resolved/open marker — every `<guid>` in
 * that feed is unique (one item per incident, not one per update the way
 * Mistral's feed works), so there is no structural way to fold updates onto
 * an incident or tell a resolved one from an open one without guessing at
 * phrases like "has been resolved" in the description body. The JSON
 * endpoint, by contrast, carries an explicit `status` field per incident
 * (`"resolved"`, ...) and an explicit `status` per datacenter
 * (`"operational"`, ...) — genuine machine-readable fields, which
 * `rfcs/healthcheck.md` is explicit that a check should read over inferring
 * a state from prose when a real field exists.
 *
 * The tradeoff: `/api/status` is not a documented, versioned contract in
 * developers.deepl.com the way `/v2/usage` is — it is the API DeepL's own
 * status frontend happens to call today, confirmed live and reachable
 * unauthenticated on DeepL's own status host on 2026-08-01. If it ever
 * changes shape, the guards below (non-2xx, non-JSON, missing/unrecognized
 * fields) report `unknown` rather than crash or assume the platform is up.
 *
 * `api-status.deepl.com` is declared only in this check's own `network`, not
 * in the App's `w6w.network.allow` — it is reachable from this hook alone,
 * never from an Action, and never signed (enforced host-side for any
 * `credential: "none" | "context"` check).
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "api-status.deepl.com";

interface DatacenterStatus {
  name: string;
  status: string;
}

interface IncidentStatus {
  id: string;
  title: string;
  status: string;
}

interface StatusResponse {
  overall: string;
  incidents: IncidentStatus[];
  datacenters: DatacenterStatus[];
}

/** Maps DeepL's status vocabulary onto our four states. Unrecognized -> `unknown`, never a guess. */
function mapState(token: string | undefined): HealthState {
  if (!token) return "unknown";
  const t = token.toLowerCase();
  if (t === "operational") return "ok";
  if (t.includes("outage") || t.includes("down")) return "down";
  if (t.includes("degraded") || t.includes("partial") || t.includes("maintenance")) {
    return "degraded";
  }
  return "unknown";
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "DeepL platform status",
  description:
    "Overall platform + per-datacenter status from DeepL's own status page backend, and any incident not marked resolved.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/status`);
    if (!res.ok) return { state: "unknown", message: `status API returned ${res.status}` };

    let body: StatusResponse;
    try {
      body = await res.json() as StatusResponse;
    } catch {
      return { state: "unknown", message: "status API response was not valid JSON" };
    }
    if (typeof body.overall !== "string") {
      return { state: "unknown", message: "status API response carried no `overall` field" };
    }

    const components: Record<string, HealthComponentReport> = {};
    const states: HealthState[] = [mapState(body.overall)];

    for (const dc of body.datacenters ?? []) {
      const state = mapState(dc.status);
      states.push(state);
      components[dc.name] = { state };
    }

    const open = (body.incidents ?? []).filter((i) => i.status?.toLowerCase() !== "resolved");
    if (open.length > 0) states.push("degraded");

    return {
      state: worstHealthState(states),
      ...(open.length > 0 ? { message: open.map((i) => i.title).join("; ") } : {}),
      ...(Object.keys(components).length > 0 ? { components } : {}),
      ttlSeconds: 300,
    };
  },
};

export default service;
