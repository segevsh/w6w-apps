import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Is HCP Terraform itself up?
 *
 * ## `summary.json` omits the component this app depends on
 *
 * `status.hashicorp.com` is a Statuspage, so the conventional probe is
 * `/api/v2/summary.json`. Measured on 2026-08-18, that route returns **25
 * components** while `/api/v2/components.json` returns **62**. The page is a
 * flat list ordered by `position`, and summary truncates it.
 *
 * **`HCP Terraform` is at position 37.** It is not in `summary.json` at all.
 *
 * So the conventional check does not merely read the wrong component — it
 * reads twenty-five components belonging to Boundary, Packer, Waypoint and
 * various cloud regions, finds them all operational, and reports Terraform
 * healthy while Terraform is down. That is a worse failure than having no
 * check, because it is confidently wrong. This one reads `components.json`.
 *
 * ## The two components that matter, and the many that do not
 *
 * `HCP Terraform` is the API and the run pipeline. `Terraform Registry` is
 * where providers and modules are downloaded from during a plan — a run
 * against a healthy HCP Terraform still fails if the registry is down, and
 * that is a distinct outage on the same page.
 *
 * Everything else on the board — Vault, Boundary, Packer, the package
 * repositories, the twenty-two duplicated cloud-region entries — belongs to
 * other products. The region entries are worth a note: `AWS-us-east-1` appears
 * **twice** with different ids, once under each product it serves, and nothing
 * in the JSON says which is which. Matching components by name would pick one
 * at random. This check matches the two exact names it needs and ignores the
 * rest.
 *
 * ## Self-hosted Terraform Enterprise is not on this page
 *
 * This check is app-scoped and reads HashiCorp's managed service. A connection
 * pointing at an organisation's own Terraform Enterprise is unaffected by
 * anything here — the `instance` check is the one that speaks for it.
 */
export const STATUS_URL = "https://status.hashicorp.com/api/v2/components.json";

/** The component that is this API. */
export const API_COMPONENT = "HCP Terraform";

/** Providers and modules are fetched from here during a plan. */
export const REGISTRY_COMPONENT = "Terraform Registry";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
}

interface ComponentsDocument {
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
  title: "HCP Terraform status",
  description:
    "Reads status.hashicorp.com's COMPONENTS feed, not its summary: summary.json returns only " +
    "the first 25 of 62 components and HCP Terraform is the 38th, so the conventional probe " +
    "reports other products' health as Terraform's. Says nothing about self-hosted Terraform " +
    "Enterprise.",
  covers: ["service"],
  severity: "informational",
  minIntervalSeconds: 120,
  network: { allow: ["status.hashicorp.com"] },

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return {
        state: "unknown",
        message: `could not reach the HashiCorp status page: ${String(err)}`,
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "unknown", message: `the HashiCorp status page answered ${res.status}` };
    }

    let body: ComponentsDocument | null = null;
    try {
      body = await res.json() as ComponentsDocument;
    } catch {
      return { state: "unknown", message: "the HashiCorp status page did not return JSON" };
    }

    const components = body?.components ?? [];
    if (!components.length) {
      return { state: "unknown", message: "the HashiCorp status page listed no components" };
    }

    // Exact names: the page repeats region names across products, so a
    // substring match would pick one of two identically-named entries.
    const api = components.find((component) => component?.name === API_COMPONENT);
    const registry = components.find((component) => component?.name === REGISTRY_COMPONENT);

    if (!api) {
      return {
        state: "unknown",
        message: `"${API_COMPONENT}" is not on the status page — it lists ${components.length} ` +
          "components and none of them is this one, so the board has been reorganised",
      };
    }

    const apiState = mapComponentStatus(api.status);
    const registryState = registry ? mapComponentStatus(registry.status) : "ok";

    const componentStates: Record<string, { state: "ok" | "degraded" | "down"; message?: string }> =
      {};
    if (apiState !== "ok") componentStates["api"] = { state: apiState, message: api.status };
    if (registry && registryState !== "ok") {
      componentStates["registry"] = { state: registryState, message: registry.status };
    }

    if (apiState === "ok" && registryState === "ok") {
      return { state: "ok", message: "HCP Terraform and the Terraform Registry are operational" };
    }

    const parts: string[] = [];
    if (apiState !== "ok") parts.push(`the API is ${api.status}`);
    if (registryState !== "ok") {
      parts.push(
        `the registry is ${registry?.status} — plans fail fetching providers even when the API is up`,
      );
    }

    return {
      state: apiState === "down" ? "down" : "degraded",
      message: parts.join("; "),
      components: componentStates,
    };
  },
};

export default check;
