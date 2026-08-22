/**
 * Are this account's pipelines actually working?
 *
 * ## The question a status page cannot answer
 *
 * Fivetran being up is not the same as your data arriving. A connection whose
 * source credentials expired sits at `setup_state: broken` and **stops syncing
 * silently** — the warehouse does not empty, it just stops changing, and every
 * dashboard built on it keeps rendering yesterday's numbers as though they were
 * today's.
 *
 * That is the failure worth a health check, and it is invisible from outside.
 *
 * ## What counts, and what does not
 *
 *   - **`broken`** setup state is `down` for that connection: it is not
 *     syncing and will not resume without somebody fixing credentials.
 *   - **Warnings** on an otherwise-healthy connection are `degraded`. Fivetran
 *     raises them for things like a schema change it could not apply, which
 *     means the data is arriving and is incomplete — worse than an outage in
 *     one respect, because nothing looks wrong.
 *   - **`paused`** is *not* a fault. Somebody paused it deliberately, and
 *     reporting it as broken would train people to ignore this check. It is
 *     counted and reported, at `ok`.
 *
 * The check reads one page of connections rather than every one — an account
 * with hundreds is exactly the account whose rate limit matters, and a sample
 * of a hundred finds a systemic problem just as well.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_VERSION, BASE_URL } from "../lib/client.ts";

interface Connection {
  id?: string;
  schema?: string;
  paused?: boolean;
  status?: {
    setup_state?: string;
    sync_state?: string;
    warnings?: unknown[];
    tasks?: unknown[];
  };
}

const connections: HealthCheckDefinition = {
  key: "connections",
  title: "Pipeline health",
  description:
    "Whether this account's connections are actually syncing. A broken connection stops silently " +
    "— the warehouse does not empty, it stops changing, and dashboards keep rendering.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 600,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/v1/connections?limit=100`, {
        headers: { accept: API_VERSION },
      });
    } catch (err) {
      return { state: "down", message: `could not reach Fivetran: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      // The derived auth check owns credential failures.
      return { state: "unknown", message: "the API key was rejected" };
    }
    if (res.status === 429) {
      await res.body?.cancel();
      return {
        state: "unknown",
        message: "rate limited — a trial account allows only 500 requests an hour",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `Fivetran answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { data?: { items?: Connection[] } }
      | null;
    const items = body?.data?.items ?? [];
    if (items.length === 0) {
      return { state: "ok", message: "no connections configured", ttlSeconds: 600 };
    }

    const broken: string[] = [];
    const warning: string[] = [];
    let paused = 0;

    for (const c of items) {
      const name = String(c?.schema ?? c?.id ?? "");
      if (c?.status?.setup_state === "broken") broken.push(name);
      else if ((c?.status?.warnings ?? []).length > 0) warning.push(name);
      if (c?.paused === true) paused += 1;
    }

    const parts: string[] = [`${items.length} connections`];
    if (paused > 0) parts.push(`${paused} paused deliberately`);

    let state: HealthState = "ok";
    if (broken.length > 0) {
      state = "down";
      parts.push(`BROKEN and not syncing: ${broken.slice(0, 5).join(", ")}`);
    } else if (warning.length > 0) {
      state = "degraded";
      parts.push(
        `syncing with warnings (data may be incomplete): ${warning.slice(0, 5).join(", ")}`,
      );
    }

    return { state, message: parts.join(" · "), ttlSeconds: 600 };
  },
};

export default connections;
