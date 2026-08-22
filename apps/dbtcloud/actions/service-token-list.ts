import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v3/accounts/{account}/service-tokens/` — which machine credentials
 * exist, and what they can do.
 *
 * Service tokens are how everything automated reaches dbt Cloud, which makes
 * them the credentials nobody reviews: they are created for one integration,
 * outlive it, and keep working. This is the list an access review needs, and
 * the permission sets on each token are the part that matters — a token
 * created for "read the manifest" that carries Account Admin is the finding.
 *
 * **dbt never returns a token's value**, here or anywhere; it is shown once at
 * creation and not again. So this is safe to run on a schedule: it reports what
 * exists and what it can do, and there is nothing secret in the response to
 * leak. `last_used_at` is the field that finds the ones to revoke.
 */
const action: ActionDefinition = {
  key: "service-token-list",
  type: "read",
  resource: "service-token",
  title: "List service tokens",
  description:
    "The machine credentials reaching this account and the permissions on each — the list an " +
    "access review needs. dbt never returns a token's value, so this is safe to schedule.",
  params: [...LIST_PARAMS],
  output: [
    { key: "tokens", type: "array", label: "Service tokens, without their values" },
    { key: "count", type: "number", label: "Tokens returned" },
    { key: "neverUsed", type: "array", label: "Tokens with no recorded use" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const { items } = await client.requestAll<
      { id?: number; name?: string; last_used_at?: string | null }
    >(`/api/v3/accounts/${client.accountId}/service-tokens/`, {}, want);

    const neverUsed = items.filter((t) => !t?.last_used_at).map((t) => String(t?.name ?? t?.id));
    return { tokens: items, count: items.length, neverUsed };
  },
};

export default action;
