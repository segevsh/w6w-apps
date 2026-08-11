/**
 * Is BigCommerce up?
 *
 * ## The status page is real. It was checked three ways on 2026-08-11
 *
 * BigCommerce publishes at **`status.bigcommerce.com`**, an Atlassian Statuspage.
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                   | Status  | Bytes | md5 (first 12) |
 *   | -------------------------------------- | ------- | ----- | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 6,811 | (JSON)         |
 *   | `/api/v2/status.json`                  | 200     | 235   | (JSON)         |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *
 * Three different answers, and the nonsense path is refused outright. This
 * matters more than usual for this vendor: `bigcommerce.com` itself serves a
 * ~378 KB catch-all page for asset paths that do not exist, so "200 means it is
 * there" is demonstrably false on this domain.
 *
 * **(b) Content-type AND body.** `application/json`, parsing as the Statuspage
 * v2 schema. Neither known unclaimed-host signature matches: an unclaimed
 * `*.statuspage.io` is ~127,700 B of HTML, an unclaimed `*.instatus.com` is
 * ~216,800 B. This is 6,811 B of JSON.
 *
 * **(c) Does the page describe THIS product, and does it cover the API?** Yes to
 * both:
 *
 *     "page": { "id": "qbn4dyd29jby", "name": "BigCommerce",
 *               "url": "https://status.bigcommerce.com" }
 *
 * and the first of its 18 components is **`API & Webhooks`** (`m5fqcsrqnq7b`) —
 * the component that covers `api.bigcommerce.com`, which is the only host this
 * app calls. The rest are `Storefront`, `Checkout & Payment Processing`,
 * `Control Panel`, `Reporting & Analytics`, `Email`, plus the `Client Services`,
 * `B2B Edition` and `3rd Party Services` groups.
 *
 * ## Two findings that shape the code below
 *
 * **Four of the eighteen components are not BigCommerce.** The
 * `3rd Party Services` group carries Avalara, Braintree, Braintree PayPal
 * Processing and Stripe. They are genuinely upstream of a BigCommerce store's
 * checkout, so they are reported — but keying them by the vendor's own component
 * id keeps `Stripe` from being read as a BigCommerce service by someone skimming
 * names.
 *
 * **The page-level indicator is the verdict, components are the detail.**
 * `status.indicator` is BigCommerce's own roll-up across all eighteen. Deriving
 * a verdict from the component list instead would report BigCommerce down
 * because Braintree is having a bad day — and Braintree cannot affect a single
 * call this app makes.
 *
 * ## Severity and posture
 *
 * Left at the `degraded` default for `kind: "service"`. BigCommerce is SaaS-only
 * — there is no self-hosted BigCommerce — so every Connection this app can hold
 * runs on exactly the infrastructure this page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below: a
 * status host must never see a BigCommerce access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.bigcommerce.com/api/v2/summary.json";

/** The component that covers the host this app actually calls. */
export const API_COMPONENT_ID = "m5fqcsrqnq7b";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
  group_id?: string | null;
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
 * `degraded_performance`, `partial_outage`, `major_outage`, `under_maintenance`.
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
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a future page that drops ids still
 * reports something rather than silently dropping rows.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    const slug = component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${slug}-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "BigCommerce platform status",
  description:
    "Component status from status.bigcommerce.com. Covers `API & Webhooks` (the host this app " +
    "calls), Storefront, Checkout & Payment Processing, Control Panel, Reporting & Analytics and " +
    "Email, plus the third-party payment and tax services a store's checkout depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.bigcommerce.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about BigCommerce — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page — the failure mode where a healthy, claimed status page
    // belongs to an entirely different product.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.bigcommerce\.com(\/|$)/i.test(pageUrl)) {
      return {
        state: "unknown",
        message: "status page no longer self-identifies as BigCommerce's",
      };
    }

    // `group: true` rows are containers whose status merely mirrors their
    // children; reporting them would double-count every B2B and third-party
    // service.
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
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

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
