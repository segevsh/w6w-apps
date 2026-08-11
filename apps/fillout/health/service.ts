/**
 * Is Fillout up?
 *
 * ## The status page is real — and it does not say "Fillout"
 *
 * Fillout's own footer (on `fillout.com/help/fillout-rest-api`, under
 * Resources → Status) links to **`https://fillout.statuspage.io/`**, an
 * Atlassian Statuspage. Checked three ways on 2026-08-11:
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes  | md5 (first 12) |
 *   | -------------------------------------- | ------- | ------ | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 13,681 | `838c4d2e984e` |
 *   | `/api/v2/status.json`                  | 200     | 208    | `a4309814bc37` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0**  | —              |
 *
 * Three different answers, and the nonsense path is refused outright. The
 * body is `application/json; charset=utf-8` parsing as the Statuspage v2
 * schema, and at 13,681 B it matches neither known unclaimed-host signature
 * (an unclaimed `*.statuspage.io` is ~127,700 B of HTML).
 *
 * **(b) Does the page describe THIS product?** Yes — but you have to read past
 * the name, and this is the finding that would cost someone a day:
 *
 *     "page": { "id": "xw2z8dx3khsp", "name": "Zite",
 *               "url": "https://status.zite.com" }
 *
 * The page is branded **Zite**, Fillout's own platform name, and its canonical
 * URL is `status.zite.com`. Its seven components are unmistakably this product
 * — `Forms (respondent experience)`, `Form editor`,
 * `Workspaces, Settings & Admin`, `Developer API`, `Zite Database`,
 * `Zite Apps`, `Zite App Editor`. The obvious sanity guard, "the page must
 * self-identify as Fillout's", would therefore reject the *correct* page and
 * report `unknown` forever. So the guard below pins the **page id**, which is
 * stable across renames and is what the page's own incident records reference.
 *
 * **(c) The obvious host is the wrong one.** `status.fillout.com` resolves and
 * answers, but `https://status.fillout.com/api/v2/status.json` is a **404** —
 * 6,573 bytes of a Next.js "Page not found" document (whose favicon is, aptly,
 * `favicon-zite.ico`). Guessing the `status.<vendor>` convention here produces
 * a plausible 200-shaped HTML page from a completely different application.
 *
 * ## Why `fillout.statuspage.io` and not `status.zite.com`
 *
 * Both serve the same page (identical `page.id`, byte-identical
 * `status.json`). The `*.statuspage.io` alias is bound to the page id itself
 * and cannot be re-pointed by a rebrand, and it is the URL Fillout's own site
 * links to. The vendor has already moved its custom domain once — from
 * whatever preceded it to `status.zite.com` — which is precisely the event that
 * would break a check pinned to the custom domain.
 *
 * ## Two rules in the verdict
 *
 * **The page-level indicator is the verdict.** `status.indicator` is the
 * vendor's own roll-up across all seven components; deriving a verdict from
 * the component list instead would report Fillout down because the App Editor
 * is having a bad day.
 *
 * **Except that `Developer API` can only make it worse, never better.** This
 * app talks to exactly one of those seven components. If the vendor's roll-up
 * ever says "none" while the API component is not operational, the API
 * component wins — the rule is monotone (it can only take the worse of the two)
 * so it can never report Fillout healthier than Fillout says it is.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Fillout API key.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_HOST = "fillout.statuspage.io";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/**
 * The page's own id, from `page.id`. Pinned instead of the name or the URL
 * because both of those already say "Zite" rather than "Fillout" — see the
 * module comment.
 */
export const STATUS_PAGE_ID = "xw2z8dx3khsp";

/** The component this app's traffic actually depends on. */
export const API_COMPONENT_NAME = "Developer API";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
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

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames — which, on a page that has already renamed
 * itself from Fillout to Zite, is not a hypothetical.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    return `${
      component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    }-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Fillout platform status",
  description:
    "Component status from Fillout's Statuspage (branded Zite). Covers the respondent-facing " +
    "forms, the form editor, workspaces/admin, the Developer API this app calls, and the Zite " +
    "database, apps and app editor.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Fillout — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Identity is checked by page id, not by name or URL: this page already
    // calls itself "Zite" at `status.zite.com`, so a name check would reject
    // the right page and a URL check would reject it the next time the vendor
    // moves its custom domain.
    const pageId = body.page?.id ?? "";
    if (pageId && pageId !== STATUS_PAGE_ID) {
      return {
        state: "unknown",
        message: `status page id ${pageId} is not Fillout's (${STATUS_PAGE_ID})`,
      };
    }

    // `group: true` rows are containers whose status mirrors their children.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const rollup = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    // Monotone: the API component can only worsen the vendor's own roll-up.
    const apiNode = nodes.find((n) => n.name === API_COMPONENT_NAME);
    const apiState = apiNode ? mapComponentStatus(apiNode.status) : "ok";
    const state = worstHealthState([rollup, apiState]);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
