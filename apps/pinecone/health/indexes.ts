/**
 * Are **this project's** indexes actually ready?
 *
 * A Pinecone index is not a static thing. It has a `status` with a `state`
 * (`Initializing`, `InitializationFailed`, `Ready`, `ScalingUp`,
 * `ScalingDown`, `Terminating`, `Disabled`) and a `ready` boolean, and the gap
 * between "the API is up" and "your index will answer a query" is exactly
 * where a workflow breaks:
 *
 *   - an index still **Initializing** answers control-plane calls and rejects
 *     data-plane ones;
 *   - **InitializationFailed** is a permanent state that looks temporary;
 *   - **Terminating** means somebody deleted it and the workflow pointing at it
 *     has minutes to live.
 *
 * None of that shows on the vendor's status page, which is why this check
 * exists alongside `service`: the status page answers "is Pinecone up", and
 * this answers "is the thing this connection actually uses up".
 *
 * It is also the check that knows the **regions** that matter. `service` is
 * app-scoped and cannot see a project's indexes, so it caps region trouble at
 * `degraded`; here each index's own `cloud/region` is reported next to its
 * state, so a regional incident can be matched to the indexes it touches.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — "is the thing this Connection points at working",
 *     a different question from "is the vendor up" and from "is the key live".
 *   - `scope: "connection"` — every API key sees a different project.
 *   - `credential: "signed"` — it reads the project's own index list.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";
import { API_VERSION, CONTROL_BASE_URL, type IndexModel } from "../lib/client.ts";

/** Index states, and how bad each one is for a workflow pointing at it. */
const STATES: Record<string, HealthState> = {
  Ready: "ok",
  ScalingUp: "ok",
  ScalingDown: "ok",
  ScalingUpPodSize: "ok",
  ScalingDownPodSize: "ok",
  Initializing: "degraded",
  Terminating: "degraded",
  Disabled: "down",
  InitializationFailed: "down",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const indexes: HealthCheckDefinition = {
  key: "indexes",
  title: "Index readiness",
  description:
    "Every index this API key can see, with its state and region. Catches the gap between " +
    "'Pinecone is up' and 'your index will answer a query' — initializing, failed, terminating.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${CONTROL_BASE_URL}/indexes`, {
      headers: { accept: "application/json", "x-pinecone-api-version": API_VERSION },
    });
    if (!res.ok) {
      // Auth failures are plain text; the derived auth:api-key check is what
      // reports those, so this one stays out of the way.
      const body = (await res.text().catch(() => "")).trim();
      return {
        state: "unknown",
        message: `GET /indexes returned ${res.status}: ${body.slice(0, 120)}`,
      };
    }

    const body = await res.json().catch(() => null) as { indexes?: IndexModel[] } | null;
    if (!Array.isArray(body?.indexes)) {
      return { state: "unknown", message: "Pinecone returned an unexpected shape for /indexes" };
    }
    if (body.indexes.length === 0) {
      // An empty project is a fact, not a fault — and it is what a key from the
      // wrong project looks like, which is worth saying.
      return {
        state: "ok",
        message: "no indexes in this project",
        ttlSeconds: 300,
      };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];

    for (const index of body.indexes) {
      const name = String(index.name ?? "unnamed");
      const rawState = String(index.status?.state ?? "");
      // `ready` is the flag the data plane actually honours; a state this app
      // does not recognise is reported through it rather than guessed at.
      const state = STATES[rawState] ?? (index.status?.ready ? "ok" : "degraded");
      const s = index.spec?.serverless;
      const where = s?.cloud && s?.region ? ` (${s.cloud}/${s.region})` : "";
      components[slug(name)] = { state, message: `${rawState || "unknown state"}${where}` };
      states.push(state);
      if (state !== "ok") bad.push(`${name}: ${rawState || "unknown"}`);
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0
        ? `${body.indexes.length} index${body.indexes.length === 1 ? "" : "es"} ready`
        : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default indexes;
