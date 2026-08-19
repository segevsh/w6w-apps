import type { HealthCheckDefinition } from "@w6w/types";
import { API_HOST, describeError, mediaType } from "../lib/client.ts";

/**
 * Does this connection's token still work, and can it still see anything?
 *
 * ## A service-account token lasts an hour
 *
 * That is the shortest-lived credential in this pack, and it means the usual
 * question — "has somebody revoked this" — is joined by a duller one: "did the
 * refresh happen". Both look identical from an action's point of view, which is
 * a 401 partway through a workflow.
 *
 * This probes `GET /api/atlas/v2/orgs`, the cheapest authenticated call, and
 * distinguishes three outcomes rather than two:
 *
 * - **401** — the token is not being accepted. Expired, revoked, or belonging
 *   to a deleted service account.
 * - **200 with an empty list** — the token is fine and the service account has
 *   **no role anywhere**. It authenticates and can do nothing, which no error
 *   will ever tell you. This is `degraded`, not `ok`.
 * - **200 with organisations** — working.
 *
 * ## Why an organisation read rather than a project read
 *
 * A project-scoped probe would fail for a service account that legitimately
 * holds only organisation access, and would need a project id this check has
 * no business choosing. The organisation list is what every credential can see
 * something in, if it can see anything at all.
 */
const check: HealthCheckDefinition = {
  key: "credential",
  kind: "credential",
  scope: "connection",
  credential: "signed",
  title: "Token accepted",
  description:
    "Reads the organisation list with this connection's token. Distinguishes a rejected token " +
    "from one that works and can see NOTHING — a service account with no role granted " +
    "authenticates perfectly and is useless, and nothing else reports that.",
  covers: ["credential"],
  minIntervalSeconds: 300,
  network: { allow: ["cloud.mongodb.com"] },

  async check(_input, ctx) {
    let res: Response;
    const started = Date.now();
    try {
      res = await ctx.fetch(`${API_HOST}/api/atlas/v2/orgs`, {
        headers: { accept: mediaType() },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach Atlas: ${String(err)}` };
    }
    const latencyMs = Date.now() - started;
    const text = await res.text().catch(() => "");

    if (res.status === 401) {
      return {
        state: "down",
        message: `${describeError(401, text)}. A service-account token lasts an hour, so this is ` +
          "as likely to be a refresh that did not happen as a revocation",
        latencyMs,
      };
    }
    if (!res.ok) {
      return {
        state: res.status >= 500 ? "down" : "degraded",
        message: describeError(res.status, text),
        latencyMs,
      };
    }

    let body: { results?: unknown[] } | null = null;
    try {
      body = JSON.parse(text) as { results?: unknown[] };
    } catch {
      return { state: "unknown", message: "Atlas did not return JSON", latencyMs };
    }

    const count = (body?.results ?? []).length;
    if (count === 0) {
      // Authenticating and seeing nothing is a real, silent failure state.
      return {
        state: "degraded",
        message:
          "the token is accepted and this service account can see no organisations — it has " +
          "been created but never granted a role, so every action will fail with a 403 or an " +
          "empty result",
        latencyMs,
      };
    }

    return {
      state: "ok",
      message: `the token is accepted and reaches ${count} organisation${count === 1 ? "" : "s"}`,
      latencyMs,
    };
  },
};

export default check;
