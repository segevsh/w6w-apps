/**
 * Is Gusto up? — its Statuspage, read with the parts that are not Gusto left
 * out of the verdict.
 *
 * Gusto's status page is unusual in what it publishes. Verified 2026-08-18, its
 * ~20 components mix three different kinds of thing:
 *
 *   - **Gusto's own product** — `API`, `Payroll, Benefits, HR`, `Gusto.com
 *     website`, `Gusto Mobile`;
 *   - **Gusto's support channels** — `Phone System`, `Chat System`,
 *     `Email System`;
 *   - **Gusto's infrastructure vendors**, exposed by name — `Elastic Compute
 *     Cloud`, `S3 East`, `S3 West`, `Database`, `Load Balancers`, `Caching`,
 *     `DNS`, and five separate Cloudflare components.
 *
 * Most vendors do not show the third group, and rolling all of it up would make
 * a Cloudflare CDN incident read as a payroll outage while a busy support phone
 * line read as an API failure.
 *
 * So the verdict comes from **`API`** and **`Payroll, Benefits, HR`** — the two
 * components that describe whether this app's calls will work. The
 * infrastructure components are still reported, because "S3 West is degraded"
 * is genuinely useful context when writes start failing, but they are capped at
 * `degraded`: they are upstream of Gusto, not authoritative about it. The
 * support channels are ignored entirely — no action here touches them.
 *
 * Annotation:
 *
 *   - `kind: "service"` — "is the vendor up", separate from "is this token
 *     live" (the derived `auth:*` checks).
 *   - `scope: "app"` (the default) — Gusto publishes one status page for both
 *     environments, so the answer is the same for every Connection.
 *   - `credential: "none"` (also the default) — unauthenticated and unsigned.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.gusto.com";

/** The components that decide whether an API call will work. */
const DECIDING = ["API", "Payroll, Benefits, HR"];

/** Reported for context, capped at degraded — upstream of Gusto, not Gusto. */
const INFRASTRUCTURE = [
  "Database",
  "Load Balancers",
  "Caching",
  "DNS",
  "Elastic Compute Cloud",
  "S3 East",
  "S3 West",
];

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Gusto platform status",
  description:
    "The API and payroll components decide the verdict. Gusto's infrastructure vendors are " +
    "reported for context but capped at degraded, and its support channels are ignored.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Gusto.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const deciding = new Set(DECIDING.map((n) => n.toLowerCase()));
    const infra = new Set(INFRASTRUCTURE.map((n) => n.toLowerCase()));

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];
    let matched = 0;

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      const key = name.toLowerCase();
      const isDeciding = deciding.has(key);
      // Cloudflare's components are named individually; treat the whole family
      // as infrastructure without listing five strings.
      const isInfra = infra.has(key) || key.startsWith("cloudflare");
      if (!isDeciding && !isInfra) continue;

      let state = STATES[String(c.status)] ?? "unknown";
      if (!isDeciding && state === "down") state = "degraded";
      components[slug(name)] = { state, message: c.status };
      if (isDeciding) {
        matched++;
        states.push(state);
      } else if (state !== "ok") {
        states.push("degraded");
      }
      if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
    }

    if (matched === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the API or payroll components",
      };
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0
        ? `${Object.keys(components).length} components operational`
        : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
