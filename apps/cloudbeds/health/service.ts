/**
 * Is Cloudbeds up?
 *
 * ## The status page is real, and it is not a Statuspage
 *
 * Cloudbeds publishes a machine-readable status API at **`status.cloudbeds.com`**.
 * It was checked three ways on 2026-09-22:
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path                                       | Status  | Bytes | Content-type |
 *   | ------------------------------------------ | ------- | ----- | ------------ |
 *   | `/api/v2/components.json`                  | 200     | 1,716 | application/json |
 *   | `/api/v2/summary.json`                     | 200     | 400   | application/json |
 *   | `/api/v2/definitely-not-real-zzz.json`     | **404** | 6,986 | text/html — a Next.js 404 page |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content-type AND body.** `application/json`, parsing as the documented
 * shape. It is **not** a Statuspage and **not** an Instatus: there is no
 * `status.indicator`, no `page` object in `components.json`, and components
 * carry `isParent`/`children` rather than `group`/`group_id`. Building this
 * check against Statuspage's schema would have produced a permanent `unknown`.
 *
 * **(c) Does it describe THIS product?** Yes — `summary.json` self-identifies as
 * `{"page":{"name":"Cloudbeds","url":"https://status.cloudbeds.com",…}}`, and
 * the components are Cloudbeds' own ten: Property Management System, Booking
 * Engine, Insights & Reporting, Channel Distribution, Guest Experience, Digital
 * Marketing Suite, Payments, Websites, API, Cloudbeds University.
 *
 * ## The verdict is taken from one component, not from the page
 *
 * This app only ever calls the PMS API at `api.cloudbeds.com/api/v1.3`, and
 * that is one component on this page: **Property Management System**
 * (`clbp4hte222218iemzfsaycg8v`). The page also carries Booking Engine, Insights
 * & Reporting, Channel Distribution, Guest Experience, Digital Marketing Suite,
 * Payments, Websites, API and Cloudbeds University — none of which this app has
 * an action against. On 2026-09-22, Digital Marketing Suite was
 * `DEGRADEDPERFORMANCE` (a Tripadvisor Reviews connectivity incident that began
 * 2026-09-10 and is still open), which dragged the page-level status down to
 * `ONEDEGRADEDPERFORMANCE` while the PMS component read `OPERATIONAL`. Rolling
 * the page up into the verdict would therefore have reported this app's API
 * down because of an unrelated marketing connector.
 *
 * The other components are still reported as `components` detail, so an operator
 * can see the wider picture — it just does not change the answer. (`API` is a
 * separate component from the PMS one and is deliberately *not* folded in: the
 * vendor scopes it to its own surface, and this app's calls are the PMS
 * operations. It stays visible in the detail.)
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"` — not `informational`.
 * `informational` is what a check states when a failure is weak evidence about
 * this app (a self-hosted deployment, or a status page that covers many
 * products as equals). Neither applies: Cloudbeds is SaaS-only, so every
 * Connection this app can hold runs on exactly the infrastructure the PMS
 * component describes, and this check reads that one component rather than a
 * page-wide roll-up. An incident there really is evidence about every tenant.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Cloudbeds access token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/**
 * `components.json`, not `summary.json`.
 *
 * `summary.json` is smaller but carries only the page-level status
 * (`ONEDEGRADEDPERFORMANCE` and friends) and the open incidents — no per-component
 * status at all, which is precisely what this check needs in order to speak
 * about the PMS API alone. `components.json` has no `page` object, so
 * self-identification is done against the component ids below rather than the
 * page URL the sibling Statuspage checks use.
 */
export const STATUS_URL = "https://status.cloudbeds.com/api/v2/components.json";

/** The one component that describes the API this app calls. */
export const PMS_COMPONENT_ID = "clbp4hte222218iemzfsaycg8v";
export const PMS_COMPONENT_NAME = "Property Management System";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  isParent?: boolean;
  children?: StatusComponent[];
}

interface StatusComponents {
  components?: StatusComponent[];
}

/**
 * Cloudbeds' own component vocabulary.
 *
 * Only the first two were observed live on 2026-09-22 — `OPERATIONAL` on nine
 * of the ten components and `DEGRADEDPERFORMANCE` on the tenth. The three
 * outage/maintenance values follow the same word-squashed convention and map
 * the way this pack maps their Statuspage equivalents (`partial_outage` and
 * `under_maintenance` degrade, `major_outage` is down); they are included so a
 * real outage is not reported as `unknown`, and that is the only thing claimed
 * about them.
 *
 * An unrecognised value is `unknown`, never `ok`: a new state string must not
 * silently read as healthy.
 */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch ((status ?? "").toUpperCase()) {
    case "OPERATIONAL":
      return "ok";
    case "DEGRADEDPERFORMANCE":
    case "PARTIALOUTAGE":
    case "UNDERMAINTENANCE":
      return "degraded";
    case "MAJOROUTAGE":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Key a component by the vendor's stable id, falling back to a slug of the name.
 *
 * The id is what the page's own incident records reference; the fallback exists
 * only so a future page that drops ids still reports something rather than
 * silently dropping rows.
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

/** Flatten the (one-level) `children` array without losing ids or names. */
function flatten(components: StatusComponent[]): StatusComponent[] {
  const out: StatusComponent[] = [];
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    out.push(component);
    if (Array.isArray(component.children)) out.push(...flatten(component.children));
  }
  return out;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Cloudbeds platform status",
  description:
    "Component status from status.cloudbeds.com. The verdict comes from the Property Management " +
    "System component, which is the API this app calls; the other nine components on the page are " +
    "reported as detail only.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.cloudbeds.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Cloudbeds — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusComponents | null;
    if (!body || !Array.isArray(body.components)) {
      return { state: "unknown", message: "Status page returned an unreadable body" };
    }

    const nodes = flatten(body.components).filter((c) => c.name);
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

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page. `components.json` has no `page` object to check, so
    // the vendor's own component id — or, failing that, its name — is the
    // self-identification.
    const pms = nodes.find((c) => c.id === PMS_COMPONENT_ID) ??
      nodes.find((c) => c.name === PMS_COMPONENT_NAME);
    if (!pms) {
      return {
        state: "unknown",
        message: "status page no longer lists the Property Management System component",
        components,
      };
    }

    const state = worstHealthState([mapComponentStatus(pms.status)]);
    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const others = affected.filter((n) => n !== pms);

    const notes: string[] = [];
    notes.push(`${PMS_COMPONENT_NAME}: ${pms.status}`);
    if (others.length > 0) {
      // Named, and explicitly excluded from the verdict — otherwise a reader
      // seeing nine components will assume the roll-up covers all of them.
      notes.push(
        `unrelated to this app: ${others.map((n) => `${n.name} (${n.status})`).join(", ")}`,
      );
    }

    return {
      state,
      message: notes.join("; "),
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
