import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v3/accounts/{account}/users/` — who can get into dbt Cloud.
 *
 * The reason to read this from a workflow is licence cost and access review.
 * dbt Cloud bills per **developer** seat, and a `read_only` or `IT` licence is
 * free — so the useful number is not "how many users" but "how many developer
 * seats, and when did each last do anything". This action counts the licence
 * types for that reason.
 *
 * The other use is offboarding: comparing this list against the HR system finds
 * the people who left and can still deploy models to production.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description:
    "Who can get into dbt Cloud, with their licence types — the number that matters for cost is " +
    "developer seats, not users.",
  params: [
    {
      key: "state",
      label: "State",
      type: "select",
      default: "active",
      options: [
        { value: "active", label: "Active only" },
        { value: "all", label: "All, including deactivated" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "licenseCounts", type: "object", label: "How many of each licence type" },
    { key: "totalCount", type: "number", label: "Users in the account" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new DbtCloudClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));
    const state = p.state === undefined ? "active" : String(p.state);

    const { items, totalCount } = await client.requestAll<
      { licenses?: Array<{ license_type?: string }> }
    >(
      `/api/v3/accounts/${client.accountId}/users/`,
      { query: { state } },
      want,
    );

    const licenseCounts: Record<string, number> = {};
    for (const user of items) {
      for (const licence of user?.licenses ?? []) {
        const type = String(licence?.license_type ?? "unknown");
        licenseCounts[type] = (licenseCounts[type] ?? 0) + 1;
      }
    }

    ctx.log("info", "read dbt Cloud users", { count: items.length });
    return { users: items, count: items.length, licenseCounts, totalCount };
  },
};

export default action;
