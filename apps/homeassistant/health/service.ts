import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * Is Home Assistant's *project infrastructure* up?
 *
 * ## What this page does and does not cover
 *
 * `status.home-assistant.io` is a real Atlassian Statuspage — verified live
 * 2026-08-18, `api/v2/summary.json` returns 13 KB of proper component JSON. But
 * read the components and it is clear what they are: Website, Forums, Developer
 * Docs, PyPi, npm, GitHub, Updater, Alexa, Google Assistant, **Home Assistant
 * Cloud** and **Remote UI**.
 *
 * That is the *project's* infrastructure and Nabu Casa's cloud services. Not
 * one of those components can speak for your instance, which is software
 * running on hardware you own, quite possibly with no internet connection at
 * all. An all-green board and a dead instance are entirely compatible.
 *
 * ## So why probe it at all
 *
 * Because for a particular and common class of connection it *is* the answer.
 * A connection reached through **Nabu Casa Cloud Remote UI** — the
 * `*.ui.nabu.casa` hostname, which is how most people expose Home Assistant
 * without running a tunnel — depends on the Remote UI component directly. When
 * that is down, the instance is fine and unreachable, and no amount of probing
 * the instance explains why.
 *
 * The check therefore weights the cloud components and reports the rest, capped
 * at `degraded` and marked `informational`: it is `scope: "app"`, so it cannot
 * know whether a given connection goes through Nabu Casa or through somebody's
 * own reverse proxy, where the entire page is irrelevant.
 *
 * The checks that speak for the instance are `instance` and `entities`, per
 * connection.
 */
export const STATUS_URL = "https://status.home-assistant.io/api/v2/summary.json";

/** The components a connection can actually depend on to reach an instance. */
export const CLOUD_COMPONENTS = /remote ui|home assistant cloud|cloud/i;

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatuspageSummary {
  page?: { name?: string };
  status?: { indicator?: string; description?: string };
  components?: StatuspageComponent[];
}

/** Atlassian's component vocabulary. */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a component name into a stable key. */
export function componentKey(component: StatuspageComponent, index: number): string {
  const name = component.name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return component.id ?? `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Home Assistant project status",
  description:
    "Status of Home Assistant's own infrastructure and Nabu Casa Cloud. It says NOTHING about " +
    "your instance — but Remote UI outages are why a working instance becomes unreachable.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.home-assistant.io"] },
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
      // A broken status page says nothing about Home Assistant — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }
    if (!/home assistant/i.test(body.page?.name ?? "")) {
      return {
        state: "unknown",
        message: "the status page no longer self-identifies as Home Assistant's",
      };
    }

    // Groups are headings, not services.
    const components = body.components.filter((c) => c.group !== true && c.name);
    const report: Record<string, HealthComponentReport> = {};
    for (const [index, component] of components.entries()) {
      const state = mapComponentStatus(component.status);
      report[componentKey(component, index)] = state === "ok"
        ? { state }
        : { state, message: component.status };
    }

    const cloud = components.filter((c) => CLOUD_COMPONENTS.test(c.name ?? ""));
    const cloudState = worstHealthState(cloud.map((c) => mapComponentStatus(c.status)));
    const affected = components.filter((c) => mapComponentStatus(c.status) !== "ok");

    if (affected.length === 0) {
      return {
        state: "ok",
        message: body.status?.description ?? "all components operational",
        components: report,
        ttlSeconds: 300,
      };
    }

    const names = affected.map((c) => `${c.name} (${c.status})`).join(", ");
    const cloudAffected = cloud.some((c) => mapComponentStatus(c.status) !== "ok");
    return {
      // Capped: this hook cannot know whether a connection goes through Nabu
      // Casa at all, and for a self-hosted route the whole page is irrelevant.
      state: "degraded",
      message: cloudAffected
        ? `${names} — Remote UI or Cloud is affected, which is what makes a healthy instance ` +
          "unreachable through a nabu.casa hostname"
        : `${names} — none of these affect an instance you reach directly`,
      components: { ...report, "cloud-roll-up": { state: cloudState } },
      ttlSeconds: 300,
    };
  },
};

export default service;
