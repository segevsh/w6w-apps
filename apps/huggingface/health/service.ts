import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is Hugging Face up?
 *
 * ## Better Stack, not a Statuspage — and the usual paths lie
 *
 * `status.huggingface.co` is a **Better Stack** page. Probed live 2026-08-18,
 * `/api/v2/summary.json` — the Atlassian path every other vendor in this pack
 * uses — answers **200 with 746 KB of the page's own HTML**. Not a 404: a
 * success, with a body that is not JSON. A client that assumed the Statuspage
 * convention would parse a web page forever and never notice.
 *
 * The real route is `/index.json`, 81 KB of Better Stack's own document, which
 * self-identifies:
 *
 *     "data": { "attributes": { "company_name": "Hugging Face", … } }
 *
 * The check requires that shape *and* that name, so the day the route moves
 * this reports `unknown` rather than reading HTML as health.
 *
 * ## Why it is capped at degraded
 *
 * The page covers Hugging Face's own services — the Hub, the website, the
 * inference router. But this app's inference actions are dispatched by the
 * router to **third-party providers**, and an outage at one of those is not on
 * this page at all. So a green board is not a promise that a completion will
 * work, and a red one may not affect a workflow that only reads the Hub.
 */
export const STATUS_URL = "https://status.huggingface.co/index.json";

/** The components a Hub-only workflow depends on. */
export const HUB_COMPONENTS = /hub|website|repository|git|lfs|cdn/i;

/** The components an inference workflow depends on. */
export const INFERENCE_COMPONENTS = /inference|endpoint|router/i;

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: { public_name?: string; status?: string };
}

interface BetterStackPage {
  data?: { type?: string; attributes?: { company_name?: string; aggregate_state?: string } };
  included?: BetterStackResource[];
}

/** Better Stack's resource vocabulary. */
export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a resource's public name into a stable key. */
export function resourceKey(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Hugging Face service status",
  description:
    "Hugging Face's own status. It does NOT cover the third-party inference providers the router " +
    "dispatches to, so a green board is not a promise that a completion will work.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.huggingface.co"] },
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "unknown", message: `could not reach the status page: ${String(err)}` };
    }
    if (!res.ok) {
      await res.body?.cancel();
      // A broken status page says nothing about the vendor — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    // Every Statuspage-shaped path on this host answers 200 with HTML, so a
    // parse failure is the expected signal that the JSON route has moved.
    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "the status page did not return its JSON document — the /index.json route may " +
          "be gone, and the Statuspage-shaped paths on this host serve HTML with a 200",
      };
    }
    if (!/hugging\s*face/i.test(body.data.attributes.company_name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as Hugging Face's",
      };
    }

    const resources = (body.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );
    if (resources.length === 0) {
      return { state: "unknown", message: "the status page listed no resources" };
    }

    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    if (affected.length === 0) {
      return {
        state: "ok",
        message: `all ${resources.length} components operational`,
        ttlSeconds: 300,
      };
    }

    const report: Record<string, HealthComponentReport> = {};
    for (const [index, resource] of affected.entries()) {
      report[resourceKey(resource, index)] = {
        state: mapResourceStatus(resource.attributes?.status),
        message: resource.attributes?.status,
      };
    }

    // Which half, because reading the Hub and running inference are different
    // dependencies with different blast radii.
    const names = affected.map((r) => r.attributes?.public_name ?? "");
    const hubHit = names.some((name) => HUB_COMPONENTS.test(name));
    const inferenceHit = names.some((name) => INFERENCE_COMPONENTS.test(name));
    const halves = [hubHit ? "the Hub" : "", inferenceHit ? "inference" : ""]
      .filter(Boolean).join(" and ");

    return {
      // Capped: this cannot know whether a connection reads the Hub, runs
      // inference, or both — and the providers are not on this page anyway.
      state: "degraded",
      message: `${affected.length} affected${halves ? ` — ${halves}` : ""}: ${
        affected.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join(", ")
      }`,
      components: report,
      ttlSeconds: 300,
    };
  },
};

export default service;
