/**
 * Is Pinecone up? — its Statuspage, read with the regions kept separate from
 * the global services.
 *
 * Pinecone's status page is **region-partitioned**, which changes what a useful
 * check looks like. Verified 2026-08-18, it publishes ~28 components: a handful
 * of global ones (`Index Management`, `Inference`, `Console`, `Assistant`) and
 * the rest a per-region grid under the groups `Serverless Indexes` and `Pod
 * Indexes` — `AWS us-east-1`, `GCP europe-west4`, `Azure eastus2`,
 * `asia-northeast1-gcp`, and so on.
 *
 * Rolling all of those up would report an outage in `asia-northeast1-gcp` as
 * an outage for a customer whose only index is in `us-east-1`. And this check
 * **cannot know which region matters**: it is `scope: "app"` and unsigned, so
 * it has no Connection and no index list. So:
 *
 *   - the **global** components decide the state — they cover every control
 *     plane call this app makes, and the whole Inference API;
 *   - every **region** component is still reported, as its own component, but
 *     capped at `degraded`, because whether it affects you depends on where
 *     your index lives.
 *
 * The connection-scoped `indexes` check is the one that knows: it reads the
 * project's own indexes and their state.
 *
 * Annotation:
 *
 *   - `kind: "service"` — "is the vendor up", separate from "is this key live"
 *     (the derived `auth:api-key` check).
 *   - `scope: "app"` (default) — the same answer for every Connection.
 *   - `credential: "none"` (default) — unauthenticated and unsigned.
 *   - `network.allow` — the status host is not an API host and is deliberately
 *     absent from the app's own egress allowlist.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.pinecone.io";

/** Global services every call depends on, whatever region an index is in. */
const GLOBAL = ["Index Management", "Inference"];

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
  title: "Pinecone platform status",
  description:
    "Pinecone's Statuspage. The global components (index management, inference) decide the " +
    "verdict; the per-region components are reported but capped at degraded, since this check " +
    "cannot know which region your index is in.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing
    // about Pinecone.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as { components?: Component[] } | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const leaves = body.components.filter((c) => c.group !== true);
    const globalNames = new Set(GLOBAL.map((n) => n.toLowerCase()));

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const deciding: HealthState[] = [];
    const bad: string[] = [];
    let matchedGlobal = 0;

    for (const c of leaves) {
      const name = String(c.name ?? "");
      const isGlobal = globalNames.has(name.toLowerCase());
      let state = STATES[String(c.status)] ?? "unknown";
      if (!isGlobal && state === "down") {
        // One region being out is not an outage for everyone.
        state = "degraded";
      }
      components[slug(name)] = { state, message: c.status };
      if (isGlobal) {
        matchedGlobal++;
        deciding.push(state);
      }
      if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
    }

    if (matchedGlobal === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the global components this app watches",
      };
    }

    // A broken region never decides the verdict on its own, but it must not be
    // silent either: it drags the state to `degraded` and no further.
    const regionTrouble = leaves.some((c) =>
      !globalNames.has(String(c.name ?? "").toLowerCase()) && c.status !== "operational"
    );
    const state = worstHealthState([
      ...deciding,
      ...(regionTrouble ? ["degraded" as HealthState] : []),
    ]);

    return {
      state,
      message: bad.length === 0
        ? `${leaves.length} components operational`
        : `${bad.slice(0, 6).join("; ")}${bad.length > 6 ? ` (+${bad.length - 6} more)` : ""}`,
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
