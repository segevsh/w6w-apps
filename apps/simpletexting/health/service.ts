import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";

/**
 * Is the SimpleTexting API up?
 *
 * ## The status page is real and names the API specifically
 *
 * `https://status.simpletexting.com/api/v2/summary.json` is an Atlassian
 * Statuspage, read live 2026-09-22:
 *
 *     "page": { "id": "bhk5nysrlnr0", "name": "SimpleTexting",
 *               "url": "https://status.simpletexting.com",
 *               "updated_at": "2026-09-22T12:24:13.483-04:00" }
 *     "status": { "indicator": "none", "description": "All Systems Operational" }
 *
 * with eight components, all operational at the time of writing: `Login`,
 * `API`, and `Incoming` / `Outgoing` **twice each** — once under the `SMS`
 * group and once under `MMS` (the latter two are `group: true` containers).
 *
 * Component **names** are matched, never ids: the contract this app was built to
 * says so, and an id is the vendor's to change. A page that names an `API`
 * component is exactly the evidence needed to treat a status check here as a
 * statement about this app's own host, rather than about the marketing site.
 *
 * ## The verdict is the `API` component, and only that one
 *
 * This app calls one host — `api-app2.simpletexting.com` — and the `API`
 * component is the page's statement about the API. So the check's state is that
 * component's state:
 *
 * - `operational` → `ok`
 * - `degraded_performance` / `partial_outage` / `under_maintenance` → `degraded`
 * - `major_outage` → `down`
 * - anything else, **or no `API` component at all** → `unknown`, never `down`.
 *   A page that stops naming the API is a page this check can no longer read,
 *   which is not the same fact as an outage.
 *
 * The other components are reported alongside it as {@link
 * HealthReport.components} (keyed by group-qualified name, because `Incoming`
 * and `Outgoing` each appear twice under different groups — keying on the bare
 * name would drop two of them), and the ones that are not operational are named
 * in the message. They do not move the verdict, and that is deliberate: `Login`
 * is the web dashboard, and a degraded `Outgoing` pipeline is a statement about
 * delivery, not about the API this app calls. Rolling them in would report a
 * workflow that only manages contacts as broken because a dashboard component
 * is having a bad afternoon.
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. SimpleTexting is
 * SaaS-only — every Connection this app can hold runs on exactly the
 * infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see the account's token.
 */
export const STATUS_URL = "https://status.simpletexting.com/api/v2/summary.json";

/** The component whose state is this check's verdict, matched by name. */
export const API_COMPONENT = "api";

interface StatuspageComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
}

interface StatuspageSummary {
  page?: { id?: string; name?: string; url?: string };
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

/**
 * A stable, unique key for a component.
 *
 * Group-qualified, because `Incoming` and `Outgoing` each appear twice on this
 * page — once under `SMS`, once under `MMS` — with different ids and the same
 * name, and a name-only key would silently drop two of the four. The vendor's
 * ids (`hr9w6m13fys3`) are opaque to a reader, which is why the component's name
 * travels in its `message`.
 */
export function componentKey(
  component: StatuspageComponent,
  groups: Map<string, string>,
  index: number,
): string {
  const slug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const name = component.name;
  if (!name) return component.id ?? `component-${index}`;
  const group = component.group_id ? groups.get(component.group_id) : undefined;
  return group ? `${slug(group)}-${slug(name)}` : slug(name);
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "SimpleTexting API status",
  description:
    "Component status from status.simpletexting.com, anchored on its dedicated API component. " +
    "The messaging-pipeline components (SMS, MMS, Incoming, Outgoing) and Login are reported " +
    "alongside it but do not decide the verdict.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.simpletexting.com"] },
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
      // A broken status page says nothing about SimpleTexting — never `down`.
      return { state: "unknown", message: `status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.components) {
      return { state: "unknown", message: "the status page did not return its components" };
    }

    // Guard against a redirect or a rebrand quietly pointing this probe at
    // someone else's page — a healthy, claimed status page belonging to a
    // different product would otherwise read as an all-clear.
    const named = body.page?.name ?? "";
    const url = body.page?.url ?? "";
    if (!/simpletexting/i.test(named)) {
      return {
        state: "unknown",
        message: named
          ? `the status page no longer self-identifies as SimpleTexting's (page.name is "${named}")`
          : "the status page no longer names itself",
      };
    }
    if (url && !/(^|\/\/|\.)status\.simpletexting\.com(\/|$)/i.test(url)) {
      return {
        state: "unknown",
        message: `the status page moved away from status.simpletexting.com (page.url is "${url}")`,
      };
    }

    const groups = new Map<string, string>();
    for (const component of body.components) {
      if (component.group === true && component.id && component.name) {
        groups.set(component.id, component.name);
      }
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count the SMS and MMS pipelines.
    const nodes = body.components.filter((c) => c.group !== true && c.name);
    if (nodes.length === 0) {
      return { state: "unknown", message: "the status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      components[componentKey(node, groups, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const api = nodes.find((c) => (c.name ?? "").trim().toLowerCase() === API_COMPONENT);
    if (!api) {
      return {
        state: "unknown",
        message:
          `the status page no longer lists an "${API_COMPONENT}" component, so it no longer ` +
          "speaks about the API this app calls",
        components,
        ttlSeconds: 300,
      };
    }

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const others = affected
      .filter((n) => n !== api)
      .map((n) => `${n.name} (${n.status})`);

    const state = mapComponentStatus(api.status);
    const notes: string[] = [];
    if (state === "ok") {
      notes.push(body.status?.description ?? "the API component is operational");
    } else {
      notes.push(`API (${api.status})`);
    }
    if (others.length > 0) notes.push(`reported separately: ${others.join(", ")}`);

    return {
      state,
      message: notes.join("; "),
      components,
      ttlSeconds: 300,
    };
  },
};

export default service;
