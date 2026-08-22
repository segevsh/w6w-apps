import type { HealthCheckDefinition } from "@w6w/types";

const SUMMARY = "https://typesense.instatus.com/v2/components.json";

/**
 * Typesense Cloud's status page — with the caveat that makes it
 * `informational`.
 *
 * ## It speaks for Typesense Cloud, and most Typesense is not Typesense Cloud
 *
 * Typesense is open source and mostly self-hosted. This feed reports the
 * hosted product's Management Console and Cluster Regions; it says exactly
 * nothing about a node running in somebody's own cluster, which is what a
 * great many of these connections point at.
 *
 * Reporting it as `fatal` would mean a Cloud incident marking every
 * self-hosted connection unhealthy. So it is informational: useful context for
 * a Cloud user, and never the thing that decides whether a connection works.
 *
 * **`health/node.ts` is the check that decides.** It reads the connection's
 * own node through an endpoint that needs no key, which is both more specific
 * and more truthful than any status page.
 *
 * ## The Management Console is not the search path
 *
 * A Cloud incident on the console affects provisioning, scaling and the
 * dashboard. Clusters keep serving searches throughout, which is worth saying
 * plainly because "Typesense is down" and "you cannot resize your cluster" are
 * different sentences.
 */
const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "Typesense Cloud status",
  description:
    "Typesense Cloud's status feed — INFORMATIONAL, because Typesense is mostly self-hosted and " +
    "this says nothing about a node in somebody's own cluster. The `node` check reads the " +
    "connection's own server and is what decides.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 300,
  network: { allow: ["typesense.instatus.com"] },

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

    interface Components {
      components?: Array<{ name?: string; status?: string }>;
    }
    let body: Components;
    try {
      body = await res.json() as Components;
    } catch {
      return { state: "unknown", message: "the status page did not return JSON", latencyMs };
    }

    const components = body.components ?? [];
    if (!components.length) {
      return { state: "unknown", message: "the status page listed no components", latencyMs };
    }

    const unhappy = components.filter((component) =>
      component?.status && component.status !== "OPERATIONAL"
    );
    if (!unhappy.length) {
      return {
        state: "ok",
        message: `Typesense Cloud reports ${components.length} components operational — which ` +
          "says nothing about a self-hosted node",
        latencyMs,
      };
    }

    // Provisioning and the dashboard, not the search path.
    const consoleOnly = unhappy.every((component) => /console/i.test(component?.name ?? ""));
    return {
      state: "degraded",
      message: `${unhappy.map((c) => `${c.name} is ${c.status}`).join(", ")}` +
        (consoleOnly
          ? " — the Management Console, so clusters keep serving searches and what is affected " +
            "is provisioning, scaling and the dashboard"
          : "") +
        ". This covers Typesense Cloud only",
      latencyMs,
    };
  },
};

export default check;
