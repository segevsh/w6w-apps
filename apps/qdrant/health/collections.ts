/**
 * Can this key actually read the data, and is the instance holding anything?
 *
 * The `instance` check asks whether Qdrant is up, without a credential. This
 * asks the next question: whether **this connection** can use it.
 *
 * Two failures worth separating, because they look the same from a workflow
 * that just gets no results:
 *
 *   - **The key is refused.** Left `unknown`, because the derived
 *     `auth:api-key` check owns credential failures.
 *   - **The instance is empty.** Reported as `degraded` rather than `ok`. A
 *     Qdrant with no collections is perfectly healthy and completely useless to
 *     a workflow that expects to query one, and that difference is invisible
 *     from a green tick.
 *
 * It is a real distinction rather than pedantry: an instance that lost its
 * storage volume comes back up, answers `readyz`, and has no collections. The
 * `instance` check calls that healthy, correctly. This one notices.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { urlFromConnection } from "../lib/client.ts";

const collections: HealthCheckDefinition = {
  key: "collections",
  title: "Collections reachable",
  description:
    "Whether this key can read the instance, and whether there is anything in it. An instance " +
    "that lost its volume comes back ready and empty, which `instance` correctly calls healthy.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let base: string;
    try {
      base = urlFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "this connection has no Qdrant URL recorded" };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/collections`, { headers: { accept: "application/json" } });
    } catch (err) {
      return { state: "down", message: `could not reach Qdrant: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      await res.body?.cancel();
      // The derived auth check owns this.
      return { state: "unknown", message: "the API key was rejected" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `Qdrant answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { result?: { collections?: Array<{ name?: string }> } }
      | null;
    const names = (body?.result?.collections ?? []).map((c) => String(c?.name ?? ""))
      .filter(Boolean);

    if (names.length === 0) {
      return {
        state: "degraded",
        message:
          "the instance is reachable and holds no collections — correct for a new deployment, " +
          "and also what an instance that lost its storage looks like",
      };
    }
    return {
      state: "ok",
      message: `${names.length} collections: ${names.slice(0, 5).join(", ")}${
        names.length > 5 ? ", …" : ""
      }`,
      ttlSeconds: 300,
    };
  },
};

export default collections;
