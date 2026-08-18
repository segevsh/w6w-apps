/**
 * Is Mux up? — its Statuspage, read with delivery separated from the API.
 *
 * Verified 2026-08-18: `status.mux.com` is a Statuspage instance whose page is
 * named "mux".
 *
 * The split that matters here is between **the API** — which is what every
 * action in this app calls — and **delivery**, which is what viewers depend on.
 * They fail independently and the consequences are opposite:
 *
 *   - the API being down stops a workflow creating or reading assets, while
 *     every video already published keeps playing;
 *   - delivery being down stops viewers watching, while the workflow carries on
 *     happily creating assets nobody can see.
 *
 * Neither is "Mux is down" on its own, so a single component failing is
 * `degraded` and only trouble in both is `down`. A workflow that only ingests
 * is genuinely unaffected by a delivery incident, and reporting otherwise would
 * make the check useless to it.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";

const STATUS_HOST = "status.mux.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** What this app's calls ride on. */
const API = [/api/i, /dashboard/i];

/** What viewers ride on. */
const DELIVERY = [/delivery/i, /playback/i, /stream/i, /encoding/i, /ingest/i, /live/i];

interface Component {
  name?: string;
  status?: string;
  group?: boolean;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Mux platform status",
  description:
    "Mux's Statuspage, with the API separated from delivery — they fail independently, and a " +
    "workflow that only ingests is unaffected by a playback incident.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const bad: string[] = [];
    let apiTrouble = false;
    let deliveryTrouble = false;
    let matched = 0;

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      const isApi = API.some((re) => re.test(name));
      const isDelivery = DELIVERY.some((re) => re.test(name));
      if (!isApi && !isDelivery) continue;

      matched++;
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };
      if (state !== "ok") {
        bad.push(`${name}: ${c.status}`);
        if (isApi) apiTrouble = true;
        if (isDelivery) deliveryTrouble = true;
      }
    }

    if (matched === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the API or delivery components",
      };
    }

    // Both halves broken is an outage; one is a partial failure whose effect
    // depends entirely on what the workflow does.
    const state: HealthState = apiTrouble && deliveryTrouble
      ? "down"
      : apiTrouble || deliveryTrouble
      ? "degraded"
      : "ok";

    return {
      state,
      message: bad.length === 0 ? `${matched} components operational` : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
