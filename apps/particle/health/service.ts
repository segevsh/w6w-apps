import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is Particle up — and which half of it?
 *
 * ## The API and the devices' connectivity are separate components
 *
 * This is the distinction that makes an IoT status page different from every
 * other one in this pack. `status.particle.io` lists 23 components, and they
 * split into two groups that fail independently:
 *
 * - **`REST API`** — what this app talks to. When it is out, no action here
 *   works, and every device carries on running its firmware perfectly well.
 * - **`Cellular Connectivity`, `Wi-Fi Connectivity`, `2G/3G NorAm`,
 *   `2G/3G EMEA`, `Ether SIM`, and a component per device family** — how
 *   devices reach the cloud. When one of those is out, the API answers
 *   normally and every affected device is unreachable: variables time out,
 *   functions do not run, and nothing looks wrong from the API's side.
 *
 * A workflow reading variables cares about the second. A workflow listing
 * devices cares about the first. Reporting a single "Particle is fine" would
 * be wrong for one of them, so this reports both.
 *
 * ## The connectivity components are per radio technology and per device family
 *
 * `E Series LTE (E402), Boron LTE, B Series B402 SoM…` is one component. So a
 * cellular outage is usually partial — some hardware in a fleet affected and
 * some not — and the names are the only way to tell which. They are returned
 * rather than collapsed into a count.
 */
export const STATUS_URL = "https://status.particle.io/api/v2/summary.json";

/** The component this app itself depends on. */
export const API_COMPONENT = "REST API";

/** Components describing how devices reach the cloud, rather than the API. */
export const CONNECTIVITY =
  /connectivity|cellular|wi-?fi|sim|2g\/3g|lte|som|electron|boron|tracker/i;

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface Summary {
  page?: { name?: string };
  components?: StatuspageComponent[];
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
  title: "Particle status",
  description:
    "Reads status.particle.io, separating the REST API from DEVICE CONNECTIVITY. They fail " +
    "independently: a connectivity outage leaves the API answering normally while every affected " +
    "device is unreachable, and nothing about the API looks wrong.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 120,
  network: { allow: ["status.particle.io"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "unknown",
        message: `could not reach the Particle status page: ${String(err)}`,
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `the Particle status page answered ${res.status}` };
    }

    let body: Summary | null = null;
    try {
      body = await res.json() as Summary;
    } catch {
      return { state: "unknown", message: "the Particle status page did not return JSON" };
    }

    const components = body?.components ?? [];
    if (!components.length) {
      return { state: "unknown", message: "the Particle status page listed no components" };
    }

    const api = components.find((component) => component?.name === API_COMPONENT);
    if (!api) {
      return {
        state: "unknown",
        message: `"${API_COMPONENT}" is not on the status page — it lists ${components.length} ` +
          "components and none of them is this one, so the board has been reorganised",
      };
    }

    const apiState = mapComponentStatus(api.status);
    // Everything that describes how devices reach the cloud, rather than the
    // API this app calls.
    const connectivityAffected = components.filter((component) =>
      CONNECTIVITY.test(component?.name ?? "") && mapComponentStatus(component?.status) !== "ok"
    );

    const componentStates: Record<string, { state: "ok" | "degraded" | "down"; message?: string }> =
      {};
    if (apiState !== "ok") componentStates["api"] = { state: apiState, message: api.status };
    for (const component of connectivityAffected) {
      const key = String(component?.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(
        0,
        40,
      );
      componentStates[key] = {
        state: mapComponentStatus(component?.status),
        message: component?.status,
      };
    }

    if (apiState === "ok" && !connectivityAffected.length) {
      return { state: "ok", message: "the Particle API and device connectivity are operational" };
    }

    const parts: string[] = [];
    if (apiState !== "ok") {
      parts.push(
        `the REST API is ${api.status} — every action here fails, and devices carry on ` +
          "running their firmware",
      );
    }
    if (connectivityAffected.length) {
      // Partial by hardware family, and the names are the only way to tell.
      parts.push(
        `device connectivity is affected for ${connectivityAffected.length} component(s): ${
          connectivityAffected.map((component) => component?.name).filter(Boolean).join("; ")
        } — the API will answer normally while those devices are unreachable`,
      );
    }

    return {
      state: apiState === "down" ? "down" : "degraded",
      message: parts.join(". "),
      components: componentStates,
    };
  },
};

export default check;
