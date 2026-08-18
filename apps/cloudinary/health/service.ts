/**
 * Is Cloudinary up **for this connection's datacenter**?
 *
 * Cloudinary's status page is region-partitioned, and unusually usefully so.
 * Verified 2026-08-18, it publishes per-datacenter components — `Admin API -
 * US`, `Upload API - EU`, `Media Transformation API - AP`, `Webhooks / HTTP
 * notifications - US` — grouped under `US Datacenter`, `EU Datacenter` and
 * `AP Datacenter`, plus a handful of global ones (`Media Delivery`, `Console`,
 * `Flow Engine`) and the vendor plugins nobody here uses.
 *
 * **This check is connection-scoped for that reason.** A Cloudinary product
 * environment lives in exactly one datacenter, and the Connection already knows
 * which — the region is part of the credential, because it decides the API
 * host. So unlike a vendor-status check that has to watch everything and hedge,
 * this one watches the three components that actually serve this cloud and
 * ignores the other two datacenters entirely.
 *
 * (Contrast this pack's `pinecone` app, whose status page is also
 * region-partitioned but whose app-scoped check *cannot* know the region, and
 * therefore has to cap region trouble at `degraded`. Here there is no such
 * compromise.)
 *
 * The three watched components map onto what this app does:
 *
 *   - **Admin API** — every list, search, update and delete.
 *   - **Upload API** — `asset-upload`, `asset-rename`, `asset-explicit`.
 *   - **Media Transformation API** — the derived images a transformation URL
 *     produces. Down, delivery of *existing* renditions usually continues from
 *     cache while anything new fails.
 *
 * Annotation:
 *
 *   - `kind: "service"` — "is the vendor up", separate from "is this key live".
 *   - `scope: "connection"` — deliberately not `app`: the answer differs per
 *     datacenter, and the Connection is what knows which one.
 *   - `credential: "context"` — it reads the Connection's region and nothing
 *     else. The status page must never see a credential, and `context` is the
 *     posture that says so while still allowing a widened allowlist.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { displayOf } from "../lib/client.ts";

const STATUS_HOST = "status.cloudinary.com";

/** Component name suffix per region, as the status page spells it. */
const SUFFIX: Record<string, string> = { us: "US", eu: "EU", ap: "AP" };

/** The per-datacenter components this app's actions ride on. */
const WATCHED = ["Admin API", "Upload API", "Media Transformation API"];

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
  title: "Cloudinary datacenter status",
  description:
    "The Admin, Upload and Media Transformation components for THIS connection's datacenter — " +
    "an outage in another region is not this connection's problem.",
  kind: "service",
  covers: ["*"],
  scope: "connection",
  credential: "context",
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const region = String(displayOf(ctx.connection).region ?? "us").toLowerCase();
    const suffix = SUFFIX[region] ?? SUFFIX.us;

    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Cloudinary.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const wanted = new Map(WATCHED.map((n) => [`${n} - ${suffix}`.toLowerCase(), n]));
    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      const short = wanted.get(name.toLowerCase());
      if (!short) continue;
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(short)] = { state, message: c.status };
      states.push(state);
      if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
    }

    if (states.length === 0) {
      return {
        state: "unknown",
        message:
          `the status page names no ${suffix} components matching ${WATCHED.join(", ")} — it may ` +
          "have been reorganised",
      };
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0
        ? `${suffix} datacenter operational (${states.length} components)`
        : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
