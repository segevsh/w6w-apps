/**
 * What can this key actually do?
 *
 * ## The failure this exists for
 *
 * Ashby scopes API keys per module — Candidates, Jobs, Interviews, Offers,
 * Organization and so on, read and write granted separately, in the Ashby app.
 * A key with only read scopes authenticates flawlessly and is refused by every
 * write, which means **a workflow built on a read-only key looks perfectly
 * healthy right up to the moment it tries to move an application**.
 *
 * A credential check cannot see that: the credential is fine. This reads
 * `apiKey.info` and reports the granted scopes, so the shortfall is visible
 * before it costs a candidate a stage transition at 2am.
 *
 * ## Two ways it legitimately cannot answer
 *
 *   - The key may lack **`apiKeysRead`** itself, in which case Ashby refuses
 *     this endpoint. That is not a fault — it is a narrow key doing its job —
 *     so it reports `unknown` with the reason, not `down`.
 *   - A `401` belongs to the derived `auth:api-key` check, and is left
 *     `unknown` here rather than reported twice.
 *
 * A key with **zero** scopes is `down`, because nothing this app does can work.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_VERSION, BASE_URL } from "../lib/client.ts";

const permissions: HealthCheckDefinition = {
  key: "permissions",
  title: "API key scopes",
  description:
    "Which Ashby modules this key may read and write. A read-only key authenticates perfectly " +
    "and is refused by every write, which no credential check can see.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 900,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/apiKey.info`, {
        method: "POST",
        headers: { accept: API_VERSION, "content-type": "application/json" },
        body: "{}",
      });
    } catch (err) {
      return { state: "down", message: `could not reach Ashby: ${String(err)}` };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      // The derived auth check owns this failure.
      return { state: "unknown", message: "the API key was rejected" };
    }
    if (res.status === 403) {
      await res.body?.cancel();
      return {
        state: "unknown",
        message: "this key cannot read its own permissions — it lacks the `apiKeysRead` scope, " +
          "which is a narrow key working as intended rather than a fault",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `Ashby answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { success?: boolean; results?: { title?: string; scopes?: string[] } }
      | null;
    if (body?.success === false) {
      return {
        state: "unknown",
        message: "Ashby refused to report this key's scopes — most likely no `apiKeysRead`",
      };
    }

    const scopes = body?.results?.scopes ?? [];
    const title = body?.results?.title ?? "this key";
    if (scopes.length === 0) {
      return {
        state: "down",
        message: `${title} has no scopes granted — every action will be refused`,
      };
    }

    const writes = scopes.filter((s) => /write|delete/i.test(s));
    return {
      state: "ok",
      message: writes.length === 0
        ? `${title}: ${scopes.length} scopes, all read-only — writes will be refused`
        : `${title}: ${scopes.length} scopes (${writes.length} allow writing)`,
      ttlSeconds: 900,
    };
  },
};

export default permissions;
