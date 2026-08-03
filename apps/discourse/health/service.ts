/**
 * Is Discourse's own hosted platform up?
 *
 * ## Finding a probe that is real
 *
 * Discourse publishes a status page at **`status.discourse.org`**. It is *not*
 * an Atlassian Statuspage, which is the first thing a habit would get wrong
 * here — all five `/api/v2/*.json` paths return 404 with an HTML body. Verified
 * on the wire 2026-08-03:
 *
 *   | URL                                              | Result                      |
 *   | ------------------------------------------------ | --------------------------- |
 *   | `https://status.discourse.org/`                   | 200, `text/html`, 103,288 B |
 *   | `https://status.discourse.org/api/v2/summary.json` | **404**, `text/html`, 427 B |
 *   | `https://status.discourse.org/api/v2/status.json`  | **404**, `text/html`, 427 B |
 *   | `https://discourse.statuspage.io/`                 | 200 — after redirecting to `https://www.atlassian.com/software/statuspage`, 127,720 B of marketing HTML |
 *   | `https://status.discourse.com/`                    | does not resolve            |
 *
 * That last-but-one row is the known trap, hit exactly as described: an
 * unclaimed `*.statuspage.io` subdomain that answers 200 with Atlassian's own
 * product page and would sail through a naive "did it 200?" test while
 * containing nothing about Discourse.
 *
 * The real page is **Status.io**, not Statuspage. Its HTML references
 * `image.status.io` for the favicon and the response carries
 * `x-status-page-id: 5e2141ce30dc5c04b3ac32fc`. Status.io's public API serves
 * that page id unauthenticated at
 * `https://api.status.io/1.0/status/{status_page_id}`.
 *
 * ### Verifying the endpoint is real, two ways
 *
 * Both run on 2026-08-03, both required, per the pack's rule that a JSON-shaped
 * path returning 200 is not proof of an API:
 *
 * **(a) Deliberately bogus siblings on the same host.**
 *
 *   | Path                                      | Result                                          |
 *   | ----------------------------------------- | ----------------------------------------------- |
 *   | `/1.0/status/5e2141ce30dc5c04b3ac32fc`     | 200, `application/json`, 6,219 B — the real tree |
 *   | `/1.0/status/deadbeefdeadbeefdeadbeef`     | 200, **`{"error":"status page not found"}`**     |
 *   | `/1.0/notareal/5e2141ce30dc5c04b3ac32fc`   | **403**, `{"message":"Missing Authentication Token"}` |
 *   | `/1.0/incidents/5e2141ce30dc5c04b3ac32fc`  | **403**, same                                    |
 *
 * A catch-all would have returned the same bytes for all four. It returns three
 * different answers, and the bogus page id is rejected *by id*, which no static
 * fixture could fake.
 *
 * **(b) Content-type and body inspection.** `application/json`, and the payload
 * names Discourse's actual product lines and hosting regions — "Discourse
 * Starter, Basic, Pro, and Business Hosting" with seven regional containers
 * (`NA West (sea) 1..3`, `NA East (yyz) 1..2`, `EU (dub) 1..2`), "Discourse
 * Enterprise Hosting", "Website", "Internal Services", "Discourse ID", "Meta".
 * That is an account-specific set no HTML catch-all could fabricate.
 *
 * ## Why this check is `informational`, deliberately
 *
 * `status.discourse.org` reports **Discourse's hosting business**. A self-hosted
 * forum — which is most Discourse installs, since the product is open source and
 * designed to be run by its community — is completely unaffected by every
 * component on that page. This check is `scope: "app"`, so it cannot know which
 * Connections are hosted by Discourse and which are a box in a data centre
 * somewhere.
 *
 * Left at the `degraded` default for `kind: "service"`, a wobble in Discourse
 * Cloud's Dublin region would pin every self-hosted tenant's App at `degraded`,
 * which would be a plain untruth about their forum. `informational` says what
 * the check actually is: real, useful, worth displaying — and not evidence about
 * any particular Connection.
 *
 * Nothing is lost by that. Every Connection already has a strictly better signal
 * for its own forum: the `site` check probes that forum's actual host, per
 * Connection, at `degraded` severity. If a Discourse-hosted forum goes down,
 * `site` reports it directly rather than by inference from a fleet-wide page.
 *
 * ## Posture
 *
 * `credential: "none"` — the default for `kind: "service"`, and load-bearing: a
 * third-party status host must never see the forum's API key. `network.allow` is
 * declared for this hook alone. That declaration is technically redundant while
 * the App's own allowlist is `["*"]` (see `lib/client.ts` for why it has to be),
 * but it is written out so the intent survives if that allowlist is ever
 * narrowed, and so a reader of the manifest can see that this hook — and only
 * this hook — talks to `api.status.io`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

/** The Status.io page id behind status.discourse.org, from its `x-status-page-id` header. */
export const STATUS_PAGE_ID = "5e2141ce30dc5c04b3ac32fc";

