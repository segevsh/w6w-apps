/**
 * Is Azure DevOps up? — its own structured status API, per service and per
 * geography.
 *
 * ## This is not a Statuspage, and it is better
 *
 * Verified 2026-08-18: `status.dev.azure.com/_apis/status/health` answers
 *
 * ```json
 * {"lastUpdated":"…","status":{"health":"degraded","message":"Investigating a service disruption"},
 *  "services":[{"id":"Core services","geographies":[{"id":"EU","name":"Europe","health":"degraded"}, …]}, …]}
 * ```
 *
 * The services are `Core services`, `Boards`, `Repos`, `Pipelines`,
 * `Test Plans`, `Artifacts` and `Other services` — which map almost exactly
 * onto this app's subsystems. So the check reports each by name, and a
 * Pipelines outage with healthy Repos is reported as the partial answer it is
 * rather than flattened into one verdict.
 *
 * ## Health is per geography, and an organization lives in one
 *
 * Each service reports separately for US, CA, BR, EU, UK, APAC, AU and IN. A
 * disruption in Brazil is not an outage for a European organization.
 *
 * The connection does not know which geography its organization is hosted in —
 * Azure DevOps does not expose that on any endpoint this app calls — so the
 * check takes the **worst** state across geographies and **names the affected
 * ones** in the message.
 *
 * That is the honest reading rather than a comfortable one: it will
 * occasionally warn about a region you are not in, and because it says which,
 * the reader can dismiss it in a second. The alternative — picking a geography
 * and being quietly wrong about it — fails in the direction that matters.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.dev.azure.com";

/** Azure DevOps's health vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  healthy: "ok",
  advisory: "degraded",
  degraded: "degraded",
  unhealthy: "down",
};

/** The services this app actually calls. */
const USED = [/^core services$/i, /^repos$/i, /^pipelines$/i, /^boards$/i];

interface Service {
  id?: string;
  geographies?: Array<{ id?: string; name?: string; health?: string }>;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Azure DevOps platform status",
  description:
    "Repos, Pipelines, Boards and Core services, each reported by name. Health is per geography, " +
    "so an outage elsewhere is named rather than counted blindly.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/_apis/status/health`);
    // `unknown`, never `down`: a status endpoint that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status endpoint returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { status?: { health?: string; message?: string }; services?: Service[] }
      | null;
    if (!Array.isArray(body?.services)) {
      return { state: "unknown", message: "status endpoint returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];

    for (const svc of body.services) {
      const name = String(svc?.id ?? "");
      if (!USED.some((re) => re.test(name))) continue;

      const geos = svc.geographies ?? [];
      if (geos.length === 0) continue;

      const geoStates = geos.map((g) => STATES[String(g?.health ?? "")] ?? "unknown");
      const worst = worstHealthState(geoStates);
      const affected = geos
        .filter((g) => String(g?.health ?? "") !== "healthy")
        .map((g) => String(g?.id ?? ""))
        .filter(Boolean);

      components[slug(name)] = {
        state: worst,
        message: affected.length > 0 ? `affected: ${affected.join(", ")}` : "healthy",
      };
      states.push(worst);
      if (affected.length > 0) bad.push(`${name} in ${affected.join(", ")}`);
    }

    if (states.length === 0) {
      return {
        state: "unknown",
        message: "the status endpoint no longer names the services this app uses",
      };
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0 ? `${states.length} services healthy` : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
