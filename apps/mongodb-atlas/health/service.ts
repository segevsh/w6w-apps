import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is MongoDB Cloud itself up?
 *
 * `status.mongodb.com` is a Statuspage, and here the conventional
 * `summary.json` is genuinely the right route — measured 2026-08-19, it and
 * `components.json` both return the same **9** components, so nothing is
 * truncated away.
 *
 * ## The component that matters is `MongoDB Cloud`, and it is not the only one
 *
 * The board separates the platform from several things built on it:
 *
 * - **`MongoDB Cloud`** — the console and this Administration API. When it is
 *   out, every action in this app fails.
 * - **`MongoDB Atlas Search`** — a cluster feature with its own outages.
 * - **`MongoDB Atlas App Services and Device Sync`**, **Charts**, **Data
 *   Federation**, **Stream Processing** — separate products, not this API.
 *
 * ## What this check cannot tell you
 *
 * **Whether your clusters are reachable.** A cluster answers a driver on
 * `mongodb+srv://…`, over the wire protocol, on its own hosts. That path does
 * not go through `cloud.mongodb.com` and is not what this page reports: the
 * control plane can be down while every cluster serves traffic normally, and —
 * more usefully — the page can be green while one project's cluster is
 * unreachable.
 *
 * This app manages the control plane, so a control-plane status is the right
 * thing for it to report. It is also `informational` severity for exactly that
 * reason: an outage here stops changes, not queries.
 */
export const STATUS_URL = "https://status.mongodb.com/api/v2/summary.json";

/** The component that is the console and this API. */
export const API_COMPONENT = "MongoDB Cloud";

/** A cluster feature with its own outages, worth reporting separately. */
export const SEARCH_COMPONENT = "MongoDB Atlas Search";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface SummaryDocument {
  page?: { name?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
  incidents?: Array<{ name?: string; impact?: string }>;
}

/** Statuspage's vocabulary, mapped onto the health states. */
export function mapComponentStatus(status: string | undefined): "ok" | "degraded" | "down" {
  switch (status) {
    case "operational":
      return "ok";
    case "major_outage":
      return "down";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    default:
      return "degraded";
  }
}

const check: HealthCheckDefinition = {
  key: "service",
  kind: "service",
  scope: "app",
  credential: "none",
  title: "MongoDB Cloud status",
  description:
    "Reads status.mongodb.com for the `MongoDB Cloud` component — the console and this " +
    "Administration API. It says NOTHING about whether your clusters are reachable: a driver " +
    "talks to them directly over the wire protocol, which does not pass through this API at all.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 120,
  network: { allow: ["status.mongodb.com"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "unknown",
        message: `could not reach the MongoDB status page: ${String(err)}`,
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `the MongoDB status page answered ${res.status}` };
    }

    let body: SummaryDocument | null = null;
    try {
      body = await res.json() as SummaryDocument;
    } catch {
      return { state: "unknown", message: "the MongoDB status page did not return JSON" };
    }

    const components = body?.components ?? [];
    if (!components.length) {
      return { state: "unknown", message: "the MongoDB status page listed no components" };
    }

    const api = components.find((component) => component?.name === API_COMPONENT);
    const search = components.find((component) => component?.name === SEARCH_COMPONENT);
    if (!api) {
      return {
        state: "unknown",
        message: `"${API_COMPONENT}" is not on the status page — it lists ${components.length} ` +
          "components and none of them is this one, so the board has been reorganised",
      };
    }

    const apiState = mapComponentStatus(api.status);
    const searchState = search ? mapComponentStatus(search.status) : "ok";

    const componentStates: Record<string, { state: "ok" | "degraded" | "down"; message?: string }> =
      {};
    if (apiState !== "ok") componentStates["api"] = { state: apiState, message: api.status };
    if (search && searchState !== "ok") {
      componentStates["search"] = { state: searchState, message: search.status };
    }

    if (apiState === "ok" && searchState === "ok") {
      return {
        state: "ok",
        message: "MongoDB Cloud is operational — this says nothing about cluster reachability",
      };
    }

    const parts: string[] = [];
    if (apiState !== "ok") {
      parts.push(`the control plane is ${api.status} — changes will fail, queries will not`);
    }
    if (searchState !== "ok") parts.push(`Atlas Search is ${search?.status}`);

    return {
      state: apiState === "down" ? "down" : "degraded",
      message: parts.join("; "),
      components: componentStates,
    };
  },
};

export default check;
