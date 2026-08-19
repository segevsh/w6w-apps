import type { HealthCheckDefinition } from "@w6w/types";

const SUMMARY = "https://status.balena.io/api/v2/summary.json";

/** What the OData actions call. */
const API_COMPONENT = "API";
/** What the supervisor actions need, and nothing else does. */
const VPN_COMPONENT = "Cloudlink (VPN)";
/** Useful context when a release will not build or download. */
const BUILD_COMPONENTS = ["Application Builder", "Application Registry", "Delta Image Downloads"];

const RANK: Record<string, number> = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
};

/**
 * balena's Statuspage, read with the split that matters for this app.
 *
 * ## Half these actions need the API and half need the VPN
 *
 * `device-list`, `fleet-get`, `device-env-set` and the rest talk to
 * `api.balena-cloud.com`. The four supervisor actions — reboot, restart
 * services, identify, purge — travel over **Cloudlink**, balena's VPN, to the
 * device itself.
 *
 * Those fail independently. A Cloudlink outage leaves every read and every
 * configuration change working perfectly while no device can be reached; an
 * API outage stops the reads and would stop the supervisor calls too, since
 * the proxy is part of the API. So the check reports the pair and says which
 * actions each half covers.
 *
 * ## The builder is a third thing again
 *
 * `Application Builder`, `Application Registry` and `Delta Image Downloads`
 * are the release pipeline. When they are unhappy the fleet keeps running and
 * new releases cannot be built or pulled, which presents as a deployment that
 * never arrives rather than as an outage.
 *
 * ## balena publishes its cloud provider's components too
 *
 * The feed carries a dozen `AWS …` entries alongside balena's own. They are
 * upstream context, not balena's health, and reading the feed's worst
 * component would let a regional AWS notice read as a balena outage. This
 * check names the components it cares about.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "balenaCloud status",
  description:
    "Reads balena's Statuspage, weighting the API and reporting CLOUDLINK (the VPN) separately " +
    "— the four supervisor actions travel over the VPN and fail independently of everything " +
    "else. Names its components rather than taking the feed's worst, which includes AWS.",
  covers: ["service"],
  severity: "fatal",
  minIntervalSeconds: 60,
  network: { allow: ["status.balena.io"] },

  async check(_input, ctx) {
    const started = Date.now();
    let res: Response;
    try {
      res = await ctx.fetch(SUMMARY, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return { state: "unknown", message: `the status page answered ${res.status}`, latencyMs };
    }

    interface Summary {
      status?: { description?: string };
      components?: Array<{ name?: string; status?: string }>;
      incidents?: Array<{ name?: string }>;
    }
    let summary: Summary;
    try {
      summary = await res.json() as Summary;
    } catch {
      return { state: "unknown", message: "the status page did not return JSON", latencyMs };
    }

    const components = summary.components ?? [];
    const byName = (name: string) =>
      components.find((component) => component?.name === name)?.status;

    const api = byName(API_COMPONENT);
    if (!api) {
      return {
        state: "unknown",
        message: `the status page no longer lists a component named "${API_COMPONENT}" — it has ` +
          "probably been renamed, which is a check to fix rather than an outage",
        latencyMs,
      };
    }

    const vpn = byName(VPN_COMPONENT);
    const build = BUILD_COMPONENTS
      .map((name) => ({ name, status: byName(name) }))
      .filter((component) => component.status && component.status !== "operational");

    const notes: string[] = [];
    if (vpn && vpn !== "operational") {
      notes.push(
        `${VPN_COMPONENT} is ${vpn} — device-reboot, device-restart-services, device-identify ` +
          "and device-purge-data travel over it and will fail, while every read and " +
          "configuration change keeps working",
      );
    }
    if (build.length) {
      notes.push(
        `${build.map((c) => `${c.name} is ${c.status}`).join(" and ")} — the release pipeline, ` +
          "so a deployment may never arrive while the fleet itself carries on",
      );
    }
    const incident = (summary.incidents ?? [])[0]?.name;
    const suffix = incident ? ` (${incident})` : "";
    const note = notes.length ? `. ${notes.join(". ")}` : "";

    const rank = RANK[api] ?? 0;
    if (rank >= 3) {
      return { state: "down", message: `the API is ${api}${suffix}${note}`, latencyMs };
    }
    if (rank >= 1 || notes.length) {
      return {
        state: "degraded",
        message: `the API is ${api}${suffix}${note}`,
        latencyMs,
      };
    }

    return {
      state: "ok",
      message: summary.status?.description ?? "the API and Cloudlink are operational",
      latencyMs,
    };
  },
};

export default check;
