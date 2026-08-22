/**
 * Is **this connection's** dbt Cloud reachable, and does its token still work?
 *
 * The global status page cannot answer this, for two reasons that both matter
 * here: dbt Cloud runs in cells, and a single-tenant or VPC deployment is not
 * on the public page at all. So this asks the account itself.
 *
 * The probe is `GET /api/v2/accounts/{id}/`, the cheapest authenticated call
 * that names the account back. Two failures are distinguished deliberately:
 *
 *   - a **`401`** is left `unknown`, because the derived `auth:token` check
 *     owns credential failures and duplicating them helps nobody;
 *   - a **`403`** is `degraded` and says so — the token authenticated and the
 *     account refused it, which is a permission-set problem, not an outage.
 *
 * The account's `state` is surfaced too. A locked or cancelled dbt Cloud
 * account still answers, and every job in it silently stops running.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { accessUrlFromConnection } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account reachability",
  description:
    "Whether this connection's own dbt Cloud account answers — the only check that covers a " +
    "single-tenant deployment, which is not on the public status page.",
  kind: "dependency",
  covers: ["*"],
  scope: "connection",
  credential: "signed",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    const base = accessUrlFromConnection(ctx.connection);
    const display = (ctx.connection?.display ?? {}) as { accountId?: string | number };
    const accountId = String(display.accountId ?? "").trim();
    if (!accountId) {
      return {
        state: "unknown",
        message: "this connection has no account id recorded — reconnect it",
      };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}/api/v2/accounts/${encodeURIComponent(accountId)}/`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `could not reach ${base}: ${String(err)}` };
    }

    if (res.status === 401) {
      await res.body?.cancel();
      // The derived auth check owns this failure.
      return { state: "unknown", message: "the token was rejected" };
    }
    if (res.status === 403) {
      await res.body?.cancel();
      return {
        state: "degraded",
        message:
          "the token authenticated but is not permitted on this account — a permission-set " +
          "problem rather than an outage",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { state: "down", message: `${base} answered ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { data?: { name?: string; state?: number; plan?: string } }
      | null;
    const data = body?.data ?? {};
    const name = data.name ?? accountId;

    // dbt's `state` is 1 for an active account; anything else is locked,
    // cancelled or deleted, and jobs in it stop running without an error.
    if (data.state !== undefined && Number(data.state) !== 1) {
      return {
        state: "degraded",
        message: `${name} answers, but its account state is ${data.state} — not active, so ` +
          "scheduled jobs will not run",
      };
    }
    return {
      state: "ok",
      message: data.plan ? `${name} (${data.plan})` : String(name),
      ttlSeconds: 300,
    };
  },
};

export default account;
