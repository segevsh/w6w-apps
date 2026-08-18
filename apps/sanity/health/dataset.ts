/**
 * Can **this connection** actually read its dataset?
 *
 * The check that catches what the other two cannot. Sanity's status page can be
 * green and the token live while this connection is still broken, because three
 * of its four fields are not credentials at all:
 *
 *   - a **project id** that does not exist answers from a hostname that looks
 *     perfectly valid;
 *   - a mistyped **dataset** answers `404 Dataset not found` — measured
 *     2026-08-18, `aaaaaaaa.api.sanity.io` returns exactly that;
 *   - a token from **another project** authenticates and then finds nothing.
 *
 * So this runs the cheapest possible GROQ query — `*[0...0]`, which matches
 * every document and returns none of them — against the connection's own
 * project and dataset. It costs one query and no bandwidth, and it fails for
 * precisely the reasons above.
 *
 * **It deliberately reads the live host even on a CDN connection.** The CDN
 * serves the last cached content for up to two hours when the Content Lake is
 * unavailable, so a health check that went through it would keep reporting
 * `ok` through an outage — which is the one thing a health check must not do.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at working",
 *     a different question from "is the vendor up" and "is the token live".
 *   - `scope: "connection"` — every connection names a different dataset.
 *   - `credential: "signed"` — a private dataset needs the token to read.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_VERSION, dataHost, displayOf } from "../lib/client.ts";

const dataset: HealthCheckDefinition = {
  key: "dataset",
  title: "Dataset reachability",
  description:
    "Runs an empty GROQ query against this connection's own project and dataset — the check " +
    "that catches a wrong project id or a mistyped dataset, which no credential test can.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const display = displayOf(ctx.connection);
    const projectId = String(display.projectId ?? "");
    const name = String(display.dataset ?? "");
    if (!projectId || !name) {
      return { state: "down", message: "this connection records no project id or dataset" };
    }

    // The LIVE host, always — the CDN would serve cached content through an
    // outage and report a green check on stale data.
    const url = `${dataHost(projectId, false)}/${API_VERSION}/data/query/${
      encodeURIComponent(name)
    }?query=${encodeURIComponent("*[0...0]")}`;

    let res: Response;
    try {
      res = await ctx.fetch(url, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach the project host: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (res.status === 404) {
      // Measured: "Dataset \"x\" not found for project ID \"y\"".
      return {
        state: "down",
        message: text.includes("Dataset")
          ? `dataset "${name}" does not exist in project ${projectId}`
          : `project ${projectId} answered 404`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      // The derived auth:token check reports credential problems; this one
      // stays out of the way rather than reporting the same failure twice.
      return { state: "unknown", message: `the token was rejected (${res.status})` };
    }
    if (res.status === 429) {
      return {
        state: "degraded",
        message: "rate limited — 500 concurrent queries per dataset is the ceiling",
      };
    }
    if (!res.ok) return { state: "down", message: `query returned ${res.status}` };

    return {
      state: "ok",
      message: `${projectId}/${name} reachable`,
      ttlSeconds: 300,
    };
  },
};

export default dataset;
