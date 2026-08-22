/**
 * Is EasyPost up? — and, separately, **which carriers are**.
 *
 * ## The status page is not where you would look for it
 *
 * Verified 2026-08-18, and worth writing down because it is a trap:
 * `status.easypost.com/api/v2/summary.json` answers **HTTP 200 with a megabyte
 * of HTML**. It is not a Statuspage API and a client that trusts the status
 * code parses a web page as JSON.
 *
 * The real instance is **`www.easypoststatus.com`** — page id `n1jtz5983249`,
 * named "EasyPost", 43 components.
 *
 * ## A carrier outage is not an EasyPost outage, and it is more useful
 *
 * The page lists EasyPost's own services — `API`, `Webhooks`, `Tracking`,
 * `Address Verification`, `Label Purchases`, `USPS Postage Purchases` —
 * alongside about twenty-five **carriers**: USPS, UPS, FedEx, DHL Express,
 * Canada Post, Royal Mail, Purolator, Amazon Shipping and the rest.
 *
 * When FedEx is down, EasyPost's API answers perfectly. You simply cannot buy a
 * FedEx label. Rolling those together would report an outage that is not one;
 * ignoring them would hide the reason a purchase is failing.
 *
 * So EasyPost's own services decide the verdict, and **the carriers are
 * reported by name in the message** — because "UPS is down, buy the FedEx rate"
 * is something a workflow can act on, which is rare for a status check.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "www.easypoststatus.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** EasyPost's own services — these decide the verdict. */
const EASYPOST = [
  /^api$/i,
  /^webhooks$/i,
  /^tracking$/i,
  /^address verification$/i,
  /^label purchases$/i,
  /postage purchases$/i,
  /^website$/i,
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "EasyPost platform status",
  description:
    "EasyPost's own API, label purchasing and tracking. Carrier outages are reported by name but " +
    "do not count — when UPS is down, EasyPost is fine and you buy a different rate.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { components?: Array<{ name?: string; status?: string; group?: boolean }> }
      | null;
    if (!Array.isArray(body?.components)) {
      // This is also what the decoy host at status.easypost.com produces.
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const counted: HealthState[] = [];
    const badOwn: string[] = [];
    const badCarriers: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!name) continue;
      const isOwn = EASYPOST.some((re) => re.test(name));
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };

      if (isOwn) {
        counted.push(state);
        if (c.status !== "operational") badOwn.push(`${name}: ${c.status}`);
      } else if (c.status !== "operational") {
        // A carrier. Named, because choosing another one is a real remedy.
        badCarriers.push(name);
      }
    }

    if (counted.length === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names EasyPost's own services",
        components: Object.keys(components).length > 0 ? components : undefined,
      };
    }

    const parts: string[] = [];
    parts.push(badOwn.length > 0 ? badOwn.join("; ") : `${counted.length} services operational`);
    if (badCarriers.length > 0) {
      parts.push(
        `carriers affected (EasyPost itself is unaffected): ${badCarriers.join(", ")}`,
      );
    }

    return {
      state: worstHealthState(counted),
      message: parts.join(" · "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
