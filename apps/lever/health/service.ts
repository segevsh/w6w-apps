import type { HealthCheckDefinition } from "@w6w/types";
import { dataCenterFromConnection } from "../lib/client.ts";

const SUMMARY = "https://status.lever.co/api/v2/summary.json";

/** What this app actually calls, in each data centre. */
const API_COMPONENT = "Integration API & Webhooks";
/** The product itself — recruiters cannot work if this is down. */
const APP_COMPONENT = "Hire";

const RANK: Record<string, number> = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
};

/**
 * Lever's Statuspage — where a component is only identifiable as
 * (data centre, name).
 *
 * ## Every component name appears twice
 *
 * Lever runs a **Global** and an **EU** data centre, and its status page lists
 * the same components under each: two "Integration API & Webhooks", two
 * "Hire", two "Career Site". Measured on 2026-08-19, 41 components with
 * duplicated names across seven groups.
 *
 * An account lives in exactly one of those data centres, so taking the worst
 * of the two — or the first match by name — reports an EU incident to a global
 * customer and vice versa. This check resolves through `group_id` and reads
 * the row for the data centre the connection names.
 *
 * ## The API and the product fail separately
 *
 * "Integration API & Webhooks" is what this app calls; "Hire" is what
 * recruiters use. An API outage stops a workflow while everybody carries on
 * interviewing, and a Hire outage is the reverse. Both are reported, and only
 * the first decides this check's state.
 *
 * ## Most of the feed is somebody else's software
 *
 * Two whole groups are partner and third-party dependencies — Slack, Zoom,
 * background-check vendors, LinkedIn. They matter to a recruiter and say
 * nothing about this API, which is why this check names its components rather
 * than reading the page's overall indicator.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "connection",
  credential: "none",
  title: "Lever status",
  description:
    "Reads Lever's Statuspage for the DATA CENTRE this connection names — every component " +
    "appears twice, once per data centre, so a name match alone reports another region's " +
    "incident. Weights the API component, and reports the product separately.",
  covers: ["service"],
  severity: "fatal",
  minIntervalSeconds: 120,
  network: { allow: ["status.lever.co"] },

  async check(_input, ctx) {
    const dataCenter = dataCenterFromConnection(ctx.connection);
    const groupName = dataCenter === "eu"
      ? "EU Data Center - LeverTRM"
      : "Global Data Center - LeverTRM";

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

    interface Component {
      id?: string;
      name?: string;
      status?: string;
      group?: boolean;
      group_id?: string | null;
    }
    interface Summary {
      components?: Component[];
      incidents?: Array<{ name?: string }>;
    }
    let summary: Summary;
    try {
      summary = await res.json() as Summary;
    } catch {
      return { state: "unknown", message: "the status page did not return JSON", latencyMs };
    }

    const components = summary.components ?? [];
    // Names repeat across data centres; only (group, name) identifies a row.
    const group = components.find((component) =>
      component?.group === true && component?.name === groupName
    );
    if (!group?.id) {
      return {
        state: "unknown",
        message: `the status page no longer has a group called "${groupName}" — Lever has ` +
          "renamed or restructured it, which is a check to fix rather than an outage",
        latencyMs,
      };
    }

    const inGroup = (name: string) =>
      components.find((component) => component?.group_id === group.id && component?.name === name)
        ?.status;

    const api = inGroup(API_COMPONENT);
    if (!api) {
      return {
        state: "unknown",
        message: `no "${API_COMPONENT}" component under ${groupName} — the feed has been ` +
          "restructured",
        latencyMs,
      };
    }

    const product = inGroup(APP_COMPONENT);
    const productNote = product && product !== "operational"
      ? `. Separately, ${APP_COMPONENT} is ${product} — recruiters cannot work, while this API ` +
        "may be fine"
      : "";
    const incident = (summary.incidents ?? [])[0]?.name;
    const suffix = incident ? ` (${incident})` : "";
    const rank = RANK[api] ?? 0;

    if (rank >= 3) {
      return {
        state: "down",
        message:
          `${API_COMPONENT} is ${api} in the ${dataCenter} data centre${suffix}${productNote}`,
        latencyMs,
      };
    }
    if (rank >= 1 || productNote) {
      return {
        state: "degraded",
        message:
          `${API_COMPONENT} is ${api} in the ${dataCenter} data centre${suffix}${productNote}`,
        latencyMs,
      };
    }

    return {
      state: "ok",
      message:
        `${API_COMPONENT} and ${APP_COMPONENT} are operational in the ${dataCenter} data centre`,
      latencyMs,
    };
  },
};

export default check;