export const STATUS_URL = `https://api.status.io/1.0/status/${STATUS_PAGE_ID}`;

interface StatusIoNode {
  id?: string;
  name?: string;
  status?: string;
  status_code?: number;
  containers?: StatusIoNode[];
}

interface StatusIoBody {
  error?: string;
  result?: {
    status_overall?: { status?: string; status_code?: number };
    status?: StatusIoNode[];
    incidents?: unknown[];
    maintenance?: { active?: unknown[]; upcoming?: unknown[] };
  };
}

/**
 * Status.io's documented "Incident Status" vocabulary
 * (<https://kb.status.io/developers/status-codes/>).
 *
 * The numeric code is read in preference to the display string because it is
 * the stable half — Status.io lets a page operator rename the labels, and
 * Discourse has in fact renamed 200 to "Planned Maintenance".
 */
export function mapStatusCode(code: number | undefined): HealthState {
  switch (code) {
    case 100: // Operational
      return "ok";
    case 200: // Maintenance
    case 300: // Degraded Performance
    case 400: // Partial Service Disruption
    case 600: // Security Event
      return "degraded";
    case 500: // Service Disruption
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a Status.io component name into a stable `component:<id>` selector. */
export function componentId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Discourse hosting status",
  description:
    "Component status from Status.io, the platform behind status.discourse.org. Covers " +
    "Discourse's own hosting — a self-hosted forum is unaffected, which is why this check is " +
    "informational and the per-connection `site` check carries the weight.",
  kind: "service",
  scope: "app",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["api.status.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Discourse — never `down`.
      return { state: "unknown", message: `Status.io returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusIoBody | null;
    // Status.io answers an unknown page id with HTTP 200 and `{"error": ...}`,
    // so a status code alone is not enough to know the call worked.
    if (!body || body.error) {
      return { state: "unknown", message: body?.error ?? "Status.io returned an unreadable body" };
    }
    const nodes = body.result?.status;
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return { state: "unknown", message: "Status.io returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    for (const node of nodes) {
      if (!node?.name) continue;
      const state = mapStatusCode(node.status_code);
      components[componentId(node.name)] = state === "ok"
        ? { state }
        : { state, message: node.status ?? `status_code ${node.status_code}` };
    }
    if (Object.keys(components).length === 0) {
      return { state: "unknown", message: "Status.io returned no named components" };
    }

    // Prefer the vendor's own roll-up when it gives one; fall back to worst-of.
    const overall = body.result?.status_overall?.status_code;
    const state = overall === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapStatusCode(overall);

    const affected = Object.entries(components).filter(([, c]) => c.state !== "ok");
    const active = body.result?.maintenance?.active?.length ?? 0;
    const openIncidents = body.result?.incidents?.length ?? 0;

    const notes: string[] = [];
    if (affected.length > 0) notes.push(`affected: ${affected.map(([id]) => id).join(", ")}`);
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (active > 0) notes.push(`${active} active maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
